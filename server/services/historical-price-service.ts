import yahooFinance from 'yahoo-finance2';
import { storage } from '../storage';
import { InsertHistoricalPrice } from '@shared/schema';
import { DateTime } from 'luxon';
import { Pool } from '@neondatabase/serverless';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Service to fetch and manage historical price data
 */
export class HistoricalPriceService {
  /**
   * Fetch historical prices for a symbol from Yahoo Finance
   * @param symbol The stock symbol
   * @param region The portfolio region (USD, CAD, INTL)
   * @param period The period for which to fetch data ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
   * @param interval The interval between data points ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo')
   * @returns Whether the operation was successful
   */
  async fetchAndStoreHistoricalPrices(
    symbol: string, 
    region: string, 
    period: string = '5y', // Default to 5 years as requested
    interval: string = '1d'  // Default to daily data as requested
  ): Promise<boolean> {
    try {
      // Yahoo Finance symbol adjustment for different exchanges
      let yahooSymbol = symbol;
      
      // Handle Toronto Stock Exchange (TSX) symbols
      if (region === 'CAD') {
        // If the symbol already contains the .TO suffix, use it as is
        if (!yahooSymbol.endsWith('.TO')) {
          // For some TSX symbols, we may need to append .TO
          yahooSymbol = `${yahooSymbol}.TO`;
          console.log(`Adjusted CAD symbol to: ${yahooSymbol}`);
        }
      }
      
      // For INTL symbols (usually ADRs), use as is
      
      console.log(`Fetching 5-year historical prices for ${yahooSymbol} (${region})`);
      
      const result = await yahooFinance.chart(yahooSymbol, {
        period1: this.getPeriodStartDate(period),
        interval: interval as any,
        includePrePost: false
      });

      if (!result.quotes || result.quotes.length === 0) {
        console.warn(`No historical data found for ${yahooSymbol}`);
        return false;
      }

      console.log(`Found ${result.quotes.length} historical price points for ${symbol}`);

      // Delete existing data for this symbol/region
      await this.deleteHistoricalPricesDirectSql(symbol, region);

      // Map Yahoo Finance data to our database schema
      const historicalPrices: InsertHistoricalPrice[] = result.quotes.map(quote => {
        // Use Luxon to handle date conversion properly
        let dateObj: Date;
        
        if (quote.date) {
          // If we have a date object, use it directly
          dateObj = new Date(quote.date);
        } else {
          // Last resort fallback
          dateObj = new Date();
          console.warn(`No valid date for ${symbol} (${region}), using current date`);
        }
        
        // Format date as ISO string and take only the date part (YYYY-MM-DD)
        const dateStr = dateObj.toISOString().split('T')[0];
        
        // Convert all numeric values to strings as required by schema
        return {
          symbol,
          date: dateStr,
          open: quote.open !== null ? String(quote.open) : null,
          high: quote.high !== null ? String(quote.high) : null,
          low: quote.low !== null ? String(quote.low) : null,
          close: quote.close !== null ? String(quote.close) : "0", // Required field, defaults to "0"
          volume: quote.volume !== null ? String(quote.volume) : null,
          adjustedClose: quote.adjclose !== null ? String(quote.adjclose) : null,
          region
        };
      });

      // Store in database using direct SQL approach for improved reliability
      await this.bulkInsertHistoricalPricesDirectSql(historicalPrices);
      
      console.log(`Stored ${historicalPrices.length} historical prices for ${symbol} (${region})`);
      return true;
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Direct SQL approach to delete historical prices for a symbol
   */
  private async deleteHistoricalPricesDirectSql(symbol: string, region: string): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM historical_prices 
        WHERE symbol = ${symbol} AND region = ${region}
      `);
      console.log(`Deleted existing historical prices for ${symbol} (${region})`);
    } catch (error) {
      console.error(`Error deleting historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Direct SQL approach to bulk insert historical prices
   */
  private async bulkInsertHistoricalPricesDirectSql(prices: InsertHistoricalPrice[]): Promise<void> {
    if (prices.length === 0) return;

    try {
      // Batch inserts in groups of 100 to avoid statement size limits
      const batchSize = 100;
      for (let i = 0; i < prices.length; i += batchSize) {
        const batch = prices.slice(i, i + batchSize);
        
        // Construct a VALUES clause for all records in this batch
        const valuesSql = batch.map(price => `(
          '${price.symbol}', 
          '${price.date}', 
          ${price.open ? `'${price.open}'` : 'NULL'}, 
          ${price.high ? `'${price.high}'` : 'NULL'}, 
          ${price.low ? `'${price.low}'` : 'NULL'}, 
          '${price.close}', 
          ${price.volume ? `'${price.volume}'` : 'NULL'}, 
          ${price.adjustedClose ? `'${price.adjustedClose}'` : 'NULL'}, 
          '${price.region}'
        )`).join(', ');
        
        // Execute the INSERT statement
        await db.execute(sql`
          INSERT INTO historical_prices (
            symbol, 
            date, 
            open, 
            high, 
            low, 
            close, 
            volume, 
            adjusted_close, 
            region
          ) 
          VALUES ${sql.raw(valuesSql)}
        `);
      }
      
      console.log(`Bulk inserted ${prices.length} historical price records`);
    } catch (error) {
      console.error('Error bulk inserting historical prices:', error);
      throw error;
    }
  }

  /**
   * Fetch all symbols from a specific region's assets table using direct SQL
   */
  private async getSymbolsByRegionDirectSql(region: string): Promise<string[]> {
    try {
      let tableName: string;
      
      if (region === 'USD') {
        tableName = 'assets_US';
      } else if (region === 'CAD') {
        tableName = 'assets_CAD';
      } else if (region === 'INTL') {
        tableName = 'assets_INTL';
      } else {
        throw new Error(`Invalid region: ${region}`);
      }
      
      const result = await db.execute(sql`
        SELECT symbol FROM ${sql.raw(tableName)}
      `);
      
      return result.rows.map(row => row.symbol as string);
    } catch (error) {
      console.error(`Error fetching symbols for region ${region}:`, error);
      return [];
    }
  }

  /**
   * Batch fetch historical prices for all stocks in all regions
   * Optimized for the 5-year daily history requirement
   */
  async updateAllHistoricalPrices(
    period: string = '5y',
    interval: string = '1d',
    delayMs: number = 1000 // Increased delay to avoid rate limiting
  ): Promise<Record<string, number>> {
    const regions = ['USD', 'CAD', 'INTL'];
    const results: Record<string, number> = {};
    
    for (const region of regions) {
      try {
        console.log(`Fetching historical prices for ${region} region`);
        
        // Get all symbols for this region using direct SQL
        const symbols = await this.getSymbolsByRegionDirectSql(region);
        console.log(`Found ${symbols.length} symbols for ${region} region: ${symbols.join(', ')}`);
        
        let successCount = 0;
        
        for (const symbol of symbols) {
          console.log(`Processing ${symbol} (${region}) - ${successCount+1} of ${symbols.length}`);
          
          try {
            const success = await this.fetchAndStoreHistoricalPrices(
              symbol, 
              region, 
              period, 
              interval
            );
            
            if (success) {
              successCount++;
              console.log(`✓ Successfully updated ${symbol} (${region}) - ${successCount} of ${symbols.length}`);
            } else {
              console.log(`✗ Failed to update ${symbol} (${region})`);
            }
            
            // Add a delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } catch (error) {
            console.error(`Error processing ${symbol} (${region}):`, error);
            // Continue with next symbol
          }
        }
        
        results[region] = successCount;
        console.log(`Completed ${region} region: ${successCount}/${symbols.length} symbols updated`);
      } catch (error) {
        console.error(`Error processing ${region} region:`, error);
        results[region] = 0;
      }
    }
    
    return results;
  }

  /**
   * Fetch historical prices for all stocks in a portfolio
   * @param region The portfolio region (USD, CAD, INTL)
   * @param period The period for which to fetch data
   * @param interval The interval between data points
   * @returns Number of stocks successfully updated
   */
  async updateHistoricalPricesForPortfolio(
    region: string, 
    period: string = '5y',  // Default to 5 years
    interval: string = '1d'  // Default to daily data
  ): Promise<number> {
    try {
      // Get symbols directly from regional assets table
      const symbols = await this.getSymbolsByRegionDirectSql(region);
      let successCount = 0;

      console.log(`Updating historical prices for ${symbols.length} symbols in ${region} portfolio`);

      for (const symbol of symbols) {
        console.log(`Processing ${symbol} (${region}) - ${successCount+1} of ${symbols.length}`);
        
        const success = await this.fetchAndStoreHistoricalPrices(
          symbol, 
          region, 
          period, 
          interval
        );
        
        if (success) {
          successCount++;
          console.log(`✓ Successfully updated ${symbol} (${region})`);
        } else {
          console.log(`✗ Failed to update ${symbol} (${region})`);
        }
        
        // Add a delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Completed ${region} update: ${successCount}/${symbols.length} symbols updated`);
      return successCount;
    } catch (error) {
      console.error(`Error updating historical prices for ${region} portfolio:`, error);
      return 0;
    }
  }

  /**
   * Get start date based on period using Luxon for better date handling
   * @param period Period string ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
   * @returns Date object for the start of the period
   */
  private getPeriodStartDate(period: string): Date {
    const now = DateTime.now();
    
    switch (period) {
      case '1d':
        return now.minus({ days: 1 }).toJSDate();
      case '5d':
        return now.minus({ days: 5 }).toJSDate();
      case '1mo':
        return now.minus({ months: 1 }).toJSDate();
      case '3mo':
        return now.minus({ months: 3 }).toJSDate();
      case '6mo':
        return now.minus({ months: 6 }).toJSDate();
      case '1y':
        return now.minus({ years: 1 }).toJSDate();
      case '2y':
        return now.minus({ years: 2 }).toJSDate();
      case '5y':
        return now.minus({ years: 5 }).toJSDate();
      case '10y':
        return now.minus({ years: 10 }).toJSDate();
      case 'ytd':
        return DateTime.local(now.year, 1, 1).toJSDate(); // January 1st of current year
      case 'max':
        return DateTime.fromObject({ year: 1970, month: 1, day: 1 }).toJSDate(); // Unix epoch
      default:
        return now.minus({ years: 5 }).toJSDate(); // Default to 5 years
    }
  }
}

// Export a singleton instance
export const historicalPriceService = new HistoricalPriceService();
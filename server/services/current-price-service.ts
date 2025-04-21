import yahooFinance from 'yahoo-finance2';
import { db } from '../db';
import { InsertCurrentPrice, currentPrices } from '@shared/schema';
import { eq, sql, SQL, SQLWrapper } from 'drizzle-orm';

/**
 * Service for fetching and managing current (real-time) stock prices
 * Uses Yahoo Finance quote API for real-time data
 */
export class CurrentPriceService {
  /**
   * Fetch current price data for a stock from Yahoo Finance
   * @param symbol Stock symbol (will be adjusted for region if needed)
   * @param region Region (USD, CAD, INTL)
   * @returns Success status
   */
  async fetchAndStoreCurrentPrice(symbol: string, region: string): Promise<boolean> {
    try {
      // Handle region-specific symbol adjustments (e.g. adding .TO for Canadian stocks)
      let yahooSymbol = symbol.toUpperCase();
      if (region === 'CAD' && !yahooSymbol.endsWith('.TO')) {
        yahooSymbol = `${yahooSymbol}.TO`;
        console.log(`Adjusted CAD symbol to: ${yahooSymbol}`);
      }
      
      console.log(`Fetching current price data for ${yahooSymbol} (${region})`);
      
      // Fetch quote from Yahoo Finance
      const quote = await yahooFinance.quote(yahooSymbol);
      
      if (!quote) {
        console.warn(`No quote data found for ${yahooSymbol}`);
        return false;
      }
      
      console.log(`Successfully fetched quote data for ${symbol}`);
      
      // Delete existing data for this symbol/region
      await this.deleteCurrentPriceDirectSql(symbol, region);
      
      // Map Yahoo Finance data to our database schema
      const insertData: InsertCurrentPrice = {
        symbol: symbol,
        region: region,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketVolume: quote.regularMarketVolume,
        regularMarketDayHigh: quote.regularMarketDayHigh,
        regularMarketDayLow: quote.regularMarketDayLow,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        dividendYield: quote.dividendYield ? quote.dividendYield * 100 : null, // Convert to percentage
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      };
      
      // Insert into database
      const [result] = await db.insert(currentPrices).values(insertData).returning();
      
      if (result) {
        console.log(`Stored current price data for ${symbol} (${region})`);
        return true;
      } else {
        console.error(`Failed to store current price data for ${symbol} (${region})`);
        return false;
      }
    } catch (error) {
      console.error(`Error fetching quote data for ${symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Delete existing current price data for a symbol/region
   */
  async deleteCurrentPriceDirectSql(symbol: string, region: string): Promise<boolean> {
    try {
      await db.execute(sql`
        DELETE FROM ${currentPrices} 
        WHERE symbol = ${symbol} AND region = ${region}
      `);
      return true;
    } catch (error) {
      console.error(`Error deleting current price data for ${symbol} (${region}):`, error);
      return false;
    }
  }
  
  /**
   * Retrieve symbols for a specific portfolio region using direct SQL
   */
  async getSymbolsByRegionDirectSql(region: string): Promise<string[]> {
    try {
      let tableName;
      
      if (region === 'USD') {
        tableName = 'assets_us'; // lowercase to match schema.ts definition
      } else if (region === 'CAD') {
        tableName = 'assets_cad'; // lowercase to match schema.ts definition
      } else if (region === 'INTL') {
        tableName = 'assets_intl'; // lowercase to match schema.ts definition
      } else {
        throw new Error(`Invalid region: ${region}`);
      }
      
      console.log(`Querying ${tableName} table for symbols in ${region} region`);
      
      const result = await db.execute(sql`
        SELECT symbol FROM ${sql.raw(tableName)}
      `);
      
      if (!result.rows || result.rows.length === 0) {
        console.warn(`No symbols found in ${tableName} table`);
        return [];
      }
      
      console.log(`Found ${result.rows.length} symbols in ${region} region`);
      return result.rows.map(row => row.symbol as string);
    } catch (error) {
      console.error(`Error fetching symbols for region ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Update current prices for an entire portfolio region
   */
  async updatePortfolioCurrentPrices(region: string, delayMs: number = 1000): Promise<{
    successCount: number,
    totalSymbols: number
  }> {
    try {
      console.log(`Updating current prices for portfolio: ${region}`);
      
      // Get symbols for the specified region
      const symbols = await this.getSymbolsByRegionDirectSql(region);
      
      if (!symbols || symbols.length === 0) {
        console.warn(`No symbols found for ${region} portfolio`);
        return { successCount: 0, totalSymbols: 0 };
      }
      
      console.log(`Found ${symbols.length} symbols for ${region} portfolio`);
      
      // Process symbols with rate limiting
      let successCount = 0;
      for (const symbol of symbols) {
        try {
          // Normalize symbol case
          const symbolStr = String(symbol);
          const yahooSymbol = symbolStr.toUpperCase();
          
          console.log(`Processing ${yahooSymbol} (${region}) - ${successCount+1}/${symbols.length}`);
          
          const success = await this.fetchAndStoreCurrentPrice(yahooSymbol, region);
          
          if (success) {
            successCount++;
            console.log(`✓ Successfully updated current price for ${yahooSymbol} (${region})`);
          } else {
            console.log(`✗ Failed to update current price for ${yahooSymbol} (${region})`);
          }
          
          // Add a delay to avoid rate limiting
          if (delayMs > 0 && symbol !== symbols[symbols.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          // Continue to next symbol
        }
      }
      
      console.log(`Successfully updated current prices for ${successCount}/${symbols.length} symbols in ${region} portfolio`);
      return { successCount, totalSymbols: symbols.length };
    } catch (error) {
      console.error(`Error updating current prices for ${region} portfolio:`, error);
      return { successCount: 0, totalSymbols: 0 };
    }
  }
  
  /**
   * Update current prices for all portfolio regions (USD, CAD, INTL)
   */
  async updateAllCurrentPrices(delayMs: number = 1000): Promise<{
    [key: string]: { successCount: number, totalSymbols: number }
  }> {
    try {
      console.log("Starting current price update for all portfolios");
      
      const regions = ['USD', 'CAD', 'INTL'];
      const results: { [key: string]: { successCount: number, totalSymbols: number } } = {};
      
      for (const region of regions) {
        results[region] = await this.updatePortfolioCurrentPrices(region, delayMs);
        
        // Add a delay between regions to avoid rate limiting
        if (region !== regions[regions.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error updating current prices for all portfolios:", error);
      return { USD: { successCount: 0, totalSymbols: 0 }, CAD: { successCount: 0, totalSymbols: 0 }, INTL: { successCount: 0, totalSymbols: 0 } };
    }
  }
  
  /**
   * Get all current prices for a given region
   */
  async getCurrentPricesByRegion(region: string): Promise<any[]> {
    try {
      const results = await db.select().from(currentPrices).where(eq(currentPrices.region, region));
      return results;
    } catch (error) {
      console.error(`Error getting current prices for region ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Get current price for a specific symbol and region
   */
  async getCurrentPrice(symbol: string, region: string): Promise<any | null> {
    try {
      const [result] = await db.select().from(currentPrices)
        .where(sql`${currentPrices.symbol} = ${symbol} AND ${currentPrices.region} = ${region}`);
      return result || null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol} (${region}):`, error);
      return null;
    }
  }
}

// Create a singleton instance
export const currentPriceService = new CurrentPriceService();
import yahooFinance from 'yahoo-finance2';
import { storage } from '../storage';
import { InsertHistoricalPrice } from '@shared/schema';
import { DateTime } from 'luxon';

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
    period: string = '1y', 
    interval: string = '1d'
  ): Promise<boolean> {
    try {
      // Check if we need to add a suffix based on region
      let yahooSymbol = symbol;
      if (region === 'CAD') {
        yahooSymbol = `${symbol}.TO`;
      } else if (region === 'INTL' && !symbol.includes('.')) {
        // For international stocks, we might need different suffixes
        // This is a simplification - you might need more logic based on the exchange
        yahooSymbol = `${symbol}.L`; // Default to London Stock Exchange
      }

      console.log(`Fetching historical prices for ${yahooSymbol} (${region})`);
      
      const result = await yahooFinance.chart(yahooSymbol, {
        period1: this.getPeriodStartDate(period),
        interval: interval as any,
        includePrePost: false
      });

      if (!result.quotes || result.quotes.length === 0) {
        console.warn(`No historical data found for ${yahooSymbol}`);
        return false;
      }

      // Delete existing data for this symbol/region
      await storage.deleteHistoricalPrices(symbol, region);

      // Map Yahoo Finance data to our database schema
      const historicalPrices: InsertHistoricalPrice[] = result.quotes.map(quote => {
        // Yahoo Finance data structure analysis
        console.log(`Quote data sample: ${JSON.stringify(quote).substring(0, 200)}`);
        
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

      // Store in database
      await storage.bulkCreateHistoricalPrices(historicalPrices);
      
      console.log(`Stored ${historicalPrices.length} historical prices for ${symbol} (${region})`);
      return true;
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return false;
    }
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
    period: string = '1y', 
    interval: string = '1d'
  ): Promise<number> {
    try {
      const stocks = await storage.getPortfolioStocks(region);
      let successCount = 0;

      for (const stock of stocks) {
        const success = await this.fetchAndStoreHistoricalPrices(
          stock.symbol, 
          region, 
          period, 
          interval
        );
        
        if (success) {
          successCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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
        return now.minus({ years: 1 }).toJSDate(); // Default to 1 year
    }
  }
}

// Export a singleton instance
export const historicalPriceService = new HistoricalPriceService();
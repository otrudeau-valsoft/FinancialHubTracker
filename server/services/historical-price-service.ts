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
        let date: Date;
        
        if (quote.date) {
          // If we have a date object, use it directly
          date = new Date(quote.date);
        } else if (quote.timestamp) {
          // If we have a timestamp (in milliseconds), convert it
          date = new Date(Number(quote.timestamp) * 1000); // Convert seconds to milliseconds if needed
        } else {
          // Last resort fallback
          date = new Date();
          console.warn(`No valid date or timestamp for ${symbol} (${region}), using current date`);
        }
        
        return {
          symbol,
          date,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
          adjustedClose: quote.adjclose,
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
   * Get start date based on period
   * @param period Period string ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
   * @returns Date object for the start of the period
   */
  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    
    switch (period) {
      case '1d':
        return new Date(now.setDate(now.getDate() - 1));
      case '5d':
        return new Date(now.setDate(now.getDate() - 5));
      case '1mo':
        return new Date(now.setMonth(now.getMonth() - 1));
      case '3mo':
        return new Date(now.setMonth(now.getMonth() - 3));
      case '6mo':
        return new Date(now.setMonth(now.getMonth() - 6));
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case '2y':
        return new Date(now.setFullYear(now.getFullYear() - 2));
      case '5y':
        return new Date(now.setFullYear(now.getFullYear() - 5));
      case '10y':
        return new Date(now.setFullYear(now.getFullYear() - 10));
      case 'ytd':
        return new Date(now.getFullYear(), 0, 1); // January 1st of current year
      case 'max':
        return new Date(1970, 0, 1); // Unix epoch
      default:
        return new Date(now.setFullYear(now.getFullYear() - 1)); // Default to 1 year
    }
  }
}

// Export a singleton instance
export const historicalPriceService = new HistoricalPriceService();
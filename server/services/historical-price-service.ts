import { storage } from '../storage';
import { db } from '../db';
import yahooFinance from 'yahoo-finance2';
import { dateToSQLDateString } from '../util';
import { historicalPrices, type InsertHistoricalPrice } from '@shared/schema';
import { and, eq, desc, asc, sql } from 'drizzle-orm';

class HistoricalPriceService {

  /**
   * Get historical prices for a symbol and region with optional date range
   */
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      return await storage.getHistoricalPrices(symbol, region, startDate, endDate);
    } catch (error) {
      console.error(`Error getting historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Get the latest historical price for a symbol and region
   */
  async getLatestHistoricalPrice(symbol: string, region: string) {
    try {
      // Query the database directly for better performance
      const result = await db.select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region)
          )
        )
        .orderBy(desc(historicalPrices.date))
        .limit(1);
      
      return result;
    } catch (error) {
      console.error(`Error getting latest historical price for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Fetch historical prices for a symbol from Yahoo Finance
   */
  async fetchHistoricalPrices(symbol: string, region: string, startDate: Date, endDate: Date = new Date()) {
    try {
      let yahooSymbol = symbol;
      
      // Add .TO suffix for Canadian stocks if not already present
      if (region === 'CAD' && !symbol.endsWith('.TO')) {
        yahooSymbol = `${symbol}.TO`;
      }
      
      console.log(`Fetching historical prices for ${yahooSymbol} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      
      // Format dates for Yahoo Finance API
      const period1 = dateToSQLDateString(startDate);
      const period2 = dateToSQLDateString(endDate);
      
      // Fetch historical prices from Yahoo Finance
      const result = await yahooFinance.historical(yahooSymbol, {
        period1,
        period2,
        interval: '1d'
      });
      
      return result;
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Fetch and store historical prices for a symbol
   * 
   * This implementation focuses on fetching only newer data than what we already have
   */
  async fetchAndStoreHistoricalPrices(symbol: string, region: string, startDate: Date, endDate: Date = new Date()) {
    try {
      // Check if we need to fetch any data at all
      if (startDate >= endDate) {
        console.log(`No new data to fetch for ${symbol} (${region}): start date ${startDate.toISOString()} is after end date ${endDate.toISOString()}`);
        return [];
      }
      
      // Fetch historical prices from Yahoo Finance
      const historicalData = await this.fetchHistoricalPrices(symbol, region, startDate, endDate);
      
      // Skip if no data returned
      if (!historicalData || historicalData.length === 0) {
        console.log(`No historical data returned for ${symbol} (${region})`);
        return [];
      }
      
      // Only add new data points to the database
      const insertData: InsertHistoricalPrice[] = historicalData.map(data => ({
        symbol,
        region,
        date: dateToSQLDateString(data.date),
        open: data.open.toString(),
        high: data.high.toString(),
        low: data.low.toString(),
        close: data.close.toString(),
        volume: data.volume?.toString() || '0',
        adjustedClose: data.adjClose?.toString() || data.close.toString()
      }));
      
      // Store historical prices
      const results = await storage.bulkCreateHistoricalPrices(insertData);
      
      console.log(`Stored ${results.length} historical prices for ${symbol} (${region})`);
      
      return results;
    } catch (error) {
      console.error(`Error fetching and storing historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Fetch and update all historical prices for a portfolio
   * Only adds new data points from the latest data we have
   */
  async updatePortfolioHistoricalPrices(region: string) {
    try {
      // Get all symbols in the portfolio
      let symbols: string[];
      
      switch (region) {
        case 'USD':
          const usdPortfolio = await storage.getPortfolioStocks('USD');
          symbols = usdPortfolio.map(stock => stock.symbol);
          break;
        case 'CAD':
          const cadPortfolio = await storage.getPortfolioStocks('CAD');
          symbols = cadPortfolio.map(stock => stock.symbol);
          break;
        case 'INTL':
          const intlPortfolio = await storage.getPortfolioStocks('INTL');
          symbols = intlPortfolio.map(stock => stock.symbol);
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      console.log(`Updating historical prices for ${symbols.length} symbols in ${region} portfolio`);
      
      // Process each symbol
      const results = [];
      for (const symbol of symbols) {
        try {
          // Get the latest historical price to determine from when to start fetching
          const latestPrice = await this.getLatestHistoricalPrice(symbol, region);
          
          let startDate: Date;
          if (latestPrice && latestPrice.length > 0) {
            // Start the day after the latest price we have
            startDate = new Date(latestPrice[0].date);
            startDate.setDate(startDate.getDate() + 1);
          } else {
            // If we have no data, fetch the last 5 years
            startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 5);
          }
          
          // Only fetch if there's potentially new data
          if (startDate < new Date()) {
            console.log(`Fetching historical prices for ${symbol} from ${startDate.toISOString().split('T')[0]}`);
            const result = await this.fetchAndStoreHistoricalPrices(symbol, region, startDate);
            results.push({ symbol, success: true, result });
          } else {
            console.log(`Historical prices for ${symbol} are already up to date`);
            results.push({ symbol, success: true, result: [] });
          }
        } catch (error) {
          console.error(`Error updating historical prices for ${symbol} (${region}):`, error);
          results.push({ symbol, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error updating portfolio historical prices for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Update historical prices for all portfolios
   */
  async updateAllHistoricalPrices() {
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      let allResults = [];
      
      for (const region of regions) {
        try {
          console.log(`Updating historical prices for ${region} portfolio`);
          const regionResults = await this.updatePortfolioHistoricalPrices(region);
          allResults = [...allResults, ...regionResults];
        } catch (error) {
          console.error(`Error updating historical prices for ${region}:`, error);
          // Add error entry for the entire region
          allResults.push({ 
            symbol: `${region}_all`, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return allResults;
    } catch (error) {
      console.error('Error updating all historical prices:', error);
      throw error;
    }
  }
}

export const historicalPriceService = new HistoricalPriceService();
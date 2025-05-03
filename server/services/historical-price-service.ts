import { storage } from '../storage';
import { db } from '../db';
import yahooFinance from 'yahoo-finance2';
import { dateToSQLDateString } from '../util';
import { historicalPrices, type InsertHistoricalPrice } from '@shared/schema';
import { and, eq, desc, asc, sql } from 'drizzle-orm';
import { calculateMultipleRSI } from '../utils/technical-indicators';

// Rate limiting configuration for Yahoo Finance API - match the same settings as current-price-service
const RATE_LIMIT = {
  maxRequests: 2,      // Maximum requests per interval
  interval: 1000,      // Interval in milliseconds (1 second)
  requestQueue: [] as { resolve: Function, reject: Function, symbol: string }[],
  inProgress: 0,       // Number of requests currently in progress
  lastRequestTime: 0,  // Timestamp of the last request
};

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
   * Helper method to convert a period string to a Date object
   * Handles formats like "5y", "1mo", "7d" (y=years, mo=months, d=days)
   */
  private periodToDate(period: string | Date): Date {
    // If it's already a Date object, return it
    if (period instanceof Date) {
      return period;
    }
    
    // Handle Yahoo Finance period format (e.g., "5y")
    if (typeof period === 'string') {
      const now = new Date();
      const match = period.match(/^(\d+)([ymd]|mo)$/);
      
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        
        const result = new Date();
        
        if (unit === 'y') {
          result.setFullYear(now.getFullYear() - amount);
        } else if (unit === 'mo') {
          result.setMonth(now.getMonth() - amount);
        } else if (unit === 'd') {
          result.setDate(now.getDate() - amount);
        }
        
        return result;
      }
      
      // If it's a date string, try to parse it
      const parsedDate = new Date(period);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    // Default to 5 years ago if can't parse
    console.warn(`Could not parse date/period: ${period}, defaulting to 5 years ago`);
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 5);
    return defaultDate;
  }
  
  /**
   * Add a request to the rate limiting queue
   */
  private enqueueRequest(symbol: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add to queue
      RATE_LIMIT.requestQueue.push({ resolve, reject, symbol });
      
      // Process the queue
      this.processQueue();
    });
  }
  
  /**
   * Process the rate limiting queue
   */
  private processQueue() {
    // If we're at our limit or no items in queue, just return
    if (RATE_LIMIT.inProgress >= RATE_LIMIT.maxRequests || RATE_LIMIT.requestQueue.length === 0) {
      return;
    }
    
    // Calculate time since last request
    const now = Date.now();
    const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
    
    // If we haven't waited long enough, set a timeout
    if (timeSinceLastRequest < RATE_LIMIT.interval) {
      setTimeout(() => this.processQueue(), RATE_LIMIT.interval - timeSinceLastRequest);
      return;
    }
    
    // Get the next request from the queue
    const request = RATE_LIMIT.requestQueue.shift();
    if (!request) return;
    
    // Update state
    RATE_LIMIT.inProgress++;
    RATE_LIMIT.lastRequestTime = now;
    
    // Process the request
    setTimeout(() => {
      // Resolve the promise, which will allow the request to proceed
      request.resolve();
      
      // Update state
      RATE_LIMIT.inProgress--;
      
      // Process the next item in the queue
      this.processQueue();
    }, 50); // Small delay to ensure rate limiting
  }

  /**
   * Fetch historical prices for a symbol from Yahoo Finance with rate limiting
   */
  async fetchHistoricalPrices(symbol: string, region: string, startDate: Date | string, endDate: Date | string = new Date()) {
    try {
      // Convert dates if they're strings
      const startDateObj = this.periodToDate(startDate);
      const endDateObj = this.periodToDate(endDate);
      
      let yahooSymbol = symbol;
      
      // Add .TO suffix for Canadian stocks if not already present
      if (region === 'CAD' && !symbol.endsWith('.TO')) {
        yahooSymbol = `${symbol}.TO`;
      }
      
      console.log(`Fetching historical prices for ${yahooSymbol} from ${startDateObj.toISOString().split('T')[0]} to ${endDateObj.toISOString().split('T')[0]}`);
      
      // Wait for rate limit queue slot
      await this.enqueueRequest(symbol);
      
      // Format dates for Yahoo Finance API
      const period1 = dateToSQLDateString(startDateObj);
      const period2 = dateToSQLDateString(endDateObj);
      
      // Fetch historical prices from Yahoo Finance using exponential backoff
      let attempt = 0;
      const maxAttempts = 3;
      let lastError;
      
      while (attempt < maxAttempts) {
        try {
          // Fetch historical prices from Yahoo Finance
          return await yahooFinance.historical(yahooSymbol, {
            period1,
            period2,
            interval: '1d'
          });
        } catch (error) {
          lastError = error;
          attempt++;
          
          if (attempt < maxAttempts) {
            // Exponential backoff
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            console.log(`Attempt ${attempt} failed for ${yahooSymbol}, retrying in ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }
      
      // If we got here, all attempts failed
      throw lastError || new Error(`Failed to fetch historical prices after ${maxAttempts} attempts`);
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Fetch and store historical prices for a symbol
   * 
   * This implementation focuses on fetching only newer data than what we already have
   * Can handle both Date objects and period strings for startDate and endDate
   * Uses upsert to avoid duplicate entries
   */
  async fetchAndStoreHistoricalPrices(symbol: string, region: string, startDate: Date | string, endDate: Date | string = new Date()) {
    try {
      // Convert dates if they're strings
      const startDateObj = this.periodToDate(startDate);
      const endDateObj = this.periodToDate(endDate);
      
      // Check if we need to fetch any data at all
      if (startDateObj >= endDateObj) {
        console.log(`No new data to fetch for ${symbol} (${region}): start date ${startDateObj.toISOString()} is after end date ${endDateObj.toISOString()}`);
        return [];
      }
      
      // For shorter time frames, use more detailed logging
      const daysDiff = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        console.log(`Fetching historical prices for ${symbol} from ${startDateObj.toISOString().split('T')[0]} to ${endDateObj.toISOString().split('T')[0]} (${daysDiff} days)`);
      } else {
        console.log(`Fetching historical prices for ${symbol} from ${startDateObj.toISOString().split('T')[0]} to ${endDateObj.toISOString().split('T')[0]}`);
      }
      
      // Fetch historical prices from Yahoo Finance
      const historicalData = await this.fetchHistoricalPrices(symbol, region, startDateObj, endDateObj);
      
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
      
      // Check for abnormal values that could indicate bad data
      // For example, unusually large daily changes
      const sanitizedData = insertData.filter(data => {
        // Add null/undefined check before parsing
        const close = data.close ? parseFloat(data.close) : 0;
        const open = data.open ? parseFloat(data.open) : 0;
        
        // Skip entries with abnormal daily changes (>20%)
        if (Math.abs((close - open) / open) > 0.20) {
          console.warn(`Abnormal price movement detected for ${symbol} on ${data.date}: Open ${open}, Close ${close} (${((close - open) / open * 100).toFixed(2)}% change)`);
          
          // For market indices specifically (SPY, XIC, ACWX), require additional verification
          if (symbol === 'SPY' || symbol === 'XIC.TO' || symbol === 'ACWX') {
            console.warn(`Skipping abnormal market index data for ${symbol} on ${data.date}`);
            return false;
          }
        }
        
        return true;
      });
      
      // Before saving, we need to calculate RSI values
      // First, we need to get all existing historical prices for this symbol
      // to ensure accurate RSI calculations (which require more historical data)
      console.log(`Retrieving existing historical prices for ${symbol} (${region}) to calculate RSI`);
      const existingPrices = await this.getHistoricalPrices(symbol, region);
      
      // Combine existing and new prices for RSI calculation
      const allPrices = [...existingPrices, ...sanitizedData].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Extract closing prices for RSI calculation with null safety
      const closingPrices = allPrices.map(price => {
        // Use adjustedClose if available, otherwise use close
        const priceValue = price.adjustedClose || price.close;
        // Make sure we have a valid value to parse
        return priceValue ? parseFloat(priceValue) : 0;
      });
      
      // Calculate RSI values for different periods
      console.log(`Calculating RSI values for ${symbol} (${region})`);
      const rsiValues = calculateMultipleRSI(closingPrices, [9, 14, 21]);
      
      // Enrich the sanitized data with RSI values
      // We need to map the calculated RSI values to the appropriate entries in sanitizedData
      for (let i = 0; i < sanitizedData.length; i++) {
        const newDataIndex = existingPrices.length + i;
        
        // Only assign RSI if it was calculated (it might be null for the first few entries)
        if (newDataIndex < rsiValues[9].length && rsiValues[9][newDataIndex] !== null) {
          sanitizedData[i].rsi9 = rsiValues[9][newDataIndex]?.toString();
        }
        
        if (newDataIndex < rsiValues[14].length && rsiValues[14][newDataIndex] !== null) {
          sanitizedData[i].rsi14 = rsiValues[14][newDataIndex]?.toString();
        }
        
        if (newDataIndex < rsiValues[21].length && rsiValues[21][newDataIndex] !== null) {
          sanitizedData[i].rsi21 = rsiValues[21][newDataIndex]?.toString();
        }
      }
      
      // Store historical prices with upsert pattern to avoid duplicates
      const results = await storage.bulkCreateHistoricalPrices(sanitizedData);
      
      console.log(`Stored ${results.length} historical prices with RSI data for ${symbol} (${region})`);
      
      return results;
    } catch (error) {
      console.error(`Error fetching and storing historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Process a batch of symbols
   */
  private async processBatch(symbols: string[], region: string, batchIndex: number, batchSize: number) {
    const batchSymbols = symbols.slice(batchIndex, batchIndex + batchSize);
    const batchResults = [];
    
    console.log(`Processing batch ${batchIndex / batchSize + 1} of ${Math.ceil(symbols.length / batchSize)} (${batchSymbols.length} symbols)`);
    
    for (let i = 0; i < batchSymbols.length; i++) {
      const symbol = batchSymbols[i];
      console.log(`Processing ${symbol} (${region}) - ${batchIndex + i + 1}/${symbols.length}`);
      
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
          batchResults.push({ symbol, success: true, result });
        } else {
          console.log(`Historical prices for ${symbol} are already up to date`);
          batchResults.push({ symbol, success: true, result: [] });
        }
        
        // Add a small delay between symbols to avoid overwhelming the API
        if (i < batchSymbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error updating historical prices for ${symbol} (${region}):`, error);
        batchResults.push({ symbol, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return batchResults;
  }

  /**
   * Fetch and update all historical prices for a portfolio with batch processing
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
      
      // Process symbols in batches
      const results: {symbol: string, success: boolean, result?: any, error?: string}[] = [];
      const batchSize = 5; // Process 5 symbols at a time
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        // Process this batch
        const batchResults = await this.processBatch(symbols, region, i, batchSize);
        results.push(...batchResults);
        
        // Add a pause between batches to avoid overwhelming the API
        if (i + batchSize < symbols.length) {
          console.log(`Pausing for 2 seconds between batches...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error updating portfolio historical prices for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Update historical prices for market indices
   */
  async updateIndicesHistoricalPrices() {
    try {
      // Get historical data for market indices
      const indices = [
        { symbol: 'SPY', region: 'USD' },
        { symbol: 'XIC.TO', region: 'CAD' },
        { symbol: 'ACWX', region: 'INTL' }
      ];
      
      const results: {symbol: string, success: boolean, result?: any, error?: string}[] = [];
      
      for (const index of indices) {
        try {
          // Get the latest historical price to determine from when to start fetching
          const latestPrice = await this.getLatestHistoricalPrice(index.symbol, index.region);
          
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
            console.log(`Fetching historical prices for index ${index.symbol} from ${startDate.toISOString().split('T')[0]}`);
            const result = await this.fetchAndStoreHistoricalPrices(index.symbol, index.region, startDate);
            results.push({ symbol: index.symbol, success: true, result });
          } else {
            console.log(`Historical prices for index ${index.symbol} are already up to date`);
            results.push({ symbol: index.symbol, success: true, result: [] });
          }
          
          // Add a pause between indices
          if (index !== indices[indices.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error updating historical prices for index ${index.symbol}:`, error);
          results.push({
            symbol: index.symbol,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating indices historical prices:', error);
      throw error;
    }
  }

  // Flag to prevent concurrent executions
  private isUpdatingAllHistoricalPrices = false;

  /**
   * Update historical prices for all portfolios with batch processing
   * Uses a mutex pattern to prevent duplicate concurrent executions
   */
  async updateAllHistoricalPrices() {
    // Check if already running to prevent duplicate executions
    if (this.isUpdatingAllHistoricalPrices) {
      console.log('Historical price update already in progress, skipping duplicate request');
      return {
        message: 'Update already in progress, please wait for the current operation to complete',
        results: [],
        successCount: 0,
        totalCount: 0,
        alreadyRunning: true
      };
    }
    
    // Set the flag to indicate this process is running
    this.isUpdatingAllHistoricalPrices = true;
    
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      let allResults: {symbol: string, success: boolean, result?: any, error?: string}[] = [];
      
      // First update market indices
      try {
        console.log('Updating historical prices for market indices');
        const indicesResults = await this.updateIndicesHistoricalPrices();
        allResults = [...allResults, ...indicesResults];
        
        // Add a pause after updating indices
        console.log(`Pausing for 2 seconds after updating indices...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error updating historical prices for indices:', error);
        allResults.push({
          symbol: 'indices_all',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Then update portfolio stocks
      for (const region of regions) {
        try {
          console.log(`Updating historical prices for ${region} portfolio`);
          const regionResults = await this.updatePortfolioHistoricalPrices(region);
          allResults = [...allResults, ...regionResults];
          
          // Add a pause between regions to avoid overwhelming the API
          if (region !== regions[regions.length - 1]) {
            console.log(`Pausing for 3 seconds between regions...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
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
      
      const successCount = allResults.filter(r => r.success).length;
      return {
        message: `Updated historical prices for ${regions.length} portfolios and market indices`,
        results: allResults,
        successCount,
        totalCount: allResults.length
      };
    } catch (error) {
      console.error('Error updating all historical prices:', error);
      throw error;
    } finally {
      // Always reset the flag when done, even if there was an error
      this.isUpdatingAllHistoricalPrices = false;
    }
  }
}

export const historicalPriceService = new HistoricalPriceService();
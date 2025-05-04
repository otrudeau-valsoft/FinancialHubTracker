import { storage } from '../storage';
import { db } from '../db';
import yahooFinance from 'yahoo-finance2';
import { dateToSQLDateString } from '../util';
import { historicalPrices, type InsertHistoricalPrice } from '@shared/schema';
import { and, eq, desc, asc, sql } from 'drizzle-orm';
import { calculateMultipleRSI, calculateMACD } from '../utils/technical-indicators';

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
  async fetchAndStoreHistoricalPrices(
    symbol: string, 
    region: string, 
    startDate: Date | string, 
    endDate: Date | string = new Date(), 
    forceRsiRefresh: boolean = false,
    forceMacdRefresh: boolean = false
  ) {
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
      const allPrices = [...existingPrices, ...sanitizedData].sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Extract closing prices for RSI calculation with null safety
      const closingPrices = allPrices.map((price: any) => {
        // Use adjustedClose if available, otherwise use close
        const priceValue = price.adjustedClose || price.close;
        // Make sure we have a valid value to parse
        return priceValue ? parseFloat(priceValue) : 0;
      });
      
      // Calculate RSI values for different periods
      console.log(`Calculating RSI values for ${symbol} (${region})`);
      const rsiValues = calculateMultipleRSI(closingPrices, [9, 14, 21]);
      
      // Prepare arrays to store both new and updated prices
      const newPrices: any[] = sanitizedData.map(item => ({...item} as any));
      const updatedExistingPrices: any[] = [];
      
      // Enrich the sanitized data with RSI values
      // We need to map the calculated RSI values to the appropriate entries in sanitizedData
      for (let i = 0; i < sanitizedData.length; i++) {
        const newDataIndex = existingPrices.length + i;
        
        // Only assign RSI if it was calculated (it might be null for the first few entries)
        if (newDataIndex < rsiValues[9].length && rsiValues[9][newDataIndex] !== null) {
          newPrices[i].rsi9 = rsiValues[9][newDataIndex]?.toString();
        }
        
        if (newDataIndex < rsiValues[14].length && rsiValues[14][newDataIndex] !== null) {
          newPrices[i].rsi14 = rsiValues[14][newDataIndex]?.toString();
        }
        
        if (newDataIndex < rsiValues[21].length && rsiValues[21][newDataIndex] !== null) {
          newPrices[i].rsi21 = rsiValues[21][newDataIndex]?.toString();
        }
      }
      
      // Update existing prices with RSI values
      for (let i = 0; i < existingPrices.length; i++) {
        // Use Object.assign instead of spread operator to avoid type errors
        const existingPrice = Object.assign({}, existingPrices[i]) as any;
        let needsUpdate = false;
        
        // Check date to determine if this is a recent entry (last 10 trading days)
        const existingDate = new Date(existingPrice.date);
        const daysSinceEntry = Math.floor((new Date().getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24));
        const isRecentEntry = daysSinceEntry <= 10; // Consider last 10 days as recent for refreshing
        
        // Update existing prices if RSI values are missing OR if we're forcing a refresh for recent entries
        if (!existingPrice.rsi9 || !existingPrice.rsi14 || !existingPrice.rsi21 || (forceRsiRefresh && isRecentEntry)) {
          // Log if we're forcing a refresh of a recent entry that already has RSI values
          if (forceRsiRefresh && isRecentEntry && existingPrice.rsi9 && existingPrice.rsi14 && existingPrice.rsi21) {
            console.log(`Forcing RSI refresh for recent entry: ${symbol} on ${existingPrice.date} (${daysSinceEntry} days ago)`);
          }
          
          // Assign RSI if it was calculated
          if (i < rsiValues[9].length && rsiValues[9][i] !== null) {
            existingPrice.rsi9 = rsiValues[9][i]?.toString();
            needsUpdate = true;
          }
          
          if (i < rsiValues[14].length && rsiValues[14][i] !== null) {
            existingPrice.rsi14 = rsiValues[14][i]?.toString();
            needsUpdate = true;
          }
          
          if (i < rsiValues[21].length && rsiValues[21][i] !== null) {
            existingPrice.rsi21 = rsiValues[21][i]?.toString();
            needsUpdate = true;
          }
          
          // Only add to update list if any RSI values were assigned
          if (needsUpdate) {
            updatedExistingPrices.push(existingPrice);
          }
        }
      }
      
      // Log counts for visibility
      console.log(`Processing ${newPrices.length} new prices and updating RSI for ${updatedExistingPrices.length} existing prices`);
      
      // Store both new and updated prices
      let results: any[] = [];
      
      // Store new historical prices with upsert pattern to avoid duplicates
      if (newPrices.length > 0) {
        const newResults = await storage.bulkCreateHistoricalPrices(newPrices);
        results = results.concat(newResults || []);
      }
      
      // Update RSI values for existing prices that need it
      if (updatedExistingPrices.length > 0) {
        const updatedResults = await storage.bulkCreateHistoricalPrices(updatedExistingPrices);
        results = results.concat(updatedResults || []);
      }
      
      console.log(`Stored ${results.length} historical prices with RSI data for ${symbol} (${region})`);
      
      // If MACD refresh is requested, calculate and update MACD values
      if (forceMacdRefresh) {
        console.log(`Calculating and updating MACD values for ${symbol} (${region})`);
        await this.calculateAndUpdateMACDForSymbol(symbol, region, forceMacdRefresh);
      }
      
      return results;
    } catch (error) {
      console.error(`Error fetching and storing historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Process a batch of symbols
   * @param forceRsiRefresh If true, will force updating RSI values for recent price points
   * @param forceMacdRefresh If true, will force updating MACD values for recent price points
   */
  private async processBatch(symbols: string[], region: string, batchIndex: number, batchSize: number, forceRsiRefresh: boolean = false, forceMacdRefresh: boolean = false) {
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
          console.log(`Fetching historical prices for ${symbol} from ${startDate.toISOString().split('T')[0]} with forceRsiRefresh=${forceRsiRefresh}, forceMacdRefresh=${forceMacdRefresh}`);
          const result = await this.fetchAndStoreHistoricalPrices(
            symbol, 
            region, 
            startDate, 
            undefined, // endDate (use default current date)
            forceRsiRefresh,
            forceMacdRefresh
          );
          batchResults.push({ symbol, success: true, result, rsiCalculated: forceRsiRefresh });
        } else {
          console.log(`Historical prices for ${symbol} are already up to date, checking if RSI/MACD need refresh`);
          
          // Even if no new data to fetch, we can still refresh RSI values for existing data
          if (forceRsiRefresh) {
            console.log(`Forcing RSI refresh for ${symbol} even though prices are up to date`);
            const rsiResult = await this.calculateAndUpdateRSIForSymbol(symbol, region, forceRsiRefresh);
            batchResults.push({ symbol, success: true, result: rsiResult, rsiCalculated: true });
          }
          
          // Similarly, we can refresh MACD values for existing data
          if (forceMacdRefresh) {
            console.log(`Forcing MACD refresh for ${symbol} even though prices are up to date`);
            const macdResult = await this.calculateAndUpdateMACDForSymbol(symbol, region, forceMacdRefresh);
            // If we already added this symbol for RSI, don't add another result
            if (!forceRsiRefresh) {
              batchResults.push({ symbol, success: true, result: macdResult, macdCalculated: true });
            }
          }
          
          // If neither RSI nor MACD refresh were requested, add an empty result
          if (!forceRsiRefresh && !forceMacdRefresh) {
            batchResults.push({ symbol, success: true, result: [], rsiCalculated: false, macdCalculated: false });
          }
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
   * @param region Portfolio region (USD, CAD, INTL)
   * @param forceRsiRefresh If true, forces updating RSI for recent price points
   * @param forceMacdRefresh If true, forces updating MACD for recent price points
   */
  async updatePortfolioHistoricalPrices(region: string, forceRsiRefresh: boolean = false, forceMacdRefresh: boolean = false) {
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
        // Process this batch, passing the forceRsiRefresh and forceMacdRefresh parameters
        console.log(`Processing batch with forceRsiRefresh=${forceRsiRefresh}, forceMacdRefresh=${forceMacdRefresh}`);
        const batchResults = await this.processBatch(symbols, region, i, batchSize, forceRsiRefresh, forceMacdRefresh);
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
   * @param forceRsiRefresh If true, forces updating RSI for recent price points
   * @param forceMacdRefresh If true, forces updating MACD for recent price points
   */
  async updateIndicesHistoricalPrices(forceRsiRefresh: boolean = false, forceMacdRefresh: boolean = false) {
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
            console.log(`Fetching historical prices for index ${index.symbol} from ${startDate.toISOString().split('T')[0]} with forceRsiRefresh=${forceRsiRefresh}, forceMacdRefresh=${forceMacdRefresh}`);
            const result = await this.fetchAndStoreHistoricalPrices(
              index.symbol, 
              index.region, 
              startDate, 
              undefined, // endDate - use default current date
              forceRsiRefresh,
              forceMacdRefresh
            );
            results.push({ symbol: index.symbol, success: true, result });
          } else {
            console.log(`Historical prices for index ${index.symbol} are already up to date, checking if RSI/MACD need refresh`);
            
            // Even if no new data to fetch, we can still refresh RSI values for existing data
            if (forceRsiRefresh) {
              console.log(`Forcing RSI refresh for index ${index.symbol} even though prices are up to date`);
              const rsiResult = await this.calculateAndUpdateRSIForSymbol(index.symbol, index.region, forceRsiRefresh);
              results.push({ symbol: index.symbol, success: true, result: rsiResult, rsiCalculated: true });
            }
            
            // Similarly, we can refresh MACD values for existing data
            if (forceMacdRefresh) {
              console.log(`Forcing MACD refresh for index ${index.symbol} even though prices are up to date`);
              const macdResult = await this.calculateAndUpdateMACDForSymbol(index.symbol, index.region, forceMacdRefresh);
              // If we already added this symbol for RSI, don't add another result
              if (!forceRsiRefresh) {
                results.push({ symbol: index.symbol, success: true, result: macdResult, macdCalculated: true });
              }
            }
            
            // If neither RSI nor MACD refresh were requested, add an empty result
            if (!forceRsiRefresh && !forceMacdRefresh) {
              results.push({ symbol: index.symbol, success: true, result: [], rsiCalculated: false, macdCalculated: false });
            }
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
   * Calculate and update RSI values for all existing historical prices for a symbol
   * Uses the new separate rsi_data table for better data organization and performance
   * Optimized to only calculate RSI for data points that don't have RSI values yet
   * 
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param forceRsiRefresh If true, forces updating RSI for the most recent price points
   */
  async calculateAndUpdateRSIForSymbol(symbol: string, region: string, forceRsiRefresh: boolean = false) {
    try {
      console.log(`Calculating and updating RSI values for ${symbol} (${region}) with forceRsiRefresh=${forceRsiRefresh}`);
      
      // Get all historical prices for this symbol
      const historicalPrices = await this.getHistoricalPrices(symbol, region);
      
      if (!historicalPrices || historicalPrices.length === 0) {
        console.log(`No historical prices found for ${symbol} (${region})`);
        return [];
      }
      
      // Sort by date (oldest to newest)
      const sortedPrices = [...historicalPrices].sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Get existing RSI data to check for missing values
      const existingRsiData = await storage.getRsiData(symbol, region);
      
      // Create maps for existing RSI data by historical price ID and date
      const rsiByHistoricalPriceId = new Map();
      const rsiByDate = new Map();
      
      existingRsiData.forEach((rsi: any) => {
        // Map by historical price ID
        if (rsi.historicalPriceId) {
          rsiByHistoricalPriceId.set(rsi.historicalPriceId, rsi);
        }
        
        // Map by date string
        const dateStr = typeof rsi.date === 'string'
          ? rsi.date.split('T')[0]
          : rsi.date instanceof Date
            ? rsi.date.toISOString().split('T')[0]
            : String(rsi.date);
        
        rsiByDate.set(dateStr, rsi);
      });
      
      // Identify which prices need RSI calculation by identifying missing RSI data
      const missingRsiPrices: any[] = [];
      const recentPricesNeedingRefresh: any[] = [];
      
      // We don't need to use a recent days window anymore
      // Instead we'll simply identify any prices without RSI data and calculate for those
      
      // Find the most recent date to check if we have today's data
      let hasRecentData = false;
      if (sortedPrices.length > 0) {
        const latestPrice = sortedPrices[sortedPrices.length - 1];
        const latestDate = new Date(latestPrice.date);
        const today = new Date();
        
        // Check if the latest price is from today or yesterday (for weekends/holidays)
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        hasRecentData = diffDays <= 3; // Consider data as recent if it's within the last 3 days
        
        console.log(`Latest price for ${symbol} is from ${latestDate.toISOString().split('T')[0]}, which is ${diffDays} days ago ${hasRecentData ? '' : '- data may be stale'}`);
        
        // Force refresh for the most recent data to ensure we have RSI values
        if (hasRecentData) {
          forceRsiRefresh = true;
          console.log(`Forcing RSI refresh for recent data of ${symbol}`);
        }
      }
      
      // First pass: identify which prices need RSI calculation
      for (let i = 0; i < sortedPrices.length; i++) {
        const price = sortedPrices[i];
        
        // Skip if we don't have a valid price point
        if (!price || !price.id) continue;
        
        // Check if this price already has RSI data
        let hasRsiData = rsiByHistoricalPriceId.has(price.id);
        
        // If not found by ID, try by date
        if (!hasRsiData) {
          const dateStr = typeof price.date === 'string'
            ? price.date.split('T')[0]
            : price.date instanceof Date
              ? price.date.toISOString().split('T')[0]
              : new Date(price.date).toISOString().split('T')[0];
          
          hasRsiData = rsiByDate.has(dateStr);
        }
        
        // Simple logic: If we don't have RSI data, add it to the missing list
        if (!hasRsiData) {
          // No RSI data at all - add to missing list
          missingRsiPrices.push(price);
        } 
        
        // If force refresh is enabled and this is the most recent price,
        // also add it to make sure it's up to date
        if (forceRsiRefresh && i === sortedPrices.length - 1) {
          // Always refresh the most recent price point when forced
          console.log(`Forcing refresh of most recent price point for ${symbol}`);
          // Only add if not already in the missing list
          if (hasRsiData) {
            recentPricesNeedingRefresh.push(price);
          }
        }
      }
      
      // If we have no prices needing RSI calculation, return early
      if (missingRsiPrices.length === 0 && recentPricesNeedingRefresh.length === 0) {
        console.log(`No RSI data needs updates for ${symbol} (${region})`);
        return [];
      }
      
      // Log what we're calculating
      console.log(`Calculating RSI for ${symbol} (${region}): ${missingRsiPrices.length} missing data points, ${recentPricesNeedingRefresh.length} recent points to refresh`);
      
      // Calculate RSI only if we have prices needing calculation
      if (missingRsiPrices.length > 0 || recentPricesNeedingRefresh.length > 0) {
        // Extract closing prices for RSI calculation - we need all prices for accurate calculation
        const closingPrices = sortedPrices.map((price: any) => {
          const priceValue = price.adjustedClose || price.close;
          return priceValue ? parseFloat(priceValue) : 0;
        });
        
        // Calculate RSI values
        const rsiValues = calculateMultipleRSI(closingPrices, [9, 14, 21]);
        
        // Prepare data for update
        const rsiDataToUpdate: any[] = [];
        
        // Process all prices that need RSI updates
        for (let i = 0; i < sortedPrices.length; i++) {
          const price = sortedPrices[i];
          
          // Skip if invalid price
          if (!price || !price.id) continue;
          
          // Determine if this price needs RSI update
          const priceDate = typeof price.date === 'string'
            ? price.date.split('T')[0]
            : price.date instanceof Date
              ? price.date.toISOString().split('T')[0]
              : new Date(price.date).toISOString().split('T')[0];
          
          // Check if this price needs update - simple approach:
          // 1. If we don't have RSI data at all for this price, calculate it
          // 2. If forceRsiRefresh is true and this is the most recent price, recalculate it
          const needsInitialCalculation = !rsiByHistoricalPriceId.has(price.id) && !rsiByDate.has(priceDate);
          const isLatestPrice = i === sortedPrices.length - 1; 
          const needsRefresh = forceRsiRefresh && isLatestPrice; // Only force refresh most recent point
          
          if (needsInitialCalculation || needsRefresh) {
            // Prepare RSI values for this price point
            let rsi9Value = null;
            let rsi14Value = null;
            let rsi21Value = null;
            let hasRsiValues = false;
            
            // For RSI 9-day period
            if (i < rsiValues[9].length && rsiValues[9][i] !== null) {
              rsi9Value = rsiValues[9][i]?.toString();
              hasRsiValues = true;
            }
            
            // For RSI 14-day period  
            if (i < rsiValues[14].length && rsiValues[14][i] !== null) {
              rsi14Value = rsiValues[14][i]?.toString();
              hasRsiValues = true;
            }
            
            // For RSI 21-day period
            if (i < rsiValues[21].length && rsiValues[21][i] !== null) {
              rsi21Value = rsiValues[21][i]?.toString();
              hasRsiValues = true;
            }
            
            // Log if this is the most recent price point and we're updating it
            if (i === sortedPrices.length - 1 && hasRsiValues) {
              console.log(`Updating most recent price for ${symbol} from ${price.date} with RSI values: 9=${rsi9Value}, 14=${rsi14Value}, 21=${rsi21Value}`);
            }
            
            // If we have any RSI values, add to update list
            if (hasRsiValues) {
              rsiDataToUpdate.push({
                historicalPriceId: price.id,
                symbol: symbol,
                date: price.date,
                region: region,
                rsi9: rsi9Value,
                rsi14: rsi14Value,
                rsi21: rsi21Value
              });
            }
          }
        }
        
        // Update the RSI data table with the new values
        if (rsiDataToUpdate.length > 0) {
          console.log(`Updating ${rsiDataToUpdate.length} RSI data records for ${symbol} (${region})`);
          const results = await storage.bulkCreateOrUpdateRsiData(rsiDataToUpdate);
          
          // Log a sample of the updated RSI data to verify values are set correctly
          if (results && results.length > 0) {
            const sample = results[results.length - 1]; // Most recent
            console.log(`Updated RSI data for ${symbol} (${region}) on ${sample.date}: RSI9=${sample.rsi9}, RSI14=${sample.rsi14}, RSI21=${sample.rsi21}`);
            
            // Check if RSI values are still null
            if (!sample.rsi14 || sample.rsi14 === 'null') {
              console.warn(`WARNING: RSI values are still null for ${symbol} even after update to dedicated RSI table.`);
            }
          }
          
          return results;
        } else {
          console.log(`No RSI data needs updates for ${symbol} (${region})`);
          return [];
        }
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error calculating and updating RSI for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Calculate and update MACD for a symbol
   * 
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param forceMacdRefresh If true, will force updating MACD values for recent price points
   */
  async calculateAndUpdateMACDForSymbol(symbol: string, region: string, forceMacdRefresh: boolean = false) {
    try {
      console.log(`Calculating and updating MACD values for ${symbol} (${region}) with forceMacdRefresh=${forceMacdRefresh}`);
      
      // Get all historical prices for this symbol
      const historicalPrices = await this.getHistoricalPrices(symbol, region);
      
      if (!historicalPrices || historicalPrices.length === 0) {
        console.log(`No historical prices found for ${symbol} (${region})`);
        return [];
      }
      
      // Sort by date (oldest to newest)
      const sortedPrices = [...historicalPrices].sort((a: any, b: any) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Get existing MACD data to check for missing values
      const existingMacdData = await storage.getMacdData(symbol, region);
      
      // Create maps for existing MACD data by historical price ID and date
      const macdByHistoricalPriceId = new Map();
      const macdByDate = new Map();
      
      existingMacdData.forEach((macd: any) => {
        // Map by historical price ID
        if (macd.historicalPriceId) {
          macdByHistoricalPriceId.set(macd.historicalPriceId, macd);
        }
        
        // Map by date string
        const dateStr = typeof macd.date === 'string'
          ? macd.date.split('T')[0]
          : macd.date instanceof Date
            ? macd.date.toISOString().split('T')[0]
            : String(macd.date);
        
        macdByDate.set(dateStr, macd);
      });
      
      // Identify which prices need MACD calculation by identifying missing MACD data
      const missingMacdPrices: any[] = [];
      const recentPricesNeedingRefresh: any[] = [];
      
      // Find the most recent date to check if we have today's data
      let hasRecentData = false;
      if (sortedPrices.length > 0) {
        const latestPrice = sortedPrices[sortedPrices.length - 1];
        const latestDate = new Date(latestPrice.date);
        const today = new Date();
        
        // Check if the latest price is from today or yesterday (for weekends/holidays)
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        hasRecentData = diffDays <= 3; // Consider data as recent if it's within the last 3 days
        
        console.log(`Latest price for ${symbol} is from ${latestDate.toISOString().split('T')[0]}, which is ${diffDays} days ago ${hasRecentData ? '' : '- data may be stale'}`);
        
        // Force refresh for the most recent data to ensure we have MACD values
        if (hasRecentData) {
          forceMacdRefresh = true;
          console.log(`Forcing MACD refresh for recent data of ${symbol}`);
        }
      }
      
      // First pass: identify which prices need MACD calculation
      for (let i = 0; i < sortedPrices.length; i++) {
        const price = sortedPrices[i];
        
        // Skip if we don't have a valid price point
        if (!price || !price.id) continue;
        
        // Check if this price already has MACD data
        let hasMacdData = macdByHistoricalPriceId.has(price.id);
        
        // If not found by ID, try by date
        if (!hasMacdData) {
          const dateStr = typeof price.date === 'string'
            ? price.date.split('T')[0]
            : price.date instanceof Date
              ? price.date.toISOString().split('T')[0]
              : new Date(price.date).toISOString().split('T')[0];
          
          hasMacdData = macdByDate.has(dateStr);
        }
        
        // Simple logic: If we don't have MACD data, add it to the missing list
        if (!hasMacdData) {
          // No MACD data at all - add to missing list
          missingMacdPrices.push(price);
        } 
        
        // If force refresh is enabled and this is the most recent price,
        // also add it to make sure it's up to date
        if (forceMacdRefresh && i === sortedPrices.length - 1) {
          // Always refresh the most recent price point when forced
          console.log(`Forcing refresh of most recent price point for ${symbol}`);
          // Only add if not already in the missing list
          if (hasMacdData) {
            recentPricesNeedingRefresh.push(price);
          }
        }
      }
      
      // If we have no prices needing MACD calculation, return early
      if (missingMacdPrices.length === 0 && recentPricesNeedingRefresh.length === 0) {
        console.log(`No MACD data needs updates for ${symbol} (${region})`);
        return [];
      }
      
      // Log what we're calculating
      console.log(`Calculating MACD for ${symbol} (${region}): ${missingMacdPrices.length} missing data points, ${recentPricesNeedingRefresh.length} recent points to refresh`);
      
      // Calculate MACD only if we have prices needing calculation
      if (missingMacdPrices.length > 0 || recentPricesNeedingRefresh.length > 0) {
        // Extract closing prices for MACD calculation - we need all prices for accurate calculation
        const closingPrices = sortedPrices.map((price: any) => {
          const priceValue = price.adjustedClose || price.close;
          return priceValue ? parseFloat(priceValue) : 0;
        });
        
        // Calculate MACD values using default parameters (12, 26, 9)
        const { macd: macdLine, signal: signalLine, histogram } = calculateMACD(closingPrices);
        
        // Prepare data for update
        const macdDataToUpdate: any[] = [];
        
        // Process all prices that need MACD updates
        for (let i = 0; i < sortedPrices.length; i++) {
          const price = sortedPrices[i];
          
          // Skip if invalid price
          if (!price || !price.id) continue;
          
          // Determine if this price needs MACD update
          const priceDate = typeof price.date === 'string'
            ? price.date.split('T')[0]
            : price.date instanceof Date
              ? price.date.toISOString().split('T')[0]
              : new Date(price.date).toISOString().split('T')[0];
          
          // Check if this price needs update - simple approach:
          // 1. If we don't have MACD data at all for this price, calculate it
          // 2. If forceMacdRefresh is true and this is the most recent price, recalculate it
          const needsInitialCalculation = !macdByHistoricalPriceId.has(price.id) && !macdByDate.has(priceDate);
          const isLatestPrice = i === sortedPrices.length - 1; 
          const needsRefresh = forceMacdRefresh && isLatestPrice; // Only force refresh most recent point
          
          if (needsInitialCalculation || needsRefresh) {
            // Prepare MACD values for this price point
            let macdValue = null;
            let signalValue = null;
            let histogramValue = null;
            let hasMacdValues = false;
            
            // For MACD line
            if (i < macdLine.length && macdLine[i] !== null) {
              macdValue = macdLine[i]?.toString();
              hasMacdValues = true;
            }
            
            // For Signal line
            if (i < signalLine.length && signalLine[i] !== null) {
              signalValue = signalLine[i]?.toString();
              hasMacdValues = true;
            }
            
            // For Histogram
            if (i < histogram.length && histogram[i] !== null) {
              histogramValue = histogram[i]?.toString();
              hasMacdValues = true;
            }
            
            // Log if this is the most recent price point and we're updating it
            if (i === sortedPrices.length - 1 && hasMacdValues) {
              console.log(`Updating most recent price for ${symbol} from ${price.date} with MACD values: MACD=${macdValue}, Signal=${signalValue}, Histogram=${histogramValue}`);
            }
            
            // If we have any MACD values, add to update list
            if (hasMacdValues) {
              macdDataToUpdate.push({
                historicalPriceId: price.id,
                symbol: symbol,
                date: price.date,
                region: region,
                macd: macdValue,
                signal: signalValue,
                histogram: histogramValue,
                fastPeriod: 12,  // Default values
                slowPeriod: 26, 
                signalPeriod: 9
              });
            }
          }
        }
        
        // Update the MACD data table with the new values
        if (macdDataToUpdate.length > 0) {
          console.log(`Updating ${macdDataToUpdate.length} MACD data records for ${symbol} (${region})`);
          const results = await storage.bulkCreateOrUpdateMacdData(macdDataToUpdate);
          
          // Log a sample of the updated MACD data to verify values are set correctly
          if (results && results.length > 0) {
            const sample = results[results.length - 1]; // Most recent
            console.log(`Updated MACD data for ${symbol} (${region}) on ${sample.date}: MACD=${sample.macd}, Signal=${sample.signal}, Histogram=${sample.histogram}`);
            
            // Check if MACD values are still null
            if (!sample.macd || sample.macd === 'null') {
              console.warn(`WARNING: MACD values are still null for ${symbol} even after update to dedicated MACD table.`);
            }
          }
          
          return results;
        } else {
          console.log(`No MACD data needs updates for ${symbol} (${region})`);
          return [];
        }
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error calculating and updating MACD for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Update historical prices for all portfolios with batch processing
   * Uses a mutex pattern to prevent duplicate concurrent executions
   * @param forceRsiRefresh If true, will force updating RSI values for recent price points
   * @param forceMacdRefresh If true, will force updating MACD values for recent price points
   */
  async updateAllHistoricalPrices(forceRsiRefresh: boolean = false, forceMacdRefresh: boolean = false) {
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
    
    // Log RSI refresh mode
    if (forceRsiRefresh) {
      console.log('RSI Refresh Mode: Will refresh RSI values for all recent price points');
    } else {
      console.log('RSI Refresh Mode: Will only update missing RSI values');
    }
    
    // Log MACD refresh mode
    if (forceMacdRefresh) {
      console.log('MACD Refresh Mode: Will refresh MACD values for all recent price points');
    } else {
      console.log('MACD Refresh Mode: Will only update missing MACD values');
    }
    
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      let allResults: {symbol: string, success: boolean, result?: any, error?: string}[] = [];
      
      // First update market indices
      try {
        console.log(`Updating historical prices for market indices with forceRsiRefresh=${forceRsiRefresh}, forceMacdRefresh=${forceMacdRefresh}`);
        const indicesResults = await this.updateIndicesHistoricalPrices(forceRsiRefresh, forceMacdRefresh);
        allResults = [...allResults, ...indicesResults];
        
        // Calculate and update RSI for market indices
        console.log('Calculating and updating RSI for market indices');
        const indices = [
          { symbol: 'SPY', region: 'USD' },
          { symbol: 'XIC.TO', region: 'CAD' },
          { symbol: 'ACWX', region: 'INTL' }
        ];
        
        for (const index of indices) {
          try {
            console.log(`Calculating RSI for index ${index.symbol}`);
            await this.calculateAndUpdateRSIForSymbol(index.symbol, index.region, forceRsiRefresh);
          } catch (rsiError) {
            console.error(`Error calculating RSI for index ${index.symbol}:`, rsiError);
          }
        }
        
        // Calculate and update MACD for market indices
        if (forceMacdRefresh) {
          console.log('Calculating and updating MACD for market indices');
          
          for (const index of indices) {
            try {
              console.log(`Calculating MACD for index ${index.symbol}`);
              await this.calculateAndUpdateMACDForSymbol(index.symbol, index.region, forceMacdRefresh);
            } catch (macdError) {
              console.error(`Error calculating MACD for index ${index.symbol}:`, macdError);
            }
          }
        }
        
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
          // First fetch new historical prices
          console.log(`Updating historical prices for ${region} portfolio with forceRsiRefresh=${forceRsiRefresh}`);
          const regionResults = await this.updatePortfolioHistoricalPrices(region, forceRsiRefresh);
          allResults = [...allResults, ...regionResults];
          
          // Then get all symbols in this portfolio
          let symbols: string[] = [];
          
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
          }
          
          // Calculate and update RSI for all symbols in the portfolio
          console.log(`Calculating and updating RSI for ${symbols.length} symbols in ${region} portfolio`);
          
          // Process RSI calculations in batches
          const batchSize = 5;
          for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            console.log(`Processing RSI batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(symbols.length/batchSize)} for ${region}`);
            
            for (const symbol of batch) {
              try {
                await this.calculateAndUpdateRSIForSymbol(symbol, region, forceRsiRefresh);
              } catch (rsiError) {
                console.error(`Error calculating RSI for ${symbol} (${region}):`, rsiError);
              }
            }
            
            // Add a small pause between RSI batches
            if (i + batchSize < symbols.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // If MACD refresh is requested, calculate and update MACD values
          if (forceMacdRefresh) {
            console.log(`Calculating and updating MACD for ${symbols.length} symbols in ${region} portfolio`);
            
            // Process MACD calculations in batches
            for (let i = 0; i < symbols.length; i += batchSize) {
              const batch = symbols.slice(i, i + batchSize);
              console.log(`Processing MACD batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(symbols.length/batchSize)} for ${region}`);
              
              for (const symbol of batch) {
                try {
                  await this.calculateAndUpdateMACDForSymbol(symbol, region, forceMacdRefresh);
                } catch (macdError) {
                  console.error(`Error calculating MACD for ${symbol} (${region}):`, macdError);
                }
              }
              
              // Add a small pause between MACD batches
              if (i + batchSize < symbols.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
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
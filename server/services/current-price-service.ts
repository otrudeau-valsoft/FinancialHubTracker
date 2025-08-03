import { storage } from '../storage';
import { db } from '../db';
import { and, eq } from 'drizzle-orm';
import { portfolioUSD, portfolioCAD, portfolioINTL, currentPrices, InsertCurrentPrice } from '@shared/schema';
import yahooFinance from 'yahoo-finance2';
import { isWeekend } from '../util';
import { dataUpdateLogger } from './data-update-logger';

// Rate limiting configuration for Yahoo Finance API
const RATE_LIMIT = {
  maxRequests: 2,      // Maximum requests per interval
  interval: 1000,      // Interval in milliseconds (1 second)
  requestQueue: [] as { resolve: Function, reject: Function, symbol: string }[],
  inProgress: 0,       // Number of requests currently in progress
  lastRequestTime: 0,  // Timestamp of the last request
};

class CurrentPriceService {
  /**
   * Get current prices for a region
   */
  async getCurrentPrices(region: string) {
    try {
      return await storage.getCurrentPrices(region);
    } catch (error) {
      console.error(`Error getting current prices for ${region}:`, error);
      throw error;
    }
  }

  /**
   * Get current price for a symbol and region
   */
  async getCurrentPrice(symbol: string, region: string) {
    try {
      return await storage.getCurrentPrice(symbol, region);
    } catch (error) {
      console.error(`Error getting current price for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Make a rate-limited Yahoo Finance API call
   * This function helps avoid hitting Yahoo Finance rate limits
   */
  private async rateLimitedApiCall<T>(fn: () => Promise<T>, symbol: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        // Check if we're under rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - RATE_LIMIT.lastRequestTime;
        
        if (RATE_LIMIT.inProgress < RATE_LIMIT.maxRequests || 
            timeSinceLastRequest > RATE_LIMIT.interval) {
          
          // We can make a request
          RATE_LIMIT.inProgress++;
          RATE_LIMIT.lastRequestTime = now;
          
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            RATE_LIMIT.inProgress--;
            
            // Process next request in queue if any
            if (RATE_LIMIT.requestQueue.length > 0) {
              const nextRequest = RATE_LIMIT.requestQueue.shift();
              if (nextRequest) {
                setTimeout(() => {
                  nextRequest.resolve();
                }, RATE_LIMIT.interval / 2); // Half interval delay between requests
              }
            }
          }
        } else {
          // We need to queue the request
          console.log(`Rate limiting request for ${symbol}, adding to queue...`);
          RATE_LIMIT.requestQueue.push({
            resolve: executeRequest,
            reject,
            symbol
          });
          
          // If this is the first request in the queue, schedule it
          if (RATE_LIMIT.requestQueue.length === 1) {
            const delay = RATE_LIMIT.interval - timeSinceLastRequest + 100; // Add a little buffer
            console.log(`Scheduling next request in ${delay}ms`);
            setTimeout(() => {
              const nextRequest = RATE_LIMIT.requestQueue.shift();
              if (nextRequest) {
                nextRequest.resolve();
              }
            }, delay);
          }
        }
      };
      
      executeRequest();
    });
  }

  /**
   * Fetch current price for a symbol from Yahoo Finance
   */
  async fetchCurrentPrice(symbol: string, region: string) {
    try {
      // Skip on weekends to reduce unnecessary API calls
      // NOTE: Temporarily disabled weekend check to allow manual updates
      // if (isWeekend(new Date())) {
      //   console.log(`Skipping price fetch for ${symbol} (${region}) on weekend`);
      //   return null;
      // }

      let yahooSymbol = symbol;
      
      // Add .TO suffix for Canadian stocks if not already present
      if (region === 'CAD' && !symbol.endsWith('.TO')) {
        yahooSymbol = `${symbol}.TO`;
      }
      
      console.log(`Fetching current price for ${yahooSymbol}`);
      
      // Log the start of price fetch
      await dataUpdateLogger.logStockPriceUpdate(symbol, region, 'In Progress');
      
      // Helper function to safely handle potentially empty or invalid numeric values
      const safeNumericString = (value: any): string => {
        // Return '0' for empty values, null/undefined, Infinity, or NaN to avoid database errors
        if (value === undefined || value === null || value === '' || 
            value === 'Infinity' || value === '-Infinity' || 
            (typeof value === 'string' && value.toLowerCase() === 'infinity') ||
            (typeof value === 'number' && !isFinite(value)) ||
            isNaN(value)) {
          return '0';
        }
        return value.toString();
      };
      
      // Try using the quote method first (with rate limiting)
      try {
        console.log(`Using Yahoo Finance quote method for ${yahooSymbol} with rate limiting...`);
        
        // Use the quote method with rate limiting
        const quoteResult = await this.rateLimitedApiCall(() => {
          return yahooFinance.quote(yahooSymbol);
        }, yahooSymbol);
        
        if (quoteResult && typeof quoteResult === 'object') {
          // Extract key values
          const regularMarketPrice = quoteResult.regularMarketPrice;
          const regularMarketChange = quoteResult.regularMarketChange;
          const regularMarketChangePercent = quoteResult.regularMarketChangePercent;
          const regularMarketVolume = quoteResult.regularMarketVolume;
          const regularMarketDayHigh = quoteResult.regularMarketDayHigh;
          const regularMarketDayLow = quoteResult.regularMarketDayLow;
          
          console.log(`Successfully retrieved price data for ${yahooSymbol}:`);
          console.log(`Price: ${regularMarketPrice}, Change: ${regularMarketChange}, Change%: ${regularMarketChangePercent}`);
          
          // Log successful price fetch
          await dataUpdateLogger.logStockPriceUpdate(symbol, region, 'Success', {
            currentPrice: regularMarketPrice,
            changePercent: regularMarketChangePercent
          });
          
          // Return the basic data we need
          return {
            symbol,
            region,
            regularMarketPrice: safeNumericString(regularMarketPrice),
            regularMarketChange: safeNumericString(regularMarketChange),
            regularMarketChangePercent: safeNumericString(regularMarketChangePercent),
            regularMarketVolume: safeNumericString(regularMarketVolume),
            regularMarketDayHigh: safeNumericString(regularMarketDayHigh),
            regularMarketDayLow: safeNumericString(regularMarketDayLow),
            marketCap: safeNumericString(quoteResult.marketCap),
            trailingPE: safeNumericString(quoteResult.trailingPE),
            forwardPE: safeNumericString(quoteResult.forwardPE),
            dividendYield: safeNumericString((quoteResult as any).dividendYield),
            fiftyTwoWeekHigh: safeNumericString(quoteResult.fiftyTwoWeekHigh),
            fiftyTwoWeekLow: safeNumericString(quoteResult.fiftyTwoWeekLow)
          };
        } else {
          console.log(`Invalid quote response format for ${yahooSymbol}`);
        }
      } catch (quoteError) {
        const errorMessage = quoteError instanceof Error ? quoteError.message : String(quoteError);
        console.warn(`Warning: Yahoo Finance quote error for ${yahooSymbol}:`, errorMessage);
        console.log('Falling back to quoteSummary method...');
      }
      
      // If the quote method failed, try the original quoteSummary method (with rate limiting)
      try {
        // Fetch quote from Yahoo Finance
        console.log(`Attempting Yahoo Finance quoteSummary API call for ${yahooSymbol}...`);
        
        const result = await this.rateLimitedApiCall(() => {
          return yahooFinance.quoteSummary(yahooSymbol, {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics']
          });
        }, yahooSymbol);
        
        console.log(`Yahoo Finance quoteSummary success for ${yahooSymbol}`);
        
        // Debug values
        if (result?.price?.regularMarketPrice !== undefined) {
          console.log(`Retrieved price: ${result.price.regularMarketPrice} for ${yahooSymbol}`);
          
          // Extract price data safely
          const price = result.price || {};
          const summaryDetail = result.summaryDetail || {};
          
          // Extract relevant price data with safe handling of numeric values
          const priceData = {
            symbol,
            region,
            regularMarketPrice: safeNumericString(price.regularMarketPrice),
            regularMarketChange: safeNumericString(price.regularMarketChange),
            regularMarketChangePercent: safeNumericString(price.regularMarketChangePercent),
            regularMarketVolume: safeNumericString(price.regularMarketVolume),
            regularMarketDayHigh: safeNumericString(price.regularMarketDayHigh),
            regularMarketDayLow: safeNumericString(price.regularMarketDayLow),
            marketCap: safeNumericString(price.marketCap),
            trailingPE: safeNumericString((summaryDetail as any).trailingPE),
            forwardPE: safeNumericString((summaryDetail as any).forwardPE),
            dividendYield: safeNumericString((summaryDetail as any).dividendYield),
            fiftyTwoWeekHigh: safeNumericString((summaryDetail as any).fiftyTwoWeekHigh),
            fiftyTwoWeekLow: safeNumericString((summaryDetail as any).fiftyTwoWeekLow)
          };
          
          return priceData;
        } else {
          console.log(`Warning: No price data in response for ${yahooSymbol}`);
          
          // Return empty values when data is missing
          return {
            symbol,
            region,
            regularMarketPrice: '0',
            regularMarketChange: '0',
            regularMarketChangePercent: '0',
            regularMarketVolume: '0',
            regularMarketDayHigh: '0',
            regularMarketDayLow: '0',
            marketCap: '0',
            trailingPE: '0',
            forwardPE: '0',
            dividendYield: '0',
            fiftyTwoWeekHigh: '0',
            fiftyTwoWeekLow: '0'
          };
        }
      } catch (yahooError) {
        // Handle Yahoo Finance API errors gracefully
        const errorMessage = yahooError instanceof Error ? yahooError.message : String(yahooError);
        console.warn(`Warning: Yahoo Finance quoteSummary error for ${yahooSymbol}:`, errorMessage);
        
        // Create a minimal data structure with default values
        return {
          symbol,
          region,
          regularMarketPrice: '0',
          regularMarketChange: '0',
          regularMarketChangePercent: '0',
          regularMarketVolume: '0',
          regularMarketDayHigh: '0',
          regularMarketDayLow: '0',
          marketCap: '0',
          trailingPE: '0',
          forwardPE: '0',
          dividendYield: '0',
          fiftyTwoWeekHigh: '0',
          fiftyTwoWeekLow: '0'
        };
      }
      // This code is unreachable as we've already returned in all possible paths above
      return {
        symbol,
        region,
        regularMarketPrice: '0',
        regularMarketChange: '0',
        regularMarketChangePercent: '0',
        regularMarketVolume: '0',
        regularMarketDayHigh: '0',
        regularMarketDayLow: '0',
        marketCap: '0',
        trailingPE: '0',
        forwardPE: '0',
        dividendYield: '0',
        fiftyTwoWeekHigh: '0',
        fiftyTwoWeekLow: '0'
      };
    } catch (error) {
      console.error(`Error fetching current price for ${symbol} (${region}):`, error);
      
      // Log error
      await dataUpdateLogger.logStockPriceUpdate(symbol, region, 'Error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return default data instead of throwing error to ensure the process continues
      return {
        symbol,
        region,
        regularMarketPrice: '0',
        regularMarketChange: '0',
        regularMarketChangePercent: '0',
        regularMarketVolume: '0',
        regularMarketDayHigh: '0',
        regularMarketDayLow: '0',
        marketCap: '0',
        trailingPE: '0',
        forwardPE: '0',
        dividendYield: '0',
        fiftyTwoWeekHigh: '0',
        fiftyTwoWeekLow: '0'
      };
    }
  }

  /**
   * Fetch and store current price for a symbol
   * Uses upsert to avoid duplicate entries
   */
  async fetchAndStoreCurrentPrice(symbol: string, region: string) {
    try {
      // Fetch current price from Yahoo Finance
      const priceData = await this.fetchCurrentPrice(symbol, region);
      
      if (!priceData) {
        console.log(`No price data available for ${symbol} (${region})`);
        return null;
      }
      
      // Always use the create method with upsert to ensure we don't have duplicates
      const updatedPrice = await storage.createCurrentPrice(priceData as InsertCurrentPrice);
      
      // Log key metrics for debugging
      console.log(`Stored current price for ${symbol} (${region}): $${priceData.regularMarketPrice} (${priceData.regularMarketChangePercent}%)`);
      
      return updatedPrice;
    } catch (error) {
      console.error(`Error fetching and storing current price for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Update current prices for an entire portfolio
   */
  async updatePortfolioCurrentPrices(region: string) {
    try {
      // Get all symbols in the portfolio
      const symbols = await this.getPortfolioSymbols(region);
      
      console.log(`Updating current prices for ${symbols.length} symbols in ${region} portfolio`);
      
      // Log the start of the update
      await dataUpdateLogger.logUpdateStart('current_prices', region, symbols.length);
      
      // Process symbols in batches to improve throughput while still respecting rate limits
      const results = [];
      const batchSize = 5; // Process this many symbols concurrently
      const totalBatches = Math.ceil(symbols.length / batchSize);
      
      // Process in batches
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchNumber = i/batchSize + 1;
        console.log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.join(', ')})`);
        
        // Log batch progress
        await dataUpdateLogger.logBatchProgress('current_prices', batchNumber, totalBatches, batch, region);
        
        // Process batch concurrently
        const batchPromises = batch.map(symbol => {
          return new Promise(async (resolve) => {
            try {
              const result = await this.fetchAndStoreCurrentPrice(symbol, region);
              resolve({ symbol, success: true, result });
            } catch (error) {
              console.error(`Error updating current price for ${symbol} (${region}):`, error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              resolve({ symbol, success: false, error: errorMessage });
            }
          });
        });
        
        // Wait for all in batch to complete before moving to next batch
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Brief pause between batches to avoid overwhelming the API
        if (i + batchSize < symbols.length) {
          console.log(`Pausing briefly between batches...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Count successes and failures
      const successCount = results.filter((r: any) => r.success).length;
      const failureCount = results.length - successCount;
      
      // Log completion
      await dataUpdateLogger.logUpdateComplete('current_prices', region, symbols.length, successCount, failureCount);
      
      return results;
    } catch (error) {
      console.error(`Error updating portfolio current prices for ${region}:`, error);
      
      // Log error
      await dataUpdateLogger.log('current_prices', 'Error', {
        region,
        error: error instanceof Error ? error.message : String(error),
        message: `Failed to update current prices for ${region} portfolio`
      });
      
      throw error;
    }
  }

  /**
   * Update all current prices for all portfolios
   */
  async updateAllCurrentPrices() {
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      const results: Record<string, any> = {};
      
      for (const region of regions) {
        try {
          const regionResults = await this.updatePortfolioCurrentPrices(region);
          results[region] = {
            successCount: regionResults.filter((r: any) => r.success).length,
            totalSymbols: regionResults.length
          };
        } catch (error) {
          console.error(`Error updating current prices for ${region}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          results[region] = { error: errorMessage };
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating all current prices:', error);
      throw error;
    }
  }

  /**
   * Get all symbols in a portfolio
   */
  async getPortfolioSymbols(region: string): Promise<string[]> {
    try {
      let symbols: string[] = [];
      
      switch (region) {
        case 'USD': {
          const result = await db.select({ symbol: portfolioUSD.symbol }).from(portfolioUSD);
          symbols = result.map(r => r.symbol);
          break;
        }
        case 'CAD': {
          const result = await db.select({ symbol: portfolioCAD.symbol }).from(portfolioCAD);
          symbols = result.map(r => r.symbol);
          break;
        }
        case 'INTL': {
          const result = await db.select({ symbol: portfolioINTL.symbol }).from(portfolioINTL);
          symbols = result.map(r => r.symbol);
          break;
        }
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      // Add market indices
      if (region === 'USD') {
        symbols.push('SPY');
      } else if (region === 'CAD') {
        symbols.push('XIC.TO');
      } else if (region === 'INTL') {
        symbols.push('ACWX');
      }
      
      return symbols;
    } catch (error) {
      console.error(`Error getting portfolio symbols for ${region}:`, error);
      throw error;
    }
  }
}

export const currentPriceService = new CurrentPriceService();
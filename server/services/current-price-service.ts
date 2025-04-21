import { storage } from '../storage';
import { db } from '../db';
import { and, eq } from 'drizzle-orm';
import { assetsUS, assetsCAD, assetsINTL, currentPrices, InsertCurrentPrice } from '@shared/schema';
import yahooFinance from 'yahoo-finance2';
import { isWeekend } from '../util';

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
   * Fetch current price for a symbol from Yahoo Finance
   */
  async fetchCurrentPrice(symbol: string, region: string) {
    try {
      // Skip on weekends to reduce unnecessary API calls
      if (isWeekend(new Date())) {
        console.log(`Skipping price fetch for ${symbol} (${region}) on weekend`);
        return null;
      }

      let yahooSymbol = symbol;
      
      // Add .TO suffix for Canadian stocks if not already present
      if (region === 'CAD' && !symbol.endsWith('.TO')) {
        yahooSymbol = `${symbol}.TO`;
      }
      
      console.log(`Fetching current price for ${yahooSymbol}`);
      
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
      
      let result;
      try {
        // Fetch quote from Yahoo Finance
        result = await yahooFinance.quoteSummary(yahooSymbol, {
          modules: ['price', 'summaryDetail', 'defaultKeyStatistics']
        });
      } catch (yahooError) {
        // Handle Yahoo Finance API errors gracefully
        console.warn(`Warning: Yahoo Finance API error for ${yahooSymbol}:`, yahooError.message);
        
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
      
      // Extract price data safely
      const price = result?.price || {};
      const summaryDetail = result?.summaryDetail || {};
      
      // Extract relevant price data with safe handling of numeric values
      const priceData = {
        symbol,
        region,
        regularMarketPrice: safeNumericString(price?.regularMarketPrice?.raw),
        regularMarketChange: safeNumericString(price?.regularMarketChange?.raw),
        regularMarketChangePercent: safeNumericString(price?.regularMarketChangePercent?.raw),
        regularMarketVolume: safeNumericString(price?.regularMarketVolume?.raw),
        regularMarketDayHigh: safeNumericString(price?.regularMarketDayHigh?.raw),
        regularMarketDayLow: safeNumericString(price?.regularMarketDayLow?.raw),
        marketCap: safeNumericString(price?.marketCap?.raw),
        trailingPE: safeNumericString(summaryDetail?.trailingPE?.raw),
        forwardPE: safeNumericString(summaryDetail?.forwardPE?.raw),
        dividendYield: safeNumericString(summaryDetail?.dividendYield?.raw),
        fiftyTwoWeekHigh: safeNumericString(summaryDetail?.fiftyTwoWeekHigh?.raw),
        fiftyTwoWeekLow: safeNumericString(summaryDetail?.fiftyTwoWeekLow?.raw)
      };
      
      return priceData;
    } catch (error) {
      console.error(`Error fetching current price for ${symbol} (${region}):`, error);
      
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
   */
  async fetchAndStoreCurrentPrice(symbol: string, region: string) {
    try {
      // Fetch current price from Yahoo Finance
      const priceData = await this.fetchCurrentPrice(symbol, region);
      
      if (!priceData) {
        console.log(`No price data available for ${symbol} (${region})`);
        return null;
      }
      
      // Check if we already have a price for this symbol
      const existingPrice = await this.getCurrentPrice(symbol, region);
      
      if (existingPrice) {
        // Update existing price
        const updatedPrice = await storage.updateCurrentPrice(existingPrice.id, priceData);
        console.log(`Updated current price for ${symbol} (${region})`);
        return updatedPrice;
      } else {
        // Create new price
        const newPrice = await storage.createCurrentPrice(priceData as InsertCurrentPrice);
        console.log(`Created new current price for ${symbol} (${region})`);
        return newPrice;
      }
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
      
      // Process each symbol
      const results = [];
      for (const symbol of symbols) {
        try {
          const result = await this.fetchAndStoreCurrentPrice(symbol, region);
          results.push({ symbol, success: true, result });
        } catch (error) {
          console.error(`Error updating current price for ${symbol} (${region}):`, error);
          results.push({ symbol, success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error updating portfolio current prices for ${region}:`, error);
      throw error;
    }
  }

  /**
   * Update all current prices for all portfolios
   */
  async updateAllCurrentPrices() {
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      const results = {};
      
      for (const region of regions) {
        try {
          const regionResults = await this.updatePortfolioCurrentPrices(region);
          results[region] = {
            successCount: regionResults.filter(r => r.success).length,
            totalSymbols: regionResults.length
          };
        } catch (error) {
          console.error(`Error updating current prices for ${region}:`, error);
          results[region] = { error: error.message };
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
          const result = await db.select({ symbol: assetsUS.symbol }).from(assetsUS);
          symbols = result.map(r => r.symbol);
          break;
        }
        case 'CAD': {
          const result = await db.select({ symbol: assetsCAD.symbol }).from(assetsCAD);
          symbols = result.map(r => r.symbol);
          break;
        }
        case 'INTL': {
          const result = await db.select({ symbol: assetsINTL.symbol }).from(assetsINTL);
          symbols = result.map(r => r.symbol);
          break;
        }
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      return symbols;
    } catch (error) {
      console.error(`Error getting portfolio symbols for ${region}:`, error);
      throw error;
    }
  }
}

export const currentPriceService = new CurrentPriceService();
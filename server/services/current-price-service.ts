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
      
      // Fetch quote from Yahoo Finance
      const result = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics']
      });
      
      // Extract relevant price data
      const priceData = {
        symbol,
        region,
        regularMarketPrice: result.price?.regularMarketPrice?.raw?.toString() || '',
        regularMarketChange: result.price?.regularMarketChange?.raw?.toString() || '',
        regularMarketChangePercent: result.price?.regularMarketChangePercent?.raw?.toString() || '',
        regularMarketVolume: result.price?.regularMarketVolume?.raw?.toString() || '',
        regularMarketDayHigh: result.price?.regularMarketDayHigh?.raw?.toString() || '',
        regularMarketDayLow: result.price?.regularMarketDayLow?.raw?.toString() || '',
        marketCap: result.price?.marketCap?.raw?.toString() || '',
        trailingPE: result.summaryDetail?.trailingPE?.raw?.toString() || '',
        forwardPE: result.summaryDetail?.forwardPE?.raw?.toString() || '',
        dividendYield: result.summaryDetail?.dividendYield?.raw?.toString() || '',
        fiftyTwoWeekHigh: result.summaryDetail?.fiftyTwoWeekHigh?.raw?.toString() || '',
        fiftyTwoWeekLow: result.summaryDetail?.fiftyTwoWeekLow?.raw?.toString() || ''
      };
      
      return priceData;
    } catch (error) {
      console.error(`Error fetching current price for ${symbol} (${region}):`, error);
      throw error;
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
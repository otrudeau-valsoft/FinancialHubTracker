/**
 * Performance Calculation Service
 * 
 * This service calculates various performance metrics for stocks,
 * such as MTD (Month-to-Date), YTD (Year-to-Date), 6-month, and 52-week returns.
 * Optimized for batch calculations and performance.
 */

import { db } from '../db';
import { historicalPrices } from '@shared/schema';
import { and, eq, sql, asc, desc, inArray } from 'drizzle-orm';

// Cache for performance metrics to improve response times
const metricsCache: Record<string, {
  mtdReturn?: number;
  ytdReturn?: number;
  sixMonthReturn?: number;
  fiftyTwoWeekReturn?: number;
  timestamp: number;
}> = {};

// Cache timeout in milliseconds (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

class PerformanceCalculationService {
  /**
   * Calculate performance metrics for multiple stocks in a single batch operation
   * This is much more efficient than calculating metrics one by one
   */
  async calculateBatchPerformanceMetrics(
    stocks: Array<{ symbol: string, currentPrice: number }>,
    region: string
  ): Promise<Record<string, { mtdReturn?: number; ytdReturn?: number; sixMonthReturn?: number; fiftyTwoWeekReturn?: number }>> {
    try {
      const now = new Date();
      const symbols = stocks.map(s => s.symbol);
      const results: Record<string, { mtdReturn?: number; ytdReturn?: number; sixMonthReturn?: number; fiftyTwoWeekReturn?: number }> = {};
      

      
      // Initialize results
      for (const symbol of symbols) {
        results[symbol] = {
          mtdReturn: undefined,
          ytdReturn: undefined,
          sixMonthReturn: undefined,
          fiftyTwoWeekReturn: undefined
        };
      
      // Check cache first for each symbol
      const symbolsToFetch: string[] = [];
      for (const symbol of symbols) {
        const cacheKey = `${symbol}_${region}`;
        if (metricsCache[cacheKey] && (now.getTime() - metricsCache[cacheKey].timestamp) < CACHE_TIMEOUT) {
          // Use cached metrics if available and not expired
          results[symbol] = {
            mtdReturn: metricsCache[cacheKey].mtdReturn,
            ytdReturn: metricsCache[cacheKey].ytdReturn,
            sixMonthReturn: metricsCache[cacheKey].sixMonthReturn,
            fiftyTwoWeekReturn: metricsCache[cacheKey].fiftyTwoWeekReturn
          };
        } else {
          symbolsToFetch.push(symbol);
        }
      }
      
      // If all data is cached, return immediately
      if (symbolsToFetch.length === 0) {
        return results;
      }
      
      console.log(`🔥 ${region.toUpperCase()}: CALLING BATCH PERFORMANCE CALCULATION FOR ${symbolsToFetch.length} STOCKS 🔥`);
      
      // Calculate key dates - MTD and YTD should NEVER be the same!
      const actualFirstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month (May 1, 2025)
      const actualFirstDayOfYear = new Date(now.getFullYear(), 0, 1); // First day of current year (Jan 1, 2025)
      
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const fiftyTwoWeeksAgo = new Date(now.getTime() - (52 * 7 * 24 * 60 * 60 * 1000));
      
      const formattedFirstDayOfMonth = actualFirstDayOfMonth.toISOString().split('T')[0];
      const formattedFirstDayOfYear = actualFirstDayOfYear.toISOString().split('T')[0];
      const formattedSixMonthsAgo = sixMonthsAgo.toISOString().split('T')[0];
      const formattedFiftyTwoWeeksAgo = fiftyTwoWeeksAgo.toISOString().split('T')[0];
      
      // Build a separate query for each type of date to simplify and make it more reliable
      
      // First day of month prices (for MTD)
      const mtdPriceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, symbolsToFetch),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${formattedFirstDayOfMonth}`
          )
        )
        .orderBy(asc(historicalPrices.symbol), asc(historicalPrices.date));
      
      // First day of year prices (for YTD)
      const ytdPriceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, symbolsToFetch),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${formattedFirstDayOfYear}`,
            sql`${historicalPrices.date} < ${formattedFirstDayOfMonth}`
          )
        )
        .orderBy(asc(historicalPrices.symbol), asc(historicalPrices.date));
      
      // Six month ago prices (for 6-month return)
      const sixMonthPriceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, symbolsToFetch),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} <= ${formattedSixMonthsAgo}`
          )
        )
        .orderBy(asc(historicalPrices.symbol), desc(historicalPrices.date));
      
      // 52-week high prices (for percentage from 52-week high)
      const fiftyTwoWeekHighData = await db.select({
        symbol: historicalPrices.symbol,
        maxPrice: sql<number>`MAX(${historicalPrices.close})`.as('maxPrice')
      })
        .from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, symbolsToFetch),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${formattedFiftyTwoWeeksAgo}`
          )
        )
        .groupBy(historicalPrices.symbol);
        
      // Combine all price data for processing
      const priceData = [...mtdPriceData, ...ytdPriceData, ...sixMonthPriceData];
      
      // Organize price data by symbol and date
      const pricesBySymbol: Record<string, {
        mtdStartPrice?: number;
        ytdStartPrice?: number;
        sixMonthPrice?: number;
        fiftyTwoWeekHighPrice?: number;
      }> = {};
      
      // Initialize price objects for each symbol
      for (const symbol of symbolsToFetch) {
        pricesBySymbol[symbol] = {
          mtdStartPrice: undefined,
          ytdStartPrice: undefined,
          sixMonthPrice: undefined
        };
      }
      
      // Find the appropriate price points for each symbol
      for (const price of priceData) {
        const symbol = price.symbol;
        const priceDate = new Date(price.date);
        const priceValue = Number(price.adjustedClose);
        
        if (isNaN(priceValue) || priceValue === 0) continue;
        
        // First day of month price (for MTD)
        if (priceDate >= firstDayOfMonth && !pricesBySymbol[symbol].mtdStartPrice) {
          pricesBySymbol[symbol].mtdStartPrice = priceValue;
        }
        
        // First day of year price (for YTD)
        if (priceDate >= firstDayOfYear && !pricesBySymbol[symbol].ytdStartPrice) {
          pricesBySymbol[symbol].ytdStartPrice = priceValue;
        }
        
        // Closest price to six months ago (for 6-month return)
        if (priceDate <= sixMonthsAgo) {
          // If we don't have a price yet, or this one is closer to sixMonthsAgo
          if (!pricesBySymbol[symbol].sixMonthPrice) {
            pricesBySymbol[symbol].sixMonthPrice = priceValue;
          }
        }
        
        // This section is no longer needed since we're using MAX query for 52-week high
      }
      
      // Process 52-week high data
      for (const highData of fiftyTwoWeekHighData) {
        const symbol = highData.symbol;
        if (pricesBySymbol[symbol]) {
          pricesBySymbol[symbol].fiftyTwoWeekHighPrice = Number(highData.maxPrice);
        }
      }
      
      // Calculate returns for each symbol
      for (const stock of stocks) {
        const { symbol, currentPrice } = stock;
        if (!symbolsToFetch.includes(symbol)) continue;
        
        const cacheKey = `${symbol}_${region}`;
        const prices = pricesBySymbol[symbol];
        
        // Initialize results object for this symbol
        if (!results[symbol]) {
          results[symbol] = {
            mtdReturn: undefined,
            ytdReturn: undefined,
            sixMonthReturn: undefined,
            fiftyTwoWeekReturn: undefined
          };
        }
        
        // Calculate MTD return
        if (prices && prices.mtdStartPrice) {
          results[symbol].mtdReturn = ((currentPrice - prices.mtdStartPrice) / prices.mtdStartPrice) * 100;
        }
        
        // Calculate YTD return
        if (prices && prices.ytdStartPrice) {
          results[symbol].ytdReturn = ((currentPrice - prices.ytdStartPrice) / prices.ytdStartPrice) * 100;
        }
        
        // Calculate 6-month return
        if (prices && prices.sixMonthPrice) {
          results[symbol].sixMonthReturn = ((currentPrice - prices.sixMonthPrice) / prices.sixMonthPrice) * 100;
        }
        
        // Calculate percentage from 52-week high
        if (prices && prices.fiftyTwoWeekHighPrice) {
          results[symbol].fiftyTwoWeekReturn = ((currentPrice - prices.fiftyTwoWeekHighPrice) / prices.fiftyTwoWeekHighPrice) * 100;
        }
        
        // Update cache with all metrics including 52W%
        metricsCache[cacheKey] = {
          mtdReturn: results[symbol].mtdReturn,
          ytdReturn: results[symbol].ytdReturn,
          sixMonthReturn: results[symbol].sixMonthReturn,
          fiftyTwoWeekReturn: results[symbol].fiftyTwoWeekReturn,
          timestamp: now.getTime()
        };
      }
      
      return results;
    } catch (error) {
      console.error(`Error calculating batch performance metrics for region ${region}:`, error);
      return {};
    }
  }

  /**
   * Calculate all performance metrics for a stock
   * This method now uses the optimized batch processing under the hood
   */
  async calculateAllPerformanceMetrics(symbol: string, region: string, currentPrice: number): Promise<{
    mtdReturn?: number;
    ytdReturn?: number;
    sixMonthReturn?: number;
    fiftyTwoWeekReturn?: number;
  }> {
    try {
      // Use batch calculation method even for a single stock
      const results = await this.calculateBatchPerformanceMetrics(
        [{ symbol, currentPrice }],
        region
      );
      
      return results[symbol] || {};
    } catch (error) {
      console.error(`Error calculating performance metrics for ${symbol} (${region}):`, error);
      return {};
    }
  }
}

export const performanceService = new PerformanceCalculationService();
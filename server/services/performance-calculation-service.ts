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

export interface PerformanceMetrics {
  mtdReturn?: number;
  ytdReturn?: number;
  sixMonthReturn?: number;
  fiftyTwoWeekReturn?: number;
}

export class PerformanceCalculationService {
  /**
   * Calculate performance metrics for multiple symbols in batch
   */
  async calculateBatchPerformanceMetrics(
    symbols: string[], 
    region: string
  ): Promise<Record<string, PerformanceMetrics>> {
    if (!symbols || symbols.length === 0) {
      return {};
    }

    const results: Record<string, PerformanceMetrics> = {};
    const now = new Date();

    // Initialize results for all symbols
    for (const symbol of symbols) {
      results[symbol] = {
        mtdReturn: undefined,
        ytdReturn: undefined,
        sixMonthReturn: undefined,
        fiftyTwoWeekReturn: undefined
      };
    }

    // Check cache first
    const symbolsToFetch: string[] = [];
    for (const symbol of symbols) {
      const cacheKey = `${symbol}_${region}`;
      if (metricsCache[cacheKey] && (now.getTime() - metricsCache[cacheKey].timestamp) < CACHE_TIMEOUT) {
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
    console.log(`🔍 DEBUG: First few symbols received:`, symbolsToFetch.slice(0, 3));
    console.log(`🔍 DEBUG: Types of first few symbols:`, symbolsToFetch.slice(0, 3).map(s => typeof s));
    
    // CRITICAL FIX: Ensure we have actual string symbols, not objects
    const actualSymbols = symbolsToFetch.map(symbol => {
      if (typeof symbol === 'string') {
        return symbol;
      } else if (symbol && typeof symbol === 'object' && symbol.symbol) {
        console.log(`⚠️ FIXING: Received object instead of string, extracting symbol: ${symbol.symbol}`);
        return symbol.symbol;
      } else {
        console.error(`❌ INVALID SYMBOL TYPE:`, typeof symbol, symbol);
        return null;
      }
    }).filter(symbol => symbol !== null);

    try {
      // Calculate key dates - ensure MTD and YTD are DIFFERENT
      const currentMonth = now.getMonth(); // 0-based (May = 4)
      const currentYear = now.getFullYear(); // 2025
      
      // First day of current month (May 1, 2025)
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      
      // First day of current year (January 1, 2025)
      const firstDayOfYear = new Date(currentYear, 0, 1);
      
      // Six months ago
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // 52 weeks ago
      const fiftyTwoWeeksAgo = new Date(now);
      fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - 365);

      // Format dates for SQL queries
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      const mtdStartDate = formatDate(firstDayOfMonth);
      const ytdStartDate = formatDate(firstDayOfYear);
      const sixMonthStartDate = formatDate(sixMonthsAgo);
      const fiftyTwoWeekStartDate = formatDate(fiftyTwoWeeksAgo);

      console.log(`🔧 Using ${actualSymbols.length} corrected symbols for calculation`);

      // Get current prices for all symbols
      const currentPricesQuery = await db
        .select()
        .from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, actualSymbols),
            eq(historicalPrices.region, region)
          )
        )
        .orderBy(desc(historicalPrices.date))
        .limit(actualSymbols.length * 5); // Get recent prices

      // Group current prices by symbol
      const currentPricesBySymbol: Record<string, number> = {};
      for (const price of currentPricesQuery) {
        if (!currentPricesBySymbol[price.symbol]) {
          currentPricesBySymbol[price.symbol] = Number(price.close);
        }
      }

      // Calculate metrics for each symbol
      for (const symbol of actualSymbols) {
        const currentPrice = currentPricesBySymbol[symbol];
        
        if (!currentPrice) {
          console.log(`No current price found for ${symbol}`);
          continue;
        }

        try {
          // Get historical prices for each time period
          const [mtdPrice, ytdPrice, sixMonthPrice, fiftyTwoWeekPrice] = await Promise.all([
            this.getClosestHistoricalPrice(symbol, region, mtdStartDate),
            this.getClosestHistoricalPrice(symbol, region, ytdStartDate),
            this.getClosestHistoricalPrice(symbol, region, sixMonthStartDate),
            this.getClosestHistoricalPrice(symbol, region, fiftyTwoWeekStartDate)
          ]);

          // Calculate returns
          if (mtdPrice) {
            results[symbol].mtdReturn = ((currentPrice - mtdPrice) / mtdPrice) * 100;
          }
          
          if (ytdPrice) {
            results[symbol].ytdReturn = ((currentPrice - ytdPrice) / ytdPrice) * 100;
          }
          
          if (sixMonthPrice) {
            results[symbol].sixMonthReturn = ((currentPrice - sixMonthPrice) / sixMonthPrice) * 100;
          }
          
          if (fiftyTwoWeekPrice) {
            results[symbol].fiftyTwoWeekReturn = ((currentPrice - fiftyTwoWeekPrice) / fiftyTwoWeekPrice) * 100;
          }

          // Cache the results
          const cacheKey = `${symbol}_${region}`;
          metricsCache[cacheKey] = {
            mtdReturn: results[symbol].mtdReturn,
            ytdReturn: results[symbol].ytdReturn,
            sixMonthReturn: results[symbol].sixMonthReturn,
            fiftyTwoWeekReturn: results[symbol].fiftyTwoWeekReturn,
            timestamp: now.getTime()
          };

        } catch (error) {
          console.error(`Error calculating metrics for ${symbol}:`, error);
        }
      }

      console.log(`🔥 ${region.toUpperCase()}: PERFORMANCE METRICS CALCULATED: ${Object.keys(results).length} stocks processed`);
      
      // Debug: Show sample result
      const sampleSymbol = Object.keys(results)[0];
      if (sampleSymbol) {
        console.log(`📊 SAMPLE RESULT for ${sampleSymbol}:`, results[sampleSymbol]);
      }

      return results;

    } catch (error) {
      console.error(`Error calculating batch performance metrics for region ${region}:`, error);
      return results; // Return partially calculated results
    }
  }

  /**
   * Get the closest historical price for a given date
   */
  private async getClosestHistoricalPrice(
    symbol: string, 
    region: string, 
    targetDate: string
  ): Promise<number | null> {
    try {
      const prices = await db
        .select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${targetDate}`
          )
        )
        .orderBy(asc(historicalPrices.date))
        .limit(1);

      if (prices.length > 0) {
        return Number(prices[0].close);
      }

      // If no price found on or after target date, get the closest before
      const fallbackPrices = await db
        .select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} < ${targetDate}`
          )
        )
        .orderBy(desc(historicalPrices.date))
        .limit(1);

      if (fallbackPrices.length > 0) {
        return Number(fallbackPrices[0].close);
      }

      return null;
    } catch (error) {
      console.error(`Error getting historical price for ${symbol} on ${targetDate}:`, error);
      return null;
    }
  }

  /**
   * Calculate performance metrics for a single symbol
   */
  async calculatePerformanceMetrics(
    symbol: string, 
    region: string
  ): Promise<PerformanceMetrics> {
    const result = await this.calculateBatchPerformanceMetrics([symbol], region);
    return result[symbol] || {
      mtdReturn: undefined,
      ytdReturn: undefined,
      sixMonthReturn: undefined,
      fiftyTwoWeekReturn: undefined
    };
  }
}

// Export singleton instance
export const performanceService = new PerformanceCalculationService();
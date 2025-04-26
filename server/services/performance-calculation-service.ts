/**
 * Performance Calculation Service
 * 
 * This service calculates various performance metrics for stocks,
 * such as MTD (Month-to-Date), YTD (Year-to-Date), 6-month, and 52-week returns.
 */

import { db } from '../db';
import { historicalPrices } from '@shared/schema';
import { and, eq, sql, asc, desc } from 'drizzle-orm';

class PerformanceCalculationService {
  /**
   * Calculate Month-to-Date (MTD) return percentage for a stock
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param currentPrice Current stock price
   * @returns MTD return percentage or undefined if data not available
   */
  async calculateMTDReturn(symbol: string, region: string, currentPrice: number): Promise<number | undefined> {
    try {
      // Calculate the first day of the current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const formattedFirstDay = firstDayOfMonth.toISOString().split('T')[0];

      // Get the first price data point from the current month
      const priceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${formattedFirstDay}`
          )
        )
        .orderBy(asc(historicalPrices.date))
        .limit(1);

      if (priceData.length === 0) {
        return undefined;
      }

      const monthStartPrice = Number(priceData[0].adjustedClose);
      if (isNaN(monthStartPrice) || monthStartPrice === 0) {
        return undefined;
      }

      // Calculate MTD return percentage
      return ((currentPrice - monthStartPrice) / monthStartPrice) * 100;
    } catch (error) {
      console.error(`Error calculating MTD return for ${symbol} (${region}):`, error);
      return undefined;
    }
  }

  /**
   * Calculate Year-to-Date (YTD) return percentage for a stock
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param currentPrice Current stock price
   * @returns YTD return percentage or undefined if data not available
   */
  async calculateYTDReturn(symbol: string, region: string, currentPrice: number): Promise<number | undefined> {
    try {
      // Calculate the first day of the current year
      const now = new Date();
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const formattedFirstDay = firstDayOfYear.toISOString().split('T')[0];

      // Get the first price data point from the current year
      const priceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} >= ${formattedFirstDay}`
          )
        )
        .orderBy(asc(historicalPrices.date))
        .limit(1);

      if (priceData.length === 0) {
        return undefined;
      }

      const yearStartPrice = Number(priceData[0].adjustedClose);
      if (isNaN(yearStartPrice) || yearStartPrice === 0) {
        return undefined;
      }

      // Calculate YTD return percentage
      return ((currentPrice - yearStartPrice) / yearStartPrice) * 100;
    } catch (error) {
      console.error(`Error calculating YTD return for ${symbol} (${region}):`, error);
      return undefined;
    }
  }

  /**
   * Calculate 6-month return percentage for a stock
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param currentPrice Current stock price
   * @returns 6-month return percentage or undefined if data not available
   */
  async calculateSixMonthReturn(symbol: string, region: string, currentPrice: number): Promise<number | undefined> {
    try {
      // Calculate the date 6 months ago
      const now = new Date();
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      const formattedDate = sixMonthsAgo.toISOString().split('T')[0];

      // Get the nearest price data point from 6 months ago
      const priceData = await db.select()
        .from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region),
            sql`${historicalPrices.date} <= ${formattedDate}`
          )
        )
        .orderBy(desc(historicalPrices.date))
        .limit(1);

      if (priceData.length === 0) {
        return undefined;
      }

      const sixMonthPrice = Number(priceData[0].adjustedClose);
      if (isNaN(sixMonthPrice) || sixMonthPrice === 0) {
        return undefined;
      }

      // Calculate 6-month return percentage
      return ((currentPrice - sixMonthPrice) / sixMonthPrice) * 100;
    } catch (error) {
      console.error(`Error calculating 6-month return for ${symbol} (${region}):`, error);
      return undefined;
    }
  }

  /**
   * Calculate all performance metrics for a stock in one batch query
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param currentPrice Current stock price
   * @returns Object containing all calculated performance metrics
   */
  async calculateAllPerformanceMetrics(symbol: string, region: string, currentPrice: number): Promise<{
    mtdReturn?: number;
    ytdReturn?: number;
    sixMonthReturn?: number;
  }> {
    try {
      const mtdReturn = await this.calculateMTDReturn(symbol, region, currentPrice);
      const ytdReturn = await this.calculateYTDReturn(symbol, region, currentPrice);
      const sixMonthReturn = await this.calculateSixMonthReturn(symbol, region, currentPrice);

      return {
        mtdReturn,
        ytdReturn,
        sixMonthReturn,
      };
    } catch (error) {
      console.error(`Error calculating performance metrics for ${symbol} (${region}):`, error);
      return {};
    }
  }
}

export const performanceService = new PerformanceCalculationService();
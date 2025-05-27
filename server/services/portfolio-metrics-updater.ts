/**
 * Portfolio Metrics Updater Service
 * 
 * Updates MTD%, YTD%, and 52-week percentage columns in portfolio tables
 * when Calculate Performance button is clicked in Data Management
 */

import { db } from '../db';
import { portfolioUSD, portfolioCAD, portfolioINTL, historicalPrices } from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

/**
 * Update performance metrics for all portfolio stocks across all regions
 */
export async function updatePortfolioMetrics(): Promise<void> {
  console.log('Starting portfolio metrics update...');
  
  const regions = [
    { name: 'USD', table: portfolioUSD },
    { name: 'CAD', table: portfolioCAD },
    { name: 'INTL', table: portfolioINTL }
  ];

  for (const region of regions) {
    console.log(`Updating metrics for ${region.name} portfolio...`);
    
    try {
      // Get all stocks in this portfolio
      const stocks = await db.select().from(region.table);
      
      for (const stock of stocks) {
        if (stock.symbol === 'CASH') continue;
        
        // Calculate performance metrics for this stock
        const metrics = await calculateStockMetrics(stock.symbol, region.name);
        
        // Update the stock record with new metrics
        await db.update(region.table)
          .set({
            mtdChangePercent: metrics.mtdChangePercent,
            ytdChangePercent: metrics.ytdChangePercent,
            sixMonthChangePercent: metrics.sixMonthChangePercent,
            fiftyTwoWeekChangePercent: metrics.fiftyTwoWeekChangePercent
          })
          .where(eq(region.table.id, stock.id));
          
        console.log(`Updated metrics for ${stock.symbol} in ${region.name}: MTD: ${metrics.mtdChangePercent?.toFixed(2)}%, YTD: ${metrics.ytdChangePercent?.toFixed(2)}%, 52W: ${metrics.fiftyTwoWeekChangePercent?.toFixed(2)}%`);
      }
    } catch (error) {
      console.error(`Error updating metrics for ${region.name}:`, error);
    }
  }
  
  console.log('Portfolio metrics update completed');
}

/**
 * Calculate performance metrics for a specific stock
 */
async function calculateStockMetrics(symbol: string, region: string): Promise<{
  mtdChangePercent?: number;
  ytdChangePercent?: number;
  sixMonthChangePercent?: number;
  fiftyTwoWeekChangePercent?: number;
}> {
  try {
    const now = new Date();
    
    // Calculate date boundaries
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
    const fiftyTwoWeeksAgo = new Date(now.getTime() - (52 * 7 * 24 * 60 * 60 * 1000));
    
    // Get current price (most recent historical price)
    const currentPriceResult = await db.select()
      .from(historicalPrices)
      .where(and(
        eq(historicalPrices.symbol, symbol),
        eq(historicalPrices.region, region)
      ))
      .orderBy(desc(historicalPrices.date))
      .limit(1);
    
    if (!currentPriceResult.length) {
      console.log(`No current price found for ${symbol} in ${region}`);
      return {};
    }
    
    const currentPrice = currentPriceResult[0].close;
    
    // Helper function to get price at specific date
    const getPriceAtDate = async (targetDate: Date): Promise<number | null> => {
      const result = await db.select()
        .from(historicalPrices)
        .where(and(
          eq(historicalPrices.symbol, symbol),
          eq(historicalPrices.region, region),
          gte(historicalPrices.date, targetDate.toISOString().split('T')[0])
        ))
        .orderBy(historicalPrices.date)
        .limit(1);
      
      return result.length ? result[0].close : null;
    };
    
    // Calculate each metric
    const [mtdPrice, ytdPrice, sixMonthPrice, fiftyTwoWeekPrice] = await Promise.all([
      getPriceAtDate(startOfMonth),
      getPriceAtDate(startOfYear),
      getPriceAtDate(sixMonthsAgo),
      getPriceAtDate(fiftyTwoWeeksAgo)
    ]);
    
    const calculatePercentChange = (oldPrice: number | null, newPrice: number): number | undefined => {
      if (!oldPrice || oldPrice === 0) return undefined;
      return ((newPrice - oldPrice) / oldPrice) * 100;
    };
    
    return {
      mtdChangePercent: calculatePercentChange(mtdPrice, currentPrice),
      ytdChangePercent: calculatePercentChange(ytdPrice, currentPrice),
      sixMonthChangePercent: calculatePercentChange(sixMonthPrice, currentPrice),
      fiftyTwoWeekChangePercent: calculatePercentChange(fiftyTwoWeekPrice, currentPrice)
    };
    
  } catch (error) {
    console.error(`Error calculating metrics for ${symbol}:`, error);
    return {};
  }
}
/**
 * Fixed Portfolio Adapter - Handles column naming inconsistencies
 * 
 * This adapter works for ALL regions and correctly handles the fact that:
 * - USD tables use purchasePrice (camelCase)
 * - CAD/INTL tables use purchase_price (snake_case)
 */

import { db } from '../db';
import { currentPrices } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { performanceService } from '../services/performance-calculation-service';

export interface LegacyPortfolioItem {
  id: number;
  symbol: string;
  company: string;
  stockType: string;
  rating: string;
  sector?: string;
  quantity: number;
  price?: number;
  netAssetValue?: number;
  portfolioPercentage?: number;
  dailyChangePercent?: number;
  mtdChangePercent?: number;
  ytdChangePercent?: number;
  sixMonthChangePercent?: number;
  fiftyTwoWeekChangePercent?: number;
  dividendYield?: number;
  profitLoss?: number;
  nextEarningsDate?: string;
  [key: string]: any;
}

async function getCurrentPrices(symbols: string[], region: string): Promise<Record<string, any>> {
  const prices = await db
    .select()
    .from(currentPrices)
    .where(eq(currentPrices.region, region));
  
  const priceMap: Record<string, any> = {};
  prices.forEach(price => {
    priceMap[price.symbol] = {
      regularMarketPrice: price.regularMarketPrice,
      regularMarketChangePercent: price.regularMarketChangePercent,
      dividendYield: price.dividendYield
    };
  });
  
  return priceMap;
}

export async function fixedPortfolioAdapter(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, region);
  
  // Calculate total portfolio value for percentage calculations and prepare data for batch performance calculation
  let totalPortfolioValue = 0;
  const stocksWithCurrentPrices: Array<{symbol: string, currentPrice: number}> = [];
  
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = Number(item.purchasePrice || item.purchase_price) || undefined;
    const bookPrice = purchasePrice || 0;
    const currentPrice = priceMap[item.symbol]?.regularMarketPrice 
      ? Number(priceMap[item.symbol].regularMarketPrice) 
      : bookPrice;
    
    totalPortfolioValue += (quantity * currentPrice);
    
    // Build array for batch performance calculation
    stocksWithCurrentPrices.push({
      symbol: item.symbol,
      currentPrice: currentPrice
    });
  });
  
  // Calculate performance metrics for all stocks in a single batch operation
  console.log(`${region}: Calling batch performance calculation for ${stocksWithCurrentPrices.length} stocks`);
  const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
    stocksWithCurrentPrices,
    region
  );
  console.log(`${region}: Performance metrics calculated:`, performanceMetricsMap);
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    // Handle both camelCase and snake_case column naming
    const rawPurchasePrice = item.purchasePrice || item.purchase_price;
    const purchasePrice = rawPurchasePrice ? Number(rawPurchasePrice) : undefined;
    const bookPrice = purchasePrice || 0;
    
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : bookPrice;
    
    const nav = quantity * currentPrice;
    const portfolioWeight = totalPortfolioValue > 0 
      ? (nav / totalPortfolioValue) * 100 
      : 0;
    
    const dailyChange = currentPriceInfo?.regularMarketChangePercent 
      ? Number(currentPriceInfo.regularMarketChangePercent) 
      : 0;
    
    // Get the real-time calculated performance metrics for this stock
    const performanceMetrics = performanceMetricsMap[item.symbol] || {};
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType || item.stock_type,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      purchasePrice: purchasePrice, // Purchase/book price - this is what the UI needs!
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: performanceMetrics.mtdReturn !== undefined ? performanceMetrics.mtdReturn : undefined,
      ytdChangePercent: performanceMetrics.ytdReturn !== undefined ? performanceMetrics.ytdReturn : undefined,
      sixMonthChangePercent: performanceMetrics.sixMonthReturn !== undefined ? performanceMetrics.sixMonthReturn : undefined,
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent || undefined,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: 0,
      nextEarningsDate: undefined,
    };
  });
}
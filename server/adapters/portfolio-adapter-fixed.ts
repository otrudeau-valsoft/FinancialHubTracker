/**
 * FIXED Portfolio Adapter - Unified implementation for all regions
 * 
 * This adapter ensures all regions (USD, CAD, INTL) use identical purchase price handling
 */

import { db } from '../db';
import { currentPrices } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { performanceService } from '../services/performance.service';

export interface LegacyPortfolioItem {
  id: number;
  symbol: string;
  company: string;
  stockType: string;
  rating: string;
  sector?: string;
  quantity: number;
  price?: number;
  purchasePrice?: number;
  pbr?: number;
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

/**
 * Get current prices for portfolio stocks
 */
async function getCurrentPrices(symbols: string[], region: string): Promise<Record<string, any>> {
  const prices = await db.select().from(currentPrices)
    .where(eq(currentPrices.region, region));
  
  const priceMap: Record<string, any> = {};
  prices.forEach(price => {
    if (symbols.includes(price.symbol)) {
      priceMap[price.symbol] = price;
    }
  });
  
  return priceMap;
}

/**
 * Calculate Net Asset Value (NAV) for a stock
 */
function calculateNAV(quantity: number, price: number): number {
  return quantity * price;
}

/**
 * Calculate profit/loss as a percentage
 */
function calculateProfitLossPercentage(bookPrice: number, currentPrice: number): number {
  if (bookPrice <= 0) return 0;
  return ((currentPrice - bookPrice) / bookPrice) * 100;
}

/**
 * Calculate 52-week change percentage using high and low from Yahoo Finance
 */
function calculate52WeekChange(currentPrice: number, fiftyTwoWeekHigh: string | null, fiftyTwoWeekLow: string | null): number | undefined {
  if (!fiftyTwoWeekHigh || !fiftyTwoWeekLow) return undefined;
  
  const high = Number(fiftyTwoWeekHigh);
  const low = Number(fiftyTwoWeekLow);
  
  if (high <= 0 || low <= 0) return undefined;
  
  // Calculate change from 52-week low
  return ((currentPrice - low) / low) * 100;
}

/**
 * UNIFIED PORTFOLIO ADAPTER - Works for all regions
 */
export async function adaptUnifiedPortfolioData(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  console.log(`UNIFIED ADAPTER: Processing ${data.length} items for ${region}`);
  console.log(`UNIFIED ADAPTER: First item purchase price = "${data[0].purchasePrice}"`);
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, region);
  
  // Calculate total portfolio value to determine weights
  let totalPortfolioValue = 0;
  const stocksWithCurrentPrices: Array<{symbol: string, currentPrice: number}> = [];
  
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : Number(item.purchasePrice || 0);
    
    totalPortfolioValue += calculateNAV(quantity, currentPrice);
    
    stocksWithCurrentPrices.push({
      symbol: item.symbol,
      currentPrice: currentPrice
    });
  });
  
  // Calculate performance metrics for all stocks
  const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
    stocksWithCurrentPrices,
    region
  );
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    // CRITICAL FIX: Unified purchase price handling for all regions
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const bookPrice = purchasePrice || 0;
    
    console.log(`UNIFIED DEBUG ${item.symbol}: DB="${item.purchasePrice}" → converted=${purchasePrice}`);
    
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : bookPrice;
    
    const nav = calculateNAV(quantity, currentPrice);
    const portfolioWeight = totalPortfolioValue > 0 
      ? (nav / totalPortfolioValue) * 100 
      : 0;
    
    const dailyChange = currentPriceInfo?.regularMarketChangePercent 
      ? Number(currentPriceInfo.regularMarketChangePercent) 
      : 0;
    
    const fiftyTwoWeekChange = calculate52WeekChange(
      currentPrice,
      currentPriceInfo?.fiftyTwoWeekHigh,
      currentPriceInfo?.fiftyTwoWeekLow
    );
    
    const profitLoss = purchasePrice 
      ? calculateProfitLossPercentage(purchasePrice, currentPrice)
      : 0;
    
    const performanceMetrics = performanceMetricsMap[item.symbol] || {};
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: purchasePrice || 0,
      purchasePrice: purchasePrice,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: performanceMetrics.mtdReturn !== undefined ? performanceMetrics.mtdReturn : undefined,
      ytdChangePercent: performanceMetrics.ytdReturn !== undefined ? performanceMetrics.ytdReturn : undefined,
      sixMonthChangePercent: performanceMetrics.sixMonthReturn !== undefined ? performanceMetrics.sixMonthReturn : undefined,
      fiftyTwoWeekChangePercent: fiftyTwoWeekChange,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: profitLoss,
      nextEarningsDate: undefined,
    };
  });
}
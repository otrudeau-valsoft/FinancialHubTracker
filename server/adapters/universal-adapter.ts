/**
 * Universal Portfolio Adapter - Fixed Version
 * 
 * This adapter works for ALL regions (USD, CAD, INTL) and properly handles
 * the database column naming inconsistencies that were causing purchase prices to disappear.
 */

import { db } from '../db';
import { currentPrices } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface LegacyPortfolioItem {
  id: number;
  symbol: string;
  company: string;
  stockType: string;
  rating: string;
  sector?: string;
  quantity: number;
  price?: number;
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

export async function universalPortfolioAdapter(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // CRITICAL FIX: Handle database column naming - map snake_case to camelCase
  const normalizedData = data.map(item => {
    // Extract purchase price from any possible column name
    const rawPurchasePrice = item.purchasePrice || item.purchase_price || item['purchase_price'] || item.bookPrice || item.book_price;
    console.log(`UNIVERSAL DEBUG: ${item.symbol} raw DB purchasePrice=${item.purchasePrice}, purchase_price=${item.purchase_price}, normalized=${rawPurchasePrice}`);
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType || item.stock_type,
      rating: item.rating,
      sector: item.sector,
      quantity: item.quantity,
      // THE KEY FIX: Map both naming conventions for purchase price
      purchasePrice: rawPurchasePrice,
      updatedAt: item.updatedAt || item.updated_at
    };
  });
  
  console.log(`UNIVERSAL: Processing ${normalizedData.length} items for ${region}`);
  console.log(`UNIVERSAL: First item purchasePrice = ${normalizedData[0]?.purchasePrice}`);
  
  // Get symbols for all stocks
  const symbols = normalizedData.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, region);
  
  // Calculate total portfolio value for percentage calculations
  const totalPortfolioValue = normalizedData.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const currentPrice = priceMap[item.symbol]?.regularMarketPrice 
      ? Number(priceMap[item.symbol].regularMarketPrice) 
      : (purchasePrice || 0);
    return total + (quantity * currentPrice);
  }, 0);
  
  // Map each stock to legacy format with calculated values
  return normalizedData.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    
    console.log(`UNIVERSAL: ${item.symbol} purchasePrice=${item.purchasePrice} -> ${purchasePrice}`);
    
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : (purchasePrice || 0);
    
    const nav = quantity * currentPrice;
    const portfolioWeight = totalPortfolioValue > 0 
      ? (nav / totalPortfolioValue) * 100 
      : 0;
    
    const dailyChange = currentPriceInfo?.regularMarketChangePercent 
      ? Number(currentPriceInfo.regularMarketChangePercent) 
      : 0;
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: purchasePrice || undefined,
      purchasePrice: purchasePrice || undefined,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: 0,
      ytdChangePercent: 0,
      sixMonthChangePercent: 0,
      fiftyTwoWeekChangePercent: null,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: 0,
      nextEarningsDate: undefined,
    };
  });
}
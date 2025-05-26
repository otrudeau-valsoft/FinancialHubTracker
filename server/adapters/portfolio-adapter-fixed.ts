/**
 * Fixed Portfolio Adapter for Purchase Price Support
 */

import { db } from '../db';
import { currentPrices } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get current prices for portfolio stocks
 */
async function getCurrentPrices(symbols: string[], region: string): Promise<Record<string, any>> {
  try {
    const prices = await db.select().from(currentPrices)
      .where(eq(currentPrices.region, region));
    
    const priceMap: Record<string, any> = {};
    
    prices.forEach(price => {
      if (symbols.includes(price.symbol)) {
        priceMap[price.symbol] = price;
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error('Error fetching current prices:', error);
    return {};
  }
}

/**
 * Calculate profit/loss as a percentage
 */
function calculateProfitLossPercentage(purchasePrice: number, currentPrice: number): number {
  if (!purchasePrice || !currentPrice) return 0;
  return ((currentPrice - purchasePrice) / purchasePrice) * 100;
}

/**
 * Adapt USD portfolio data with purchase price support
 */
export async function adaptUSDPortfolioDataFixed(data: any[]): Promise<any[]> {
  if (!data.length) return [];
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'USD');
  
  // Calculate total portfolio value to determine weights
  let totalPortfolioValue = 0;
  
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : 0;
    
    totalPortfolioValue += quantity * currentPrice;
  });
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : 0;
    
    const nav = quantity * currentPrice;
    const portfolioWeight = totalPortfolioValue > 0 
      ? (nav / totalPortfolioValue) * 100 
      : 0;
    
    const dailyChange = currentPriceInfo?.regularMarketChangePercent 
      ? Number(currentPriceInfo.regularMarketChangePercent) 
      : 0;
    
    // Calculate profit/loss using purchase price if available
    const profitLoss = purchasePrice && currentPrice
      ? calculateProfitLossPercentage(purchasePrice, currentPrice)
      : 0;
    
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
      profitLoss: profitLoss,
      nextEarningsDate: undefined,
    };
  });
}
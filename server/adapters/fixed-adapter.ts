/**
 * Fixed Portfolio Adapter - Handles column naming inconsistencies
 * 
 * This adapter works for ALL regions and correctly handles the fact that:
 * - USD tables use purchasePrice (camelCase)
 * - CAD/INTL tables use purchase_price (snake_case)
 */

import { getCurrentPrices } from './portfolio-adapter';
import { LegacyPortfolioItem } from './portfolio-adapter';

export async function fixedPortfolioAdapter(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, region);
  
  // Calculate total portfolio value for percentage calculations
  const totalPortfolioValue = data.reduce((total, item) => {
    const quantity = Number(item.quantity);
    const purchasePrice = Number(item.purchasePrice || item.purchase_price) || undefined;
    const bookPrice = purchasePrice || 0;
    const currentPrice = priceMap[item.symbol]?.regularMarketPrice 
      ? Number(priceMap[item.symbol].regularMarketPrice) 
      : bookPrice;
    return total + (quantity * currentPrice);
  }, 0);
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = Number(item.purchasePrice || item.purchase_price) || undefined;
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
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType || item.stock_type,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: purchasePrice,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: 0,
      ytdChangePercent: 0,
      sixMonthChangePercent: 0,
      fiftyTwoWeekChangePercent: undefined,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: 0,
      nextEarningsDate: undefined,
    };
  });
}
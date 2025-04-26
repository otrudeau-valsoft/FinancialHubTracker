/**
 * Portfolio Adapter
 * 
 * This adapter ensures backward compatibility between our new database structure
 * and the existing UI components. It transforms data from the new regional
 * portfolio tables into the format expected by the UI.
 * 
 * It also calculates portfolio values, weights, and performance metrics.
 */

import { 
  PortfolioUSD, 
  PortfolioCAD, 
  PortfolioINTL,
  AssetsUS, 
  AssetsCAD, 
  AssetsINTL,
  CurrentPrice
} from '@shared/schema';
import { db } from '../db';
import { currentPrices } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Type for the legacy portfolio format expected by the UI
 */
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
  [key: string]: any; // Allow for other legacy properties
}

/**
 * Calculate Net Asset Value (NAV) for a stock
 */
function calculateNAV(quantity: number, price: number): number {
  return quantity * price;
}

/**
 * Calculate profit/loss
 */
function calculateProfitLoss(bookPrice: number, currentPrice: number, quantity: number): number {
  if (!bookPrice || !currentPrice) return 0;
  return (currentPrice - bookPrice) * quantity;
}

/**
 * Get current prices for portfolio stocks
 */
async function getCurrentPrices(symbols: string[], region: string): Promise<Record<string, CurrentPrice>> {
  try {
    const prices = await db.select().from(currentPrices)
      .where(eq(currentPrices.region, region));
    
    const priceMap: Record<string, CurrentPrice> = {};
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
 * Calculate 52-week change percentage using high and low from Yahoo Finance
 */
function calculate52WeekChange(currentPrice: number, fiftyTwoWeekHigh: string | null, fiftyTwoWeekLow: string | null): number | undefined {
  if (!fiftyTwoWeekHigh || !fiftyTwoWeekLow) return undefined;
  
  const high = Number(fiftyTwoWeekHigh);
  const low = Number(fiftyTwoWeekLow);
  
  if (isNaN(high) || isNaN(low)) return undefined;
  
  // Calculate the midpoint of the 52-week range
  const midpoint = (high + low) / 2;
  
  // Calculate percentage change from midpoint to current price
  return ((currentPrice - midpoint) / midpoint) * 100;
}

/**
 * Adapt USD portfolio data to legacy format with calculated values
 */
export async function adaptUSDPortfolioData(data: PortfolioUSD[]): Promise<LegacyPortfolioItem[]> {
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
      : Number(item.price);
    
    totalPortfolioValue += calculateNAV(quantity, currentPrice);
  });
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const bookPrice = Number(item.price);
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
    
    // Calculate 52-week change using the Yahoo Finance data
    const fiftyTwoWeekChange = calculate52WeekChange(
      currentPrice,
      currentPriceInfo?.fiftyTwoWeekHigh,
      currentPriceInfo?.fiftyTwoWeekLow
    );
    
    const profitLoss = calculateProfitLoss(bookPrice, currentPrice, quantity);
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: bookPrice,
      pbr: item.pbr ? Number(item.pbr) : undefined,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
      ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
      sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : fiftyTwoWeekChange,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: profitLoss,
      nextEarningsDate: item.nextEarningsDate,
    };
  });
}

/**
 * Adapt CAD portfolio data to legacy format with calculated values
 */
export async function adaptCADPortfolioData(data: PortfolioCAD[]): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'CAD');
  
  // Calculate total portfolio value to determine weights
  let totalPortfolioValue = 0;
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : Number(item.price);
    
    totalPortfolioValue += calculateNAV(quantity, currentPrice);
  });
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const bookPrice = Number(item.price);
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
    
    // Calculate 52-week change using the Yahoo Finance data
    const fiftyTwoWeekChange = calculate52WeekChange(
      currentPrice,
      currentPriceInfo?.fiftyTwoWeekHigh,
      currentPriceInfo?.fiftyTwoWeekLow
    );
    
    const profitLoss = calculateProfitLoss(bookPrice, currentPrice, quantity);
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: bookPrice,
      pbr: item.pbr ? Number(item.pbr) : undefined,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
      ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
      sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : fiftyTwoWeekChange,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: profitLoss,
      nextEarningsDate: item.nextEarningsDate,
    };
  });
}

/**
 * Adapt INTL portfolio data to legacy format with calculated values
 */
export async function adaptINTLPortfolioData(data: PortfolioINTL[]): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'INTL');
  
  // Calculate total portfolio value to determine weights
  let totalPortfolioValue = 0;
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : Number(item.price);
    
    totalPortfolioValue += calculateNAV(quantity, currentPrice);
  });
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const bookPrice = Number(item.price);
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
    
    // Calculate 52-week change using the Yahoo Finance data
    const fiftyTwoWeekChange = calculate52WeekChange(
      currentPrice,
      currentPriceInfo?.fiftyTwoWeekHigh,
      currentPriceInfo?.fiftyTwoWeekLow
    );
    
    const profitLoss = calculateProfitLoss(bookPrice, currentPrice, quantity);
    
    return {
      id: item.id,
      symbol: item.symbol,
      company: item.company,
      stockType: item.stockType,
      rating: item.rating,
      sector: item.sector || 'Technology',
      quantity: quantity,
      price: bookPrice,
      pbr: item.pbr ? Number(item.pbr) : undefined,
      netAssetValue: nav,
      portfolioPercentage: portfolioWeight,
      dailyChangePercent: dailyChange,
      mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
      ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
      sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
      fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : fiftyTwoWeekChange,
      dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
      profitLoss: profitLoss,
      nextEarningsDate: item.nextEarningsDate,
    };
  });
}

/**
 * Adapt legacy assets_us data to portfolio_USD format for migration
 */
export function adaptAssetsUSToPortfolioUSD(data: AssetsUS): Partial<PortfolioUSD> {
  return {
    symbol: data.symbol,
    company: data.company,
    stockType: data.stockType || 'Comp',
    rating: data.stockRating || '1',
    sector: data.sector,
    quantity: data.quantity,
    price: 0, // Default price, will be updated with current price
    pbr: data.pbr,
    nextEarningsDate: data.nextEarningsDate,
    // Other fields will be calculated or populated later
  };
}

/**
 * Adapt legacy assets_cad data to portfolio_CAD format for migration
 */
export function adaptAssetsCADToPortfolioCAD(data: AssetsCAD): Partial<PortfolioCAD> {
  return {
    symbol: data.symbol,
    company: data.company,
    stockType: data.stockType || 'Comp',
    rating: data.stockRating || '1',
    sector: data.sector,
    quantity: data.quantity,
    price: 0, // Default price, will be updated with current price
    pbr: data.pbr,
    nextEarningsDate: data.nextEarningsDate,
    // Other fields will be calculated or populated later
  };
}

/**
 * Adapt legacy assets_intl data to portfolio_INTL format for migration
 */
export function adaptAssetsINTLToPortfolioINTL(data: AssetsINTL): Partial<PortfolioINTL> {
  return {
    symbol: data.symbol,
    company: data.company,
    stockType: data.stockType || 'Comp',
    rating: data.stockRating || '1',
    sector: data.sector,
    quantity: data.quantity,
    price: 0, // Default price, will be updated with current price
    pbr: data.pbr,
    nextEarningsDate: data.nextEarningsDate,
    // Other fields will be calculated or populated later
  };
}

/**
 * Generalized adapter function that selects the correct adapter based on region
 */
export async function adaptPortfolioData(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
  switch (region.toUpperCase()) {
    case 'USD':
      return await adaptUSDPortfolioData(data);
    case 'CAD':
      return await adaptCADPortfolioData(data);
    case 'INTL':
      return await adaptINTLPortfolioData(data);
    default:
      throw new Error(`Invalid region: ${region}`);
  }
}
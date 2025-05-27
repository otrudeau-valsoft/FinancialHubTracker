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
import { performanceService } from '../services/performance-calculation-service';

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
 * Calculate profit/loss in dollar amount
 */
function calculateProfitLoss(bookPrice: number, currentPrice: number, quantity: number): number {
  if (!bookPrice || !currentPrice) return 0;
  return (currentPrice - bookPrice) * quantity;
}

/**
 * Calculate profit/loss as a percentage
 */
function calculateProfitLossPercentage(bookPrice: number, currentPrice: number): number {
  if (!bookPrice || !currentPrice) return 0;
  return ((currentPrice - bookPrice) / bookPrice) * 100;
}

/**
 * Get current prices for portfolio stocks
 * This function has been enhanced to use a more resilient query that ensures
 * we get the latest price data available
 */
async function getCurrentPrices(symbols: string[], region: string): Promise<Record<string, CurrentPrice>> {
  try {
    // Use a more direct query to get the latest prices and add debug output
    console.log(`Getting current prices for ${symbols.length} symbols in ${region} region`);
    
    const prices = await db.select().from(currentPrices)
      .where(eq(currentPrices.region, region));
    
    const priceMap: Record<string, CurrentPrice> = {};
    let foundCount = 0;
    
    prices.forEach(price => {
      if (symbols.includes(price.symbol)) {
        // Debug output to verify current price values
        console.log(`${price.symbol} current price: ${price.regularMarketPrice}, daily change: ${price.regularMarketChangePercent}%`);
        
        priceMap[price.symbol] = price;
        foundCount++;
      }
    });
    
    console.log(`Found current prices for ${foundCount}/${symbols.length} symbols in ${region} region`);
    
    // Log symbols that don't have current prices
    if (foundCount < symbols.length) {
      const missingSymbols = symbols.filter(symbol => !priceMap[symbol]);
      console.log(`Missing current prices for: ${missingSymbols.join(', ')}`);
    }
    
    return priceMap;
  } catch (error) {
    console.error('Error fetching current prices:', error);
    return {};
  }
}

/**
 * Calculate 52-week change percentage using high and low from Yahoo Finance
 * This calculates how far the current price is from the 52-week high as a percentage
 * If current price is higher than the 52-week high (new high), we use the 1-year return instead
 */
function calculate52WeekChange(currentPrice: number, fiftyTwoWeekHigh: string | null, fiftyTwoWeekLow: string | null): number | undefined {
  if (!fiftyTwoWeekHigh || !fiftyTwoWeekLow) return undefined;
  
  const high = Number(fiftyTwoWeekHigh);
  const low = Number(fiftyTwoWeekLow);
  
  if (isNaN(high) || isNaN(low)) return undefined;
  
  // If current price is higher than 52-week high (new high), 
  // calculate the percentage return from 52-week low to show a positive return
  if (currentPrice > high) {
    return ((currentPrice - low) / low) * 100;
  }
  
  // Otherwise, calculate percentage change from 52-week high to current price
  // which will be negative since price is below the high
  return ((currentPrice - high) / high) * 100;
}

/**
 * Adapt USD portfolio data to legacy format with calculated values
 */
export async function adaptUSDPortfolioData(data: any[], region: string = 'USD'): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // CRITICAL FIX: Normalize data to handle database column naming inconsistencies
  const normalizedData = data.map(item => ({
    ...item,
    purchasePrice: item.purchasePrice || item.purchase_price || item['purchase_price']
  }));
  
  // Get symbols for all stocks
  const symbols = normalizedData.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'USD');
  
  // Calculate total portfolio value to determine weights
  let totalPortfolioValue = 0;
  const stocksWithCurrentPrices: Array<{symbol: string, currentPrice: number}> = [];
  
  data.forEach(item => {
    const quantity = Number(item.quantity);
    const currentPriceInfo = priceMap[item.symbol];
    const currentPrice = currentPriceInfo?.regularMarketPrice 
      ? Number(currentPriceInfo.regularMarketPrice) 
      : Number(item.price);
    
    totalPortfolioValue += calculateNAV(quantity, currentPrice);
    
    // Build an array of symbols with their current prices for batch processing
    stocksWithCurrentPrices.push({
      symbol: item.symbol,
      currentPrice: currentPrice
    });
  });
  
  // Calculate performance metrics for all stocks in a single batch operation
  const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
    stocksWithCurrentPrices,
    region
  );
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const bookPrice = purchasePrice || 0;
    
    console.log(`Debug ${item.symbol}: DB purchasePrice=${item.purchasePrice}, converted=${purchasePrice}`);
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
    
    // Calculate profit/loss using purchase price if available, otherwise use book price
    const profitLoss = purchasePrice 
      ? calculateProfitLossPercentage(purchasePrice, currentPrice)
      : calculateProfitLossPercentage(bookPrice, currentPrice);
    
    // Get the pre-calculated performance metrics for this stock
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
  
  // Debug: Log the actual data structure we receive
  console.log(`CAD ADAPTER DEBUG: Received ${data.length} items. First item structure:`, JSON.stringify(data[0], null, 2));
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'CAD');
  
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
    
    // Build an array of symbols with their current prices for batch processing
    stocksWithCurrentPrices.push({
      symbol: item.symbol,
      currentPrice: currentPrice
    });
  });
  
  // Calculate performance metrics for all stocks in a single batch operation
  const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
    stocksWithCurrentPrices,
    'CAD'
  );
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const bookPrice = purchasePrice || 0;
    
    console.log(`Debug ${item.symbol}: DB purchasePrice=${item.purchasePrice}, converted=${purchasePrice}`);
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
    
    // Calculate profit/loss using purchase price if available, otherwise use book price
    const profitLoss = purchasePrice 
      ? calculateProfitLossPercentage(purchasePrice, currentPrice)
      : calculateProfitLossPercentage(bookPrice, currentPrice);
    
    // Get the pre-calculated performance metrics for this stock
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

/**
 * Adapt INTL portfolio data to legacy format with calculated values
 */
export async function adaptINTLPortfolioData(data: PortfolioINTL[]): Promise<LegacyPortfolioItem[]> {
  if (!data.length) return [];
  
  // Debug: Log the actual data structure we receive
  console.log(`INTL ADAPTER DEBUG: Received ${data.length} items. First item structure:`, JSON.stringify(data[0], null, 2));
  
  // Get symbols for all stocks
  const symbols = data.map(item => item.symbol);
  
  // Get current prices
  const priceMap = await getCurrentPrices(symbols, 'INTL');
  
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
    
    // Build an array of symbols with their current prices for batch processing
    stocksWithCurrentPrices.push({
      symbol: item.symbol,
      currentPrice: currentPrice
    });
  });
  
  // Calculate performance metrics for all stocks in a single batch operation
  const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
    stocksWithCurrentPrices,
    'INTL'
  );
  
  // Map each stock to legacy format with calculated values
  return data.map(item => {
    const quantity = Number(item.quantity);
    const purchasePrice = item.purchasePrice ? Number(item.purchasePrice) : undefined;
    const bookPrice = purchasePrice || 0;
    
    console.log(`Debug ${item.symbol}: DB purchasePrice=${item.purchasePrice}, converted=${purchasePrice}`);
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
    
    // Calculate profit/loss using purchase price if available, otherwise use book price
    const profitLoss = purchasePrice 
      ? calculateProfitLossPercentage(purchasePrice, currentPrice)
      : calculateProfitLossPercentage(bookPrice, currentPrice);
    
    // Get the pre-calculated performance metrics for this stock
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
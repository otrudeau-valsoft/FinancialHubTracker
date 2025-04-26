/**
 * Portfolio Adapter
 * 
 * This adapter ensures backward compatibility between our new database structure
 * and the existing UI components. It transforms data from the new regional
 * portfolio tables into the format expected by the UI.
 */

import { 
  PortfolioUSD, 
  PortfolioCAD, 
  PortfolioINTL,
  AssetsUS, 
  AssetsCAD, 
  AssetsINTL
} from '@shared/schema';

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
 * Adapt USD portfolio data to legacy format
 */
export function adaptUSDPortfolioData(data: PortfolioUSD[]): LegacyPortfolioItem[] {
  return data.map(item => ({
    id: item.id,
    symbol: item.symbol,
    company: item.company,
    stockType: item.stockType,
    rating: item.rating,
    sector: item.sector || 'Technology',
    quantity: Number(item.quantity),
    price: item.price ? Number(item.price) : undefined,
    pbr: item.pbr ? Number(item.pbr) : undefined,
    netAssetValue: item.netAssetValue ? Number(item.netAssetValue) : undefined,
    portfolioPercentage: item.portfolioPercentage ? Number(item.portfolioPercentage) : undefined,
    dailyChangePercent: item.dailyChangePercent ? Number(item.dailyChangePercent) : undefined,
    mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
    ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
    sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
    fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : undefined,
    dividendYield: item.dividendYield ? Number(item.dividendYield) : undefined,
    profitLoss: item.profitLoss ? Number(item.profitLoss) : undefined,
    nextEarningsDate: item.nextEarningsDate,
    // Other legacy fields as needed
  }));
}

/**
 * Adapt CAD portfolio data to legacy format
 */
export function adaptCADPortfolioData(data: PortfolioCAD[]): LegacyPortfolioItem[] {
  return data.map(item => ({
    id: item.id,
    symbol: item.symbol,
    company: item.company,
    stockType: item.stockType,
    rating: item.rating,
    sector: item.sector || 'Technology',
    quantity: Number(item.quantity),
    price: item.price ? Number(item.price) : undefined,
    pbr: item.pbr ? Number(item.pbr) : undefined,
    netAssetValue: item.netAssetValue ? Number(item.netAssetValue) : undefined,
    portfolioPercentage: item.portfolioPercentage ? Number(item.portfolioPercentage) : undefined,
    dailyChangePercent: item.dailyChangePercent ? Number(item.dailyChangePercent) : undefined,
    mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
    ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
    sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
    fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : undefined,
    dividendYield: item.dividendYield ? Number(item.dividendYield) : undefined,
    profitLoss: item.profitLoss ? Number(item.profitLoss) : undefined,
    nextEarningsDate: item.nextEarningsDate,
    // Other legacy fields as needed
  }));
}

/**
 * Adapt INTL portfolio data to legacy format
 */
export function adaptINTLPortfolioData(data: PortfolioINTL[]): LegacyPortfolioItem[] {
  return data.map(item => ({
    id: item.id,
    symbol: item.symbol,
    company: item.company,
    stockType: item.stockType,
    rating: item.rating,
    sector: item.sector || 'Technology',
    quantity: Number(item.quantity),
    price: item.price ? Number(item.price) : undefined,
    pbr: item.pbr ? Number(item.pbr) : undefined,
    netAssetValue: item.netAssetValue ? Number(item.netAssetValue) : undefined,
    portfolioPercentage: item.portfolioPercentage ? Number(item.portfolioPercentage) : undefined,
    dailyChangePercent: item.dailyChangePercent ? Number(item.dailyChangePercent) : undefined,
    mtdChangePercent: item.mtdChangePercent ? Number(item.mtdChangePercent) : undefined,
    ytdChangePercent: item.ytdChangePercent ? Number(item.ytdChangePercent) : undefined,
    sixMonthChangePercent: item.sixMonthChangePercent ? Number(item.sixMonthChangePercent) : undefined,
    fiftyTwoWeekChangePercent: item.fiftyTwoWeekChangePercent ? Number(item.fiftyTwoWeekChangePercent) : undefined,
    dividendYield: item.dividendYield ? Number(item.dividendYield) : undefined,
    profitLoss: item.profitLoss ? Number(item.profitLoss) : undefined,
    nextEarningsDate: item.nextEarningsDate,
    // Other legacy fields as needed
  }));
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
export function adaptPortfolioData(data: any[], region: string): LegacyPortfolioItem[] {
  switch (region.toUpperCase()) {
    case 'USD':
      return adaptUSDPortfolioData(data);
    case 'CAD':
      return adaptCADPortfolioData(data);
    case 'INTL':
      return adaptINTLPortfolioData(data);
    default:
      throw new Error(`Invalid region: ${region}`);
  }
}
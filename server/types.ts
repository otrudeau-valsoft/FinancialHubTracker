// Compatibility types for the transition period
// This allows us to maintain the same API while we transition to the new schema

export interface PortfolioStock {
  id: number;
  symbol: string;
  company: string;
  region: string;
  sector: string | null;
  stockType: string;
  rating: string;
  price: string | null;
  quantity: string | null;
  nav: string | null;
  portfolioWeight: string | null;
  dailyChange: string | null;
  mtdChange: string | null;
  ytdChange: string | null;
  sixMonthChange: string | null;
  fiftyTwoWeekChange: string | null;
  dividendYield: string | null;
  profitLoss: string | null;
  nextEarningsDate: string | null;
  updatedAt: Date | null;
}

export interface InsertPortfolioStock {
  symbol: string;
  company: string;
  region: string;
  sector?: string | null;
  stockType: string;
  rating: string;
  price?: string | null;
  quantity?: string | null;
  nav?: string | null;
  portfolioWeight?: string | null;
  dailyChange?: string | null;
  mtdChange?: string | null;
  ytdChange?: string | null;
  sixMonthChange?: string | null;
  fiftyTwoWeekChange?: string | null;
  dividendYield?: string | null;
  profitLoss?: string | null;
  nextEarningsDate?: string | null;
}

export interface EtfHolding {
  id: number;
  etfSymbol: string;
  ticker: string;
  name: string;
  sector: string | null;
  assetClass: string | null;
  marketValue: string | null;
  weight: string | null;
  notionalValue: string | null;
  price: string | null;
  quantity: string | null;
  location: string | null;
  exchange: string | null;
  currency: string | null;
  fxRate: string | null;
  marketCurrency: string | null;
  updatedAt: Date | null;
}

export interface InsertEtfHolding {
  etfSymbol: string;
  ticker: string;
  name: string;
  sector?: string | null;
  assetClass?: string | null;
  marketValue?: string | null;
  weight?: string | null;
  notionalValue?: string | null;
  price?: string | null;
  quantity?: string | null;
  location?: string | null;
  exchange?: string | null;
  currency?: string | null;
  fxRate?: string | null;
  marketCurrency?: string | null;
}
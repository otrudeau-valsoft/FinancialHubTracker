// News article type
export interface NewsArticle {
  id: string;
  title: string;
  publishOn: string;
  commentCount: number;
  imageUrl: string | null;
  link: string;
  symbol?: string;
  sector?: string;
}

// Portfolio stock type
export interface PortfolioStock {
  id: number;
  symbol: string;
  company: string;
  shares: number;
  costBasis: number;
  marketValue: number;
  stockType: string;
  stockRating: string;
  sector: string | null;
  holdings?: number;
}

// Current price type
export interface CurrentPrice {
  id: number;
  symbol: string;
  region: string;
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  updatedAt: string;
}

// Alert type
export interface Alert {
  id: number;
  symbol: string;
  message: string;
  details: string;
  severity: 'critical' | 'warning' | 'info';
  ruleType: string;
  isActive: boolean;
  createdAt: string;
}

// Data update log type
export interface UpdateLog {
  id?: number;
  type: string;
  status: 'Success' | 'Error' | 'In Progress';
  region: string;
  message: string;
  timestamp: string;
}
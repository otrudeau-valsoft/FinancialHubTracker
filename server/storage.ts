import { 
  users, type User, type InsertUser,
  PortfolioRegion,
  historicalPrices, type HistoricalPrice, type InsertHistoricalPrice,
  currentPrices, type CurrentPrice, type InsertCurrentPrice,
  Alert, InsertAlert, MatrixRule, InsertMatrixRule, PortfolioSummary, InsertPortfolioSummary
} from "@shared/schema";

// Import compatibility types for transitioning
import { PortfolioStock, InsertPortfolioStock, EtfHolding, InsertEtfHolding } from "./types";

// Storage interface for all database operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Portfolio stock methods
  getPortfolioStocks(region: string): Promise<PortfolioStock[]>;
  getPortfolioStock(id: number): Promise<PortfolioStock | undefined>;
  getPortfolioStockBySymbol(symbol: string, region: string): Promise<PortfolioStock | undefined>;
  createPortfolioStock(stock: InsertPortfolioStock): Promise<PortfolioStock>;
  updatePortfolioStock(id: number, stock: Partial<InsertPortfolioStock>): Promise<PortfolioStock | undefined>;
  deletePortfolioStock(id: number): Promise<boolean>;
  bulkCreatePortfolioStocks(stocks: InsertPortfolioStock[]): Promise<PortfolioStock[]>;

  // ETF holdings methods
  getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]>;
  getEtfHolding(id: number): Promise<EtfHolding | undefined>;
  createEtfHolding(holding: InsertEtfHolding): Promise<EtfHolding>;
  updateEtfHolding(id: number, holding: Partial<InsertEtfHolding>): Promise<EtfHolding | undefined>;
  deleteEtfHolding(id: number): Promise<boolean>;
  bulkCreateEtfHoldings(holdings: InsertEtfHolding[]): Promise<EtfHolding[]>;
  getTopEtfHoldings(etfSymbol: string, limit: number): Promise<EtfHolding[]>;

  // Matrix rules methods
  getMatrixRules(actionType: string): Promise<MatrixRule[]>;
  getMatrixRule(id: number): Promise<MatrixRule | undefined>;
  createMatrixRule(rule: InsertMatrixRule): Promise<MatrixRule>;
  updateMatrixRule(id: number, rule: Partial<InsertMatrixRule>): Promise<MatrixRule | undefined>;
  deleteMatrixRule(id: number): Promise<boolean>;
  bulkCreateMatrixRules(rules: InsertMatrixRule[]): Promise<MatrixRule[]>;

  // Alert methods
  getAlerts(activeOnly?: boolean): Promise<Alert[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;

  // Portfolio summary methods
  getPortfolioSummary(region: string): Promise<PortfolioSummary | undefined>;
  createPortfolioSummary(summary: InsertPortfolioSummary): Promise<PortfolioSummary>;
  updatePortfolioSummary(id: number, summary: Partial<InsertPortfolioSummary>): Promise<PortfolioSummary | undefined>;

  // Historical price methods
  getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]>;
  getHistoricalPricesByRegion(region: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]>;
  getHistoricalPricesBySymbols(symbols: string[], region: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]>;
  createHistoricalPrice(price: InsertHistoricalPrice): Promise<HistoricalPrice>;
  bulkCreateHistoricalPrices(prices: InsertHistoricalPrice[]): Promise<HistoricalPrice[]>;
  deleteHistoricalPrices(symbol: string, region: string): Promise<boolean>;
  
  // Current price methods
  getCurrentPrices(region: string): Promise<CurrentPrice[]>;
  getCurrentPrice(symbol: string, region: string): Promise<CurrentPrice | undefined>;
  createCurrentPrice(price: InsertCurrentPrice): Promise<CurrentPrice>;
  updateCurrentPrice(id: number, price: Partial<InsertCurrentPrice>): Promise<CurrentPrice | undefined>;
  deleteCurrentPrice(id: number): Promise<boolean>;
  bulkCreateCurrentPrices(prices: InsertCurrentPrice[]): Promise<CurrentPrice[]>;
}

// Import and export the database storage implementation
import { DatabaseStorage } from './db-storage';
export const storage = new DatabaseStorage();
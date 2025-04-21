import { pgTable, text, serial, integer, boolean, numeric, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Stock Type Enum
export const StockTypeEnum = z.enum(["Comp", "Cat", "Cycl"]);
export type StockType = z.infer<typeof StockTypeEnum>;

// Stock Rating Enum (1-4)
export const StockRatingEnum = z.enum(["1", "2", "3", "4"]);
export type StockRating = z.infer<typeof StockRatingEnum>;

// Portfolio Region Enum
export const PortfolioRegionEnum = z.enum(["USD", "CAD", "INTL"]);
export type PortfolioRegion = z.infer<typeof PortfolioRegionEnum>;

// US Assets Schema
export const assetsUS = pgTable("assets_us", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  quantity: numeric("quantity"),
  pbr: numeric("pbr"),  // Price-to-Book Ratio
  stockRating: text("stock_rating"),
  stockType: text("stock_type"),
  sector: text("sector"),
  nextEarningsDate: text("next_earnings_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetsUSSchema = createInsertSchema(assetsUS).omit({
  id: true,
  updatedAt: true,
});

export type InsertAssetsUS = z.infer<typeof insertAssetsUSSchema>;
export type AssetsUS = typeof assetsUS.$inferSelect;

// Canadian Assets Schema
export const assetsCAD = pgTable("assets_cad", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  quantity: numeric("quantity"),
  pbr: numeric("pbr"),  // Price-to-Book Ratio
  stockRating: text("stock_rating"),
  stockType: text("stock_type"),
  sector: text("sector"),
  nextEarningsDate: text("next_earnings_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetsCADSchema = createInsertSchema(assetsCAD).omit({
  id: true,
  updatedAt: true,
});

export type InsertAssetsCAD = z.infer<typeof insertAssetsCADSchema>;
export type AssetsCAD = typeof assetsCAD.$inferSelect;

// International Assets Schema
export const assetsINTL = pgTable("assets_intl", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  quantity: numeric("quantity"),
  pbr: numeric("pbr"),  // Price-to-Book Ratio
  stockRating: text("stock_rating"),
  stockType: text("stock_type"),
  sector: text("sector"),
  nextEarningsDate: text("next_earnings_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetsINTLSchema = createInsertSchema(assetsINTL).omit({
  id: true,
  updatedAt: true,
});

export type InsertAssetsINTL = z.infer<typeof insertAssetsINTLSchema>;
export type AssetsINTL = typeof assetsINTL.$inferSelect;

// ETF Holdings - SPY (S&P 500)
export const etfHoldingsSPY = pgTable("etf_holdings_spy", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  sector: text("sector"),
  assetClass: text("asset_class"),
  marketValue: numeric("market_value"),
  weight: numeric("weight"),
  price: numeric("price"),
  quantity: numeric("quantity"),
  location: text("location"),
  exchange: text("exchange"),
  currency: text("currency"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEtfHoldingsSPYSchema = createInsertSchema(etfHoldingsSPY).omit({
  id: true,
  updatedAt: true,
});

export type InsertEtfHoldingsSPY = z.infer<typeof insertEtfHoldingsSPYSchema>;
export type EtfHoldingsSPY = typeof etfHoldingsSPY.$inferSelect;

// ETF Holdings - XIC (Canadian Index)
export const etfHoldingsXIC = pgTable("etf_holdings_xic", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  sector: text("sector"),
  assetClass: text("asset_class"),
  marketValue: numeric("market_value"),
  weight: numeric("weight"),
  price: numeric("price"),
  quantity: numeric("quantity"),
  location: text("location"),
  exchange: text("exchange"),
  currency: text("currency"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEtfHoldingsXICSchema = createInsertSchema(etfHoldingsXIC).omit({
  id: true,
  updatedAt: true,
});

export type InsertEtfHoldingsXIC = z.infer<typeof insertEtfHoldingsXICSchema>;
export type EtfHoldingsXIC = typeof etfHoldingsXIC.$inferSelect;

// ETF Holdings - ACWX (International Index)
export const etfHoldingsACWX = pgTable("etf_holdings_acwx", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  sector: text("sector"),
  assetClass: text("asset_class"),
  marketValue: numeric("market_value"),
  weight: numeric("weight"),
  price: numeric("price"),
  quantity: numeric("quantity"),
  location: text("location"),
  exchange: text("exchange"),
  currency: text("currency"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEtfHoldingsACWXSchema = createInsertSchema(etfHoldingsACWX).omit({
  id: true,
  updatedAt: true,
});

export type InsertEtfHoldingsACWX = z.infer<typeof insertEtfHoldingsACWXSchema>;
export type EtfHoldingsACWX = typeof etfHoldingsACWX.$inferSelect;

// Historical Prices
export const historicalPrices = pgTable("historical_prices", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  date: date("date").notNull(),
  open: numeric("open"),
  high: numeric("high"),
  low: numeric("low"),
  close: numeric("close").notNull(),
  volume: numeric("volume"),
  adjustedClose: numeric("adjusted_close"),
  region: text("region").notNull(),  // USD, CAD, INTL
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHistoricalPriceSchema = createInsertSchema(historicalPrices).omit({
  id: true,
  updatedAt: true,
});

export type InsertHistoricalPrice = z.infer<typeof insertHistoricalPriceSchema>;
export type HistoricalPrice = typeof historicalPrices.$inferSelect;

// Matrix Rules Schema
export const matrixRules = pgTable("matrix_rules", {
  id: serial("id").primaryKey(),
  ruleType: text("rule_type").notNull(), // e.g., "Price % vs 52-wk Hi", "RSI", etc.
  actionType: text("action_type").notNull(), // "Increase" or "Decrease"
  stockTypeValue: json("stock_type_value").notNull(), // { Comp: "10%", Cat: "20%", Cycl: "15%" }
  orderNumber: integer("order_number").notNull(), // 1, 2, 3, 4
});

export const insertMatrixRuleSchema = createInsertSchema(matrixRules).omit({
  id: true,
});

export type InsertMatrixRule = z.infer<typeof insertMatrixRuleSchema>;
export type MatrixRule = typeof matrixRules.$inferSelect;

// Alert Schema
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  message: text("message").notNull(),
  details: text("details"),
  severity: text("severity").notNull(), // "critical", "warning", "info"
  ruleType: text("rule_type").notNull(), // The rule that triggered this alert
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Portfolio Performance Summary
export const portfolioSummaries = pgTable("portfolio_summaries", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(), // USD, CAD, INTL
  totalValue: numeric("total_value").notNull(),
  dailyChange: numeric("daily_change"),
  dailyChangePercent: numeric("daily_change_percent"),
  benchmarkValue: numeric("benchmark_value"),
  benchmarkDiff: numeric("benchmark_diff"),
  benchmarkDiffPercent: numeric("benchmark_diff_percent"),
  cashPosition: numeric("cash_position"),
  cashPositionPercent: numeric("cash_position_percent"),
  stockCount: integer("stock_count"),
  ytdPerformance: numeric("ytd_performance"),
  ytdPerformanceValue: numeric("ytd_performance_value"),
  activeAlerts: integer("active_alerts"),
  criticalAlerts: integer("critical_alerts"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSummarySchema = createInsertSchema(portfolioSummaries).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioSummary = z.infer<typeof insertPortfolioSummarySchema>;
export type PortfolioSummary = typeof portfolioSummaries.$inferSelect;

// Current Prices (Real-time quotes from Yahoo Finance)
export const currentPrices = pgTable("current_prices", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(),  // USD, CAD, INTL
  regularMarketPrice: numeric("regular_market_price"),
  regularMarketChange: numeric("regular_market_change"),
  regularMarketChangePercent: numeric("regular_market_change_percent"),
  regularMarketVolume: numeric("regular_market_volume"),
  regularMarketDayHigh: numeric("regular_market_day_high"),
  regularMarketDayLow: numeric("regular_market_day_low"),
  marketCap: numeric("market_cap"),
  trailingPE: numeric("trailing_pe"),
  forwardPE: numeric("forward_pe"),
  dividendYield: numeric("dividend_yield"),
  fiftyTwoWeekHigh: numeric("fifty_two_week_high"),
  fiftyTwoWeekLow: numeric("fifty_two_week_low"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCurrentPriceSchema = createInsertSchema(currentPrices).omit({
  id: true,
  updatedAt: true,
});

export type InsertCurrentPrice = z.infer<typeof insertCurrentPriceSchema>;
export type CurrentPrice = typeof currentPrices.$inferSelect;

// Data Update Logs
export const dataUpdateLogs = pgTable("data_update_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'current_price' or 'historical_price'
  region: text("region").notNull(), // 'USD', 'CAD', 'INTL'
  symbol: text("symbol"), // Optional symbol for individual updates
  status: text("status").notNull(), // 'success', 'failed', 'pending'
  message: text("message"), // Optional message
  affectedRows: integer("affected_rows"), // Number of rows affected
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertDataUpdateLogSchema = createInsertSchema(dataUpdateLogs).omit({
  id: true,
});

export type InsertDataUpdateLog = z.infer<typeof insertDataUpdateLogSchema>;
export type DataUpdateLog = typeof dataUpdateLogs.$inferSelect;

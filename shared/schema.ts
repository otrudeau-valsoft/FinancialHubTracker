import { pgTable, text, serial, integer, boolean, numeric, timestamp, json, date, varchar } from "drizzle-orm/pg-core";
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
  type: text("type").notNull(), // 'current_prices' or 'historical_prices'
  status: text("status").notNull(), // 'Success', 'Error', or 'In Progress'
  details: text("details"), // JSON string with additional details
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertDataUpdateLogSchema = createInsertSchema(dataUpdateLogs).omit({
  id: true,
}).extend({
  status: z.enum(['Success', 'Error', 'In Progress'])
});

export type InsertDataUpdateLog = z.infer<typeof insertDataUpdateLogSchema>;
export type DataUpdateLog = typeof dataUpdateLogs.$inferSelect;

// Upgrade Downgrade History
export const upgradeDowngradeHistory = pgTable("upgrade_downgrade_history", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  firm: text("firm").notNull(), // Analyst firm name
  toGrade: text("to_grade").notNull(), // New rating (e.g., "Buy", "Strong Buy", "Underperform", etc.)
  fromGrade: text("from_grade"), // Previous rating
  action: text("action").notNull(), // "up" (upgrade), "down" (downgrade), "init" (initiate), "main" (maintain), "reit" (reiterate)
  epochGradeDate: varchar("epoch_grade_date"), // Unix timestamp as string to avoid integer overflow
  gradeDate: date("grade_date"), // Formatted date
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUpgradeDowngradeHistorySchema = createInsertSchema(upgradeDowngradeHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertUpgradeDowngradeHistory = z.infer<typeof insertUpgradeDowngradeHistorySchema>;
export type UpgradeDowngradeHistory = typeof upgradeDowngradeHistory.$inferSelect;

// Earnings Data Tables

// Earnings Results (Actuals)
export const earningsResults = pgTable("earnings_results", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  quarter: text("quarter").notNull(), // E.g., "Q1 2025"
  fiscalQuarter: text("fiscal_quarter"), // E.g., "Q2" (company's fiscal quarter)
  fiscalYear: text("fiscal_year"), // E.g., "2025" (company's fiscal year)
  reportDate: date("report_date").notNull(),
  epsActual: numeric("eps_actual"),
  epsEstimate: numeric("eps_estimate"),
  epsSurprise: numeric("eps_surprise"), // Difference between actual and estimate
  epsSurprisePercent: numeric("eps_surprise_percent"), // Percentage surprise
  revenueActual: numeric("revenue_actual"),
  revenueEstimate: numeric("revenue_estimate"),
  revenueSurprise: numeric("revenue_surprise"),
  revenueSurprisePercent: numeric("revenue_surprise_percent"),
  earningsScore: text("earnings_score"), // "Good", "Okay", "Bad"
  marketReaction: numeric("market_reaction"), // Stock price % change after earnings
  guidance: text("guidance"), // "Raised", "Maintained", "Lowered", "None"
  guidanceDetails: text("guidance_details"), // Additional information about guidance
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEarningsResultSchema = createInsertSchema(earningsResults).omit({
  id: true,
  updatedAt: true,
});

export type InsertEarningsResult = z.infer<typeof insertEarningsResultSchema>;
export type EarningsResult = typeof earningsResults.$inferSelect;

// Earnings Estimates (Future)
export const earningsEstimates = pgTable("earnings_estimates", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  period: text("period").notNull(), // e.g., "0q" (current quarter), "+1q" (next quarter), "0y" (current year)
  fiscalQuarter: text("fiscal_quarter"), // Company's fiscal quarter (if applicable)
  fiscalYear: text("fiscal_year"), // Company's fiscal year
  expectedReportDate: date("expected_report_date"),
  consensusEPS: numeric("consensus_eps"), // Average EPS estimate
  lowEPS: numeric("low_eps"), // Lowest EPS estimate
  highEPS: numeric("high_eps"), // Highest EPS estimate
  epsNumAnalysts: integer("eps_num_analysts"), // Number of analysts providing EPS estimates
  consensusRevenue: numeric("consensus_revenue"), // Average revenue estimate
  lowRevenue: numeric("low_revenue"), // Lowest revenue estimate
  highRevenue: numeric("high_revenue"), // Highest revenue estimate
  revenueNumAnalysts: integer("revenue_num_analysts"), // Number of analysts providing revenue estimates
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEarningsEstimateSchema = createInsertSchema(earningsEstimates).omit({
  id: true,
  updatedAt: true,
});

export type InsertEarningsEstimate = z.infer<typeof insertEarningsEstimateSchema>;
export type EarningsEstimate = typeof earningsEstimates.$inferSelect;

// Analyst Recommendations
export const analystRecommendations = pgTable("analyst_recommendations", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  period: text("period").notNull(), // e.g., "0m" (current month), "-1m" (1 month ago), "-3m" (3 months ago)
  strongBuy: integer("strong_buy"), // Number of strong buy recommendations
  buy: integer("buy"), // Number of buy recommendations
  hold: integer("hold"), // Number of hold recommendations
  underperform: integer("underperform"), // Number of underperform/sell recommendations
  sell: integer("sell"), // Number of strong sell recommendations
  scoreValue: numeric("score_value"), // Numeric score (e.g., from 1-5) based on recommendations
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAnalystRecommendationSchema = createInsertSchema(analystRecommendations).omit({
  id: true,
  updatedAt: true,
});

export type InsertAnalystRecommendation = z.infer<typeof insertAnalystRecommendationSchema>;
export type AnalystRecommendation = typeof analystRecommendations.$inferSelect;

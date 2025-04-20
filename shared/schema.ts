import { pgTable, text, serial, integer, boolean, numeric, timestamp, json } from "drizzle-orm/pg-core";
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

// Portfolio Stock Schema
export const portfolioStocks = pgTable("portfolio_stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  sector: text("sector"),
  stockType: text("stock_type").notNull(), // Comp, Cat, Cycl
  rating: text("rating").notNull(), // 1, 2, 3, 4
  price: numeric("price"),
  quantity: numeric("quantity"),
  nav: numeric("nav"),
  portfolioWeight: numeric("portfolio_weight"),
  dailyChange: numeric("daily_change"),
  mtdChange: numeric("mtd_change"),
  ytdChange: numeric("ytd_change"),
  sixMonthChange: numeric("six_month_change"),
  fiftyTwoWeekChange: numeric("fifty_two_week_change"),
  dividendYield: numeric("dividend_yield"),
  profitLoss: numeric("profit_loss"),
  nextEarningsDate: text("next_earnings_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioStockSchema = createInsertSchema(portfolioStocks).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioStock = z.infer<typeof insertPortfolioStockSchema>;
export type PortfolioStock = typeof portfolioStocks.$inferSelect;

// ETF Holdings Schema
export const etfHoldings = pgTable("etf_holdings", {
  id: serial("id").primaryKey(),
  etfSymbol: text("etf_symbol").notNull(), // SPY, ACWX, XIC
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  sector: text("sector"),
  assetClass: text("asset_class"),
  marketValue: numeric("market_value"),
  weight: numeric("weight"),
  notionalValue: numeric("notional_value"),
  quantity: numeric("quantity"),
  price: numeric("price"),
  location: text("location"),
  exchange: text("exchange"),
  currency: text("currency"),
  fxRate: numeric("fx_rate"),
  marketCurrency: text("market_currency"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEtfHoldingSchema = createInsertSchema(etfHoldings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEtfHolding = z.infer<typeof insertEtfHoldingSchema>;
export type EtfHolding = typeof etfHoldings.$inferSelect;

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

// Portfolio Summary Schema
export const portfolioSummaries = pgTable("portfolio_summaries", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(), // USD, CAD, INTL
  value: numeric("value").notNull(),
  dailyChange: numeric("daily_change"),
  dailyChangePercent: numeric("daily_change_percent"),
  benchmarkDiff: numeric("benchmark_diff"), // Difference vs benchmark
  cashPosition: numeric("cash_position"),
  cashPositionPercent: numeric("cash_position_percent"),
  ytdPerformance: numeric("ytd_performance"),
  ytdPerformanceValue: numeric("ytd_performance_value"),
  benchmarkPerformance: numeric("benchmark_performance"),
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

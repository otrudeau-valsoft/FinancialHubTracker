import { pgTable, text, serial, integer, boolean, numeric, timestamp, json, date, varchar, uniqueIndex, unique } from "drizzle-orm/pg-core";
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
export const StockTypeEnum = z.enum(["Comp", "Cat", "Cycl", "Cash", "ETF"]);
export type StockType = z.infer<typeof StockTypeEnum>;

// Stock Rating Enum (1-4)
export const StockRatingEnum = z.enum(["1", "2", "3", "4"]);
export type StockRating = z.infer<typeof StockRatingEnum>;

// Portfolio Region Enum
export const PortfolioRegionEnum = z.enum(["USD", "CAD", "INTL"]);
export type PortfolioRegion = z.infer<typeof PortfolioRegionEnum>;

// US Assets Schema
export const assetsUS = pgTable("portfolio_USD", {
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
export const assetsCAD = pgTable("portfolio_CAD", {
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
export const assetsINTL = pgTable("portfolio_INTL", {
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
export const historicalPrices = pgTable(
  "historical_prices", 
  {
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
  },
  (table) => {
    return {
      // Add a unique constraint on symbol, date, and region to prevent duplicates
      symbolDateRegionIdx: uniqueIndex("historical_prices_symbol_date_region_key").on(
        table.symbol, 
        table.date, 
        table.region
      ),
    };
  }
);

export const insertHistoricalPriceSchema = createInsertSchema(historicalPrices).omit({
  id: true,
  updatedAt: true,
});

export type InsertHistoricalPrice = z.infer<typeof insertHistoricalPriceSchema>;
export type HistoricalPrice = typeof historicalPrices.$inferSelect;

// RSI Data - Separate table for better organization and performance
export const rsiData = pgTable(
  "rsi_data",
  {
    id: serial("id").primaryKey(),
    historicalPriceId: integer("historical_price_id").notNull().references(() => historicalPrices.id),
    symbol: text("symbol").notNull(),
    date: date("date").notNull(),
    region: text("region").notNull(),
    rsi9: numeric("rsi_9"),          // RSI with 9-day period
    rsi14: numeric("rsi_14"),        // RSI with 14-day period
    rsi21: numeric("rsi_21"),        // RSI with 21-day period
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Add a unique constraint on historical_price_id to prevent duplicates
      historicalPriceIdIdx: uniqueIndex("rsi_data_historical_price_id_key").on(
        table.historicalPriceId
      ),
      // Add an index on symbol, date, and region for faster lookups
      symbolDateRegionIdx: uniqueIndex("rsi_data_symbol_date_region_key").on(
        table.symbol,
        table.date,
        table.region
      ),
    };
  }
);

export const insertRsiDataSchema = createInsertSchema(rsiData).omit({
  id: true,
  updatedAt: true,
});

export type InsertRsiData = z.infer<typeof insertRsiDataSchema>;
export type RsiData = typeof rsiData.$inferSelect;

// MACD Data - Separate table for MACD indicator values
export const macdData = pgTable(
  "macd_data",
  {
    id: serial("id").primaryKey(),
    historicalPriceId: integer("historical_price_id").notNull().references(() => historicalPrices.id),
    symbol: text("symbol").notNull(),
    date: date("date").notNull(),
    region: text("region").notNull(),
    macd: numeric("macd"),           // MACD line (12-day EMA - 26-day EMA)
    signal: numeric("signal"),       // Signal line (9-day EMA of MACD line)
    histogram: numeric("histogram"), // MACD line - signal line
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Add a unique constraint on historical_price_id to prevent duplicates
      historicalPriceIdIdx: uniqueIndex("macd_data_historical_price_id_key").on(
        table.historicalPriceId
      ),
      // Add an index on symbol, date, and region for faster lookups
      symbolDateRegionIdx: uniqueIndex("macd_data_symbol_date_region_key").on(
        table.symbol,
        table.date,
        table.region
      ),
    };
  }
);

export const insertMacdDataSchema = createInsertSchema(macdData).omit({
  id: true,
  updatedAt: true,
});

export type InsertMacdData = z.infer<typeof insertMacdDataSchema>;
export type MacdData = typeof macdData.$inferSelect;

// Moving Average Data - Separate table for MA indicator values
export const movingAverageData = pgTable(
  "moving_average_data",
  {
    id: serial("id").primaryKey(),
    historicalPriceId: integer("historical_price_id").notNull().references(() => historicalPrices.id),
    symbol: text("symbol").notNull(),
    date: date("date").notNull(),
    region: text("region").notNull(),
    ma50: numeric("ma50"),           // 50-day Simple Moving Average
    ma200: numeric("ma200"),         // 200-day Simple Moving Average
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      // Only keep the proper compound unique index on symbol, date, and region
      // This ensures we don't have duplicate MA data points for the same stock on the same day
      symbolDateRegionIdx: uniqueIndex("moving_average_data_symbol_date_region_key").on(
        table.symbol,
        table.date,
        table.region
      ),
      // Add a regular (non-unique) index on historical_price_id for faster lookups
      historicalPriceIdIdx: uniqueIndex("moving_average_data_historical_price_id_idx").on(
        table.historicalPriceId
      ),
    };
  }
);

export const insertMovingAverageDataSchema = createInsertSchema(movingAverageData).omit({
  id: true,
  updatedAt: true,
});

export type InsertMovingAverageData = z.infer<typeof insertMovingAverageDataSchema>;
export type MovingAverageData = typeof movingAverageData.$inferSelect;

// Matrix Rules Schema
export const matrixRules = pgTable("matrix_rules", {
  id: serial("id").primaryKey(),
  ruleId: text("rule_id").notNull(),            // e.g., "price-52wk", "rsi-low"
  ruleName: text("rule_name").notNull(),        // Human-readable name e.g., "Price % vs 52-wk High"
  description: text("description"),             // Detailed rule description
  actionType: text("action_type").notNull(),    // "Increase" or "Decrease" (position) or "Rating" (for rating changes)
  ratingAction: text("rating_action"),          // "Increase" or "Decrease" (only for rating rules)
  thresholds: json("thresholds").notNull(),     // JSON object with structure for stock type and rating thresholds
  evaluationMethod: text("evaluation_method").notNull(),  // "percent", "value", "boolean", "delta"
  evaluationLogic: text("evaluation_logic").notNull(),    // "below", "above", "at", "positive", "negative"
  dataSource: text("data_source").notNull(),              // "historical_prices", "rsi_data", "macd_data", "market_indices"
  orderNumber: integer("order_number").notNull(),         // Priority order within action type group
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMatrixRuleSchema = createInsertSchema(matrixRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
}, (table) => {
  return {
    // Add unique constraint to prevent duplicate entries
    uniqueSymbolRegion: unique().on(table.symbol, table.region)
  };
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

// Portfolio Cash Balances
export const portfolioCash = pgTable("portfolio_cash", {
  id: serial("id").primaryKey(),
  region: text("region").notNull().unique(),
  amount: numeric("amount").notNull().default("10000"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioCashSchema = createInsertSchema(portfolioCash).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioCash = z.infer<typeof insertPortfolioCashSchema>;
export type PortfolioCash = typeof portfolioCash.$inferSelect;

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

// New Portfolio Tables with Regional Separation

// USD Portfolio
export const portfolioUSD = pgTable("portfolio_USD", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  purchasePrice: numeric("purchase_price"),  // Purchase Price
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioUSDSchema = createInsertSchema(portfolioUSD).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioUSD = z.infer<typeof insertPortfolioUSDSchema>;
export type PortfolioUSD = typeof portfolioUSD.$inferSelect;

// CAD Portfolio
export const portfolioCAD = pgTable("portfolio_CAD", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  purchasePrice: numeric("purchase_price"),  // Purchase Price
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioCADSchema = createInsertSchema(portfolioCAD).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioCAD = z.infer<typeof insertPortfolioCADSchema>;
export type PortfolioCAD = typeof portfolioCAD.$inferSelect;

// INTL Portfolio
export const portfolioINTL = pgTable("portfolio_INTL", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  purchasePrice: numeric("purchase_price"),  // Purchase Price
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioINTLSchema = createInsertSchema(portfolioINTL).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolioINTL = z.infer<typeof insertPortfolioINTLSchema>;
export type PortfolioINTL = typeof portfolioINTL.$inferSelect;

// Transactions Table - Track all buy/sell transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company"),
  action: text("action").notNull(), // 'BUY' or 'SELL'
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  region: text("region").notNull(), // 'USD', 'CAD', 'INTL'
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull(),
  pnlDollar: numeric("pnl_dollar", { precision: 10, scale: 2 }),
  pnlPercent: numeric("pnl_percent", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTransactionSchema = z.object({
  symbol: z.string(),
  company: z.string().optional(),
  action: z.string(),
  quantity: z.number().int(),
  price: z.string(),
  region: z.string(),
  totalValue: z.string(),
  pnlDollar: z.string().optional(),
  pnlPercent: z.string().optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Market Indices - For tracking SPY, XIC, ACWX
export const marketIndices = pgTable("market_indices", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  currentPrice: numeric("current_price"),
  dailyChange: numeric("daily_change"),
  dailyChangePercent: numeric("daily_change_percent"),
  ytdChangePercent: numeric("ytd_change_percent"),
  fiftyTwoWeekHigh: numeric("fifty_two_week_high"),
  fiftyTwoWeekLow: numeric("fifty_two_week_low"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketIndexSchema = createInsertSchema(marketIndices).omit({
  id: true,
  updatedAt: true,
});

export type InsertMarketIndex = z.infer<typeof insertMarketIndexSchema>;
export type MarketIndex = typeof marketIndices.$inferSelect;

// Earnings Quarterly
export const earningsQuarterly = pgTable("earnings_quarterly", {
  ticker: text("ticker").notNull(),
  fiscal_year: integer("fiscal_year").notNull(),
  fiscal_q: integer("fiscal_q").notNull(),
  eps_actual: numeric("eps_actual"),
  eps_estimate: numeric("eps_estimate"),
  rev_actual: numeric("rev_actual"),
  rev_estimate: numeric("rev_estimate"),
  guidance: text("guidance"),
  mkt_reaction: numeric("mkt_reaction"),
  score: text("score"), // Changed from integer to text for Good/Okay/Bad values
  note: text("note"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: uniqueIndex("earnings_quarterly_pk").on(table.ticker, table.fiscal_year, table.fiscal_q),
  };
});

export const insertEarningsQuarterlySchema = createInsertSchema(earningsQuarterly).omit({
  updated_at: true,
});

export type InsertEarningsQuarterly = z.infer<typeof insertEarningsQuarterlySchema>;
export type EarningsQuarterly = typeof earningsQuarterly.$inferSelect;

// Earnings Meta
export const earningsMeta = pgTable("earnings_meta", {
  ticker: text("ticker").primaryKey(),
  last_fetched: timestamp("last_fetched").defaultNow().notNull(),
});

export const insertEarningsMetaSchema = createInsertSchema(earningsMeta);

export type InsertEarningsMeta = z.infer<typeof insertEarningsMetaSchema>;
export type EarningsMeta = typeof earningsMeta.$inferSelect;

// Earnings Data (original - keep for reference)
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  company: text("company").notNull(),
  fiscalQuarter: text("fiscal_quarter").notNull(), // e.g., Q1, Q2, etc.
  fiscalYear: integer("fiscal_year").notNull(), // e.g., 2023, 2024
  reportDate: date("report_date").notNull(),
  timeOfDay: text("time_of_day"), // BMO (Before Market Open), AMC (After Market Close)
  epsEstimate: numeric("eps_estimate"),
  epsActual: numeric("eps_actual"),
  epsSurprise: numeric("eps_surprise"),
  epsSurprisePercent: numeric("eps_surprise_percent"),
  revenueEstimate: numeric("revenue_estimate"),
  revenueActual: numeric("revenue_actual"),
  revenueSurprise: numeric("revenue_surprise"),
  revenueSurprisePercent: numeric("revenue_surprise_percent"),
  stockImpact: numeric("stock_impact"), // Stock price change after earnings announcement
  guidance: text("guidance"), // positive, negative, in-line
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEarningsSchema = createInsertSchema(earnings).omit({
  id: true,
  updatedAt: true,
});

export type InsertEarnings = z.infer<typeof insertEarningsSchema>;
export type Earnings = typeof earnings.$inferSelect;

// Earnings Calendar
export const earningsCalendar = pgTable("earnings_calendar", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  region: text("region").notNull(), // USD, CAD, INTL
  company: text("company").notNull(),
  earningsDate: date("earnings_date").notNull(),
  confirmed: boolean("confirmed").default(false),
  timeOfDay: text("time_of_day"), // BMO (Before Market Open), AMC (After Market Close)
  estimatedEPS: numeric("estimated_eps"),
  lastQuarterEPS: numeric("last_quarter_eps"),
  marketCap: numeric("market_cap"),
  importance: text("importance").notNull().default("normal"), // high, normal, low
  stockRating: text("stock_rating"),
  stockType: text("stock_type"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEarningsCalendarSchema = createInsertSchema(earningsCalendar).omit({
  id: true,
  updatedAt: true,
});

export type InsertEarningsCalendar = z.infer<typeof insertEarningsCalendarSchema>;
export type EarningsCalendar = typeof earningsCalendar.$inferSelect;

// Portfolio Holdings tables (combines portfolio data with current prices and performance metrics)
// USD Holdings
export const holdingsUSD = pgTable("holdings_USD", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  currentPrice: numeric("current_price").notNull(),
  netAssetValue: numeric("net_asset_value").notNull(),  // quantity * currentPrice
  portfolioWeight: numeric("portfolio_weight").notNull(),  // percentage of total portfolio
  benchmarkWeight: numeric("benchmark_weight"),  // percentage in the benchmark ETF (SPY)
  deltaWeight: numeric("delta_weight"),  // difference between portfolio and benchmark weights
  dailyChangePercent: numeric("daily_change_percent"),
  mtdChangePercent: numeric("mtd_change_percent"),
  ytdChangePercent: numeric("ytd_change_percent"),
  sixMonthChangePercent: numeric("six_month_change_percent"),
  fiftyTwoWeekChangePercent: numeric("fifty_two_week_change_percent"),
  profitLossPercent: numeric("profit_loss_percent"),
  dividendYield: numeric("dividend_yield"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHoldingsUSDSchema = createInsertSchema(holdingsUSD).omit({
  id: true,
  updatedAt: true,
});

export type InsertHoldingsUSD = z.infer<typeof insertHoldingsUSDSchema>;
export type HoldingsUSD = typeof holdingsUSD.$inferSelect;

// CAD Holdings
export const holdingsCAD = pgTable("holdings_CAD", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  currentPrice: numeric("current_price").notNull(),
  netAssetValue: numeric("net_asset_value").notNull(),  // quantity * currentPrice
  portfolioWeight: numeric("portfolio_weight").notNull(),  // percentage of total portfolio
  benchmarkWeight: numeric("benchmark_weight"),  // percentage in the benchmark ETF (XIC)
  deltaWeight: numeric("delta_weight"),  // difference between portfolio and benchmark weights
  dailyChangePercent: numeric("daily_change_percent"),
  mtdChangePercent: numeric("mtd_change_percent"),
  ytdChangePercent: numeric("ytd_change_percent"),
  sixMonthChangePercent: numeric("six_month_change_percent"),
  fiftyTwoWeekChangePercent: numeric("fifty_two_week_change_percent"),
  profitLossPercent: numeric("profit_loss_percent"),
  dividendYield: numeric("dividend_yield"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHoldingsCADSchema = createInsertSchema(holdingsCAD).omit({
  id: true,
  updatedAt: true,
});

export type InsertHoldingsCAD = z.infer<typeof insertHoldingsCADSchema>;
export type HoldingsCAD = typeof holdingsCAD.$inferSelect;

// INTL Holdings
export const holdingsINTL = pgTable("holdings_INTL", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  company: text("company").notNull(),
  stockType: text("stock_type").notNull(),
  rating: text("rating").notNull(),
  sector: text("sector"),
  quantity: numeric("quantity").notNull(),
  currentPrice: numeric("current_price").notNull(),
  netAssetValue: numeric("net_asset_value").notNull(),  // quantity * currentPrice
  portfolioWeight: numeric("portfolio_weight").notNull(),  // percentage of total portfolio
  benchmarkWeight: numeric("benchmark_weight"),  // percentage in the benchmark ETF (ACWX)
  deltaWeight: numeric("delta_weight"),  // difference between portfolio and benchmark weights
  dailyChangePercent: numeric("daily_change_percent"),
  mtdChangePercent: numeric("mtd_change_percent"),
  ytdChangePercent: numeric("ytd_change_percent"),
  sixMonthChangePercent: numeric("six_month_change_percent"),
  fiftyTwoWeekChangePercent: numeric("fifty_two_week_change_percent"),
  profitLossPercent: numeric("profit_loss_percent"),
  dividendYield: numeric("dividend_yield"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHoldingsINTLSchema = createInsertSchema(holdingsINTL).omit({
  id: true,
  updatedAt: true,
});

export type InsertHoldingsINTL = z.infer<typeof insertHoldingsINTLSchema>;
export type HoldingsINTL = typeof holdingsINTL.$inferSelect;

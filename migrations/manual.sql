-- Create tables for users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create tables for US Assets
CREATE TABLE IF NOT EXISTS assets_us (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company TEXT NOT NULL,
  quantity NUMERIC,
  pbr NUMERIC,
  stock_rating TEXT,
  stock_type TEXT,
  sector TEXT,
  next_earnings_date TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for CAD Assets
CREATE TABLE IF NOT EXISTS assets_cad (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company TEXT NOT NULL,
  quantity NUMERIC,
  pbr NUMERIC,
  stock_rating TEXT,
  stock_type TEXT,
  sector TEXT,
  next_earnings_date TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for INTL Assets
CREATE TABLE IF NOT EXISTS assets_intl (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company TEXT NOT NULL,
  quantity NUMERIC,
  pbr NUMERIC,
  stock_rating TEXT,
  stock_type TEXT,
  sector TEXT,
  next_earnings_date TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for SPY ETF Holdings
CREATE TABLE IF NOT EXISTS etf_holdings_spy (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  asset_class TEXT,
  market_value NUMERIC,
  weight NUMERIC,
  price NUMERIC,
  quantity NUMERIC,
  location TEXT,
  exchange TEXT,
  currency TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for XIC ETF Holdings
CREATE TABLE IF NOT EXISTS etf_holdings_xic (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  asset_class TEXT,
  market_value NUMERIC,
  weight NUMERIC,
  price NUMERIC,
  quantity NUMERIC,
  location TEXT,
  exchange TEXT,
  currency TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables for ACWX ETF Holdings
CREATE TABLE IF NOT EXISTS etf_holdings_acwx (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  asset_class TEXT,
  market_value NUMERIC,
  weight NUMERIC,
  price NUMERIC,
  quantity NUMERIC,
  location TEXT,
  exchange TEXT,
  currency TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for historical prices
CREATE TABLE IF NOT EXISTS historical_prices (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC NOT NULL,
  volume NUMERIC,
  adjusted_close NUMERIC,
  region TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for matrix rules
CREATE TABLE IF NOT EXISTS matrix_rules (
  id SERIAL PRIMARY KEY,
  rule_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  stock_type_value JSONB NOT NULL,
  order_number INTEGER NOT NULL
);

-- Create table for alerts
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  severity TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for portfolio summaries
CREATE TABLE IF NOT EXISTS portfolio_summaries (
  id SERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  total_value NUMERIC NOT NULL,
  daily_change NUMERIC,
  daily_change_percent NUMERIC,
  benchmark_value NUMERIC,
  benchmark_diff NUMERIC,
  benchmark_diff_percent NUMERIC,
  cash_position NUMERIC,
  cash_position_percent NUMERIC,
  stock_count INTEGER,
  ytd_performance NUMERIC,
  ytd_performance_value NUMERIC,
  active_alerts INTEGER,
  critical_alerts INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
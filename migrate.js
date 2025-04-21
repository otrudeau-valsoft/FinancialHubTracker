import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Drop old tables if they exist
    console.log('Dropping old tables...');
    await db.execute(sql`DROP TABLE IF EXISTS portfolio_stocks CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS etf_holdings CASCADE`);
    
    // Create new tables based on schema.ts
    console.log('Creating new tables...');
    
    // US Assets
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Canadian Assets
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // International Assets
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // ETF Holdings - SPY
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // ETF Holdings - XIC
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // ETF Holdings - ACWX
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Historical Prices
    await db.execute(sql`
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
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Current Prices
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS current_prices (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        region TEXT NOT NULL,
        regular_market_price NUMERIC,
        regular_market_change NUMERIC,
        regular_market_change_percent NUMERIC,
        regular_market_volume NUMERIC,
        regular_market_day_high NUMERIC,
        regular_market_day_low NUMERIC,
        market_cap NUMERIC,
        trailing_pe NUMERIC,
        forward_pe NUMERIC,
        dividend_yield NUMERIC,
        fifty_two_week_high NUMERIC,
        fifty_two_week_low NUMERIC,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
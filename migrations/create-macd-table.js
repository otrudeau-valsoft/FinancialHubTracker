/**
 * Migration to create the MACD data table
 * 
 * This script creates a new table for storing MACD (Moving Average Convergence Divergence)
 * indicator values for historical prices.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting migration: Create MACD Data Table');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Initialize the database client
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client);

    // Check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'macd_data'
      );
    `);

    if (tableExists[0] && tableExists[0].exists) {
      console.log('Table macd_data already exists, skipping creation');
      return;
    }

    // Create the macd_data table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS macd_data (
        id SERIAL PRIMARY KEY,
        historical_price_id INTEGER NOT NULL REFERENCES historical_prices(id),
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        region TEXT NOT NULL,
        macd NUMERIC,
        signal NUMERIC,
        histogram NUMERIC,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create unique indices
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS macd_data_historical_price_id_key 
      ON macd_data (historical_price_id);
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS macd_data_symbol_date_region_key 
      ON macd_data (symbol, date, region);
    `);

    console.log('Successfully created MACD data table');
  } catch (error) {
    console.error('Failed to create MACD data table:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
} else {
  // Export the migration function for programmatic use
  module.exports = { runMigration };
}
/**
 * Migration script to create the MACD data table
 * 
 * This migration adds the macd_data table to store MACD (Moving Average Convergence Divergence) data
 * associated with historical prices.
 */

async function runMigration() {
  console.log('Starting migration: Create MACD table');
  
  // Connect directly to database using environment variable
  const { Client } = require('pg');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  
  try {
    // Create the MACD data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS macd_data (
        id SERIAL PRIMARY KEY,
        historical_price_id INTEGER NOT NULL REFERENCES historical_prices(id),
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        region TEXT NOT NULL,
        macd NUMERIC,
        signal NUMERIC,
        histogram NUMERIC,
        fast_period INTEGER NOT NULL DEFAULT 12,
        slow_period INTEGER NOT NULL DEFAULT 26,
        signal_period INTEGER NOT NULL DEFAULT 9,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Add a unique constraint on historical_price_id and periods to prevent duplicates
        CONSTRAINT macd_data_unique_idx UNIQUE (
          historical_price_id, 
          fast_period, 
          slow_period, 
          signal_period
        )
      );
    `);
    
    // Create an index on symbol, date, and region for faster lookups
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS macd_data_symbol_date_region_key
      ON macd_data (symbol, date, region);
    `);
    
    console.log('Successfully created MACD data table');
    return true;
  } catch (error) {
    console.error('Error creating MACD data table:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.end();
  }
}

// Export the migration function
module.exports = {
  runMigration
};
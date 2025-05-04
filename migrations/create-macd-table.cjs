/**
 * Migration to create the MACD data table
 * 
 * This migration creates a dedicated MACD data table to store MACD values for historical prices.
 * MACD (Moving Average Convergence Divergence) is a trend-following momentum indicator that
 * shows the relationship between two moving averages of a security's price.
 */

const { Client } = require('pg');

/**
 * Run the migration
 */
async function runMigration() {
  console.log('Starting migration: Create MACD data table');

  // Create a new client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Create the MACD data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS macd_data (
        id SERIAL PRIMARY KEY,
        historical_price_id INTEGER NOT NULL REFERENCES historical_prices(id) ON DELETE CASCADE,
        symbol VARCHAR(20) NOT NULL,
        date VARCHAR(50) NOT NULL,
        region VARCHAR(10) NOT NULL,
        macd VARCHAR(50),
        signal VARCHAR(50),
        histogram VARCHAR(50),
        fast_period SMALLINT NOT NULL DEFAULT 12,
        slow_period SMALLINT NOT NULL DEFAULT 26,
        signal_period SMALLINT NOT NULL DEFAULT 9,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_macd_data UNIQUE (historical_price_id, fast_period, slow_period, signal_period)
      );
    `);
    console.log('Created MACD data table');

    // Create an index on symbol and date for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_macd_data_symbol_date 
      ON macd_data (symbol, date);
    `);
    console.log('Created index on symbol and date');

    // Create an index on historical_price_id for faster joins
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_macd_data_historical_price_id 
      ON macd_data (historical_price_id);
    `);
    console.log('Created index on historical_price_id');

    console.log('Migration completed successfully');
    return { success: true, message: 'MACD data table created successfully' };
  } catch (error) {
    console.error('Error during migration:', error);
    return { success: false, error: error.message };
  } finally {
    // Always close the client
    await client.end();
    console.log('Database connection closed');
  }
}

// Export the migration function
module.exports = {
  runMigration
};
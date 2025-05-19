/**
 * Migration to create the Moving Average data table
 * 
 * This script creates a new table for storing Moving Average (MA)
 * indicator values for historical prices.
 */

import { pool } from '../server/db.js';

/**
 * Run the migration to create the moving_average_data table
 */
async function runMigration() {
  console.log('Starting migration: Creating moving_average_data table...');
  
  try {
    // Create the table for storing moving average data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moving_average_data (
        id SERIAL PRIMARY KEY,
        historical_price_id INTEGER NOT NULL REFERENCES historical_prices(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        region TEXT NOT NULL,
        ma50 NUMERIC,
        ma200 NUMERIC,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(historical_price_id)
      );
    `);

    console.log('Created moving_average_data table successfully');
    
    // Add index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moving_average_data_symbol_region 
      ON moving_average_data(symbol, region);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moving_average_data_date
      ON moving_average_data(date);
    `);

    console.log('Created indices on moving_average_data table');

    return { success: true, message: 'Successfully created moving_average_data table and indices' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
}

export { runMigration };
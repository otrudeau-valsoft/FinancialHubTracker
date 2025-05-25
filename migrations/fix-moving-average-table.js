/**
 * Migration to fix moving_average_data table structure
 * 
 * This migration adds proper constraints and indexes to the moving_average_data table
 * to match the structure of rsi_data and macd_data tables, ensuring data integrity
 * and proper relationships with the historical_prices table.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

/**
 * Run the migration to update the moving_average_data table
 */
async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting migration to fix moving_average_data table...');

    // Begin transaction
    await pool.query('BEGIN');

    // First, drop the existing moving_average_data table if it exists
    await pool.query(`
      DROP TABLE IF EXISTS moving_average_data CASCADE;
    `);

    // Create the moving_average_data table with proper constraints
    await pool.query(`
      CREATE TABLE moving_average_data (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        ma50 DECIMAL(18, 8),
        ma200 DECIMAL(18, 8),
        region VARCHAR(10) NOT NULL,
        historical_price_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT moving_average_data_symbol_date_region_key UNIQUE (symbol, date, region),
        CONSTRAINT fk_historical_price FOREIGN KEY (historical_price_id) 
          REFERENCES historical_prices(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX idx_moving_average_data_symbol ON moving_average_data (symbol);
      CREATE INDEX idx_moving_average_data_region ON moving_average_data (region);
      CREATE INDEX idx_moving_average_data_date ON moving_average_data (date);
      CREATE INDEX idx_moving_average_data_historical_price_id ON moving_average_data (historical_price_id);
    `);

    // Commit transaction
    await pool.query('COMMIT');

    console.log('Successfully updated moving_average_data table structure with proper constraints and indexes.');
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Error updating moving_average_data table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the migration when this file is run directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
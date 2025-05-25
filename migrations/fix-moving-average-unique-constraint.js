/**
 * Migration to fix the Moving Average data table constraints
 * 
 * This migration updates the moving_average_data table to remove the unique constraint 
 * on historical_price_id and replace it with a regular index. This allows moving average
 * data to be calculated correctly for stocks in all regions (USD, CAD, INTL).
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Run the migration to fix the moving_average_data table constraints
 */
async function runMigration() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting migration to fix moving_average_data table constraints...');

    // Begin transaction
    await pool.query('BEGIN');

    // Drop the unique constraint on historical_price_id
    console.log('Dropping unique constraint on historical_price_id...');
    await pool.query(`
      ALTER TABLE moving_average_data 
      DROP CONSTRAINT IF EXISTS moving_average_data_historical_price_id_key;
    `);

    // Create a regular (non-unique) index on historical_price_id for faster lookups
    console.log('Creating regular index on historical_price_id...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS moving_average_data_historical_price_id_idx 
      ON moving_average_data(historical_price_id);
    `);

    // Make sure we have the correct unique constraint on symbol, date, and region
    console.log('Ensuring symbol+date+region unique constraint exists...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS moving_average_data_symbol_date_region_key
      ON moving_average_data(symbol, date, region);
    `);

    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration executed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
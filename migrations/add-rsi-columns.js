import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

/**
 * Adds RSI columns to the historical_prices table
 */
async function runMigration() {
  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Connected to database');
  console.log('Running migration: Add RSI columns to historical_prices table');

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Add the RSI columns if they don't exist
    await pool.query(`
      ALTER TABLE historical_prices
      ADD COLUMN IF NOT EXISTS rsi_14 NUMERIC,
      ADD COLUMN IF NOT EXISTS rsi_9 NUMERIC,
      ADD COLUMN IF NOT EXISTS rsi_21 NUMERIC;
    `);

    // Create indexes for the RSI columns for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS historical_prices_rsi_14_idx ON historical_prices (symbol, rsi_14);
      CREATE INDEX IF NOT EXISTS historical_prices_rsi_9_idx ON historical_prices (symbol, rsi_9);
      CREATE INDEX IF NOT EXISTS historical_prices_rsi_21_idx ON historical_prices (symbol, rsi_21);
    `);

    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback the transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('Error in migration script:', err);
  process.exit(1);
});
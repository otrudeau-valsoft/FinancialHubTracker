/**
 * Migration to rename pbr column to purchase_price in portfolio tables
 * 
 * This migration updates all three portfolio tables (USD, CAD, INTL) to rename
 * the pbr column to purchase_price for better clarity and functionality.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Run the migration to rename pbr to purchase_price
 */
async function runMigration() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting migration to rename pbr to purchase_price...');

    // Begin transaction
    await pool.query('BEGIN');

    // Rename column in portfolio_USD table
    console.log('Updating portfolio_USD table...');
    await pool.query(`
      ALTER TABLE "portfolio_USD" 
      RENAME COLUMN pbr TO purchase_price;
    `);

    // Rename column in portfolio_CAD table
    console.log('Updating portfolio_CAD table...');
    await pool.query(`
      ALTER TABLE "portfolio_CAD" 
      RENAME COLUMN pbr TO purchase_price;
    `);

    // Rename column in portfolio_INTL table
    console.log('Updating portfolio_INTL table...');
    await pool.query(`
      ALTER TABLE "portfolio_INTL" 
      RENAME COLUMN pbr TO purchase_price;
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
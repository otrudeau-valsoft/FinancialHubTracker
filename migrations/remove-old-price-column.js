/**
 * Migration to remove the old price column from portfolio tables
 * 
 * After migrating to purchasePrice, we need to remove the old price column
 * that is causing not-null constraint violations.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Run the migration to remove the old price column
 */
async function runMigration() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting migration to remove old price column...');

    // Begin transaction
    await pool.query('BEGIN');

    // Remove price column from portfolio_USD table
    console.log('Removing price column from portfolio_USD table...');
    await pool.query(`
      ALTER TABLE "portfolio_USD" 
      DROP COLUMN IF EXISTS price;
    `);

    // Remove price column from portfolio_CAD table
    console.log('Removing price column from portfolio_CAD table...');
    await pool.query(`
      ALTER TABLE "portfolio_CAD" 
      DROP COLUMN IF EXISTS price;
    `);

    // Remove price column from portfolio_INTL table
    console.log('Removing price column from portfolio_INTL table...');
    await pool.query(`
      ALTER TABLE "portfolio_INTL" 
      DROP COLUMN IF EXISTS price;
    `);

    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('Successfully removed old price columns from all portfolio tables');
    
  } catch (error) {
    console.error('Migration failed, rolling back...', error);
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };
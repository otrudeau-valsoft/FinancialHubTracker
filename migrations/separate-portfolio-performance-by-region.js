/**
 * Migration to separate portfolio performance tables by region
 * 
 * This migration:
 * 1. Creates new region-specific portfolio performance tables
 * 2. Migrates data from the existing table to the new tables
 * 3. Drops the old consolidated table
 */

import { pool } from '../server/db.ts';

async function runMigration() {
  console.log('Starting migration: Separating portfolio performance tables by region...');
  
  try {
    // 1. Create new region-specific tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_performance_USD (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        date DATE NOT NULL,
        portfolio_value NUMERIC NOT NULL,
        benchmark_value NUMERIC NOT NULL,
        portfolio_return_daily NUMERIC,
        benchmark_return_daily NUMERIC,
        portfolio_cumulative_return NUMERIC,
        benchmark_cumulative_return NUMERIC,
        relative_performance NUMERIC
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_performance_CAD (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        date DATE NOT NULL,
        portfolio_value NUMERIC NOT NULL,
        benchmark_value NUMERIC NOT NULL,
        portfolio_return_daily NUMERIC,
        benchmark_return_daily NUMERIC,
        portfolio_cumulative_return NUMERIC,
        benchmark_cumulative_return NUMERIC,
        relative_performance NUMERIC
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_performance_INTL (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        date DATE NOT NULL,
        portfolio_value NUMERIC NOT NULL,
        benchmark_value NUMERIC NOT NULL,
        portfolio_return_daily NUMERIC,
        benchmark_return_daily NUMERIC,
        portfolio_cumulative_return NUMERIC,
        benchmark_cumulative_return NUMERIC,
        relative_performance NUMERIC
      );
    `);
    
    // 2. Migrate data from the existing table to the new tables
    console.log('Migrating data from the existing table to new region-specific tables...');
    
    // Migrate USD data
    const usdResult = await pool.query(`
      INSERT INTO portfolio_performance_USD (
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      )
      SELECT 
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      FROM portfolio_performance
      WHERE region = 'USD'
      ORDER BY date;
    `);
    
    console.log(`Migrated ${usdResult.rowCount} USD performance records.`);
    
    // Migrate CAD data
    const cadResult = await pool.query(`
      INSERT INTO portfolio_performance_CAD (
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      )
      SELECT 
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      FROM portfolio_performance
      WHERE region = 'CAD'
      ORDER BY date;
    `);
    
    console.log(`Migrated ${cadResult.rowCount} CAD performance records.`);
    
    // Migrate INTL data
    const intlResult = await pool.query(`
      INSERT INTO portfolio_performance_INTL (
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      )
      SELECT 
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      FROM portfolio_performance
      WHERE region = 'INTL'
      ORDER BY date;
    `);
    
    console.log(`Migrated ${intlResult.rowCount} INTL performance records.`);
    
    // 3. Drop the old consolidated table
    console.log('Dropping the old consolidated portfolio_performance table...');
    await pool.query('DROP TABLE portfolio_performance;');
    
    console.log('Migration completed successfully.');
    return { success: true };
  } catch (error) {
    console.error('Error during migration:', error);
    return { success: false, error: error.message };
  }
}

// Run the migration
runMigration()
  .then(result => {
    if (result.success) {
      console.log('Migration completed successfully.');
      process.exit(0);
    } else {
      console.error('Migration failed:', result.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error during migration:', err);
    process.exit(1);
  });

export { runMigration };
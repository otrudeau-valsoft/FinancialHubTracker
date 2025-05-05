/**
 * Migration to redesign the portfolio performance history tables
 * 
 * This migration:
 * 1. Drops the existing portfolio performance tables
 * 2. Creates new, simplified performance tables with better schema
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ws from 'ws';

// Initialize dotenv
dotenv.config();

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Get dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('Starting migration: Redesigning portfolio performance tables');
  
  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Start a transaction to ensure all changes are applied atomically
    await pool.query('BEGIN');
    
    // Drop old tables if they exist
    console.log('Dropping existing portfolio performance tables...');
    await pool.query(`
      DROP TABLE IF EXISTS portfolio_performance_history;
      DROP TABLE IF EXISTS portfolio_performance_usd;
      DROP TABLE IF EXISTS portfolio_performance_cad;
      DROP TABLE IF EXISTS portfolio_performance_intl;
    `);
    
    // Create new regional performance tables with identical schema
    console.log('Creating new USD performance table...');
    await pool.query(`
      CREATE TABLE portfolio_performance_usd (
        date DATE PRIMARY KEY,
        portfolio_value NUMERIC(18, 2) NOT NULL,
        benchmark_value NUMERIC(18, 2) NOT NULL,
        portfolio_cumulative_return NUMERIC(10, 6) NOT NULL,
        benchmark_cumulative_return NUMERIC(10, 6) NOT NULL,
        portfolio_return_daily NUMERIC(10, 6),
        benchmark_return_daily NUMERIC(10, 6),
        relative_performance NUMERIC(10, 6) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_portfolio_performance_usd_date ON portfolio_performance_usd (date);
    `);
    
    console.log('Creating new CAD performance table...');
    await pool.query(`
      CREATE TABLE portfolio_performance_cad (
        date DATE PRIMARY KEY,
        portfolio_value NUMERIC(18, 2) NOT NULL,
        benchmark_value NUMERIC(18, 2) NOT NULL,
        portfolio_cumulative_return NUMERIC(10, 6) NOT NULL,
        benchmark_cumulative_return NUMERIC(10, 6) NOT NULL,
        portfolio_return_daily NUMERIC(10, 6),
        benchmark_return_daily NUMERIC(10, 6),
        relative_performance NUMERIC(10, 6) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_portfolio_performance_cad_date ON portfolio_performance_cad (date);
    `);
    
    console.log('Creating new INTL performance table...');
    await pool.query(`
      CREATE TABLE portfolio_performance_intl (
        date DATE PRIMARY KEY,
        portfolio_value NUMERIC(18, 2) NOT NULL,
        benchmark_value NUMERIC(18, 2) NOT NULL,
        portfolio_cumulative_return NUMERIC(10, 6) NOT NULL,
        benchmark_cumulative_return NUMERIC(10, 6) NOT NULL,
        portfolio_return_daily NUMERIC(10, 6),
        benchmark_return_daily NUMERIC(10, 6),
        relative_performance NUMERIC(10, 6) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_portfolio_performance_intl_date ON portfolio_performance_intl (date);
    `);
    
    // Create triggers to automatically update the updated_at timestamp
    console.log('Creating triggers for timestamp updates...');
    await pool.query(`
      -- Function to update the updated_at timestamp
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Triggers for each table
      CREATE TRIGGER set_portfolio_performance_usd_updated_at
      BEFORE UPDATE ON portfolio_performance_usd
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
      
      CREATE TRIGGER set_portfolio_performance_cad_updated_at
      BEFORE UPDATE ON portfolio_performance_cad
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
      
      CREATE TRIGGER set_portfolio_performance_intl_updated_at
      BEFORE UPDATE ON portfolio_performance_intl
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `);
    
    // Commit the transaction if all operations succeeded
    await pool.query('COMMIT');
    console.log('Migration completed successfully: Portfolio performance tables redesigned');
  } catch (error) {
    // Roll back the transaction if any operation failed
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(err => {
    console.error('Error running migration:', err);
    process.exit(1);
  });
}

// Export for programmatic usage
export { runMigration };
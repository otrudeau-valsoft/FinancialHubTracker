/**
 * Migration to redesign the portfolio performance history tables
 * 
 * This migration:
 * 1. Drops the existing portfolio performance tables
 * 2. Creates new, simplified performance tables with better schema
 */

const { pool } = require('../server/db');

async function runMigration() {
  try {
    console.log('Starting portfolio performance history redesign migration...');
    
    // First, drop the existing tables if they exist
    const regions = ['usd', 'cad', 'intl'];
    
    for (const region of regions) {
      try {
        // Check if table exists before dropping
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'portfolio_performance_${region}'
          )
        `);
        
        if (tableExists.rows[0].exists) {
          await pool.query(`DROP TABLE IF EXISTS portfolio_performance_${region}`);
          console.log(`Dropped portfolio_performance_${region} table`);
        }
      } catch (err) {
        console.error(`Error dropping portfolio_performance_${region} table:`, err);
      }
    }
    
    // Create the new portfolio performance tables
    for (const region of regions) {
      await pool.query(`
        CREATE TABLE portfolio_performance_${region} (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          portfolio_value DECIMAL(15,2) NOT NULL,
          benchmark_value DECIMAL(15,2) NOT NULL,
          portfolio_daily_return DECIMAL(10,6),
          benchmark_daily_return DECIMAL(10,6),
          UNIQUE(date)
        )
      `);
      
      console.log(`Created new portfolio_performance_${region} table`);
    }
    
    // Create indexes for faster queries
    for (const region of regions) {
      await pool.query(`CREATE INDEX idx_portfolio_performance_${region}_date ON portfolio_performance_${region} (date)`);
      console.log(`Created date index for portfolio_performance_${region} table`);
    }
    
    console.log('Portfolio performance history redesign migration completed successfully');
    
  } catch (error) {
    console.error('Error during portfolio performance history redesign migration:', error);
    throw error;
  } 
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
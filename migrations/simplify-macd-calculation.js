/**
 * Migration to simplify MACD data by focusing only on Fast EMA, Slow EMA, and Histogram
 * This will clear existing MACD data and update the schema to match our simplified approach
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Execute the migration
 */
async function runMigration() {
  console.log('Starting MACD simplification migration...');
  
  // Create a PostgreSQL client
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Step 1: Truncate the macd_data table to start fresh (per user's request)
    console.log('Truncating macd_data table to reset MACD calculations...');
    await client.query('TRUNCATE TABLE macd_data');
    
    // Step 2: Verify the table structure is aligned with our simplified approach
    console.log('Verifying table structure for simplified MACD approach...');
    
    // Check if we have all the necessary columns
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'macd_data' 
      AND column_name IN ('fast', 'slow', 'histogram');
    `);
    
    // If any column is missing, add it
    const expectedColumns = ['fast', 'slow', 'histogram'];
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    
    for (const column of expectedColumns) {
      if (!existingColumns.includes(column)) {
        console.log(`Adding missing column: ${column}`);
        await client.query(`
          ALTER TABLE macd_data 
          ADD COLUMN ${column} NUMERIC;
        `);
      }
    }
    
    // Create comments explaining the columns
    await client.query(`
      COMMENT ON COLUMN macd_data.fast IS 'Fast EMA (12-period)';
      COMMENT ON COLUMN macd_data.slow IS 'Slow EMA (26-period)';
      COMMENT ON COLUMN macd_data.histogram IS 'Histogram (Fast - Slow)';
    `);
    
    // Ensure backward compatibility columns maintain the same data
    await client.query(`
      COMMENT ON COLUMN macd_data.macd IS 'Same as fast EMA (for backward compatibility)';
      COMMENT ON COLUMN macd_data.signal IS 'Same as slow EMA (for backward compatibility)';
    `);
    
    // Set default periods
    await client.query(`
      ALTER TABLE macd_data 
      ALTER COLUMN fast_period SET DEFAULT 12;
      
      ALTER TABLE macd_data 
      ALTER COLUMN slow_period SET DEFAULT 26;
      
      ALTER TABLE macd_data 
      ALTER COLUMN signal_period SET DEFAULT 9;
    `);
    
    // Create index on symbol, region for faster lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS macd_data_symbol_region_idx 
      ON macd_data (symbol, region);
    `);

    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback the transaction if there's an error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Export for use in other files
export { runMigration };

// If this script is run directly (not imported)
// Note: This uses conditional check for ES Modules
if (import.meta.url === import.meta.main) {
  runMigration()
    .then(() => {
      console.log('MACD simplification migration completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('MACD simplification migration failed:', error);
      process.exit(1);
    });
}
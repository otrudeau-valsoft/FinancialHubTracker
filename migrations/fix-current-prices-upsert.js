/**
 * Migration to fix current prices table with proper upsert for symbol/region uniqueness
 * 
 * This migration adds a unique constraint to the current_prices table to ensure
 * there are no duplicate entries for the same symbol+region combination.
 */
import { pool, db } from '../server/db.js';
import { currentPrices } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting current_prices uniqueness migration...');
  
  try {
    // 1. Check if there are any duplicates remaining
    const duplicatesQuery = `
      SELECT symbol, region, COUNT(*) as count 
      FROM current_prices 
      GROUP BY symbol, region 
      HAVING COUNT(*) > 1;
    `;
    
    const duplicatesResult = await pool.query(duplicatesQuery);
    
    if (duplicatesResult.rows.length > 0) {
      console.log(`Found ${duplicatesResult.rows.length} groups of duplicates, cleaning up...`);
      
      // 2. Delete duplicates, keeping only the latest version of each symbol/region pair
      const cleanupQuery = `
        WITH latest_prices AS (
          SELECT DISTINCT ON (symbol, region) id
          FROM current_prices
          ORDER BY symbol, region, updated_at DESC
        )
        DELETE FROM current_prices
        WHERE id NOT IN (SELECT id FROM latest_prices);
      `;
      
      const cleanupResult = await pool.query(cleanupQuery);
      console.log(`Deleted ${cleanupResult.rowCount} duplicate price entries`);
    } else {
      console.log('No duplicates found, schema is clean');
    }
    
    // 3. Check if the unique constraint already exists
    const constraintCheckQuery = `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'current_prices'
      AND constraint_name = 'unique_symbol_region'
      AND constraint_type = 'UNIQUE';
    `;
    
    const constraintResult = await pool.query(constraintCheckQuery);
    
    if (constraintResult.rows.length === 0) {
      // 4. Add unique constraint
      const addConstraintQuery = `
        ALTER TABLE current_prices 
        ADD CONSTRAINT unique_symbol_region UNIQUE (symbol, region);
      `;
      
      await pool.query(addConstraintQuery);
      console.log('Added unique constraint on symbol and region columns');
    } else {
      console.log('Unique constraint already exists');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
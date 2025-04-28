/**
 * Migration to add a unique constraint to historical_prices table
 * This will prevent duplicate entries for the same symbol, date, and region
 */

// Use ES module import
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';

// Configure environment variables if needed
config();

// For Neon serverless
if (typeof process !== 'undefined') {
  // @ts-ignore
  if (process.env && process.env.NEON_DB) {
    // @ts-ignore
    process.env.DATABASE_URL = process.env.NEON_DB;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Set up WebSocket constructor for Neon
const neonConfig = { webSocketConstructor: ws };

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log("Running migration: Add unique constraint to historical_prices table");
    
    // Step 1: First remove any duplicates that might exist
    console.log("Step 1: Removing duplicate historical price records...");
    await pool.query(`
      DELETE FROM historical_prices
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (PARTITION BY symbol, date, region ORDER BY id DESC) as row_num
          FROM historical_prices
        ) AS dupes
        WHERE dupes.row_num > 1
      );
    `);
    
    // Step 2: Add the unique constraint
    console.log("Step 2: Adding unique constraint to historical_prices table...");
    await pool.query(`
      ALTER TABLE historical_prices
      ADD CONSTRAINT historical_prices_symbol_date_region_key
      UNIQUE (symbol, date, region);
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    
    // If the constraint already exists, consider it a success
    if (error.message.includes('already exists')) {
      console.log("Constraint already exists, skipping migration.");
      return;
    }
    
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
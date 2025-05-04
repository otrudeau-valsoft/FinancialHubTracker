/**
 * Migration script to:
 * 1. Create the new rsi_data table
 * 2. Move existing RSI data from historical_prices to rsi_data
 * 3. Remove the RSI columns from historical_prices
 * 
 * This is part of our schema refactoring to improve RSI data storage
 */
import { pool } from '../server/db.js';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const db = drizzle(pool);

async function runMigration() {
  console.log('Starting RSI data migration to separate table...');
  
  try {
    // Step 1: Check if the rsi_data table exists, and create it if not
    console.log('Checking for rsi_data table...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'rsi_data'
    `);
    
    if (tables.length === 0) {
      console.log('Creating rsi_data table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "rsi_data" (
          "id" SERIAL PRIMARY KEY,
          "historical_price_id" INTEGER NOT NULL REFERENCES "historical_prices"("id"),
          "symbol" TEXT NOT NULL,
          "date" DATE NOT NULL,
          "region" TEXT NOT NULL,
          "rsi_9" NUMERIC,
          "rsi_14" NUMERIC,
          "rsi_21" NUMERIC,
          "updated_at" TIMESTAMP DEFAULT NOW(),
          CONSTRAINT "rsi_data_historical_price_id_key" UNIQUE ("historical_price_id"),
          CONSTRAINT "rsi_data_symbol_date_region_key" UNIQUE ("symbol", "date", "region")
        )
      `);
      console.log('Created rsi_data table.');
    } else {
      console.log('rsi_data table already exists.');
    }
    
    // Step 2: Migrate RSI data from historical_prices to the new table
    console.log('Migrating RSI data from historical_prices to rsi_data...');
    
    // Check if historical_prices has the RSI columns
    const histPricesColumns = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'historical_prices'
      AND column_name IN ('rsi_9', 'rsi_14', 'rsi_21')
    `);
    
    if (histPricesColumns.length > 0) {
      console.log(`Found ${histPricesColumns.length} RSI columns in historical_prices.`);
      
      // Count records with any RSI data
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM historical_prices
        WHERE rsi_9 IS NOT NULL OR rsi_14 IS NOT NULL OR rsi_21 IS NOT NULL
      `);
      
      const count = countResult[0]?.count || 0;
      console.log(`Found ${count} historical price records with RSI data.`);
      
      if (parseInt(count) > 0) {
        // Migrate data in batches to avoid memory issues
        const batchSize = 5000;
        let processed = 0;
        let total = parseInt(count);
        
        while (processed < total) {
          console.log(`Processing batch ${processed+1} to ${Math.min(processed+batchSize, total)} of ${total}...`);
          
          // Insert data in batches
          await db.execute(sql`
            INSERT INTO rsi_data (
              historical_price_id, symbol, date, region, rsi_9, rsi_14, rsi_21
            )
            SELECT 
              id, symbol, date, region, rsi_9, rsi_14, rsi_21
            FROM 
              historical_prices
            WHERE 
              (rsi_9 IS NOT NULL OR rsi_14 IS NOT NULL OR rsi_21 IS NOT NULL)
            ORDER BY id
            LIMIT ${batchSize}
            OFFSET ${processed}
            ON CONFLICT (historical_price_id) DO UPDATE SET
              rsi_9 = EXCLUDED.rsi_9,
              rsi_14 = EXCLUDED.rsi_14,
              rsi_21 = EXCLUDED.rsi_21,
              updated_at = NOW()
          `);
          
          processed += batchSize;
        }
        
        console.log(`Successfully migrated RSI data for ${total} records.`);
        
        // Verify the data migration
        const migratedResult = await db.execute(sql`
          SELECT COUNT(*) as migrated FROM rsi_data
        `);
        
        const migrated = migratedResult[0]?.migrated || 0;
        console.log(`Verified ${migrated} records in rsi_data table.`);
      }
      
      // Step 3: Drop the RSI columns from historical_prices
      console.log('Dropping RSI columns from historical_prices...');
      await db.execute(sql`
        ALTER TABLE historical_prices 
        DROP COLUMN IF EXISTS rsi_9,
        DROP COLUMN IF EXISTS rsi_14,
        DROP COLUMN IF EXISTS rsi_21
      `);
      
      console.log('Successfully dropped RSI columns from historical_prices.');
    } else {
      console.log('No RSI columns found in historical_prices table. This may happen if a previous migration already completed.');
    }
    
    console.log('RSI data migration completed successfully!');
  } catch (error) {
    console.error('Error during RSI data migration:', error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

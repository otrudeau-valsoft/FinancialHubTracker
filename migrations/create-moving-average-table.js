/**
 * Migration to create the Moving Average data table
 * 
 * This script creates a new table for storing Moving Average (MA)
 * indicator values for historical prices.
 */

import { db } from '../server/db.js';

// If db import fails, use direct PostgreSQL connection
if (!db) {
  console.warn('Direct db import failed, trying alternative connection method');
  // This section will be hit if the import fails
}
import { sql } from 'drizzle-orm';

/**
 * Run the migration to create the moving_average_data table
 */
async function runMigration() {
  console.log('Creating moving_average_data table...');

  try {
    // Create the moving_average_data table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "moving_average_data" (
        "id" SERIAL PRIMARY KEY,
        "symbol" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "ma50" TEXT NOT NULL,
        "ma200" TEXT NOT NULL,
        "historical_price_id" INTEGER,
        "region" TEXT NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Add unique index on symbol, date, and region
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "moving_avg_symbol_date_unique" 
      ON "moving_average_data" ("symbol", "date", "region");
    `);

    // Add unique index on historical_price_id
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "moving_average_data_historical_price_id_key" 
      ON "moving_average_data" ("historical_price_id");
    `);

    // Add index on symbol, date, and region for faster lookups
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "moving_average_data_symbol_date_region_key" 
      ON "moving_average_data" ("symbol", "date", "region");
    `);

    console.log('Successfully created moving_average_data table and indexes.');
  } catch (error) {
    console.error('Error creating moving_average_data table:', error);
    throw error;
  }
}

// Execute the migration when this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };
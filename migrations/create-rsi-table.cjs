/**
 * Migration script to create the RSI data table
 * Run with: node migrations/create-rsi-table.js
 */

// Use CommonJS for simpler compatibility
const { Pool } = require('pg');

// Setup database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createRsiTable() {
  const client = await pool.connect();
  
  try {
    console.log('Starting RSI table creation...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rsi_data'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('RSI data table already exists, skipping creation.');
    } else {
      console.log('Creating rsi_data table...');
      
      // Create the RSI data table
      await client.query(`
        CREATE TABLE IF NOT EXISTS "rsi_data" (
          "id" SERIAL PRIMARY KEY,
          "historical_price_id" INTEGER NOT NULL,
          "symbol" TEXT NOT NULL,
          "date" DATE NOT NULL,
          "region" TEXT NOT NULL,
          "rsi_9" NUMERIC,
          "rsi_14" NUMERIC,
          "rsi_21" NUMERIC,
          "updated_at" TIMESTAMP DEFAULT NOW(),
          CONSTRAINT "rsi_data_historical_price_id_key" UNIQUE ("historical_price_id"),
          CONSTRAINT "rsi_data_symbol_date_region_key" UNIQUE ("symbol", "date", "region"),
          FOREIGN KEY ("historical_price_id") REFERENCES "historical_prices"("id") ON DELETE CASCADE
        );
      `);
      
      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS "rsi_data_symbol_region_idx" ON "rsi_data" ("symbol", "region");
        CREATE INDEX IF NOT EXISTS "rsi_data_date_idx" ON "rsi_data" ("date");
      `);
      
      console.log('RSI data table created successfully with indexes.');
    }
    
    // Check if historical_prices has RSI columns
    const rsiColumnsCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'historical_prices'
      AND column_name IN ('rsi_9', 'rsi_14', 'rsi_21');
    `);
    
    const hasRsiColumns = parseInt(rsiColumnsCheck.rows[0].count) > 0;
    
    if (hasRsiColumns) {
      console.log('Found RSI columns in historical_prices table, will migrate data and remove columns.');
      
      // Count records with RSI data
      const dataCountResult = await client.query(`
        SELECT COUNT(*) as count
        FROM historical_prices
        WHERE rsi_9 IS NOT NULL OR rsi_14 IS NOT NULL OR rsi_21 IS NOT NULL;
      `);
      
      const dataCount = parseInt(dataCountResult.rows[0].count);
      console.log(`Found ${dataCount} price records with RSI data to migrate.`);
      
      if (dataCount > 0) {
        // Migrate data in batches
        const batchSize = 5000;
        let processed = 0;
        
        while (processed < dataCount) {
          console.log(`Processing RSI data batch ${Math.floor(processed/batchSize) + 1} of ${Math.ceil(dataCount/batchSize)}`);
          
          await client.query(`
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
            LIMIT $1
            OFFSET $2
            ON CONFLICT (historical_price_id) DO UPDATE SET
              rsi_9 = EXCLUDED.rsi_9,
              rsi_14 = EXCLUDED.rsi_14,
              rsi_21 = EXCLUDED.rsi_21,
              updated_at = NOW()
          `, [batchSize, processed]);
          
          processed += batchSize;
        }
        
        // Verify migration
        const verifyResult = await client.query(`
          SELECT COUNT(*) as count FROM rsi_data;
        `);
        
        console.log(`Migrated ${verifyResult.rows[0].count} RSI data records.`);
        
        // Drop RSI columns from historical_prices
        await client.query(`
          ALTER TABLE historical_prices 
          DROP COLUMN IF EXISTS rsi_9,
          DROP COLUMN IF EXISTS rsi_14,
          DROP COLUMN IF EXISTS rsi_21;
        `);
        
        console.log('Dropped RSI columns from historical_prices table.');
      } else {
        console.log('No RSI data to migrate.');
      }
    } else {
      console.log('No RSI columns found in historical_prices table, no data migration needed.');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Run the migration
createRsiTable()
  .then(() => {
    console.log('RSI table migration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed with error:', error);
    process.exit(1);
  });
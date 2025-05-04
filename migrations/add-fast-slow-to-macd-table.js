/**
 * Migration to add fast and slow EMA columns to macd_data table
 * This will provide better MACD calculation display with separate lines for
 * the fast EMA (12-period) and slow EMA (26-period) components
 */
const { sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

/**
 * Execute the migration
 */
async function runMigration() {
  console.log('Starting migration: Adding fast and slow columns to macd_data table');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Check if the columns already exist
    const columnCheckResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'macd_data' 
      AND column_name IN ('fast', 'slow')
    `);
    
    // If both columns already exist, skip migration
    if (columnCheckResult.length === 2) {
      console.log('Columns already exist, skipping migration');
      await pool.end();
      return;
    }
    
    // Add the new columns
    await db.execute(sql`
      ALTER TABLE macd_data 
      ADD COLUMN IF NOT EXISTS fast NUMERIC,
      ADD COLUMN IF NOT EXISTS slow NUMERIC
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = { runMigration };
}
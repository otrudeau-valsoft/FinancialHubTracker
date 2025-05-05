import pg from 'pg';
import { WebSocket } from 'ws';

// Setup WebSocket for neon
const setupOptions = {
  connectionString: process.env.DATABASE_URL,
};

async function truncateMacdData() {
  const { Client } = pg;
  const client = new Client(setupOptions);

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Truncate the table
    await client.query('TRUNCATE TABLE macd_data');
    console.log('Successfully truncated macd_data table');
    
    // Verify no data remains
    const { rows } = await client.query('SELECT COUNT(*) FROM macd_data');
    console.log(`Remaining rows in macd_data: ${rows[0].count}`);
    
    // Verify columns we expect are present (or add them)
    console.log('Verifying and updating schema...');
    const { rows: columns } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'macd_data'
      ORDER BY column_name
    `);
    
    console.log('Existing columns:', columns.map(c => c.column_name));
    
    // Check for fast, slow, histogram columns
    const expectedColumns = ['fast', 'slow', 'histogram'];
    for (const column of expectedColumns) {
      const { rows: colCheck } = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'macd_data'
        AND column_name = $1
      `, [column]);
      
      if (colCheck.length === 0) {
        console.log(`Adding missing column: ${column}`);
        await client.query(`
          ALTER TABLE macd_data
          ADD COLUMN ${column} NUMERIC
        `);
      }
    }
    
    // Add comments to document columns
    await client.query(`
      COMMENT ON COLUMN macd_data.fast IS 'Fast EMA (12-period)';
      COMMENT ON COLUMN macd_data.slow IS 'Slow EMA (26-period)';
      COMMENT ON COLUMN macd_data.histogram IS 'Histogram (Fast - Slow)';
    `);
    
    console.log('Schema updated successfully');
  } catch (error) {
    console.error('Error executing truncate or schema update:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

truncateMacdData();

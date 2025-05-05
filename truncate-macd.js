const { Client } = require('pg');

async function truncateMacdData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Truncate the table
    await client.query('TRUNCATE TABLE macd_data');
    console.log('Successfully truncated macd_data table');
    
    // Verify no data remains
    const { rows } = await client.query('SELECT COUNT(*) FROM macd_data');
    console.log(`Remaining rows in macd_data: ${rows[0].count}`);
  } catch (error) {
    console.error('Error executing truncate:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

truncateMacdData();

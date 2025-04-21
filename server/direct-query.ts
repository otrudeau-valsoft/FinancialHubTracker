import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Direct query tester for historical prices
 */
export async function getHistoricalPricesDirect(symbol: string, region: string) {
  console.log(`Running direct query for ${symbol} in ${region}`);
  
  try {
    const result = await db.execute(sql`
      SELECT * FROM historical_prices 
      WHERE symbol = ${symbol} AND region = ${region}
      ORDER BY date DESC
    `);
    
    console.log(`Direct query found ${result.rows.length} records`);
    return result.rows;
  } catch (error) {
    console.error('Direct query error:', error);
    return [];
  }
}
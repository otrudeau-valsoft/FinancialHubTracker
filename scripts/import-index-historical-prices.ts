/**
 * Market Index Historical Price Import Script
 * 
 * This script imports historical price data for market indices (SPY, XIC.TO, ACWX)
 * from Yahoo Finance. It ensures we have price data for charting purposes.
 * 
 * Unlike other historical price scripts, this one focuses specifically on getting
 * 5 years of daily data for our benchmark ETFs to ensure performance chart accuracy.
 */

import { historicalPrices as historicalPrice, dataUpdateLogs } from '../shared/schema';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as yahooFinance from 'yahoo-finance2';

// ETF benchmark mapping
const BENCHMARK_ETFS = [
  { symbol: 'SPY', region: 'USD', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'XIC.TO', region: 'CAD', name: 'iShares Core S&P/TSX Capped Composite Index ETF' },
  { symbol: 'ACWX', region: 'INTL', name: 'iShares MSCI ACWI ex U.S. ETF' }
];

/**
 * Log an update to the console
 */
function logUpdate(message: string) {
  console.log(message);
}

/**
 * Import historical price data for a market index
 */
async function importHistoricalPrices(symbol: string, region: string) {
  logUpdate(`Importing 5-year historical prices for ${symbol} (${region})`);
  
  try {
    // Calculate date range (5 years from today)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    logUpdate(`Date range: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
    
    // Fetch historical data from Yahoo Finance
    const historicalData = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d' // Daily data
    });
    
    logUpdate(`Fetched ${historicalData.length} historical prices for ${symbol}`);
    
    // First delete any existing data for this symbol and region to avoid duplicates
    await db.delete(historicalPrice)
      .where(sql`${historicalPrice.symbol} = ${symbol} AND ${historicalPrice.region} = ${region}`);
    
    // Prepare batch insert
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < historicalData.length; i += batchSize) {
      const batch = historicalData.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    // Process each batch
    let insertedCount = 0;
    
    for (const [index, batch] of batches.entries()) {
      logUpdate(`Processing batch ${index + 1}/${batches.length} for ${symbol}`);
      
      const values = batch.map(record => ({
        symbol,
        region,
        date: record.date.toISOString().split('T')[0],
        open: record.open.toString(),
        high: record.high.toString(),
        low: record.low.toString(),
        close: record.close.toString(),
        volume: record.volume.toString(),
        adjustedClose: record.adjClose.toString()
      }));
      
      await db.insert(historicalPrice).values(values);
      insertedCount += values.length;
    }
    
    // Log completion
    logUpdate(`Successfully imported ${insertedCount} historical prices for ${symbol} (${region})`);
    
    // Add to data update logs
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Historical Prices',
      status: 'Success',
      details: `Imported ${insertedCount} historical prices for ${symbol} (${region})`,
      timestamp: new Date()
    });
    
    return {
      symbol,
      region,
      count: insertedCount,
      success: true
    };
  } catch (error) {
    console.error(`Error importing historical prices for ${symbol}:`, error);
    
    // Add to data update logs
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Historical Prices',
      status: 'Error',
      details: `Error importing historical prices for ${symbol} (${region}): ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    });
    
    return {
      symbol,
      region,
      error: error instanceof Error ? error.message : String(error),
      success: false
    };
  }
}

/**
 * Import current price data for a market index
 */
async function importCurrentPrice(symbol: string, region: string, name: string) {
  logUpdate(`Importing current price for ${symbol} (${region})`);
  
  try {
    // Fetch quote data from Yahoo Finance
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote) {
      throw new Error(`No quote data found for ${symbol}`);
    }
    
    // Add to data update logs
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Current Prices',
      status: 'Success',
      details: `Updated current price for ${symbol} (${region}): ${quote.regularMarketPrice}`,
      timestamp: new Date()
    });
    
    return {
      symbol,
      region,
      price: quote.regularMarketPrice,
      success: true
    };
  } catch (error) {
    console.error(`Error importing current price for ${symbol}:`, error);
    
    // Add to data update logs
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Current Prices',
      status: 'Error',
      details: `Error importing current price for ${symbol} (${region}): ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    });
    
    return {
      symbol,
      region,
      error: error instanceof Error ? error.message : String(error),
      success: false
    };
  }
}

/**
 * Main function
 */
async function main() {
  try {
    logUpdate('Starting benchmark ETF historical price import...');
    
    // Import historical prices for all benchmark ETFs
    const results = [];
    
    for (const etf of BENCHMARK_ETFS) {
      logUpdate(`Processing benchmark ETF: ${etf.symbol} (${etf.region})`);
      
      const result = await importHistoricalPrices(etf.symbol, etf.region);
      results.push(result);
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Also update current price while we're at it
      const currentPriceResult = await importCurrentPrice(etf.symbol, etf.region, etf.name);
      results.push(currentPriceResult);
      
      // Wait a bit between ETFs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logUpdate('Benchmark ETF historical price import completed');
    console.log('Results:', results);
    
    // Add summary to logs
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Import',
      status: errorCount === 0 ? 'Success' : 'Error',
      details: `Completed with ${successCount} successes and ${errorCount} errors`,
      timestamp: new Date()
    });
    
    // Finish
    await db.$client.end();
    
    if (errorCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Unhandled error in benchmark ETF import:', error);
    
    // Log error
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Import',
      status: 'Error',
      details: `Unhandled error: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    });
    
    // Finish
    await db.$client.end();
    process.exit(1);
  }
}

// Execute the main function
main();
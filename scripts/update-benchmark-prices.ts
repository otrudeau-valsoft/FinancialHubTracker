/**
 * Benchmark ETF Historical Price Update Script
 * 
 * This script focuses on updating the historical price data for the three benchmark ETFs:
 * SPY (S&P 500) for USD portfolio
 * XIC.TO (iShares Core S&P/TSX Capped) for CAD portfolio
 * ACWX (iShares MSCI ACWI ex U.S.) for INTL portfolio
 * 
 * This data is critical for the performance chart to work properly.
 */

import { historicalPriceService } from '../server/services/historical-price-service';
import { db } from '../server/db';
import { dataUpdateLogs } from '../shared/schema';

/**
 * Log update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', message: string, details: string | null = null) {
  try {
    await db.insert(dataUpdateLogs).values({
      type,
      status,
      details,
      timestamp: new Date(),
    });
    console.log(`Log: [${status}] ${type} - ${message}`);
  } catch (error) {
    console.error('Error logging update:', error);
  }
}

/**
 * Update historical prices specifically for benchmark ETFs
 */
async function updateBenchmarkETFPrices() {
  console.log('Starting update of benchmark ETF historical prices...');
  
  try {
    // Log the start of the update
    await logUpdate(
      'Benchmark ETF Historical Prices',
      'In Progress',
      'Starting update of benchmark ETF historical prices'
    );

    // Fetch and update benchmark prices
    const benchmarkResults = await historicalPriceService.updateBenchmarkHistoricalPrices();
    
    // Count successes and failures
    const successCount = benchmarkResults.filter(r => r.success).length;
    const errorCount = benchmarkResults.filter(r => !r.success).length;
    
    // Log the result
    if (errorCount === 0) {
      await logUpdate(
        'Benchmark ETF Historical Prices',
        'Success',
        `Successfully updated historical prices for ${successCount} benchmark ETFs`,
        JSON.stringify(benchmarkResults)
      );
    } else {
      await logUpdate(
        'Benchmark ETF Historical Prices',
        'Error',
        `Updated ${successCount} benchmark ETFs with ${errorCount} errors`,
        JSON.stringify(benchmarkResults)
      );
    }
    
    return benchmarkResults;
  } catch (error) {
    console.error('Error updating benchmark ETF historical prices:', error);
    
    // Log error
    await logUpdate(
      'Benchmark ETF Historical Prices',
      'Error',
      `Error updating benchmark ETF historical prices: ${error instanceof Error ? error.message : String(error)}`
    );
    
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting benchmark ETF historical price update script...');
    
    // Update benchmark ETF historical prices
    const benchmarkResults = await updateBenchmarkETFPrices();
    
    console.log('Benchmark ETF update results:', benchmarkResults);
    
    // Close database connection
    await db.$client.end();
    
    console.log('Benchmark ETF historical price update script completed successfully');
  } catch (error) {
    console.error('Error updating benchmark ETF historical prices:', error);
    
    // Log error
    await logUpdate(
      'Benchmark ETF Historical Prices',
      'Error',
      `Error updating benchmark ETF historical prices: ${error instanceof Error ? error.message : String(error)}`
    );
    
    // Close database connection
    await db.$client.end();
    
    process.exit(1);
  }
}

// Run the main function
main();
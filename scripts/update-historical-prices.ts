/**
 * Historical Price Update Script
 * 
 * This script ensures that we have 5 years of daily price data for all stocks in our portfolios.
 * It runs the historical price update service and logs the results.
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
 * Main function to update all historical prices
 */
async function main() {
  try {
    // Log start
    await logUpdate('Historical Prices', 'In Progress', 'Starting 5-year historical price update for all stocks');
    
    console.log('Starting 5-year historical price update for all portfolios');
    
    // Set up options to ensure we fetch 5 years of data
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    // Update all historical prices
    const results = await historicalPriceService.updateAllHistoricalPrices();
    
    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;
    
    // Log completion
    await logUpdate(
      'Historical Prices',
      failures > 0 ? 'Error' : 'Success',
      `Completed 5-year historical price update: ${successes} succeeded, ${failures} failed`
    );
    
    console.log(`Historical price update completed: ${successes} succeeded, ${failures} failed`);
    
    // Log specific failures
    const failureSymbols = results.filter(r => !r.success).map(r => r.symbol);
    if (failureSymbols.length > 0) {
      console.log(`Failed to update historical prices for: ${failureSymbols.join(', ')}`);
      await logUpdate(
        'Historical Prices',
        'Error',
        `Failed to update historical prices for: ${failureSymbols.join(', ')}`
      );
    }
    
    // Close database connection
    await db.$client.end();
    
    console.log('Historical price update script completed successfully');
  } catch (error) {
    console.error('Error updating historical prices:', error);
    
    // Log error
    await logUpdate(
      'Historical Prices',
      'Error',
      `Error updating historical prices: ${error instanceof Error ? error.message : String(error)}`
    );
    
    // Close database connection
    await db.$client.end();
    
    process.exit(1);
  }
}

// Run the main function
main();
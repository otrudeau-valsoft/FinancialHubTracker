import * as yahooFinance from 'yahoo-finance2';
import { db } from '../server/db';
import { upgradeDowngradeHistory } from '../shared/schema';
import { getDatabase } from '../server/app';
import { eq } from 'drizzle-orm';

/**
 * Import upgrade/downgrade history for a specific ticker
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 */
async function importUpgradeDowngradeHistory(symbol: string, region: string): Promise<void> {
  try {
    console.log(`Fetching upgrade/downgrade history for ${symbol} in ${region} region...`);
    
    // Adjust symbol for Yahoo Finance based on region (Canadian stocks need .TO suffix)
    const yahooSymbol = region === 'CAD' ? `${symbol}.TO` : symbol;
    
    // Get upgrade/downgrade history from Yahoo Finance
    const result = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ['upgradeDowngradeHistory']
    });
    
    // Check if we have upgrade/downgrade history data
    if (!result.upgradeDowngradeHistory || !result.upgradeDowngradeHistory.history || result.upgradeDowngradeHistory.history.length === 0) {
      console.log(`No upgrade/downgrade history found for ${symbol}`);
      return;
    }
    
    // Get history items
    const history = result.upgradeDowngradeHistory.history;
    console.log(`Found ${history.length} upgrade/downgrade history items for ${symbol}`);
    
    // Delete existing records for this symbol in this region
    await db.delete(upgradeDowngradeHistory)
      .where(
        eq(upgradeDowngradeHistory.symbol, symbol)
      )
      .where(
        eq(upgradeDowngradeHistory.region, region)
      );
    
    // Process each history item
    for (const item of history) {
      // Convert epoch to date if available
      let gradeDate = null;
      if (item.epochGradeDate) {
        gradeDate = new Date(item.epochGradeDate * 1000);
      }
      
      // Insert into database
      await db.insert(upgradeDowngradeHistory).values({
        symbol: symbol,
        region: region,
        firm: item.firm || 'Unknown',
        toGrade: item.toGrade || 'Unknown',
        fromGrade: item.fromGrade || null,
        action: item.action || 'Unknown',
        epochGradeDate: item.epochGradeDate || null,
        gradeDate: gradeDate,
      });
    }
    
    console.log(`Successfully imported ${history.length} upgrade/downgrade history items for ${symbol}`);
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize database
    await getDatabase();
    
    // Start with a single stock from USD region - AAPL
    await importUpgradeDowngradeHistory('AAPL', 'USD');
    
    console.log('Import completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
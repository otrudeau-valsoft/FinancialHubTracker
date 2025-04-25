import yahooFinance from 'yahoo-finance2';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../server/db';
import { upgradeDowngradeHistory } from '../shared/schema';

/**
 * Import upgrade/downgrade history for a specific ticker
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 */
export async function importUpgradeDowngradeHistory(symbol: string, region: string): Promise<void> {
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
        and(
          eq(upgradeDowngradeHistory.symbol, symbol),
          eq(upgradeDowngradeHistory.region, region)
        )
      );
    
    // Process each history item
    for (const item of history) {
      // Convert epoch to date if available
      let gradeDate = null;
      if (item.epochGradeDate) {
        // Yahoo Finance returns epochGradeDate in milliseconds, not seconds
        // We need to handle this correctly to prevent date conversion issues
        try {
          // First save the epoch as a string to avoid integer overflow
          const epochString = item.epochGradeDate.toString();
          
          // Parse the date properly based on the format
          // Most timestamps will be in milliseconds, but checking in case
          const epoch = item.epochGradeDate > 10000000000 
            ? item.epochGradeDate // already in milliseconds
            : item.epochGradeDate * 1000; // convert seconds to milliseconds
            
          gradeDate = new Date(epoch);
          
          // Sanity check - if date is far in the future or past, set to null
          const currentYear = new Date().getFullYear();
          if (gradeDate.getFullYear() > currentYear + 10 || gradeDate.getFullYear() < 1990) {
            console.warn(`Invalid date detected for ${symbol}: ${gradeDate.toISOString()}`);
            gradeDate = null;
          }
        } catch (e) {
          console.warn(`Error converting date for ${symbol}:`, e);
          gradeDate = null;
        }
      }
      
      // Insert into database
      await db.insert(upgradeDowngradeHistory).values({
        symbol: symbol,
        region: region,
        firm: item.firm || 'Unknown',
        toGrade: item.toGrade || 'Unknown',
        fromGrade: item.fromGrade || null,
        action: item.action || 'Unknown',
        epochGradeDate: item.epochGradeDate ? item.epochGradeDate.toString() : null, // Store as string
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
 * Import upgrade/downgrade history for all stocks in a specific region
 * @param region Portfolio region (USD, CAD, INTL)
 */
export async function importRegionUpgradeDowngradeHistory(region: string): Promise<{
  success: number;
  failures: number;
  totalSymbols: number;
}> {
  try {
    console.log(`Fetching symbols for ${region} region...`);
    
    // Determine which table to query based on region
    let tableName = '';
    if (region === 'USD') {
      tableName = 'assets_us';
    } else if (region === 'CAD') {
      tableName = 'assets_cad';
    } else if (region === 'INTL') {
      tableName = 'assets_intl';
    } else {
      throw new Error(`Invalid region: ${region}`);
    }
    
    // Get all symbols for this region
    const symbols = await db.execute(
      sql`SELECT symbol FROM ${sql.identifier(tableName)} ORDER BY symbol`
    );
    
    console.log(`Found ${symbols.length} symbols in ${region} region`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process each symbol with a delay to avoid rate limiting
    for (const row of symbols) {
      const symbol = row.symbol;
      try {
        await importUpgradeDowngradeHistory(symbol, region);
        successCount++;
        
        // Add a small delay to avoid overwhelming the Yahoo Finance API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to import upgrade/downgrade history for ${symbol}:`, error);
        failureCount++;
      }
    }
    
    console.log(`Completed import for ${region} region: ${successCount} successful, ${failureCount} failed`);
    
    return {
      success: successCount,
      failures: failureCount,
      totalSymbols: symbols.length
    };
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${region} region:`, error);
    throw error;
  }
}

/**
 * Main function for running as a script
 */
async function main() {
  try {
    // Start with a single stock from USD region - AAPL
    await importUpgradeDowngradeHistory('AAPL', 'USD');
    
    console.log('Import completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
// For ESM, we can't use require.main === module, so we'll skip this check
main().catch(error => {
  console.error("Error in main:", error);
});
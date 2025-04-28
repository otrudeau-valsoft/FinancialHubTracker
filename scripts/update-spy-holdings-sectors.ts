/**
 * Update SPY Holdings Sectors Script
 * 
 * This script fetches sector information for SPY holdings from Yahoo Finance
 * and updates the database with the sector data.
 */
import { db } from '../server/db';
import { eq } from 'drizzle-orm';
import { etfHoldings } from '../shared/schema';
import yahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';

dotenv.config();

// Sleep function to avoid rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Log an update to the console
 */
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Get all SPY holdings that need sector information
 */
async function getSPYHoldingsWithoutSectors() {
  try {
    const holdings = await db
      .select({
        id: etfHoldings.id,
        ticker: etfHoldings.ticker,
        name: etfHoldings.name,
        etfSymbol: etfHoldings.etfSymbol,
        sector: etfHoldings.sector
      })
      .from(etfHoldings)
      .where(eq(etfHoldings.etfSymbol, 'SPY'));
    
    // Filter to include only holdings without sector information
    return holdings.filter(holding => !holding.sector || holding.sector === null);
  } catch (error) {
    console.error('Error fetching SPY holdings:', error);
    return [];
  }
}

/**
 * Fetch sector information from Yahoo Finance
 */
async function fetchSectorInfo(ticker: string): Promise<string | null> {
  try {
    // Add proper US exchange suffix if not present
    const formattedTicker = ticker.includes(':') ? ticker : `${ticker}`;
    
    // Get quote summary from Yahoo Finance
    const result = await yahooFinance.quoteSummary(formattedTicker, {
      modules: ['assetProfile']
    });
    
    if (result && result.assetProfile && result.assetProfile.sector) {
      return result.assetProfile.sector;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching sector info for ${ticker}:`, error);
    return null;
  }
}

/**
 * Update sector information for a single holding
 */
async function updateHoldingSector(holding: { id: number; ticker: string; name: string }) {
  try {
    const sector = await fetchSectorInfo(holding.ticker);
    
    if (sector) {
      await db
        .update(etfHoldings)
        .set({
          sector: sector,
          updatedAt: new Date()
        })
        .where(eq(etfHoldings.id, holding.id));
      
      logProgress(`✅ Updated sector for ${holding.ticker} (${holding.name}): ${sector}`);
      return true;
    } else {
      logProgress(`⚠️ Could not find sector for ${holding.ticker} (${holding.name})`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating sector for ${holding.ticker}:`, error);
    return false;
  }
}

/**
 * Main function to update all SPY holdings sectors
 */
async function main() {
  try {
    logProgress('Starting SPY holdings sector update...');
    
    const holdingsWithoutSectors = await getSPYHoldingsWithoutSectors();
    logProgress(`Found ${holdingsWithoutSectors.length} SPY holdings without sector information`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process holdings in batches to avoid rate limiting
    for (let i = 0; i < holdingsWithoutSectors.length; i++) {
      const holding = holdingsWithoutSectors[i];
      
      // Update progress every 10 holdings
      if (i > 0 && i % 10 === 0) {
        logProgress(`Progress: ${i}/${holdingsWithoutSectors.length} (${Math.round(i / holdingsWithoutSectors.length * 100)}%)`);
      }
      
      const success = await updateHoldingSector(holding);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Sleep between requests to avoid rate limiting
      await sleep(1000);
    }
    
    logProgress(`Completed SPY holdings sector update!`);
    logProgress(`Results: ${successCount} successes, ${failureCount} failures out of ${holdingsWithoutSectors.length} total`);
    
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    process.exit(0);
  }
}

// Execute the main function
main();
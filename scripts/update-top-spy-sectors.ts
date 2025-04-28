/**
 * Update Top SPY Holdings Sectors Script
 * 
 * This script fetches sector information for the top SPY holdings from Yahoo Finance
 * and updates the database with the sector data.
 */
import { db } from '../server/db';
import { eq, desc, isNull } from 'drizzle-orm';
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
 * Get top SPY holdings that need sector information, ordered by weight
 */
async function getTopSPYHoldings(limit: number = 50) {
  try {
    const holdings = await db
      .select({
        id: etfHoldings.id,
        ticker: etfHoldings.ticker,
        name: etfHoldings.name,
        weight: etfHoldings.weight,
        etfSymbol: etfHoldings.etfSymbol,
        sector: etfHoldings.sector
      })
      .from(etfHoldings)
      .where(eq(etfHoldings.etfSymbol, 'SPY'))
      .orderBy(desc(etfHoldings.weight))
      .limit(limit);
    
    // Filter to include only holdings without sector information
    return holdings.filter(holding => !holding.sector || holding.sector === null);
  } catch (error) {
    console.error('Error fetching top SPY holdings:', error);
    return [];
  }
}

/**
 * Fetch sector information from Yahoo Finance
 */
async function fetchSectorInfo(ticker: string): Promise<string | null> {
  try {
    // Get quote summary from Yahoo Finance
    const result = await yahooFinance.quoteSummary(ticker, {
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
async function updateHoldingSector(holding: { id: number; ticker: string; name: string; weight: number | null }) {
  try {
    logProgress(`Fetching sector for ${holding.ticker} (${holding.name}), weight: ${holding.weight?.toFixed(2)}%`);
    const sector = await fetchSectorInfo(holding.ticker);
    
    if (sector) {
      await db
        .update(etfHoldings)
        .set({
          sector: sector,
          updatedAt: new Date()
        })
        .where(eq(etfHoldings.id, holding.id));
      
      logProgress(`✅ Updated sector for ${holding.ticker}: ${sector}`);
      return true;
    } else {
      logProgress(`⚠️ Could not find sector for ${holding.ticker}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating sector for ${holding.ticker}:`, error);
    return false;
  }
}

/**
 * Main function to update top SPY holdings sectors
 */
async function main() {
  try {
    const TOP_HOLDINGS_LIMIT = 50; // Update top 50 holdings by weight
    
    logProgress(`Starting update for top ${TOP_HOLDINGS_LIMIT} SPY holdings sectors...`);
    
    const topHoldings = await getTopSPYHoldings(TOP_HOLDINGS_LIMIT);
    logProgress(`Found ${topHoldings.length} SPY top holdings without sector information`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process holdings
    for (let i = 0; i < topHoldings.length; i++) {
      const holding = topHoldings[i];
      
      const success = await updateHoldingSector(holding);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Sleep between requests to avoid rate limiting
      await sleep(1000);
    }
    
    logProgress(`Completed updating sectors for top SPY holdings!`);
    logProgress(`Results: ${successCount} successes, ${failureCount} failures out of ${topHoldings.length} total`);
    
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    process.exit(0);
  }
}

// Execute the main function
main();
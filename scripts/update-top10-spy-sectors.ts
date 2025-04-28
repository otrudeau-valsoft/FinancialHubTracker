/**
 * Update Top 10 SPY Holdings Sectors Script
 * 
 * This script fetches sector information for just the top 10 SPY holdings from Yahoo Finance
 * and updates the database with the sector data. This is specifically for the ETF holdings
 * comparison table that displays the top 10 holdings by weight.
 */
import { db } from '../server/db';
import { eq, desc, isNull } from 'drizzle-orm';
import { etfHoldings } from '../shared/schema';
import yahooFinance from 'yahoo-finance2';

// Common sector mappings for major companies
const KNOWN_SECTORS: Record<string, string> = {
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'AMZN': 'Consumer Cyclical',
  'NVDA': 'Technology',
  'GOOGL': 'Communication Services',
  'GOOG': 'Communication Services',
  'META': 'Communication Services',
  'BRK.B': 'Financial Services',
  'UNH': 'Healthcare',
  'LLY': 'Healthcare',
  'JPM': 'Financial Services',
  'XOM': 'Energy',
  'V': 'Financial Services',
  'PG': 'Consumer Defensive',
  'MA': 'Financial Services',
  'AVGO': 'Technology',
  'TSLA': 'Consumer Cyclical',
  'HD': 'Consumer Cyclical',
  'CVX': 'Energy',
  'MRK': 'Healthcare',
  'COST': 'Consumer Defensive',
  'ABBV': 'Healthcare',
  'PEP': 'Consumer Defensive',
  'KO': 'Consumer Defensive',
  'WMT': 'Consumer Defensive',
};

/**
 * Log an update to the console
 */
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Get only the top 10 SPY holdings
 */
async function getTop10SPYHoldings() {
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
      .limit(10);
    
    return holdings;
  } catch (error) {
    console.error('Error fetching top 10 SPY holdings:', error);
    return [];
  }
}

/**
 * Fetch sector information from Yahoo Finance
 */
async function fetchSectorInfo(ticker: string): Promise<string | null> {
  // First check our known sectors mapping for faster results
  if (KNOWN_SECTORS[ticker]) {
    return KNOWN_SECTORS[ticker];
  }
  
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
    // Skip if sector already exists
    if (holding.sector) {
      logProgress(`Skipping ${holding.ticker} (${holding.name}): sector already exists (${holding.sector})`);
      return true;
    }
    
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
 * Main function to update top 10 SPY holdings sectors
 */
async function main() {
  try {
    logProgress('Starting update for top 10 SPY holdings sectors...');
    
    const top10Holdings = await getTop10SPYHoldings();
    logProgress(`Found ${top10Holdings.length} SPY holdings in top 10`);
    
    let successCount = 0;
    let failureCount = 0;
    
    // Process holdings
    for (const holding of top10Holdings) {
      const success = await updateHoldingSector(holding);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    logProgress(`Completed updating sectors for top 10 SPY holdings!`);
    logProgress(`Results: ${successCount} successes, ${failureCount} failures out of ${top10Holdings.length} total`);
    
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    process.exit(0);
  }
}

// Execute the main function
main();
/**
 * Market Indices Update Script
 * 
 * This script updates the market_indices table with the latest data
 * including current prices, daily changes, and YTD performance.
 * Run this daily to keep benchmark data current.
 */

import { db } from '../server/db.js';
import { marketIndices, dataUpdateLogs } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { createAdaptedDataUpdateLog } from '../server/adapters/data-management-adapter.js';
import yahooFinance from 'yahoo-finance2';
import { DateTime } from 'luxon';

// Index definitions
const INDICES = [
  { 
    symbol: 'SPY', 
    name: 'SPDR S&P 500 ETF Trust',
    region: 'USD',
    displaySymbol: 'S&P500',
  },
  { 
    symbol: 'XIC.TO', 
    name: 'iShares Core S&P/TSX Capped Composite Index ETF',
    region: 'CAD',
    displaySymbol: 'TSX',
  },
  { 
    symbol: 'ACWX', 
    name: 'iShares MSCI ACWI ex U.S. ETF',
    region: 'INTL',
    displaySymbol: 'ACWX',
  }
];

/**
 * Calculate YTD performance for indices
 */
async function calculateYTDPerformance() {
  console.log('Calculating YTD performance for indices...');
  
  try {
    const currentYear = new Date().getFullYear();
    const yearStartDate = `${currentYear}-01-01`;
    
    for (const index of INDICES) {
      try {
        // For YTD calculation, get the price at the start of the year and the current price
        const yearToDateOptions = {
          period1: yearStartDate,
          interval: '1d',
        };
        
        const historicalData = await yahooFinance.historical(index.symbol, yearToDateOptions);
        
        if (historicalData && historicalData.length > 0) {
          // First trading day of the year
          const startPrice = historicalData[0].close;
          
          // Latest price - use same-day data if available, otherwise get it
          let currentPrice;
          
          try {
            // Attempt to get real-time quote
            const quote = await yahooFinance.quote(index.symbol);
            currentPrice = quote.regularMarketPrice;
          } catch (error) {
            // Fallback to most recent closing price
            currentPrice = historicalData[historicalData.length - 1].close;
          }
          
          // Calculate YTD change percentage
          const ytdChangePercent = ((currentPrice - startPrice) / startPrice) * 100;
          
          console.log(`${index.symbol} YTD performance: ${ytdChangePercent.toFixed(2)}%`);
          
          // Update the database record
          await db.update(marketIndices)
            .set({
              ytdChangePercent: ytdChangePercent
            })
            .where(eq(marketIndices.symbol, index.symbol));
        }
      } catch (error) {
        console.error(`Error calculating YTD performance for ${index.symbol}:`, error);
      }
    }
    
    console.log('YTD performance calculation completed.');
    return true;
  } catch (error) {
    console.error('Error calculating YTD performance:', error);
    return false;
  }
}

/**
 * Update real-time market indices data
 */
async function updateMarketIndices() {
  try {
    console.log('Updating market indices data...');
    
    // Create a log entry for the update
    const updateLog = await db.insert(dataUpdateLogs)
      .values(createAdaptedDataUpdateLog({
        type: 'market_indices',
        status: 'In Progress',
        message: 'Updating market indices data...',
        region: 'ALL'
      }))
      .returning();
    
    const logId = updateLog[0].id;
    
    const updatePromises = INDICES.map(async (index) => {
      try {
        console.log(`Fetching data for ${index.symbol}...`);
        const quote = await yahooFinance.quote(index.symbol);
        
        // Update the database record
        if (quote) {
          await db.update(marketIndices)
            .set({
              currentPrice: quote.regularMarketPrice,
              dailyChange: quote.regularMarketChange,
              dailyChangePercent: quote.regularMarketChangePercent,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
              updatedAt: new Date()
            })
            .where(eq(marketIndices.symbol, index.symbol));
          
          console.log(`Updated ${index.symbol} data successfully`);
        } else {
          throw new Error(`Failed to fetch quote for ${index.symbol}`);
        }
        
        return { symbol: index.symbol, success: true };
      } catch (error) {
        console.error(`Error updating ${index.symbol}:`, error);
        return { symbol: index.symbol, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.success).length;
    
    // Calculate YTD performance
    await calculateYTDPerformance();
    
    // Update the log entry
    await db.update(dataUpdateLogs)
      .set({
        status: successCount === INDICES.length ? 'Success' : 'Error',
        details: JSON.stringify({
          message: `Updated ${successCount}/${INDICES.length} market indices`,
          results
        })
      })
      .where(eq(dataUpdateLogs.id, logId));
    
    console.log(`Market indices update completed: ${successCount}/${INDICES.length} successful`);
    return true;
  } catch (error) {
    console.error('Error updating market indices:', error);
    
    // Log the error
    if (logId) {
      await db.update(dataUpdateLogs)
        .set({
          status: 'Error',
          details: JSON.stringify({
            error: error.message
          })
        })
        .where(eq(dataUpdateLogs.id, logId));
    }
    
    return false;
  }
}

/**
 * Initialize market indices table with basic data
 */
async function initializeIndicesTable() {
  try {
    console.log('Initializing market indices table...');
    
    const existingIndices = await db.select({ count: sql`count(*)` }).from(marketIndices);
    const count = Number(existingIndices[0]?.count || 0);
    
    if (count === 0) {
      console.log('No indices found in database. Initializing...');
      
      for (const index of INDICES) {
        await db.insert(marketIndices)
          .values({
            symbol: index.symbol,
            name: index.name,
            region: index.region,
            updatedAt: new Date()
          })
          .onConflictDoNothing();
      }
      
      console.log('Market indices initialized successfully.');
    } else {
      console.log(`Found ${count} indices in database. Skipping initialization.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing market indices table:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting market indices update process...');
    
    // Make sure indices exist in the database
    await initializeIndicesTable();
    
    // Update market indices data
    await updateMarketIndices();
    
    console.log('Market indices update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Market indices update failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
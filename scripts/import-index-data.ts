/**
 * Market Indices Import Script
 * 
 * This script imports data for market indices (SPY, XIC, ACWX) into our database.
 * It handles both basic market index information and historical price data.
 */

import { db } from '../server/db';
import { 
  marketIndices, 
  historicalPrices,
  dataUpdateLogs
} from '../shared/schema';
import { createAdaptedDataUpdateLog } from '../server/adapters/data-management-adapter';
import yahooFinance from 'yahoo-finance2';

// Index definitions
const INDICES = [
  { 
    symbol: 'SPY', 
    name: 'SPDR S&P 500 ETF Trust',
    region: 'USD'
  },
  { 
    symbol: 'XIC.TO', 
    name: 'iShares Core S&P/TSX Capped Composite Index ETF',
    region: 'CAD'
  },
  { 
    symbol: 'ACWX', 
    name: 'iShares MSCI ACWI ex U.S. ETF',
    region: 'INTL'
  }
];

/**
 * Log an update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', symbol: string, message: string) {
  try {
    const logEntry = createAdaptedDataUpdateLog(type, status, symbol, message);
    await db.insert(dataUpdateLogs).values(logEntry);
    console.log(`[${status}] ${symbol}: ${message}`);
  } catch (error) {
    console.error('Error logging update:', error);
  }
}

/**
 * Import basic market index data
 */
async function importMarketIndices() {
  console.log('Importing market indices data...');
  await logUpdate('market_indices_import', 'In Progress', 'ALL', 'Starting import of market indices');
  
  try {
    // Clear existing indices data
    await db.delete(marketIndices);
    
    for (const index of INDICES) {
      console.log(`Fetching data for ${index.symbol}...`);
      await logUpdate('market_indices_import', 'In Progress', index.symbol, 'Fetching index data');
      
      try {
        // Fetch current quote from Yahoo Finance
        const quote = await yahooFinance.quote(index.symbol, {});
        
        // Insert into database
        await db.insert(marketIndices).values({
          symbol: index.symbol,
          name: index.name,
          region: index.region,
          currentPrice: quote.regularMarketPrice,
          dailyChange: quote.regularMarketChange,
          dailyChangePercent: quote.regularMarketChangePercent,
          ytdChangePercent: null, // Will be calculated separately
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow
        });
        
        await logUpdate('market_indices_import', 'Success', index.symbol, 'Index data imported successfully');
      } catch (error) {
        console.error(`Error fetching data for ${index.symbol}:`, error);
        await logUpdate('market_indices_import', 'Error', index.symbol, `Import failed: ${(error as Error).message}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Market indices import completed.');
    await logUpdate('market_indices_import', 'Success', 'ALL', 'All indices imported successfully');
    return true;
  } catch (error) {
    console.error('Error importing market indices:', error);
    await logUpdate('market_indices_import', 'Error', 'ALL', `Import failed: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Import historical price data for indices
 */
async function importHistoricalPrices() {
  console.log('Importing historical price data for indices...');
  await logUpdate('historical_prices_import', 'In Progress', 'INDICES', 'Starting import of historical prices');
  
  try {
    const endDate = new Date();
    // Start date 1 year ago
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    for (const index of INDICES) {
      console.log(`Fetching historical data for ${index.symbol}...`);
      await logUpdate('historical_prices_import', 'In Progress', index.symbol, 'Fetching historical data');
      
      try {
        // Delete existing historical prices for this index
        await db.delete(historicalPrices)
          .where('symbol = $1 AND region = $2')
          .prepare()
          .execute([index.symbol, index.region]);
        
        // Fetch historical data from Yahoo Finance
        const historical = await yahooFinance.historical(index.symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        });
        
        if (historical && historical.length > 0) {
          // Map to our database structure
          const priceData = historical.map(item => ({
            symbol: index.symbol,
            date: item.date.toISOString().split('T')[0],
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            adjustedClose: item.adjClose,
            region: index.region
          }));
          
          // Insert historical data in batches to avoid large inserts
          const batchSize = 50;
          for (let i = 0; i < priceData.length; i += batchSize) {
            const batch = priceData.slice(i, i + batchSize);
            await db.insert(historicalPrices).values(batch);
          }
          
          await logUpdate(
            'historical_prices_import', 
            'Success', 
            index.symbol, 
            `Imported ${priceData.length} historical data points`
          );
        } else {
          await logUpdate(
            'historical_prices_import', 
            'Error', 
            index.symbol, 
            'No historical data available'
          );
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${index.symbol}:`, error);
        await logUpdate(
          'historical_prices_import', 
          'Error', 
          index.symbol, 
          `Import failed: ${(error as Error).message}`
        );
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('Historical prices import completed.');
    await logUpdate('historical_prices_import', 'Success', 'INDICES', 'All historical prices imported successfully');
    return true;
  } catch (error) {
    console.error('Error importing historical prices:', error);
    await logUpdate('historical_prices_import', 'Error', 'INDICES', `Import failed: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Calculate YTD performance for indices
 */
async function calculateYTDPerformance() {
  console.log('Calculating YTD performance for indices...');
  
  try {
    const currentYear = new Date().getFullYear();
    const yearStartDate = `${currentYear}-01-01`;
    
    for (const index of INDICES) {
      // Get first price of the year
      const yearStartPrice = await db
        .select()
        .from(historicalPrices)
        .where('symbol = $1 AND region = $2 AND date >= $3')
        .orderBy('date')
        .limit(1)
        .prepare()
        .execute([index.symbol, index.region, yearStartDate]);
      
      // Get most recent price
      const currentPrice = await db
        .select()
        .from(historicalPrices)
        .where('symbol = $1 AND region = $2')
        .orderBy('date', 'desc')
        .limit(1)
        .prepare()
        .execute([index.symbol, index.region]);
      
      if (yearStartPrice.length > 0 && currentPrice.length > 0) {
        const startValue = Number(yearStartPrice[0].close);
        const endValue = Number(currentPrice[0].close);
        const ytdChangePercent = ((endValue - startValue) / startValue) * 100;
        
        // Update the market index record
        await db
          .update(marketIndices)
          .set({ ytdChangePercent })
          .where('symbol = $1 AND region = $2')
          .prepare()
          .execute([index.symbol, index.region]);
        
        console.log(`${index.symbol} YTD performance: ${ytdChangePercent.toFixed(2)}%`);
      } else {
        console.log(`Could not calculate YTD performance for ${index.symbol} - insufficient data`);
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
 * Main function to run all import operations
 */
async function main() {
  console.log('Starting market indices data import...');
  
  try {
    // Import market indices basic data
    const indicesImported = await importMarketIndices();
    
    if (indicesImported) {
      // Import historical prices
      await importHistoricalPrices();
      
      // Calculate YTD performance
      await calculateYTDPerformance();
    }
    
    console.log('Market indices data import completed.');
  } catch (error) {
    console.error('Error in market indices import:', error);
  } finally {
    // Close the database connection
    await db.$pool.end();
    process.exit(0);
  }
}

// Run the main function
main();
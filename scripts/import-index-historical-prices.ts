/**
 * Market Index Historical Price Import Script
 * 
 * This script imports historical price data for market indices (SPY, XIC, ACWX)
 * from Yahoo Finance. It ensures we have price data for charting purposes.
 */

import yahooFinance from 'yahoo-finance2';
import { db } from '../server/db';
import { historicalPrices, currentPrices } from '../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

// List of market indices to import
const MARKET_INDICES = [
  { symbol: 'SPY', region: 'USD', name: 'S&P 500 ETF Trust' },
  { symbol: 'XIC.TO', region: 'CAD', name: 'iShares Core S&P/TSX Capped Composite Index ETF' },
  { symbol: 'ACWX', region: 'INTL', name: 'iShares MSCI ACWI ex U.S. ETF' }
];

/**
 * Log an update to the console
 */
function logUpdate(message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

/**
 * Import historical price data for a market index
 */
async function importHistoricalPrices(symbol: string, region: string) {
  try {
    // Check if we already have data for this index
    const existingPricesResult = await db.select({
      count: sql<string>`count(*)::text`
    })
    .from(historicalPrices)
    .where(
      and(
        eq(historicalPrices.symbol, symbol),
        eq(historicalPrices.region, region)
      )
    );
    
    const count = parseInt(existingPricesResult[0]?.count || '0');
    
    if (count > 0) {
      logUpdate(`${symbol} (${region}): Already have ${count} historical price records`);
      return true;
    }
    
    // Calculate date 5 years ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    // Fetch historical data from Yahoo Finance (5 years)
    logUpdate(`${symbol} (${region}): Fetching 5 years of historical price data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Fetch historical data with explicit interval type
    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d" // Explicit string literal type
    });
    
    if (!result || result.length === 0) {
      logUpdate(`${symbol} (${region}): No historical data found`);
      return false;
    }
    
    logUpdate(`${symbol} (${region}): Retrieved ${result.length} historical price points`);
    
    // Convert to database records
    const priceRecords = result.map(item => ({
      symbol,
      region,
      date: item.date.toISOString().split('T')[0],
      open: item.open?.toString() || null,
      high: item.high?.toString() || null,
      low: item.low?.toString() || null,
      close: item.close?.toString() || null,
      volume: item.volume?.toString() || null,
      adjustedClose: item.adjClose?.toString() || null
    }));
    
    // Insert into database in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < priceRecords.length; i += BATCH_SIZE) {
      const batch = priceRecords.slice(i, i + BATCH_SIZE);
      await db.insert(historicalPrices).values(batch);
      logUpdate(`${symbol} (${region}): Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(priceRecords.length / BATCH_SIZE)}`);
    }
    
    logUpdate(`${symbol} (${region}): Successfully imported ${priceRecords.length} historical price records`);
    return true;
  } catch (error) {
    logUpdate(`ERROR importing ${symbol} (${region}) historical prices: ${error}`);
    return false;
  }
}

/**
 * Import current price data for a market index
 */
async function importCurrentPrice(symbol: string, region: string, name: string) {
  try {
    // Check if we already have current price data
    const existingPrice = await db.select()
      .from(currentPrices)
      .where(
        and(
          eq(currentPrices.symbol, symbol),
          eq(currentPrices.region, region)
        )
      );
    
    // Fetch current price data from Yahoo Finance
    logUpdate(`${symbol} (${region}): Fetching current price data`);
    
    // Using quote
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote) {
      logUpdate(`${symbol} (${region}): No quote data found`);
      return false;
    }
    
    // Prepare current price record with type safety
    const priceRecord = {
      symbol,
      region,
      regularMarketPrice: quote.regularMarketPrice?.toString() || null,
      regularMarketChange: quote.regularMarketChange?.toString() || null,
      regularMarketChangePercent: quote.regularMarketChangePercent?.toString() || null,
      regularMarketVolume: quote.regularMarketVolume?.toString() || null,
      regularMarketDayHigh: quote.regularMarketDayHigh?.toString() || null,
      regularMarketDayLow: quote.regularMarketDayLow?.toString() || null,
      marketCap: quote.marketCap?.toString() || null,
      // These fields might not always be present, use optional chaining and fallbacks
      trailingPE: (quote as any).trailingPE?.toString() || null,
      forwardPE: (quote as any).forwardPE?.toString() || null,
      dividendYield: (quote as any).dividendYield?.toString() || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh?.toString() || null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow?.toString() || null
    };
    
    // Insert or update price data
    if (existingPrice && existingPrice.length > 0) {
      await db.update(currentPrices)
        .set(priceRecord)
        .where(
          and(
            eq(currentPrices.symbol, symbol),
            eq(currentPrices.region, region)
          )
        );
      logUpdate(`${symbol} (${region}): Updated current price data`);
    } else {
      await db.insert(currentPrices).values(priceRecord);
      logUpdate(`${symbol} (${region}): Inserted current price data`);
    }
    
    return true;
  } catch (error) {
    logUpdate(`ERROR importing ${symbol} (${region}) current price: ${error}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  logUpdate('Starting market index data import');
  
  for (const index of MARKET_INDICES) {
    // Import current price first
    await importCurrentPrice(index.symbol, index.region, index.name);
    
    // Import historical prices
    await importHistoricalPrices(index.symbol, index.region);
    
    // Add a delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  logUpdate('Market index data import complete');
}

// Run the main function
main()
  .catch(err => {
    console.error('Error in main function:', err);
    process.exit(1);
  })
  .finally(() => {
    // Give a moment for any final logs to be written
    setTimeout(() => process.exit(0), 1000);
  });
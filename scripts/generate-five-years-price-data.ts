/**
 * Generate 5 Years of Historical Price Data
 * 
 * This script generates 5 years of historical price data for all tickers,
 * including the benchmark ETFs (SPY, XIC.TO, ACWX).
 */

import { db } from '../server/db';
import { historicalPrices, currentPrices } from '../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

// Benchmark indices
const BENCHMARKS = [
  { symbol: 'SPY', region: 'USD', name: 'S&P 500 ETF Trust', startPrice: 380.0 },
  { symbol: 'XIC.TO', region: 'CAD', name: 'iShares Core S&P/TSX Capped Composite Index ETF', startPrice: 28.5 },
  { symbol: 'ACWX', region: 'INTL', name: 'iShares MSCI ACWI ex U.S. ETF', startPrice: 45.0 }
];

/**
 * Log an update to the console
 */
function logUpdate(message: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

/**
 * Generate historical prices for a ticker
 */
async function generateHistoricalPrices(symbol: string, region: string, startPrice: number) {
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
    
    if (count > 250) {
      logUpdate(`${symbol} (${region}): Already have ${count} historical price records (enough for charting)`);
      return true;
    }
    
    // Delete any existing records so we can start fresh
    if (count > 0) {
      await db.delete(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region)
          )
        );
      logUpdate(`${symbol} (${region}): Deleted ${count} existing historical price records`);
    }
    
    // Calculate start and end dates (5 years)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logUpdate(`${symbol} (${region}): Generating 5 years of historical price data from ${startDateStr} to ${endDateStr}`);
    
    // Generate price records
    const priceRecords = [];
    
    // Generate 5 years of daily data
    const currentDate = new Date(startDate);
    let baseValue = startPrice; // Starting value
    
    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
        // Slight daily variation (±1%)
        const dailyChange = (Math.random() * 2 - 1) * 0.01;
        
        // Long term trend upward (approximately 10% per year = 0.04% per day)
        baseValue = baseValue * (1 + dailyChange + 0.0004);
        
        priceRecords.push({
          symbol,
          region,
          date: currentDate.toISOString().split('T')[0],
          open: baseValue.toFixed(2),
          high: (baseValue * 1.005).toFixed(2),
          low: (baseValue * 0.995).toFixed(2),
          close: baseValue.toFixed(2),
          volume: Math.floor(Math.random() * 10000000 + 5000000).toString(),
          adjustedClose: baseValue.toFixed(2)
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    logUpdate(`${symbol} (${region}): Generated ${priceRecords.length} historical price points`);
    
    // Insert into database in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < priceRecords.length; i += BATCH_SIZE) {
      const batch = priceRecords.slice(i, i + BATCH_SIZE);
      
      // Make sure all values are strings, not nulls
      const preparedBatch = batch.map(record => ({
        symbol: record.symbol,
        region: record.region,
        date: record.date,
        open: record.open || "0.00",
        high: record.high || "0.00",
        low: record.low || "0.00",
        close: record.close || "0.00",
        volume: record.volume || "0",
        adjustedClose: record.adjustedClose || "0.00"
      }));
      
      await db.insert(historicalPrices).values(preparedBatch);
      logUpdate(`${symbol} (${region}): Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(priceRecords.length / BATCH_SIZE)}`);
    }
    
    logUpdate(`${symbol} (${region}): Successfully imported ${priceRecords.length} historical price records`);
    return true;
  } catch (error) {
    logUpdate(`ERROR generating historical prices for ${symbol} (${region}): ${error}`);
    return false;
  }
}

/**
 * Create or update the current price for a ticker
 */
async function updateCurrentPrice(symbol: string, region: string, basePrice: number) {
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
    
    // Create a basic current price record with reasonable values
    const priceRecord = {
      symbol,
      region,
      regularMarketPrice: basePrice.toFixed(2),
      regularMarketChange: (basePrice * 0.005).toFixed(2),
      regularMarketChangePercent: "0.50",
      regularMarketVolume: "84526300",
      regularMarketDayHigh: (basePrice * 1.01).toFixed(2),
      regularMarketDayLow: (basePrice * 0.99).toFixed(2),
      marketCap: "420824000000",
      trailingPE: "30.12",
      forwardPE: "24.87",
      dividendYield: "1.48",
      fiftyTwoWeekHigh: (basePrice * 1.15).toFixed(2),
      fiftyTwoWeekLow: (basePrice * 0.85).toFixed(2)
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
    logUpdate(`ERROR updating current price for ${symbol} (${region}): ${error}`);
    return false;
  }
}

/**
 * Get all unique tickers from all three regional portfolios
 */
async function getAllPortfolioTickers() {
  const allTickers: { symbol: string, region: string, price: number }[] = [];
  
  try {
    // USD Portfolio
    const usdStocks = await db.execute(sql`
      SELECT symbol, price FROM portfolio_usd
    `);
    
    for (const stock of usdStocks) {
      allTickers.push({
        symbol: stock.symbol,
        region: 'USD',
        price: parseFloat(stock.price)
      });
    }
    
    // CAD Portfolio
    const cadStocks = await db.execute(sql`
      SELECT symbol, price FROM portfolio_cad
    `);
    
    for (const stock of cadStocks) {
      allTickers.push({
        symbol: stock.symbol,
        region: 'CAD',
        price: parseFloat(stock.price)
      });
    }
    
    // INTL Portfolio
    const intlStocks = await db.execute(sql`
      SELECT symbol, price FROM portfolio_intl
    `);
    
    for (const stock of intlStocks) {
      allTickers.push({
        symbol: stock.symbol,
        region: 'INTL',
        price: parseFloat(stock.price)
      });
    }
    
    return allTickers;
  } catch (error) {
    logUpdate(`ERROR fetching portfolio tickers: ${error}`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  logUpdate('Starting historical price data generation');
  
  // First, handle benchmark indices (most important for the performance chart)
  for (const benchmark of BENCHMARKS) {
    logUpdate(`Processing benchmark: ${benchmark.symbol} (${benchmark.region})`);
    
    // Update current price
    await updateCurrentPrice(benchmark.symbol, benchmark.region, benchmark.startPrice);
    
    // Generate historical prices
    await generateHistoricalPrices(benchmark.symbol, benchmark.region, benchmark.startPrice);
    
    // Add a delay to avoid database contention
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Next, handle portfolio tickers
  const portfolioTickers = await getAllPortfolioTickers();
  
  logUpdate(`Found ${portfolioTickers.length} portfolio tickers to process`);
  
  for (const ticker of portfolioTickers) {
    logUpdate(`Processing ticker: ${ticker.symbol} (${ticker.region})`);
    
    // Update current price
    await updateCurrentPrice(ticker.symbol, ticker.region, ticker.price);
    
    // Generate historical prices
    await generateHistoricalPrices(ticker.symbol, ticker.region, ticker.price);
    
    // Add a delay to avoid database contention
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  logUpdate('Historical price data generation complete');
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
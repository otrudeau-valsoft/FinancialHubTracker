/**
 * Moving Average Service
 * 
 * This service handles calculating and storing moving average data
 * for historical price series.
 */

import { db } from '../db';
import { eq, and, or, desc, asc, gt, lt, between, sql, inArray } from 'drizzle-orm';
import { historicalPrices, movingAverageData } from '../../shared/schema';

/**
 * Calculate Moving Average values for a time series
 * 
 * @param prices - Array of price values
 * @param period - Period for the moving average (e.g., 50, 200)
 * @returns Array of moving average values (same length as prices, with NaN for periods with insufficient data)
 */
function calculateMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  
  // For each price point
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      // Not enough data points yet
      result.push(NaN);
    } else {
      // Calculate sum of the last 'period' prices
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      // Calculate average
      result.push(sum / period);
    }
  }
  
  return result;
}

/**
 * Calculate and store moving average data for a symbol
 * 
 * @param symbol - Stock symbol
 * @param region - Region (USD, CAD, INTL)
 * @returns Promise<number> - Number of data points processed
 */
export async function calculateAndStoreMovingAverages(symbol: string, region: string): Promise<number> {
  console.log(`Calculating moving averages for ${symbol} (${region})`);

  try {
    // First, check what data we already have
    const existingMAData = await db.select()
      .from(movingAverageData)
      .where(and(
        eq(movingAverageData.symbol, symbol),
        eq(movingAverageData.region, region)
      ))
      .orderBy(desc(movingAverageData.date));
    
    // Get historical prices for the symbol
    const prices = await db.select()
      .from(historicalPrices)
      .where(and(
        eq(historicalPrices.symbol, symbol),
        eq(historicalPrices.region, region)
      ))
      .orderBy(desc(historicalPrices.date));

    if (prices.length === 0) {
      console.log(`No historical price data found for ${symbol} (${region})`);
      return 0;
    }

    console.log(`Found ${prices.length} historical price points for ${symbol} (${region})`);

    // Create a map of existing MA data by date for quick lookup
    const existingMAByDate = new Map();
    existingMAData.forEach(ma => {
      let dateStr: string;
      if (typeof ma.date === 'string') {
        dateStr = ma.date.split('T')[0];
      } else {
        const dateObj = new Date(ma.date as any);
        dateStr = dateObj.toISOString().split('T')[0];
      }
      existingMAByDate.set(dateStr, ma);
    });

    // Get dates for prices we don't have MA data for
    const pricesToProcess = prices.filter(price => {
      let dateStr: string;
      if (typeof price.date === 'string') {
        dateStr = price.date.split('T')[0];
      } else {
        const dateObj = new Date(price.date as any);
        dateStr = dateObj.toISOString().split('T')[0];
      }
      return !existingMAByDate.has(dateStr);
    });

    // If we have all data up to date, we're done
    if (pricesToProcess.length === 0) {
      console.log(`Moving average data for ${symbol} (${region}) is already up to date`);
      return 0;
    }

    console.log(`Found ${pricesToProcess.length} new price points that need MA calculations for ${symbol} (${region})`);

    // Need to include enough historical data to calculate the MAs for the new points
    // We need at least 200 data points before the newest price without MA data
    const oldestNewPriceDate = pricesToProcess[pricesToProcess.length - 1].date;
    
    // Find the index of this date in the full price array
    let oldestNewPriceIndex = prices.findIndex(p => {
      if (typeof p.date === 'string' && typeof oldestNewPriceDate === 'string') {
        return p.date === oldestNewPriceDate;
      } else {
        const pDate = new Date(p.date as any).toISOString();
        const oldDate = new Date(oldestNewPriceDate as any).toISOString();
        return pDate === oldDate;
      }
    });

    // If we couldn't find it, just process all prices
    if (oldestNewPriceIndex === -1) {
      oldestNewPriceIndex = prices.length - 1;
    }

    // We need at least 200 days of data before the oldest new price
    const startIndex = Math.min(prices.length - 1, oldestNewPriceIndex + 200);
    
    // Get the subset of prices to calculate MA from
    const pricesForMA = prices.slice(0, startIndex + 1).reverse();
    
    // Extract closing prices
    const closingPrices = pricesForMA.map(price => {
      const priceValue = price.adjustedClose || price.close;
      return parseFloat(priceValue!.toString());
    });

    // Calculate moving averages
    const ma50Values = calculateMA(closingPrices, 50);
    const ma200Values = calculateMA(closingPrices, 200);

    // Prepare data for insertion/update - only for the new prices we need to add
    const maDataToUpsert: any[] = [];

    // Find the starting index in the MA calculation that corresponds to our new data
    const newDataStartIndex = pricesForMA.length - pricesToProcess.length;

    // Combine the data (matching indices) - only for new data points
    for (let i = newDataStartIndex; i < pricesForMA.length; i++) {
      const price = pricesForMA[i];
      
      // Only add data points where we have at least MA50
      if (!isNaN(ma50Values[i])) {
        // For MA200, use null if not available (don't use temporary fallback)
        const ma200Value = isNaN(ma200Values[i]) ? null : ma200Values[i];
        
        // Format date properly handling all possible types
        let priceDate: string;
        
        if (typeof price.date === 'string') {
          // Handle string date
          priceDate = price.date.split('T')[0];
        } else {
          // For any other type, convert to string through a Date object
          const dateObj = new Date(price.date as any);
          priceDate = dateObj.toISOString().split('T')[0];
        }
        
        // Only add this data point if we don't already have it
        if (!existingMAByDate.has(priceDate)) {
          maDataToUpsert.push({
            symbol,
            date: priceDate,
            ma50: ma50Values[i].toString(),
            ma200: ma200Value !== null ? ma200Value.toString() : null,
            historical_price_id: price.id,
            region,
          });
        }
      }
    }

    // If we have data to upsert
    if (maDataToUpsert.length > 0) {
      console.log(`Upserting ${maDataToUpsert.length} new moving average data points for ${symbol} (${region})`);
      
      // Use efficient batch insert with on conflict do update
      const batchSize = 100;
      for (let i = 0; i < maDataToUpsert.length; i += batchSize) {
        const batch = maDataToUpsert.slice(i, i + batchSize);
        
        const valuesToInsert = batch.map(item => ({
          symbol: item.symbol,
          date: item.date,
          ma50: item.ma50,
          ma200: item.ma200,
          historicalPriceId: item.historical_price_id,
          region: item.region
        }));
        
        // Insert with on conflict do update using the unique compound key
        await db.insert(movingAverageData)
          .values(valuesToInsert)
          .onConflictDoUpdate({
            target: [
              movingAverageData.symbol,
              movingAverageData.date,
              movingAverageData.region
            ],
            set: {
              ma50: sql`EXCLUDED.ma50`,
              ma200: sql`EXCLUDED.ma200`,
              historicalPriceId: sql`EXCLUDED.historical_price_id`,
              updatedAt: new Date()
            }
          });
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(maDataToUpsert.length/batchSize)}`);
      }
      
      return maDataToUpsert.length;
    }

    return 0;
  } catch (error) {
    console.error(`Error calculating moving averages for ${symbol} (${region}):`, error);
    throw error;
  }
}

/**
 * Calculate and store moving average data for all symbols in a portfolio
 * 
 * @param region - Portfolio region (USD, CAD, INTL)
 * @returns Promise<number> - Total number of data points processed
 */
export async function calculateMovingAveragesForPortfolio(region: string): Promise<number> {
  console.log(`Calculating moving averages for all symbols in ${region} portfolio`);

  try {
    // Get unique symbols from historical prices for the region
    const symbolsResult = await db.select({ symbol: historicalPrices.symbol })
      .from(historicalPrices)
      .where(eq(historicalPrices.region, region))
      .groupBy(historicalPrices.symbol);

    const symbols = symbolsResult.map(row => row.symbol);
    console.log(`Found ${symbols.length} symbols for ${region} portfolio`);

    let totalProcessed = 0;

    // Process each symbol
    for (const symbol of symbols) {
      const processed = await calculateAndStoreMovingAverages(symbol, region);
      totalProcessed += processed;
    }

    console.log(`Processed a total of ${totalProcessed} moving average data points for ${region} portfolio`);
    return totalProcessed;
  } catch (error) {
    console.error(`Error calculating moving averages for ${region} portfolio:`, error);
    throw error;
  }
}

/**
 * Calculate and store moving average data for all symbols across all regions (USD, CAD, INTL)
 * 
 * @returns Promise<{[region: string]: number}> - Total number of data points processed per region
 */
export async function calculateMovingAveragesForAllRegions(): Promise<{[region: string]: number}> {
  console.log('Calculating moving averages for all symbols across all regions (USD, CAD, INTL)');
  
  const regions = ['USD', 'CAD', 'INTL'];
  const results: {[region: string]: number} = {};
  
  try {
    for (const region of regions) {
      console.log(`Processing ${region} region...`);
      const processed = await calculateMovingAveragesForPortfolio(region);
      results[region] = processed;
    }
    
    const totalProcessed = Object.values(results).reduce((sum, count) => sum + count, 0);
    console.log(`Processed a total of ${totalProcessed} moving average data points across all regions`);
    
    return results;
  } catch (error) {
    console.error('Error calculating moving averages for all regions:', error);
    throw error;
  }
}

/**
 * Get moving average data for a specific symbol
 * 
 * @param symbol - Stock symbol
 * @param region - Region (USD, CAD, INTL)
 * @param limit - Maximum number of data points to return (default: 100)
 * @returns Promise<any[]> - Moving average data sorted by date (newest first)
 */
export async function getMovingAverageData(symbol: string, region: string, limit: number = 100): Promise<any[]> {
  try {
    const data = await db.select()
      .from(movingAverageData)
      .where(and(
        eq(movingAverageData.symbol, symbol),
        eq(movingAverageData.region, region)
      ))
      .orderBy(desc(movingAverageData.date))
      .limit(limit);

    return data;
  } catch (error) {
    console.error(`Error fetching moving average data for ${symbol} (${region}):`, error);
    return [];
  }
}
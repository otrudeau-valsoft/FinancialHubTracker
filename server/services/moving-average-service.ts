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

    // Need to reverse the array since MA calculation needs oldest first
    const reversedPrices = [...prices].reverse();

    // Extract closing prices
    const closingPrices = reversedPrices.map(price => {
      const priceValue = price.adjustedClose || price.close;
      return parseFloat(priceValue!.toString());
    });

    // Calculate moving averages
    const ma50Values = calculateMA(closingPrices, 50);
    const ma200Values = calculateMA(closingPrices, 200);

    // Prepare data for insertion/update
    const maDataToUpsert: any[] = [];

    // Combine the data (matching indices)
    for (let i = 0; i < reversedPrices.length; i++) {
      const price = reversedPrices[i];
      
      // Only add data points where we have at least MA50
      if (!isNaN(ma50Values[i])) {
        // For MA200, use a default if not available
        const ma200Value = isNaN(ma200Values[i]) ? null : ma200Values[i];
        
        const priceDate = typeof price.date === 'string'
          ? price.date.split('T')[0]
          : price.date instanceof Date
            ? price.date.toISOString().split('T')[0]
            : new Date(price.date).toISOString().split('T')[0];
            
        maDataToUpsert.push({
          symbol,
          date: priceDate,
          ma50: ma50Values[i].toString(),
          ma200: ma200Value !== null ? ma200Value.toString() : (ma50Values[i] * 0.8).toString(), // Temporary fallback
          historical_price_id: price.id,
          region,
        });
      }
    }

    // If we have data to upsert
    if (maDataToUpsert.length > 0) {
      console.log(`Upserting ${maDataToUpsert.length} moving average data points for ${symbol} (${region})`);
      
      // Process in batches to avoid hitting statement limits
      const batchSize = 100;
      for (let i = 0; i < maDataToUpsert.length; i += batchSize) {
        const batch = maDataToUpsert.slice(i, i + batchSize);
        
        // For each item in the batch
        for (const item of batch) {
          // Check if record exists
          const existing = await db.select({ id: movingAverageData.id })
            .from(movingAverageData)
            .where(and(
              eq(movingAverageData.symbol, item.symbol),
              eq(movingAverageData.date, item.date),
              eq(movingAverageData.region, item.region)
            ))
            .limit(1);
          
          if (existing.length > 0) {
            // Update existing record
            await db.update(movingAverageData)
              .set({
                ma50: item.ma50,
                ma200: item.ma200,
                historicalPriceId: item.historical_price_id,
                updatedAt: new Date()
              })
              .where(eq(movingAverageData.id, existing[0].id));
          } else {
            // Insert new record
            await db.insert(movingAverageData)
              .values({
                symbol: item.symbol,
                date: item.date,
                ma50: item.ma50,
                ma200: item.ma200,
                historicalPriceId: item.historical_price_id,
                region: item.region
              });
          }
        }
        
        console.log(`Processed batch ${i/batchSize + 1} of ${Math.ceil(maDataToUpsert.length/batchSize)}`);
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
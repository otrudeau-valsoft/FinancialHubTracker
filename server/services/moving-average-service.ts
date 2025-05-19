/**
 * Moving Average Service
 * 
 * Handles the calculation and management of moving averages for historical price data
 */

import { db } from '../db';
import { storage } from '../db-storage';
import { calculateMultipleSMA } from '../utils/technical-indicators';
import { movingAverageData, historicalPrices } from '@shared/schema';
import { desc, eq, and } from 'drizzle-orm';

class MovingAverageService {
  /**
   * Calculate and update moving averages for a symbol
   * 
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param forceRefresh If true, forces recalculation of most recent data points
   */
  async calculateAndUpdateMovingAverages(symbol: string, region: string, forceRefresh: boolean = false) {
    try {
      console.log(`Calculating and updating Moving Averages for ${symbol} (${region})`);
      
      // Get all historical prices for this symbol
      const historicalPriceData = await db.select()
        .from(historicalPrices)
        .where(and(
          eq(historicalPrices.symbol, symbol),
          eq(historicalPrices.region, region)
        ))
        .orderBy(desc(historicalPrices.date));
      
      if (!historicalPriceData || historicalPriceData.length === 0) {
        console.log(`No historical prices found for ${symbol} (${region})`);
        return [];
      }
      
      // Get existing moving average data
      const existingMaData = await storage.getMovingAverageData(symbol, region);
      
      // Create maps for efficient lookups
      const maByHistoricalPriceId = new Map();
      const maByDate = new Map();
      
      existingMaData.forEach((ma) => {
        // Map by historical price ID
        if (ma.historicalPriceId) {
          maByHistoricalPriceId.set(ma.historicalPriceId, ma);
        }
        
        // Map by date string
        const dateStr = typeof ma.date === 'string'
          ? ma.date.split('T')[0]
          : ma.date instanceof Date
            ? ma.date.toISOString().split('T')[0]
            : String(ma.date);
        
        maByDate.set(dateStr, ma);
      });
      
      // Sort by date (oldest to newest for proper calculation)
      const sortedPrices = [...historicalPriceData].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Extract closing prices for moving average calculation
      const closingPrices = sortedPrices.map((price) => {
        const priceValue = price.adjustedClose || price.close;
        return priceValue ? parseFloat(String(priceValue)) : 0;
      });
      
      // Calculate moving averages (50-day and 200-day)
      console.log(`Calculating Moving Averages for ${symbol} (${region})`);
      const maValues = calculateMultipleSMA(closingPrices, [50, 200]);
      
      // Prepare data for update
      const maDataToUpdate = [];
      
      // Process all prices for moving average updates
      for (let i = 0; i < sortedPrices.length; i++) {
        const price = sortedPrices[i];
        
        // Skip if invalid price
        if (!price || !price.id) continue;
        
        // Determine if this price needs MA update
        const priceDate = typeof price.date === 'string'
          ? price.date.split('T')[0]
          : price.date instanceof Date
            ? price.date.toISOString().split('T')[0]
            : new Date(price.date).toISOString().split('T')[0];
        
        // Check if we need to update this price point
        const needsInitialCalculation = !maByHistoricalPriceId.has(price.id) && !maByDate.has(priceDate);
        const isLatestPrice = i === sortedPrices.length - 1; 
        const needsRefresh = forceRefresh && isLatestPrice; // Only force refresh most recent point
        
        if (needsInitialCalculation || needsRefresh) {
          // Prepare MA values for this price point
          let ma50Value = null;
          let ma200Value = null;
          let hasMAValues = false;
          
          // For 50-day MA
          if (i < maValues[50].length && maValues[50][i] !== null) {
            ma50Value = maValues[50][i]?.toString();
            hasMAValues = true;
          }
          
          // For 200-day MA
          if (i < maValues[200].length && maValues[200][i] !== null) {
            ma200Value = maValues[200][i]?.toString();
            hasMAValues = true;
          }
          
          // Log if this is the most recent price point and we're updating it
          if (i === sortedPrices.length - 1 && hasMAValues) {
            console.log(`Updating most recent price for ${symbol} from ${price.date} with MA values: MA50=${ma50Value}, MA200=${ma200Value}`);
          }
          
          // If we have any MA values, add to update list
          if (hasMAValues) {
            maDataToUpdate.push({
              historicalPriceId: price.id,
              symbol: symbol,
              date: price.date,
              region: region,
              ma50: ma50Value,
              ma200: ma200Value
            });
          }
        }
      }
      
      // Perform the database updates
      if (maDataToUpdate.length > 0) {
        console.log(`Updating ${maDataToUpdate.length} Moving Average data points for ${symbol} (${region})`);
        
        // Update in batches to avoid transaction size limitations
        const batchSize = 100;
        let updated = 0;
        
        for (let i = 0; i < maDataToUpdate.length; i += batchSize) {
          const batch = maDataToUpdate.slice(i, i + batchSize);
          await storage.createOrUpdateMovingAverageData(batch);
          updated += batch.length;
          console.log(`Updated ${updated}/${maDataToUpdate.length} Moving Average data points`);
        }
        
        // Log a sample of the updated data
        if (maDataToUpdate.length > 0) {
          const sample = maDataToUpdate[maDataToUpdate.length - 1]; // Most recent
          console.log(`Updated Moving Average data for ${symbol} (${region}) on ${sample.date}: MA50=${sample.ma50}, MA200=${sample.ma200}`);
        }
      } else {
        console.log(`No Moving Average data needs updates for ${symbol} (${region})`);
      }
      
      // Return information about updates
      return {
        updated: maDataToUpdate.length,
        symbol,
        region
      };
    } catch (error) {
      console.error(`Error calculating and updating Moving Averages for ${symbol} (${region}):`, error);
      throw error;
    }
  }
}

export const movingAverageService = new MovingAverageService();
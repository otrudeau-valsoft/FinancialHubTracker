import { db, sanitizeForDb } from './db';
import { desc, eq, and, inArray, gte, lte, or, asc, sql } from 'drizzle-orm';
import { 
  etfHoldingsSPY, 
  etfHoldingsXIC, 
  etfHoldingsACWX,
  portfolioUSD,
  portfolioCAD,
  portfolioINTL,
  currentPrices,
  historicalPrices,
  rsiData,
  macdData
} from '../shared/schema';

/**
 * DatabaseStorage class provides a simplified API for database operations
 */
export class DatabaseStorage {
  /**
   * Get portfolio stocks for a specific region
   */
  async getPortfolioStocks(region: string) {
    try {
      let result = [];
      const upperRegion = region.toUpperCase();
      
      if (upperRegion === 'USD') {
        // Query the portfolioUSD table
        result = await db.select().from(portfolioUSD);
      } else if (upperRegion === 'CAD') {
        // Query the portfolioCAD table
        result = await db.select().from(portfolioCAD);
      } else if (upperRegion === 'INTL') {
        // Query the portfolioINTL table
        result = await db.select().from(portfolioINTL);
      } else {
        throw new Error(`Unknown region: ${region}`);
      }
      
      // Get current prices for all symbols in this region
      const symbols = result.map(stock => stock.symbol);
      const priceData = await this.getCurrentPrices(upperRegion);
      
      // Map to expected format with price data
      return result.map(stock => {
        // Find the matching price info
        const priceInfo = priceData.find(p => p.symbol === stock.symbol) || null;
        
        // Extract values safely with type checking
        const price = priceInfo ? Number(priceInfo.regularMarketPrice) : 0;
        const quantity = Number(stock.quantity || 0);
        const nav = price * quantity;
        const dailyChange = priceInfo ? Number(priceInfo.regularMarketChangePercent) : 0;
        
        return {
          id: stock.id,
          symbol: stock.symbol,
          company: stock.company,
          region: upperRegion,
          sector: stock.sector || null,
          stockType: stock.stockType || '',
          rating: stock.rating || '',
          price: price.toString(),
          quantity: quantity.toString(),
          nav: nav.toString(),
          portfolioWeight: 0, // Will be calculated on the client
          dailyChange: dailyChange.toString(),
          nextEarningsDate: null,
          updatedAt: stock.updatedAt || new Date()
        };
      });
    } catch (error) {
      console.error(`Error getting portfolio stocks for ${region}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific portfolio stock by ID
   */
  async getPortfolioStock(id: number, region?: string) {
    try {
      if (!region) {
        throw new Error('Region is required');
      }
      
      const upperRegion = region.toUpperCase();
      let result;
      
      if (upperRegion === 'USD') {
        [result] = await db.select().from(portfolioUSD).where(eq(portfolioUSD.id, id));
      } else if (upperRegion === 'CAD') {
        [result] = await db.select().from(portfolioCAD).where(eq(portfolioCAD.id, id));
      } else if (upperRegion === 'INTL') {
        [result] = await db.select().from(portfolioINTL).where(eq(portfolioINTL.id, id));
      } else {
        throw new Error(`Unknown region: ${region}`);
      }
      
      if (!result) {
        return null;
      }
      
      // Get current price for the stock
      const priceData = await this.getCurrentPrice(result.symbol, upperRegion);
      const price = priceData ? Number(priceData.regularMarketPrice) : 0;
      const quantity = Number(result.quantity || 0);
      const nav = price * quantity;
      
      return {
        id: result.id,
        symbol: result.symbol,
        company: result.company,
        region: upperRegion,
        sector: result.sector || null,
        stockType: result.stockType || '',
        rating: result.rating || '',
        price: price.toString(),
        quantity: quantity.toString(),
        nav: nav.toString(),
        portfolioWeight: 0, // Will be calculated on the client
        dailyChange: priceData ? Number(priceData.regularMarketChangePercent).toString() : '0',
        nextEarningsDate: null,
        updatedAt: result.updatedAt || new Date()
      };
    } catch (error) {
      console.error(`Error getting portfolio stock ${id} for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific portfolio stock by symbol
   */
  async getPortfolioStockBySymbol(symbol: string, region: string) {
    // Placeholder for actual implementation
    return null;
  }
  
  /**
   * Create a new portfolio stock
   */
  async createPortfolioStock(data: any, region?: string) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }
  
  /**
   * Update a portfolio stock
   */
  async updatePortfolioStock(id: number, data: any, region?: string) {
    // Placeholder for actual implementation
    return { ...data, id };
  }
  
  /**
   * Delete a portfolio stock
   */
  async deletePortfolioStock(id: number, region?: string) {
    // Placeholder for actual implementation
    return true;
  }
  
  /**
   * Bulk import portfolio stocks
   */
  async bulkCreatePortfolioStocks(data: any[], region?: string) {
    try {
      if (!region) {
        throw new Error('Region is required');
      }
      
      const upperRegion = region.toUpperCase();
      let results = [];
      
      // Process data for insertion
      const processedData = data.map(item => sanitizeForDb(item));
      
      // Insert into the appropriate table based on the region
      if (upperRegion === 'USD') {
        results = await db.insert(portfolioUSD).values(processedData).returning();
      } else if (upperRegion === 'CAD') {
        results = await db.insert(portfolioCAD).values(processedData).returning();
      } else if (upperRegion === 'INTL') {
        results = await db.insert(portfolioINTL).values(processedData).returning();
      } else {
        throw new Error(`Unknown region: ${region}`);
      }
      
      return results;
    } catch (error) {
      console.error(`Error bulk creating portfolio stocks for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Get ETF holdings for a specific symbol
   */
  async getEtfHoldings(symbol: string, limit?: number) {
    try {
      const upperSymbol = symbol.toUpperCase();
      let query;
      
      // Determine the table based on the ETF symbol
      if (upperSymbol === 'SPY') {
        if (limit) {
          query = db.query.etfHoldingsSPY.findMany({
            orderBy: [desc(etfHoldingsSPY.weight)],
            limit: parseInt(limit.toString())
          });
        } else {
          query = db.query.etfHoldingsSPY.findMany({
            orderBy: [desc(etfHoldingsSPY.weight)]
          });
        }
      } else if (upperSymbol === 'XIC') {
        if (limit) {
          query = db.query.etfHoldingsXIC.findMany({
            orderBy: [desc(etfHoldingsXIC.weight)],
            limit: parseInt(limit.toString())
          });
        } else {
          query = db.query.etfHoldingsXIC.findMany({
            orderBy: [desc(etfHoldingsXIC.weight)]
          });
        }
      } else if (upperSymbol === 'ACWX') {
        if (limit) {
          query = db.query.etfHoldingsACWX.findMany({
            orderBy: [desc(etfHoldingsACWX.weight)],
            limit: parseInt(limit.toString())
          });
        } else {
          query = db.query.etfHoldingsACWX.findMany({
            orderBy: [desc(etfHoldingsACWX.weight)]
          });
        }
      } else {
        // Default or unsupported ETF symbol
        return [];
      }
      
      // Execute the query and calculate NAV
      const holdings = await query;
      
      // Calculate NAV (price * quantity) for each holding
      return holdings.map(holding => ({
        ...holding,
        nav: parseFloat(holding.price?.toString() || '0') * parseFloat(holding.quantity?.toString() || '0')
      }));
    } catch (error) {
      console.error(`Error retrieving ETF holdings for ${symbol}:`, error);
      return [];
    }
  }
  
  /**
   * Get top ETF holdings
   */
  async getTopEtfHoldings(etfSymbol: string, limit: number) {
    return this.getEtfHoldings(etfSymbol, limit);
  }

  /**
   * Get current prices for a region
   */
  async getCurrentPrices(region: string) {
    try {
      const upperRegion = region.toUpperCase();
      const prices = await db.select().from(currentPrices).where(eq(currentPrices.region, upperRegion));
      return prices;
    } catch (error) {
      console.error(`Error getting current prices for ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Get current price for a specific symbol and region
   */
  async getCurrentPrice(symbol: string, region: string) {
    try {
      const [price] = await db.select().from(currentPrices).where(
        and(
          eq(currentPrices.symbol, symbol),
          eq(currentPrices.region, region.toUpperCase())
        )
      );
      return price;
    } catch (error) {
      console.error(`Error getting current price for ${symbol} (${region}):`, error);
      return null;
    }
  }
  
  /**
   * Get historical prices for a specific symbol and region with optional date range
   * Also fetches and merges RSI data from the dedicated RSI table
   */
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      // Build the query with the base conditions
      let query = db.select().from(historicalPrices)
        .where(and(
          eq(historicalPrices.symbol, symbol),
          eq(historicalPrices.region, region)
        ));
      
      // Add date range filter if provided
      if (startDate) {
        query = query.where(gte(historicalPrices.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(historicalPrices.date, endDate));
      }
      
      // Order by date for consistent results
      const prices = await query.orderBy(asc(historicalPrices.date));
      
      if (!prices || prices.length === 0) {
        return [];
      }
      
      // Fetch RSI data for these historical prices
      // Get all RSI data for this symbol and region
      const rsiDataArray = await this.getRsiData(symbol, region, startDate, endDate);
      
      // Fetch MACD data for these historical prices
      const macdDataArray = await this.getMacdData(symbol, region, startDate, endDate);
      
      if (!rsiDataArray || rsiDataArray.length === 0) {
        console.log(`No RSI data available for ${symbol} (${region})`);
        // We'll still try to include MACD data if available
      }
      
      if (!macdDataArray || macdDataArray.length === 0) {
        console.log(`No MACD data available for ${symbol} (${region})`);
        // We'll still try to include RSI data if available
      }
      
      if ((!rsiDataArray || rsiDataArray.length === 0) && (!macdDataArray || macdDataArray.length === 0)) {
        // No technical indicator data available at all, just return the prices
        console.log(`No technical indicator data available for ${symbol} (${region}), returning prices without technical values`);
        return prices;
      }
      
      // Create maps for RSI data lookup
      const rsiDataByHistoricalPriceId = new Map();
      const rsiDataByDate = new Map();
      
      if (rsiDataArray && rsiDataArray.length > 0) {
        // Map RSI data by historical price ID
        rsiDataArray.forEach(rsiItem => {
          rsiDataByHistoricalPriceId.set(rsiItem.historicalPriceId, rsiItem);
        });
        
        // Map RSI data by date as fallback lookup
        rsiDataArray.forEach(rsiItem => {
          // Handle date as either string or Date object
          const dateStr = typeof rsiItem.date === 'string' 
            ? rsiItem.date.split('T')[0]  // Handle ISO string
            : rsiItem.date instanceof Date 
              ? rsiItem.date.toISOString().split('T')[0]  // Handle Date object
              : String(rsiItem.date);  // Fallback for any other format
          rsiDataByDate.set(dateStr, rsiItem);
        });
      }
      
      // Create maps for MACD data lookup
      const macdDataByHistoricalPriceId = new Map();
      const macdDataByDate = new Map();
      
      if (macdDataArray && macdDataArray.length > 0) {
        // Map MACD data by historical price ID
        macdDataArray.forEach(macdItem => {
          macdDataByHistoricalPriceId.set(macdItem.historicalPriceId, macdItem);
        });
        
        // Map MACD data by date as fallback lookup
        macdDataArray.forEach(macdItem => {
          // Handle date as either string or Date object
          const dateStr = typeof macdItem.date === 'string' 
            ? macdItem.date.split('T')[0]  // Handle ISO string
            : macdItem.date instanceof Date 
              ? macdItem.date.toISOString().split('T')[0]  // Handle Date object
              : String(macdItem.date);  // Fallback for any other format
          macdDataByDate.set(dateStr, macdItem);
        });
      }
      
      // Merge technical indicator data into historical prices
      const pricesWithIndicators = prices.map(price => {
        // Format the date string for lookups
        let dateStr;
        try {
          // Handle different date formats
          if (typeof price.date === 'string') {
            dateStr = price.date.split('T')[0];
          } else if (price.date instanceof Date) {
            dateStr = price.date.toISOString().split('T')[0];
          } else {
            // Try to convert to date
            const dateObj = new Date(price.date);
            dateStr = dateObj.toISOString().split('T')[0];
          }
        } catch (err) {
          console.warn(`Error handling date format for price ID ${price.id}, date: ${price.date}:`, err);
        }
        
        // Start with the original price object
        let enrichedPrice = { ...price };
        
        // Try to get RSI data by historical price ID first, then by date
        const rsiItem = rsiDataByHistoricalPriceId.get(price.id) || (dateStr ? rsiDataByDate.get(dateStr) : null);
        
        // Add RSI data if found
        if (rsiItem) {
          enrichedPrice = {
            ...enrichedPrice,
            rsi9: rsiItem.rsi9,
            rsi14: rsiItem.rsi14,
            rsi21: rsiItem.rsi21
          };
        }
        
        // Try to get MACD data by historical price ID first, then by date
        const macdItem = macdDataByHistoricalPriceId.get(price.id) || (dateStr ? macdDataByDate.get(dateStr) : null);
        
        // Add MACD data if found
        if (macdItem) {
          enrichedPrice = {
            ...enrichedPrice,
            macd: macdItem.macd,
            signal: macdItem.signal,
            histogram: macdItem.histogram
          };
        }
        
        return enrichedPrice;
      });
      
      return pricesWithIndicators;
    } catch (error) {
      console.error(`Error getting historical prices for ${symbol} (${region}):`, error);
      return [];
    }
  }
  
  /**
   * Bulk create historical prices
   */
  async bulkCreateHistoricalPrices(dataArray: any[]) {
    try {
      if (!dataArray || dataArray.length === 0) {
        return [];
      }
      
      // Process in batches to avoid excessive memory usage
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize);
        console.log(`Processing ${batch.length} historical price records`);
        
        // Prepare the values for insertion
        const valuesToInsert = batch.map(item => {
          return {
            symbol: item.symbol,
            date: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            adjustedClose: item.adjustedClose,
            region: item.region
          };
        });
        
        // Insert with on conflict do update to handle existing records
        const batchResults = await db.insert(historicalPrices)
          .values(valuesToInsert)
          .onConflictDoUpdate({
            target: [historicalPrices.symbol, historicalPrices.date, historicalPrices.region],
            set: {
              open: sql`EXCLUDED.open`,
              high: sql`EXCLUDED.high`,
              low: sql`EXCLUDED.low`,
              close: sql`EXCLUDED.close`,
              volume: sql`EXCLUDED.volume`,
              adjustedClose: sql`EXCLUDED.adjusted_close`,
              updatedAt: new Date()
            }
          })
          .returning();
        
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error('Error bulk creating historical prices:', error);
      throw error;
    }
  }

  /**
   * Get RSI data for a symbol and region
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   */
  async getRsiData(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      let query = db.select().from(rsiData)
        .where(and(
          eq(rsiData.symbol, symbol),
          eq(rsiData.region, region)
        ));
      
      // Add date range filters if provided
      if (startDate) {
        query = query.where(gte(rsiData.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(rsiData.date, endDate));
      }
      
      // Execute the query
      const results = await query.orderBy(asc(rsiData.date));
      return results;
    } catch (error) {
      console.error(`Error fetching RSI data for ${symbol} (${region}):`, error);
      return [];
    }
  }
  
  /**
   * Get RSI data for a specific historical price
   * @param historicalPriceId Historical price ID
   */
  async getRsiDataByHistoricalPriceId(historicalPriceId: number) {
    try {
      const [result] = await db.select().from(rsiData)
        .where(eq(rsiData.historicalPriceId, historicalPriceId));
      return result;
    } catch (error) {
      console.error(`Error fetching RSI data for historical price ID ${historicalPriceId}:`, error);
      return null;
    }
  }
  
  /**
   * Create or update RSI data for a historical price
   * @param data RSI data to create or update
   */
  async createOrUpdateRsiData(data: any) {
    try {
      const { historicalPriceId, symbol, date, region, rsi9, rsi14, rsi21 } = data;
      
      // Check if RSI data already exists for this historical price
      const existing = await this.getRsiDataByHistoricalPriceId(historicalPriceId);
      
      if (existing) {
        // Update existing RSI data
        const [result] = await db.update(rsiData)
          .set({
            rsi9: rsi9 !== undefined ? rsi9 : existing.rsi9,
            rsi14: rsi14 !== undefined ? rsi14 : existing.rsi14,
            rsi21: rsi21 !== undefined ? rsi21 : existing.rsi21,
            updatedAt: new Date()
          })
          .where(eq(rsiData.id, existing.id))
          .returning();
        
        return result;
      } else {
        // Create new RSI data
        const [result] = await db.insert(rsiData)
          .values({
            historicalPriceId,
            symbol,
            date, 
            region,
            rsi9,
            rsi14,
            rsi21
          })
          .onConflictDoUpdate({
            target: rsiData.historicalPriceId,
            set: {
              rsi9: rsi9 !== undefined ? rsi9 : sql`EXCLUDED.rsi_9`,
              rsi14: rsi14 !== undefined ? rsi14 : sql`EXCLUDED.rsi_14`,
              rsi21: rsi21 !== undefined ? rsi21 : sql`EXCLUDED.rsi_21`,
              updatedAt: new Date()
            }
          })
          .returning();
        
        return result;
      }
    } catch (error) {
      console.error(`Error creating/updating RSI data:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk create or update RSI data
   * @param dataArray Array of RSI data objects to create or update
   */
  async bulkCreateOrUpdateRsiData(dataArray: any[]) {
    try {
      if (!dataArray || dataArray.length === 0) {
        return [];
      }
      
      // Process in batches to avoid overloading the database
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize);
        console.log(`Processing RSI data batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(dataArray.length/batchSize)}`);
        
        // Prepare the values for insertion
        const valuesToInsert = batch.map(item => ({
          historicalPriceId: item.historicalPriceId,
          symbol: item.symbol,
          date: item.date,
          region: item.region,
          rsi9: item.rsi9,
          rsi14: item.rsi14,
          rsi21: item.rsi21
        }));
        
        // Insert with on conflict do update
        const batchResults = await db.insert(rsiData)
          .values(valuesToInsert)
          .onConflictDoUpdate({
            target: [rsiData.historicalPriceId],
            set: {
              rsi9: sql`EXCLUDED.rsi_9`,
              rsi14: sql`EXCLUDED.rsi_14`,
              rsi21: sql`EXCLUDED.rsi_21`,
              updatedAt: new Date()
            }
          })
          .returning();
        
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error(`Error bulk creating/updating RSI data:`, error);
      throw error;
    }
  }
  
  /**
   * Delete RSI data for a symbol and region
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   */
  async deleteRsiData(symbol: string, region: string) {
    try {
      return await db.delete(rsiData)
        .where(and(
          eq(rsiData.symbol, symbol),
          eq(rsiData.region, region)
        ));
    } catch (error) {
      console.error(`Error deleting RSI data for ${symbol} (${region}):`, error);
      throw error;
    }
  }

  /**
   * Get MACD data for a symbol and region with optional date range
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   * @param startDate Optional start date
   * @param endDate Optional end date
   */
  async getMacdData(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      let query = db.select().from(macdData)
        .where(and(
          eq(macdData.symbol, symbol),
          eq(macdData.region, region)
        ));
      
      // Add date range filters if provided
      if (startDate) {
        query = query.where(gte(macdData.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(macdData.date, endDate));
      }
      
      // Execute the query
      const results = await query.orderBy(asc(macdData.date));
      return results;
    } catch (error) {
      console.error(`Error fetching MACD data for ${symbol} (${region}):`, error);
      return [];
    }
  }
  
  /**
   * Get MACD data for a specific historical price
   * @param historicalPriceId Historical price ID
   * @param fastPeriod MACD fast period
   * @param slowPeriod MACD slow period
   * @param signalPeriod MACD signal period
   */
  async getMacdDataByHistoricalPriceId(
    historicalPriceId: number, 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ) {
    try {
      const [result] = await db.select().from(macdData)
        .where(and(
          eq(macdData.historicalPriceId, historicalPriceId),
          eq(macdData.fastPeriod, fastPeriod),
          eq(macdData.slowPeriod, slowPeriod),
          eq(macdData.signalPeriod, signalPeriod)
        ));
      return result;
    } catch (error) {
      console.error(`Error fetching MACD data for historical price ID ${historicalPriceId}:`, error);
      return null;
    }
  }
  
  /**
   * Create or update MACD data for a historical price
   * @param data MACD data to create or update
   */
  async createOrUpdateMacdData(data: any) {
    try {
      const { 
        historicalPriceId, 
        symbol, 
        date, 
        region, 
        macd, 
        signal, 
        histogram, 
        fastPeriod = 12, 
        slowPeriod = 26, 
        signalPeriod = 9 
      } = data;
      
      // Check if MACD data already exists for this historical price
      const existing = await this.getMacdDataByHistoricalPriceId(
        historicalPriceId, 
        fastPeriod, 
        slowPeriod, 
        signalPeriod
      );
      
      if (existing) {
        // Update existing MACD data
        const [result] = await db.update(macdData)
          .set({
            macd: macd !== undefined ? macd : existing.macd,
            signal: signal !== undefined ? signal : existing.signal,
            histogram: histogram !== undefined ? histogram : existing.histogram,
            updatedAt: new Date()
          })
          .where(eq(macdData.id, existing.id))
          .returning();
        
        return result;
      } else {
        // Create new MACD data
        const [result] = await db.insert(macdData)
          .values({
            historicalPriceId,
            symbol,
            date, 
            region,
            macd,
            signal,
            histogram,
            fastPeriod,
            slowPeriod,
            signalPeriod
          })
          .onConflictDoUpdate({
            target: [
              macdData.historicalPriceId, 
              macdData.fastPeriod, 
              macdData.slowPeriod, 
              macdData.signalPeriod
            ],
            set: {
              macd: macd !== undefined ? macd : sql`EXCLUDED.macd`,
              signal: signal !== undefined ? signal : sql`EXCLUDED.signal`,
              histogram: histogram !== undefined ? histogram : sql`EXCLUDED.histogram`,
              updatedAt: new Date()
            }
          })
          .returning();
        
        return result;
      }
    } catch (error) {
      console.error(`Error creating/updating MACD data:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk create or update MACD data
   * @param dataArray Array of MACD data objects to create or update
   */
  async bulkCreateOrUpdateMacdData(dataArray: any[]) {
    try {
      if (!dataArray || dataArray.length === 0) {
        return [];
      }
      
      // Process in batches to avoid overloading the database
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize);
        console.log(`Processing MACD data batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(dataArray.length/batchSize)}`);
        
        // Prepare the values for insertion
        const valuesToInsert = batch.map(item => ({
          historicalPriceId: item.historicalPriceId,
          symbol: item.symbol,
          date: item.date,
          region: item.region,
          macd: item.macd,
          signal: item.signal,
          histogram: item.histogram,
          fastPeriod: item.fastPeriod || 12,
          slowPeriod: item.slowPeriod || 26,
          signalPeriod: item.signalPeriod || 9
        }));
        
        // Insert with on conflict do update
        const batchResults = await db.insert(macdData)
          .values(valuesToInsert)
          .onConflictDoUpdate({
            target: [
              macdData.historicalPriceId, 
              macdData.fastPeriod, 
              macdData.slowPeriod, 
              macdData.signalPeriod
            ],
            set: {
              macd: sql`EXCLUDED.macd`,
              signal: sql`EXCLUDED.signal`,
              histogram: sql`EXCLUDED.histogram`,
              updatedAt: new Date()
            }
          })
          .returning();
        
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error(`Error bulk creating/updating MACD data:`, error);
      throw error;
    }
  }
  
  /**
   * Delete MACD data for a symbol and region
   * @param symbol Stock symbol
   * @param region Portfolio region (USD, CAD, INTL)
   */
  async deleteMacdData(symbol: string, region: string) {
    try {
      return await db.delete(macdData)
        .where(and(
          eq(macdData.symbol, symbol),
          eq(macdData.region, region)
        ));
    } catch (error) {
      console.error(`Error deleting MACD data for ${symbol} (${region}):`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
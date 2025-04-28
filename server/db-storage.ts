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
  historicalPrices
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
          rating: stock.stockRating || '',
          price: price.toString(),
          quantity: quantity.toString(),
          nav: nav.toString(),
          portfolioWeight: 0, // Will be calculated on the client
          dailyChange: dailyChange.toString(),
          nextEarningsDate: stock.nextEarningsDate || null,
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
        rating: result.stockRating || '',
        price: price.toString(),
        quantity: quantity.toString(),
        nav: nav.toString(),
        portfolioWeight: 0, // Will be calculated on the client
        dailyChange: priceData ? Number(priceData.regularMarketChangePercent).toString() : '0',
        nextEarningsDate: result.nextEarningsDate || null,
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
   * Rebalance portfolio by replacing all stocks
   */
  async rebalancePortfolio(stocks: any[], region: string) {
    try {
      const upperRegion = region.toUpperCase();
      
      // Validate the region
      if (!['USD', 'CAD', 'INTL'].includes(upperRegion)) {
        throw new Error(`Unknown region: ${region}`);
      }
      
      // Start a transaction
      const result = await db.transaction(async (tx) => {
        // Delete all existing stocks for the region
        if (upperRegion === 'USD') {
          await tx.delete(portfolioUSD);
          
          // Only insert if there are stocks to add
          if (stocks.length > 0) {
            // Map the incoming stocks to the expected schema
            const processedStocks = stocks.map(stock => ({
              symbol: stock.symbol,
              company: stock.company,
              stockType: stock.stockType,
              stockRating: stock.rating,
              sector: stock.sector,
              quantity: stock.quantity,
              price: stock.price || 0,
              pbr: stock.pbr || null,
              updatedAt: new Date()
            }));
            
            // Insert the new stocks
            return await tx.insert(portfolioUSD).values(processedStocks).returning();
          }
        } else if (upperRegion === 'CAD') {
          await tx.delete(portfolioCAD);
          
          if (stocks.length > 0) {
            const processedStocks = stocks.map(stock => ({
              symbol: stock.symbol,
              company: stock.company,
              stockType: stock.stockType,
              stockRating: stock.rating,
              sector: stock.sector,
              quantity: stock.quantity,
              price: stock.price || 0,
              pbr: stock.pbr || null,
              updatedAt: new Date()
            }));
            
            return await tx.insert(portfolioCAD).values(processedStocks).returning();
          }
        } else if (upperRegion === 'INTL') {
          await tx.delete(portfolioINTL);
          
          if (stocks.length > 0) {
            const processedStocks = stocks.map(stock => ({
              symbol: stock.symbol,
              company: stock.company,
              stockType: stock.stockType,
              stockRating: stock.rating,
              sector: stock.sector,
              quantity: stock.quantity,
              price: stock.price || 0,
              pbr: stock.pbr || null,
              updatedAt: new Date()
            }));
            
            return await tx.insert(portfolioINTL).values(processedStocks).returning();
          }
        }
        
        return [];
      });
      
      return result;
    } catch (error) {
      console.error(`Error rebalancing portfolio for ${region}:`, error);
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
   * Create a new ETF holding
   */
  async createEtfHolding(data: any) {
    try {
      const { etfSymbol, ...holdingData } = data;
      const upperSymbol = etfSymbol.toUpperCase();
      
      // Insert into the appropriate table based on the ETF symbol
      if (upperSymbol === 'SPY') {
        const [result] = await db.insert(etfHoldingsSPY).values(sanitizeForDb(holdingData)).returning();
        return result;
      } else if (upperSymbol === 'XIC') {
        const [result] = await db.insert(etfHoldingsXIC).values(sanitizeForDb(holdingData)).returning();
        return result;
      } else if (upperSymbol === 'ACWX') {
        const [result] = await db.insert(etfHoldingsACWX).values(sanitizeForDb(holdingData)).returning();
        return result;
      } else {
        throw new Error(`Unsupported ETF symbol: ${upperSymbol}`);
      }
    } catch (error) {
      console.error(`Error creating ETF holding:`, error);
      throw error;
    }
  }
  
  /**
   * Bulk import ETF holdings
   */
  async bulkCreateEtfHoldings(data: any[]) {
    if (!data || data.length === 0) {
      return [];
    }
    
    try {
      // Get the ETF symbol from the first item (assuming all items are for the same ETF)
      const etfSymbol = data[0].etfSymbol?.toUpperCase();
      
      if (!etfSymbol) {
        throw new Error('ETF symbol is required for bulk import');
      }
      
      // Map the data to the appropriate format, removing etfSymbol property
      const holdingsData = data.map(({ etfSymbol: _, ...item }) => sanitizeForDb(item));
      
      let result = [];
      
      // Insert into the appropriate table based on the ETF symbol
      if (etfSymbol === 'SPY') {
        result = await db.insert(etfHoldingsSPY).values(holdingsData).returning();
      } else if (etfSymbol === 'XIC') {
        result = await db.insert(etfHoldingsXIC).values(holdingsData).returning();
      } else if (etfSymbol === 'ACWX') {
        result = await db.insert(etfHoldingsACWX).values(holdingsData).returning();
      } else {
        throw new Error(`Unsupported ETF symbol: ${etfSymbol}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error bulk importing ETF holdings:`, error);
      throw error;
    }
  }
  
  /**
   * Get portfolio summary for a specific region
   */
  async getPortfolioSummary(region: string) {
    // Placeholder for actual implementation
    return { region, id: 1 };
  }
  
  /**
   * Create a new portfolio summary
   */
  async createPortfolioSummary(data: any) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }
  
  /**
   * Update a portfolio summary
   */
  async updatePortfolioSummary(id: number, data: any) {
    // Placeholder for actual implementation
    return { ...data, id };
  }
  
  /**
   * Delete upgrade/downgrade history for a specific symbol and region
   */
  async deleteUpgradeDowngradeHistory(symbol: string, region: string) {
    // Placeholder for actual implementation
    return true;
  }
  
  /**
   * Bulk create upgrade/downgrade history records
   */
  async bulkCreateUpgradeDowngradeHistory(data: any[]) {
    // Placeholder for actual implementation
    return data.map((item, index) => ({ ...item, id: index + 1 }));
  }
  
  /**
   * Get upgrade/downgrade history by region
   */
  async getUpgradeDowngradeHistoryByRegion(region: string, limit: number = 50) {
    // Placeholder for actual implementation
    return [];
  }
  
  /**
   * Get upgrade/downgrade history by symbol
   */
  async getUpgradeDowngradeHistoryBySymbol(symbol: string, region: string, limit: number = 50) {
    // Placeholder for actual implementation
    return [];
  }
  
  /**
   * Get matrix rules by action type
   */
  async getMatrixRules(actionType: string) {
    // Placeholder for actual implementation
    return [];
  }
  
  /**
   * Create a matrix rule
   */
  async createMatrixRule(data: any) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }
  
  /**
   * Bulk import matrix rules
   */
  async bulkImportMatrixRules(data: any[]) {
    // Placeholder for actual implementation
    return data.map((item, index) => ({ ...item, id: index + 1 }));
  }

  /**
   * Get all alerts
   */
  async getAlerts(activeOnly?: boolean) {
    // Placeholder for actual implementation
    return [];
  }

  /**
   * Get an alert by ID
   */
  async getAlert(id: number) {
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Create a new alert
   */
  async createAlert(data: any) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }

  /**
   * Update an alert
   */
  async updateAlert(id: number, data: any) {
    // Placeholder for actual implementation
    return { ...data, id };
  }

  /**
   * Delete an alert
   */
  async deleteAlert(id: number) {
    // Placeholder for actual implementation
    return true;
  }

  /**
   * Get historical prices
   */
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    // Placeholder for actual implementation
    return [];
  }

  /**
   * Get historical prices by region
   */
  async getHistoricalPricesByRegion(region: string, startDate?: Date, endDate?: Date) {
    // Placeholder for actual implementation
    return [];
  }

  /**
   * Create a historical price
   */
  async createHistoricalPrice(data: any) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }

  /**
   * Bulk create historical prices
   */
  // Method moved and improved at line ~840

  /**
   * Delete historical prices
   */
  async deleteHistoricalPrices(symbol: string, region: string) {
    // Placeholder for actual implementation
    return true;
  }

  /**
   * Get current prices
   */
  async getCurrentPrices(region: string) {
    try {
      const upperRegion = region.toUpperCase();
      const prices = await db.select().from(currentPrices)
        .where(eq(currentPrices.region, upperRegion));
      return prices;
    } catch (error) {
      console.error(`Error getting current prices for ${region}:`, error);
      return [];
    }
  }

  /**
   * Get current price
   */
  async getCurrentPrice(symbol: string, region: string) {
    try {
      const upperRegion = region.toUpperCase();
      const upperSymbol = symbol.toUpperCase();
      
      // First filter by region
      const regionPrices = await db.select().from(currentPrices)
        .where(eq(currentPrices.region, upperRegion));
      
      // Then filter by symbol (in memory)
      const prices = regionPrices.filter(p => p.symbol === upperSymbol);
      
      return prices.length > 0 ? prices[0] : null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol} in ${region}:`, error);
      return null;
    }
  }

  /**
   * Create a current price
   */
  async createCurrentPrice(data: any) {
    try {
      const [result] = await db.insert(currentPrices)
        .values(sanitizeForDb(data))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error creating current price:`, error);
      throw error;
    }
  }

  /**
   * Update a current price
   */
  async updateCurrentPrice(id: number, data: any) {
    try {
      const [result] = await db.update(currentPrices)
        .set(sanitizeForDb(data))
        .where(eq(currentPrices.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating current price with id ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a current price
   */
  async deleteCurrentPrice(id: number) {
    try {
      await db.delete(currentPrices)
        .where(eq(currentPrices.id, id));
      return true;
    } catch (error) {
      console.error(`Error deleting current price with id ${id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create current prices
   */
  async bulkCreateCurrentPrices(data: any[]) {
    if (!data || data.length === 0) {
      return [];
    }
    
    try {
      // Sanitize data for database insertion
      const sanitizedData = data.map(item => sanitizeForDb(item));
      
      // Insert all price records
      const result = await db.insert(currentPrices)
        .values(sanitizedData)
        .returning();
      
      return result;
    } catch (error) {
      console.error(`Error bulk creating current prices:`, error);
      throw error;
    }
  }

  /**
   * Get ETF holding by ID
   */
  async getEtfHolding(id: number) {
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Update an ETF holding
   */
  async updateEtfHolding(id: number, data: any) {
    // Placeholder for actual implementation
    return { ...data, id };
  }

  /**
   * Delete an ETF holding
   */
  async deleteEtfHolding(id: number) {
    // Placeholder for actual implementation
    return true;
  }

  // This method was replaced by the earlier getTopEtfHoldings implementation

  /**
   * Get a matrix rule by ID
   */
  async getMatrixRule(id: number) {
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Update a matrix rule
   */
  async updateMatrixRule(id: number, data: any) {
    // Placeholder for actual implementation
    return { ...data, id };
  }

  /**
   * Delete a matrix rule
   */
  async deleteMatrixRule(id: number) {
    // Placeholder for actual implementation
    return true;
  }

  /**
   * Get historical prices for a specific symbol and region with optional date range
   */
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      // Build the query based on provided filters
      let query = db.select().from(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region)
          )
        );
      
      // Add date range filters if provided
      if (startDate) {
        query = query.where(gte(historicalPrices.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(historicalPrices.date, endDate));
      }
      
      // Order by date ascending for time series data
      const result = await query.orderBy(asc(historicalPrices.date));
      return result;
    } catch (error) {
      console.error(`Error getting historical prices for ${symbol} (${region}):`, error);
      return [];
    }
  }
  
  /**
   * Get historical prices for a region with optional date range
   */
  async getHistoricalPricesByRegion(region: string, startDate?: Date, endDate?: Date) {
    try {
      // Build the query based on provided filters
      let query = db.select().from(historicalPrices)
        .where(eq(historicalPrices.region, region));
      
      // Add date range filters if provided
      if (startDate) {
        query = query.where(gte(historicalPrices.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(historicalPrices.date, endDate));
      }
      
      // Order by date ascending for time series data
      const result = await query.orderBy(asc(historicalPrices.date));
      return result;
    } catch (error) {
      console.error(`Error getting historical prices for region ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Get historical prices for multiple symbols in a region with optional date range
   */
  async getHistoricalPricesBySymbols(symbols: string[], region: string, startDate?: Date, endDate?: Date) {
    try {
      if (!symbols || symbols.length === 0) {
        return [];
      }
      
      // Build the query based on provided filters
      let query = db.select().from(historicalPrices)
        .where(
          and(
            inArray(historicalPrices.symbol, symbols),
            eq(historicalPrices.region, region)
          )
        );
      
      // Add date range filters if provided
      if (startDate) {
        query = query.where(gte(historicalPrices.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(historicalPrices.date, endDate));
      }
      
      // Order by date ascending for time series data
      const result = await query.orderBy(asc(historicalPrices.date));
      return result;
    } catch (error) {
      console.error(`Error getting historical prices for symbols in ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Create a historical price record
   */
  async createHistoricalPrice(data: any) {
    try {
      const [result] = await db.insert(historicalPrices).values(sanitizeForDb(data)).returning();
      return result;
    } catch (error) {
      console.error('Error creating historical price:', error);
      throw error;
    }
  }
  
  /**
   * Bulk create historical price records
   */
  async bulkCreateHistoricalPrices(data: any[]) {
    try {
      if (data.length === 0) {
        return [];
      }

      // Process data for insertion
      const processedData = data.map(item => sanitizeForDb(item));
      
      // Handle duplicate entries by using a custom ON CONFLICT approach
      // Using raw SQL with drizzle for upsert operation
      // This will update records if they already exist or insert if they don't
      const query = `
        INSERT INTO historical_prices (symbol, date, open, high, low, close, volume, adjusted_close, region)
        VALUES ${processedData.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`).join(', ')}
        ON CONFLICT (symbol, date, region) DO UPDATE SET
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          adjusted_close = EXCLUDED.adjusted_close,
          updated_at = NOW()
        RETURNING *;
      `;
      
      // Flatten the values for the SQL query
      const values = processedData.flatMap(item => [
        item.symbol, 
        item.date, 
        item.open, 
        item.high, 
        item.low, 
        item.close, 
        item.volume, 
        item.adjustedClose, 
        item.region
      ]);
      
      // Execute the query
      const results = await db.execute(sql.raw(query, values));
      return results.rows;
    } catch (error) {
      // If the error is about a missing constraint, log it and use standard insert instead
      if (error.message?.includes('constraint "historical_prices_symbol_date_region_key" does not exist')) {
        console.warn('Unique constraint doesn\'t exist, falling back to standard insert');
        // Process data for insertion
        const processedData = data.map(item => sanitizeForDb(item));
        
        // Use standard insert
        const results = await db.insert(historicalPrices).values(processedData).returning();
        return results;
      }
      
      console.error('Error bulk creating historical prices:', error);
      throw error;
    }
  }
  
  /**
   * Delete historical prices for a symbol and region
   */
  async deleteHistoricalPrices(symbol: string, region: string) {
    try {
      await db.delete(historicalPrices)
        .where(
          and(
            eq(historicalPrices.symbol, symbol),
            eq(historicalPrices.region, region)
          )
        );
      return true;
    } catch (error) {
      console.error(`Error deleting historical prices for ${symbol} (${region}):`, error);
      return false;
    }
  }

  /**
   * Get stocks by region
   */
  async getStocksByRegion(region: string) {
    try {
      const upperRegion = region.toUpperCase();
      let result = [];
      
      if (upperRegion === 'USD') {
        result = await db.select().from(portfolioUSD);
      } else if (upperRegion === 'CAD') {
        result = await db.select().from(portfolioCAD);
      } else if (upperRegion === 'INTL') {
        result = await db.select().from(portfolioINTL);
      } else {
        throw new Error(`Unknown region: ${region}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting stocks for region ${region}:`, error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  async getUser(id: number) {
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string) {
    // Placeholder for actual implementation
    return null;
  }

  /**
   * Create a user
   */
  async createUser(data: any) {
    // Placeholder for actual implementation
    return { ...data, id: 1 };
  }
}

// Export a singleton instance
export const storage = new DatabaseStorage();
import { db, sanitizeForDb } from './db';
import { desc, eq, and } from 'drizzle-orm';
import { 
  etfHoldingsSPY, 
  etfHoldingsXIC, 
  etfHoldingsACWX,
  assetsUS,
  assetsCAD,
  assetsINTL,
  currentPrices
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
        // Query the assets_us table
        result = await db.select().from(assetsUS);
      } else if (upperRegion === 'CAD') {
        // Query the assets_cad table
        result = await db.select().from(assetsCAD);
      } else if (upperRegion === 'INTL') {
        // Query the assets_intl table
        result = await db.select().from(assetsINTL);
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
        [result] = await db.select().from(assetsUS).where(eq(assetsUS.id, id));
      } else if (upperRegion === 'CAD') {
        [result] = await db.select().from(assetsCAD).where(eq(assetsCAD.id, id));
      } else if (upperRegion === 'INTL') {
        [result] = await db.select().from(assetsINTL).where(eq(assetsINTL.id, id));
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
        results = await db.insert(assetsUS).values(processedData).returning();
      } else if (upperRegion === 'CAD') {
        results = await db.insert(assetsCAD).values(processedData).returning();
      } else if (upperRegion === 'INTL') {
        results = await db.insert(assetsINTL).values(processedData).returning();
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
          await tx.delete(assetsUS);
          
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
            return await tx.insert(assetsUS).values(processedStocks).returning();
          }
        } else if (upperRegion === 'CAD') {
          await tx.delete(assetsCAD);
          
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
            
            return await tx.insert(assetsCAD).values(processedStocks).returning();
          }
        } else if (upperRegion === 'INTL') {
          await tx.delete(assetsINTL);
          
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
            
            return await tx.insert(assetsINTL).values(processedStocks).returning();
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
  async bulkCreateHistoricalPrices(data: any[]) {
    // Placeholder for actual implementation
    return data.map((item, index) => ({ ...item, id: index + 1 }));
  }

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
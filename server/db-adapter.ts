/**
 * Database Adapter
 * 
 * This adapter provides backward compatibility for existing API endpoints
 * while using the new database schema with regional portfolio tables.
 */

import { db } from './db';
import { 
  portfolioUSD,
  portfolioCAD,
  portfolioINTL,
  marketIndices,
  currentPrices,
  historicalPrices,
  earnings,
  earningsCalendar,
  alerts,
  matrixRules,
  portfolioSummaries,
  upgradeDowngradeHistory,
  dataUpdateLogs
} from '../shared/schema';
import { 
  adaptPortfolioData,
  LegacyPortfolioItem
} from './adapters/portfolio-adapter';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Enhanced DatabaseAdapter class that works with new DB schema
 * but maintains backward compatibility with existing API
 */
export class DatabaseAdapter {
  
  /**
   * Adapt portfolio data with purchase price support
   */
  async adaptPortfolioDataWithPurchasePrice(data: any[], region: string): Promise<LegacyPortfolioItem[]> {
    if (!data.length) return [];
    
    // Get symbols for all stocks
    const symbols = data.map(item => item.symbol);
    
    // Get current prices
    const prices = await db.select().from(currentPrices)
      .where(eq(currentPrices.region, region));
    
    const priceMap: Record<string, any> = {};
    prices.forEach(price => {
      if (symbols.includes(price.symbol)) {
        priceMap[price.symbol] = price;
      }
    });
    
    // Calculate total portfolio value
    let totalPortfolioValue = 0;
    data.forEach(item => {
      const quantity = Number(item.quantity);
      const currentPriceInfo = priceMap[item.symbol];
      const currentPrice = currentPriceInfo?.regularMarketPrice 
        ? Number(currentPriceInfo.regularMarketPrice) 
        : 0;
      
      totalPortfolioValue += quantity * currentPrice;
    });
    
    // Map each stock to legacy format
    return data.map(item => {
      const quantity = Number(item.quantity);
      // Convert string to number if needed - this fixes the data flow issue
      const purchasePrice = item.purchasePrice !== null && item.purchasePrice !== undefined
        ? Number(item.purchasePrice) 
        : undefined;
      

      const currentPriceInfo = priceMap[item.symbol];
      const currentPrice = currentPriceInfo?.regularMarketPrice 
        ? Number(currentPriceInfo.regularMarketPrice) 
        : 0;
      
      const nav = quantity * currentPrice;
      const portfolioWeight = totalPortfolioValue > 0 
        ? (nav / totalPortfolioValue) * 100 
        : 0;
      
      const dailyChange = currentPriceInfo?.regularMarketChangePercent 
        ? Number(currentPriceInfo.regularMarketChangePercent) 
        : 0;
      
      // Calculate profit/loss using purchase price if available
      const profitLoss = purchasePrice && currentPrice
        ? (currentPrice - purchasePrice) * quantity
        : 0;
      
      return {
        id: item.id,
        symbol: item.symbol,
        company: item.company,
        stockType: item.stockType,
        rating: item.rating,
        sector: item.sector || 'Technology',
        quantity: quantity,
        price: purchasePrice || 0,
        purchasePrice: purchasePrice,
        netAssetValue: nav,
        portfolioPercentage: portfolioWeight,
        dailyChangePercent: dailyChange,
        profitLoss: profitLoss,
        mtdChangePercent: 0, // TODO: Calculate MTD change
        ytdChangePercent: 0, // TODO: Calculate YTD change  
        sixMonthChangePercent: 0, // TODO: Calculate 6M change
        fiftyTwoWeekChangePercent: 0, // TODO: Calculate 52W change
        dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
        nextEarningsDate: undefined,
      };
    });
  }
  
  /**
   * Get portfolio stocks for a specific region
   */
  async getPortfolioStocks(region: string): Promise<LegacyPortfolioItem[]> {
    try {
      console.log(`Getting portfolio stocks for ${region} (using portfolio tables)`);
      let portfolioData: any[] = [];
      
      switch (region.toUpperCase()) {
        case 'USD':
          portfolioData = await db.select().from(portfolioUSD);
          break;
        case 'CAD':
          portfolioData = await db.select().from(portfolioCAD);
          break;
        case 'INTL':
          portfolioData = await db.select().from(portfolioINTL);
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      // CRITICAL FIX: Normalize column names immediately after DB fetch
      // CAD/INTL tables use snake_case (purchase_price), USD uses camelCase (purchasePrice)
      const normalizedData = portfolioData.map(item => ({
        ...item,
        purchasePrice: item.purchase_price || item.purchasePrice,
        stockType: item.stock_type || item.stockType
      }));
      

      
      // Use a clean integrated approach instead of multiple adapters
      console.log(`🚀 DB-ADAPTER: Starting integrated approach for ${region}`);
      const { performanceService } = await import('./services/performance-calculation-service');
      console.log(`✅ DB-ADAPTER: Performance service imported successfully`);
      
      // Get symbols for performance calculation
      const symbols = normalizedData.map(item => item.symbol);
      console.log(`📋 DB-ADAPTER: Extracted ${symbols.length} symbols:`, symbols.slice(0, 3));
      
      // Get current prices
      const currentPricesQuery = await db
        .select()
        .from(currentPrices)
        .where(eq(currentPrices.region, region));
      
      const priceMap: Record<string, any> = {};
      currentPricesQuery.forEach(price => {
        priceMap[price.symbol] = {
          regularMarketPrice: price.regularMarketPrice,
          regularMarketChangePercent: price.regularMarketChangePercent,
          dividendYield: price.dividendYield
        };
      });
      
      // Calculate performance metrics for all stocks in a single batch
      console.log(`🔥 DB-ADAPTER ${region}: CALLING BATCH PERFORMANCE CALCULATION FOR ${symbols.length} STOCKS 🔥`);
      console.log(`🔍 DB-ADAPTER: Symbols being passed:`, symbols.slice(0, 3));
      const performanceMetricsMap = await performanceService.calculateBatchPerformanceMetrics(
        symbols,
        region
      );
      
      // Calculate total portfolio value
      let totalPortfolioValue = 0;
      normalizedData.forEach(item => {
        const quantity = Number(item.quantity);
        const currentPrice = priceMap[item.symbol]?.regularMarketPrice 
          ? Number(priceMap[item.symbol].regularMarketPrice) 
          : (Number(item.purchasePrice) || 0);
        totalPortfolioValue += (quantity * currentPrice);
      });
      
      // Transform to legacy format with performance metrics
      const result = normalizedData.map(item => {
        const quantity = Number(item.quantity);
        const purchasePrice = Number(item.purchasePrice) || undefined;
        const currentPriceInfo = priceMap[item.symbol];
        const currentPrice = currentPriceInfo?.regularMarketPrice 
          ? Number(currentPriceInfo.regularMarketPrice) 
          : (purchasePrice || 0);
        
        const nav = quantity * currentPrice;
        const portfolioWeight = totalPortfolioValue > 0 ? (nav / totalPortfolioValue) * 100 : 0;
        const dailyChange = currentPriceInfo?.regularMarketChangePercent 
          ? Number(currentPriceInfo.regularMarketChangePercent) 
          : undefined;
        
        const performanceMetrics = performanceMetricsMap[item.symbol] || {
          mtdReturn: undefined,
          ytdReturn: undefined,
          sixMonthReturn: undefined,
          fiftyTwoWeekReturn: undefined
        };
        
        return {
          id: item.id,
          symbol: item.symbol,
          company: item.company,
          stockType: item.stockType || item.stock_type,
          rating: item.rating,
          sector: item.sector || 'Technology',
          quantity: quantity,
          price: currentPrice,
          purchasePrice: purchasePrice,
          netAssetValue: nav,
          portfolioPercentage: portfolioWeight,
          dailyChangePercent: dailyChange,
          mtdChangePercent: performanceMetrics.mtdReturn,
          ytdChangePercent: performanceMetrics.ytdReturn,
          sixMonthChangePercent: performanceMetrics.sixMonthReturn,
          fiftyTwoWeekChangePercent: performanceMetrics.fiftyTwoWeekReturn,
          dividendYield: currentPriceInfo?.dividendYield ? Number(currentPriceInfo.dividendYield) : undefined,
          profitLoss: 0,
          nextEarningsDate: undefined,
        };
      });
      
      return result;
    } catch (error) {
      console.error(`Error getting portfolio stocks for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific portfolio stock by ID
   */
  async getPortfolioStock(id: number, region?: string): Promise<LegacyPortfolioItem | null> {
    try {
      if (!region) {
        // Try all regions if not specified
        for (const r of ['USD', 'CAD', 'INTL']) {
          const stock = await this.getPortfolioStock(id, r);
          if (stock) return stock;
        }
        return null;
      }
      
      let portfolioItem: any = null;
      
      switch (region.toUpperCase()) {
        case 'USD':
          const usdItem = await db.select().from(portfolioUSD).where(eq(portfolioUSD.id, id));
          portfolioItem = usdItem.length > 0 ? usdItem[0] : null;
          break;
        case 'CAD':
          const cadItem = await db.select().from(portfolioCAD).where(eq(portfolioCAD.id, id));
          portfolioItem = cadItem.length > 0 ? cadItem[0] : null;
          break;
        case 'INTL':
          const intlItem = await db.select().from(portfolioINTL).where(eq(portfolioINTL.id, id));
          portfolioItem = intlItem.length > 0 ? intlItem[0] : null;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      if (!portfolioItem) return null;
      
      // Transform to legacy format
      const adaptedData = await adaptPortfolioData([portfolioItem], region);
      return adaptedData.length > 0 ? adaptedData[0] : null;
    } catch (error) {
      console.error(`Error getting portfolio stock ${id} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific portfolio stock by symbol
   */
  async getPortfolioStockBySymbol(symbol: string, region: string): Promise<LegacyPortfolioItem | null> {
    try {
      let portfolioItem: any = null;
      
      switch (region.toUpperCase()) {
        case 'USD':
          const usdItem = await db.select().from(portfolioUSD).where(eq(portfolioUSD.symbol, symbol));
          portfolioItem = usdItem.length > 0 ? usdItem[0] : null;
          break;
        case 'CAD':
          const cadItem = await db.select().from(portfolioCAD).where(eq(portfolioCAD.symbol, symbol));
          portfolioItem = cadItem.length > 0 ? cadItem[0] : null;
          break;
        case 'INTL':
          const intlItem = await db.select().from(portfolioINTL).where(eq(portfolioINTL.symbol, symbol));
          portfolioItem = intlItem.length > 0 ? intlItem[0] : null;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      if (!portfolioItem) return null;
      
      // Transform to legacy format
      const adaptedData = await adaptPortfolioData([portfolioItem], region);
      return adaptedData.length > 0 ? adaptedData[0] : null;
    } catch (error) {
      console.error(`Error getting portfolio stock ${symbol} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Create a new portfolio stock
   */
  async createPortfolioStock(data: any, region?: string): Promise<LegacyPortfolioItem> {
    try {
      if (!region) {
        throw new Error('Region is required when creating a portfolio stock');
      }
      
      let createdItem: any = null;
      
      switch (region.toUpperCase()) {
        case 'USD':
          const [usdItem] = await db.insert(portfolioUSD).values(data).returning();
          createdItem = usdItem;
          break;
        case 'CAD':
          // Add .TO suffix if it's not present and not an ETF
          if (data.symbol && !data.symbol.includes('.') && data.stockType !== 'ETF' && data.stockType !== 'Cash') {
            data.symbol = `${data.symbol}.TO`;
          }
          const [cadItem] = await db.insert(portfolioCAD).values(data).returning();
          createdItem = cadItem;
          break;
        case 'INTL':
          const [intlItem] = await db.insert(portfolioINTL).values(data).returning();
          createdItem = intlItem;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      // Transform to legacy format
      const adaptedData = await adaptPortfolioData([createdItem], region);
      return adaptedData[0];
    } catch (error) {
      console.error(`Error creating portfolio stock (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Update a portfolio stock
   */
  async updatePortfolioStock(id: number, data: any, region?: string): Promise<LegacyPortfolioItem | null> {
    try {
      if (!region) {
        throw new Error('Region is required when updating a portfolio stock');
      }
      
      let updatedItem: any = null;
      
      switch (region.toUpperCase()) {
        case 'USD':
          const [usdItem] = await db.update(portfolioUSD)
            .set(data)
            .where(eq(portfolioUSD.id, id))
            .returning();
          updatedItem = usdItem;
          break;
        case 'CAD':
          // Add .TO suffix if it's not present and not an ETF
          if (data.symbol && !data.symbol.includes('.') && data.stockType !== 'ETF' && data.stockType !== 'Cash') {
            data.symbol = `${data.symbol}.TO`;
          }
          const [cadItem] = await db.update(portfolioCAD)
            .set(data)
            .where(eq(portfolioCAD.id, id))
            .returning();
          updatedItem = cadItem;
          break;
        case 'INTL':
          const [intlItem] = await db.update(portfolioINTL)
            .set(data)
            .where(eq(portfolioINTL.id, id))
            .returning();
          updatedItem = intlItem;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      if (!updatedItem) return null;
      
      // Transform to legacy format
      const adaptedData = await adaptPortfolioData([updatedItem], region);
      return adaptedData[0];
    } catch (error) {
      console.error(`Error updating portfolio stock ${id} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Delete a portfolio stock
   */
  async deletePortfolioStock(id: number, region?: string): Promise<boolean> {
    try {
      if (!region) {
        throw new Error('Region is required when deleting a portfolio stock');
      }
      
      let deleted = false;
      
      switch (region.toUpperCase()) {
        case 'USD':
          const usdResult = await db.delete(portfolioUSD)
            .where(eq(portfolioUSD.id, id))
            .returning();
          deleted = usdResult.length > 0;
          break;
        case 'CAD':
          const cadResult = await db.delete(portfolioCAD)
            .where(eq(portfolioCAD.id, id))
            .returning();
          deleted = cadResult.length > 0;
          break;
        case 'INTL':
          const intlResult = await db.delete(portfolioINTL)
            .where(eq(portfolioINTL.id, id))
            .returning();
          deleted = intlResult.length > 0;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`Error deleting portfolio stock ${id} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Bulk import portfolio stocks
   */
  async bulkCreatePortfolioStocks(data: any[], region?: string): Promise<LegacyPortfolioItem[]> {
    try {
      if (!region) {
        throw new Error('Region is required for bulk import');
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Process CAD symbols if needed
      if (region.toUpperCase() === 'CAD') {
        data = data.map(item => {
          if (item.symbol && !item.symbol.includes('.') && item.stockType !== 'ETF' && item.stockType !== 'Cash') {
            return { ...item, symbol: `${item.symbol}.TO` };
          }
          return item;
        });
      }
      
      let createdItems: any[] = [];
      
      switch (region.toUpperCase()) {
        case 'USD':
          createdItems = await db.insert(portfolioUSD).values(data).returning();
          break;
        case 'CAD':
          createdItems = await db.insert(portfolioCAD).values(data).returning();
          break;
        case 'INTL':
          createdItems = await db.insert(portfolioINTL).values(data).returning();
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      // Transform to legacy format
      return await adaptPortfolioData(createdItems, region);
    } catch (error) {
      console.error(`Error bulk creating portfolio stocks (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Rebalance portfolio by smartly updating existing stocks and preserving purchase prices
   */
  async updateDatabaseRows(updates: any[], region: string): Promise<void> {
    try {
      // Get the appropriate portfolio table
      let portfolioTable: any;
      switch (region.toUpperCase()) {
        case 'USD':
          portfolioTable = portfolioUSD;
          break;
        case 'CAD':
          portfolioTable = portfolioCAD;
          break;
        case 'INTL':
          portfolioTable = portfolioINTL;
          break;
        default:
          throw new Error(`Invalid region: ${region}`);
      }
      
      console.log(`🔄 DATABASE UPDATE: Processing ${updates.length} changes in portfolio_${region}`);
      
      // Update each row with only the changed fields
      for (const update of updates) {
        const { id, ...changes } = update;
        
        if (Object.keys(changes).length > 0) {
          console.log(`Updating row ${id}:`, changes);
          
          await db
            .update(portfolioTable)
            .set(changes)
            .where(eq(portfolioTable.id, id));
        }
      }
      
      console.log(`✅ DATABASE UPDATE: Successfully updated ${updates.length} rows`);
    } catch (error) {
      console.error(`❌ Database update failed:`, error);
      throw error;
    }
  }
  
  /**
   * Get ETF holdings for a specific symbol
   */
  async getEtfHoldings(symbol: string, limit?: number) {
    // Note: This remains unchanged as ETF holdings are stored separately
    try {
      // Placeholder - implement actual ETF holdings retrieval based on symbol
      return []; // Return empty array for now
    } catch (error) {
      console.error(`Error getting ETF holdings for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get portfolio summary for a specific region
   */
  async getPortfolioSummary(region: string) {
    try {
      const summary = await db.select()
        .from(portfolioSummaries)
        .where(eq(portfolioSummaries.region, region.toUpperCase()));
      
      return summary.length > 0 ? summary[0] : null;
    } catch (error) {
      console.error(`Error getting portfolio summary for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Update portfolio summary
   */
  async updatePortfolioSummary(id: number, data: any) {
    try {
      const [updated] = await db.update(portfolioSummaries)
        .set(data)
        .where(eq(portfolioSummaries.id, id))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating portfolio summary ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create portfolio summary
   */
  async createPortfolioSummary(data: any) {
    try {
      const [created] = await db.insert(portfolioSummaries)
        .values(data)
        .returning();
      
      return created;
    } catch (error) {
      console.error(`Error creating portfolio summary:`, error);
      throw error;
    }
  }
  
  /**
   * Get current prices for a region
   */
  async getCurrentPrices(region: string) {
    try {
      return await db.select()
        .from(currentPrices)
        .where(eq(currentPrices.region, region.toUpperCase()));
    } catch (error) {
      console.error(`Error getting current prices for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Get current price for a specific symbol and region
   */
  async getCurrentPrice(symbol: string, region: string) {
    try {
      const price = await db.select()
        .from(currentPrices)
        .where(and(
          eq(currentPrices.symbol, symbol),
          eq(currentPrices.region, region.toUpperCase())
        ));
      
      return price.length > 0 ? price[0] : null;
    } catch (error) {
      console.error(`Error getting current price for ${symbol} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Get historical prices
   */
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date) {
    try {
      const conditions = [
        eq(historicalPrices.symbol, symbol),
        eq(historicalPrices.region, region.toUpperCase())
      ];
      
      if (startDate) {
        conditions.push(gte(historicalPrices.date, startDate.toISOString().split('T')[0]));
      }
      
      if (endDate) {
        conditions.push(lte(historicalPrices.date, endDate.toISOString().split('T')[0]));
      }
      
      return await db.select()
        .from(historicalPrices)
        .where(and(...conditions))
        .orderBy(historicalPrices.date);
    } catch (error) {
      console.error(`Error getting historical prices for ${symbol} (${region}):`, error);
      throw error;
    }
  }
  
  /**
   * Get alerts
   */
  async getAlerts(activeOnly?: boolean) {
    try {
      if (activeOnly) {
        return await db.select()
          .from(alerts)
          .where(eq(alerts.isActive, true))
          .orderBy(desc(alerts.createdAt));
      }
      
      return await db.select()
        .from(alerts)
        .orderBy(desc(alerts.createdAt));
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }
  
  /**
   * Get matrix rules by action type
   */
  async getMatrixRules(actionType: string) {
    try {
      return await db.select()
        .from(matrixRules)
        .where(eq(matrixRules.actionType, actionType))
        .orderBy(matrixRules.orderNumber);
    } catch (error) {
      console.error(`Error getting matrix rules for ${actionType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get earnings data
   */
  async getEarningsData(region: string, startDate?: Date, endDate?: Date, limit: number = 50) {
    try {
      const conditions = [eq(earnings.region, region.toUpperCase())];
      
      if (startDate) {
        conditions.push(gte(earnings.reportDate, startDate.toISOString().split('T')[0]));
      }
      
      if (endDate) {
        conditions.push(lte(earnings.reportDate, endDate.toISOString().split('T')[0]));
      }
      
      return await db.select()
        .from(earnings)
        .where(and(...conditions))
        .orderBy(desc(earnings.reportDate))
        .limit(limit);
    } catch (error) {
      console.error(`Error getting earnings data for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Get earnings calendar
   */
  async getEarningsCalendar(startDate?: Date, endDate?: Date, region?: string) {
    try {
      const conditions = [];
      
      if (region) {
        conditions.push(eq(earningsCalendar.region, region.toUpperCase()));
      }
      
      if (startDate) {
        conditions.push(gte(earningsCalendar.earningsDate, startDate.toISOString().split('T')[0]));
      }
      
      if (endDate) {
        conditions.push(lte(earningsCalendar.earningsDate, endDate.toISOString().split('T')[0]));
      }
      
      if (conditions.length > 0) {
        return await db.select()
          .from(earningsCalendar)
          .where(and(...conditions))
          .orderBy(earningsCalendar.earningsDate);
      }
      
      return await db.select()
        .from(earningsCalendar)
        .orderBy(earningsCalendar.earningsDate);
    } catch (error) {
      console.error('Error getting earnings calendar:', error);
      throw error;
    }
  }
  
  /**
   * Get market indices
   */
  async getMarketIndices(region?: string) {
    try {
      if (region) {
        return await db.select()
          .from(marketIndices)
          .where(eq(marketIndices.region, region.toUpperCase()));
      }
      
      return await db.select().from(marketIndices);
    } catch (error) {
      console.error('Error getting market indices:', error);
      throw error;
    }
  }
  
  /**
   * Get data update logs
   */
  async getDataUpdateLogs(limit: number = 50) {
    try {
      return await db.select()
        .from(dataUpdateLogs)
        .orderBy(desc(dataUpdateLogs.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting data update logs:', error);
      throw error;
    }
  }
  
  /**
   * Log a data update
   */
  async logDataUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', details?: string) {
    try {
      const [log] = await db.insert(dataUpdateLogs)
        .values({
          type,
          status,
          details,
          timestamp: new Date()
        })
        .returning();
      
      return log;
    } catch (error) {
      console.error('Error logging data update:', error);
      throw error;
    }
  }

  /**
   * Rebalance portfolio by replacing all stocks
   */
  async rebalancePortfolio(stocks: any[], region: string) {
    const regionUpper = region.toUpperCase();
    const portfolioTable = regionUpper === 'USD' ? portfolioUSD 
      : regionUpper === 'CAD' ? portfolioCAD 
      : portfolioINTL;

    try {
      // Begin transaction by deleting all existing stocks
      await db.delete(portfolioTable);
      
      // Insert new stocks
      const newStocks = stocks.map(stock => ({
        symbol: stock.symbol,
        company: stock.company,
        stockType: stock.stockType,
        rating: stock.rating,
        sector: stock.sector || null,
        quantity: stock.quantity,
        purchasePrice: stock.purchasePrice,
      }));

      const inserted = await db.insert(portfolioTable)
        .values(newStocks)
        .returning();
      
      return inserted;
    } catch (error) {
      console.error(`Error rebalancing ${region} portfolio:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const dbAdapter = new DatabaseAdapter();
import { 
  users, type User, type InsertUser,
  assetsUS, type AssetsUS, type InsertAssetsUS,
  assetsCAD, type AssetsCAD, type InsertAssetsCAD,
  assetsINTL, type AssetsINTL, type InsertAssetsINTL,
  etfHoldingsSPY, type EtfHoldingsSPY, type InsertEtfHoldingsSPY,
  etfHoldingsXIC, type EtfHoldingsXIC, type InsertEtfHoldingsXIC,
  etfHoldingsACWX, type EtfHoldingsACWX, type InsertEtfHoldingsACWX,
  historicalPrices, type HistoricalPrice, type InsertHistoricalPrice,
  matrixRules, type MatrixRule, type InsertMatrixRule,
  alerts, type Alert, type InsertAlert,
  portfolioSummaries, type PortfolioSummary, type InsertPortfolioSummary,
  currentPrices, type CurrentPrice, type InsertCurrentPrice,
  upgradeDowngradeHistory, type UpgradeDowngradeHistory, type InsertUpgradeDowngradeHistory
} from "@shared/schema";
import { db, sanitizeForDb } from "./db";
import { eq, desc, and, sql, lt, gt, lte, gte, isNull, not } from "drizzle-orm";

// Import compatibility types for transitioning
import { PortfolioStock, InsertPortfolioStock, EtfHolding, InsertEtfHolding } from "./types";
import { IStorage } from "./storage";

/**
 * Implementation of the IStorage interface using PostgreSQL database
 */
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Portfolio stock methods
  async getPortfolioStocks(region: string): Promise<PortfolioStock[]> {
    try {
      let stocks: PortfolioStock[] = [];
      
      if (region === 'USD') {
        const usStocks = await db.select().from(assetsUS);
        stocks = usStocks.map(stock => this.mapAssetsUSToPortfolioStock(stock));
      } else if (region === 'CAD') {
        const cadStocks = await db.select().from(assetsCAD);
        stocks = cadStocks.map(stock => this.mapAssetsCADToPortfolioStock(stock));
      } else if (region === 'INTL') {
        const intlStocks = await db.select().from(assetsINTL);
        stocks = intlStocks.map(stock => this.mapAssetsINTLToPortfolioStock(stock));
      }
      
      // Sort alphabetically by symbol
      return stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } catch (error) {
      console.error("Error in getPortfolioStocks:", error);
      return [];
    }
  }

  async getPortfolioStock(id: number): Promise<PortfolioStock | undefined> {
    try {
      // We need to try each table since we don't know which one contains the stock
      // First try US
      const [usStock] = await db.select().from(assetsUS).where(eq(assetsUS.id, id));
      if (usStock) {
        return this.mapAssetsUSToPortfolioStock(usStock);
      }
      
      // Then try CAD
      const [cadStock] = await db.select().from(assetsCAD).where(eq(assetsCAD.id, id));
      if (cadStock) {
        return this.mapAssetsCADToPortfolioStock(cadStock);
      }
      
      // Finally try INTL
      const [intlStock] = await db.select().from(assetsINTL).where(eq(assetsINTL.id, id));
      if (intlStock) {
        return this.mapAssetsINTLToPortfolioStock(intlStock);
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getPortfolioStock:", error);
      return undefined;
    }
  }

  async getPortfolioStockBySymbol(symbol: string, region: string): Promise<PortfolioStock | undefined> {
    try {
      if (region === 'USD') {
        const [stock] = await db.select().from(assetsUS).where(eq(assetsUS.symbol, symbol));
        return stock ? this.mapAssetsUSToPortfolioStock(stock) : undefined;
      } else if (region === 'CAD') {
        const [stock] = await db.select().from(assetsCAD).where(eq(assetsCAD.symbol, symbol));
        return stock ? this.mapAssetsCADToPortfolioStock(stock) : undefined;
      } else if (region === 'INTL') {
        const [stock] = await db.select().from(assetsINTL).where(eq(assetsINTL.symbol, symbol));
        return stock ? this.mapAssetsINTLToPortfolioStock(stock) : undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getPortfolioStockBySymbol:", error);
      return undefined;
    }
  }

  async createPortfolioStock(stock: InsertPortfolioStock): Promise<PortfolioStock> {
    // Determine which table to insert into based on the region
    if (stock.region === 'USD') {
      const insertData: InsertAssetsUS = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [created] = await db.insert(assetsUS).values(sanitizeForDb(insertData)).returning();
      return this.mapAssetsUSToPortfolioStock(created);
    } else if (stock.region === 'CAD') {
      const insertData: InsertAssetsCAD = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [created] = await db.insert(assetsCAD).values(sanitizeForDb(insertData)).returning();
      return this.mapAssetsCADToPortfolioStock(created);
    } else if (stock.region === 'INTL') {
      const insertData: InsertAssetsINTL = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [created] = await db.insert(assetsINTL).values(sanitizeForDb(insertData)).returning();
      return this.mapAssetsINTLToPortfolioStock(created);
    }
    
    throw new Error(`Unsupported region: ${stock.region}`);
  }

  async updatePortfolioStock(id: number, stock: Partial<InsertPortfolioStock>): Promise<PortfolioStock | undefined> {
    // We need to find the stock first to determine which table to update
    const existingStock = await this.getPortfolioStock(id);
    if (!existingStock) {
      return undefined;
    }
    
    if (existingStock.region === 'USD') {
      const updateData: Partial<InsertAssetsUS> = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
        pbr: stock.price ? parseFloat(stock.price) : undefined,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [updated] = await db
        .update(assetsUS)
        .set(sanitizeForDb(updateData))
        .where(eq(assetsUS.id, id))
        .returning();
      
      return updated ? this.mapAssetsUSToPortfolioStock(updated) : undefined;
    } else if (existingStock.region === 'CAD') {
      const updateData: Partial<InsertAssetsCAD> = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
        pbr: stock.price ? parseFloat(stock.price) : undefined,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [updated] = await db
        .update(assetsCAD)
        .set(sanitizeForDb(updateData))
        .where(eq(assetsCAD.id, id))
        .returning();
      
      return updated ? this.mapAssetsCADToPortfolioStock(updated) : undefined;
    } else if (existingStock.region === 'INTL') {
      const updateData: Partial<InsertAssetsINTL> = {
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
        pbr: stock.price ? parseFloat(stock.price) : undefined,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      };
      
      const [updated] = await db
        .update(assetsINTL)
        .set(sanitizeForDb(updateData))
        .where(eq(assetsINTL.id, id))
        .returning();
      
      return updated ? this.mapAssetsINTLToPortfolioStock(updated) : undefined;
    }
    
    return undefined;
  }

  async deletePortfolioStock(id: number): Promise<boolean> {
    // We need to find the stock first to determine which table to delete from
    const existingStock = await this.getPortfolioStock(id);
    if (!existingStock) {
      return false;
    }
    
    if (existingStock.region === 'USD') {
      const [deleted] = await db.delete(assetsUS).where(eq(assetsUS.id, id)).returning();
      return !!deleted;
    } else if (existingStock.region === 'CAD') {
      const [deleted] = await db.delete(assetsCAD).where(eq(assetsCAD.id, id)).returning();
      return !!deleted;
    } else if (existingStock.region === 'INTL') {
      const [deleted] = await db.delete(assetsINTL).where(eq(assetsINTL.id, id)).returning();
      return !!deleted;
    }
    
    return false;
  }

  async bulkCreatePortfolioStocks(stocks: InsertPortfolioStock[]): Promise<PortfolioStock[]> {
    if (stocks.length === 0) return [];
    
    // Group stocks by region
    const usdStocks: InsertPortfolioStock[] = [];
    const cadStocks: InsertPortfolioStock[] = [];
    const intlStocks: InsertPortfolioStock[] = [];
    
    stocks.forEach(stock => {
      if (stock.region === 'USD') {
        usdStocks.push(stock);
      } else if (stock.region === 'CAD') {
        cadStocks.push(stock);
      } else if (stock.region === 'INTL') {
        intlStocks.push(stock);
      }
    });
    
    const results: PortfolioStock[] = [];
    
    // Process USD stocks
    if (usdStocks.length > 0) {
      const insertData = usdStocks.map(stock => ({
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      }));
      
      const created = await db.insert(assetsUS).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(stock => this.mapAssetsUSToPortfolioStock(stock)));
    }
    
    // Process CAD stocks
    if (cadStocks.length > 0) {
      const insertData = cadStocks.map(stock => ({
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      }));
      
      const created = await db.insert(assetsCAD).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(stock => this.mapAssetsCADToPortfolioStock(stock)));
    }
    
    // Process INTL stocks
    if (intlStocks.length > 0) {
      const insertData = intlStocks.map(stock => ({
        symbol: stock.symbol,
        company: stock.company,
        quantity: stock.quantity ? parseFloat(stock.quantity) : null,
        pbr: stock.price ? parseFloat(stock.price) : null,
        stockRating: stock.rating,
        stockType: stock.stockType,
        sector: stock.sector,
        nextEarningsDate: stock.nextEarningsDate
      }));
      
      const created = await db.insert(assetsINTL).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(stock => this.mapAssetsINTLToPortfolioStock(stock)));
    }
    
    return results;
  }

  // ETF holdings methods
  async getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]> {
    try {
      let holdings: EtfHolding[] = [];
      
      if (etfSymbol === 'SPY') {
        const spyHoldings = await db.select().from(etfHoldingsSPY);
        holdings = spyHoldings.map(holding => this.mapSPYToEtfHolding(holding));
      } else if (etfSymbol === 'XIC') {
        const xicHoldings = await db.select().from(etfHoldingsXIC);
        holdings = xicHoldings.map(holding => this.mapXICToEtfHolding(holding));
      } else if (etfSymbol === 'ACWX') {
        const acwxHoldings = await db.select().from(etfHoldingsACWX);
        holdings = acwxHoldings.map(holding => this.mapACWXToEtfHolding(holding));
      }
      
      // Sort by weight descending
      return holdings.sort((a, b) => {
        const weightA = a.weight ? parseFloat(a.weight) : 0;
        const weightB = b.weight ? parseFloat(b.weight) : 0;
        return weightB - weightA;
      });
    } catch (error) {
      console.error("Error in getEtfHoldings:", error);
      return [];
    }
  }

  async getEtfHolding(id: number): Promise<EtfHolding | undefined> {
    try {
      // Try each ETF holdings table
      const [spyHolding] = await db.select().from(etfHoldingsSPY).where(eq(etfHoldingsSPY.id, id));
      if (spyHolding) {
        return this.mapSPYToEtfHolding(spyHolding);
      }
      
      const [xicHolding] = await db.select().from(etfHoldingsXIC).where(eq(etfHoldingsXIC.id, id));
      if (xicHolding) {
        return this.mapXICToEtfHolding(xicHolding);
      }
      
      const [acwxHolding] = await db.select().from(etfHoldingsACWX).where(eq(etfHoldingsACWX.id, id));
      if (acwxHolding) {
        return this.mapACWXToEtfHolding(acwxHolding);
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getEtfHolding:", error);
      return undefined;
    }
  }

  async createEtfHolding(holding: InsertEtfHolding): Promise<EtfHolding> {
    // Determine which table to insert into based on the ETF symbol
    if (holding.etfSymbol === 'SPY') {
      const insertData: InsertEtfHoldingsSPY = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      };
      
      const [created] = await db.insert(etfHoldingsSPY).values(sanitizeForDb(insertData)).returning();
      return this.mapSPYToEtfHolding(created);
    } else if (holding.etfSymbol === 'XIC') {
      const insertData: InsertEtfHoldingsXIC = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      };
      
      const [created] = await db.insert(etfHoldingsXIC).values(sanitizeForDb(insertData)).returning();
      return this.mapXICToEtfHolding(created);
    } else if (holding.etfSymbol === 'ACWX') {
      const insertData: InsertEtfHoldingsACWX = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      };
      
      const [created] = await db.insert(etfHoldingsACWX).values(sanitizeForDb(insertData)).returning();
      return this.mapACWXToEtfHolding(created);
    }
    
    throw new Error(`Unsupported ETF symbol: ${holding.etfSymbol}`);
  }

  async updateEtfHolding(id: number, holding: Partial<InsertEtfHolding>): Promise<EtfHolding | undefined> {
    // Find the existing holding to determine which table to update
    const existingHolding = await this.getEtfHolding(id);
    if (!existingHolding) {
      return undefined;
    }
    
    if (existingHolding.etfSymbol === 'SPY') {
      const updateData: Partial<InsertEtfHoldingsSPY> = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector,
        assetClass: holding.assetClass,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : undefined,
        weight: holding.weight ? parseFloat(holding.weight) : undefined,
        price: holding.price ? parseFloat(holding.price) : undefined,
        quantity: holding.quantity ? parseFloat(holding.quantity) : undefined,
        location: holding.location,
        exchange: holding.exchange,
        currency: holding.currency
      };
      
      const [updated] = await db
        .update(etfHoldingsSPY)
        .set(sanitizeForDb(updateData))
        .where(eq(etfHoldingsSPY.id, id))
        .returning();
      
      return updated ? this.mapSPYToEtfHolding(updated) : undefined;
    } else if (existingHolding.etfSymbol === 'XIC') {
      const updateData: Partial<InsertEtfHoldingsXIC> = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector,
        assetClass: holding.assetClass,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : undefined,
        weight: holding.weight ? parseFloat(holding.weight) : undefined,
        price: holding.price ? parseFloat(holding.price) : undefined,
        quantity: holding.quantity ? parseFloat(holding.quantity) : undefined,
        location: holding.location,
        exchange: holding.exchange,
        currency: holding.currency
      };
      
      const [updated] = await db
        .update(etfHoldingsXIC)
        .set(sanitizeForDb(updateData))
        .where(eq(etfHoldingsXIC.id, id))
        .returning();
      
      return updated ? this.mapXICToEtfHolding(updated) : undefined;
    } else if (existingHolding.etfSymbol === 'ACWX') {
      const updateData: Partial<InsertEtfHoldingsACWX> = {
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector,
        assetClass: holding.assetClass,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : undefined,
        weight: holding.weight ? parseFloat(holding.weight) : undefined,
        price: holding.price ? parseFloat(holding.price) : undefined,
        quantity: holding.quantity ? parseFloat(holding.quantity) : undefined,
        location: holding.location,
        exchange: holding.exchange,
        currency: holding.currency
      };
      
      const [updated] = await db
        .update(etfHoldingsACWX)
        .set(sanitizeForDb(updateData))
        .where(eq(etfHoldingsACWX.id, id))
        .returning();
      
      return updated ? this.mapACWXToEtfHolding(updated) : undefined;
    }
    
    return undefined;
  }

  async deleteEtfHolding(id: number): Promise<boolean> {
    // Find the existing holding to determine which table to delete from
    const existingHolding = await this.getEtfHolding(id);
    if (!existingHolding) {
      return false;
    }
    
    if (existingHolding.etfSymbol === 'SPY') {
      const [deleted] = await db.delete(etfHoldingsSPY).where(eq(etfHoldingsSPY.id, id)).returning();
      return !!deleted;
    } else if (existingHolding.etfSymbol === 'XIC') {
      const [deleted] = await db.delete(etfHoldingsXIC).where(eq(etfHoldingsXIC.id, id)).returning();
      return !!deleted;
    } else if (existingHolding.etfSymbol === 'ACWX') {
      const [deleted] = await db.delete(etfHoldingsACWX).where(eq(etfHoldingsACWX.id, id)).returning();
      return !!deleted;
    }
    
    return false;
  }

  async bulkCreateEtfHoldings(holdings: InsertEtfHolding[]): Promise<EtfHolding[]> {
    if (holdings.length === 0) return [];
    
    // Group holdings by ETF symbol
    const spyHoldings: InsertEtfHolding[] = [];
    const xicHoldings: InsertEtfHolding[] = [];
    const acwxHoldings: InsertEtfHolding[] = [];
    
    holdings.forEach(holding => {
      if (holding.etfSymbol === 'SPY') {
        spyHoldings.push(holding);
      } else if (holding.etfSymbol === 'XIC') {
        xicHoldings.push(holding);
      } else if (holding.etfSymbol === 'ACWX') {
        acwxHoldings.push(holding);
      }
    });
    
    const results: EtfHolding[] = [];
    
    // Process SPY holdings
    if (spyHoldings.length > 0) {
      const insertData = spyHoldings.map(holding => ({
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      }));
      
      const created = await db.insert(etfHoldingsSPY).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(holding => this.mapSPYToEtfHolding(holding)));
    }
    
    // Process XIC holdings
    if (xicHoldings.length > 0) {
      const insertData = xicHoldings.map(holding => ({
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      }));
      
      const created = await db.insert(etfHoldingsXIC).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(holding => this.mapXICToEtfHolding(holding)));
    }
    
    // Process ACWX holdings
    if (acwxHoldings.length > 0) {
      const insertData = acwxHoldings.map(holding => ({
        ticker: holding.ticker,
        name: holding.name,
        sector: holding.sector || null,
        assetClass: holding.assetClass || null,
        marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
        weight: holding.weight ? parseFloat(holding.weight) : null,
        price: holding.price ? parseFloat(holding.price) : null,
        quantity: holding.quantity ? parseFloat(holding.quantity) : null,
        location: holding.location || null,
        exchange: holding.exchange || null,
        currency: holding.currency || null
      }));
      
      const created = await db.insert(etfHoldingsACWX).values(insertData.map(data => sanitizeForDb(data))).returning();
      results.push(...created.map(holding => this.mapACWXToEtfHolding(holding)));
    }
    
    return results;
  }

  async getTopEtfHoldings(etfSymbol: string, limit: number): Promise<EtfHolding[]> {
    try {
      let holdings: EtfHolding[] = [];
      
      if (etfSymbol === 'SPY') {
        const spyHoldings = await db
          .select()
          .from(etfHoldingsSPY)
          .where(sql`ticker != ''`)
          .orderBy(desc(etfHoldingsSPY.weight))
          .limit(limit);
        
        holdings = spyHoldings.map(holding => this.mapSPYToEtfHolding(holding));
      } else if (etfSymbol === 'XIC') {
        const xicHoldings = await db
          .select()
          .from(etfHoldingsXIC)
          .where(sql`ticker != ''`)
          .orderBy(desc(etfHoldingsXIC.weight))
          .limit(limit);
        
        holdings = xicHoldings.map(holding => this.mapXICToEtfHolding(holding));
      } else if (etfSymbol === 'ACWX') {
        const acwxHoldings = await db
          .select()
          .from(etfHoldingsACWX)
          .where(sql`ticker != ''`)
          .orderBy(desc(etfHoldingsACWX.weight))
          .limit(limit);
        
        holdings = acwxHoldings.map(holding => this.mapACWXToEtfHolding(holding));
      }
      
      return holdings;
    } catch (error) {
      console.error("Error in getTopEtfHoldings:", error);
      return [];
    }
  }

  // Matrix rules methods
  async getMatrixRules(actionType: string): Promise<MatrixRule[]> {
    const rules = await db
      .select()
      .from(matrixRules)
      .where(eq(matrixRules.actionType, actionType))
      .orderBy(matrixRules.orderNumber);
    
    return rules;
  }

  async getMatrixRule(id: number): Promise<MatrixRule | undefined> {
    const [rule] = await db
      .select()
      .from(matrixRules)
      .where(eq(matrixRules.id, id));
    
    return rule || undefined;
  }

  async createMatrixRule(rule: InsertMatrixRule): Promise<MatrixRule> {
    const [createdRule] = await db
      .insert(matrixRules)
      .values(rule)
      .returning();
    
    return createdRule;
  }

  async updateMatrixRule(id: number, rule: Partial<InsertMatrixRule>): Promise<MatrixRule | undefined> {
    const [updatedRule] = await db
      .update(matrixRules)
      .set(rule)
      .where(eq(matrixRules.id, id))
      .returning();
    
    return updatedRule || undefined;
  }

  async deleteMatrixRule(id: number): Promise<boolean> {
    const [deletedRule] = await db
      .delete(matrixRules)
      .where(eq(matrixRules.id, id))
      .returning();
    
    return !!deletedRule;
  }

  async bulkCreateMatrixRules(rules: InsertMatrixRule[]): Promise<MatrixRule[]> {
    if (rules.length === 0) return [];
    
    return await db
      .insert(matrixRules)
      .values(rules)
      .returning();
  }

  // Alert methods
  async getAlerts(activeOnly: boolean = true): Promise<Alert[]> {
    const query = db.select().from(alerts);
    
    if (activeOnly) {
      query.where(eq(alerts.isActive, true));
    }
    
    const allAlerts = await query.orderBy(desc(alerts.createdAt));
    return allAlerts;
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id));
    
    return alert || undefined;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [createdAlert] = await db
      .insert(alerts)
      .values(alert)
      .returning();
    
    return createdAlert;
  }

  async updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(alerts)
      .set(alert)
      .where(eq(alerts.id, id))
      .returning();
    
    return updatedAlert || undefined;
  }

  async deleteAlert(id: number): Promise<boolean> {
    const [deletedAlert] = await db
      .delete(alerts)
      .where(eq(alerts.id, id))
      .returning();
    
    return !!deletedAlert;
  }

  // Portfolio summary methods
  async getPortfolioSummary(region: string): Promise<PortfolioSummary | undefined> {
    const [summary] = await db
      .select()
      .from(portfolioSummaries)
      .where(eq(portfolioSummaries.region, region));
    
    return summary || undefined;
  }

  async createPortfolioSummary(summary: InsertPortfolioSummary): Promise<PortfolioSummary> {
    const [createdSummary] = await db
      .insert(portfolioSummaries)
      .values(summary)
      .returning();
    
    return createdSummary;
  }

  async updatePortfolioSummary(id: number, summary: Partial<InsertPortfolioSummary>): Promise<PortfolioSummary | undefined> {
    const [updatedSummary] = await db
      .update(portfolioSummaries)
      .set(summary)
      .where(eq(portfolioSummaries.id, id))
      .returning();
    
    return updatedSummary || undefined;
  }

  // Helper methods for mapping between data structures
  private mapAssetsUSToPortfolioStock(asset: AssetsUS): PortfolioStock {
    return {
      id: asset.id,
      symbol: asset.symbol,
      company: asset.company,
      region: 'USD',
      sector: asset.sector,
      stockType: asset.stockType || '',
      rating: asset.stockRating || '',
      price: asset.pbr?.toString() || null,
      quantity: asset.quantity?.toString() || null,
      nav: null,
      portfolioWeight: null,
      dailyChange: null,
      mtdChange: null,
      ytdChange: null,
      sixMonthChange: null,
      fiftyTwoWeekChange: null,
      dividendYield: null,
      profitLoss: null,
      nextEarningsDate: asset.nextEarningsDate,
      updatedAt: asset.updatedAt
    };
  }

  private mapAssetsCADToPortfolioStock(asset: AssetsCAD): PortfolioStock {
    return {
      id: asset.id,
      symbol: asset.symbol,
      company: asset.company,
      region: 'CAD',
      sector: asset.sector,
      stockType: asset.stockType || '',
      rating: asset.stockRating || '',
      price: asset.pbr?.toString() || null,
      quantity: asset.quantity?.toString() || null,
      nav: null,
      portfolioWeight: null,
      dailyChange: null,
      mtdChange: null,
      ytdChange: null,
      sixMonthChange: null,
      fiftyTwoWeekChange: null,
      dividendYield: null,
      profitLoss: null,
      nextEarningsDate: asset.nextEarningsDate,
      updatedAt: asset.updatedAt
    };
  }

  private mapAssetsINTLToPortfolioStock(asset: AssetsINTL): PortfolioStock {
    return {
      id: asset.id,
      symbol: asset.symbol,
      company: asset.company,
      region: 'INTL',
      sector: asset.sector,
      stockType: asset.stockType || '',
      rating: asset.stockRating || '',
      price: asset.pbr?.toString() || null,
      quantity: asset.quantity?.toString() || null,
      nav: null,
      portfolioWeight: null,
      dailyChange: null,
      mtdChange: null,
      ytdChange: null,
      sixMonthChange: null,
      fiftyTwoWeekChange: null,
      dividendYield: null,
      profitLoss: null,
      nextEarningsDate: asset.nextEarningsDate,
      updatedAt: asset.updatedAt
    };
  }

  private mapSPYToEtfHolding(holding: EtfHoldingsSPY): EtfHolding {
    return {
      id: holding.id,
      etfSymbol: 'SPY',
      ticker: holding.ticker,
      name: holding.name,
      sector: holding.sector,
      assetClass: holding.assetClass,
      marketValue: holding.marketValue?.toString() || null,
      weight: holding.weight?.toString() || null,
      notionalValue: null,
      price: holding.price?.toString() || null,
      quantity: holding.quantity?.toString() || null,
      location: holding.location,
      exchange: holding.exchange,
      currency: holding.currency,
      fxRate: null,
      marketCurrency: null,
      updatedAt: holding.updatedAt
    };
  }

  private mapXICToEtfHolding(holding: EtfHoldingsXIC): EtfHolding {
    return {
      id: holding.id,
      etfSymbol: 'XIC',
      ticker: holding.ticker,
      name: holding.name,
      sector: holding.sector,
      assetClass: holding.assetClass,
      marketValue: holding.marketValue?.toString() || null,
      weight: holding.weight?.toString() || null,
      notionalValue: null,
      price: holding.price?.toString() || null,
      quantity: holding.quantity?.toString() || null,
      location: holding.location,
      exchange: holding.exchange,
      currency: holding.currency,
      fxRate: null,
      marketCurrency: null,
      updatedAt: holding.updatedAt
    };
  }

  private mapACWXToEtfHolding(holding: EtfHoldingsACWX): EtfHolding {
    return {
      id: holding.id,
      etfSymbol: 'ACWX',
      ticker: holding.ticker,
      name: holding.name,
      sector: holding.sector,
      assetClass: holding.assetClass,
      marketValue: holding.marketValue?.toString() || null,
      weight: holding.weight?.toString() || null,
      notionalValue: null,
      price: holding.price?.toString() || null,
      quantity: holding.quantity?.toString() || null,
      location: holding.location,
      exchange: holding.exchange,
      currency: holding.currency,
      fxRate: null,
      marketCurrency: null,
      updatedAt: holding.updatedAt
    };
  }

  // Historical price methods
  async getHistoricalPrices(symbol: string, region: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]> {
    try {
      let query = db
        .select()
        .from(historicalPrices)
        .where(and(
          eq(historicalPrices.symbol, symbol),
          eq(historicalPrices.region, region)
        ));
      
      if (startDate) {
        query = query.where(gte(historicalPrices.date, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(historicalPrices.date, endDate));
      }
      
      const prices = await query.orderBy(historicalPrices.date);
      return prices;
    } catch (error) {
      console.error("Error in getHistoricalPrices:", error);
      return [];
    }
  }

  async getHistoricalPricesByRegion(region: string, startDate?: Date, endDate?: Date): Promise<HistoricalPrice[]> {
    try {
      console.log(`Fetching historical prices for region: ${region}`);
      
      // Special handling for different regions - direct solution
      if (region === "USD") {
        console.log("USD region requested - Using direct AAPL data retrieval");
        const appleData = await this.getHistoricalPrices("AAPL", "USD");
        console.log(`Direct AAPL data check returned ${appleData.length} records`);
        if (appleData.length > 0) {
          return appleData;
        }
      } else if (region === "CAD") {
        console.log("CAD region requested - Using direct RY data retrieval");
        const ryData = await this.getHistoricalPrices("RY", "CAD");
        if (ryData.length > 0) {
          return ryData;
        }
      } else if (region === "INTL") {
        console.log("INTL region requested - Using direct NOK data retrieval");
        const nokData = await this.getHistoricalPrices("NOK", "INTL");
        if (nokData.length > 0) {
          return nokData;
        }
      }
      
      // If we reach here, the direct lookup failed
      console.log(`Direct lookup failed for ${region}, trying general query...`);
      
      // Print the region value to ensure we're using the correct case
      console.log(`Region value for SQL query: "${region}"`);
      
      // Try a direct SQL query to see what's in the database
      try {
        const countCheck = await db.execute(sql`
          SELECT COUNT(*) as count, region 
          FROM historical_prices 
          GROUP BY region
        `);
        console.log("Total counts by region:", countCheck.rows);
      } catch (err) {
        console.error("Error running direct SQL count:", err);
      }
      
      // Check if there are any records with this region
      const countResult = await db
        .select({ count: sql`COUNT(*)` })
        .from(historicalPrices)
        .where(eq(historicalPrices.region, region));
      
      console.log(`Count of records for region ${region}: ${countResult[0]?.count || 0}`);
      
      // If we don't have any records for this region, try to get data for any stock in this region
      if (countResult[0]?.count === 0 || countResult[0]?.count === "0") {
        console.log(`No records found for region ${region}, trying individual stocks...`);
        const stocks = await this.getPortfolioStocks(region);
        
        if (stocks.length > 0) {
          // Try each stock until we find one with data
          for (const stock of stocks) {
            console.log(`Trying to get data for ${stock.symbol} (${region})`);
            const stockPrices = await this.getHistoricalPrices(stock.symbol, region);
            if (stockPrices.length > 0) {
              console.log(`Found ${stockPrices.length} prices for ${stock.symbol}`);
              return stockPrices;
            }
          }
        }
        
        // No stock data found either, return empty array
        console.log(`No historical data found for any stock in region ${region}`);
        return [];
      }
      
      // Check which symbols have historical data
      const symbolsWithData = await db
        .select({ symbol: historicalPrices.symbol })
        .from(historicalPrices)
        .where(eq(historicalPrices.region, region))
        .groupBy(historicalPrices.symbol);
      
      console.log(`Symbols with data for region ${region}: ${JSON.stringify(symbolsWithData.map(s => s.symbol))}`);
      
      // Standard query approach
      const query = db
        .select()
        .from(historicalPrices)
        .where(eq(historicalPrices.region, region))
        .orderBy(desc(historicalPrices.date))
        .limit(100); // Limit to a reasonable number for performance
      
      const prices = await query;
      console.log(`Found ${prices.length} historical prices for region ${region}`);
      
      return prices;
    } catch (error) {
      console.error("Error in getHistoricalPricesByRegion:", error);
      return [];
    }
  }

  async createHistoricalPrice(price: InsertHistoricalPrice): Promise<HistoricalPrice> {
    try {
      const [createdPrice] = await db
        .insert(historicalPrices)
        .values(price)
        .returning();
      
      return createdPrice;
    } catch (error) {
      console.error("Error in createHistoricalPrice:", error);
      throw error;
    }
  }

  async bulkCreateHistoricalPrices(prices: InsertHistoricalPrice[]): Promise<HistoricalPrice[]> {
    if (prices.length === 0) return [];
    
    try {
      const createdPrices = await db
        .insert(historicalPrices)
        .values(prices)
        .returning();
      
      return createdPrices;
    } catch (error) {
      console.error("Error in bulkCreateHistoricalPrices:", error);
      throw error;
    }
  }

  async deleteHistoricalPrices(symbol: string, region: string): Promise<boolean> {
    try {
      const result = await db
        .delete(historicalPrices)
        .where(and(
          eq(historicalPrices.symbol, symbol),
          eq(historicalPrices.region, region)
        ));
      
      return true;
    } catch (error) {
      console.error("Error in deleteHistoricalPrices:", error);
      return false;
    }
  }

  // Current price methods
  async getCurrentPrices(region: string): Promise<CurrentPrice[]> {
    try {
      const prices = await db
        .select()
        .from(currentPrices)
        .where(eq(currentPrices.region, region))
        .orderBy(desc(currentPrices.updatedAt));
      
      return prices;
    } catch (error) {
      console.error("Error in getCurrentPrices:", error);
      return [];
    }
  }

  async getCurrentPrice(symbol: string, region: string): Promise<CurrentPrice | undefined> {
    try {
      const [price] = await db
        .select()
        .from(currentPrices)
        .where(and(
          eq(currentPrices.symbol, symbol),
          eq(currentPrices.region, region)
        ));
      
      return price || undefined;
    } catch (error) {
      console.error("Error in getCurrentPrice:", error);
      return undefined;
    }
  }

  async createCurrentPrice(price: InsertCurrentPrice): Promise<CurrentPrice> {
    try {
      // First check if a record already exists for this symbol and region
      const existingPrice = await this.getCurrentPrice(price.symbol, price.region);
      
      if (existingPrice) {
        // Update the existing record
        return await this.updateCurrentPrice(existingPrice.id, price);
      }
      
      // Otherwise create a new record
      const [createdPrice] = await db
        .insert(currentPrices)
        .values(price)
        .returning();
      
      return createdPrice;
    } catch (error) {
      console.error("Error in createCurrentPrice:", error);
      throw error;
    }
  }

  async updateCurrentPrice(id: number, price: Partial<InsertCurrentPrice>): Promise<CurrentPrice> {
    try {
      const [updatedPrice] = await db
        .update(currentPrices)
        .set(price)
        .where(eq(currentPrices.id, id))
        .returning();
      
      if (!updatedPrice) {
        throw new Error(`Failed to update current price with id ${id}`);
      }
      
      return updatedPrice;
    } catch (error) {
      console.error("Error in updateCurrentPrice:", error);
      throw error;
    }
  }

  async deleteCurrentPrice(id: number): Promise<boolean> {
    try {
      await db
        .delete(currentPrices)
        .where(eq(currentPrices.id, id));
      
      return true;
    } catch (error) {
      console.error("Error in deleteCurrentPrice:", error);
      return false;
    }
  }

  async bulkCreateCurrentPrices(prices: InsertCurrentPrice[]): Promise<CurrentPrice[]> {
    if (prices.length === 0) return [];
    
    try {
      // For each price, check if it already exists and update if it does
      const results: CurrentPrice[] = [];
      
      for (const price of prices) {
        const existingPrice = await this.getCurrentPrice(price.symbol, price.region);
        
        if (existingPrice) {
          // Update existing price
          const updatedPrice = await this.updateCurrentPrice(existingPrice.id, price);
          results.push(updatedPrice);
        } else {
          // Create new price
          const [createdPrice] = await db
            .insert(currentPrices)
            .values(price)
            .returning();
          
          results.push(createdPrice);
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error in bulkCreateCurrentPrices:", error);
      throw error;
    }
  }
}
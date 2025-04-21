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
  PortfolioRegion
} from "@shared/schema";
import { db, sanitizeForDb } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Import compatibility types
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
      .values(sanitizeForDb(insertUser))
      .returning();
    return user;
  }

  // Portfolio stock methods
  async getPortfolioStocks(region: string): Promise<PortfolioStock[]> {
    try {
      let assets;
      if (region === 'USD') {
        assets = await db.select().from(assetsUS);
        
        // Convert from AssetsUS to PortfolioStock format for compatibility
        return assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'USD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[];
      } 
      else if (region === 'CAD') {
        assets = await db.select().from(assetsCAD);
        
        // Convert from AssetsCAD to PortfolioStock format for compatibility
        return assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'CAD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[];
      } 
      else if (region === 'INTL') {
        assets = await db.select().from(assetsINTL);
        
        // Convert from AssetsINTL to PortfolioStock format for compatibility
        return assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'INTL',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[];
      }
      
      return [];
    } catch (error) {
      console.error("Error in getPortfolioStocks:", error);
      return [];
    }
  }

  async getPortfolioStock(id: number): Promise<PortfolioStock | undefined> {
    try {
      // Try each assets table to find the stock
      let asset;
      
      [asset] = await db.select().from(assetsUS).where(eq(assetsUS.id, id));
      if (asset) {
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'USD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      }
      
      [asset] = await db.select().from(assetsCAD).where(eq(assetsCAD.id, id));
      if (asset) {
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'CAD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      }
      
      [asset] = await db.select().from(assetsINTL).where(eq(assetsINTL.id, id));
      if (asset) {
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'INTL',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
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
        const [asset] = await db
          .select()
          .from(assetsUS)
          .where(eq(assetsUS.symbol, symbol));
        
        if (asset) {
          return {
            id: asset.id,
            symbol: asset.symbol,
            company: asset.company,
            region: 'USD',
            sector: asset.sector,
            stockType: asset.stockType || '',
            rating: asset.stockRating || '',
            price: null,
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
            nextEarningsDate: asset.nextEarningsDate || null,
            updatedAt: asset.updatedAt
          } as PortfolioStock;
        }
      } 
      else if (region === 'CAD') {
        const [asset] = await db
          .select()
          .from(assetsCAD)
          .where(eq(assetsCAD.symbol, symbol));
        
        if (asset) {
          return {
            id: asset.id,
            symbol: asset.symbol,
            company: asset.company,
            region: 'CAD',
            sector: asset.sector,
            stockType: asset.stockType || '',
            rating: asset.stockRating || '',
            price: null,
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
            nextEarningsDate: asset.nextEarningsDate || null,
            updatedAt: asset.updatedAt
          } as PortfolioStock;
        }
      } 
      else if (region === 'INTL') {
        const [asset] = await db
          .select()
          .from(assetsINTL)
          .where(eq(assetsINTL.symbol, symbol));
        
        if (asset) {
          return {
            id: asset.id,
            symbol: asset.symbol,
            company: asset.company,
            region: 'INTL',
            sector: asset.sector,
            stockType: asset.stockType || '',
            rating: asset.stockRating || '',
            price: null,
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
            nextEarningsDate: asset.nextEarningsDate || null,
            updatedAt: asset.updatedAt
          } as PortfolioStock;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getPortfolioStockBySymbol:", error);
      return undefined;
    }
  }

  async createPortfolioStock(stock: InsertPortfolioStock): Promise<PortfolioStock> {
    try {
      if (stock.region === 'USD') {
        const insertData: InsertAssetsUS = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .insert(assetsUS)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'USD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      } 
      else if (stock.region === 'CAD') {
        const insertData: InsertAssetsCAD = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .insert(assetsCAD)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'CAD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      } 
      else if (stock.region === 'INTL') {
        const insertData: InsertAssetsINTL = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .insert(assetsINTL)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'INTL',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      }
      
      throw new Error(`Unknown region: ${stock.region}`);
    } catch (error) {
      console.error("Error in createPortfolioStock:", error);
      throw error;
    }
  }

  async updatePortfolioStock(id: number, stock: Partial<InsertPortfolioStock>): Promise<PortfolioStock | undefined> {
    try {
      // First determine which table this stock is in
      const portfolioStock = await this.getPortfolioStock(id);
      if (!portfolioStock) {
        return undefined;
      }
      
      if (portfolioStock.region === 'USD') {
        const updateData: Partial<InsertAssetsUS> = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .update(assetsUS)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(assetsUS.id, id))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'USD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      } 
      else if (portfolioStock.region === 'CAD') {
        const updateData: Partial<InsertAssetsCAD> = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .update(assetsCAD)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(assetsCAD.id, id))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'CAD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      } 
      else if (portfolioStock.region === 'INTL') {
        const updateData: Partial<InsertAssetsINTL> = {
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : undefined,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate
        };
        
        const [asset] = await db
          .update(assetsINTL)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(assetsINTL.id, id))
          .returning();
        
        return {
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'INTL',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        } as PortfolioStock;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in updatePortfolioStock:", error);
      return undefined;
    }
  }

  async deletePortfolioStock(id: number): Promise<boolean> {
    try {
      // First determine which table this stock is in
      const portfolioStock = await this.getPortfolioStock(id);
      if (!portfolioStock) {
        return false;
      }
      
      if (portfolioStock.region === 'USD') {
        const [deleted] = await db
          .delete(assetsUS)
          .where(eq(assetsUS.id, id))
          .returning();
        return !!deleted;
      } 
      else if (portfolioStock.region === 'CAD') {
        const [deleted] = await db
          .delete(assetsCAD)
          .where(eq(assetsCAD.id, id))
          .returning();
        return !!deleted;
      } 
      else if (portfolioStock.region === 'INTL') {
        const [deleted] = await db
          .delete(assetsINTL)
          .where(eq(assetsINTL.id, id))
          .returning();
        return !!deleted;
      }
      
      return false;
    } catch (error) {
      console.error("Error in deletePortfolioStock:", error);
      return false;
    }
  }

  async bulkCreatePortfolioStocks(stocks: InsertPortfolioStock[]): Promise<PortfolioStock[]> {
    if (stocks.length === 0) return [];
    
    try {
      const result: PortfolioStock[] = [];
      
      // Group stocks by region
      const usdStocks = stocks.filter(s => s.region === 'USD');
      const cadStocks = stocks.filter(s => s.region === 'CAD');
      const intlStocks = stocks.filter(s => s.region === 'INTL');
      
      // Process USD stocks
      if (usdStocks.length > 0) {
        const usdData = usdStocks.map(stock => sanitizeForDb({
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate,
          updatedAt: new Date()
        }));
        
        const assets = await db
          .insert(assetsUS)
          .values(usdData)
          .returning();
        
        result.push(...assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'USD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[]);
      }
      
      // Process CAD stocks
      if (cadStocks.length > 0) {
        const cadData = cadStocks.map(stock => sanitizeForDb({
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate,
          updatedAt: new Date()
        }));
        
        const assets = await db
          .insert(assetsCAD)
          .values(cadData)
          .returning();
        
        result.push(...assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'CAD',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[]);
      }
      
      // Process INTL stocks
      if (intlStocks.length > 0) {
        const intlData = intlStocks.map(stock => sanitizeForDb({
          symbol: stock.symbol,
          company: stock.company,
          quantity: stock.quantity ? parseFloat(stock.quantity) : null,
          pbr: null,
          stockRating: stock.rating,
          stockType: stock.stockType,
          sector: stock.sector,
          nextEarningsDate: stock.nextEarningsDate,
          updatedAt: new Date()
        }));
        
        const assets = await db
          .insert(assetsINTL)
          .values(intlData)
          .returning();
        
        result.push(...assets.map(asset => ({
          id: asset.id,
          symbol: asset.symbol,
          company: asset.company,
          region: 'INTL',
          sector: asset.sector,
          stockType: asset.stockType || '',
          rating: asset.stockRating || '',
          price: null,
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
          nextEarningsDate: asset.nextEarningsDate || null,
          updatedAt: asset.updatedAt
        })) as PortfolioStock[]);
      }
      
      return result;
    } catch (error) {
      console.error("Error in bulkCreatePortfolioStocks:", error);
      return [];
    }
  }

  // ETF holdings methods implementation...
  async getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]> {
    try {
      let holdings: any[] = [];
      
      if (etfSymbol === 'SPY') {
        holdings = await db.select().from(etfHoldingsSPY);
        
        return holdings.map(holding => ({
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
        })) as EtfHolding[];
      } 
      else if (etfSymbol === 'XIC') {
        holdings = await db.select().from(etfHoldingsXIC);
        
        return holdings.map(holding => ({
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
        })) as EtfHolding[];
      } 
      else if (etfSymbol === 'ACWX') {
        holdings = await db.select().from(etfHoldingsACWX);
        
        return holdings.map(holding => ({
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
        })) as EtfHolding[];
      }
      
      return [];
    } catch (error) {
      console.error("Error in getEtfHoldings:", error);
      return [];
    }
  }

  async getEtfHolding(id: number): Promise<EtfHolding | undefined> {
    try {
      // Try each ETF holdings table
      let holding;
      
      [holding] = await db.select().from(etfHoldingsSPY).where(eq(etfHoldingsSPY.id, id));
      if (holding) {
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
        } as EtfHolding;
      }
      
      [holding] = await db.select().from(etfHoldingsXIC).where(eq(etfHoldingsXIC.id, id));
      if (holding) {
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
        } as EtfHolding;
      }
      
      [holding] = await db.select().from(etfHoldingsACWX).where(eq(etfHoldingsACWX.id, id));
      if (holding) {
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
        } as EtfHolding;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getEtfHolding:", error);
      return undefined;
    }
  }

  async createEtfHolding(holding: InsertEtfHolding): Promise<EtfHolding> {
    try {
      if (holding.etfSymbol === 'SPY') {
        const insertData: InsertEtfHoldingsSPY = {
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency
        };
        
        const [createdHolding] = await db
          .insert(etfHoldingsSPY)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: createdHolding.id,
          etfSymbol: 'SPY',
          ticker: createdHolding.ticker,
          name: createdHolding.name,
          sector: createdHolding.sector,
          assetClass: createdHolding.assetClass,
          marketValue: createdHolding.marketValue?.toString() || null,
          weight: createdHolding.weight?.toString() || null,
          notionalValue: null,
          price: createdHolding.price?.toString() || null,
          quantity: createdHolding.quantity?.toString() || null,
          location: createdHolding.location,
          exchange: createdHolding.exchange,
          currency: createdHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: createdHolding.updatedAt
        } as EtfHolding;
      } 
      else if (holding.etfSymbol === 'XIC') {
        const insertData: InsertEtfHoldingsXIC = {
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency
        };
        
        const [createdHolding] = await db
          .insert(etfHoldingsXIC)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: createdHolding.id,
          etfSymbol: 'XIC',
          ticker: createdHolding.ticker,
          name: createdHolding.name,
          sector: createdHolding.sector,
          assetClass: createdHolding.assetClass,
          marketValue: createdHolding.marketValue?.toString() || null,
          weight: createdHolding.weight?.toString() || null,
          notionalValue: null,
          price: createdHolding.price?.toString() || null,
          quantity: createdHolding.quantity?.toString() || null,
          location: createdHolding.location,
          exchange: createdHolding.exchange,
          currency: createdHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: createdHolding.updatedAt
        } as EtfHolding;
      } 
      else if (holding.etfSymbol === 'ACWX') {
        const insertData: InsertEtfHoldingsACWX = {
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency
        };
        
        const [createdHolding] = await db
          .insert(etfHoldingsACWX)
          .values(sanitizeForDb(insertData))
          .returning();
        
        return {
          id: createdHolding.id,
          etfSymbol: 'ACWX',
          ticker: createdHolding.ticker,
          name: createdHolding.name,
          sector: createdHolding.sector,
          assetClass: createdHolding.assetClass,
          marketValue: createdHolding.marketValue?.toString() || null,
          weight: createdHolding.weight?.toString() || null,
          notionalValue: null,
          price: createdHolding.price?.toString() || null,
          quantity: createdHolding.quantity?.toString() || null,
          location: createdHolding.location,
          exchange: createdHolding.exchange,
          currency: createdHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: createdHolding.updatedAt
        } as EtfHolding;
      }
      
      throw new Error(`Unknown ETF symbol: ${holding.etfSymbol}`);
    } catch (error) {
      console.error("Error in createEtfHolding:", error);
      throw error;
    }
  }

  async updateEtfHolding(id: number, holding: Partial<InsertEtfHolding>): Promise<EtfHolding | undefined> {
    try {
      // First determine which table this holding is in
      const etfHolding = await this.getEtfHolding(id);
      if (!etfHolding) {
        return undefined;
      }
      
      if (etfHolding.etfSymbol === 'SPY') {
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
        
        const [updatedHolding] = await db
          .update(etfHoldingsSPY)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(etfHoldingsSPY.id, id))
          .returning();
        
        return {
          id: updatedHolding.id,
          etfSymbol: 'SPY',
          ticker: updatedHolding.ticker,
          name: updatedHolding.name,
          sector: updatedHolding.sector,
          assetClass: updatedHolding.assetClass,
          marketValue: updatedHolding.marketValue?.toString() || null,
          weight: updatedHolding.weight?.toString() || null,
          notionalValue: null,
          price: updatedHolding.price?.toString() || null,
          quantity: updatedHolding.quantity?.toString() || null,
          location: updatedHolding.location,
          exchange: updatedHolding.exchange,
          currency: updatedHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: updatedHolding.updatedAt
        } as EtfHolding;
      } 
      else if (etfHolding.etfSymbol === 'XIC') {
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
        
        const [updatedHolding] = await db
          .update(etfHoldingsXIC)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(etfHoldingsXIC.id, id))
          .returning();
        
        return {
          id: updatedHolding.id,
          etfSymbol: 'XIC',
          ticker: updatedHolding.ticker,
          name: updatedHolding.name,
          sector: updatedHolding.sector,
          assetClass: updatedHolding.assetClass,
          marketValue: updatedHolding.marketValue?.toString() || null,
          weight: updatedHolding.weight?.toString() || null,
          notionalValue: null,
          price: updatedHolding.price?.toString() || null,
          quantity: updatedHolding.quantity?.toString() || null,
          location: updatedHolding.location,
          exchange: updatedHolding.exchange,
          currency: updatedHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: updatedHolding.updatedAt
        } as EtfHolding;
      } 
      else if (etfHolding.etfSymbol === 'ACWX') {
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
        
        const [updatedHolding] = await db
          .update(etfHoldingsACWX)
          .set(sanitizeForDb({
            ...updateData,
            updatedAt: new Date()
          }))
          .where(eq(etfHoldingsACWX.id, id))
          .returning();
        
        return {
          id: updatedHolding.id,
          etfSymbol: 'ACWX',
          ticker: updatedHolding.ticker,
          name: updatedHolding.name,
          sector: updatedHolding.sector,
          assetClass: updatedHolding.assetClass,
          marketValue: updatedHolding.marketValue?.toString() || null,
          weight: updatedHolding.weight?.toString() || null,
          notionalValue: null,
          price: updatedHolding.price?.toString() || null,
          quantity: updatedHolding.quantity?.toString() || null,
          location: updatedHolding.location,
          exchange: updatedHolding.exchange,
          currency: updatedHolding.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: updatedHolding.updatedAt
        } as EtfHolding;
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in updateEtfHolding:", error);
      return undefined;
    }
  }

  async deleteEtfHolding(id: number): Promise<boolean> {
    try {
      const etfHolding = await this.getEtfHolding(id);
      if (!etfHolding) {
        return false;
      }
      
      if (etfHolding.etfSymbol === 'SPY') {
        const [deleted] = await db
          .delete(etfHoldingsSPY)
          .where(eq(etfHoldingsSPY.id, id))
          .returning();
        return !!deleted;
      } 
      else if (etfHolding.etfSymbol === 'XIC') {
        const [deleted] = await db
          .delete(etfHoldingsXIC)
          .where(eq(etfHoldingsXIC.id, id))
          .returning();
        return !!deleted;
      } 
      else if (etfHolding.etfSymbol === 'ACWX') {
        const [deleted] = await db
          .delete(etfHoldingsACWX)
          .where(eq(etfHoldingsACWX.id, id))
          .returning();
        return !!deleted;
      }
      
      return false;
    } catch (error) {
      console.error("Error in deleteEtfHolding:", error);
      return false;
    }
  }

  async bulkCreateEtfHoldings(holdings: InsertEtfHolding[]): Promise<EtfHolding[]> {
    if (holdings.length === 0) return [];
    
    try {
      const result: EtfHolding[] = [];
      
      // Group holdings by ETF symbol
      const spyHoldings = holdings.filter(h => h.etfSymbol === 'SPY');
      const xicHoldings = holdings.filter(h => h.etfSymbol === 'XIC');
      const acwxHoldings = holdings.filter(h => h.etfSymbol === 'ACWX');
      
      // Process SPY holdings
      if (spyHoldings.length > 0) {
        const spyData = spyHoldings.map(holding => sanitizeForDb({
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency,
          updatedAt: new Date()
        }));
        
        const createdHoldings = await db
          .insert(etfHoldingsSPY)
          .values(spyData)
          .returning();
        
        result.push(...createdHoldings.map(h => ({
          id: h.id,
          etfSymbol: 'SPY',
          ticker: h.ticker,
          name: h.name,
          sector: h.sector,
          assetClass: h.assetClass,
          marketValue: h.marketValue?.toString() || null,
          weight: h.weight?.toString() || null,
          notionalValue: null,
          price: h.price?.toString() || null,
          quantity: h.quantity?.toString() || null,
          location: h.location,
          exchange: h.exchange,
          currency: h.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: h.updatedAt
        })) as EtfHolding[]);
      }
      
      // Process XIC holdings
      if (xicHoldings.length > 0) {
        const xicData = xicHoldings.map(holding => sanitizeForDb({
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency,
          updatedAt: new Date()
        }));
        
        const createdHoldings = await db
          .insert(etfHoldingsXIC)
          .values(xicData)
          .returning();
        
        result.push(...createdHoldings.map(h => ({
          id: h.id,
          etfSymbol: 'XIC',
          ticker: h.ticker,
          name: h.name,
          sector: h.sector,
          assetClass: h.assetClass,
          marketValue: h.marketValue?.toString() || null,
          weight: h.weight?.toString() || null,
          notionalValue: null,
          price: h.price?.toString() || null,
          quantity: h.quantity?.toString() || null,
          location: h.location,
          exchange: h.exchange,
          currency: h.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: h.updatedAt
        })) as EtfHolding[]);
      }
      
      // Process ACWX holdings
      if (acwxHoldings.length > 0) {
        const acwxData = acwxHoldings.map(holding => sanitizeForDb({
          ticker: holding.ticker,
          name: holding.name,
          sector: holding.sector,
          assetClass: holding.assetClass,
          marketValue: holding.marketValue ? parseFloat(holding.marketValue) : null,
          weight: holding.weight ? parseFloat(holding.weight) : null,
          price: holding.price ? parseFloat(holding.price) : null,
          quantity: holding.quantity ? parseFloat(holding.quantity) : null,
          location: holding.location,
          exchange: holding.exchange,
          currency: holding.currency,
          updatedAt: new Date()
        }));
        
        const createdHoldings = await db
          .insert(etfHoldingsACWX)
          .values(acwxData)
          .returning();
        
        result.push(...createdHoldings.map(h => ({
          id: h.id,
          etfSymbol: 'ACWX',
          ticker: h.ticker,
          name: h.name,
          sector: h.sector,
          assetClass: h.assetClass,
          marketValue: h.marketValue?.toString() || null,
          weight: h.weight?.toString() || null,
          notionalValue: null,
          price: h.price?.toString() || null,
          quantity: h.quantity?.toString() || null,
          location: h.location,
          exchange: h.exchange,
          currency: h.currency,
          fxRate: null,
          marketCurrency: null,
          updatedAt: h.updatedAt
        })) as EtfHolding[]);
      }
      
      return result;
    } catch (error) {
      console.error("Error in bulkCreateEtfHoldings:", error);
      return [];
    }
  }

  async getTopEtfHoldings(etfSymbol: string, limit: number): Promise<EtfHolding[]> {
    try {
      const holdings = await this.getEtfHoldings(etfSymbol);
      return holdings
        .sort((a, b) => {
          const weightA = a.weight ? parseFloat(a.weight) : 0;
          const weightB = b.weight ? parseFloat(b.weight) : 0;
          return weightB - weightA; // Sort by weight in descending order
        })
        .slice(0, limit);
    } catch (error) {
      console.error("Error in getTopEtfHoldings:", error);
      return [];
    }
  }

  // Matrix rules methods
  async getMatrixRules(actionType: string): Promise<MatrixRule[]> {
    try {
      return await db
        .select()
        .from(matrixRules)
        .where(eq(matrixRules.actionType, actionType));
    } catch (error) {
      console.error("Error in getMatrixRules:", error);
      return [];
    }
  }

  async getMatrixRule(id: number): Promise<MatrixRule | undefined> {
    try {
      const [rule] = await db
        .select()
        .from(matrixRules)
        .where(eq(matrixRules.id, id));
      return rule || undefined;
    } catch (error) {
      console.error("Error in getMatrixRule:", error);
      return undefined;
    }
  }

  async createMatrixRule(rule: InsertMatrixRule): Promise<MatrixRule> {
    try {
      const [createdRule] = await db
        .insert(matrixRules)
        .values(sanitizeForDb(rule))
        .returning();
      return createdRule;
    } catch (error) {
      console.error("Error in createMatrixRule:", error);
      throw error;
    }
  }

  async updateMatrixRule(id: number, rule: Partial<InsertMatrixRule>): Promise<MatrixRule | undefined> {
    try {
      const [updatedRule] = await db
        .update(matrixRules)
        .set(sanitizeForDb(rule))
        .where(eq(matrixRules.id, id))
        .returning();
      return updatedRule || undefined;
    } catch (error) {
      console.error("Error in updateMatrixRule:", error);
      return undefined;
    }
  }

  async deleteMatrixRule(id: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(matrixRules)
        .where(eq(matrixRules.id, id))
        .returning();
      return !!deleted;
    } catch (error) {
      console.error("Error in deleteMatrixRule:", error);
      return false;
    }
  }

  async bulkCreateMatrixRules(rules: InsertMatrixRule[]): Promise<MatrixRule[]> {
    if (rules.length === 0) return [];
    
    try {
      return await db
        .insert(matrixRules)
        .values(rules.map(rule => sanitizeForDb(rule)))
        .returning();
    } catch (error) {
      console.error("Error in bulkCreateMatrixRules:", error);
      return [];
    }
  }

  // Alert methods
  async getAlerts(activeOnly: boolean = true): Promise<Alert[]> {
    try {
      if (activeOnly) {
        return await db
          .select()
          .from(alerts)
          .where(eq(alerts.isActive, true))
          .orderBy(desc(alerts.createdAt));
      } else {
        return await db
          .select()
          .from(alerts)
          .orderBy(desc(alerts.createdAt));
      }
    } catch (error) {
      console.error("Error in getAlerts:", error);
      return [];
    }
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    try {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, id));
      return alert || undefined;
    } catch (error) {
      console.error("Error in getAlert:", error);
      return undefined;
    }
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    try {
      const [createdAlert] = await db
        .insert(alerts)
        .values(sanitizeForDb({
          ...alert,
          createdAt: new Date()
        }))
        .returning();
      return createdAlert;
    } catch (error) {
      console.error("Error in createAlert:", error);
      throw error;
    }
  }

  async updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined> {
    try {
      const [updatedAlert] = await db
        .update(alerts)
        .set(sanitizeForDb(alert))
        .where(eq(alerts.id, id))
        .returning();
      return updatedAlert || undefined;
    } catch (error) {
      console.error("Error in updateAlert:", error);
      return undefined;
    }
  }

  async deleteAlert(id: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(alerts)
        .where(eq(alerts.id, id))
        .returning();
      return !!deleted;
    } catch (error) {
      console.error("Error in deleteAlert:", error);
      return false;
    }
  }

  // Portfolio summary methods
  async getPortfolioSummary(region: string): Promise<PortfolioSummary | undefined> {
    try {
      const [summary] = await db
        .select()
        .from(portfolioSummaries)
        .where(eq(portfolioSummaries.region, region));
      return summary || undefined;
    } catch (error) {
      console.error("Error in getPortfolioSummary:", error);
      return undefined;
    }
  }

  async createPortfolioSummary(summary: InsertPortfolioSummary): Promise<PortfolioSummary> {
    try {
      const [createdSummary] = await db
        .insert(portfolioSummaries)
        .values(sanitizeForDb({
          ...summary,
          updatedAt: new Date()
        }))
        .returning();
      return createdSummary;
    } catch (error) {
      console.error("Error in createPortfolioSummary:", error);
      throw error;
    }
  }

  async updatePortfolioSummary(id: number, summary: Partial<InsertPortfolioSummary>): Promise<PortfolioSummary | undefined> {
    try {
      const [updatedSummary] = await db
        .update(portfolioSummaries)
        .set(sanitizeForDb({
          ...summary,
          updatedAt: new Date()
        }))
        .where(eq(portfolioSummaries.id, id))
        .returning();
      return updatedSummary || undefined;
    } catch (error) {
      console.error("Error in updatePortfolioSummary:", error);
      return undefined;
    }
  }
}
/**
 * Diagnostics Controller
 * Provides endpoints for system health, testing, and performance monitoring.
 */
import { Request, Response } from 'express';
import { db } from '../../db';
import yahooFinance from 'yahoo-finance2';
import { asc, count, desc, eq, gt, sql } from 'drizzle-orm';
import { historicalPriceService } from '../../services/historical-price-service';
import { currentPriceService } from '../../services/current-price-service';
import { dataUpdateLogs } from '@shared/schema';

/**
 * Get basic system health information
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const dbInfo = await getDatabaseInfo();
    const servicesInfo = getServicesInfo();
    const latestUpdatesInfo = await getLatestUpdateInfo();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbInfo,
      services: servicesInfo,
      latestUpdates: latestUpdatesInfo
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system health information',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Test database connection and provide basic info
 */
export const testDatabaseConnection = async (req: Request, res: Response) => {
  try {
    const dbInfo = await getDatabaseInfo();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbInfo
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection test failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Test Yahoo Finance API connection
 */
export const testYahooFinanceConnection = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Try to fetch a stock quote as a simple test
    const symbol = req.query.symbol as string || 'AAPL';
    const result = await yahooFinance.quoteSummary(symbol);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      symbol,
      responseTime: `${responseTime}ms`,
      dataAvailable: !!result
    });
  } catch (error) {
    console.error('Error testing Yahoo Finance connection:', error);
    res.status(500).json({
      status: 'error',
      message: 'Yahoo Finance API test failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get recent data update statistics
 */
export const getDataUpdateStats = async (req: Request, res: Response) => {
  try {
    // Get count of updates from last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentLogs = await db.select({
      count: count(),
      type: dataUpdateLogs.type,
      status: dataUpdateLogs.status
    })
    .from(dataUpdateLogs)
    .where(gt(dataUpdateLogs.timestamp, sql`${oneDayAgo.toISOString()}`))
    .groupBy(dataUpdateLogs.type, dataUpdateLogs.status);
    
    // Get most recent update for each type
    const latestUpdateInfo = await getLatestUpdateInfo();
    
    // Get success/error ratio
    const successCount = recentLogs.filter(log => log.status === 'Success').reduce((sum, log) => sum + Number(log.count), 0);
    const errorCount = recentLogs.filter(log => log.status === 'Error').reduce((sum, log) => sum + Number(log.count), 0);
    const totalCount = successCount + errorCount;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      updateStats: {
        last24Hours: {
          totalUpdates: totalCount,
          successCount,
          errorCount,
          successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 100
        },
        byType: recentLogs.reduce((acc: Record<string, any>, log) => {
          if (!acc[log.type]) {
            acc[log.type] = {
              total: 0,
              success: 0,
              error: 0
            };
          }
          
          acc[log.type].total += Number(log.count);
          if (log.status === 'Success') {
            acc[log.type].success += Number(log.count);
          } else if (log.status === 'Error') {
            acc[log.type].error += Number(log.count);
          }
          
          return acc;
        }, {}),
        latestUpdates: latestUpdateInfo
      }
    });
  } catch (error) {
    console.error('Error fetching data update stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch data update statistics',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Run a Yahoo Finance API rate limit test
 */
export const testYahooFinanceRateLimit = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const results: Record<string, any> = {};
    
    // Test symbols
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    
    // Run tests in parallel
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const symbolStartTime = Date.now();
        const result = await yahooFinance.quote(symbol);
        const symbolEndTime = Date.now();
        
        results[symbol] = {
          success: true,
          responseTime: symbolEndTime - symbolStartTime,
          price: result.regularMarketPrice
        };
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }));
    
    const endTime = Date.now();
    const totalResponseTime = endTime - startTime;
    
    // Count successes and failures
    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const failureCount = symbols.length - successCount;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      totalResponseTime: `${totalResponseTime}ms`,
      successRate: `${(successCount / symbols.length) * 100}%`,
      results,
      summary: {
        totalRequests: symbols.length,
        successCount,
        failureCount
      }
    });
  } catch (error) {
    console.error('Error testing Yahoo Finance rate limits:', error);
    res.status(500).json({
      status: 'error',
      message: 'Yahoo Finance rate limit test failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Test portfolio data consistency
 */
export const testPortfolioConsistency = async (req: Request, res: Response) => {
  try {
    const region = (req.query.region || 'USD') as string;
    
    // Get portfolio data
    const portfolioResult = await db.execute(sql`
      SELECT * FROM portfolios_${region.toLowerCase()} ORDER BY symbol
    `);
    
    // Get current prices
    const pricesResult = await db.execute(sql`
      SELECT * FROM current_prices WHERE region = ${region} ORDER BY symbol
    `);
    
    // Get holdings data
    const holdingsResult = await db.execute(sql`
      SELECT * FROM holdings_${region.toLowerCase()} ORDER BY symbol
    `);
    
    // Analyze consistency
    const portfolioMap = new Map();
    const pricesMap = new Map();
    const holdingsMap = new Map();
    
    portfolioResult.rows.forEach((row: any) => {
      portfolioMap.set(row.symbol, row);
    });
    
    pricesResult.rows.forEach((row: any) => {
      pricesMap.set(row.symbol, row);
    });
    
    holdingsResult.rows.forEach((row: any) => {
      holdingsMap.set(row.symbol, row);
    });
    
    // Check for inconsistencies
    const inconsistencies = [];
    
    // 1. Portfolio symbols without prices
    const portfolioSymbols = Array.from(portfolioMap.keys());
    const symbolsWithoutPrices = portfolioSymbols.filter(symbol => !pricesMap.has(symbol));
    
    // 2. Portfolio symbols without holdings
    const symbolsWithoutHoldings = portfolioSymbols.filter(symbol => !holdingsMap.has(symbol));
    
    // 3. Holdings without portfolio entry
    const holdingsSymbols = Array.from(holdingsMap.keys());
    const holdingsWithoutPortfolio = holdingsSymbols.filter(symbol => !portfolioMap.has(symbol));
    
    if (symbolsWithoutPrices.length > 0) {
      inconsistencies.push({
        type: 'symbolsWithoutPrices',
        count: symbolsWithoutPrices.length,
        symbols: symbolsWithoutPrices
      });
    }
    
    if (symbolsWithoutHoldings.length > 0) {
      inconsistencies.push({
        type: 'symbolsWithoutHoldings',
        count: symbolsWithoutHoldings.length,
        symbols: symbolsWithoutHoldings
      });
    }
    
    if (holdingsWithoutPortfolio.length > 0) {
      inconsistencies.push({
        type: 'holdingsWithoutPortfolio',
        count: holdingsWithoutPortfolio.length,
        symbols: holdingsWithoutPortfolio
      });
    }
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      region,
      summary: {
        portfolioCount: portfolioMap.size,
        pricesCount: pricesMap.size,
        holdingsCount: holdingsMap.size,
        inconsistencyCount: inconsistencies.length
      },
      inconsistencies: inconsistencies.length > 0 ? inconsistencies : "No inconsistencies found",
      consistency: inconsistencies.length === 0 ? 'consistent' : 'inconsistent'
    });
  } catch (error) {
    console.error('Error testing portfolio consistency:', error);
    res.status(500).json({
      status: 'error',
      message: 'Portfolio consistency test failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Helper functions

/**
 * Get database information
 */
async function getDatabaseInfo() {
  try {
    // Get database name
    const dbNameResult = await db.execute(sql`SELECT current_database()`);
    const dbName = dbNameResult.rows[0].current_database;
    
    // Get table counts
    const tableCountResult = await db.execute(sql`
      SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
    `);
    const tableCount = tableCountResult.rows[0].count;
    
    // Get some key table row counts
    const portfolioUsdCount = await db.execute(sql`SELECT count(*) FROM portfolios_usd`);
    const portfolioCadCount = await db.execute(sql`SELECT count(*) FROM portfolios_cad`);
    const portfolioIntlCount = await db.execute(sql`SELECT count(*) FROM portfolios_intl`);
    
    const currentPricesCount = await db.execute(sql`SELECT count(*) FROM current_prices`);
    const updateLogsCount = await db.execute(sql`SELECT count(*) FROM data_update_logs`);
    
    return {
      name: dbName,
      tableCount,
      rowCounts: {
        portfolios_usd: Number(portfolioUsdCount.rows[0].count || 0),
        portfolios_cad: Number(portfolioCadCount.rows[0].count || 0),
        portfolios_intl: Number(portfolioIntlCount.rows[0].count || 0),
        current_prices: Number(currentPricesCount.rows[0].count || 0),
        data_update_logs: Number(updateLogsCount.rows[0].count || 0)
      },
      connection: 'active'
    };
  } catch (error) {
    console.error('Error getting database info:', error);
    return {
      error: error instanceof Error ? error.message : String(error),
      connection: 'failed'
    };
  }
}

/**
 * Get information about available services
 */
function getServicesInfo() {
  return {
    historicalPriceService: {
      available: !!historicalPriceService,
      status: 'active'
    },
    currentPriceService: {
      available: !!currentPriceService,
      status: 'active'
    },
    yahooFinance: {
      available: !!yahooFinance,
      status: 'active'
    }
  };
}

/**
 * Get latest updates for each service
 */
async function getLatestUpdateInfo() {
  try {
    // Get latest update for each type
    const latestUpdates = await db
      .select()
      .from(dataUpdateLogs)
      .orderBy(desc(dataUpdateLogs.timestamp))
      .limit(20);
    
    const uniqueTypeUpdates: Record<string, any> = {};
    
    // Get most recent update for each type
    latestUpdates.forEach(log => {
      if (!uniqueTypeUpdates[log.type]) {
        uniqueTypeUpdates[log.type] = {
          timestamp: log.timestamp,
          status: log.status,
          details: log.details
        };
      }
    });
    
    return uniqueTypeUpdates;
  } catch (error) {
    console.error('Error fetching latest update info:', error);
    return { error: 'Failed to fetch latest update information' };
  }
}
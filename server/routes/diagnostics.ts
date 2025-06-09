import { Router } from 'express';
import { requestLogger } from '../middleware/request-logger';
import { db } from '../db';
import { portfolioUSD, portfolioCAD, portfolioINTL, portfolioCash } from '../../shared/schema';
import { count } from 'drizzle-orm';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// System health check
router.get('/health', asyncHandler(async (req, res) => {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {
      database: false,
      memory: false,
      uptime: false
    },
    details: {}
  };

  try {
    // Database check
    const [usdCount] = await db.select({ count: count() }).from(portfolioUSD);
    const [cadCount] = await db.select({ count: count() }).from(portfolioCAD);
    const [intlCount] = await db.select({ count: count() }).from(portfolioINTL);
    const [cashCount] = await db.select({ count: count() }).from(portfolioCash);
    
    healthChecks.checks.database = true;
    healthChecks.details = {
      ...healthChecks.details,
      database: {
        usdStocks: usdCount.count,
        cadStocks: cadCount.count,
        intlStocks: intlCount.count,
        cashBalances: cashCount.count
      }
    };
  } catch (error: any) {
    healthChecks.status = 'error';
    healthChecks.details = {
      ...healthChecks.details,
      database: { error: error?.message || 'Database connection failed' }
    };
  }

  // Memory check
  const memUsage = process.memoryUsage();
  healthChecks.checks.memory = memUsage.heapUsed < 500 * 1024 * 1024; // 500MB threshold
  healthChecks.details.memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
  };

  // Uptime check
  const uptimeSeconds = process.uptime();
  healthChecks.checks.uptime = uptimeSeconds > 0;
  healthChecks.details.uptime = {
    seconds: Math.round(uptimeSeconds),
    formatted: formatUptime(uptimeSeconds)
  };

  const allHealthy = Object.values(healthChecks.checks).every(check => check === true);
  if (!allHealthy) {
    healthChecks.status = 'degraded';
  }

  res.status(allHealthy ? 200 : 503).json(healthChecks);
}));

// Request logs and statistics
router.get('/requests', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const type = req.query.type as string;

  let logs;
  switch (type) {
    case 'errors':
      logs = requestLogger.getErrorLogs(limit);
      break;
    case 'slow':
      logs = requestLogger.getSlowRequests(1000, limit);
      break;
    default:
      logs = requestLogger.getLogs(limit);
  }

  const stats = requestLogger.getStats();

  res.json({
    stats,
    logs,
    timestamp: new Date().toISOString()
  });
}));

// System performance metrics
router.get('/performance', asyncHandler(async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    requests: requestLogger.getStats(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasRapidApi: !!process.env.RAPIDAPI_KEY,
      hasSeekingAlpha: !!process.env.SEEKING_ALPHA_API_KEY
    }
  };

  res.json(metrics);
}));

// Clear request logs
router.delete('/requests', asyncHandler(async (req, res) => {
  requestLogger.clearLogs();
  res.json({ 
    success: true, 
    message: 'Request logs cleared',
    timestamp: new Date().toISOString()
  });
}));

// Database connection test
router.get('/database', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test basic query
    const [result] = await db.select({ count: count() }).from(portfolioCash);
    const queryTime = Date.now() - startTime;

    // Test more complex query
    const complexStartTime = Date.now();
    const usdPortfolio = await db.select().from(portfolioUsd).limit(1);
    const complexQueryTime = Date.now() - complexStartTime;

    res.json({
      status: 'connected',
      responseTime: queryTime,
      complexQueryTime,
      basicQuery: { cashCount: result.count },
      sampleRecord: usdPortfolio[0] || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
}));

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router;
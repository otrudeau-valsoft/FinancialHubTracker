import { Router } from 'express';
import { db } from '../db';
import { portfolioUSD, portfolioCAD, portfolioINTL, portfolioCash } from '@shared/schema';
import { count } from 'drizzle-orm';

const router = Router();

// System health check
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test database connection
    const [usdCount] = await db.select({ count: count() }).from(portfolioUSD);
    const [cadCount] = await db.select({ count: count() }).from(portfolioCAD);
    const [intlCount] = await db.select({ count: count() }).from(portfolioINTL);
    const [cashCount] = await db.select({ count: count() }).from(portfolioCash);
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: true,
        usdStocks: usdCount.count,
        cadStocks: cadCount.count,
        intlStocks: intlCount.count,
        cashBalances: cashCount.count
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      uptime: Math.round(process.uptime()) + 's',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

export default router;
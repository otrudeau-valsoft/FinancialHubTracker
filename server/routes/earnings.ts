import { Router } from 'express';
import { db } from '../db';
import { earningsQuarterly, historicalPrices } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/earnings
 * Returns earnings data for requested tickers or all if no tickers provided
 */
router.get('/', async (req, res) => {
  try {
    const { tickers } = req.query;
    
    let earnings;
    if (tickers) {
      const tickerList = typeof tickers === 'string' ? [tickers] : tickers as string[];
      earnings = await db.select()
        .from(earningsQuarterly)
        .where(sql`ticker = ANY(${tickerList})`);
    } else {
      earnings = await db.select()
        .from(earningsQuarterly)
        .limit(100);
    }

    res.json({
      status: 'success',
      data: earnings,
      count: earnings.length
    });
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch earnings data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
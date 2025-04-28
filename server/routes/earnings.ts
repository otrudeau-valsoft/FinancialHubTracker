import { Router } from 'express';
import { db } from '../db';
import { earningsQuarterly } from '../../shared/schema';
import { updateEarningsData, beatStatus, revenueStatus } from '../services/updateEarnings';
import { eq, desc, and, sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/**
 * POST /api/admin/update-earnings
 * Updates earnings data for all portfolio stocks
 */
router.post('/admin/update-earnings', asyncHandler(async (req, res) => {
  try {
    const result = await updateEarningsData();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Error in update-earnings endpoint:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update earnings data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

/**
 * GET /api/earnings
 * Returns earnings data for requested tickers or all if no tickers provided
 */
router.get('/earnings', asyncHandler(async (req, res) => {
  try {
    const { tickers } = req.query;
    
    let earnings;
    let prices;
    
    if (tickers) {
      // Filter by provided tickers
      const tickerList = Array.isArray(tickers) 
        ? tickers
        : tickers.toString().split(',').map(t => t.trim());
      
      // Get earnings data for the tickers
      earnings = await db.select()
        .from(earningsQuarterly)
        .where(sql`ticker IN (${tickerList.join(',')})`)
        .orderBy(desc(earningsQuarterly.fiscal_year), desc(earningsQuarterly.fiscal_q));
      
      // Get current prices
      prices = await db.execute(sql`
        SELECT symbol as ticker, regular_market_price as price
        FROM current_prices
        WHERE symbol IN (${tickerList.join(',')})
        ORDER BY updated_at DESC
      `);
    } else {
      // Get all earnings data with limit
      earnings = await db.select()
        .from(earningsQuarterly)
        .orderBy(desc(earningsQuarterly.fiscal_year), desc(earningsQuarterly.fiscal_q))
        .limit(100); // Limit to prevent too much data
      
      // Get all tickers from the earnings data
      const earningsTickers = [...new Set(earnings.map(e => e.ticker))];
      
      if (earningsTickers.length > 0) {
        // Get current prices for all these tickers
        prices = await db.execute(sql`
          SELECT symbol as ticker, regular_market_price as price
          FROM current_prices
          WHERE symbol IN (${earningsTickers.join(',')})
          ORDER BY updated_at DESC
        `);
      } else {
        prices = [];
      }
    }
    
    // Create a map of current prices
    const priceMap = new Map();
    // Add defensive check to ensure prices is iterable
    if (prices && Array.isArray(prices)) {
      for (const price of prices) {
        if (price && price.ticker && !priceMap.has(price.ticker)) {
          priceMap.set(price.ticker, price.price);
        }
      }
    }
    
    // Add current price to each earnings record
    const earningsWithPrices = earnings.map(e => ({
      ...e,
      current_price: priceMap.get(e.ticker) || null
    }));
    
    res.json({
      status: 'success',
      data: earningsWithPrices
    });
    
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch earnings data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

/**
 * GET /api/heatmap
 * Returns aggregated heatmap data for the last four quarters
 */
router.get('/heatmap', asyncHandler(async (req, res) => {
  try {
    // Get the latest four quarters
    const quarters = await db.execute(sql`
      SELECT DISTINCT fiscal_year, fiscal_q 
      FROM earnings_quarterly
      ORDER BY fiscal_year DESC, fiscal_q DESC
      LIMIT 4
    `);
    
    if (!quarters || quarters.length === 0) {
      return res.json({
        status: 'success',
        data: []
      });
    }
    
    // Initialize result structure
    const result = [];
    
    // Process each quarter
    // Add defensive check to ensure quarters is iterable
    if (quarters && Array.isArray(quarters)) {
      for (const quarter of quarters) {
        const fiscal_year = quarter?.fiscal_year;
        const fiscal_q = quarter?.fiscal_q;
        
        // Skip if we don't have valid quarter information
        if (!fiscal_year || !fiscal_q) continue;
        
        // Get all earnings for this quarter
        const quarterData = await db.select()
          .from(earningsQuarterly)
          .where(and(
            eq(earningsQuarterly.fiscal_year, fiscal_year),
            eq(earningsQuarterly.fiscal_q, fiscal_q)
          ));
      
      // Calculate aggregations
      const epsStats = {
        Beat: quarterData.filter(d => beatStatus(d.eps_actual, d.eps_estimate) === 'Beat').length,
        'In-Line': quarterData.filter(d => beatStatus(d.eps_actual, d.eps_estimate) === 'In-Line').length,
        Miss: quarterData.filter(d => beatStatus(d.eps_actual, d.eps_estimate) === 'Miss').length,
      };
      
      const revStats = {
        Up: quarterData.filter(d => revenueStatus(d.rev_actual, d.rev_estimate) === 'Up').length,
        Flat: quarterData.filter(d => revenueStatus(d.rev_actual, d.rev_estimate) === 'Flat').length,
        Down: quarterData.filter(d => revenueStatus(d.rev_actual, d.rev_estimate) === 'Down').length,
      };
      
      const guidanceStats = {
        Increased: quarterData.filter(d => d.guidance === 'Increased').length,
        Maintain: quarterData.filter(d => d.guidance === 'Maintain').length,
        Decreased: quarterData.filter(d => d.guidance === 'Decreased').length,
      };
      
      const scoreStats = {
        Good: quarterData.filter(d => d.score === 'Good').length,
        Okay: quarterData.filter(d => d.score === 'Okay').length,
        Bad: quarterData.filter(d => d.score === 'Bad').length,
      };
      
      result.push({
        fiscal_year,
        fiscal_q,
        label: `Q${fiscal_q} ${fiscal_year}`,
        eps: epsStats,
        revenue: revStats,
        guidance: guidanceStats,
        score: scoreStats,
        count: quarterData.length
      });
      }
    }
    
    res.json({
      status: 'success',
      data: result
    });
    
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch heatmap data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

export default router;
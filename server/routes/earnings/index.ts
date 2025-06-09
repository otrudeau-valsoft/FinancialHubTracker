import { Router } from 'express';
import { db } from '../../db';
import { earningsQuarterly } from '../../../shared/schema';
import { updateEarningsData, beatStatus, revenueStatus } from '../../services/updateEarnings';
import { eq, desc, and, sql } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/admin/update-earnings
 * Updates earnings data for all portfolio stocks
 */
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
 * Returns earnings data for requested tickers
 */
  try {
    const { tickers } = req.query;
    
    if (!tickers) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Tickers parameter is required' 
      });
    }
    
    const tickerList = Array.isArray(tickers) 
      ? tickers
      : tickers.toString().split(',').map(t => t.trim());
    
    // Get earnings data for the tickers
    const earnings = await db.select()
      .from(earningsQuarterly)
      .where(sql`ticker IN (${tickerList.join(',')})`)
      .orderBy(desc(earningsQuarterly.fiscal_year), desc(earningsQuarterly.fiscal_q));
    
    // Get current prices
    const prices = await db.execute(sql`
      SELECT symbol as ticker, regular_market_price as price
      FROM current_prices
      WHERE symbol IN (${tickerList.join(',')})
      ORDER BY updated_at DESC
    `);
    
    // Create a map of current prices
    const priceMap = new Map();
    for (const price of prices) {
      if (!priceMap.has(price.ticker)) {
        priceMap.set(price.ticker, price.price);
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
  try {
    // Get the latest four quarters
    console.log('DEBUG - Fetching heatmap data');
    const quarters = await db.execute(sql`
      SELECT DISTINCT fiscal_year, fiscal_q 
      FROM earnings_quarterly
      ORDER BY fiscal_year DESC, fiscal_q DESC
      LIMIT 4
    `);
    
    console.log('DEBUG - Quarters fetched:', quarters);
    console.log('DEBUG - Processing quarter rows:', quarters.length);
    
    if (!quarters || quarters.length === 0) {
      return res.json({
        status: 'success',
        data: []
      });
    }
    
    console.log('DEBUG - Rows format:', typeof quarters.rows, Array.isArray(quarters.rows));
    
    // Initialize result structure
    const result = [];
    
    // Add additional debugging
    console.log('DEBUG - Final data structure before sending:', JSON.stringify(result, null, 2));
    
    // Process each quarter
    for (const quarter of quarters.rows) {
      const fiscal_year = quarter.fiscal_year;
      const fiscal_q = quarter.fiscal_q;
      console.log(`DEBUG - Starting processing for quarter: ${fiscal_year} Q${fiscal_q}`);
      // Get all earnings for this quarter
      const quarterData = await db.select()
        .from(earningsQuarterly)
        .where(and(
          eq(earningsQuarterly.fiscal_year, fiscal_year),
          eq(earningsQuarterly.fiscal_q, fiscal_q)
        ));
      
      // Fetch additional data to enhance the stocks array
      const stocksQuery = await db.execute(sql`
        SELECT 
          eq.ticker, 
          cp.regular_market_price as last,
          cp.target_mean_price as target_price,
          cp.recommendation_mean as recommendation_mean,
          cp.recommendation_key as consensus_recommendation,
          p.company_name as issuer_name
        FROM earnings_quarterly eq
        LEFT JOIN current_prices cp ON eq.ticker = cp.symbol
        LEFT JOIN (
          SELECT symbol, company_name FROM usd_portfolio
          UNION
          SELECT symbol, company_name FROM cad_portfolio
          UNION 
          SELECT symbol, company_name FROM intl_portfolio
        ) p ON eq.ticker = p.symbol
        WHERE eq.fiscal_year = ${fiscal_year} AND eq.fiscal_q = ${fiscal_q}
      `);
      
      // Create a map for quick lookups
      const stockDataMap = new Map();
      // Make sure stocksQuery is an array before trying to iterate
      console.log(`DEBUG - Processing quarter: ${fiscal_year} ${fiscal_q}`);
      console.log(`DEBUG - Quarter data length: ${quarterData.length}`);
      console.log(`DEBUG - stocksQuery:`, stocksQuery);
      
      const stocksArray = Array.isArray(stocksQuery.rows) ? stocksQuery.rows : [];
      console.log(`DEBUG - stocksArray length: ${stocksArray.length}`);
      
      stocksArray.forEach(s => {
        if (s && s.ticker) {
          stockDataMap.set(s.ticker, s);
        }
      });

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
        Good: quarterData.filter(d => (d.score || 0) >= 7).length,
        Okay: quarterData.filter(d => (d.score || 0) >= 4 && (d.score || 0) < 7).length,
        Bad: quarterData.filter(d => (d.score || 0) < 4).length,
      };
      
      // Create stock data for the heatmap table display
      console.log(`DEBUG - Creating stock data for ${quarterData.length} earnings records`);
      const stocks = quarterData.map(earning => {
        const stockData = stockDataMap.get(earning.ticker) || {};
        const epsStatus = beatStatus(earning.eps_actual, earning.eps_estimate);
        const revStatus = revenueStatus(earning.rev_actual, earning.rev_estimate);
        
        // Convert score integer to string for UI
        let earningsScore = 'N/A';
        const scoreVal = typeof earning.score === 'number' ? earning.score : 0;
        if (earning.score !== null) {
          if (scoreVal >= 7) earningsScore = 'Good';
          else if (scoreVal >= 4) earningsScore = 'Okay';
          else earningsScore = 'Bad';
        }
        
        // Calculate market reaction commentary
        let mktReactionCommentary = 'Normal';
        const mktReaction = typeof earning.mkt_reaction === 'number' ? earning.mkt_reaction : 0;
        if (mktReaction !== 0 && earning.score !== null) {
          // Determine if the reaction is abnormal based on the score and reaction direction
          const isAbnormal = (scoreVal >= 7 && mktReaction < 0) || 
                             (scoreVal < 4 && mktReaction > 0);
          
          // Check for extreme reactions (more than 10%)
          const isExtreme = Math.abs(mktReaction) > 10;
          
          if (isExtreme) {
            mktReactionCommentary = 'Explosive';
          } else if (isAbnormal) {
            mktReactionCommentary = 'Abnormal';
          }
        }
        
        return {
          ticker: earning.ticker,
          issuerName: stockData.issuer_name || earning.ticker,
          consensusRecommendation: stockData.consensus_recommendation || 'N/A',
          last: stockData.last || 0,
          price: {
            earningsRate: earning.mkt_reaction || 0,
            ytd: 0, // We could calculate this from historical prices if needed
            pctOf52w: 0, // We could calculate this from historical prices if needed
          },
          eps: epsStatus,
          rev: revStatus,
          guidance: earning.guidance || 'N/A',
          earningsScore: earningsScore,
          mktReaction: earning.mkt_reaction || 0,
          mktReactionCommentary: mktReactionCommentary
        };
      });
      
      console.log(`DEBUG - Created ${stocks.length} stock records for the heatmap`);
      if (stocks.length === 0 && quarterData.length > 0) {
        console.log('WARNING: No stock records created even though we have quarter data!')
      }
      
      result.push({
        fiscal_year,
        fiscal_q,
        label: `Q${fiscal_q} ${fiscal_year}`,
        eps: epsStats,
        revenue: revStats,
        guidance: guidanceStats,
        score: scoreStats,
        count: quarterData.length,
        stocks: stocks // Add the stocks array for the heatmap table
      });
    }
    
    // Add final debug before sending response
    console.log('DEBUG - Final data structure:', JSON.stringify(result, null, 2));
    console.log('DEBUG - Does the first quarter have a stocks array?', 
                result.length > 0 && Array.isArray(result[0].stocks) ? 
                `Yes, with ${result[0].stocks.length} elements` : 'No');
                
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
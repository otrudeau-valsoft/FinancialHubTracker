import express from 'express';
import { pool } from '../db';
import { DateTime } from 'luxon';

const portfolioPerformanceHistoryRouter = express.Router();

// Get historical portfolio performance data from the dedicated table
portfolioPerformanceHistoryRouter.get('/', async (req, res) => {
  try {
    // Get query parameters
    const regionStr = typeof req.query.region === 'string' ? req.query.region : 'USD';
    const timeRangeStr = typeof req.query.timeRange === 'string' ? req.query.timeRange : '1Y';
    
    if (!regionStr) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Region is required' 
      });
    }
    
    // Validate region is one of the allowed values
    if (!['USD', 'CAD', 'INTL'].includes(regionStr)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid region. Must be one of: USD, CAD, INTL'
      });
    }
    
    // Define date range based on timeRange
    const now = DateTime.now().setZone('America/New_York');
    let startDate = now.minus({ months: 1 }); // Default to 1 month
    
    if (timeRangeStr === '1W') {
      startDate = now.minus({ weeks: 1 });
    } else if (timeRangeStr === '1M') {
      startDate = now.minus({ months: 1 });
    } else if (timeRangeStr === 'YTD') {
      startDate = DateTime.fromObject({ year: now.year, month: 1, day: 1 }, { zone: 'America/New_York' });
    } else if (timeRangeStr === '1Y') {
      startDate = now.minus({ years: 1 });
    }
    
    // Format dates for SQL query
    const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
    
    console.log('Portfolio performance history request:', { 
      region: regionStr, 
      timeRange: timeRangeStr,
      startDate: formattedStartDate
    });
    
    // Query the portfolio_performance table with our parameters
    const queryText = `
      SELECT 
        date,
        portfolio_value,
        benchmark_value,
        portfolio_return_daily,
        benchmark_return_daily,
        portfolio_cumulative_return as "portfolioCumulativeReturn",
        benchmark_cumulative_return as "benchmarkCumulativeReturn",
        relative_performance as "relativePerformance"
      FROM 
        portfolio_performance
      WHERE 
        region = $1
        AND date >= $2
      ORDER BY 
        date
    `;
    
    const result = await pool.query(queryText, [regionStr, formattedStartDate]);
    
    // Format the response
    const performances = result.rows.map(row => ({
      date: row.date,
      portfolioValue: parseFloat(row.portfolio_value),
      benchmarkValue: parseFloat(row.benchmark_value),
      portfolioReturnDaily: row.portfolio_return_daily ? parseFloat(row.portfolio_return_daily) : null,
      benchmarkReturnDaily: row.benchmark_return_daily ? parseFloat(row.benchmark_return_daily) : null,
      portfolioCumulativeReturn: row.portfolioCumulativeReturn ? parseFloat(row.portfolioCumulativeReturn) : null,
      benchmarkCumulativeReturn: row.benchmarkCumulativeReturn ? parseFloat(row.benchmarkCumulativeReturn) : null,
      relativePerformance: row.relativePerformance ? parseFloat(row.relativePerformance) : null
    }));
    
    return res.json({ 
      status: 'success', 
      data: performances 
    });
  } catch (error) {
    console.error('Error fetching portfolio performance history:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch portfolio performance history', 
      details: error.message || String(error)
    });
  }
});

export default portfolioPerformanceHistoryRouter;
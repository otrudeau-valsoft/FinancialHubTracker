import express from 'express';
import { pool } from '../db';
import { DateTime } from 'luxon';

const portfolioPerformanceRouter = express.Router();

// Get historical portfolio performance data
portfolioPerformanceRouter.get('/', async (req, res) => {
  try {
    // Get query parameters directly from URL
    const regionStr = typeof req.query.region === 'string' ? req.query.region : '';
    const timeRangeStr = typeof req.query.timeRange === 'string' ? req.query.timeRange : '1M';

    console.log('Portfolio performance request:', { 
      region: regionStr, 
      timeRange: timeRangeStr 
    });
    
    if (!regionStr) {
      return res.status(400).json({ status: 'error', message: 'Region is required' });
    }
    
    // Validate region is one of the allowed values
    let portfolioTable = '';
    if (regionStr === 'USD') {
      portfolioTable = 'portfolio_USD';
    } else if (regionStr === 'CAD') {
      portfolioTable = 'portfolio_CAD';
    } else if (regionStr === 'INTL') {
      portfolioTable = 'portfolio_INTL';
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid region. Must be one of: USD, CAD, INTL'
      });
    }
    
    // Define date range based on timeRange
    const now = DateTime.now().setZone('America/New_York');
    let startDate = now.minus({ days: 30 }); // Default to 1 month
    
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
    const formattedEndDate = now.toFormat('yyyy-MM-dd');
    
    // Use direct raw SQL query with manually constructed table name
    const portfolioQueryText = `
      SELECT 
        historical_prices.date, 
        SUM(historical_prices.close * ${portfolioTable}.quantity) as "portfolioValue"
      FROM 
        historical_prices
      INNER JOIN 
        ${portfolioTable} ON (
          historical_prices.symbol = ${portfolioTable}.symbol OR 
          historical_prices.symbol = CONCAT(${portfolioTable}.symbol, '.TO')
        )
      WHERE 
        historical_prices.region = $1
        AND historical_prices.date >= $2
        AND historical_prices.date < $3
      GROUP BY 
        historical_prices.date
      ORDER BY 
        historical_prices.date
    `;
    
    // Get benchmark (ETF) value history using raw query as well
    const benchmarkSymbol = regionStr === 'USD' ? 'SPY' : (regionStr === 'CAD' ? 'XIC' : 'ACWX');
    
    const benchmarkQueryText = `
      SELECT 
        date, 
        close as "benchmarkValue"
      FROM 
        historical_prices
      WHERE 
        symbol = $1
        AND region = 'USD' -- Benchmarks are in USD region
        AND date >= $2
        AND date < $3
      ORDER BY 
        date
    `;
    
    // Execute both queries
    const portfolioData = await pool.query(portfolioQueryText, [regionStr, formattedStartDate, formattedEndDate]);
    const benchmarkData = await pool.query(benchmarkQueryText, [benchmarkSymbol, formattedStartDate, formattedEndDate]);
    
    // Prepare combined data with relative performance
    const combinedData = [];
    const portData = portfolioData.rows;
    const benchData = benchmarkData.rows;
    
    // Create a map for faster lookup of benchmark data by date
    const benchmarkMap = {};
    for (const row of benchData) {
      if (row && typeof row.date === 'string') {
        // Convert PostgreSQL date string to yyyy-MM-dd format
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        benchmarkMap[dateStr] = typeof row.benchmarkValue === 'number' 
          ? row.benchmarkValue 
          : Number(row.benchmarkValue) || 0;
      }
    }
    
    // Combine the portfolio and benchmark data
    for (const row of portData) {
      if (row && typeof row.date === 'string') {
        // Convert PostgreSQL date string to yyyy-MM-dd format
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        combinedData.push({
          date: dateStr,
          portfolioValue: typeof row.portfolioValue === 'number' 
            ? row.portfolioValue 
            : Number(row.portfolioValue) || 0,
          benchmarkValue: benchmarkMap[dateStr] || 0
        });
      }
    }
    
    return res.json({ 
      status: 'success', 
      data: combinedData 
    });
  } catch (error) {
    console.error('Error fetching portfolio performance:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch portfolio performance data',
      details: error.message || String(error)
    });
  }
});

export default portfolioPerformanceRouter;
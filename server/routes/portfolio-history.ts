import express from 'express';
import { db, pool } from '../db';
import { historicalPrices } from '@shared/schema';
import { eq, sql, desc, and, gte, lt, between } from 'drizzle-orm';
import { DateTime } from 'luxon';

const portfolioHistoryRouter = express.Router();

// Get historical portfolio performance data
portfolioHistoryRouter.get('/', async (req, res) => {
  try {
    // Get query parameters directly from URL to avoid any potential parsing issues
    const regionStr = typeof req.query.region === 'string' ? req.query.region : '';
    const timeRangeStr = typeof req.query.timeRange === 'string' ? req.query.timeRange : '1M';

    console.log('Portfolio history raw query:', req.query);
    console.log('Portfolio history parsed params:', { 
      region: regionStr, 
      timeRange: timeRangeStr,
      regionType: typeof req.query.region
    });
    
    if (!regionStr) {
      return res.status(400).json({ status: 'error', message: 'Region is required' });
    }
    
    // Validate region is one of the allowed values and force it to a fixed value
    let region: string;
    if (regionStr === 'USD') {
      region = 'USD';
    } else if (regionStr === 'CAD') {
      region = 'CAD';
    } else if (regionStr === 'INTL') {
      region = 'INTL';
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid region. Must be one of: USD, CAD, INTL'
      });
    }
    
    // Use a local variable for timeRange
    const timeRange = timeRangeStr;
    
    // Define date range based on timeRange
    const now = DateTime.now().setZone('America/New_York');
    let startDate = now.minus({ days: 30 }); // Default to 1 month
    
    if (timeRange === '1W') {
      startDate = now.minus({ weeks: 1 });
    } else if (timeRange === '1M') {
      startDate = now.minus({ months: 1 });
    } else if (timeRange === 'YTD') {
      startDate = DateTime.fromObject({ year: now.year, month: 1, day: 1 }, { zone: 'America/New_York' });
    } else if (timeRange === '1Y') {
      startDate = now.minus({ years: 1 });
    }
    
    // Format dates for SQL query
    const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
    const formattedEndDate = now.toFormat('yyyy-MM-dd');
    
    // Get portfolio value history using raw query through the pool
    let portfolioData;
    let portfolioTableName = '';
    
    // Determine which portfolio table to use
    if (region === 'USD') {
      portfolioTableName = 'portfolio_USD';
    } else if (region === 'CAD') {
      portfolioTableName = 'portfolio_CAD';
    } else if (region === 'INTL') {
      portfolioTableName = 'portfolio_INTL';
    }
    
    // Use direct SQL query with manually constructed table name
    try {
      const queryText = `
        SELECT 
          historical_prices.date, 
          SUM(historical_prices.close * ${portfolioTableName}.quantity) as "portfolioValue"
        FROM 
          historical_prices
        INNER JOIN 
          ${portfolioTableName} ON (
            historical_prices.symbol = ${portfolioTableName}.symbol OR 
            historical_prices.symbol = CONCAT(${portfolioTableName}.symbol, '.TO')
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
      
      console.log('Executing portfolio history query:', {
        region, 
        portfolioTableName,
        formattedStartDate,
        formattedEndDate,
        queryText
      });
      
      portfolioData = await pool.query(queryText, [region, formattedStartDate, formattedEndDate]);
    } catch (queryError) {
      console.error('Error in portfolio query:', queryError);
      throw queryError;
    }
    
    // Get benchmark (ETF) value history using raw pool query
    const benchmarkSymbol = region === 'USD' ? 'SPY' : (region === 'CAD' ? 'XIC' : 'ACWX');
    
    // Use direct SQL query for benchmark data as well
    let benchmarkData;
    try {
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
      
      console.log('Executing benchmark history query:', {
        benchmarkSymbol,
        formattedStartDate,
        formattedEndDate
      });
      
      benchmarkData = await pool.query(benchmarkQueryText, [benchmarkSymbol, formattedStartDate, formattedEndDate]);
    } catch (benchmarkError) {
      console.error('Error in benchmark query:', benchmarkError);
      throw benchmarkError;
    }
    
    // Combine the data
    const combinedData = [];
    const portData = portfolioData.rows;
    const benchData = benchmarkData.rows;
    
    // Create a map for faster lookup of benchmark data by date
    const benchmarkMap: Record<string, number> = {};
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
    console.error('Error fetching portfolio history:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch portfolio history data' 
    });
  }
});

export default portfolioHistoryRouter;
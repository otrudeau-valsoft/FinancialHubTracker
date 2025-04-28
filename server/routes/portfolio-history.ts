import express from 'express';
import { db } from '../db';
import { historicalPrices } from '@shared/schema';
import { eq, sql, desc, and, gte, lt, between } from 'drizzle-orm';
import { DateTime } from 'luxon';

const portfolioHistoryRouter = express.Router();

// Get historical portfolio performance data
portfolioHistoryRouter.get('/', async (req, res) => {
  try {
    const { region, timeRange } = req.query;
    
    console.log('Portfolio history request:', { region, timeRange, queryParams: req.query });
    
    if (!region) {
      return res.status(400).json({ status: 'error', message: 'Region is required' });
    }
    
    // Validate region is one of the allowed values
    const validRegions = ['USD', 'CAD', 'INTL'];
    if (!validRegions.includes(region as string)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid region. Must be one of: USD, CAD, INTL'
      });
    }
    
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
    
    // Get portfolio value history
    let portfolioData;
    
    // Use region-specific queries instead of template literals for table names
    if (region === 'USD') {
      portfolioData = await db.execute(sql`
        SELECT 
          historical_prices.date, 
          SUM(historical_prices.close * portfolio_USD.quantity) as "portfolioValue"
        FROM 
          historical_prices
        INNER JOIN 
          portfolio_USD ON (
            historical_prices.symbol = portfolio_USD.symbol OR 
            historical_prices.symbol = CONCAT(portfolio_USD.symbol, '.TO')
          )
        WHERE 
          historical_prices.region = ${region}
          AND historical_prices.date >= ${formattedStartDate}
          AND historical_prices.date < ${formattedEndDate}
        GROUP BY 
          historical_prices.date
        ORDER BY 
          historical_prices.date
      `);
    } else if (region === 'CAD') {
      portfolioData = await db.execute(sql`
        SELECT 
          historical_prices.date, 
          SUM(historical_prices.close * portfolio_CAD.quantity) as "portfolioValue"
        FROM 
          historical_prices
        INNER JOIN 
          portfolio_CAD ON (
            historical_prices.symbol = portfolio_CAD.symbol OR 
            historical_prices.symbol = CONCAT(portfolio_CAD.symbol, '.TO')
          )
        WHERE 
          historical_prices.region = ${region}
          AND historical_prices.date >= ${formattedStartDate}
          AND historical_prices.date < ${formattedEndDate}
        GROUP BY 
          historical_prices.date
        ORDER BY 
          historical_prices.date
      `);
    } else if (region === 'INTL') {
      portfolioData = await db.execute(sql`
        SELECT 
          historical_prices.date, 
          SUM(historical_prices.close * portfolio_INTL.quantity) as "portfolioValue"
        FROM 
          historical_prices
        INNER JOIN 
          portfolio_INTL ON (
            historical_prices.symbol = portfolio_INTL.symbol OR 
            historical_prices.symbol = CONCAT(portfolio_INTL.symbol, '.TO')
          )
        WHERE 
          historical_prices.region = ${region}
          AND historical_prices.date >= ${formattedStartDate}
          AND historical_prices.date < ${formattedEndDate}
        GROUP BY 
          historical_prices.date
        ORDER BY 
          historical_prices.date
      `);
    }
    
    // Get benchmark (ETF) value history
    const benchmarkSymbol = region === 'USD' ? 'SPY' : (region === 'CAD' ? 'XIC' : 'ACWX');
    
    const benchmarkData = await db.execute(sql`
      SELECT 
        date, 
        close as "benchmarkValue"
      FROM 
        historical_prices
      WHERE 
        symbol = ${benchmarkSymbol}
        AND region = 'USD' -- Benchmarks are in USD region
        AND date >= ${formattedStartDate}
        AND date < ${formattedEndDate}
      ORDER BY 
        date
    `);
    
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
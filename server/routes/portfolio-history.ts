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
    
    if (!region) {
      return res.status(400).json({ status: 'error', message: 'Region is required' });
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
    const portfolioTable = sql`portfolio_${region}`;
    const portfolioData = await db.select({
      date: historicalPrices.date,
      portfolioValue: sql`SUM(historical_prices.close_price * ${portfolioTable}.quantity)`,
    })
    .from(historicalPrices)
    .innerJoin(portfolioTable, eq(historicalPrices.symbol, sql`${portfolioTable}.symbol`))
    .where(
      and(
        eq(historicalPrices.region, region as string),
        gte(historicalPrices.date, formattedStartDate),
        lt(historicalPrices.date, formattedEndDate)
      )
    )
    .groupBy(historicalPrices.date)
    .orderBy(historicalPrices.date);
    
    // Get benchmark (ETF) value history
    const benchmarkSymbol = region === 'USD' ? 'SPY' : (region === 'CAD' ? 'XIC' : 'ACWX');
    
    const benchmarkData = await db.select({
      date: historicalPrices.date,
      benchmarkValue: historicalPrices.closePrice, // Access column name as defined in schema
    })
    .from(historicalPrices)
    .where(
      and(
        eq(historicalPrices.symbol, benchmarkSymbol),
        eq(historicalPrices.region, 'USD'), // Benchmarks are in USD region
        gte(historicalPrices.date, formattedStartDate),
        lt(historicalPrices.date, formattedEndDate)
      )
    )
    .orderBy(historicalPrices.date);
    
    // Combine the data
    const combinedData = portfolioData.map(portfolioPoint => {
      const matchingBenchmark = benchmarkData.find(b => b.date === portfolioPoint.date);
      return {
        date: portfolioPoint.date,
        portfolioValue: portfolioPoint.portfolioValue || 0,
        benchmarkValue: matchingBenchmark?.benchmarkValue || 0
      };
    });
    
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
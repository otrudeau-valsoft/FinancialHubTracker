import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { DateTime } from 'luxon';

const router = Router();

/**
 * Get portfolio performance history data for a specific region
 * 
 * This endpoint provides portfolio performance data for visualization
 * in charts, including portfolio value, benchmark value, and cumulative returns
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get query parameters
    const region = (req.query.region as string) || 'USD';
    const timeRange = (req.query.timeRange as string) || 'YTD';
    
    console.log('Portfolio performance history request:', { region, timeRange, startDate: req.query.startDate });
    
    // Validate region parameter
    const validRegions = ['USD', 'CAD', 'INTL'];
    if (!validRegions.includes(region.toUpperCase())) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid region: ${region}. Must be one of: ${validRegions.join(', ')}`
      });
    }
    
    // Calculate date range based on timeRange parameter
    let startDate: DateTime;
    const endDate = DateTime.now().setZone('America/New_York');
    
    if (req.query.startDate) {
      // If specific start date is provided, use it
      startDate = DateTime.fromISO(req.query.startDate as string);
    } else {
      // Otherwise calculate based on timeRange
      switch (timeRange) {
        case '1W':
          startDate = endDate.minus({ weeks: 1 });
          break;
        case '1M':
          startDate = endDate.minus({ months: 1 });
          break;
        case '3M':
          startDate = endDate.minus({ months: 3 });
          break;
        case '6M':
          startDate = endDate.minus({ months: 6 });
          break;
        case 'YTD':
          startDate = DateTime.fromObject({ year: endDate.year, month: 1, day: 1 });
          break;
        case '1Y':
          startDate = endDate.minus({ years: 1 });
          break;
        case '5Y':
          startDate = endDate.minus({ years: 5 });
          break;
        case 'ALL':
          // For all time, go back 10 years or just use a very old date
          startDate = endDate.minus({ years: 10 });
          break;
        default:
          startDate = DateTime.fromObject({ year: endDate.year, month: 1, day: 1 }); // Default to YTD
      }
    }
    
    // Format dates for PostgreSQL
    const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
    const formattedEndDate = endDate.toFormat('yyyy-MM-dd');
    
    // Query the region-specific performance table
    const upperRegion = region.toUpperCase();
    
    // Create the query based on the region
    let tableName;
    switch (upperRegion) {
      case 'USD':
        tableName = 'portfolio_performance_USD';
        break;
      case 'CAD':
        tableName = 'portfolio_performance_CAD';
        break;
      case 'INTL':
        tableName = 'portfolio_performance_INTL';
        break;
      default:
        tableName = 'portfolio_performance_USD'; // Default to USD as fallback
    }
    
    const query = `
      SELECT 
        date, 
        portfolio_value, 
        benchmark_value,
        portfolio_return_daily,
        benchmark_return_daily,
        portfolio_cumulative_return,
        benchmark_cumulative_return,
        relative_performance
      FROM "${tableName}"
      WHERE date BETWEEN $1 AND $2
      ORDER BY date
    `;
    
    const result = await pool.query(query, [formattedStartDate, formattedEndDate]);
    
    // If no data is found, return an empty array with success status
    if (!result.rows || result.rows.length === 0) {
      return res.json({
        status: 'success',
        data: []
      });
    }
    
    // Format the data for the frontend
    const formattedData = result.rows.map(row => ({
      date: row.date, // This is a Date object
      portfolioValue: parseFloat(row.portfolio_value),
      benchmarkValue: parseFloat(row.benchmark_value),
      portfolioReturnDaily: row.portfolio_return_daily ? parseFloat(row.portfolio_return_daily) : null,
      benchmarkReturnDaily: row.benchmark_return_daily ? parseFloat(row.benchmark_return_daily) : null,
      portfolioCumulativeReturn: parseFloat(row.portfolio_cumulative_return),
      benchmarkCumulativeReturn: parseFloat(row.benchmark_cumulative_return),
      relativePerformance: parseFloat(row.relative_performance)
    }));
    
    return res.json({
      status: 'success',
      data: formattedData
    });
  } catch (error: unknown) {
    console.error('Error fetching portfolio performance history:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch portfolio performance history',
      details: errorMessage
    });
  }
});

export default router;
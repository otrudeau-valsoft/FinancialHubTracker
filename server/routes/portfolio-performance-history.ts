import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { DateTime } from 'luxon';
import { updatePortfolioPerformanceHistory } from '../controllers/price/price.controller';

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
      
      // Make sure the date is valid, otherwise use default
      if (!startDate.isValid) {
        console.warn(`Invalid startDate provided: ${req.query.startDate}, using default instead`);
        startDate = endDate.minus({ years: 1.5 }); // Default to 1.5 years for maximum data
      }
    } else {
      // Always get 1.5 years of data if no start date specified, as we filter on client
      // This ensures we have enough data for any requested time range
      startDate = endDate.minus({ years: 1.5 });
      console.log(`Using long-range data fetch for ${timeRange}: ${startDate.toFormat('yyyy-MM-dd')} to ${endDate.toFormat('yyyy-MM-dd')}`);
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
        tableName = 'portfolio_performance_usd';
        break;
      case 'CAD':
        tableName = 'portfolio_performance_cad';
        break;
      case 'INTL':
        tableName = 'portfolio_performance_intl';
        break;
      default:
        tableName = 'portfolio_performance_usd'; // Default to USD as fallback
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
      FROM ${tableName}
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

/**
 * Update the portfolio performance history for all regions
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    console.log('Manually triggering portfolio performance history update...');
    const result = await updatePortfolioPerformanceHistory();
    
    if (result) {
      // Also update individual stock percentage metrics
      console.log('Updating individual stock performance metrics...');
      const { updatePortfolioMetrics } = await import('../services/portfolio-metrics-updater');
      await updatePortfolioMetrics();
      
      return res.json({
        status: 'success',
        message: 'Successfully updated portfolio performance history and stock metrics'
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update portfolio performance history'
      });
    }
  } catch (error: unknown) {
    console.error('Error in portfolio performance history update:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update portfolio performance history',
      details: errorMessage
    });
  }
});

export default router;
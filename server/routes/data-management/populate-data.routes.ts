import { Router } from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler';
import { populateData } from '../../scripts/populate-data';
import { historicalPriceService } from '../../services/historical-price-service';
import { dataUpdateLogs } from '../../../shared/schema';
import { db } from '../../db';

const router = Router();

/**
 * Populate database with sample data
 * 
 * This endpoint is for development and testing purposes.
 * It populates the database with sample data for holdings and portfolios.
 * 
 * @route POST /api/data-management/populate-data
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const result = await populateData();
  
  if (result.success) {
    return res.json({
      status: 'success',
      message: 'Database populated with sample data successfully'
    });
  } else {
    return res.status(500).json({
      status: 'error',
      message: 'Error populating database with sample data',
      error: result.error
    });
  }
}));

/**
 * Update benchmark ETF historical prices
 * 
 * This endpoint triggers an update of historical price data for benchmark ETFs
 * (SPY, XIC.TO, ACWX) that are used for portfolio performance comparison.
 * 
 * @route POST /api/data-management/populate-data/benchmark-etfs
 */
router.post('/benchmark-etfs', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Log start of update
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Update',
      status: 'In Progress',
      details: 'Starting update of benchmark ETF historical prices',
      timestamp: new Date()
    });
    
    // Execute the update
    const result = await historicalPriceService.updateBenchmarkHistoricalPrices();
    
    // Count successes and failures
    const successCount = result.filter(r => r.success).length;
    const errorCount = result.filter(r => !r.success).length;
    
    // Log completion
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Update',
      status: errorCount === 0 ? 'Success' : 'Error',
      details: `Updated ${successCount} benchmark ETFs with ${errorCount} errors`,
      timestamp: new Date()
    });
    
    if (errorCount === 0) {
      return res.json({
        status: 'success',
        message: `Successfully updated historical prices for ${successCount} benchmark ETFs`,
        result
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: `Updated ${successCount} benchmark ETFs with ${errorCount} errors`,
        result
      });
    }
  } catch (error) {
    // Log error
    await db.insert(dataUpdateLogs).values({
      type: 'Benchmark ETF Update',
      status: 'Error',
      details: `Error updating benchmark ETF historical prices: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'Error updating benchmark ETF historical prices',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

export default router;
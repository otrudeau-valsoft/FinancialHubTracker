import { Router } from 'express';
import { Request, Response } from 'express';
import { populateData } from '../../scripts/populate-data';

const router = Router();

/**
 * Populate database with sample data
 * 
 * This endpoint is for development and testing purposes.
 * It populates the database with sample data for holdings and portfolios.
 * 
 * @route POST /api/data-management/populate-data
 */
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

export default router;
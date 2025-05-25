/**
 * Moving Average Routes
 */

import express from 'express';
import * as MovingAverageController from '../../controllers/moving-average-controller';

const router = express.Router();

// Get Moving Average data for a symbol and region
router.get('/:symbol/:region', MovingAverageController.getMovingAverageData);

// Calculate Moving Average data for a specific symbol and region
router.post('/calculate/:symbol/:region', MovingAverageController.calculateMovingAverageData);

// Calculate Moving Average data for all symbols in a portfolio
router.post('/calculate-portfolio/:region', MovingAverageController.calculatePortfolioMovingAverages);

// Calculate Moving Average data for all symbols across all regions (USD, CAD, INTL)
router.post('/calculate-all-regions', MovingAverageController.calculateAllRegionsMovingAverages);

export default router;
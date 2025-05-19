/**
 * Moving Average Routes
 */

import { Router } from 'express';
import * as MovingAverageController from '../../controllers/moving-average-controller';

const router = Router();

// Get moving average data for a specific symbol and region
router.get('/:symbol/:region', MovingAverageController.getMovingAverageData);

// Calculate and update moving averages for a specific symbol
router.post('/calculate/:symbol/:region', MovingAverageController.calculateMovingAverageData);

// Calculate and update moving averages for all stocks in a portfolio
router.post('/calculate-portfolio/:region', MovingAverageController.calculateMovingAveragesForPortfolio);

export default router;
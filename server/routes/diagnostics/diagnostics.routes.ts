/**
 * Diagnostics Routes
 * Endpoints for system health, testing and performance monitoring.
 */
import { Router } from 'express';
import { 
  getSystemHealth,
  testDatabaseConnection,
  testYahooFinanceConnection,
  testYahooFinanceRateLimit,
  getDataUpdateStats,
  testPortfolioConsistency
} from '../../controllers/diagnostics/diagnostics.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// System health endpoint
router.get('/health', asyncHandler(getSystemHealth));

// Database test endpoints
router.get('/test/database', asyncHandler(testDatabaseConnection));

// API connectivity tests
router.get('/test/yahoo-finance', asyncHandler(testYahooFinanceConnection));
router.get('/test/yahoo-finance/rate-limit', asyncHandler(testYahooFinanceRateLimit));

// Data update statistics
router.get('/stats/updates', asyncHandler(getDataUpdateStats));

// Data consistency tests
router.get('/test/portfolio-consistency', asyncHandler(testPortfolioConsistency));

export default router;
import { Router } from 'express';
import portfolioRoutes from './portfolio/portfolio.routes';
import etfRoutes from './etf/etf.routes';
import matrixRoutes from './matrix/matrix.routes';
import alertsRoutes from './alerts/alerts.routes';
import { historicalPriceRoutes, currentPriceRoutes, performanceHistoryRoutes } from './price/price.routes';
import dataRoutes from './data/data.routes';
import upgradeDowngradeRoutes from './upgrade-downgrade/upgrade-downgrade.routes';
import dataManagementRoutes from './data-management';
import schedulerRoutes from './scheduler/scheduler.routes';
import apiHealthRoutes from './api-health.routes';
import holdingsRoutes from './holdings';
import cashRoutes from './cash';
import portfolioHistoryRoutes from './portfolio-history';
import portfolioPerformanceRoutes from './portfolio-performance';
import portfolioPerformanceHistoryRoutes from './portfolio-performance-history';
import earningsRoutes from './earnings';
import marketIndicesRoutes from './market-indices';
import diagnosticsRoutes from './diagnostics/diagnostics.routes';
import { getNewsBySymbol, getNewsForPortfolio } from './news';

const router = Router();

// Health check endpoint
router.use('/', apiHealthRoutes);

// Register all routes with their respective prefixes to maintain original API paths
router.use('/portfolios', portfolioRoutes);
router.use('/etfs', etfRoutes);
router.use('/matrix-rules', matrixRoutes);
router.use('/alerts', alertsRoutes);

// Historical prices routes - now using dedicated router
router.use('/historical-prices', historicalPriceRoutes);
// Current prices routes - now using dedicated router
router.use('/current-prices', currentPriceRoutes);

// Data update routes
router.use('/data-updates', dataRoutes);

// Scheduler routes
router.use('/scheduler', schedulerRoutes);

// Upgrade/downgrade routes
router.use('/upgrade-downgrade', upgradeDowngradeRoutes);

// Holdings routes - new optimized tables combining portfolio and price data
router.use('/holdings', holdingsRoutes);

// Cash management routes
router.use('/cash', cashRoutes);

// Portfolio history routes for performance charts
router.use('/portfolio-history', portfolioHistoryRoutes);

// New portfolio performance routes (alternative implementation with raw SQL)
router.use('/portfolio-performance', portfolioPerformanceRoutes);

// Portfolio performance history routes (from dedicated history table)
router.use('/portfolio-performance-history', performanceHistoryRoutes);

// Earnings routes
router.use('/', earningsRoutes);

// Market indices routes
router.use('/market-indices', marketIndicesRoutes);

// Diagnostics routes
router.use('/diagnostics', diagnosticsRoutes);

// Data management routes (for development and administration)
router.use('/data-management', dataManagementRoutes);

// Direct query routes (for debugging)
router.get('/direct-query/:symbol/:region', (req, res) => {
  const { symbol, region } = req.params;
  res.json({
    message: 'Direct query endpoint',
    params: { symbol, region }
  });
});

// Portfolio symbols for a region
router.get('/portfolio-symbols/:region', (req, res) => {
  const { region } = req.params;
  res.redirect(`/api/portfolios/${region}/stocks`);
});

// Test historical prices route
router.get('/test/historical-prices', (req, res) => {
  res.json({
    message: 'Test historical prices endpoint',
    timestamp: new Date().toISOString()
  });
});

// News routes
router.get('/news/symbol', getNewsBySymbol);
router.get('/news/portfolio', getNewsForPortfolio);

export default router;
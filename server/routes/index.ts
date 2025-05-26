import { Router } from 'express';
import portfolioRoutes from './portfolio/portfolio.routes';
import etfRoutes from './etf/etf.routes';
import matrixRoutes from './matrix/matrix.routes';
import matrixRulesMock from './matrix-rules-mock';
import matrixEngineRoutes from './matrix-engine';
import alertsRoutes from './alerts/alerts.routes';
import { historicalPriceRoutes, currentPriceRoutes, performanceHistoryRoutes } from './price/price.routes';
import dataRoutes from './data/data.routes';
import upgradeDowngradeRoutes from './upgrade-downgrade/upgrade-downgrade.routes';
import dataManagementRoutes from './data-management';
import schedulerRoutes from './scheduler/scheduler.routes';
import apiHealthRoutes from './api-health.routes';
import holdingsRoutes from './holdings';
import cashRoutes from './cash';
import transactionsRoutes from './transactions';
import portfolioHistoryRoutes from './portfolio-history';
import portfolioPerformanceRoutes from './portfolio-performance';
import portfolioPerformanceHistoryRoutes from './portfolio-performance-history';
import performanceHistoryRouter from './performance-history.js';
import earningsRoutes from './earnings';
import marketIndicesRoutes from './market-indices';
import diagnosticsRoutes from './diagnostics/diagnostics.routes';
import { getNewsBySymbol, getNewsForPortfolio } from './news';
import economicCalendarRoutes from './economic-calendar/economic-calendar.routes';
import movingAverageRoutes from './moving-average';

const router = Router();

// Health check endpoint
router.use('/', apiHealthRoutes);

// Register all routes with their respective prefixes to maintain original API paths
router.use('/portfolios', portfolioRoutes);
router.use('/etfs', etfRoutes);
// Use the mock implementation for matrix rules for now
router.use('/matrix-rules', matrixRulesMock);
// Matrix engine routes
router.use('/matrix-engine', matrixEngineRoutes);
// Use the alerts route from the matrix rules mock as well
router.get('/alerts', matrixRulesMock);

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

// Transaction routes
router.use('/transactions', transactionsRoutes);

// Portfolio history routes for performance charts
router.use('/portfolio-history', portfolioHistoryRoutes);

// New portfolio performance routes (alternative implementation with raw SQL)
router.use('/portfolio-performance', portfolioPerformanceRoutes);

// Portfolio performance history routes (from dedicated history table)
router.use('/portfolio-performance-history', performanceHistoryRoutes);

// New redesigned performance history routes
router.use('/performance-history', performanceHistoryRouter);

// Earnings routes
router.use('/', earningsRoutes);

// Market indices routes
router.use('/market-indices', marketIndicesRoutes);

// Moving Average routes
router.use('/moving-average', movingAverageRoutes);

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

// Economic calendar routes
router.use('/economic-calendar', economicCalendarRoutes);

export default router;
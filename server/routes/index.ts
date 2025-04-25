import { Router } from 'express';
import portfolioRoutes from './portfolio/portfolio.routes';
import etfRoutes from './etf/etf.routes';
import matrixRoutes from './matrix/matrix.routes';
import alertsRoutes from './alerts/alerts.routes';
import priceRoutes from './price/price.routes';
import dataRoutes from './data/data.routes';
import upgradeDowngradeRoutes from './upgrade-downgrade/upgrade-downgrade.routes';
import apiHealthRoutes from './api-health.routes';

const router = Router();

// Health check endpoint
router.use('/', apiHealthRoutes);

// Register all routes with their respective prefixes
router.use('/portfolios', portfolioRoutes);
router.use('/etfs', etfRoutes);
router.use('/matrix-rules', matrixRoutes);
router.use('/alerts', alertsRoutes);
router.use('/price', priceRoutes);
router.use('/data-updates', dataRoutes);
router.use('/upgrade-downgrade', upgradeDowngradeRoutes);

// Add scheduler routes from data routes
router.use('/scheduler', dataRoutes);

export default router;
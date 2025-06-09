import { Router } from 'express';
import { 
  getHistoricalPrices,
  getHistoricalPricesByRegion,
  fetchHistoricalPrices,
  fetchRegionHistoricalPrices,
  fetchAllHistoricalPrices,
  getCurrentPrices,
  getCurrentPrice,
  fetchCurrentPrice,
  fetchRegionCurrentPrices,
  fetchAllCurrentPrices,
  updatePerformanceHistoryEndpoint
} from '../../controllers/price/price.controller';
import portfolioPerformanceHistoryRouter from '../portfolio-performance-history';

// Create separate routers for historical and current prices
const historicalRouter = Router();
const currentRouter = Router();

// Historical prices router - explicitly set service type
historicalRouter.use((req, res, next) => {
  req.serviceType = 'historical';
  next();
});

// Routes for historical prices

// Current prices router - explicitly set service type
currentRouter.use((req, res, next) => {
  req.serviceType = 'current';
  next();
});

// Routes for current prices

// Export all routers
export { 
  historicalRouter as historicalPriceRoutes, 
  currentRouter as currentPriceRoutes,
  portfolioPerformanceHistoryRouter as performanceHistoryRoutes
};
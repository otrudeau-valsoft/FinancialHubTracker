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
import { asyncHandler } from '../../middleware/error-handler';
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
historicalRouter.get('/:symbol/:region', asyncHandler(getHistoricalPrices));
historicalRouter.get('/region/:region', asyncHandler(getHistoricalPricesByRegion));
historicalRouter.post('/fetch/:symbol/:region', asyncHandler(fetchHistoricalPrices));
historicalRouter.post('/fetch/portfolio/:region', asyncHandler(fetchRegionHistoricalPrices));
historicalRouter.post('/fetch/all', asyncHandler(fetchAllHistoricalPrices));
historicalRouter.post('/update-performance-history', asyncHandler(updatePerformanceHistoryEndpoint));

// Current prices router - explicitly set service type
currentRouter.use((req, res, next) => {
  req.serviceType = 'current';
  next();
});

// Routes for current prices
currentRouter.get('/:region', asyncHandler(getCurrentPrices));
currentRouter.get('/:region/:symbol', asyncHandler(getCurrentPrice));
currentRouter.post('/fetch/:symbol/:region', asyncHandler(fetchCurrentPrice));
currentRouter.post('/fetch/portfolio/:region', asyncHandler(fetchRegionCurrentPrices));
currentRouter.post('/fetch/all', asyncHandler(fetchAllCurrentPrices));

// Export all routers
export { 
  historicalRouter as historicalPriceRoutes, 
  currentRouter as currentPriceRoutes,
  portfolioPerformanceHistoryRouter as performanceHistoryRoutes
};
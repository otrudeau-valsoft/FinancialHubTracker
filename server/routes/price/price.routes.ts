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
  fetchAllCurrentPrices
} from '../../controllers/price/price.controller';
import { asyncHandler } from '../../middleware/error-handler';

// Create separate routers for historical and current prices
const historicalRouter = Router();
const currentRouter = Router();
const performanceHistoryRouter = Router();

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

// Performance history router - uses historical price service but specific endpoint
performanceHistoryRouter.use((req, res, next) => {
  req.serviceType = 'historical';
  next();
});

// Performance history uses historical data routes
performanceHistoryRouter.get('/', asyncHandler(getHistoricalPricesByRegion));

// Export all routers
export { 
  historicalRouter as historicalPriceRoutes, 
  currentRouter as currentPriceRoutes,
  performanceHistoryRouter as performanceHistoryRoutes
};
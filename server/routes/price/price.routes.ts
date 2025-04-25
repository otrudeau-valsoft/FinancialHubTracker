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

const router = Router();

// Handler to distinguish between historical and current price routes
router.use((req, res, next) => {
  const path = req.path;
  
  // Check if the URL starts with a recognized service prefix
  const isHistoricalUrl = 
    req.baseUrl === '/api/historical-prices' || 
    path.startsWith('/historical');
  
  const isCurrentUrl = 
    req.baseUrl === '/api/current-prices' || 
    path.startsWith('/current');
  
  // Add service type to the request object for controllers to use
  if (isHistoricalUrl) {
    req.serviceType = 'historical';
  } else if (isCurrentUrl) {
    req.serviceType = 'current';
  }
  
  next();
});

// Routes for historical prices (when mounted at /api/historical-prices)
// Direct routes
router.get('/:symbol/:region', asyncHandler(getHistoricalPrices));
router.get('/region/:region', asyncHandler(getHistoricalPricesByRegion));
router.post('/fetch/:symbol/:region', asyncHandler(fetchHistoricalPrices));
router.post('/fetch/portfolio/:region', asyncHandler(fetchRegionHistoricalPrices));
router.post('/fetch/all', asyncHandler(fetchAllHistoricalPrices));

// Routes for current prices (when mounted at /api/current-prices)
// Direct routes
router.get('/:region', asyncHandler(getCurrentPrices));
router.get('/:region/:symbol', asyncHandler(getCurrentPrice));
router.post('/fetch/:symbol/:region', asyncHandler(fetchCurrentPrice));
router.post('/fetch/portfolio/:region', asyncHandler(fetchRegionCurrentPrices));
router.post('/fetch/all', asyncHandler(fetchAllCurrentPrices));

// Nested routes (when mounted at a parent path)
// Historical price routes
router.get('/historical/:symbol/:region', asyncHandler(getHistoricalPrices));
router.get('/historical/region/:region', asyncHandler(getHistoricalPricesByRegion));
router.post('/historical/fetch/:symbol/:region', asyncHandler(fetchHistoricalPrices));
router.post('/historical/fetch/portfolio/:region', asyncHandler(fetchRegionHistoricalPrices));
router.post('/historical/fetch/all', asyncHandler(fetchAllHistoricalPrices));

// Current price routes
router.get('/current/:region', asyncHandler(getCurrentPrices));
router.get('/current/:region/:symbol', asyncHandler(getCurrentPrice));
router.post('/current/fetch/:symbol/:region', asyncHandler(fetchCurrentPrice));
router.post('/current/fetch/portfolio/:region', asyncHandler(fetchRegionCurrentPrices));
router.post('/current/fetch/all', asyncHandler(fetchAllCurrentPrices));

export default router;
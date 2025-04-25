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
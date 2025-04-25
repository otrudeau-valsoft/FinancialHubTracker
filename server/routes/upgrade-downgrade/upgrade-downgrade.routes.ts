import { Router } from 'express';
import { 
  getRegionUpgradeDowngradeHistory,
  getStockUpgradeDowngradeHistory,
  fetchRegionUpgradeDowngradeHistory,
  fetchStockUpgradeDowngradeHistory
} from '../../controllers/upgrade-downgrade/upgrade-downgrade.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// GET /api/upgrade-downgrade/region/:region - Get upgrade/downgrade history for a region
router.get('/region/:region', asyncHandler(getRegionUpgradeDowngradeHistory));

// GET /api/upgrade-downgrade/stock/:symbol/:region - Get upgrade/downgrade history for a stock
router.get('/stock/:symbol/:region', asyncHandler(getStockUpgradeDowngradeHistory));

// POST /api/upgrade-downgrade/fetch/region/:region - Fetch upgrade/downgrade history for a region
router.post('/fetch/region/:region', asyncHandler(fetchRegionUpgradeDowngradeHistory));

// POST /api/upgrade-downgrade/fetch/stock/:symbol/:region - Fetch upgrade/downgrade history for a stock
router.post('/fetch/stock/:symbol/:region', asyncHandler(fetchStockUpgradeDowngradeHistory));

export default router;
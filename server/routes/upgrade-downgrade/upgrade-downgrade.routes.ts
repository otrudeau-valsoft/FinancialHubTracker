import { Router } from 'express';
import { 
  getRegionUpgradeDowngradeHistory,
  getStockUpgradeDowngradeHistory,
  fetchRegionUpgradeDowngradeHistory,
  fetchStockUpgradeDowngradeHistory
} from '../../controllers/upgrade-downgrade/upgrade-downgrade.controller';

const router = Router();

// GET /api/upgrade-downgrade/region/:region - Get upgrade/downgrade history for a region

// GET /api/upgrade-downgrade/stock/:symbol/:region - Get upgrade/downgrade history for a stock

// POST /api/upgrade-downgrade/fetch/region/:region - Fetch upgrade/downgrade history for a region

// POST /api/upgrade-downgrade/fetch/stock/:symbol/:region - Fetch upgrade/downgrade history for a stock

export default router;
import { Router } from 'express';
import { 
  getEtfHoldings,
  getTopEtfHoldings,
  createEtfHolding,
  bulkImportEtfHoldings
} from '../../controllers/etf/etf.controller';

const router = Router();

// GET /api/etfs/:symbol/holdings - Get all holdings for an ETF
router.get('/:symbol/holdings', getEtfHoldings);

// GET /api/etfs/:symbol/holdings/top/:limit - Get top N holdings for an ETF
router.get('/:symbol/holdings/top/:limit', getTopEtfHoldings);

// POST /api/etfs/:symbol/holdings - Create a new ETF holding
router.post('/:symbol/holdings', createEtfHolding);

// POST /api/etfs/:symbol/holdings/bulk - Bulk import ETF holdings
router.post('/:symbol/holdings/bulk', bulkImportEtfHoldings);

export default router;
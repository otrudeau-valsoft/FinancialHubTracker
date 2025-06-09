import { Router } from 'express';
import { 
  getEtfHoldings,
  getTopEtfHoldings,
  createEtfHolding,
  bulkImportEtfHoldings
} from '../../controllers/etf/etf.controller';

const router = Router();

// GET /api/etfs/:symbol/holdings - Get all holdings for an ETF

// GET /api/etfs/:symbol/holdings/top/:limit - Get top N holdings for an ETF

// POST /api/etfs/:symbol/holdings - Create a new ETF holding

// POST /api/etfs/:symbol/holdings/bulk - Bulk import ETF holdings

export default router;
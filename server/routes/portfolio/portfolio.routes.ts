import { Router } from 'express';
import { 
  getPortfolioStocks,
  getPortfolioStock,
  createPortfolioStock,
  updatePortfolioStock,
  deletePortfolioStock,
  importPortfolio,
  getPortfolioSummary,
  updatePortfolioSummary,
  rebalancePortfolio
} from '../../controllers/portfolio/portfolio.controller';

const router = Router();

// GET /api/portfolios/:region/stocks - Get all stocks for a region
router.get('/:region/stocks', getPortfolioStocks);

// GET /api/portfolios/:region/stocks/:id - Get a specific stock by ID
router.get('/:region/stocks/:id', getPortfolioStock);

// POST /api/portfolios/:region/stocks - Create a new stock
router.post('/:region/stocks', createPortfolioStock);

// PUT /api/portfolios/:region/stocks/:id - Update a stock
router.put('/:region/stocks/:id', updatePortfolioStock);

// PATCH /api/portfolios/:region/stocks/:id - Update a stock (partial update)
router.patch('/:region/stocks/:id', updatePortfolioStock);

// DELETE /api/portfolios/:region/stocks/:id - Delete a stock
router.delete('/:region/stocks/:id', deletePortfolioStock);

// POST /api/portfolios/:region/import - Import portfolio data
router.post('/:region/import', importPortfolio);

// GET /api/portfolios/:region/summary - Get portfolio summary
router.get('/:region/summary', getPortfolioSummary);

// POST /api/portfolios/:region/summary - Create portfolio summary
router.post('/:region/summary', updatePortfolioSummary);

// PUT /api/portfolios/:region/summary/:id - Update portfolio summary
router.put('/:region/summary/:id', updatePortfolioSummary);

// POST /api/portfolios/:region/rebalance - Rebalance portfolio (replace all stocks)
router.post('/:region/rebalance', rebalancePortfolio);

// POST /api/portfolios/:region/database-update - Update multiple portfolio stocks (database editor)
import { updateDatabaseHandler } from './database-update';
router.post('/:region/database-update', updateDatabaseHandler);

export default router;
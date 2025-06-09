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

// GET /api/portfolios/:region/stocks/:id - Get a specific stock by ID

// POST /api/portfolios/:region/stocks - Create a new stock

// PUT /api/portfolios/:region/stocks/:id - Update a stock

// PATCH /api/portfolios/:region/stocks/:id - Update a stock (partial update)

// DELETE /api/portfolios/:region/stocks/:id - Delete a stock

// POST /api/portfolios/:region/import - Import portfolio data

// GET /api/portfolios/:region/summary - Get portfolio summary

// POST /api/portfolios/:region/summary - Create portfolio summary

// PUT /api/portfolios/:region/summary/:id - Update portfolio summary

// POST /api/portfolios/:region/rebalance - Rebalance portfolio (replace all stocks)

// POST /api/portfolios/:region/database-update - Update multiple portfolio stocks (database editor)
import { databaseUpdate } from './database-update';
router.post('/:region/database-update', databaseUpdate);

export default router;
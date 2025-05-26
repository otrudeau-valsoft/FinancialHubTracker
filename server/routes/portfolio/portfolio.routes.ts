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
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// GET /api/portfolios/:region/stocks - Get all stocks for a region
router.get('/:region/stocks', asyncHandler(getPortfolioStocks));

// GET /api/portfolios/:region/stocks/:id - Get a specific stock by ID
router.get('/:region/stocks/:id', asyncHandler(getPortfolioStock));

// POST /api/portfolios/:region/stocks - Create a new stock
router.post('/:region/stocks', asyncHandler(createPortfolioStock));

// PUT /api/portfolios/:region/stocks/:id - Update a stock
router.put('/:region/stocks/:id', asyncHandler(updatePortfolioStock));

// DELETE /api/portfolios/:region/stocks/:id - Delete a stock
router.delete('/:region/stocks/:id', asyncHandler(deletePortfolioStock));

// POST /api/portfolios/:region/import - Import portfolio data
router.post('/:region/import', asyncHandler(importPortfolio));

// GET /api/portfolios/:region/summary - Get portfolio summary
router.get('/:region/summary', asyncHandler(getPortfolioSummary));

// POST /api/portfolios/:region/summary - Create portfolio summary
router.post('/:region/summary', asyncHandler(updatePortfolioSummary));

// PUT /api/portfolios/:region/summary/:id - Update portfolio summary
router.put('/:region/summary/:id', asyncHandler(updatePortfolioSummary));

// POST /api/portfolios/:region/rebalance - Rebalance portfolio (replace all stocks)
router.post('/:region/rebalance', asyncHandler(rebalancePortfolio));

// POST /api/portfolios/:region/database-update - Update database rows directly
router.post('/:region/database-update', async (req, res) => {
  try {
    const { region } = req.params;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates data' });
    }

    const { dbAdapter } = await import('../../db-adapter');
    await dbAdapter.updateDatabaseRows(updates, region);
    res.json({ success: true });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update database' });
  }
});

export default router;
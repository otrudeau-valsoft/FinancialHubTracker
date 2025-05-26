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

// POST /api/portfolios/:region/database-update - Update multiple portfolio stocks (database editor)
router.post('/:region/database-update', async (req, res) => {
  try {
    const { region } = req.params;
    
    // Log the raw request body first
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Extract data from request body
    const updates = req.body.updates || [];
    const newRows = req.body.newRows || [];
    const deletions = req.body.deletions || [];
    
    console.log('Parsed data - Updates:', updates?.length, 'NewRows:', newRows?.length, 'Deletions:', deletions?.length);

    console.log(`🔄 DATABASE UPDATE: Processing ${updates?.length || 0} updates, ${newRows?.length || 0} new rows, ${deletions?.length || 0} deletions for ${region}`);
    
    const { dbAdapter } = await import('../../db-adapter');
    let totalProcessed = 0;
    
    // Handle updates to existing stocks
    if (updates && Array.isArray(updates)) {
      for (const update of updates) {
        console.log(`Updating stock ID ${update.id}:`, update);
        
        // Convert field names to match database schema
        const dbUpdate: any = {};
        if (update.purchase_price !== undefined) dbUpdate.purchasePrice = update.purchase_price;
        if (update.stock_type !== undefined) dbUpdate.stockType = update.stock_type;
        if (update.symbol !== undefined) dbUpdate.symbol = update.symbol;
        if (update.company !== undefined) dbUpdate.company = update.company;
        if (update.rating !== undefined) dbUpdate.rating = update.rating;
        if (update.quantity !== undefined) dbUpdate.quantity = update.quantity;
        if (update.sector !== undefined) dbUpdate.sector = update.sector;
        
        await dbAdapter.updatePortfolioStock(update.id, dbUpdate, region);
        console.log(`✅ Updated stock ID ${update.id}`);
        totalProcessed++;
      }
    }

    // Handle creation of new stocks
    if (newRows && Array.isArray(newRows)) {
      for (const newStock of newRows) {
        console.log(`Creating new stock:`, newStock);
        
        // Convert field names to match database schema
        const dbNewStock: any = {
          symbol: newStock.symbol,
          company: newStock.company,
          stockType: newStock.stock_type,
          rating: parseInt(newStock.rating),
          quantity: parseInt(newStock.quantity),
          purchasePrice: parseFloat(newStock.purchase_price),
          sector: newStock.sector
        };
        
        await dbAdapter.createPortfolioStock(dbNewStock, region);
        console.log(`✅ Created new stock: ${newStock.symbol}`);
        totalProcessed++;
      }
    }

    // Handle deletions
    if (deletions && Array.isArray(deletions)) {
      for (const stockId of deletions) {
        console.log(`Deleting stock ID ${stockId}`);
        await dbAdapter.deletePortfolioStock(stockId, region);
        console.log(`✅ Deleted stock ID ${stockId}`);
        totalProcessed++;
      }
    }

    console.log(`✅ Successfully processed ${totalProcessed} operations in ${region}`);
    res.json({ 
      success: true, 
      message: `Updated ${totalProcessed} stocks`, 
      count: totalProcessed
    });
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});

export default router;
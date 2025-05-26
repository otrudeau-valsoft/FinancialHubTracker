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
    
    // Handle the data parsing issue by checking multiple sources
    let updates = [];
    let newRows = [];
    let deletions = [];
    
    if (req.body && typeof req.body === 'object') {
      updates = req.body.updates || [];
      newRows = req.body.newRows || [];
      deletions = req.body.deletions || [];
    }
    
    console.log(`🔄 DATABASE UPDATE: Processing ${updates.length} updates, ${newRows.length} new rows, ${deletions.length} deletions for ${region}`);
    
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

    // Process deletions first (remove stocks)
    if (deletions.length > 0) {
      console.log(`Processing ${deletions.length} deletions:`, deletions);
      for (const stockId of deletions) {
        try {
          console.log(`Deleting stock ID ${stockId}`);
          await dbAdapter.deletePortfolioStock(stockId, region);
          console.log(`✅ Deleted stock ID ${stockId}`);
          totalProcessed++;
        } catch (error) {
          console.error(`Error deleting stock ID ${stockId}:`, error);
        }
      }
    }

    // Process new stock creation  
    if (newRows.length > 0) {
      console.log(`Processing ${newRows.length} new stocks:`, newRows.map(r => r.symbol));
      for (const newStock of newRows) {
        try {
          console.log(`Creating new stock: ${newStock.symbol}`);
          const dbNewStock = {
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
        } catch (error) {
          console.error(`Error creating stock ${newStock.symbol}:`, error);
        }
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
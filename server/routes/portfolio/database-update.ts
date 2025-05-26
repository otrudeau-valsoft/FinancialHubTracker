import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler';

export const databaseUpdate = asyncHandler(async (req: Request, res: Response) => {
  const { region } = req.params;
  
  // Parse request body safely
  const { updates = [], newRows = [], deletions = [] } = req.body;
  
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

  // Process deletions (remove stocks)
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
    console.log(`Processing ${newRows.length} new stocks:`, newRows.map((r: any) => r.symbol));
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
});
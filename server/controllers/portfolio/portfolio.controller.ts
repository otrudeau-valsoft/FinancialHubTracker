import { Request, Response } from 'express';
import { dbAdapter } from '../../db-adapter';
import { z } from 'zod';
import Papa from 'papaparse';

/**
 * Get all stocks for a specific portfolio region
 */
/**
 * Get all stocks for a specific portfolio region
 * With enhanced price and metrics calculation logic to ensure
 * data is always up to date with the latest current prices
 */
export const getPortfolioStocks = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  
  try {
    console.log(`Fetching portfolio stocks for ${region} with refreshed metrics...`);
    
    // Get portfolio stocks with freshly calculated metrics
    const stocks = await dbAdapter.getPortfolioStocks(region);
    
    // Log success for monitoring
    console.log(`Successfully fetched ${stocks.length} portfolio stocks for ${region} with up-to-date metrics`);
    
    return res.json(stocks);
  } catch (error) {
    console.error(`Error fetching portfolio stocks for ${region}:`, error);
    return res.status(500).json({ 
      error: "Failed to get portfolio stocks",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get a specific stock by ID from a portfolio region
 */
export const getPortfolioStock = async (req: Request, res: Response) => {
  const { id, region } = req.params;
  const stock = await dbAdapter.getPortfolioStock(parseInt(id), region.toUpperCase());
  
  if (!stock) {
    return res.status(404).json({ message: "Stock not found" });
  }
  
  return res.json(stock);
};

/**
 * Create a new stock in a portfolio region
 */
export const createPortfolioStock = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  const stock = await dbAdapter.createPortfolioStock(req.body, region);
  return res.status(201).json(stock);
};

/**
 * Update a stock in a portfolio region
 */
export const updatePortfolioStock = async (req: Request, res: Response) => {
  const { id, region } = req.params;
  const updatedStock = await dbAdapter.updatePortfolioStock(parseInt(id), req.body, region.toUpperCase());
  
  if (!updatedStock) {
    return res.status(404).json({ message: "Stock not found" });
  }
  
  return res.json(updatedStock);
};

/**
 * Delete a stock from a portfolio region
 */
export const deletePortfolioStock = async (req: Request, res: Response) => {
  const { id, region } = req.params;
  await dbAdapter.deletePortfolioStock(parseInt(id), region.toUpperCase());
  return res.status(204).send();
};

/**
 * Import portfolio data from CSV file for a specific region
 */
export const importPortfolio = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  
  if (!req.body.csvData) {
    return res.status(400).json({ message: "No CSV data provided" });
  }
  
  try {
    // Parse CSV data
    const parsedData = Papa.parse(req.body.csvData, {
      header: true,
      skipEmptyLines: true
    }).data;
    
    // Convert parsed data to the format expected by the storage layer
    const convertedData = parsedData.map((item: any) => ({
      symbol: item.Symbol || '',
      name: item.Name || '',
      region,
      sector: item.Sector,
      industry: item.Industry,
      rating: item.Rating ? parseFloat(item.Rating) : null,
      classificationLevel1: item.ClassificationLevel1,
      classificationLevel2: item.ClassificationLevel2,
      position: item.Position ? parseFloat(item.Position) : null,
      targetPrice: item.TargetPrice ? parseFloat(item.TargetPrice) : null,
      stopLoss: item.StopLoss ? parseFloat(item.StopLoss) : null,
      entryPrice: item.EntryPrice ? parseFloat(item.EntryPrice) : null,
      entryDate: item.EntryDate,
      notes: item.Notes
    }));
    
    // Use dbAdapter to bulk import
    const result = await dbAdapter.bulkCreatePortfolioStocks(convertedData, region);
    
    return res.json({
      message: "Portfolio data imported successfully",
      count: result.length
    });
  } catch (error) {
    console.error(`Error importing portfolio data for ${region}:`, error);
    return res.status(400).json({ 
      message: "Failed to import portfolio data",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get summary statistics for a portfolio region
 */
export const getPortfolioSummary = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  const summary = await dbAdapter.getPortfolioSummary(region);
  
  if (!summary) {
    return res.status(404).json({ message: "Summary not found" });
  }
  
  return res.json(summary);
};

/**
 * Create or update a portfolio summary for a region
 */
export const updatePortfolioSummary = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  const { id } = req.params;
  
  // Validate the request body
  const schema = z.object({
    region: z.string(),
    totalValue: z.number().optional(),
    cashValue: z.number().optional(),
    dailyChange: z.number().optional(),
    weeklyChange: z.number().optional(),
    monthlyChange: z.number().optional(),
    ytdChange: z.number().optional(),
    benchmarkPerformance: z.number().optional(),
    notes: z.string().optional(),
  });
  
  try {
    const validData = schema.parse(req.body);
    
    let result;
    if (id) {
      // Update
      result = await dbAdapter.updatePortfolioSummary(parseInt(id), validData);
    } else {
      // Create
      result = await dbAdapter.createPortfolioSummary({
        ...validData,
        region,
      });
    }
    
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};

/**
 * Rebalance a portfolio by replacing all stocks
 */
export const rebalancePortfolio = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  
  try {
    console.log('=== REBALANCE CONTROLLER ENTRY ===');
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    
    // Preprocess the request to ensure numeric fields
    if (req.body && req.body.stocks && Array.isArray(req.body.stocks)) {
      req.body.stocks = req.body.stocks.map((stock: any) => {
        // Make sure all numeric fields are properly converted to numbers
        const processedStock = { ...stock };
        
        // Handle quantity field
        if (typeof processedStock.quantity === 'string') {
          processedStock.quantity = parseFloat(processedStock.quantity) || 0;
        }
        
        // Handle purchase price field - CRITICAL FIX
        console.log(`=== REBALANCE DEBUG ${processedStock.symbol} ===`);
        console.log(`Original purchasePrice: ${stock.purchasePrice} (${typeof stock.purchasePrice})`);
        
        if (processedStock.purchasePrice !== undefined && processedStock.purchasePrice !== null) {
          if (typeof processedStock.purchasePrice === 'string') {
            const parsed = parseFloat(processedStock.purchasePrice);
            processedStock.purchasePrice = isNaN(parsed) ? null : parsed;
          } else if (typeof processedStock.purchasePrice === 'number') {
            // Already a number, keep it as is
            processedStock.purchasePrice = processedStock.purchasePrice;
          }
          console.log(`Processed purchasePrice: ${processedStock.purchasePrice} (${typeof processedStock.purchasePrice})`);
        } else {
          console.log(`Purchase price is undefined/null: ${processedStock.purchasePrice}`);
        }
        // If purchasePrice is undefined, don't modify it - preserve existing DB value
        
        // CRITICAL: Remove any reference to the old 'price' field - we only use purchasePrice now
        delete processedStock.price;
        
        // Special handling for Cash and ETF - they may not have purchase prices
        if (processedStock.stockType === 'Cash' || processedStock.stockType === 'ETF' ||
            processedStock.rating === 'Cash' || processedStock.rating === 'ETF') {
          // Cash and ETF entries can have null purchase prices
          // No special handling needed since we removed the price field
        }
        
        // Log the processed stock for debugging
        console.log(`=== CONTROLLER PROCESSING ${processedStock.symbol} ===`);
        console.log('Original stock:', JSON.stringify(stock));
        console.log('Processed stock:', JSON.stringify(processedStock));
        console.log('Purchase price value:', processedStock.purchasePrice, typeof processedStock.purchasePrice);
        
        return processedStock;
      });
    }
  
    // Validate the incoming stocks array
    const stockSchema = z.object({
      id: z.number().optional(),
      symbol: z.string().min(1, "Symbol is required"),
      company: z.string().min(1, "Company name is required"),
      stockType: z.string().min(1, "Stock type is required"),
      rating: z.string().min(1, "Rating is required"),
      sector: z.string().optional(),
      quantity: z.number().min(0, "Quantity must be a positive number"),
      purchasePrice: z.number().optional().nullable(),
    });
    
    const schema = z.object({
      stocks: z.array(stockSchema),
    });

    const validData = schema.parse(req.body);
    
    // Rebalance the portfolio (this will delete all existing stocks and add new ones)
    const result = await dbAdapter.rebalancePortfolio(validData.stocks, region);
    
    // Return success with the newly created stocks
    return res.status(200).json({
      message: `Successfully rebalanced ${region} portfolio`,
      stocks: result,
      count: result.length
    });
  } catch (error) {
    console.error(`Error rebalancing ${region} portfolio:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      message: `Failed to rebalance ${region} portfolio`, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
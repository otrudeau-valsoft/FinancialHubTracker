import { Request, Response } from 'express';
import { storage } from '../../db-storage';
import { z } from 'zod';
import Papa from 'papaparse';

/**
 * Get all stocks for a specific portfolio region
 */
export const getPortfolioStocks = async (req: Request, res: Response) => {
  const region = req.params.region.toUpperCase();
  const stocks = await storage.getPortfolioStocks(region);
  return res.json(stocks);
};

/**
 * Get a specific stock by ID from a portfolio region
 */
export const getPortfolioStock = async (req: Request, res: Response) => {
  const { id, region } = req.params;
  const stock = await storage.getPortfolioStock(parseInt(id), region.toUpperCase());
  
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
  const stock = await storage.createPortfolioStock(req.body, region);
  return res.status(201).json(stock);
};

/**
 * Update a stock in a portfolio region
 */
export const updatePortfolioStock = async (req: Request, res: Response) => {
  const { id, region } = req.params;
  const updatedStock = await storage.updatePortfolioStock(parseInt(id), req.body, region.toUpperCase());
  
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
  await storage.deletePortfolioStock(parseInt(id), region.toUpperCase());
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
    
    // Use storage to bulk import
    const result = await storage.bulkCreatePortfolioStocks(convertedData, region);
    
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
  const summary = await storage.getPortfolioSummary(region);
  
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
      result = await storage.updatePortfolioSummary(parseInt(id), validData);
    } else {
      // Create
      result = await storage.createPortfolioSummary({
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
    // Preprocess the request to ensure numeric fields
    if (req.body && req.body.stocks && Array.isArray(req.body.stocks)) {
      req.body.stocks = req.body.stocks.map((stock: any) => {
        // Make sure all numeric fields are properly converted to numbers
        const processedStock = { ...stock };
        
        // Handle quantity field
        if (typeof processedStock.quantity === 'string') {
          processedStock.quantity = parseFloat(processedStock.quantity) || 0;
        }
        
        // Handle price field
        if (processedStock.price === undefined || processedStock.price === null) {
          processedStock.price = 0; // Default to 0 instead of undefined
        } else if (typeof processedStock.price === 'string') {
          processedStock.price = parseFloat(processedStock.price) || 0;
        }
        
        // Handle pbr field
        if (processedStock.pbr === undefined || processedStock.pbr === null) {
          processedStock.pbr = null; // Use null to indicate no value
        } else if (typeof processedStock.pbr === 'string') {
          processedStock.pbr = parseFloat(processedStock.pbr) || null;
        }
        
        // Special handling for Cash and ETF
        if (processedStock.stockType === 'Cash' || processedStock.stockType === 'ETF' ||
            processedStock.rating === 'Cash' || processedStock.rating === 'ETF') {
          // Ensure price is set
          if (processedStock.price === undefined || processedStock.price === null) {
            processedStock.price = 0;
          }
        }
        
        // Log the processed stock for debugging
        console.log('Processed stock:', JSON.stringify(processedStock));
        
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
      price: z.number().optional().nullable(),
      pbr: z.number().optional().nullable(),
    });
    
    const schema = z.object({
      stocks: z.array(stockSchema),
    });

    const validData = schema.parse(req.body);
    
    // Rebalance the portfolio (this will delete all existing stocks and add new ones)
    const result = await storage.rebalancePortfolio(validData.stocks, region);
    
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
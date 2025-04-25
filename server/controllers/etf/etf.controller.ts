import { Request, Response } from 'express';
import { storage } from '../../storage';
import { z } from 'zod';
import { parseCSV } from '../../util';

/**
 * Get ETF holdings for a specific symbol
 */
export const getEtfHoldings = async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const holdings = await storage.getEtfHoldings(symbol.toUpperCase());
  return res.json(holdings);
};

/**
 * Get top ETF holdings for a specific symbol
 */
export const getTopEtfHoldings = async (req: Request, res: Response) => {
  const { symbol, limit } = req.params;
  const holdings = await storage.getEtfHoldings(symbol.toUpperCase(), parseInt(limit));
  return res.json(holdings);
};

/**
 * Create a new ETF holding
 */
export const createEtfHolding = async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  try {
    // Validate the request body
    const schema = z.object({
      ticker: z.string(),
      name: z.string(),
      sector: z.string().nullable().optional(),
      assetClass: z.string().nullable().optional(),
      marketValue: z.string().nullable().optional(),
      weight: z.string().nullable().optional(),
      notionalValue: z.string().nullable().optional(),
      price: z.string().nullable().optional(),
      quantity: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      exchange: z.string().nullable().optional(),
      currency: z.string().nullable().optional(),
      fxRate: z.string().nullable().optional(),
      marketCurrency: z.string().nullable().optional()
    });
    
    const validData = schema.parse(req.body);
    
    const holding = await storage.createEtfHolding({
      ...validData,
      etfSymbol: symbol.toUpperCase()
    });
    
    return res.status(201).json(holding);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};

/**
 * Bulk import ETF holdings from CSV data
 */
export const bulkImportEtfHoldings = async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  if (!req.body.csvData) {
    return res.status(400).json({ message: "No CSV data provided" });
  }
  
  try {
    const parsedData = await parseCSV(req.body.csvData);
    
    // Add the ETF symbol to each item
    const holdingsData = parsedData.map(item => ({
      ...item,
      etfSymbol: symbol.toUpperCase()
    }));
    
    // Use storage to bulk import
    const result = await storage.bulkImportEtfHoldings(holdingsData);
    
    return res.json({
      message: "ETF holdings imported successfully",
      count: result.length
    });
  } catch (error) {
    console.error(`Error importing ETF holdings for ${symbol}:`, error);
    return res.status(400).json({ 
      message: "Failed to import ETF holdings",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
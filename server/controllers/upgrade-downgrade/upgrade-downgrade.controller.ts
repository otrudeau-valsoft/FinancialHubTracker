import { Request, Response } from 'express';
import { storage } from '../../storage';
import { scripts } from '../../scripts';

/**
 * Get upgrade/downgrade history for a specific region
 */
export const getRegionUpgradeDowngradeHistory = async (req: Request, res: Response) => {
  const { region } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  
  const history = await storage.getUpgradeDowngradeHistoryByRegion(region.toUpperCase(), limit);
  return res.json(history);
};

/**
 * Get upgrade/downgrade history for a specific stock
 */
export const getStockUpgradeDowngradeHistory = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  
  const history = await storage.getUpgradeDowngradeHistoryBySymbol(symbol, region.toUpperCase(), limit);
  return res.json(history);
};

/**
 * Fetch and import upgrade/downgrade history for a region
 */
export const fetchRegionUpgradeDowngradeHistory = async (req: Request, res: Response) => {
  const { region } = req.params;
  
  try {
    const result = await scripts.importRegionUpgradeDowngradeHistory(region.toUpperCase());
    return res.json({
      message: `Successfully imported upgrade/downgrade history for ${region}`,
      processed: result.processed,
      imported: result.imported
    });
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${region}:`, error);
    return res.status(500).json({ 
      message: "Failed to import upgrade/downgrade history",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Fetch and import upgrade/downgrade history for a specific stock
 */
export const fetchStockUpgradeDowngradeHistory = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  
  try {
    await scripts.importUpgradeDowngradeHistory(symbol, region.toUpperCase());
    return res.json({
      message: `Successfully imported upgrade/downgrade history for ${symbol} (${region})`
    });
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${symbol} (${region}):`, error);
    return res.status(500).json({ 
      message: "Failed to import upgrade/downgrade history",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
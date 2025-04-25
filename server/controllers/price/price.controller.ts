import { Request, Response } from 'express';
import { storage } from '../../storage';
import { currentPriceService } from '../../services/current-price-service';
import { historicalPriceService } from '../../services/historical-price-service';

/**
 * Get historical prices for a specific symbol and region
 */
export const getHistoricalPrices = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const startDateStr = req.query.startDate as string | undefined;
  const endDateStr = req.query.endDate as string | undefined;
  
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (startDateStr) {
    startDate = new Date(startDateStr);
  }
  
  if (endDateStr) {
    endDate = new Date(endDateStr);
  }
  
  const prices = await storage.getHistoricalPrices(symbol, region.toUpperCase(), startDate, endDate);
  return res.json(prices);
};

/**
 * Get all historical prices for a region
 */
export const getHistoricalPricesByRegion = async (req: Request, res: Response) => {
  const { region } = req.params;
  const startDateStr = req.query.startDate as string | undefined;
  const endDateStr = req.query.endDate as string | undefined;
  
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (startDateStr) {
    startDate = new Date(startDateStr);
  }
  
  if (endDateStr) {
    endDate = new Date(endDateStr);
  }
  
  const prices = await storage.getHistoricalPricesByRegion(region.toUpperCase(), startDate, endDate);
  return res.json(prices);
};

/**
 * Fetch and import historical prices for a specific stock
 */
export const fetchHistoricalPrices = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const period = (req.query.period || req.body.period || '5y') as string;
  
  const results = await historicalPriceService.fetchAndStoreHistoricalPrices(symbol, region.toUpperCase(), period);
  return res.json(results);
};

/**
 * Fetch and import historical prices for all stocks in a region
 */
export const fetchRegionHistoricalPrices = async (req: Request, res: Response) => {
  const { region } = req.params;
  const period = (req.query.period || req.body.period || '5y') as string;
  
  const results = await historicalPriceService.fetchHistoricalPricesForRegion(region.toUpperCase(), period);
  return res.json(results);
};

/**
 * Fetch and import historical prices for all stocks in all regions
 */
export const fetchAllHistoricalPrices = async (req: Request, res: Response) => {
  const period = (req.query.period || req.body.period || '5y') as string;
  
  const response = await historicalPriceService.fetchHistoricalPricesForAllRegions(period);
  return res.json(response);
};

/**
 * Get current prices for a region
 */
export const getCurrentPrices = async (req: Request, res: Response) => {
  const { region } = req.params;
  const prices = await currentPriceService.getCurrentPrices(region.toUpperCase());
  return res.json(prices);
};

/**
 * Get current price for a specific symbol
 */
export const getCurrentPrice = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const price = await currentPriceService.getCurrentPrice(symbol, region.toUpperCase());
  
  if (!price) {
    return res.status(404).json({ message: "Price data not found" });
  }
  
  return res.json(price);
};

/**
 * Fetch and store current price for a specific symbol
 */
export const fetchCurrentPrice = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const result = await currentPriceService.fetchAndStoreCurrentPrice(symbol, region.toUpperCase());
  return res.json(result);
};

/**
 * Fetch and store current prices for all stocks in a region
 */
export const fetchRegionCurrentPrices = async (req: Request, res: Response) => {
  const { region } = req.params;
  const results = await currentPriceService.fetchCurrentPricesForRegion(region.toUpperCase());
  return res.json(results);
};

/**
 * Fetch and store current prices for all stocks in all regions
 */
export const fetchAllCurrentPrices = async (req: Request, res: Response) => {
  const results = await currentPriceService.updateAllCurrentPrices();
  
  const successCount = results.filter(r => r.success).length;
  const totalSymbols = results.length;
  
  return res.json({
    message: `Successfully updated ${successCount}/${totalSymbols} symbols`,
    successCount,
    totalSymbols,
    results
  });
};
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
 * This also automatically updates the region's portfolio holdings
 */
export const fetchRegionHistoricalPrices = async (req: Request, res: Response) => {
  try {
    const { region } = req.params;
    const upperRegion = region.toUpperCase();
    const period = (req.query.period || req.body.period || '5y') as string;
    
    // Step 1: Update historical prices for this region
    const results = await historicalPriceService.fetchHistoricalPricesForRegion(upperRegion, period);
    
    // Step 2: Automatically update portfolio holdings for this region
    console.log(`Automatically updating ${upperRegion} portfolio holdings after historical price update...`);
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update only this regional portfolio
      let updateResult;
      switch (upperRegion) {
        case 'USD':
          updateResult = await holdingsService.updateUSDHoldings();
          break;
        case 'CAD':
          updateResult = await holdingsService.updateCADHoldings();
          break;
        case 'INTL':
          updateResult = await holdingsService.updateINTLHoldings();
          break;
        default:
          throw new Error(`Invalid region: ${upperRegion}`);
      }
      
      console.log(`Successfully updated ${upperRegion} portfolio holdings with new historical data`);
      
      // Get success metrics from original results
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      return res.json({
        results,
        message: `Successfully updated historical prices for ${successCount}/${totalCount} symbols and recalculated ${upperRegion} portfolio metrics`,
        holdingsUpdated: true,
        successCount,
        totalCount
      });
    } catch (holdingsError) {
      console.error(`Error updating ${upperRegion} holdings after historical price update:`, holdingsError);
      
      // Still return success for historical price update, but indicate holdings update failed
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      return res.json({
        results,
        message: `Successfully updated historical prices for ${successCount}/${totalCount} symbols, but failed to recalculate portfolio metrics`,
        holdingsUpdated: false,
        holdingsError: holdingsError.message,
        successCount,
        totalCount
      });
    }
  } catch (error) {
    console.error('Error updating historical prices:', error);
    return res.status(500).json({ 
      error: 'Failed to update historical prices', 
      message: error.message 
    });
  }
};

/**
 * Fetch and import historical prices for all stocks in all regions
 * This also automatically updates all portfolio holdings calculations
 */
export const fetchAllHistoricalPrices = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period || req.body.period || '5y') as string;
    
    // Step 1: Update historical prices
    const response = await historicalPriceService.updateAllHistoricalPrices();
    
    // Step 2: Automatically update portfolio holdings to reflect new historical data
    console.log('Automatically updating portfolio holdings after historical price update...');
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update all regional portfolios
      await holdingsService.updateAllHoldings();
      console.log('Successfully updated all portfolio holdings with new historical data');
      
      return res.json({
        ...response,
        message: `${response.message} and recalculated all portfolio metrics`,
        holdingsUpdated: true
      });
    } catch (holdingsError) {
      console.error('Error updating holdings after historical price update:', holdingsError);
      
      // Still return success for historical price update, but indicate holdings update failed
      return res.json({
        ...response,
        message: `${response.message}, but failed to recalculate portfolio metrics`,
        holdingsUpdated: false,
        holdingsError: holdingsError.message
      });
    }
  } catch (error) {
    console.error('Error updating historical prices:', error);
    return res.status(500).json({ 
      error: 'Failed to update historical prices', 
      message: error.message 
    });
  }
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
 * This also automatically updates the region's portfolio holdings
 */
export const fetchRegionCurrentPrices = async (req: Request, res: Response) => {
  try {
    const { region } = req.params;
    const upperRegion = region.toUpperCase();
    
    // Step 1: Update current prices for this region - using correct function name
    const results = await currentPriceService.updatePortfolioCurrentPrices(upperRegion);
    
    // Step 2: Automatically update portfolio holdings for this region
    console.log(`Automatically updating ${upperRegion} portfolio holdings after price update...`);
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update only this regional portfolio
      let updateResult;
      switch (upperRegion) {
        case 'USD':
          updateResult = await holdingsService.updateUSDHoldings();
          break;
        case 'CAD':
          updateResult = await holdingsService.updateCADHoldings();
          break;
        case 'INTL':
          updateResult = await holdingsService.updateINTLHoldings();
          break;
        default:
          throw new Error(`Invalid region: ${upperRegion}`);
      }
      
      console.log(`Successfully updated ${upperRegion} portfolio holdings with new prices`);
      
      return res.json({
        results,
        message: `Successfully updated ${results.length} prices and recalculated ${upperRegion} portfolio metrics`,
        holdingsUpdated: true
      });
    } catch (holdingsError) {
      console.error(`Error updating ${upperRegion} holdings after price update:`, holdingsError);
      
      // Still return success for price update, but indicate holdings update failed
      return res.json({
        results,
        message: `Successfully updated ${results.length} prices, but failed to recalculate ${upperRegion} portfolio metrics`,
        holdingsUpdated: false,
        holdingsError: holdingsError.message
      });
    }
  } catch (error) {
    console.error('Error updating current prices:', error);
    return res.status(500).json({ 
      error: 'Failed to update current prices', 
      message: error.message 
    });
  }
};

/**
 * Fetch and store current prices for all stocks in all regions
 * This also automatically updates all portfolio holdings calculations
 */
export const fetchAllCurrentPrices = async (req: Request, res: Response) => {
  try {
    // Step 1: Update current prices - using correct function name
    const results = await currentPriceService.updateAllCurrentPrices();
    
    const successCount = results.filter(r => r.success).length;
    const totalSymbols = results.length;
    
    // Step 2: Automatically update portfolio holdings to reflect new prices
    console.log('Automatically updating portfolio holdings after price update...');
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update all regional portfolios
      await holdingsService.updateAllHoldings();
      console.log('Successfully updated all portfolio holdings with new prices');
      
      return res.json({
        message: `Successfully updated ${successCount}/${totalSymbols} symbols and recalculated all portfolio metrics`,
        successCount,
        totalSymbols,
        results,
        holdingsUpdated: true
      });
    } catch (holdingsError) {
      console.error('Error updating holdings after price update:', holdingsError);
      
      // Still return success for price update, but indicate holdings update failed
      return res.json({
        message: `Successfully updated ${successCount}/${totalSymbols} symbols, but failed to recalculate portfolio metrics`,
        successCount,
        totalSymbols,
        results,
        holdingsUpdated: false,
        holdingsError: holdingsError.message
      });
    }
  } catch (error) {
    console.error('Error updating current prices:', error);
    return res.status(500).json({ 
      error: 'Failed to update current prices', 
      message: error.message 
    });
  }
};
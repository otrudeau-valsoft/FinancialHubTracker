import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { db } from '../db';
import { storage } from '../storage';

const router = Router();

/**
 * Get historical portfolio performance data for a specific region
 */
router.get('/:region', asyncHandler(async (req, res) => {
  const { region } = req.params;
  const startDateStr = req.query.startDate as string | undefined;
  const endDateStr = req.query.endDate as string | undefined;
  
  let startDate: Date = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago
  let endDate: Date = endDateStr ? new Date(endDateStr) : new Date(); // Default to today
  
  try {
    // 1. Get all stocks in the portfolio
    const stocks = await storage.getStocksByRegion(region.toUpperCase());
    
    if (!stocks || stocks.length === 0) {
      return res.json([]);
    }
    
    // 2. Get historical prices for all these stocks
    const symbols = stocks.map(stock => stock.symbol);
    const historicalPrices = await storage.getHistoricalPricesBySymbols(symbols, region.toUpperCase(), startDate, endDate);
    
    if (!historicalPrices || historicalPrices.length === 0) {
      return res.json([]);
    }
    
    // 3. Process historical prices into daily portfolio values
    const dailyValues = new Map<string, { 
      date: string, 
      portfolioValue: number,
      benchmarkValue: number
    }>();
    
    // Get the benchmark ETF symbol for this region
    const benchmarkSymbol = getBenchmarkForRegion(region.toUpperCase());
    
    // Process all price records
    historicalPrices.forEach(priceRecord => {
      const dateStr = new Date(priceRecord.date).toISOString().split('T')[0];
      const symbol = priceRecord.symbol;
      const closePrice = parseFloat(priceRecord.close?.toString() || '0');
      
      // Skip invalid prices
      if (closePrice <= 0) return;
      
      // Find the stock data to get quantity
      const stock = stocks.find(s => s.symbol === symbol);
      
      // If this is a benchmark symbol, add it to the benchmark value
      if (symbol === benchmarkSymbol) {
        const entry = dailyValues.get(dateStr) || { 
          date: dateStr, 
          portfolioValue: 0, 
          benchmarkValue: 0 
        };
        
        // Normalize benchmark to start at 100 at the beginning
        entry.benchmarkValue = closePrice;
        dailyValues.set(dateStr, entry);
      } 
      // Regular portfolio stock
      else if (stock) {
        const quantity = parseFloat(stock.quantity?.toString() || '0');
        const stockValue = closePrice * quantity;
        
        // Add to daily value
        const entry = dailyValues.get(dateStr) || { 
          date: dateStr, 
          portfolioValue: 0, 
          benchmarkValue: 0 
        };
        
        entry.portfolioValue += stockValue;
        dailyValues.set(dateStr, entry);
      }
    });
    
    // Convert Map to sorted array
    let result = Array.from(dailyValues.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // If we have data, normalize values to start at 100 for easier percentage comparison
    if (result.length > 0) {
      const startPortfolioValue = result[0].portfolioValue;
      const startBenchmarkValue = result[0].benchmarkValue;
      
      result = result.map(day => ({
        date: day.date,
        portfolioValue: startPortfolioValue > 0 ? (day.portfolioValue / startPortfolioValue) * 100 : 0,
        benchmarkValue: startBenchmarkValue > 0 ? (day.benchmarkValue / startBenchmarkValue) * 100 : 0
      }));
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error calculating portfolio history:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate portfolio history', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}));

/**
 * Get appropriate benchmark ETF symbol for each region
 */
function getBenchmarkForRegion(region: string): string {
  switch (region) {
    case 'USD':
      return 'SPY';
    case 'CAD':
      return 'XIC.TO';
    case 'INTL':
      return 'ACWX';
    default:
      return 'SPY';
  }
}

export default router;
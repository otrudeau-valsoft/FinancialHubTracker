import { Request, Response } from 'express';
import { storage } from '../../storage';
import { currentPriceService } from '../../services/current-price-service';
import { historicalPriceService } from '../../services/historical-price-service';
import { pool } from '../../db';
import { DateTime } from 'luxon';

/**
 * Update portfolio performance history data in the database
 * This function recalculates portfolio performance based on the latest prices
 */
async function updatePortfolioPerformanceHistory() {
  console.log('Updating portfolio performance history...');
  
  try {
    // Delete existing performance data to rebuild from scratch
    await pool.query('DELETE FROM portfolio_performance');
    
    // Get all regions
    const regions = ['USD', 'CAD', 'INTL'];
    
    for (const region of regions) {
      console.log(`Processing performance data for ${region} region...`);
      
      // Get portfolio stocks for this region
      const portfolioQuery = `
        SELECT symbol, company, stock_type, rating, quantity, price
        FROM portfolio_${region.toLowerCase()}
        WHERE symbol != 'CASH'
      `;
      
      const portfolioResult = await pool.query(portfolioQuery);
      const stocks = portfolioResult.rows;
      
      if (!stocks || stocks.length === 0) {
        console.log(`No stocks found for ${region} region, skipping...`);
        continue;
      }
      
      // Get all symbols for this region
      const symbols = stocks.map(s => s.symbol);
      
      // Get the benchmark symbol for this region
      const benchmarkSymbol = region === 'USD' ? 'SPY' : region === 'CAD' ? 'XIC.TO' : 'ACWX';
      
      // Get the dates we need to process (e.g., past year)
      const endDate = DateTime.now().setZone('America/New_York');
      const startDate = endDate.minus({ years: 1 });
      
      const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
      const formattedEndDate = endDate.toFormat('yyyy-MM-dd');
      
      // Get all historical prices for portfolio stocks and benchmark in this date range
      const pricesQuery = `
        SELECT symbol, date, adjusted_close
        FROM historical_prices
        WHERE region = $1
        AND date BETWEEN $2 AND $3
        AND symbol IN (${symbols.map((_, i) => `$${i + 4}`).join(', ')}, $${symbols.length + 4})
        ORDER BY date
      `;
      
      const pricesResult = await pool.query(
        pricesQuery, 
        [region, formattedStartDate, formattedEndDate, ...symbols, benchmarkSymbol]
      );
      
      const priceData = pricesResult.rows;
      
      if (!priceData || priceData.length === 0) {
        console.log(`No historical price data found for ${region} region, skipping...`);
        continue;
      }
      
      // Group prices by date
      const pricesByDate = {};
      
      priceData.forEach(row => {
        if (!pricesByDate[row.date]) {
          pricesByDate[row.date] = {};
        }
        pricesByDate[row.date][row.symbol] = parseFloat(row.adjusted_close);
      });
      
      // Sort dates
      const dates = Object.keys(pricesByDate).sort();
      
      // Calculate portfolio performance for each date
      const performanceData = [];
      let basePortfolioValue = null;
      let baseBenchmarkValue = null;
      
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const prices = pricesByDate[date];
        
        // Calculate portfolio value based on quantities and prices
        let portfolioValue = 0;
        let allStocksHavePrices = true;
        
        for (const stock of stocks) {
          if (prices[stock.symbol]) {
            portfolioValue += stock.quantity * prices[stock.symbol];
          } else {
            allStocksHavePrices = false;
            break;
          }
        }
        
        // Skip dates where not all stocks have prices
        if (!allStocksHavePrices || !prices[benchmarkSymbol]) {
          continue;
        }
        
        // Get benchmark value
        const benchmarkValue = prices[benchmarkSymbol];
        
        // Set base values for the first valid date
        if (basePortfolioValue === null) {
          basePortfolioValue = portfolioValue;
          baseBenchmarkValue = benchmarkValue;
        }
        
        // Calculate daily returns if we have a previous date
        let portfolioReturnDaily = null;
        let benchmarkReturnDaily = null;
        
        if (i > 0 && pricesByDate[dates[i-1]]) {
          const prevPrices = pricesByDate[dates[i-1]];
          let prevPortfolioValue = 0;
          let allPrevStocksHavePrices = true;
          
          for (const stock of stocks) {
            if (prevPrices[stock.symbol]) {
              prevPortfolioValue += stock.quantity * prevPrices[stock.symbol];
            } else {
              allPrevStocksHavePrices = false;
              break;
            }
          }
          
          if (allPrevStocksHavePrices && prevPrices[benchmarkSymbol] && prevPortfolioValue > 0) {
            portfolioReturnDaily = (portfolioValue - prevPortfolioValue) / prevPortfolioValue;
            benchmarkReturnDaily = (benchmarkValue - prevPrices[benchmarkSymbol]) / prevPrices[benchmarkSymbol];
          }
        }
        
        // Calculate cumulative returns
        const portfolioCumulativeReturn = (portfolioValue / basePortfolioValue) - 1;
        const benchmarkCumulativeReturn = (benchmarkValue / baseBenchmarkValue) - 1;
        
        // Calculate relative performance (alpha)
        const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
        
        // Add to performance data
        performanceData.push({
          date,
          region,
          portfolioValue,
          benchmarkValue,
          portfolioReturnDaily,
          benchmarkReturnDaily,
          portfolioCumulativeReturn,
          benchmarkCumulativeReturn,
          relativePerformance
        });
      }
      
      if (performanceData.length === 0) {
        console.log(`No valid performance data could be calculated for ${region} region, skipping...`);
        continue;
      }
      
      // Insert performance data into the database
      console.log(`Inserting ${performanceData.length} performance data points for ${region} region...`);
      
      for (const data of performanceData) {
        await pool.query(`
          INSERT INTO portfolio_performance (
            date, region, portfolio_value, benchmark_value, 
            portfolio_return_daily, benchmark_return_daily,
            portfolio_cumulative_return, benchmark_cumulative_return, 
            relative_performance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          data.date,
          data.region,
          data.portfolioValue,
          data.benchmarkValue,
          data.portfolioReturnDaily,
          data.benchmarkReturnDaily,
          data.portfolioCumulativeReturn,
          data.benchmarkCumulativeReturn,
          data.relativePerformance
        ]);
      }
      
      console.log(`Successfully updated performance history for ${region} region`);
    }
    
    console.log('Successfully updated all portfolio performance history');
    return true;
  } catch (error) {
    console.error('Error updating portfolio performance history:', error);
    return false;
  }
}

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
    const results = await historicalPriceService.fetchHistoricalPrices(upperRegion, period);
    
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
      
      // Update portfolio performance history with new data
      await updatePortfolioPerformanceHistory();
      
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
    // Added a forceRsiRefresh flag to ensure recent RSI values are refreshed
    const response = await historicalPriceService.updateAllHistoricalPrices(true);
    
    // Step 2: Automatically update portfolio holdings to reflect new historical data
    console.log('Automatically updating portfolio holdings after historical price update...');
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update all regional portfolios
      await holdingsService.updateAllHoldings();
      
      // Update portfolio performance history with new data
      await updatePortfolioPerformanceHistory();
      
      console.log('Successfully updated all portfolio holdings and performance with new historical data');
      
      return res.json({
        ...response,
        message: `${response.message}, calculated RSI values, and recalculated all portfolio metrics`,
        holdingsUpdated: true,
        rsiCalculated: true
      });
    } catch (holdingsError) {
      console.error('Error updating holdings after historical price update:', holdingsError);
      
      // Still return success for historical price update, but indicate holdings update failed
      return res.json({
        ...response,
        message: `${response.message}, calculated RSI values, but failed to recalculate portfolio metrics`,
        holdingsUpdated: false,
        rsiCalculated: true,
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
      
      // Update portfolio performance history with new data
      await updatePortfolioPerformanceHistory();
      
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
    
    // Calculate total success and symbols from the regional results
    let totalSuccessCount = 0;
    let totalSymbols = 0;
    
    // Iterate through each region's results
    Object.keys(results).forEach(region => {
      if (results[region] && results[region].successCount !== undefined) {
        totalSuccessCount += results[region].successCount;
        totalSymbols += results[region].totalSymbols;
      }
    });
    
    // Step 2: Automatically update portfolio holdings to reflect new prices
    console.log('Automatically updating portfolio holdings after price update...');
    
    // Import the holdings service here to avoid circular dependencies
    const { holdingsService } = await import('../../services/holdings-service');
    
    try {
      // Update all regional portfolios
      await holdingsService.updateAllHoldings();
      
      // Update portfolio performance history with new data
      await updatePortfolioPerformanceHistory();
      
      console.log('Successfully updated all portfolio holdings and performance with new prices');
      
      return res.json({
        message: `Successfully updated ${totalSuccessCount}/${totalSymbols} symbols and recalculated all portfolio metrics`,
        successCount: totalSuccessCount,
        totalSymbols,
        results,
        holdingsUpdated: true
      });
    } catch (holdingsError) {
      console.error('Error updating holdings after price update:', holdingsError);
      
      // Still return success for price update, but indicate holdings update failed
      return res.json({
        message: `Successfully updated ${totalSuccessCount}/${totalSymbols} symbols, but failed to recalculate portfolio metrics`,
        successCount: totalSuccessCount,
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
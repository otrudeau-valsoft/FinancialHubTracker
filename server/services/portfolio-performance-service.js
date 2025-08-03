/**
 * Portfolio Performance Service
 * 
 * Handles the calculation, storage, and retrieval of portfolio performance metrics
 * based on historical price data. This redesigned service directly calculates
 * performance metrics from the historical price data for more accurate results.
 */

import { db, pool } from '../db.js';
import { holdingsService } from './holdings-service.js';
import { DateTime } from 'luxon';

/**
 * Main service class for portfolio performance calculations
 */
class PortfolioPerformanceService {
  /**
   * Get performance history for a portfolio
   * 
   * @param {string} region - The portfolio region code (USD, CAD, INTL)
   * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
   * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
   * @returns {Promise<Array>} Performance data points
   */
  async getPerformanceHistory(region, startDate, endDate) {
    // Validate region
    if (!['USD', 'CAD', 'INTL'].includes(region.toUpperCase())) {
      throw new Error(`Invalid region: ${region}`);
    }

    const tableName = `portfolio_performance_${region.toLowerCase()}`;
    
    try {
      // Build the query with optional date filtering
      let query = `SELECT * FROM ${tableName}`;
      const params = [];
      
      if (startDate || endDate) {
        const conditions = [];
        
        if (startDate) {
          conditions.push('date >= $1');
          params.push(startDate);
        }
        
        if (endDate) {
          conditions.push(`date <= $${params.length + 1}`);
          params.push(endDate);
        }
        
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      // Order by date ascending
      query += ' ORDER BY date ASC';
      
      console.log(`Getting performance history for ${region} from ${startDate || 'beginning'} to ${endDate || 'now'}`);
      console.log('SQL:', query, params);
      
      // Use pool.query directly which returns a well-defined result with rows
      const result = await pool.query(query, params);
      
      if (!result || !result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
        console.warn(`No performance data found for ${region}`);
        return [];
      }
      
      // Transform the data for presentation with proper type handling
      return result.rows.map(row => ({
        date: row.date ? row.date.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
        portfolioValue: row.portfolio_value ? parseFloat(row.portfolio_value) : 0,
        benchmarkValue: row.benchmark_value ? parseFloat(row.benchmark_value) : 0,
        portfolioCumulativeReturn: row.portfolio_cumulative_return ? parseFloat(row.portfolio_cumulative_return) : 0,
        benchmarkCumulativeReturn: row.benchmark_cumulative_return ? parseFloat(row.benchmark_cumulative_return) : 0,
        portfolioReturnDaily: row.portfolio_return_daily ? parseFloat(row.portfolio_return_daily) : 0,
        benchmarkReturnDaily: row.benchmark_return_daily ? parseFloat(row.benchmark_return_daily) : 0,
        relativePerformance: row.relative_performance ? parseFloat(row.relative_performance) : 0
      }));
    } catch (error) {
      console.error(`Error getting performance history for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Update performance history for a specific region using actual historical price data
   * 
   * @param {string} region - The portfolio region code (USD, CAD, INTL)
   * @param {string} [startDate] - Optional start date in YYYY-MM-DD format 
   * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
   * @returns {Promise<boolean>} Success status
   */
  async updatePerformanceHistory(region, startDate, endDate) {
    // Validate region
    if (!['USD', 'CAD', 'INTL'].includes(region.toUpperCase())) {
      throw new Error(`Invalid region: ${region}`);
    }
    
    const regionUpper = region.toUpperCase();
    const tableName = `portfolio_performance_${region.toLowerCase()}`;
    // Handle the correct table names for each region
    let portfolioTableName;
    if (regionUpper === 'USD') {
      portfolioTableName = 'portfolio_USD';
    } else if (regionUpper === 'CAD') {
      portfolioTableName = 'portfolio_CAD';
    } else if (regionUpper === 'INTL') {
      portfolioTableName = 'portfolio_INTL';
    } else {
      throw new Error(`Unknown region: ${regionUpper}`);
    }
    
    try {
      console.log(`Updating performance history for ${regionUpper} using real-time data...`);
      
      // 1. Determine the appropriate date range
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      if (!effectiveStartDate) {
        // If no start date is provided, get the earliest date from historical prices
        const { rows: earliestDateRows } = await pool.query(
          'SELECT MIN(date) as min_date FROM historical_prices WHERE region = $1',
          [regionUpper]
        );
        
        if (earliestDateRows.length > 0 && earliestDateRows[0].min_date) {
          effectiveStartDate = earliestDateRows[0].min_date.toISOString().split('T')[0];
        } else {
          // Default to 1 year ago if no historical prices found
          effectiveStartDate = DateTime.now().minus({ years: 1 }).toFormat('yyyy-MM-dd');
        }
      }
      
      if (!effectiveEndDate) {
        // Default to today if no end date specified
        effectiveEndDate = DateTime.now().toFormat('yyyy-MM-dd');
      }
      
      console.log(`Using date range: ${effectiveStartDate} to ${effectiveEndDate}`);
      
      // 2. Get portfolio stocks with positions
      const { rows: portfolioStocks } = await pool.query(
        `SELECT symbol, quantity, purchase_price as price
         FROM "${portfolioTableName}"`,
        []
      );
      
      if (!portfolioStocks || portfolioStocks.length === 0) {
        console.warn(`No stocks found in ${regionUpper} portfolio. Aborting performance calculation.`);
        return false;
      }
      
      console.log(`Found ${portfolioStocks.length} stocks in ${regionUpper} portfolio`);
      
      // 3. Get the benchmark symbol for the region
      const benchmarkMap = {
        'USD': 'SPY',
        'CAD': 'XIC.TO',
        'INTL': 'ACWX'
      };
      
      const benchmarkSymbol = benchmarkMap[regionUpper];
      
      // 4. Get all trading days in date range (from historical prices)
      const { rows: tradingDays } = await pool.query(
        `SELECT DISTINCT date 
         FROM historical_prices 
         WHERE region = $1 
         AND date BETWEEN $2 AND $3 
         ORDER BY date ASC`,
        [regionUpper, effectiveStartDate, effectiveEndDate]
      );
      
      if (tradingDays.length === 0) {
        console.warn(`No trading days found for ${regionUpper} in the specified date range.`);
        return false;
      }
      
      console.log(`Found ${tradingDays.length} trading days in date range`);
      
      // Create an array of dates for processing
      const allDates = tradingDays.map(day => day.date.toISOString().split('T')[0]);
      
      // 5. For each date, calculate the portfolio value and benchmark value
      const performanceData = [];
      
      // Track the starting portfolio value and benchmark value for calculating returns
      let startPortfolioValue = null;
      let startBenchmarkValue = null;
      let previousPortfolioValue = null;
      let previousBenchmarkValue = null;
      
      for (let i = 0; i < allDates.length; i++) {
        const currentDate = allDates[i];
        
        // Get all prices for current date
        const { rows: prices } = await pool.query(
          `SELECT symbol, close, adjusted_close 
           FROM historical_prices 
           WHERE region = $1 
           AND date = $2`,
          [regionUpper, currentDate]
        );
        
        // Skip days with no price data
        if (prices.length === 0) continue;
        
        // Create a map of symbol to price
        const priceMap = {};
        let hasBenchmarkPrice = false;
        
        prices.forEach(price => {
          priceMap[price.symbol] = {
            close: parseFloat(price.close || 0),
            adjClose: parseFloat(price.adjusted_close || price.close || 0)
          };
          
          if (price.symbol === benchmarkSymbol) {
            hasBenchmarkPrice = true;
          }
        });
        
        // Skip days without benchmark prices
        if (!hasBenchmarkPrice) {
          console.log(`Skipping ${currentDate} - no benchmark price available`);
          continue;
        }
        
        // Calculate portfolio value for this day
        let portfolioValue = 0;
        let validSymbolsCount = 0;
        let totalPortfolioPercentage = 0;
        
        portfolioStocks.forEach(stock => {
          const symbol = stock.symbol;
          const quantity = parseFloat(stock.quantity || 0);
          
          if (priceMap[symbol]) {
            const price = priceMap[symbol].adjClose;
            portfolioValue += quantity * price;
            validSymbolsCount++;
            totalPortfolioPercentage += parseFloat(stock.portfolio_percentage || 0);
          }
        });
        
        // Skip dates with insufficient price coverage (less than 80% of portfolio)
        if (validSymbolsCount === 0 || totalPortfolioPercentage < 80) {
          console.log(`Skipping ${currentDate} - insufficient price coverage (${validSymbolsCount}/${portfolioStocks.length} symbols, ${totalPortfolioPercentage.toFixed(2)}% of portfolio)`);
          continue;
        }
        
        // Get benchmark price
        const benchmarkPrice = priceMap[benchmarkSymbol].adjClose;
        
        // The first day with valid data becomes our baseline
        if (startPortfolioValue === null) {
          startPortfolioValue = portfolioValue;
          startBenchmarkValue = benchmarkPrice;
          previousPortfolioValue = portfolioValue;
          previousBenchmarkValue = benchmarkPrice;
        }
        
        // Calculate returns
        const portfolioCumulativeReturn = (portfolioValue / startPortfolioValue) - 1;
        const benchmarkCumulativeReturn = (benchmarkPrice / startBenchmarkValue) - 1;
        
        const portfolioReturnDaily = previousPortfolioValue ? (portfolioValue / previousPortfolioValue) - 1 : 0;
        const benchmarkReturnDaily = previousBenchmarkValue ? (benchmarkPrice / previousBenchmarkValue) - 1 : 0;
        
        // Calculate relative performance (portfolio outperformance vs benchmark)
        const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
        
        // Save data point
        performanceData.push({
          date: currentDate,
          portfolioValue,
          benchmarkValue: benchmarkPrice,
          portfolioCumulativeReturn,
          benchmarkCumulativeReturn,
          portfolioReturnDaily,
          benchmarkReturnDaily,
          relativePerformance
        });
        
        // Update previous values for next iteration
        previousPortfolioValue = portfolioValue;
        previousBenchmarkValue = benchmarkPrice;
      }
      
      // Exit if no performance data was calculated
      if (performanceData.length === 0) {
        console.warn('No valid performance data could be calculated.');
        return false;
      }
      
      console.log(`Successfully calculated performance for ${performanceData.length} days using real market data`);
      
      // 6. Store the performance data in the database
      
      // First, clear existing data in the performance table for these dates
      await pool.query(
        `DELETE FROM ${tableName} WHERE date BETWEEN $1 AND $2`,
        [effectiveStartDate, effectiveEndDate]
      );
      
      // Insert new performance data
      for (const dataPoint of performanceData) {
        await pool.query(
          `INSERT INTO ${tableName} (
            date, 
            portfolio_value, 
            benchmark_value, 
            portfolio_cumulative_return, 
            benchmark_cumulative_return, 
            portfolio_return_daily, 
            benchmark_return_daily, 
            relative_performance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (date) DO UPDATE SET
            portfolio_value = EXCLUDED.portfolio_value,
            benchmark_value = EXCLUDED.benchmark_value,
            portfolio_cumulative_return = EXCLUDED.portfolio_cumulative_return,
            benchmark_cumulative_return = EXCLUDED.benchmark_cumulative_return,
            portfolio_return_daily = EXCLUDED.portfolio_return_daily,
            benchmark_return_daily = EXCLUDED.benchmark_return_daily,
            relative_performance = EXCLUDED.relative_performance`,
          [
            dataPoint.date,
            dataPoint.portfolioValue,
            dataPoint.benchmarkValue,
            dataPoint.portfolioCumulativeReturn,
            dataPoint.benchmarkCumulativeReturn,
            dataPoint.portfolioReturnDaily,
            dataPoint.benchmarkReturnDaily,
            dataPoint.relativePerformance
          ]
        );
      }
      
      console.log(`Successfully updated ${performanceData.length} performance records for ${regionUpper} using real market data`);
      return true;
    } catch (error) {
      console.error(`Error updating performance history for ${regionUpper}:`, error);
      throw error;
    }
  }
  
  /**
   * Update performance history for all regions
   * 
   * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
   * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
   * @returns {Promise<Object>} Object with results for each region
   */
  async updateAllPerformanceHistory(startDate, endDate) {
    const regions = ['USD', 'CAD', 'INTL'];
    const results = {};
    
    try {
      console.log('Updating performance history for all regions...');
      
      for (const region of regions) {
        try {
          console.log(`Processing ${region}...`);
          results[region] = await this.updatePerformanceHistory(region, startDate, endDate);
        } catch (error) {
          console.error(`Error updating ${region} performance history:`, error);
          results[region] = false;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in updateAllPerformanceHistory:', error);
      throw error;
    }
  }
}

// Create and export the service instance
const portfolioPerformanceService = new PortfolioPerformanceService();
export { portfolioPerformanceService };
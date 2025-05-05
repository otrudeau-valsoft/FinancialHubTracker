/**
 * Portfolio Performance Service
 * 
 * Handles the calculation, storage, and retrieval of portfolio performance metrics
 * based on historical price data. This redesigned service directly calculates
 * performance metrics from the historical price data for more accurate results.
 */

import { db } from '../db.js';
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
      
      // Execute the query
      const { rows } = await db.query(query, params);
      
      // Transform the data for presentation
      return rows.map(row => ({
        date: row.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        portfolioValue: parseFloat(row.portfolio_value),
        benchmarkValue: parseFloat(row.benchmark_value),
        portfolioCumulativeReturn: parseFloat(row.portfolio_cumulative_return),
        benchmarkCumulativeReturn: parseFloat(row.benchmark_cumulative_return),
        portfolioReturnDaily: parseFloat(row.portfolio_return_daily),
        benchmarkReturnDaily: parseFloat(row.benchmark_return_daily),
        relativePerformance: parseFloat(row.relative_performance)
      }));
    } catch (error) {
      console.error(`Error getting performance history for ${region}:`, error);
      throw error;
    }
  }
  
  /**
   * Update performance history for a specific region
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
    
    try {
      console.log(`Updating performance history for ${regionUpper}...`);
      
      // 1. Determine the appropriate date range
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      if (!effectiveStartDate) {
        // If no start date is provided, get the earliest date from historical prices
        const { rows: earliestDateRows } = await db.query(
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
      
      // 2. Get all symbols in the portfolio
      const portfolioStocks = await holdingsService.getPortfolioStocks(regionUpper);
      
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
      
      // 4. Get historical prices for the portfolio symbols and benchmark
      const { rows: historicalPrices } = await db.query(
        `SELECT symbol, date, close, adj_close
         FROM historical_prices
         WHERE region = $1
         AND date BETWEEN $2 AND $3
         ORDER BY date ASC`,
        [regionUpper, effectiveStartDate, effectiveEndDate]
      );
      
      if (historicalPrices.length === 0) {
        console.warn(`No historical prices found for ${regionUpper} in the specified date range.`);
        return false;
      }
      
      console.log(`Retrieved ${historicalPrices.length} historical price records for calculation`);
      
      // 5. Transform the historical prices into a more usable format
      // Group by date and symbol for easier access
      const pricesByDate = {};
      
      historicalPrices.forEach(price => {
        const dateStr = price.date.toISOString().split('T')[0];
        
        if (!pricesByDate[dateStr]) {
          pricesByDate[dateStr] = {};
        }
        
        pricesByDate[dateStr][price.symbol] = {
          close: parseFloat(price.close || 0),
          adjClose: parseFloat(price.adj_close || price.close || 0)
        };
      });
      
      // Get all unique dates in sorted order
      const allDates = Object.keys(pricesByDate).sort();
      
      if (allDates.length === 0) {
        console.warn('No valid dates found after processing historical prices.');
        return false;
      }
      
      console.log(`Processing performance for ${allDates.length} trading days`);
      
      // 6. Get portfolio positions and weights
      const portfolioPositions = portfolioStocks.reduce((positions, stock) => {
        positions[stock.symbol] = {
          shares: parseFloat(stock.shares || 0),
          weight: parseFloat(stock.target_weight || 0) / 100 // Convert percentage to decimal
        };
        return positions;
      }, {});
      
      // 7. Calculate daily portfolio values and returns
      const performanceData = [];
      
      // Find baseline portfolio value (first day with sufficient data)
      let baselineDate = null;
      let baselinePortfolioValue = 0;
      let baselineBenchmarkValue = 100; // Start benchmark at 100
      
      // Ensure we have the benchmark data
      for (const date of allDates) {
        const dayPrices = pricesByDate[date];
        
        // Skip days without benchmark data
        if (!dayPrices[benchmarkSymbol]) {
          continue;
        }
        
        // Calculate portfolio value based on shares and prices
        let portfolioValue = 0;
        let sufficientData = true;
        
        for (const symbol in portfolioPositions) {
          if (!dayPrices[symbol]) {
            sufficientData = false;
            break;
          }
          
          portfolioValue += portfolioPositions[symbol].shares * dayPrices[symbol].adjClose;
        }
        
        if (sufficientData && portfolioValue > 0) {
          baselineDate = date;
          baselinePortfolioValue = portfolioValue;
          break;
        }
      }
      
      if (!baselineDate) {
        console.error('Could not establish a baseline date with sufficient price data.');
        return false;
      }
      
      // Calculate performance for each day relative to the baseline
      for (const date of allDates) {
        // Skip dates earlier than our baseline
        if (date < baselineDate) {
          continue;
        }
        
        const dayPrices = pricesByDate[date];
        
        // Skip days without benchmark data
        if (!dayPrices[benchmarkSymbol]) {
          continue;
        }
        
        // Calculate portfolio value for this day
        let portfolioValue = 0;
        let validSymbolCount = 0;
        let totalWeight = 0;
        
        for (const symbol in portfolioPositions) {
          if (dayPrices[symbol]) {
            portfolioValue += portfolioPositions[symbol].shares * dayPrices[symbol].adjClose;
            validSymbolCount++;
            totalWeight += portfolioPositions[symbol].weight;
          }
        }
        
        // Skip days with insufficient price data (less than 80% of portfolio by weight)
        if (validSymbolCount === 0 || totalWeight < 0.8) {
          console.log(`Skipping ${date} due to insufficient price data (${validSymbolCount} symbols, ${totalWeight.toFixed(2)} weight coverage)`);
          continue;
        }
        
        // Calculate benchmark value (starting at 100 and adjusting by daily returns)
        const benchmarkValue = baselineBenchmarkValue * (dayPrices[benchmarkSymbol].adjClose / 
          pricesByDate[baselineDate][benchmarkSymbol].adjClose);
        
        // Find the previous day's data for daily returns
        const previousDay = performanceData.length > 0 ? 
          performanceData[performanceData.length - 1] : 
          { date: baselineDate, portfolioValue: baselinePortfolioValue, benchmarkValue: baselineBenchmarkValue };
        
        // Calculate returns
        const portfolioCumulativeReturn = (portfolioValue / baselinePortfolioValue) - 1;
        const benchmarkCumulativeReturn = (benchmarkValue / baselineBenchmarkValue) - 1;
        
        const portfolioReturnDaily = (portfolioValue / previousDay.portfolioValue) - 1;
        const benchmarkReturnDaily = (benchmarkValue / previousDay.benchmarkValue) - 1;
        
        // Calculate relative performance (portfolio outperformance vs benchmark)
        const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
        
        // Add this day's data
        performanceData.push({
          date,
          portfolioValue,
          benchmarkValue,
          portfolioCumulativeReturn,
          benchmarkCumulativeReturn,
          portfolioReturnDaily,
          benchmarkReturnDaily,
          relativePerformance
        });
      }
      
      if (performanceData.length === 0) {
        console.warn('No valid performance data could be calculated.');
        return false;
      }
      
      console.log(`Calculated performance for ${performanceData.length} days`);
      
      // 8. Store the performance data in the database
      
      // First, clear existing data in the performance table for these dates
      await db.query(
        `DELETE FROM ${tableName} WHERE date BETWEEN $1 AND $2`,
        [effectiveStartDate, effectiveEndDate]
      );
      
      // Insert new performance data
      for (const dataPoint of performanceData) {
        await db.query(
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
      
      console.log(`Successfully updated ${performanceData.length} performance records for ${regionUpper}`);
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
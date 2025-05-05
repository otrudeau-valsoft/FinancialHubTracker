/**
 * Portfolio Performance Service
 * 
 * This service calculates and manages portfolio performance metrics
 * based on historical price data. It integrates with the historical price
 * service to ensure performance metrics are synchronized with price updates.
 */

const { pool } = require('../db');
const { DateTime } = require('luxon');

class PortfolioPerformanceService {
  constructor() {
    // Benchmark mapping for each region
    this.benchmarks = {
      'USD': 'SPY',
      'CAD': 'XIC.TO',
      'INTL': 'ACWX'
    };
  }

  /**
   * Calculate the portfolio value on a specific date
   * @param {string} region - The portfolio region (USD, CAD, INTL)
   * @param {string} dateStr - The date in YYYY-MM-DD format
   * @returns {Promise<number|null>} - The total portfolio value, or null if calculation failed
   */
  async calculatePortfolioValue(region, dateStr) {
    try {
      // Get all stocks in this portfolio
      const portfolioQuery = `
        SELECT symbol, quantity 
        FROM portfolio_${region.toLowerCase()}
        WHERE symbol != 'CASH'
      `;
      
      const portfolioResult = await pool.query(portfolioQuery);
      const stocks = portfolioResult.rows;
      
      if (!stocks || stocks.length === 0) {
        console.log(`No stocks found in ${region} portfolio`);
        return null;
      }
      
      // Get all historical prices for this date
      const pricesQuery = `
        SELECT symbol, adjusted_close 
        FROM historical_prices
        WHERE region = $1 AND date::text = $2
      `;
      
      const pricesResult = await pool.query(pricesQuery, [region, dateStr]);
      const prices = pricesResult.rows;
      
      if (!prices || prices.length === 0) {
        console.log(`No prices found for ${region} portfolio on ${dateStr}`);
        return null;
      }
      
      // Create a map of prices by symbol for easy lookup
      const priceMap = {};
      prices.forEach(price => {
        priceMap[price.symbol] = parseFloat(price.adjusted_close);
      });
      
      // Calculate total portfolio value
      let portfolioValue = 0;
      
      for (const stock of stocks) {
        const price = priceMap[stock.symbol];
        if (price) {
          portfolioValue += price * parseFloat(stock.quantity);
        }
      }
      
      // Add cash component
      const cashQuery = `SELECT amount FROM cash WHERE region = $1`;
      const cashResult = await pool.query(cashQuery, [region]);
      if (cashResult.rows.length > 0) {
        portfolioValue += parseFloat(cashResult.rows[0].amount);
      }
      
      return portfolioValue;
    } catch (error) {
      console.error(`Error calculating ${region} portfolio value for ${dateStr}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate the benchmark value for a specific date
   * @param {string} region - The portfolio region (USD, CAD, INTL)
   * @param {string} dateStr - The date in YYYY-MM-DD format
   * @returns {Promise<number|null>} - The benchmark value, or null if not found
   */
  async calculateBenchmarkValue(region, dateStr) {
    try {
      const benchmarkSymbol = this.benchmarks[region];
      
      if (!benchmarkSymbol) {
        console.error(`No benchmark defined for region ${region}`);
        return null;
      }
      
      const query = `
        SELECT adjusted_close 
        FROM historical_prices
        WHERE region = $1 AND symbol = $2 AND date::text = $3
      `;
      
      const result = await pool.query(query, [region, benchmarkSymbol, dateStr]);
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`No benchmark price found for ${benchmarkSymbol} on ${dateStr}`);
        return null;
      }
      
      return parseFloat(result.rows[0].adjusted_close);
    } catch (error) {
      console.error(`Error calculating benchmark value for ${region} on ${dateStr}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate the daily return between two values
   * @param {number} currentValue - The current value
   * @param {number} previousValue - The previous value
   * @returns {number|null} - The daily return as a decimal (0.01 = 1%)
   */
  calculateDailyReturn(currentValue, previousValue) {
    if (!currentValue || !previousValue || previousValue === 0) {
      return null;
    }
    
    return (currentValue - previousValue) / previousValue;
  }
  
  /**
   * Get a sorted array of all available dates with historical prices for a region
   * @param {string} region - The portfolio region (USD, CAD, INTL)
   * @param {string} startDateStr - The start date in YYYY-MM-DD format
   * @param {string} endDateStr - The end date in YYYY-MM-DD format
   * @returns {Promise<string[]>} - Array of date strings in YYYY-MM-DD format
   */
  async getAvailableDatesSorted(region, startDateStr, endDateStr) {
    try {
      // First get the benchmark symbol for this region
      const benchmarkSymbol = this.benchmarks[region];
      
      // Get all dates for which we have data for the benchmark
      const query = `
        SELECT DISTINCT date::text as date
        FROM historical_prices
        WHERE region = $1 
        AND symbol = $2
        AND date BETWEEN $3 AND $4
        ORDER BY date
      `;
      
      const result = await pool.query(query, [
        region, 
        benchmarkSymbol, 
        startDateStr, 
        endDateStr
      ]);
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`No dates found with historical prices for ${region} between ${startDateStr} and ${endDateStr}`);
        return [];
      }
      
      return result.rows.map(row => row.date);
    } catch (error) {
      console.error(`Error getting available dates for ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Update or recalculate the performance history for a specific region
   * @param {string} region - The portfolio region (USD, CAD, INTL)
   * @param {string} [startDateStr] - Optional start date, defaults to 18 months ago
   * @param {string} [endDateStr] - Optional end date, defaults to current date
   * @returns {Promise<boolean>} - True if update was successful
   */
  async updatePerformanceHistory(region, startDateStr, endDateStr) {
    console.log(`Updating performance history for ${region} region...`);
    
    try {
      // Set default date range if not provided
      const endDate = endDateStr 
        ? DateTime.fromISO(endDateStr) 
        : DateTime.now().setZone('America/New_York');
      
      const startDate = startDateStr
        ? DateTime.fromISO(startDateStr)
        : endDate.minus({ months: 18 }); // Use 18 months of history
      
      const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
      const formattedEndDate = endDate.toFormat('yyyy-MM-dd');
      
      console.log(`Date range: ${formattedStartDate} to ${formattedEndDate}`);
      
      // Get all dates with historical data for this region
      const dates = await this.getAvailableDatesSorted(
        region, 
        formattedStartDate, 
        formattedEndDate
      );
      
      if (dates.length === 0) {
        console.log(`No historical data available for ${region} in specified date range`);
        return false;
      }
      
      console.log(`Found ${dates.length} dates with historical data for ${region}`);
      
      // First clear existing performance data in this date range
      await pool.query(`
        DELETE FROM portfolio_performance_${region.toLowerCase()}
        WHERE date BETWEEN $1 AND $2
      `, [formattedStartDate, formattedEndDate]);
      
      console.log(`Cleared existing performance data in date range`);
      
      // Process each date to calculate performance metrics
      let prevPortfolioValue = null;
      let prevBenchmarkValue = null;
      
      for (let i = 0; i < dates.length; i++) {
        const dateStr = dates[i];
        
        // Calculate portfolio value and benchmark value for this date
        const [portfolioValue, benchmarkValue] = await Promise.all([
          this.calculatePortfolioValue(region, dateStr),
          this.calculateBenchmarkValue(region, dateStr)
        ]);
        
        // Skip dates where we couldn't calculate either value
        if (portfolioValue === null || benchmarkValue === null) {
          console.log(`Skipping ${dateStr} - missing portfolio or benchmark data`);
          continue;
        }
        
        // Calculate daily returns if we have previous values
        const portfolioDailyReturn = this.calculateDailyReturn(portfolioValue, prevPortfolioValue);
        const benchmarkDailyReturn = this.calculateDailyReturn(benchmarkValue, prevBenchmarkValue);
        
        // Insert data into the performance table
        await pool.query(`
          INSERT INTO portfolio_performance_${region.toLowerCase()} (
            date, 
            portfolio_value, 
            benchmark_value, 
            portfolio_daily_return, 
            benchmark_daily_return
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (date) 
          DO UPDATE SET
            portfolio_value = EXCLUDED.portfolio_value,
            benchmark_value = EXCLUDED.benchmark_value,
            portfolio_daily_return = EXCLUDED.portfolio_daily_return,
            benchmark_daily_return = EXCLUDED.benchmark_daily_return
        `, [
          dateStr,
          portfolioValue,
          benchmarkValue,
          portfolioDailyReturn,
          benchmarkDailyReturn
        ]);
        
        // Update previous values for next iteration
        prevPortfolioValue = portfolioValue;
        prevBenchmarkValue = benchmarkValue;
      }
      
      console.log(`Successfully updated performance history for ${region} region`);
      return true;
    } catch (error) {
      console.error(`Error updating performance history for ${region} region:`, error);
      return false;
    }
  }
  
  /**
   * Update performance history for all regions
   * @param {string} [startDateStr] - Optional start date
   * @param {string} [endDateStr] - Optional end date
   * @returns {Promise<boolean>} - True if all updates were successful
   */
  async updateAllPerformanceHistory(startDateStr, endDateStr) {
    console.log('Updating performance history for all regions...');
    
    try {
      const regions = Object.keys(this.benchmarks);
      const results = [];
      
      for (const region of regions) {
        const result = await this.updatePerformanceHistory(region, startDateStr, endDateStr);
        results.push({ region, success: result });
      }
      
      const allSuccessful = results.every(r => r.success);
      
      if (allSuccessful) {
        console.log('Successfully updated performance history for all regions');
      } else {
        console.log('Partial success updating performance history:', results);
      }
      
      return allSuccessful;
    } catch (error) {
      console.error('Error updating all performance history:', error);
      return false;
    }
  }
  
  /**
   * Get portfolio performance history for a specific region and date range
   * @param {string} region - The portfolio region (USD, CAD, INTL)
   * @param {string} [startDateStr] - Optional start date
   * @param {string} [endDateStr] - Optional end date
   * @returns {Promise<Array>} - Array of performance data points
   */
  async getPerformanceHistory(region, startDateStr, endDateStr) {
    try {
      // Set default date range if not provided
      const endDate = endDateStr 
        ? DateTime.fromISO(endDateStr) 
        : DateTime.now().setZone('America/New_York');
      
      const startDate = startDateStr
        ? DateTime.fromISO(startDateStr)
        : endDate.minus({ months: 18 }); // Default to 18 months of history
      
      const formattedStartDate = startDate.toFormat('yyyy-MM-dd');
      const formattedEndDate = endDate.toFormat('yyyy-MM-dd');
      
      // Query the performance table for this region
      const query = `
        SELECT 
          date::text as date, 
          portfolio_value, 
          benchmark_value, 
          portfolio_daily_return, 
          benchmark_daily_return
        FROM portfolio_performance_${region.toLowerCase()}
        WHERE date BETWEEN $1 AND $2
        ORDER BY date
      `;
      
      const result = await pool.query(query, [formattedStartDate, formattedEndDate]);
      
      if (!result.rows || result.rows.length === 0) {
        console.log(`No performance data found for ${region} between ${formattedStartDate} and ${formattedEndDate}`);
        return [];
      }
      
      // Transform data to include cumulative returns
      const transformedData = this.calculateCumulativeReturns(result.rows);
      
      return transformedData;
    } catch (error) {
      console.error(`Error getting performance history for ${region}:`, error);
      return [];
    }
  }
  
  /**
   * Calculate cumulative returns from daily returns
   * @param {Array} data - Array of performance data points with daily returns
   * @returns {Array} - The same data with cumulative returns added
   */
  calculateCumulativeReturns(data) {
    if (!data || data.length === 0) return [];
    
    // Start with a cumulative return of 0 (representing 0% change from baseline)
    let portfolioCumulative = 0;
    let benchmarkCumulative = 0;
    
    // Process each data point to calculate cumulative returns
    return data.map(point => {
      // Update cumulative returns if we have daily returns
      if (point.portfolio_daily_return !== null) {
        portfolioCumulative = (1 + portfolioCumulative) * (1 + parseFloat(point.portfolio_daily_return)) - 1;
      }
      
      if (point.benchmark_daily_return !== null) {
        benchmarkCumulative = (1 + benchmarkCumulative) * (1 + parseFloat(point.benchmark_daily_return)) - 1;
      }
      
      // Calculate relative performance (portfolio vs benchmark)
      const relativePerformance = portfolioCumulative - benchmarkCumulative;
      
      // Return the enriched data point
      return {
        date: point.date,
        portfolioValue: parseFloat(point.portfolio_value),
        benchmarkValue: parseFloat(point.benchmark_value),
        portfolioReturnDaily: point.portfolio_daily_return ? parseFloat(point.portfolio_daily_return) : null,
        benchmarkReturnDaily: point.benchmark_daily_return ? parseFloat(point.benchmark_daily_return) : null,
        portfolioCumulativeReturn: portfolioCumulative,
        benchmarkCumulativeReturn: benchmarkCumulative,
        relativePerformance: relativePerformance
      };
    });
  }
}

// Export the service instance
const portfolioPerformanceService = new PortfolioPerformanceService();
module.exports = { portfolioPerformanceService };
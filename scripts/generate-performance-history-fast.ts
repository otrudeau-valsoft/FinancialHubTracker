/**
 * Generate Performance History Script (Fast Version)
 * 
 * This script creates a full year of performance history data 
 * using fewer data points for faster execution.
 */

import { pool } from "../server/db";
import { DateTime } from "luxon";

async function generatePerformanceData() {
  try {
    console.log('Starting generation of one year performance history data (fast version)...');
    
    // Get the current date and calculate dates one year ago
    const endDate = DateTime.now().setZone('America/New_York');
    const startDate = endDate.minus({ years: 1 });
    
    // Create weekly data points instead of daily (52 weeks instead of 365 days)
    let currentDate = startDate;
    const performanceData = [];
    
    // Generate random seed portfolio and benchmark values
    let portfolioValue = 80000 + Math.random() * 10000; // Start between $80-90k
    let benchmarkValue = 380 + Math.random() * 40; // Start between $380-420
    
    // Track cumulative values
    let basePortfolioValue = portfolioValue;
    let baseBenchmarkValue = benchmarkValue;
    
    // Calculate volatility parameters (standard deviations)
    const portfolioVolatility = 0.02; // 2% weekly volatility
    const benchmarkVolatility = 0.01; // 1% weekly volatility
    
    // Generate approximately 52 weeks of data (weekly points)
    while (currentDate < endDate) {
      // Only include business days (e.g., Fridays)
      if (currentDate.weekday === 5) { // Friday
        // Generate weekly returns with some randomness but trending upward
        const portfolioRandomComponent = (Math.random() - 0.4) * portfolioVolatility;
        const benchmarkRandomComponent = (Math.random() - 0.4) * benchmarkVolatility;
        
        // Add a trend component for weekly increase
        const portfolioWeeklyReturn = portfolioRandomComponent + 0.005; // ~0.5% average weekly increase
        const benchmarkWeeklyReturn = benchmarkRandomComponent + 0.003; // ~0.3% average weekly increase
        
        // Update values
        const prevPortfolioValue = portfolioValue;
        const prevBenchmarkValue = benchmarkValue;
        
        portfolioValue = portfolioValue * (1 + portfolioWeeklyReturn);
        benchmarkValue = benchmarkValue * (1 + benchmarkWeeklyReturn);
        
        // Calculate metrics
        const portfolioReturnDaily = (portfolioValue - prevPortfolioValue) / prevPortfolioValue;
        const benchmarkReturnDaily = (benchmarkValue - prevBenchmarkValue) / prevBenchmarkValue;
        const portfolioCumulativeReturn = (portfolioValue / basePortfolioValue) - 1;
        const benchmarkCumulativeReturn = (benchmarkValue / baseBenchmarkValue) - 1;
        const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
        
        // Format the date as YYYY-MM-DD for PostgreSQL
        const dateStr = currentDate.toFormat('yyyy-MM-dd');
        
        // Add data point
        performanceData.push({
          date: dateStr,
          portfolioValue,
          benchmarkValue,
          portfolioReturnDaily,
          benchmarkReturnDaily,
          portfolioCumulativeReturn,
          benchmarkCumulativeReturn,
          relativePerformance
        });
      }
      
      // Move to next week
      currentDate = currentDate.plus({ days: 7 });
    }
    
    // Add more recent data points (daily for the last month)
    currentDate = endDate.minus({ months: 1 });
    
    // Start with the latest values from the weekly data
    if (performanceData.length > 0) {
      portfolioValue = performanceData[performanceData.length - 1].portfolioValue;
      benchmarkValue = performanceData[performanceData.length - 1].benchmarkValue;
    }
    
    while (currentDate < endDate) {
      // Skip weekends
      if (currentDate.weekday < 6) { // 1-5 are Monday-Friday
        // Generate daily returns with some randomness but trending upward
        const portfolioRandomComponent = (Math.random() - 0.4) * portfolioVolatility / 5; // Convert weekly to daily
        const benchmarkRandomComponent = (Math.random() - 0.4) * benchmarkVolatility / 5;
        
        // Add a trend component (0.03% average daily increase for portfolio, 0.02% for benchmark)
        const portfolioDailyReturn = portfolioRandomComponent + 0.0003;
        const benchmarkDailyReturn = benchmarkRandomComponent + 0.0002;
        
        // Update values
        const prevPortfolioValue = portfolioValue;
        const prevBenchmarkValue = benchmarkValue;
        
        portfolioValue = portfolioValue * (1 + portfolioDailyReturn);
        benchmarkValue = benchmarkValue * (1 + benchmarkDailyReturn);
        
        // Calculate metrics
        const portfolioReturnDaily = (portfolioValue - prevPortfolioValue) / prevPortfolioValue;
        const benchmarkReturnDaily = (benchmarkValue - prevBenchmarkValue) / prevBenchmarkValue;
        const portfolioCumulativeReturn = (portfolioValue / basePortfolioValue) - 1;
        const benchmarkCumulativeReturn = (benchmarkValue / baseBenchmarkValue) - 1;
        const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
        
        // Format the date as YYYY-MM-DD for PostgreSQL
        const dateStr = currentDate.toFormat('yyyy-MM-dd');
        
        // Add data point
        performanceData.push({
          date: dateStr,
          portfolioValue,
          benchmarkValue,
          portfolioReturnDaily,
          benchmarkReturnDaily,
          portfolioCumulativeReturn,
          benchmarkCumulativeReturn,
          relativePerformance
        });
      }
      
      // Move to next day
      currentDate = currentDate.plus({ days: 1 });
    }
    
    console.log(`Generated ${performanceData.length} data points, now inserting into database...`);
    
    // Sort data points by date
    performanceData.sort((a, b) => {
      return DateTime.fromFormat(a.date, 'yyyy-MM-dd').toMillis() - 
             DateTime.fromFormat(b.date, 'yyyy-MM-dd').toMillis();
    });
    
    // For USD region - this is our primary focus
    await clearExistingData('portfolio_performance_usd');
    
    // Insert all the data points
    const insertPromises = [];
    for (const data of performanceData) {
      insertPromises.push(pool.query(`
        INSERT INTO portfolio_performance_usd (
          date, portfolio_value, benchmark_value, 
          portfolio_return_daily, benchmark_return_daily,
          portfolio_cumulative_return, benchmark_cumulative_return, 
          relative_performance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        data.date,
        data.portfolioValue,
        data.benchmarkValue,
        data.portfolioReturnDaily,
        data.benchmarkReturnDaily,
        data.portfolioCumulativeReturn,
        data.benchmarkCumulativeReturn,
        data.relativePerformance
      ]));
    }
    
    await Promise.all(insertPromises);
    
    console.log(`Successfully inserted ${performanceData.length} performance data points for USD region.`);
    
    // Scale down for other regions (CAD and INTL) with slight variations
    await generateRegionalData('CAD', performanceData, 0.92, 0.95);
    await generateRegionalData('INTL', performanceData, 0.87, 0.92);
    
    console.log('Successfully generated and inserted performance history data for all regions');
    
  } catch (error) {
    console.error('Error generating performance history data:', error);
  } finally {
    // Close the connection pool (optional, as the process should exit naturally)
    // await pool.end();
  }
}

/**
 * Clear existing data from a performance table
 */
async function clearExistingData(tableName: string) {
  console.log(`Clearing existing data from ${tableName}...`);
  await pool.query(`DELETE FROM ${tableName}`);
}

/**
 * Generate data for CAD and INTL regions with scaling factors for variation
 */
async function generateRegionalData(region: string, baseData: any[], portfolioScale: number, benchmarkScale: number) {
  const tableName = `portfolio_performance_${region.toLowerCase()}`;
  
  await clearExistingData(tableName);
  
  console.log(`Generating data for ${region} region...`);
  
  const insertPromises = [];
  
  for (const data of baseData) {
    // Apply scaling factors and add some randomness
    const portfolioFactor = portfolioScale + (Math.random() - 0.5) * 0.05; // +/- 2.5%
    const benchmarkFactor = benchmarkScale + (Math.random() - 0.5) * 0.03; // +/- 1.5%
    
    const portfolioValue = data.portfolioValue * portfolioFactor;
    const benchmarkValue = data.benchmarkValue * benchmarkFactor;
    
    // Recalculate the returns for consistency
    const portfolioCumulativeReturn = (portfolioValue / (baseData[0].portfolioValue * portfolioFactor)) - 1;
    const benchmarkCumulativeReturn = (benchmarkValue / (baseData[0].benchmarkValue * benchmarkFactor)) - 1;
    const relativePerformance = portfolioCumulativeReturn - benchmarkCumulativeReturn;
    
    insertPromises.push(pool.query(`
      INSERT INTO ${tableName} (
        date, portfolio_value, benchmark_value, 
        portfolio_return_daily, benchmark_return_daily,
        portfolio_cumulative_return, benchmark_cumulative_return, 
        relative_performance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      data.date,
      portfolioValue,
      benchmarkValue,
      data.portfolioReturnDaily * portfolioFactor / benchmarkFactor, // Adjust daily returns
      data.benchmarkReturnDaily * benchmarkFactor / portfolioFactor,
      portfolioCumulativeReturn,
      benchmarkCumulativeReturn,
      relativePerformance
    ]));
  }
  
  await Promise.all(insertPromises);
  
  console.log(`Successfully inserted data for ${region} region.`);
}

// Run the script
generatePerformanceData().catch(console.error);
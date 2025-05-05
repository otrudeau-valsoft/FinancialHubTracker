/**
 * Generate Performance History Script (Fast Version)
 * 
 * This script creates a full year of performance history data 
 * using fewer data points for faster execution.
 */

import { db } from '../server/db.js';
import { DateTime } from 'luxon';

/**
 * Generate USD region performance data with a moderate growth profile
 * that has realistic ups and downs but trends upward overall
 */
async function generatePerformanceData() {
  try {
    console.log('Generating performance history data for all regions...');
    
    // Clear existing data from all tables first
    await clearExistingData('portfolio_performance_usd');
    await clearExistingData('portfolio_performance_cad');
    await clearExistingData('portfolio_performance_intl');
    
    // Generate one year of data in 2-week intervals for better performance
    const endDate = DateTime.now();
    const startDate = endDate.minus({ years: 1 });
    
    // Create the dates array (bi-weekly)
    const dates = [];
    let currentDate = startDate;
    
    while (currentDate <= endDate) {
      // Only include weekdays (Mon-Fri)
      if (currentDate.weekday <= 5) {
        dates.push(currentDate);
      }
      // Go to next day (for daily data)
      // Or next week (for weekly data)
      currentDate = currentDate.plus({ days: 1 });
    }
    
    console.log(`Generating data for ${dates.length} dates`);
    
    // Generate baseline data for USD region
    const baseData = [];
    
    // Initial values
    let portfolioValue = 1000000; // $1M starting portfolio
    let benchmarkValue = 100; // Starting benchmark at 100
    
    // Daily volatility parameters
    const avgDailyReturn = 0.0003; // Average 7.5% annual return
    const stdDev = 0.008; // Daily standard deviation around 8%
    
    // Function to generate a random daily return with volatility
    const randomDailyReturn = () => {
      const randomFactor = (Math.random() * 2 - 1) * stdDev;
      return avgDailyReturn + randomFactor;
    };

    // Create some patterns in the data to make it more realistic
    const eventDays = [
      { date: '2024-11-01', impact: -0.04 }, // Market correction
      { date: '2024-12-15', impact: 0.03 }, // End of year rally
      { date: '2025-01-20', impact: -0.025 }, // Earnings disappointment
      { date: '2025-02-10', impact: 0.035 }, // Strong economic data
      { date: '2025-03-15', impact: -0.02 }, // Interest rate fears
      { date: '2025-04-01', impact: 0.025 } // Positive earnings surprises
    ];

    // Generate the baseline data
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateStr = date.toFormat('yyyy-MM-dd');
      
      // Check if this is a special event day
      const eventDay = eventDays.find(ed => ed.date === dateStr);
      let portfolioReturn = randomDailyReturn();
      let benchmarkReturn = randomDailyReturn() * 0.9; // Benchmark slightly underperforms
      
      // Apply the event impact if it's an event day
      if (eventDay) {
        portfolioReturn += eventDay.impact * (Math.random() * 0.4 + 0.8); // Portfolio impact
        benchmarkReturn += eventDay.impact * (Math.random() * 0.2 + 0.9); // Benchmark impact
      }
      
      // Apply returns
      portfolioValue *= (1 + portfolioReturn);
      benchmarkValue *= (1 + benchmarkReturn);
      
      // Store this day's data
      const previousDay = i > 0 ? baseData[i-1] : null;
      
      const portfolioCumulativeReturn = (portfolioValue / 1000000) - 1;
      const benchmarkCumulativeReturn = (benchmarkValue / 100) - 1;
      
      const portfolioReturnDaily = previousDay ? 
        (portfolioValue / previousDay.portfolioValue) - 1 : 0;
      const benchmarkReturnDaily = previousDay ? 
        (benchmarkValue / previousDay.benchmarkValue) - 1 : 0;
      
      // Add to base data array
      baseData.push({
        date: dateStr,
        portfolioValue,
        benchmarkValue,
        portfolioCumulativeReturn,
        benchmarkCumulativeReturn,
        portfolioReturnDaily,
        benchmarkReturnDaily,
        relativePerformance: portfolioCumulativeReturn - benchmarkCumulativeReturn
      });
    }
    
    console.log(`Generated ${baseData.length} base data points`);
    
    // Save the USD data
    await savePerformanceData('portfolio_performance_usd', baseData);
    
    // Generate CAD and INTL region data with variations
    await generateRegionalData('CAD', baseData, 0.92, 0.88);  // CAD portfolio slightly lags 
    await generateRegionalData('INTL', baseData, 1.15, 1.05); // INTL portfolio outperforms
    
    console.log('Performance history generation completed');
  } catch (error) {
    console.error('Error generating performance history:', error);
    throw error;
  } finally {
    await db.end();
  }
}

/**
 * Clear existing data from a performance table
 */
async function clearExistingData(tableName: string) {
  console.log(`Clearing existing data from ${tableName}`);
  await db.query(`DELETE FROM ${tableName}`);
}

/**
 * Save performance data to the specified table
 */
async function savePerformanceData(tableName: string, data: any[]) {
  console.log(`Saving ${data.length} records to ${tableName}`);
  
  for (const item of data) {
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
        item.date,
        item.portfolioValue,
        item.benchmarkValue,
        item.portfolioCumulativeReturn,
        item.benchmarkCumulativeReturn,
        item.portfolioReturnDaily,
        item.benchmarkReturnDaily,
        item.relativePerformance
      ]
    );
  }
}

/**
 * Generate data for CAD and INTL regions with scaling factors for variation
 */
async function generateRegionalData(region: string, baseData: any[], portfolioScale: number, benchmarkScale: number) {
  console.log(`Generating ${region} performance data with scaling factors: portfolio=${portfolioScale}, benchmark=${benchmarkScale}`);
  
  const tableName = `portfolio_performance_${region.toLowerCase()}`;
  const scaledData = baseData.map(item => {
    // Apply random variations to make the data unique yet correlated
    const portfolioVariation = 1 + (Math.random() * 0.05 - 0.025); // ±2.5% variation
    const benchmarkVariation = 1 + (Math.random() * 0.03 - 0.015); // ±1.5% variation
    
    const portfolioValue = item.portfolioValue * portfolioScale * portfolioVariation;
    const benchmarkValue = item.benchmarkValue * benchmarkScale * benchmarkVariation;
    
    const portfolioCumulativeReturn = (portfolioValue / (1000000 * portfolioScale)) - 1;
    const benchmarkCumulativeReturn = (benchmarkValue / (100 * benchmarkScale)) - 1;
    
    return {
      ...item,
      portfolioValue,
      benchmarkValue,
      portfolioCumulativeReturn,
      benchmarkCumulativeReturn,
      relativePerformance: portfolioCumulativeReturn - benchmarkCumulativeReturn
    };
  });
  
  await savePerformanceData(tableName, scaledData);
}

// Run the script
generatePerformanceData().catch(err => {
  console.error('Error running performance history generation:', err);
  process.exit(1);
});
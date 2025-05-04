/**
 * Technical Indicators Utilities
 * 
 * This module provides functions for calculating various technical indicators
 * used in financial analysis, such as RSI (Relative Strength Index) and
 * MACD (Moving Average Convergence Divergence).
 */

/**
 * Calculate RSI (Relative Strength Index) for a series of price data
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param period The period for RSI calculation (default 14)
 * @returns Array of RSI values corresponding to the input prices
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  // We need at least period+1 prices to calculate the first RSI value
  if (!prices || prices.length < period + 1) {
    console.log(`Not enough data for RSI calculation. Need at least ${period + 1} prices, but got ${prices?.length || 0}.`);
    return Array(prices?.length || 0).fill(null);
  }

  // Calculate price changes (price of today - price of yesterday)
  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(prices[i] - prices[i - 1]);
  }

  // Initialize arrays to hold gain and loss values
  const gains: number[] = [];
  const losses: number[] = [];

  // Populate gains and losses arrays
  for (let i = 0; i < priceChanges.length; i++) {
    gains.push(priceChanges[i] > 0 ? priceChanges[i] : 0);
    losses.push(priceChanges[i] < 0 ? Math.abs(priceChanges[i]) : 0);
  }

  // Calculate RSI values - we'll need an array of the same length as prices
  const rsiValues: (number | null)[] = Array(prices.length).fill(null);
  
  // First price point cannot have RSI (no change)
  // rsiValues[0] is already null

  // We can only start calculating RSI after we have 'period' price changes
  if (gains.length < period) {
    console.warn(`Not enough gain/loss data points for RSI period ${period}. Have ${gains.length}, need ${period}.`);
    return rsiValues;
  }

  // Calculate initial averages based on first 'period' values
  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // Calculate first RSI value - this happens at index period+1
  // since we need period days of changes to calculate the first value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  rsiValues[period] = rsi;

  // Calculate the rest of RSI values using smoothed averages
  for (let i = period; i < priceChanges.length; i++) {
    // Smoothed average = ((previous avg * (period - 1)) + current value) / period
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    // Avoid division by zero
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    
    // Store this RSI value at the corresponding price index
    // Price index is i+1 because the first price change is at index 1
    rsiValues[i + 1] = rsi;
  }

  return rsiValues;
}

/**
 * Calculate multiple RSI periods at once
 * This is more efficient than calling calculateRSI multiple times
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param periods Array of periods to calculate RSI for (e.g. [9, 14, 21])
 * @returns Object with each period as key and array of RSI values as value
 */
export function calculateMultipleRSI(
  prices: number[], 
  periods: number[] = [14]
): Record<number, (number | null)[]> {
  const result: Record<number, (number | null)[]> = {};
  
  for (const period of periods) {
    result[period] = calculateRSI(prices, period);
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA) for a series of price data
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param period The period for EMA calculation (e.g., 12, 26)
 * @returns Array of EMA values corresponding to the input prices
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  // We need at least period prices to calculate the first EMA value
  if (!prices || prices.length < period) {
    console.log(`Not enough data for EMA calculation. Need at least ${period} prices, but got ${prices?.length || 0}.`);
    return Array(prices?.length || 0).fill(null);
  }

  const emaValues: (number | null)[] = Array(prices.length).fill(null);
  
  // Start with a simple moving average (SMA) for the first data point
  const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaValues[period - 1] = sma;
  
  // Multiplier used in EMA calculation: 2 / (period + 1)
  const multiplier = 2 / (period + 1);
  
  // Calculate EMA for the rest of the data points
  for (let i = period; i < prices.length; i++) {
    // EMA = (Current Price * Multiplier) + (Previous EMA * (1 - Multiplier))
    emaValues[i] = (prices[i] * multiplier) + (emaValues[i - 1]! * (1 - multiplier));
  }
  
  return emaValues;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence) for a series of price data
 * 
 * MACD is calculated as follows:
 * 1. Calculate the 12-period EMA of the price (fast line)
 * 2. Calculate the 26-period EMA of the price (slow line)
 * 3. Histogram = Fast EMA - Slow EMA
 * 
 * Simplified version as per requirements:
 * - Only calculates fast EMA, slow EMA, and histogram
 * - Does not calculate MACD line or signal line
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param fastPeriod The period for the fast EMA line (default 12)
 * @param slowPeriod The period for the slow EMA line (default 26)
 * @returns Object containing fast EMA, slow EMA, and histogram values
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26
): {
  fast: (number | null)[];   // 12-period EMA
  slow: (number | null)[];   // 26-period EMA
  histogram: (number | null)[]; // Histogram (Fast - Slow)
} {
  // Calculate the fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Initialize array to hold histogram values with nulls
  const histogram: (number | null)[] = Array(prices.length).fill(null);
  
  // Calculate Histogram (Fast EMA - Slow EMA)
  for (let i = 0; i < prices.length; i++) {
    // We can only calculate histogram once we have both EMAs
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      histogram[i] = fastEMA[i]! - slowEMA[i]!;
    }
  }
  
  // Log the first few values to verify correct calculation
  if (prices.length > 0) {
    console.log(`MACD calculation for ${prices.length} price points:`);
    const sampleSize = Math.min(3, prices.length);
    for (let i = prices.length - sampleSize; i < prices.length; i++) {
      console.log(`- Point ${i}: Fast=${fastEMA[i]?.toFixed(4)}, Slow=${slowEMA[i]?.toFixed(4)}, Histogram=${histogram[i]?.toFixed(4)}`);
    }
  }
  
  return { 
    fast: fastEMA,         // Fast EMA (12-period)
    slow: slowEMA,         // Slow EMA (26-period)
    histogram: histogram   // Histogram (Fast - Slow)
  };
}
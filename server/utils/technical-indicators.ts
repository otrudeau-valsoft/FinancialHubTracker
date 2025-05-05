/**
 * Technical Indicators Utilities
 * 
 * This module provides functions for calculating various technical indicators
 * used in financial analysis, such as RSI (Relative Strength Index).
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
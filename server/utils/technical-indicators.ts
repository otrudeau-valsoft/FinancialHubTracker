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
  if (!prices || prices.length < period + 1) {
    return Array(prices.length).fill(null);
  }

  // Calculate price changes
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

  // Calculate RSI values
  const rsiValues: (number | null)[] = [];
  
  // First value cannot have RSI
  rsiValues.push(null);

  // Calculate initial averages based on first 'period' values
  if (gains.length < period) {
    return Array(prices.length).fill(null);
  }

  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // Calculate first RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  rsiValues.push(rsi);

  // Calculate the rest of RSI values using smoothed averages
  for (let i = period; i < priceChanges.length; i++) {
    // Smoothed average = ((previous avg * (period - 1)) + current value) / period
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    // Avoid division by zero
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    rsiValues.push(rsi);
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
/**
 * Technical Indicators Utilities
 * 
 * This module provides functions for calculating various technical indicators
 * used in financial analysis, such as RSI (Relative Strength Index) and MACD.
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
 * Calculate the Exponential Moving Average (EMA) for a series of price data
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param period The period for EMA calculation
 * @returns Array of EMA values corresponding to the input prices
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  // We need at least 'period' prices to calculate EMA
  if (!prices || prices.length < period) {
    console.log(`Not enough data for EMA calculation. Need at least ${period} prices, but got ${prices?.length || 0}.`);
    return Array(prices?.length || 0).fill(null);
  }

  // Initialize the EMA array with nulls (same length as prices)
  const emaValues: (number | null)[] = Array(prices.length).fill(null);
  
  // Calculate the multiplier used in EMA formula: 2 / (period + 1)
  const multiplier = 2 / (period + 1);
  
  // First EMA value is the SMA (Simple Moving Average) of the first 'period' prices
  const firstSMA = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaValues[period - 1] = firstSMA;
  
  // Calculate EMA for each subsequent price
  for (let i = period; i < prices.length; i++) {
    // EMA = (Current Price - Previous EMA) * multiplier + Previous EMA
    emaValues[i] = (prices[i] - emaValues[i - 1]!) * multiplier + emaValues[i - 1]!;
  }
  
  return emaValues;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence) indicator
 * 
 * @param prices Array of closing prices in chronological order (oldest to newest)
 * @param fastPeriod The period for the fast EMA (default 12)
 * @param slowPeriod The period for the slow EMA (default 26)
 * @param signalPeriod The period for the signal line EMA (default 9)
 * @returns Object with MACD line, signal line, and histogram arrays
 */
export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macd: (number | null)[], signal: (number | null)[], histogram: (number | null)[] } {
  // We need at least slowPeriod + signalPeriod prices to calculate MACD
  const minPricesNeeded = Math.max(fastPeriod, slowPeriod) + signalPeriod;
  if (!prices || prices.length < minPricesNeeded) {
    console.log(`Not enough data for MACD calculation. Need at least ${minPricesNeeded} prices, but got ${prices?.length || 0}.`);
    return {
      macd: Array(prices?.length || 0).fill(null),
      signal: Array(prices?.length || 0).fill(null),
      histogram: Array(prices?.length || 0).fill(null)
    };
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line: Fast EMA - Slow EMA
  const macdLine: (number | null)[] = Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = fastEMA[i]! - slowEMA[i]!;
    }
  }
  
  // Filter out null values for signal calculation
  const validMacdValues: number[] = [];
  const macdIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      validMacdValues.push(macdLine[i]!);
      macdIndices.push(i);
    }
  }
  
  // Calculate signal line (EMA of MACD line)
  let signalValues: (number | null)[] = [];
  if (validMacdValues.length >= signalPeriod) {
    signalValues = calculateEMA(validMacdValues, signalPeriod);
  } else {
    signalValues = Array(validMacdValues.length).fill(null);
  }
  
  // Map signal values back to the original array indices
  const signalLine: (number | null)[] = Array(prices.length).fill(null);
  for (let i = 0; i < signalValues.length; i++) {
    if (signalValues[i] !== null) {
      signalLine[macdIndices[i]] = signalValues[i];
    }
  }
  
  // Calculate histogram: MACD line - Signal line
  const histogram: (number | null)[] = Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i]! - signalLine[i]!;
    }
  }
  
  return { macd: macdLine, signal: signalLine, histogram };
}
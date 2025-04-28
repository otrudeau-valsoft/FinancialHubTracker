// Financial utilities and calculations

/**
 * Format currency value with symbol
 */
export function formatCurrency(value: number | string, symbol = '$'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${symbol}${numValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Format percentage value with sign
 */
export function formatPercentage(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const sign = numValue > 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
}

/**
 * Get CSS class based on profit/loss value
 */
export function getProfitLossClass(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numValue > 0) return 'text-green-400';
  if (numValue < 0) return 'text-red-400';
  return 'text-gray-400';
}

/**
 * Calculate portfolio allocation by stock type (Compounder, Catalyst, Cyclical)
 */
export function calculateAllocationByType(stocks: any[]): { [key: string]: number } {
  // Initialize allocation object
  const typeAllocation = { 
    Comp: 0, // Compounder
    Cat: 0,  // Catalyst
    Cycl: 0, // Cyclical
    Cash: 0  // Cash
  };
  
  // Calculate total value
  const totalValue = stocks.reduce((sum, stock) => {
    const currentValue = parseFloat(stock.currentValue || '0');
    return sum + currentValue;
  }, 0);
  
  // Skip calculation if total value is 0
  if (totalValue === 0) return typeAllocation;
  
  // Calculate allocation by type
  stocks.forEach(stock => {
    const currentValue = parseFloat(stock.currentValue || '0');
    const percentage = (currentValue / totalValue) * 100;
    
    // Map abbreviated types to our allocation object keys
    const type = stock.stockType || 'Unknown';
    
    if (type === 'Compounder' || type === 'Comp') {
      typeAllocation.Comp += percentage;
    } else if (type === 'Catalyst' || type === 'Cat') {
      typeAllocation.Cat += percentage;
    } else if (type === 'Cyclical' || type === 'Cycl') {
      typeAllocation.Cycl += percentage;
    } else if (type === 'Cash') {
      typeAllocation.Cash += percentage;
    }
  });
  
  // Round values
  Object.keys(typeAllocation).forEach(key => {
    typeAllocation[key] = Math.round(typeAllocation[key]);
  });
  
  return typeAllocation;
}

/**
 * Calculate portfolio allocation by rating (1-4)
 */
export function calculateAllocationByRating(stocks: any[]): { [key: string]: number } {
  // Initialize allocation object
  const ratingAllocation = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0
  };
  
  // Calculate total value
  const totalValue = stocks.reduce((sum, stock) => {
    const currentValue = parseFloat(stock.currentValue || '0');
    return sum + currentValue;
  }, 0);
  
  // Skip calculation if total value is 0
  if (totalValue === 0) return ratingAllocation;
  
  // Calculate allocation by rating
  stocks.forEach(stock => {
    const currentValue = parseFloat(stock.currentValue || '0');
    const percentage = (currentValue / totalValue) * 100;
    
    // Map ratings to our allocation object keys
    const rating = stock.rating ? stock.rating.toString() : "0";
    
    if (rating && ["1", "2", "3", "4"].includes(rating)) {
      ratingAllocation[rating] += percentage;
    }
  });
  
  // Round values
  Object.keys(ratingAllocation).forEach(key => {
    ratingAllocation[key] = Math.round(ratingAllocation[key]);
  });
  
  return ratingAllocation;
}

/**
 * Calculate portfolio statistics
 */
export function calculatePortfolioStats(stocks: any[]) {
  // Initialize stats object
  const stats = {
    totalValue: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
    ytdPerformance: 0,
    ytdValue: 0,
    cashValue: 0,
    cashPercent: 0
  };
  
  // Skip calculation if no stocks
  if (!stocks || stocks.length === 0) return stats;
  
  // Calculate total value and daily change
  let totalValue = 0;
  let dailyChange = 0;
  let ytdChange = 0;
  let cashValue = 0;
  
  stocks.forEach(stock => {
    const currentValue = parseFloat(stock.currentValue || '0');
    const dailyChangePercent = parseFloat(stock.dailyChangePercent || '0');
    const ytdChangePercent = parseFloat(stock.ytdChangePercent || '0');
    
    // Add to total value
    totalValue += currentValue;
    
    // Calculate daily change
    dailyChange += (currentValue * dailyChangePercent / 100);
    
    // Calculate YTD change
    ytdChange += (currentValue * ytdChangePercent / 100);
    
    // Track cash value
    if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
      cashValue += currentValue;
    }
  });
  
  // Calculate percentages
  const dailyChangePercent = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;
  const ytdPerformance = totalValue > 0 ? (ytdChange / totalValue) * 100 : 0;
  const cashPercent = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
  
  // Set final stats
  stats.totalValue = totalValue;
  stats.dailyChange = dailyChange;
  stats.dailyChangePercent = dailyChangePercent;
  stats.ytdPerformance = ytdPerformance;
  stats.ytdValue = ytdChange;
  stats.cashValue = cashValue;
  stats.cashPercent = cashPercent;
  
  return stats;
}

/**
 * Calculate differences between portfolio and ETF benchmark
 */
export function calculateEtfDifferences(stocks: any[], etfHoldings: any[]) {
  if (!stocks || !etfHoldings || stocks.length === 0 || etfHoldings.length === 0) {
    return [];
  }
  
  // Create a map of portfolio weights
  const portfolioWeights: Record<string, number> = {};
  const totalValue = stocks.reduce((sum, stock) => sum + parseFloat(stock.currentValue || '0'), 0);
  
  stocks.forEach(stock => {
    const weight = totalValue > 0 ? 
      (parseFloat(stock.currentValue || '0') / totalValue) * 100 : 0;
    portfolioWeights[stock.symbol] = weight;
  });
  
  // Create a map of ETF weights
  const etfWeights: Record<string, number> = {};
  etfHoldings.forEach(holding => {
    etfWeights[holding.ticker] = parseFloat(holding.weight || '0');
  });
  
  // Filter ETF holdings for top positions and find delta
  const comparisonData = etfHoldings.map(holding => {
    const symbol = holding.ticker;
    const etfWeight = parseFloat(holding.weight || '0');
    const portfolioWeight = portfolioWeights[symbol] || 0;
    const deltaWeight = portfolioWeight - etfWeight;
    
    return {
      symbol,
      name: holding.name || symbol,
      portfolioWeight,
      etfWeight,
      deltaWeight
    };
  });
  
  // Sort by absolute delta weight (largest differences first)
  return comparisonData.sort((a, b) => 
    Math.abs(b.deltaWeight) - Math.abs(a.deltaWeight)
  );
}
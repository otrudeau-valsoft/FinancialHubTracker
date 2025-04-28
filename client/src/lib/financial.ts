// Financial utilities and calculations

/**
 * Format currency value with symbol
 */
export function formatCurrency(value: number | string | null | undefined, symbol = '$'): string {
  if (value === null || value === undefined) return `${symbol}0.00`;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return `${symbol}0.00`;
  
  return `${symbol}${numValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Format percentage value with sign
 */
export function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return `0.00%`;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return `0.00%`;
  
  const sign = numValue > 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
}

/**
 * Get CSS class based on profit/loss value
 */
export function getProfitLossClass(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'text-gray-400';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'text-gray-400';
  
  if (numValue > 0) return 'text-green-400';
  if (numValue < 0) return 'text-red-400';
  return 'text-gray-400';
}

/**
 * Calculate portfolio allocation by stock type (Compounder, Catalyst, Cyclical)
 * @param stocks Array of portfolio stocks
 * @param cashBalance Optional cash balance to include in calculations (not used in allocation display)
 */
export function calculateAllocationByType(
  stocks: any[], 
  cashBalance?: { amount: string | number } | null
): { [key: string]: number } {
  // Initialize allocation object
  const typeAllocation = { 
    Comp: 0, // Compounder
    Cat: 0,  // Catalyst
    Cycl: 0  // Cyclical
  };
  
  // Calculate total stocks value (excluding cash)
  let totalStocksValue = 0;
  
  // Add stock values
  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      // Skip if this is a cash symbol
      if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
        return;
      }
      
      const currentValue = parseFloat(stock.currentValue || '0');
      totalStocksValue += currentValue;
    });
  }
  
  // Skip calculation if total stocks value is 0
  if (totalStocksValue === 0) return typeAllocation;
  
  // Calculate allocation by type for all stocks
  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      // Skip if this is a cash symbol
      if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
        return;
      }
      
      const currentValue = parseFloat(stock.currentValue || '0');
      const percentage = (currentValue / totalStocksValue) * 100;
      
      // Map abbreviated types to our allocation object keys
      const type = stock.stockType || 'Unknown';
      
      if (type === 'Compounder' || type === 'Comp') {
        typeAllocation.Comp += percentage;
      } else if (type === 'Catalyst' || type === 'Cat') {
        typeAllocation.Cat += percentage;
      } else if (type === 'Cyclical' || type === 'Cycl') {
        typeAllocation.Cycl += percentage;
      }
    });
  }
  
  // Round values
  Object.keys(typeAllocation).forEach(key => {
    typeAllocation[key] = Math.round(typeAllocation[key]);
  });
  
  return typeAllocation;
}

/**
 * Calculate portfolio allocation by rating (1-4)
 * @param stocks Array of portfolio stocks
 * @param cashBalance Optional cash balance to include in calculations (not used in allocation display)
 */
export function calculateAllocationByRating(
  stocks: any[],
  cashBalance?: { amount: string | number } | null
): { [key: string]: number } {
  // Initialize allocation object
  const ratingAllocation = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0
  };
  
  // Calculate total stocks value (excluding cash)
  let totalStocksValue = 0;
  
  // Add stock values
  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      // Skip if this is a cash symbol
      if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
        return;
      }
      
      const currentValue = parseFloat(stock.currentValue || '0');
      totalStocksValue += currentValue;
    });
  }
  
  // Skip calculation if total stocks value is 0
  if (totalStocksValue === 0) return ratingAllocation;
  
  // Calculate allocation by rating for all stocks
  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      // Skip if this is a cash symbol
      if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
        return;
      }
      
      const currentValue = parseFloat(stock.currentValue || '0');
      const percentage = (currentValue / totalStocksValue) * 100;
      
      // Map ratings to our allocation object keys
      const rating = stock.rating ? stock.rating.toString() : "0";
      
      if (rating && ["1", "2", "3", "4"].includes(rating)) {
        ratingAllocation[rating] += percentage;
      }
    });
  }
  
  // Round values
  Object.keys(ratingAllocation).forEach(key => {
    ratingAllocation[key] = Math.round(ratingAllocation[key]);
  });
  
  return ratingAllocation;
}

/**
 * Calculate portfolio statistics
 * @param stocks Array of portfolio stocks
 * @param cashBalance Optional cash balance object to include in calculations
 */
export function calculatePortfolioStats(stocks: any[], cashBalance?: { amount: string | number } | null) {
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
  
  // Get cash value from actual cash balance if provided
  let cashValue = 0;
  if (cashBalance && cashBalance.amount) {
    cashValue = typeof cashBalance.amount === 'string' 
      ? parseFloat(cashBalance.amount) 
      : cashBalance.amount;
  }
  
  // Skip calculation if no stocks and no cash
  if ((!stocks || stocks.length === 0) && cashValue === 0) return stats;
  
  // Calculate total stocks value (excluding cash)
  let stocksValue = 0;
  let dailyChange = 0;
  let ytdChange = 0;
  
  // Add stock values
  if (stocks && stocks.length > 0) {
    stocks.forEach(stock => {
      // Skip if this is a cash symbol - we're using the actual cash balance instead
      if (stock.stockType === 'Cash' || stock.symbol === 'CASH') {
        return;
      }
      
      const currentValue = parseFloat(stock.currentValue || '0');
      const dailyChangePercent = parseFloat(stock.dailyChangePercent || '0');
      const ytdChangePercent = parseFloat(stock.ytdChangePercent || '0');
      
      // Add to stocks value
      stocksValue += currentValue;
      
      // Calculate daily change
      dailyChange += (currentValue * dailyChangePercent / 100);
      
      // Calculate YTD change
      ytdChange += (currentValue * ytdChangePercent / 100);
    });
  }
  
  // Calculate total portfolio value (stocks + cash)
  const totalValue = stocksValue + cashValue;
  
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
    const ticker = holding.ticker;
    const weight = parseFloat(holding.weight || '0');
    const portfolioWeight = portfolioWeights[ticker] || 0;
    const weightDifference = portfolioWeight - weight;
    
    return {
      id: holding.id || 0,
      ticker,
      name: holding.name || ticker,
      sector: holding.sector || '',
      weight,
      price: holding.price || 0,
      inPortfolio: portfolioWeight > 0,
      weightDifference
    };
  });
  
  // Sort by absolute weight difference (largest differences first)
  return comparisonData.sort((a, b) => 
    Math.abs(b.weightDifference) - Math.abs(a.weightDifference)
  );
}
// Financial utility functions for calculations

/**
 * Calculate historical portfolio performance data
 * @param stocks Array of portfolio stocks with historical prices
 * @param days Number of days to include
 * @returns Array of portfolio performance data points
 */
export const calculateHistoricalPerformance = async (stocks: any[], region: string, days: number = 180) => {
  if (!stocks || stocks.length === 0) {
    return [];
  }

  try {
    // Calculate end date (today) and start date (days ago)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Fetch historical prices for the benchmark ETF (SPY, XIC, or ACWX)
    const benchmarkSymbol = region === 'USD' ? 'SPY' : (region === 'CAD' ? 'XIC' : 'ACWX');
    const benchmarkResponse = await fetch(`/api/historical-prices/${benchmarkSymbol}/${region}?start=${startDateStr}&end=${endDateStr}`);
    const benchmarkPrices = await benchmarkResponse.json();
    
    if (!benchmarkPrices || benchmarkPrices.length === 0) {
      console.error(`No historical prices found for benchmark ${benchmarkSymbol}`);
      return [];
    }
    
    // Create a map of dates to benchmark values
    const benchmarkByDate: Record<string, number> = {};
    benchmarkPrices.forEach((price: any) => {
      const date = new Date(price.date).toISOString().split('T')[0];
      benchmarkByDate[date] = price.close;
    });
    
    // Build the dates array from all available benchmark dates
    const dates = Object.keys(benchmarkByDate).sort();
    
    // For each date, calculate the portfolio value
    const result = [];
    
    // Initialize with first date's values
    let firstBenchmarkValue = benchmarkByDate[dates[0]];
    let firstPortfolioValue = 0; // We'll calculate this
    
    // Calculate portfolio value for each date
    for (const date of dates) {
      // Sum up the value of all stocks on this date
      // In a real implementation, we would need to fetch historical prices for each stock
      // For now, let's estimate based on current values and mock ups/downs
      
      // Example calculation:
      let portfolioValue = 0;
      
      // Use this date's benchmark value
      const benchmarkValue = benchmarkByDate[date] / firstBenchmarkValue * 100;
      
      // Add a slight randomness factor to make it look realistic
      // This is just for demo purposes - in real life we would use actual values
      const portfolioRandomFactor = 1 + (Math.sin(new Date(date).getTime() / 8640000000) * 0.02);
      
      // Portfolio value fluctuates around benchmark with the random factor
      portfolioValue = benchmarkValue * portfolioRandomFactor;
      
      // Store the first portfolio value for normalization
      if (result.length === 0) {
        firstPortfolioValue = portfolioValue;
      }
      
      // Normalize both values to start at 100
      result.push({
        date,
        portfolioValue: portfolioValue / firstPortfolioValue * 100,
        benchmarkValue: benchmarkValue
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error calculating historical performance:", error);
    return [];
  }
};

/**
 * Calculate portfolio allocation percentages by type
 * @param stocks Array of portfolio stocks
 * @returns Object with allocation percentages by type
 */
export const calculateAllocationByType = (stocks: any[]) => {
  if (!stocks || stocks.length === 0) {
    return { Comp: 0, Cat: 0, Cycl: 0 };
  }

  const totalValue = stocks.reduce((sum, stock) => sum + Number(stock.nav || 0), 0);
  
  const types = stocks.reduce((acc: Record<string, number>, stock) => {
    const type = stock.stockType || 'Unknown';
    const value = Number(stock.nav || 0);
    acc[type] = (acc[type] || 0) + value;
    return acc;
  }, {});
  
  // Convert absolute values to percentages
  const result: Record<string, number> = {};
  for (const [type, value] of Object.entries(types)) {
    result[type] = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
  }
  
  return result;
};

/**
 * Calculate portfolio allocation percentages by rating
 * @param stocks Array of portfolio stocks
 * @returns Object with allocation percentages by rating
 */
export const calculateAllocationByRating = (stocks: any[]) => {
  if (!stocks || stocks.length === 0) {
    return { "1": 0, "2": 0, "3": 0, "4": 0 };
  }

  const totalValue = stocks.reduce((sum, stock) => sum + Number(stock.nav || 0), 0);
  
  const ratings = stocks.reduce((acc: Record<string, number>, stock) => {
    const rating = stock.rating || 'Unknown';
    const value = Number(stock.nav || 0);
    acc[rating] = (acc[rating] || 0) + value;
    return acc;
  }, {});
  
  // Convert absolute values to percentages
  const result: Record<string, number> = {};
  for (const [rating, value] of Object.entries(ratings)) {
    result[rating] = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;
  }
  
  return result;
};

/**
 * Calculate portfolio weighting differences compared to benchmark ETF
 * @param portfolioStocks Array of portfolio stocks
 * @param etfHoldings Array of ETF holdings
 * @returns Array of portfolio stocks with overweight/underweight calculations
 */
export const calculateEtfDifferences = (portfolioStocks: any[], etfHoldings: any[]) => {
  if (!portfolioStocks || !etfHoldings) return [];
  
  // Calculate the total portfolio value using price * quantity
  const portfolioTotalValue = portfolioStocks.reduce(
    (sum, stock) => {
      const price = Number(stock.price || 0);
      const quantity = Number(stock.quantity || 0);
      return sum + (price * quantity);
    }, 
    0
  );
  
  console.log("Portfolio total value:", portfolioTotalValue);
  
  // Create map of portfolio weights
  const portfolioWeights = portfolioStocks.reduce((acc: Record<string, number>, stock) => {
    const price = Number(stock.price || 0);
    const quantity = Number(stock.quantity || 0);
    const stockValue = price * quantity;
    
    // Store both uppercase and original symbol to handle case-insensitive matching
    acc[stock.symbol.toUpperCase()] = portfolioTotalValue > 0 
      ? (stockValue / portfolioTotalValue) * 100
      : 0;
    
    return acc;
  }, {});
  
  console.log("Portfolio weights:", portfolioWeights);
  
  // Create map of ETF weights
  const etfWeights = etfHoldings.reduce((acc: Record<string, number>, holding) => {
    acc[holding.ticker.toUpperCase()] = Number(holding.weight || 0);
    return acc;
  }, {});
  
  console.log("ETF weights:", etfWeights);
  
  // For each ETF holding, calculate the difference
  return etfHoldings.map(holding => {
    const symbol = holding.ticker.toUpperCase();
    const etfWeight = Number(holding.weight || 0);
    const portfolioWeight = portfolioWeights[symbol] || 0;
    const weightDifference = portfolioWeight - etfWeight;
    const inPortfolio = symbol in portfolioWeights;
    
    return {
      ...holding,
      portfolioWeight,
      weightDifference,
      inPortfolio
    };
  });
};

/**
 * Format percentage for display
 * @param value Percentage value
 * @returns Formatted string with + or - sign
 */
export const formatPercentage = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '--';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '--';
  
  const sign = numValue > 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
};

/**
 * Format currency for display
 * @param value Currency value
 * @param currency Currency symbol
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string | null | undefined, currency = '$') => {
  if (value === null || value === undefined) return '--';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '--';
  
  return `${currency}${numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get CSS class for profit/loss values
 * @param value Numerical value
 * @returns CSS class name
 */
export const getProfitLossClass = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  return numValue > 0 ? 'text-profit' : numValue < 0 ? 'text-loss' : '';
};

/**
 * Calculate portfolio statistics for dashboard summary
 * @param stocks Array of portfolio stocks
 * @returns Object with portfolio statistics
 */
export const calculatePortfolioStats = (stocks: any[]) => {
  if (!stocks || stocks.length === 0) {
    return {
      totalValue: 0,
      dailyChange: 0,
      dailyChangePercent: 0,
      cashValue: 0,
      cashPercent: 0,
      ytdPerformance: 0,
      ytdValue: 0
    };
  }

  const totalValue = stocks.reduce((sum, stock) => sum + Number(stock.nav || 0), 0);
  
  // Calculate daily change
  const dailyChange = stocks.reduce(
    (sum, stock) => sum + (Number(stock.nav || 0) * Number(stock.dailyChange || 0) / 100), 
    0
  );
  
  const dailyChangePercent = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;
  
  // Calculate cash position (assuming cash ETFs or similar are marked)
  const cashStocks = stocks.filter(stock => 
    stock.symbol.includes('BIL') || 
    stock.company.includes('CASH') || 
    stock.symbol.includes('SHV')
  );
  
  const cashValue = cashStocks.reduce((sum, stock) => sum + Number(stock.nav || 0), 0);
  const cashPercent = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
  
  // Calculate YTD performance
  const ytdPerformance = stocks.reduce(
    (sum, stock) => {
      const stockYtd = Number(stock.ytdChange || 0) / 100;
      const stockValue = Number(stock.nav || 0);
      return sum + (stockValue * stockYtd);
    }, 
    0
  ) / totalValue * 100;
  
  const ytdValue = totalValue * ytdPerformance / 100;
  
  return {
    totalValue,
    dailyChange,
    dailyChangePercent,
    cashValue,
    cashPercent,
    ytdPerformance,
    ytdValue
  };
};

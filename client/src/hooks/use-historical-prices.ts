import { useQuery } from '@tanstack/react-query';

export interface HistoricalPrice {
  id: number;
  symbol: string;
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  adjustedClose: string;
  volume: string;
  region: string;
  rsi9?: string;
  rsi14?: string;
  rsi21?: string;
  macd?: string;
  signal?: string;
  histogram?: string;
}

/**
 * Custom hook to fetch historical price data for a stock
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 * @returns Query object with historical price data
 */
export const useHistoricalPrices = (symbol: string, region: string) => {
  return useQuery<HistoricalPrice[]>({
    queryKey: ['historicalPrices', symbol, region],
    queryFn: async () => {
      try {
        // Try the main path first
        const response = await fetch(`/api/historical-prices/${symbol}/${region}`);
        
        if (!response.ok) {
          throw new Error('Failed with main path');
        }
        
        const data = await response.json();
        
        // Add debugging to see if RSI data is present in the response
        if (data && data.length > 0) {
          const latestEntry = data[data.length - 1];
          console.log(`Latest historical price entry for ${symbol} (${region}):`, {
            date: latestEntry.date,
            rsi9: latestEntry.rsi9,
            rsi14: latestEntry.rsi14,
            rsi21: latestEntry.rsi21
          });
        }
        
        return data;
      } catch (error) {
        console.log('Trying alternative historical prices path...');
        // Try alternative path if the first one fails
        try {
          const response = await fetch(`/api/portfolios/${region}/stocks/${symbol}/historical`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch historical price data');
          }
          
          return response.json();
        } catch (secondError) {
          console.error('Both historical price paths failed:', secondError);
          throw secondError;
        }
      }
    },
    enabled: !!symbol && !!region, // Only fetch when both symbol and region are available
    staleTime: 60000, // Reduce stale time to 1 minute to refresh more often
    refetchOnWindowFocus: true // Refetch when window gains focus
  });
};

/**
 * Process historical price data based on the selected time range
 * Adds formatted date and extracts numeric values, including RSI
 */
export const processHistoricalData = (
  data: HistoricalPrice[] | null | undefined, 
  timeRange: '1m' | '3m' | '6m' | '1y' | '5y'
) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  try {
    // Create a safe copy of the data
    const safeData = data.filter(item => item && typeof item === 'object' && item.date);
    
    // Sort by date in ascending order
    const sortedData = [...safeData].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Determine how many days to include based on time range
    let daysToInclude = 90; // default to 3m
    switch (timeRange) {
      case '1m':
        daysToInclude = 30;
        break;
      case '3m':
        daysToInclude = 90;
        break;
      case '6m':
        daysToInclude = 180;
        break;
      case '1y':
        daysToInclude = 365;
        break;
      case '5y':
        daysToInclude = 1826; // ~5 years
        break;
    }
    
    // Get the last N days of data
    const filteredData = sortedData.slice(-Math.min(daysToInclude, sortedData.length));
    
    // Format dates for display with null safety
    return filteredData.map(p => {
      try {
        const date = p.date ? new Date(p.date) : new Date();
        // Format the date more cleanly (e.g., "Mar 2023")
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
        
        return {
          date: date.toLocaleDateString(),
          formattedDate,
          close: p.adjustedClose ? parseFloat(p.adjustedClose) : (p.close ? parseFloat(p.close) : 0),
          open: p.open ? parseFloat(p.open) : 0,
          high: p.high ? parseFloat(p.high) : 0,
          low: p.low ? parseFloat(p.low) : 0,
          rsi9: p.rsi9 ? parseFloat(p.rsi9) : undefined,
          rsi14: p.rsi14 ? parseFloat(p.rsi14) : undefined,
          rsi21: p.rsi21 ? parseFloat(p.rsi21) : undefined,
          macd: p.macd ? parseFloat(p.macd) : undefined,
          signal: p.signal ? parseFloat(p.signal) : undefined,
          histogram: p.histogram ? parseFloat(p.histogram) : undefined,
          dateObj: date
        };
      } catch (error) {
        // Return a safe fallback object if anything goes wrong
        console.error("Error processing historical price data item:", error);
        const now = new Date();
        return {
          date: now.toLocaleDateString(),
          formattedDate: now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          close: 0,
          open: 0,
          high: 0,
          low: 0,
          rsi9: undefined,
          rsi14: undefined,
          rsi21: undefined,
          dateObj: now
        };
      }
    });
  } catch (error) {
    console.error("Error processing historical price data:", error);
    return [];
  }
};
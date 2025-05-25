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
  ma50?: number | null;
  ma200?: number | null;
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
 * Adds formatted date and extracts numeric values, including RSI and Moving Averages
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
    
    // Calculate moving averages for all data points
    // This needs to be done on the full dataset before filtering by time range
    const dataWithMovingAverages = sortedData.map((item, index, array) => {
      // Calculate 50-day moving average
      let ma50 = null;
      if (index >= 49) {
        const last50 = array.slice(index - 49, index + 1);
        const sum = last50.reduce((acc, curr) => acc + parseFloat(String(curr.close)), 0);
        ma50 = sum / 50;
      }

      // Calculate 200-day moving average
      let ma200 = null;
      if (index >= 199) {
        const last200 = array.slice(index - 199, index + 1);
        const sum = last200.reduce((acc, curr) => acc + parseFloat(String(curr.close)), 0);
        ma200 = sum / 200;
      }

      return {
        ...item,
        ma50,
        ma200
      };
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
        
        // Format the date consistently as "MMM YY" format (e.g., "Mar 23") for ALL charts
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear().toString().substr(2); // Get last 2 digits
        const formattedDate = `${month} ${year}`;
        
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
          // Add moving averages from the calculations we did earlier
          ma50: p.ma50 !== undefined ? p.ma50 : undefined,
          ma200: p.ma200 !== undefined ? p.ma200 : undefined,
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
          macd: undefined,
          signal: undefined,
          histogram: undefined,
          ma50: undefined,
          ma200: undefined,
          dateObj: now
        };
      }
    });
  } catch (error) {
    console.error("Error processing historical price data:", error);
    return [];
  }
};
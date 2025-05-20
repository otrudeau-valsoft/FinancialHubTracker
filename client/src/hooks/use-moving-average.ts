import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface MovingAverageDataPoint {
  id: number;
  symbol: string;
  date: string;
  ma50: string;
  ma200: string;
  region: string;
  historicalPriceId: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Hook to fetch Moving Average data for a specific symbol and region
 * 
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 * @param limit Maximum number of data points to fetch (default: 200)
 * @param options Additional query options
 */
export function useMovingAverageData(
  symbol: string,
  region: string,
  limit: number = 200,
  options: {
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [`/api/moving-average/${symbol}/${region}`, { limit }],
    queryFn: async () => {
      const response = await axios.get(`/api/moving-average/${symbol}/${region}`, {
        params: { limit }
      });
      
      // Check if we have valid data in the response
      if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
        return response.data.data as MovingAverageDataPoint[];
      }
      
      return [];
    },
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

/**
 * Function to trigger calculation of Moving Average data
 * 
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 * @returns Promise with the calculation results
 */
export async function calculateMovingAverageData(symbol: string, region: string) {
  try {
    const response = await axios.post(`/api/moving-average/calculate/${symbol}/${region}`);
    return response.data;
  } catch (error) {
    console.error('Error calculating Moving Average data:', error);
    throw error;
  }
}

/**
 * Function to trigger calculation of Moving Average data for all stocks in a portfolio
 * 
 * @param region Portfolio region (USD, CAD, INTL)
 * @returns Promise with the calculation results
 */
export async function calculatePortfolioMovingAverages(region: string) {
  try {
    const response = await axios.post(`/api/moving-average/calculate-portfolio/${region}`);
    return response.data;
  } catch (error) {
    console.error('Error calculating portfolio Moving Average data:', error);
    throw error;
  }
}
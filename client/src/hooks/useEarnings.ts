import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export interface EarningsQuarterly {
  id?: number;
  ticker: string;
  fiscal_year: number;
  fiscal_q: number;
  eps_actual: number | null;
  eps_estimate: number | null;
  rev_actual: number | null;
  rev_estimate: number | null;
  guidance: string | null;
  mkt_reaction: number | null;
  score: number | null;
  note: string | null;
  current_price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UseEarningsOptions {
  tickers?: string[];
  enabled?: boolean;
}

export interface HeatmapQuarterData {
  fiscal_year: number;
  fiscal_q: number;
  label: string;
  eps: {
    Beat: number;
    'In-Line': number;
    Miss: number;
  };
  revenue: {
    Up: number;
    Flat: number;
    Down: number;
  };
  guidance: {
    Increased: number;
    Maintain: number;
    Decreased: number;
  };
  score: {
    Good: number;
    Okay: number;
    Bad: number;
  };
  count: number;
}

/**
 * Hook to fetch earnings data for specified tickers
 */
export function useEarnings(options: UseEarningsOptions = {}) {
  const { tickers = [], enabled = true } = options;

  const queryKey = ['earnings', tickers.join(',')];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!tickers.length) return { data: [] };

      const tickersParam = tickers.join(',');
      const response = await fetch(`/api/earnings?tickers=${tickersParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      return response.json();
    },
    select: (data) => {
      // Process the data if needed
      return data.data || [];
    },
    enabled: enabled && tickers.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch earnings data for all portfolio stocks
 */
export function usePortfolioEarnings(region: string = 'USD') {
  return useQuery({
    queryKey: ['earnings', 'portfolio', region],
    queryFn: async () => {
      // First fetch portfolio symbols for the region
      const symbolsResponse = await fetch(`/api/portfolios/${region}/stocks`);
      
      if (!symbolsResponse.ok) {
        throw new Error(`Failed to fetch portfolio symbols for ${region}`);
      }
      
      const symbols = await symbolsResponse.json();
      
      if (!symbols || !symbols.length) {
        return { data: [] };
      }
      
      // Now fetch earnings data for these symbols
      const tickers = symbols.map((s: any) => s.symbol).join(',');
      const earningsResponse = await fetch(`/api/earnings?tickers=${tickers}`);
      
      if (!earningsResponse.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      return earningsResponse.json();
    },
    select: (data) => {
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch heatmap data for earnings quarters
 */
export function useEarningsHeatmap() {
  return useQuery({
    queryKey: ['earnings', 'heatmap'],
    queryFn: async () => {
      const response = await fetch('/api/heatmap');
      
      if (!response.ok) {
        throw new Error('Failed to fetch heatmap data');
      }
      
      return response.json();
    },
    select: (data): HeatmapQuarterData[] => {
      return data.data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Utility to convert fiscal quarter data to a readable string
 */
export function formatQuarter(fiscal_year: number, fiscal_q: number): string {
  return `Q${fiscal_q} ${fiscal_year}`;
}

/**
 * Trigger an earnings data update
 */
export async function updateEarningsData() {
  try {
    const response = await fetch('/api/admin/update-earnings', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to update earnings data');
    }
    
    const result = await response.json();
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['earnings'] });
    queryClient.invalidateQueries({ queryKey: ['data-updates'] });
    
    return result;
  } catch (error) {
    console.error('Error updating earnings data:', error);
    throw error;
  }
}
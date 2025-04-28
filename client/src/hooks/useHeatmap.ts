import { useEarningsHeatmap } from './useEarnings';

export interface HeatmapCategory {
  label: string;
  value: number;
  total: number;
  percentage: number;
  color: string;
}

export interface HeatmapQuarter {
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
 * Convert heatmap data to a format for visualization
 */
export function useFormattedHeatmap() {
  const { data: heatmapData, isLoading, error } = useEarningsHeatmap();

  // Format the data for visualization
  const formattedData = heatmapData?.map((quarter: HeatmapQuarter) => {
    // EPS Beat/Miss percentages
    const epsCategories: HeatmapCategory[] = [
      {
        label: 'Beat',
        value: quarter.eps.Beat,
        total: quarter.count,
        percentage: (quarter.eps.Beat / quarter.count) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'In-Line',
        value: quarter.eps['In-Line'],
        total: quarter.count,
        percentage: (quarter.eps['In-Line'] / quarter.count) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Miss',
        value: quarter.eps.Miss,
        total: quarter.count,
        percentage: (quarter.eps.Miss / quarter.count) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Revenue Growth percentages
    const revenueCategories: HeatmapCategory[] = [
      {
        label: 'Up',
        value: quarter.revenue.Up,
        total: quarter.count,
        percentage: (quarter.revenue.Up / quarter.count) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Flat',
        value: quarter.revenue.Flat,
        total: quarter.count,
        percentage: (quarter.revenue.Flat / quarter.count) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Down',
        value: quarter.revenue.Down,
        total: quarter.count,
        percentage: (quarter.revenue.Down / quarter.count) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Guidance percentages
    const guidanceCategories: HeatmapCategory[] = [
      {
        label: 'Increased',
        value: quarter.guidance.Increased,
        total: quarter.count,
        percentage: (quarter.guidance.Increased / quarter.count) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Maintain',
        value: quarter.guidance.Maintain,
        total: quarter.count,
        percentage: (quarter.guidance.Maintain / quarter.count) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Decreased',
        value: quarter.guidance.Decreased,
        total: quarter.count,
        percentage: (quarter.guidance.Decreased / quarter.count) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Score percentages
    const scoreCategories: HeatmapCategory[] = [
      {
        label: 'Good',
        value: quarter.score.Good,
        total: quarter.count,
        percentage: (quarter.score.Good / quarter.count) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Okay',
        value: quarter.score.Okay,
        total: quarter.count,
        percentage: (quarter.score.Okay / quarter.count) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Bad',
        value: quarter.score.Bad,
        total: quarter.count,
        percentage: (quarter.score.Bad / quarter.count) * 100,
        color: '#ef4444' // Red
      }
    ];

    return {
      ...quarter,
      eps_formatted: epsCategories,
      revenue_formatted: revenueCategories,
      guidance_formatted: guidanceCategories,
      score_formatted: scoreCategories
    };
  }) || [];

  return {
    data: formattedData,
    isLoading,
    error
  };
}

/**
 * Get the appropriate background color for a cell based on its value
 */
export function getHeatmapCellColor(value: number, total: number): string {
  if (total === 0) return 'bg-gray-200';
  
  const percentage = (value / total) * 100;
  
  // Green to yellow to red gradient
  if (percentage >= 70) return 'bg-green-500 text-white';
  if (percentage >= 50) return 'bg-green-300';
  if (percentage >= 40) return 'bg-yellow-300';
  if (percentage >= 30) return 'bg-yellow-400';
  if (percentage >= 20) return 'bg-orange-300';
  if (percentage >= 10) return 'bg-orange-400';
  return 'bg-red-400 text-white';
}
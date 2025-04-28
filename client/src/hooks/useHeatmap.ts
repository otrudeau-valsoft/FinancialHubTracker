import { useEarningsHeatmap, HeatmapQuarterData, formatQuarter } from './useEarnings';

export interface HeatmapCategory {
  label: string;
  value: number;
  total: number;
  percentage: number;
  color: string;
}

export interface FormattedHeatmapQuarter extends HeatmapQuarterData {
  eps_formatted: HeatmapCategory[];
  revenue_formatted: HeatmapCategory[];
  guidance_formatted: HeatmapCategory[];
  score_formatted: HeatmapCategory[];
}

/**
 * Convert heatmap data to a format for visualization
 */
export function useFormattedHeatmap() {
  const { data: heatmapData, isLoading, error } = useEarningsHeatmap();

  // Format the data for visualization
  const formattedData = heatmapData?.map((quarter: HeatmapQuarterData) => {
    const quarterCount = quarter.count || 1; // Avoid division by zero
    
    // EPS Beat/Miss percentages
    const epsCategories: HeatmapCategory[] = [
      {
        label: 'Beat',
        value: quarter.eps.Beat,
        total: quarterCount,
        percentage: (quarter.eps.Beat / quarterCount) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'In-Line',
        value: quarter.eps['In-Line'],
        total: quarterCount,
        percentage: (quarter.eps['In-Line'] / quarterCount) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Miss',
        value: quarter.eps.Miss,
        total: quarterCount,
        percentage: (quarter.eps.Miss / quarterCount) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Revenue Growth percentages
    const revenueCategories: HeatmapCategory[] = [
      {
        label: 'Up',
        value: quarter.revenue.Up,
        total: quarterCount,
        percentage: (quarter.revenue.Up / quarterCount) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Flat',
        value: quarter.revenue.Flat,
        total: quarterCount,
        percentage: (quarter.revenue.Flat / quarterCount) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Down',
        value: quarter.revenue.Down,
        total: quarterCount,
        percentage: (quarter.revenue.Down / quarterCount) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Guidance percentages
    const guidanceCategories: HeatmapCategory[] = [
      {
        label: 'Increased',
        value: quarter.guidance.Increased,
        total: quarterCount,
        percentage: (quarter.guidance.Increased / quarterCount) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Maintain',
        value: quarter.guidance.Maintain,
        total: quarterCount,
        percentage: (quarter.guidance.Maintain / quarterCount) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Decreased',
        value: quarter.guidance.Decreased,
        total: quarterCount,
        percentage: (quarter.guidance.Decreased / quarterCount) * 100,
        color: '#ef4444' // Red
      }
    ];

    // Score percentages
    const scoreCategories: HeatmapCategory[] = [
      {
        label: 'Good',
        value: quarter.score.Good,
        total: quarterCount,
        percentage: (quarter.score.Good / quarterCount) * 100,
        color: '#22c55e' // Green
      },
      {
        label: 'Okay',
        value: quarter.score.Okay,
        total: quarterCount,
        percentage: (quarter.score.Okay / quarterCount) * 100,
        color: '#f59e0b' // Yellow
      },
      {
        label: 'Bad',
        value: quarter.score.Bad,
        total: quarterCount,
        percentage: (quarter.score.Bad / quarterCount) * 100,
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
 * Get available quarters from heatmap data
 */
export function useAvailableQuarters() {
  const { data: heatmapData, isLoading } = useEarningsHeatmap();
  
  if (isLoading || !heatmapData) {
    return { quarters: [], isLoading };
  }
  
  const quarters = heatmapData.map((q) => ({
    quarter: q.label,
    year: q.fiscal_year,
    quarterNum: q.fiscal_q
  }));
  
  return { quarters, isLoading };
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
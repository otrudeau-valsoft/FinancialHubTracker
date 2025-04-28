import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercentage, getProfitLossClass } from '@/lib/financial';

interface PortfolioYtdPanelProps {
  region: 'USD' | 'CAD' | 'INTL';
  benchmark: string;
}

export function PortfolioYtdPanel({ region, benchmark }: PortfolioYtdPanelProps) {
  const [ytdPerformance, setYtdPerformance] = useState(0);
  const [ytdValue, setYtdValue] = useState(0);
  const [benchmarkPerformance, setBenchmarkPerformance] = useState(0);
  
  // Set currency symbol based on region
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  // Get all necessary data
  const { data: portfolioHoldings, isLoading: holdingsLoading } = useQuery({
    queryKey: [`/api/holdings/${region}`],
    staleTime: 60000, // 1 minute
  });
  
  const { data: benchmarkData, isLoading: benchmarkLoading } = useQuery({
    queryKey: [`/api/market-indices/${benchmark}`],
    staleTime: 60000, // 1 minute
  });
  
  // Calculate YTD performance metrics when data is available
  useEffect(() => {
    if (portfolioHoldings && Array.isArray(portfolioHoldings)) {
      // Calculate total value and YTD change
      let totalValue = 0;
      let weightedYtdChange = 0;
      
      // Sum up the total value and calculate weighted YTD changes
      portfolioHoldings.forEach(holding => {
        const nav = parseFloat(holding.netAssetValue || '0');
        totalValue += nav;
        
        const ytdChange = parseFloat(holding.ytdChangePercent || '0');
        weightedYtdChange += (nav * ytdChange / 100);
      });
      
      // Calculate YTD performance percentage
      const ytdPerformancePercent = totalValue > 0 ? (weightedYtdChange / totalValue) * 100 : 0;
      
      // Get benchmark YTD performance
      let benchmarkYtd = 0;
      if (benchmarkData && Array.isArray(benchmarkData) && benchmarkData.length > 0) {
        benchmarkYtd = parseFloat(benchmarkData[0].ytdChangePercent || '0');
      }
      
      // Update state
      setYtdPerformance(ytdPerformancePercent);
      setYtdValue(weightedYtdChange);
      setBenchmarkPerformance(benchmarkYtd);
    }
  }, [portfolioHoldings, benchmarkData]);
  
  // Loading state
  if (holdingsLoading || benchmarkLoading) {
    return (
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">YTD</h3>
            <div className="h-1 w-8 bg-[#2196F3]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1.5">
          <div className="animate-pulse">
            <div className="h-6 bg-[#1A304A] rounded w-24 mb-2"></div>
            <div className="h-4 bg-[#1A304A] rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">YTD</h3>
          <div className="h-1 w-8 bg-[#2196F3]"></div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className={`text-lg sm:text-xl font-semibold mono ${getProfitLossClass(ytdPerformance)}`}>
            {formatPercentage(ytdPerformance)}
          </span>
          <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-400">
            {formatCurrency(ytdValue, currencySymbol)}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
          <span>{benchmark}:</span> 
          <span className={`mono font-medium ${getProfitLossClass(benchmarkPerformance)}`}>
            {formatPercentage(benchmarkPerformance)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
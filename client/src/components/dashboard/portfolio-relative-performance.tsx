import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercentage, getProfitLossClass } from '@/lib/financial';

interface RelativePerformanceData {
  timeFrame: string;
  portfolioPerformance: number;
  benchmarkPerformance: number;
  difference: number;
}

interface PortfolioRelativePerformanceProps {
  region: 'USD' | 'CAD' | 'INTL';
  benchmark: string;
}

export function PortfolioRelativePerformance({ region, benchmark }: PortfolioRelativePerformanceProps) {
  const [performanceData, setPerformanceData] = useState<RelativePerformanceData[]>([]);
  
  // Get all necessary data
  const { data: portfolioHoldings, isLoading: holdingsLoading } = useQuery({
    queryKey: [`/api/holdings/${region}`],
    staleTime: 60000, // 1 minute
  });
  
  const { data: benchmarkData, isLoading: benchmarkLoading } = useQuery({
    queryKey: [`/api/market-indices/${benchmark}`],
    staleTime: 60000, // 1 minute
  });
  
  // Calculate performance metrics when data is available
  useEffect(() => {
    if (portfolioHoldings && Array.isArray(portfolioHoldings) && 
        benchmarkData && Array.isArray(benchmarkData) && benchmarkData.length > 0) {
      const benchmarkInfo = benchmarkData[0];
      
      // Calculate total portfolio value
      const totalValue = portfolioHoldings.reduce((sum, holding) => {
        return sum + parseFloat(holding.netAssetValue || '0');
      }, 0);
      
      // Calculate weighted performance metrics for various timeframes
      const metrics = [
        { timeFrame: 'Daily', portfolioKey: 'dailyChangePercent', benchmarkKey: 'dailyChangePercent' },
        { timeFrame: 'MTD', portfolioKey: 'mtdChangePercent', benchmarkKey: 'mtdChangePercent' },
        { timeFrame: 'YTD', portfolioKey: 'ytdChangePercent', benchmarkKey: 'ytdChangePercent' },
        { timeFrame: '6M', portfolioKey: 'sixMonthChangePercent', benchmarkKey: 'sixMonthChangePercent' },
        { timeFrame: '52W', portfolioKey: 'fiftyTwoWeekChangePercent', benchmarkKey: 'fiftyTwoWeekChangePercent' }
      ];
      
      const performanceMetrics = metrics.map(metric => {
        // Calculate weighted portfolio performance
        let portfolioPerformance = 0;
        portfolioHoldings.forEach(holding => {
          const nav = parseFloat(holding.netAssetValue || '0');
          const performanceValue = parseFloat(holding[metric.portfolioKey as keyof typeof holding]?.toString() || '0');
          portfolioPerformance += totalValue > 0 ? (nav / totalValue) * performanceValue : 0;
        });
        
        // Get benchmark performance
        const benchmarkPerformance = parseFloat(benchmarkInfo[metric.benchmarkKey as keyof typeof benchmarkInfo]?.toString() || '0');
        
        // Calculate difference
        const difference = portfolioPerformance - benchmarkPerformance;
        
        return {
          timeFrame: metric.timeFrame,
          portfolioPerformance,
          benchmarkPerformance,
          difference
        };
      });
      
      setPerformanceData(performanceMetrics);
    }
  }, [portfolioHoldings, benchmarkData]);
  
  // Loading state
  if (holdingsLoading || benchmarkLoading) {
    return (
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden h-full">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">RELATIVE P&L</h3>
            <div className="h-1 w-8 bg-[#FF5722]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-3">
          <div className="animate-pulse space-y-2">
            <div className="h-5 bg-[#1A304A] rounded w-full mb-2"></div>
            <div className="h-5 bg-[#1A304A] rounded w-full mb-2"></div>
            <div className="h-5 bg-[#1A304A] rounded w-full mb-2"></div>
            <div className="h-5 bg-[#1A304A] rounded w-full mb-2"></div>
            <div className="h-5 bg-[#1A304A] rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden h-full">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">RELATIVE P&L</h3>
          <div className="h-1 w-8 bg-[#FF5722]"></div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-3">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-mono text-[#7A8999]">
              <th className="pb-2">PERIOD</th>
              <th className="pb-2 text-center">PORTFOLIO</th>
              <th className="pb-2 text-center">{benchmark}</th>
              <th className="pb-2 text-right">+/- {benchmark}</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((item) => (
              <tr key={item.timeFrame} className="text-xs font-mono">
                <td className="py-1">{item.timeFrame}</td>
                <td className={`py-1 text-center ${getProfitLossClass(item.portfolioPerformance)}`}>
                  {formatPercentage(item.portfolioPerformance)}
                </td>
                <td className={`py-1 text-center ${getProfitLossClass(item.benchmarkPerformance)}`}>
                  {formatPercentage(item.benchmarkPerformance)}
                </td>
                <td className={`py-1 text-right ${getProfitLossClass(item.difference)}`}>
                  {formatPercentage(item.difference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
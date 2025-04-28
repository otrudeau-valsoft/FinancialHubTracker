import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage, getProfitLossClass } from '@/lib/financial';

interface PortfolioValuePanelProps {
  region: 'USD' | 'CAD' | 'INTL';
  benchmark: string;
}

export function PortfolioValuePanel({ region, benchmark }: PortfolioValuePanelProps) {
  const [totalValue, setTotalValue] = useState(0);
  const [dailyChangePercent, setDailyChangePercent] = useState(0);
  const [benchmarkDiff, setBenchmarkDiff] = useState(0);
  
  // Set currency symbol based on region
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  // Get all necessary data
  const { data: portfolioHoldings, isLoading: holdingsLoading } = useQuery({
    queryKey: [`/api/holdings/${region}`],
    staleTime: 60000, // 1 minute
  });
  
  const { data: cashBalance, isLoading: cashLoading } = useQuery({
    queryKey: ['/api/cash'],
    select: (data) => Array.isArray(data) ? data.find(cash => cash.region === region) : undefined,
    staleTime: 60000, // 1 minute
  });
  
  const { data: benchmarkData, isLoading: benchmarkLoading } = useQuery({
    queryKey: [`/api/market-indices/${benchmark}`],
    staleTime: 60000, // 1 minute
  });
  
  // Calculate total value and performance metrics when data is available
  useEffect(() => {
    if (portfolioHoldings && Array.isArray(portfolioHoldings)) {
      // Calculate total value
      let portfolioValue = 0;
      let dailyChange = 0;
      
      // Sum up the total value and daily changes
      portfolioHoldings.forEach(holding => {
        const nav = parseFloat(holding.netAssetValue || '0');
        portfolioValue += nav;
        
        const dailyChangePercent = parseFloat(holding.dailyChangePercent || '0');
        dailyChange += (nav * dailyChangePercent / 100);
      });
      
      // Calculate daily change percentage
      const dailyChangePercentage = portfolioValue > 0 ? (dailyChange / portfolioValue) * 100 : 0;
      
      // Calculate benchmark difference if benchmark data is available
      let benchmarkDifference = 0;
      if (benchmarkData && Array.isArray(benchmarkData) && benchmarkData.length > 0) {
        const benchmarkChangePercent = parseFloat(benchmarkData[0].dailyChangePercent || '0');
        benchmarkDifference = dailyChangePercentage - benchmarkChangePercent;
      }
      
      // Update state
      setTotalValue(portfolioValue);
      setDailyChangePercent(dailyChangePercentage);
      setBenchmarkDiff(benchmarkDifference);
    }
  }, [portfolioHoldings, benchmarkData]);
  
  // Loading state
  if (holdingsLoading || cashLoading || benchmarkLoading) {
    return (
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">VALUE</h3>
            <div className="h-1 w-8 bg-[#4CAF50]"></div>
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
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">VALUE</h3>
          <div className="h-1 w-8 bg-[#4CAF50]"></div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-lg sm:text-xl font-semibold text-[#EFEFEF] mono">
            {formatCurrency(totalValue, currencySymbol)}
          </span>
          <span className={`text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full ${dailyChangePercent >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {formatPercentage(dailyChangePercent)}
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
          <span>vs {benchmark}:</span> 
          <span className={`${getProfitLossClass(benchmarkDiff)} font-medium`}>
            {formatPercentage(benchmarkDiff)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
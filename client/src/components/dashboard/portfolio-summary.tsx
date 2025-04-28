import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Bell, DollarSign, Banknote, TrendingUp } from "lucide-react";

interface PortfolioSummaryProps {
  region: 'USD' | 'CAD' | 'INTL';
  summary: {
    value: number;
    dailyChange: number;
    dailyChangePercent: number;
    benchmarkDiff: number;
    cashPosition: number;
    cashPositionPercent: number;
    ytdPerformance: number;
    ytdPerformanceValue: number;
    benchmarkPerformance: number;
    activeAlerts: number;
    criticalAlerts: number;
  };
  benchmark: string;
  cashSymbol?: string;
  cashShares?: number;
}

export const PortfolioSummary = ({
  region,
  summary,
  benchmark,
  cashSymbol = 'BIL',
  cashShares = 0
}: PortfolioSummaryProps) => {
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
      {/* Portfolio Value Card */}
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
              {formatCurrency(summary.value, currencySymbol)}
            </span>
            <span className={`text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full ${(summary.dailyChangePercent || 0) >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {formatPercentage(summary.dailyChangePercent)}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
            <span>vs {benchmark}:</span> 
            <span className={`${getProfitLossClass(summary.benchmarkDiff)} font-medium`}>{formatPercentage(summary.benchmarkDiff)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Cash Position Card */}
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">CASH</h3>
            <div className="h-1 w-8 bg-[#FDD835]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-lg sm:text-xl font-semibold text-[#EFEFEF] mono">
              {formatCurrency(summary.cashPosition, currencySymbol)}
            </span>
            <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-400">
              {(summary.cashPositionPercent || 0).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
            <span>{cashSymbol}:</span> 
            <span className="mono font-medium">{cashShares} shares</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Performance Card */}
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">YTD</h3>
            <div className="h-1 w-8 bg-[#2196F3]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className={`text-lg sm:text-xl font-semibold mono ${getProfitLossClass(summary.ytdPerformance)}`}>
              {formatPercentage(summary.ytdPerformance)}
            </span>
            <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-400">
              {formatCurrency(summary.ytdPerformanceValue, currencySymbol)}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
            <span>{benchmark}:</span> 
            <span className={`mono font-medium ${getProfitLossClass(summary.benchmarkPerformance)}`}>
              {formatPercentage(summary.benchmarkPerformance)}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Removed the Alerts Card section */}
    </div>
  );
};

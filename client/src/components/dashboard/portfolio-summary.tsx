import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Portfolio Value Card */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-gray-400 text-xs">Portfolio Value</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold mono">{formatCurrency(summary.value, currencySymbol)}</span>
            <span className={`ml-2 text-xs mono ${getProfitLossClass(summary.dailyChangePercent)}`}>
              {formatPercentage(summary.dailyChangePercent)}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {benchmark}: <span className={`${getProfitLossClass(summary.benchmarkDiff)}`}>{formatPercentage(summary.benchmarkDiff)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Cash Position Card */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-gray-400 text-xs">Cash Position</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold mono">{formatCurrency(summary.cashPosition, currencySymbol)}</span>
            <span className="ml-2 text-xs mono text-gray-400">{summary.cashPositionPercent.toFixed(2)}% of NAV</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {cashSymbol} ETF: <span className="mono">{cashShares} shares</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Performance Card */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-gray-400 text-xs">YTD Performance</div>
          <div className="flex items-baseline">
            <span className={`text-2xl font-semibold mono ${getProfitLossClass(summary.ytdPerformance)}`}>
              {formatPercentage(summary.ytdPerformance)}
            </span>
            <span className="ml-2 text-xs mono text-gray-400">{formatCurrency(summary.ytdPerformanceValue, currencySymbol)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {benchmark} (Benchmark): <span className={`mono ${getProfitLossClass(summary.benchmarkPerformance)}`}>
              {formatPercentage(summary.benchmarkPerformance)}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Alerts Card */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-gray-400 text-xs">Active Alerts</div>
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold mono">{summary.activeAlerts}</span>
            <span className="ml-2 text-xs mono text-loss">{summary.criticalAlerts} critical</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Based on matrix rules</div>
        </CardContent>
      </Card>
    </div>
  );
};

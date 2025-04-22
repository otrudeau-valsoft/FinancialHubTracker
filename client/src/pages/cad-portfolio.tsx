import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3 } from "lucide-react";
import { 
  calculateAllocationByType, 
  calculateAllocationByRating, 
  calculatePortfolioStats,
  calculateEtfDifferences
} from "@/lib/financial";
import { parseCSV, convertPortfolioData } from "@/lib/parse-csv";
import { apiRequest } from "@/lib/queryClient";

// Sample performance data for illustration
const samplePerformanceData = Array.from({ length: 180 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (180 - i));
  
  const dateStr = date.toISOString().split('T')[0];
  
  // Create some reasonable looking performance data with different pattern for CAD
  const portfolioValue = 100 + (i * 0.04) + Math.sin(i / 12) * 2.5;
  const benchmarkValue = 100 + (i * 0.035) + Math.sin(i / 10) * 1.8;
  
  return {
    date: dateStr,
    portfolioValue,
    benchmarkValue
  };
});

export default function CadPortfolio() {
  // Fetch CAD portfolio data
  const { data: cadStocks, isLoading: cadLoading } = useQuery({
    queryKey: ['/api/portfolios/CAD/stocks'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    staleTime: 60000,
  });

  // Fetch XIC ETF holdings
  const { data: xicHoldings, isLoading: xicLoading } = useQuery({
    queryKey: ['/api/etfs/XIC/holdings/top/10'],
    staleTime: 3600000, // 1 hour
  });
  
  // Fetch current prices
  const { data: currentPrices } = useQuery({
    queryKey: ['/api/current-prices/CAD'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch update logs
  const { data: updateLogs } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 30000, // 30 seconds
  });
  
  // Calculate metrics for CAD portfolio
  const cadAllocationByType = calculateAllocationByType(cadStocks || []);
  const cadAllocationByRating = calculateAllocationByRating(cadStocks || []);
  const cadStats = calculatePortfolioStats(cadStocks || []);
  
  // Calculate ETF benchmark differences
  const xicComparisonData = xicHoldings && cadStocks 
    ? calculateEtfDifferences(cadStocks, xicHoldings) 
    : [];

  // Find cash holdings (like ZGLD ETF)
  const cashHolding = cadStocks?.find(stock => 
    stock.symbol.includes('ZGLD') || 
    stock.company.includes('CASH') || 
    stock.company.includes('GOLD')
  );

  return (
    <div className="container mx-auto p-4 bg-[#061220]">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#EFEFEF] font-mono tracking-tight">CAD PORTFOLIO</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className="h-1 w-12 bg-[#4CAF50]"></div>
            <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">CANADIAN EQUITY POSITIONS • MARKET DATA • PERFORMANCE METRICS</p>
          </div>
        </div>
      </div>
      
      {/* Floating status bubble */}
      <div className="fixed bottom-4 right-4 z-50 bg-[#0A1929] border border-[#1A304A] rounded-md shadow-lg p-2 text-[0.65rem] max-w-[220px]">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#4CAF50] rounded-full mr-1"></div>
          <span className="text-[#7A8999] font-mono">PRICES:</span>
          <span className="ml-1 text-[#EFEFEF] font-mono truncate">
            {updateLogs 
              ? updateLogs.filter(log => log.type === 'current_prices' && log.status === 'Success').length > 0
                ? new Date(updateLogs.filter(log => log.type === 'current_prices' && log.status === 'Success')[0].timestamp).toLocaleString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
                : 'Never'
              : '...'}
          </span>
        </div>
        <div className="flex items-center mt-1">
          <div className="w-2 h-2 bg-[#2196F3] rounded-full mr-1"></div>
          <span className="text-[#7A8999] font-mono">HISTORY:</span>
          <span className="ml-1 text-[#EFEFEF] font-mono truncate">
            {updateLogs 
              ? updateLogs.filter(log => log.type === 'historical_prices' && log.status === 'Success').length > 0
                ? new Date(updateLogs.filter(log => log.type === 'historical_prices' && log.status === 'Success')[0].timestamp).toLocaleString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })
                : 'Never'
              : '...'}
          </span>
        </div>
      </div>

      <div className="mb-4">
      
      {cadLoading ? (
          <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
            <div className="text-[#7A8999] font-mono">LOADING CAD PORTFOLIO DATA...</div>
          </div>
        ) : (
          <>
            <PortfolioSummary 
              region="CAD"
              summary={{
                value: cadStats.totalValue,
                dailyChange: cadStats.dailyChange,
                dailyChangePercent: cadStats.dailyChangePercent,
                benchmarkDiff: 0.35, // Vs XIC
                cashPosition: cadStats.cashValue,
                cashPositionPercent: cadStats.cashPercent,
                ytdPerformance: cadStats.ytdPerformance,
                ytdPerformanceValue: cadStats.ytdValue,
                benchmarkPerformance: 6.88, // XIC YTD
                activeAlerts: alerts?.filter(a => a.isActive && cadStocks?.find(s => s.symbol === a.symbol)).length || 0,
                criticalAlerts: alerts?.filter(a => a.isActive && a.severity === 'critical' && cadStocks?.find(s => s.symbol === a.symbol)).length || 0
              }}
              benchmark="XIC"
              cashSymbol={cashHolding?.symbol || "ZGLD"}
              cashShares={cashHolding?.quantity || 0}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <AllocationChart 
                typeAllocation={cadAllocationByType} 
                ratingAllocation={cadAllocationByRating} 
              />
              
              <PerformanceChart 
                portfolioData={samplePerformanceData}
                timeRanges={["1W", "1M", "YTD", "1Y"]}
                benchmark="XIC"
              />
              
              <AlertsList 
                alerts={alerts?.filter(a => 
                  cadStocks?.find(s => s.symbol === a.symbol) && a.isActive
                ) || []} 
              />
            </div>
            
            <PortfolioTable 
              stocks={cadStocks || []} 
              region="CAD" 
              currentPrices={currentPrices || []}
            />
            
            <div className="mt-8 mb-4"></div>
            
            {!xicLoading && xicComparisonData.length > 0 ? (
              <EtfComparison 
                holdings={xicComparisonData} 
                etfSymbol="XIC" 
                region="CAD"
              />
            ) : (
              <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
                <div className="text-[#7A8999] font-mono">LOADING ETF BENCHMARK DATA...</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

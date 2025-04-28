import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { PortfolioCashPanel } from "@/components/dashboard/portfolio-cash-panel";
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
  
  // Fetch cash balance
  const { data: cashBalances, isLoading: cashLoading } = useQuery({
    queryKey: ['/api/cash'],
    staleTime: 60000, // 1 minute
  });
  
  // Get CAD cash balance
  const cadCashBalance = Array.isArray(cashBalances) 
    ? cashBalances.find(cash => cash.region === 'CAD') 
    : undefined;
  
  // Calculate metrics for CAD portfolio
  const cadAllocationByType = calculateAllocationByType(cadStocks || [], cadCashBalance);
  const cadAllocationByRating = calculateAllocationByRating(cadStocks || [], cadCashBalance);
  const cadStats = calculatePortfolioStats(cadStocks || [], cadCashBalance);
  
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
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">CAD PORTFOLIO</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#4CAF50]"></div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#0B1728]/80 px-2.5 py-1 rounded-md border border-[#1A304A]">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full mr-1"></div>
              <span className="text-[#7A8999] font-mono">PRICES:</span>
              <span className="ml-1 text-[#EFEFEF] font-mono">
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
            <span className="text-gray-600">|</span>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-[#2196F3] rounded-full mr-1"></div>
              <span className="text-[#7A8999] font-mono">HISTORY:</span>
              <span className="ml-1 text-[#EFEFEF] font-mono">
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
        </div>
      </div>
      
      {/* Floating status bubble (mobile only) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50 bg-[#0A1929] border border-[#1A304A] rounded-md shadow-lg p-2 text-[0.65rem] max-w-[200px]">
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
                // Remove alerts from summary as they'll be shown in the Matrix Rule Alerts component
                activeAlerts: 0,
                criticalAlerts: 0
              }}
              benchmark="XIC"
              cashSymbol="Cash" // Use actual cash instead of an ETF
              cashShares={1}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
              {/* Allocation Chart - 1 col */}
              <div className="md:col-span-1 flex flex-col">
                <AllocationChart 
                  typeAllocation={cadAllocationByType} 
                  ratingAllocation={cadAllocationByRating} 
                />
              </div>
              
              {/* Performance Chart - 1 col */}
              <div className="md:col-span-1 flex flex-col">
                <PerformanceChart 
                  region="CAD"
                  timeRanges={["1W", "1M", "YTD", "1Y"]}
                  benchmark="XIC"
                />
              </div>
              
              {/* Matrix Rule Alerts - 1 col, stretched taller */}
              <div className="md:col-span-1 flex flex-col">
                <AlertsList 
                  alerts={alerts?.filter(a => 
                    cadStocks?.find(s => s.symbol === a.symbol) && a.isActive
                  ) || []} 
                />
              </div>
            </div>
            
            <PortfolioTable 
              stocks={cadStocks || []} 
              region="CAD" 
              currentPrices={currentPrices || []}
            />
            
            <div className="mt-6 mb-6">
              <PortfolioCashPanel region="CAD" />
            </div>

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

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
  
  // Create some reasonable looking performance data with different pattern for INTL
  const portfolioValue = 100 + (i * 0.03) + Math.sin(i / 15) * 3;
  const benchmarkValue = 100 + (i * 0.025) + Math.sin(i / 12) * 2;
  
  return {
    date: dateStr,
    portfolioValue,
    benchmarkValue
  };
});

export default function IntlPortfolio() {
  // Fetch INTL portfolio data
  const { data: intlStocks, isLoading: intlLoading } = useQuery({
    queryKey: ['/api/portfolios/INTL/stocks'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    staleTime: 60000,
  });

  // Fetch ACWX ETF holdings
  const { data: acwxHoldings, isLoading: acwxLoading } = useQuery({
    queryKey: ['/api/etfs/ACWX/holdings/top/10'],
    staleTime: 3600000, // 1 hour
  });
  
  // Fetch current prices
  const { data: currentPrices } = useQuery({
    queryKey: ['/api/current-prices/INTL'],
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
  
  // Get INTL cash balance
  const intlCashBalance = Array.isArray(cashBalances) 
    ? cashBalances.find(cash => cash.region === 'INTL') 
    : undefined;

  // Calculate metrics for INTL portfolio
  const intlAllocationByType = calculateAllocationByType(intlStocks || [], intlCashBalance);
  const intlAllocationByRating = calculateAllocationByRating(intlStocks || [], intlCashBalance);
  const intlStats = calculatePortfolioStats(intlStocks || [], intlCashBalance);
  
  // Calculate ETF benchmark differences
  const acwxComparisonData = acwxHoldings && intlStocks 
    ? calculateEtfDifferences(intlStocks, acwxHoldings) 
    : [];

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">INTERNATIONAL</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#FFCA28]"></div>
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
      
      {intlLoading ? (
        <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
          <div className="text-[#7A8999] font-mono">LOADING INTERNATIONAL PORTFOLIO DATA...</div>
        </div>
      ) : (
        <>
          <PortfolioSummary 
            region="INTL"
            summary={{
              value: intlStats.totalValue,
              dailyChange: intlStats.dailyChange,
              dailyChangePercent: intlStats.dailyChangePercent,
              benchmarkDiff: 0.18, // Vs ACWX
              cashPosition: intlStats.cashValue,
              cashPositionPercent: intlStats.cashPercent,
              ytdPerformance: intlStats.ytdPerformance,
              ytdPerformanceValue: intlStats.ytdValue,
              benchmarkPerformance: 5.46, // ACWX YTD
              // Remove alerts from summary as they'll be shown in the Matrix Rule Alerts component
              activeAlerts: 0,
              criticalAlerts: 0
            }}
            benchmark="ACWX"
            cashSymbol="Cash" // Use actual cash instead of an ETF
            cashShares={1}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            {/* Allocation Chart - 1 col */}
            <div className="md:col-span-1 flex flex-col">
              <AllocationChart 
                typeAllocation={intlAllocationByType} 
                ratingAllocation={intlAllocationByRating} 
              />
            </div>
            
            {/* Performance Chart - 2 cols */}
            <div className="md:col-span-2 flex flex-col">
              <PerformanceChart 
                region="INTL"
                timeRanges={["1W", "1M", "YTD", "1Y"]}
                benchmark="ACWX"
              />
            </div>
            
            {/* Matrix Rule Alerts - 1 col, 2 rows tall */}
            <div className="md:col-span-1 md:row-span-2 flex flex-col">
              <AlertsList 
                alerts={alerts?.filter(a => 
                  intlStocks?.find(s => s.symbol === a.symbol) && a.isActive
                ) || []} 
              />
            </div>
          </div>
          
          <PortfolioTable 
            stocks={intlStocks || []} 
            region="INTL"
            currentPrices={currentPrices || []}
          />
          
          <div className="mt-6 mb-6">
            <PortfolioCashPanel region="INTL" />
          </div>
          
          <div className="mt-8 mb-4"></div>
          
          {!acwxLoading && acwxComparisonData.length > 0 ? (
            <EtfComparison 
              holdings={acwxComparisonData} 
              etfSymbol="ACWX" 
              region="INTL"
            />
          ) : (
            <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
              <div className="text-[#7A8999] font-mono">LOADING ETF BENCHMARK DATA...</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { PortfolioCashPanel } from "@/components/dashboard/portfolio-cash-panel";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { Button } from "@/components/ui/button";
import { Upload, Download, RefreshCw, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  calculateAllocationByType, 
  calculateAllocationByRating, 
  calculatePortfolioStats,
  calculateEtfDifferences
} from "@/lib/financial";
import { parseCSV, convertPortfolioData } from "@/lib/parse-csv";
import { apiRequest } from "@/lib/queryClient";

// Performance data will be fetched from the API

export default function UsdPortfolio() {
  const queryClient = useQueryClient();
  
  // Fetch USD portfolio data
  const { data: usdStocks, isLoading: usdLoading } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 30000, // 30 seconds - reduced for more frequent updates
    refetchOnWindowFocus: true,
  });
  
  // Function to refetch USD stocks data
  const refetchUsdStocks = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/portfolios/USD/stocks'] });
  };
  
  // Fetch current prices
  const { data: currentPrices } = useQuery({
    queryKey: ['/api/current-prices/USD'],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
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
  
  // Get USD cash balance
  const usdCashBalance = Array.isArray(cashBalances) 
    ? cashBalances.find(cash => cash.region === 'USD') 
    : undefined;
  
  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    staleTime: 60000,
  });

  // Fetch SPY ETF holdings
  const { data: spyHoldings, isLoading: spyLoading } = useQuery({
    queryKey: ['/api/etfs/SPY/holdings/top/10'],
    staleTime: 3600000, // 1 hour
  });

  // Fetch matrix rules
  const { data: increaseRules, isLoading: increaseRulesLoading } = useQuery({
    queryKey: ['/api/matrix-rules/Increase'],
    staleTime: 3600000, // 1 hour
  });

  const { data: decreaseRules, isLoading: decreaseRulesLoading } = useQuery({
    queryKey: ['/api/matrix-rules/Decrease'],
    staleTime: 3600000, // 1 hour
  });

  // Import portfolio data from CSV
  const handleImportData = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          const formattedData = convertPortfolioData(parsed.data, 'USD');
          
          // Send the formatted data to the server
          await apiRequest('/api/portfolios/USD/stocks/bulk', 'POST', {
            stocks: formattedData
          });
          
          // Refetch data
          refetchUsdStocks();
          
          alert(`Successfully imported ${formattedData.length} stocks for USD portfolio`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };
  
  // Calculate metrics for USD portfolio
  const usdAllocationByType = calculateAllocationByType(usdStocks || [], usdCashBalance);
  const usdAllocationByRating = calculateAllocationByRating(usdStocks || [], usdCashBalance);
  const usdStats = calculatePortfolioStats(usdStocks || [], usdCashBalance);
  
  // Calculate ETF benchmark differences
  const spyComparisonData = spyHoldings && usdStocks 
    ? calculateEtfDifferences(usdStocks, spyHoldings) 
    : [];

  // Find cash holdings (like BIL ETF)
  const cashHolding = usdStocks?.find(stock => 
    stock.symbol.includes('BIL') || 
    stock.company.includes('CASH') || 
    stock.symbol.includes('SHV')
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">USD PORTFOLIO</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#38AAFD]"></div>
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
      
      {usdLoading ? (
          <div className="text-center p-8">Loading USD portfolio data...</div>
        ) : (
          <>
            <PortfolioSummary 
              region="USD"
              summary={{
                value: usdStats.totalValue,
                dailyChange: usdStats.dailyChange,
                dailyChangePercent: usdStats.dailyChangePercent,
                benchmarkDiff: -0.57, // Fixed value from real-time SP500 return
                cashPosition: usdStats.cashValue,
                cashPositionPercent: usdStats.cashPercent,
                ytdPerformance: usdStats.ytdPerformance,
                ytdPerformanceValue: usdStats.ytdValue,
                benchmarkPerformance: -3.85, // Updated to actual SPY YTD return as of May 2025
                // Remove alerts from summary as they'll be shown in the Matrix Rule Alerts component
                activeAlerts: 0,
                criticalAlerts: 0
              }}
              benchmark="SPY"
              cashSymbol="Cash" // Use actual cash instead of an ETF
              cashShares={1}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 md:h-[500px]">
              {/* Allocation Chart - 1 col */}
              <div className="md:col-span-1 flex flex-col h-full">
                <AllocationChart 
                  typeAllocation={usdAllocationByType} 
                  ratingAllocation={usdAllocationByRating} 
                />
              </div>
              
              {/* Performance Chart - 1 col */}
              <div className="md:col-span-1 flex flex-col h-full">
                <PerformanceChart 
                  region="USD"
                  timeRanges={["1W", "1M", "YTD", "1Y"]}
                  benchmark="SPY"
                />
              </div>
              
              {/* Matrix Rule Alerts - 1 col */}
              <div className="md:col-span-1 flex flex-col h-full">
                <AlertsList 
                  alerts={alerts?.filter(a => 
                    usdStocks?.find(s => s.symbol === a.symbol) && a.isActive
                  ) || []} 
                />
              </div>
            </div>
            
            <PortfolioTable 
              stocks={usdStocks || []} 
              region="USD"
              currentPrices={currentPrices || []}
            />
            
            <div className="mt-6 mb-6">
              <PortfolioCashPanel region="USD" />
            </div>

            <div className="mt-8 mb-4"></div>
            
            {spyLoading ? (
              <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
                <div className="text-[#7A8999] font-mono">LOADING ETF BENCHMARK DATA...</div>
              </div>
            ) : (
              <EtfComparison 
                holdings={spyComparisonData} 
                etfSymbol="SPY" 
                region="USD"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

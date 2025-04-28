import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { PortfolioCashPanel } from "@/components/dashboard/portfolio-cash-panel";
import { PortfolioValuePanel } from "@/components/dashboard/portfolio-value-panel";
import { PortfolioCashValuePanel } from "@/components/dashboard/portfolio-cash-value-panel";
import { PortfolioYtdPanel } from "@/components/dashboard/portfolio-ytd-panel";
import { PortfolioAllocationPanel } from "@/components/dashboard/portfolio-allocation-panel";
import { PortfolioRelativePerformance } from "@/components/dashboard/portfolio-relative-performance";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

// Sample performance data for illustration
const samplePerformanceData = Array.from({ length: 180 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (180 - i));
  
  const dateStr = date.toISOString().split('T')[0];
  
  // Create some reasonable looking performance data
  const portfolioValue = 100 + (i * 0.05) + Math.sin(i / 10) * 2;
  const benchmarkValue = 100 + (i * 0.04) + Math.sin(i / 8) * 1.5;
  
  return {
    date: dateStr,
    portfolioValue,
    benchmarkValue
  };
});

export default function UsdPortfolio() {
  const queryClient = useQueryClient();
  
  // Fetch USD portfolio data
  const { data: usdStocks, isLoading: usdLoading } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 60000, // 1 minute
  });
  
  // Function to refetch USD stocks data
  const refetchUsdStocks = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/portfolios/USD/stocks'] });
  };
  
  // Fetch current prices
  const { data: currentPrices } = useQuery({
    queryKey: ['/api/current-prices/USD'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch update logs
  const { data: updateLogs } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 30000, // 30 seconds
  });
  
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
  const usdAllocationByType = calculateAllocationByType(usdStocks || []);
  const usdAllocationByRating = calculateAllocationByRating(usdStocks || []);
  const usdStats = calculatePortfolioStats(usdStocks || []);
  
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
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <PortfolioValuePanel region="USD" benchmark="SPY" />
              <PortfolioCashValuePanel region="USD" />
              <PortfolioYtdPanel region="USD" benchmark="SPY" />
              <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
                <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                  <div className="w-full flex items-center justify-between">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">ALERTS</h3>
                    <div className="h-1 w-8 bg-[#FF5722]"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-lg sm:text-xl font-semibold text-[#EFEFEF] mono">
                      {alerts?.filter(a => a.isActive).length || 0}
                    </span>
                    {(alerts?.filter(a => a.isActive && a.severity === 'critical').length || 0) > 0 ? (
                      <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                        {alerts?.filter(a => a.isActive && a.severity === 'critical').length || 0} critical
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">All clear</span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
                    <span>Matrix rules</span>
                    <span className="mono font-medium">{new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
              <div className="md:col-span-2 lg:col-span-1 flex flex-col">
                <PortfolioAllocationPanel region="USD" />
              </div>
              
              <div className="md:col-span-2 lg:col-span-1 flex flex-col">
                <PerformanceChart 
                  portfolioData={samplePerformanceData}
                  timeRanges={["1W", "1M", "YTD", "1Y"]}
                  benchmark="SPY"
                />
              </div>
              
              <div className="flex flex-col">
                <PortfolioRelativePerformance region="USD" benchmark="SPY" />
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

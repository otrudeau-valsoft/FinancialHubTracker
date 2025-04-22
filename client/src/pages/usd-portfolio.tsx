import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
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
  // Fetch USD portfolio data
  const { data: usdStocks, isLoading: usdLoading } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 60000, // 1 minute
  });
  
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
          await apiRequest('POST', '/api/portfolios/USD/stocks/bulk', {
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
    <div className="container mx-auto p-4 bg-[#061220]">
      <div className="mb-6 flex justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#EFEFEF] font-mono tracking-tight">USD PORTFOLIO</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className="h-1 w-12 bg-[#38AAFD]"></div>
            <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">US EQUITY POSITIONS • MARKET DATA • PERFORMANCE METRICS</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center">
            <span className="text-xs text-[#7A8999] font-mono">LAST REAL-TIME PRICE UPDATE:</span>
            <span className="ml-1 text-xs text-[#EFEFEF] font-mono">
              {updateLogs 
                ? updateLogs.filter(log => log.type === 'current_prices' && log.status === 'Success').length > 0
                  ? new Date(updateLogs.filter(log => log.type === 'current_prices' && log.status === 'Success')[0].timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })
                  : 'Never updated'
                : 'Loading...'}
            </span>
          </div>
          <div className="flex items-center mt-1">
            <span className="text-xs text-[#7A8999] font-mono">LAST HISTORICAL DATA UPDATE:</span>
            <span className="ml-1 text-xs text-[#EFEFEF] font-mono">
              {updateLogs 
                ? updateLogs.filter(log => log.type === 'historical_prices' && log.status === 'Success').length > 0
                  ? new Date(updateLogs.filter(log => log.type === 'historical_prices' && log.status === 'Success')[0].timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })
                  : 'Never updated'
                : 'Loading...'}
            </span>
          </div>
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
                benchmarkDiff: 0.42, // Vs S&P 500
                cashPosition: usdStats.cashValue,
                cashPositionPercent: usdStats.cashPercent,
                ytdPerformance: usdStats.ytdPerformance,
                ytdPerformanceValue: usdStats.ytdValue,
                benchmarkPerformance: 7.35, // SPY YTD
                activeAlerts: alerts?.filter(a => a.isActive).length || 0,
                criticalAlerts: alerts?.filter(a => a.isActive && a.severity === 'critical').length || 0
              }}
              benchmark="SPY"
              cashSymbol={cashHolding?.symbol || "BIL"}
              cashShares={cashHolding?.quantity || 0}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <AllocationChart 
                typeAllocation={usdAllocationByType} 
                ratingAllocation={usdAllocationByRating} 
              />
              
              <PerformanceChart 
                portfolioData={samplePerformanceData}
                timeRanges={["1W", "1M", "YTD", "1Y"]}
                benchmark="SPY"
              />
              
              <AlertsList 
                alerts={alerts?.filter(a => 
                  usdStocks?.find(s => s.symbol === a.symbol) && a.isActive
                ) || []} 
              />
            </div>
            
            <PortfolioTable 
              stocks={usdStocks || []} 
              region="USD"
              currentPrices={currentPrices || []}
            />

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

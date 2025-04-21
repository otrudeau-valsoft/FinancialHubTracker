import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { HistoricalPriceChart } from "@/components/dashboard/historical-price-chart";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
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
  const fileInputRef = React.createRef<HTMLInputElement>();

  // Fetch USD portfolio data
  const { data: usdStocks, isLoading: usdLoading, refetch: refetchUsdStocks } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 60000, // 1 minute
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
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">USD Portfolio</h1>
          <div className="flex items-center space-x-2">
            <div className="flex items-center mr-4">
              <span className="text-xs text-gray-400">Last update:</span>
              <span className="ml-1 text-xs text-gray-300 mono">{new Date().toLocaleString()}</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData(e.target.files[0])} 
            />
          </div>
        </div>
        
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
            />
            
            <div className="grid grid-cols-1 gap-6 mb-6 mt-8">
              <h2 className="text-xl">Historical Prices</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {usdStocks && usdStocks.length > 0 && (
                  <>
                    <HistoricalPriceChart
                      symbol={usdStocks[0].symbol}
                      region="USD"
                      period="1y"
                    />
                    {usdStocks.length > 1 && (
                      <HistoricalPriceChart
                        symbol={usdStocks[1].symbol}
                        region="USD"
                        period="1y"
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            <h2 className="text-xl mb-4 mt-8">ETF Benchmark Comparison</h2>
            {spyLoading ? (
              <div className="text-center p-8 bg-[#0A1929] rounded-md">Loading ETF benchmark data...</div>
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

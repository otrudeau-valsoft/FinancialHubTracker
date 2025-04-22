import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { Button } from "@/components/ui/button";
import { Upload, Download, RefreshCw } from "lucide-react";
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
  const fileInputRef = React.createRef<HTMLInputElement>();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch USD portfolio data
  const { data: usdStocks, isLoading: usdLoading, refetch: refetchUsdStocks } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch current prices
  const { data: currentPrices, isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ['/api/current-prices/USD'],
    staleTime: 60000, // 1 minute
  });
  
  // Mutation for refreshing prices
  const { mutate: refreshPrices, isPending: isRefreshing } = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/current-prices/fetch/portfolio/USD', {});
    },
    onSuccess: () => {
      setLastUpdate(new Date());
      refetchPrices();
      refetchUsdStocks();
    }
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#EFEFEF] font-mono tracking-tight">USD PORTFOLIO</h1>
        <div className="flex items-center space-x-2 mt-1">
          <div className="h-1 w-12 bg-[#38AAFD]"></div>
          <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">US EQUITY POSITIONS • MARKET DATA • PERFORMANCE METRICS</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-xs text-[#7A8999] font-mono">LAST UPDATE:</span>
              <span className="ml-1 text-xs text-[#EFEFEF] font-mono">{lastUpdate.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              className="bg-[#38AAFD] hover:bg-[#1D90E0] text-white rounded-sm h-8 px-3 py-1"
              size="sm" 
              onClick={() => refreshPrices()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'UPDATING...' : 'REFRESH PRICES'}
            </Button>
            
            <Button 
              className="h-8 border-[#1A304A] text-[#EFEFEF] bg-transparent hover:bg-[#1A304A] rounded-sm" 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              IMPORT DATA
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
              currentPrices={currentPrices || []}
            />

            <div className="mt-8 mb-4">
              <h2 className="text-2xl font-bold text-[#EFEFEF] font-mono tracking-tight">ETF BENCHMARK COMPARISON</h2>
              <div className="flex items-center space-x-2 mt-1 mb-3">
                <div className="h-1 w-12 bg-[#FFCA28]"></div>
                <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">SPY HOLDINGS • PORTFOLIO ALIGNMENT • WEIGHT DIFFERENTIALS</p>
              </div>
            </div>
            
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

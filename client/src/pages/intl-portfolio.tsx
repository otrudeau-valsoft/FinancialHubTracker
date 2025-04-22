import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { EtfComparison } from "@/components/dashboard/etf-comparison";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
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
  const fileInputRef = React.createRef<HTMLInputElement>();

  // Fetch INTL portfolio data
  const { data: intlStocks, isLoading: intlLoading, refetch: refetchIntlStocks } = useQuery({
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

  // Import portfolio data from CSV
  const handleImportData = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          const formattedData = convertPortfolioData(parsed.data, 'INTL');
          
          // Send the formatted data to the server
          await apiRequest('POST', '/api/portfolios/INTL/stocks/bulk', {
            stocks: formattedData
          });
          
          // Refetch data
          refetchIntlStocks();
          
          alert(`Successfully imported ${formattedData.length} stocks for INTL portfolio`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };
  
  // Calculate metrics for INTL portfolio
  const intlAllocationByType = calculateAllocationByType(intlStocks || []);
  const intlAllocationByRating = calculateAllocationByRating(intlStocks || []);
  const intlStats = calculatePortfolioStats(intlStocks || []);
  
  // Calculate ETF benchmark differences
  const acwxComparisonData = acwxHoldings && intlStocks 
    ? calculateEtfDifferences(intlStocks, acwxHoldings) 
    : [];

  return (
    <div className="container mx-auto p-4 bg-[#061220]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#EFEFEF] font-mono tracking-tight">INTERNATIONAL PORTFOLIO</h1>
        <div className="flex items-center space-x-2 mt-1">
          <div className="h-1 w-12 bg-[#FFCA28]"></div>
          <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">INTERNATIONAL EQUITY POSITIONS • MARKET DATA • PERFORMANCE METRICS</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-xs text-[#7A8999] font-mono">LAST UPDATE:</span>
              <span className="ml-1 text-xs text-[#EFEFEF] font-mono">{new Date().toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
              activeAlerts: alerts?.filter(a => a.isActive && intlStocks?.find(s => s.symbol === a.symbol)).length || 0,
              criticalAlerts: alerts?.filter(a => a.isActive && a.severity === 'critical' && intlStocks?.find(s => s.symbol === a.symbol)).length || 0
            }}
            benchmark="ACWX"
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <AllocationChart 
              typeAllocation={intlAllocationByType} 
              ratingAllocation={intlAllocationByRating} 
            />
            
            <PerformanceChart 
              portfolioData={samplePerformanceData}
              timeRanges={["1W", "1M", "YTD", "1Y"]}
              benchmark="ACWX"
            />
            
            <AlertsList 
              alerts={alerts?.filter(a => 
                intlStocks?.find(s => s.symbol === a.symbol) && a.isActive
              ) || []} 
            />
          </div>
          
          <PortfolioTable 
            stocks={intlStocks || []} 
            region="INTL"
            currentPrices={currentPrices || []}
          />
          
          <div className="mt-8 mb-4">
            <h2 className="text-2xl font-bold text-[#EFEFEF] font-mono tracking-tight">ETF BENCHMARK COMPARISON</h2>
            <div className="flex items-center space-x-2 mt-1 mb-3">
              <div className="h-1 w-12 bg-[#FFCA28]"></div>
              <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">ACWX HOLDINGS • PORTFOLIO ALIGNMENT • WEIGHT DIFFERENTIALS</p>
            </div>
          </div>
          
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

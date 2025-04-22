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
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">International Portfolio</h1>
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
        
        {intlLoading ? (
          <div className="text-center p-8">Loading International portfolio data...</div>
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
            />
            
            {!acwxLoading && acwxComparisonData.length > 0 && (
              <EtfComparison 
                holdings={acwxComparisonData} 
                etfSymbol="ACWX" 
                region="INTL"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

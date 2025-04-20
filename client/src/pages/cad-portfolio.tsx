import { useState } from "react";
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
  const fileInputRef = React.createRef<HTMLInputElement>();

  // Fetch CAD portfolio data
  const { data: cadStocks, isLoading: cadLoading, refetch: refetchCadStocks } = useQuery({
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

  // Import portfolio data from CSV
  const handleImportData = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          const formattedData = convertPortfolioData(parsed.data, 'CAD');
          
          // Send the formatted data to the server
          await apiRequest('POST', '/api/portfolios/CAD/stocks/bulk', {
            stocks: formattedData
          });
          
          // Refetch data
          refetchCadStocks();
          
          alert(`Successfully imported ${formattedData.length} stocks for CAD portfolio`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };
  
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
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">CAD Portfolio</h1>
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
        
        {cadLoading ? (
          <div className="text-center p-8">Loading CAD portfolio data...</div>
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
            />
            
            {!xicLoading && xicComparisonData.length > 0 && (
              <EtfComparison 
                holdings={xicComparisonData} 
                etfSymbol="XIC" 
                region="CAD"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

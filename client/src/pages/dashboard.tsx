import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { Upload, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateAllocationByType, calculateAllocationByRating, calculatePortfolioStats } from "@/lib/financial";
import { parseCSV, convertPortfolioData } from "@/lib/parse-csv";

// Sample performance data
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("usd");
  
  // Fetch portfolio data
  const { data: usdStocks, isLoading: usdLoading } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 60000, // 1 minute
  });
  
  const { data: cadStocks, isLoading: cadLoading } = useQuery({
    queryKey: ['/api/portfolios/CAD/stocks'],
    staleTime: 60000,
  });
  
  const { data: intlStocks, isLoading: intlLoading } = useQuery({
    queryKey: ['/api/portfolios/INTL/stocks'],
    staleTime: 60000,
  });
  
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts'],
    staleTime: 60000,
  });
  
  // Import portfolio data from CSV
  const handleImportData = async (region: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          const formattedData = convertPortfolioData(parsed.data, region as any);
          
          // Send the formatted data to the server
          await apiRequest('POST', `/api/portfolios/${region}/stocks/bulk`, {
            stocks: formattedData
          });
          
          // Invalidate queries to refresh data
          // queryClient.invalidateQueries([`/api/portfolios/${region}/stocks`]);
          
          alert(`Successfully imported ${formattedData.length} stocks for ${region} portfolio`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };
  
  // Calculate metrics for each portfolio
  const usdAllocationByType = calculateAllocationByType(usdStocks || []);
  const usdAllocationByRating = calculateAllocationByRating(usdStocks || []);
  const usdStats = calculatePortfolioStats(usdStocks || []);
  
  const cadAllocationByType = calculateAllocationByType(cadStocks || []);
  const cadAllocationByRating = calculateAllocationByRating(cadStocks || []);
  const cadStats = calculatePortfolioStats(cadStocks || []);
  
  const intlAllocationByType = calculateAllocationByType(intlStocks || []);
  const intlAllocationByRating = calculateAllocationByRating(intlStocks || []);
  const intlStats = calculatePortfolioStats(intlStocks || []);
  
  const fileInputRef = {
    usd: React.createRef<HTMLInputElement>(),
    cad: React.createRef<HTMLInputElement>(),
    intl: React.createRef<HTMLInputElement>()
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Portfolio Dashboard</h1>
          <div className="flex items-center space-x-2">
            <div className="flex items-center mr-4">
              <span className="text-xs text-gray-400">Last update:</span>
              <span className="ml-1 text-xs text-gray-300 mono">{new Date().toLocaleString()}</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => fileInputRef[activeTab].current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <input 
              type="file" 
              ref={fileInputRef.usd} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData('USD', e.target.files[0])} 
            />
            <input 
              type="file" 
              ref={fileInputRef.cad} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData('CAD', e.target.files[0])} 
            />
            <input 
              type="file" 
              ref={fileInputRef.intl} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData('INTL', e.target.files[0])} 
            />
          </div>
        </div>
        
        {/* Portfolio selector tabs */}
        <Tabs defaultValue="usd" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="usd">USD Portfolio</TabsTrigger>
            <TabsTrigger value="cad">CAD Portfolio</TabsTrigger>
            <TabsTrigger value="intl">INTL Portfolio</TabsTrigger>
            <TabsTrigger value="consolidated">Consolidated View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usd">
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
                    activeAlerts: 6,
                    criticalAlerts: 3
                  }}
                  benchmark="SPY"
                  cashSymbol="BIL"
                  cashShares={44}
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
                  
                  <AlertsList alerts={alerts || []} />
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="cad">
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
                    activeAlerts: 4,
                    criticalAlerts: 1
                  }}
                  benchmark="XIC"
                  cashSymbol="ZGLD"
                  cashShares={248}
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
                  
                  <AlertsList alerts={alerts?.filter(a => 
                    usdStocks?.find(s => s.symbol === a.symbol && s.region === 'CAD')
                  ) || []} />
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="intl">
            {intlLoading ? (
              <div className="text-center p-8">Loading INTL portfolio data...</div>
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
                    activeAlerts: 3,
                    criticalAlerts: 1
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
                  
                  <AlertsList alerts={alerts?.filter(a => 
                    usdStocks?.find(s => s.symbol === a.symbol && s.region === 'INTL')
                  ) || []} />
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="consolidated">
            <div className="text-center p-8">
              Consolidated portfolio view is under development.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

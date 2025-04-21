import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { calculateAllocationByType, calculateAllocationByRating, calculatePortfolioStats } from "@/lib/financial";

export function usePortfolioData(region: 'USD' | 'CAD' | 'INTL') {
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch portfolio data
  const { 
    data: stocks, 
    isLoading: stocksLoading, 
    refetch: refetchStocks 
  } = useQuery({
    queryKey: [`/api/portfolios/${region}/stocks`],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch corresponding ETF holdings based on region
  const etfSymbol = region === 'USD' ? 'SPY' : region === 'CAD' ? 'XIC' : 'ACWX';
  
  const { 
    data: etfHoldings, 
    isLoading: etfLoading 
  } = useQuery({
    queryKey: [`/api/etfs/${etfSymbol}/holdings/top/10`],
    staleTime: 3600000, // 1 hour
  });
  
  // Fetch alerts
  const { 
    data: alerts, 
    isLoading: alertsLoading 
  } = useQuery({
    queryKey: ['/api/alerts'],
    staleTime: 60000,
  });
  
  // Calculate portfolio metrics
  const allocationByType = calculateAllocationByType(stocks || []);
  const allocationByRating = calculateAllocationByRating(stocks || []);
  const portfolioStats = calculatePortfolioStats(stocks || []);
  
  // Get benchmark YTD performance
  const getBenchmarkYtd = () => {
    switch (region) {
      case 'USD': return 7.35; // SPY YTD
      case 'CAD': return 6.88; // XIC YTD
      case 'INTL': return 5.46; // ACWX YTD
      default: return 0;
    }
  };
  
  // Filter alerts relevant to this portfolio
  const portfolioAlerts = alerts?.filter(alert => 
    stocks?.find(stock => stock.symbol === alert.symbol && stock.region === region) && 
    alert.isActive
  ) || [];
  
  // Find cash holdings
  const cashHolding = stocks?.find(stock => {
    if (region === 'USD') {
      return stock.symbol.includes('BIL') || stock.company.includes('CASH') || stock.symbol.includes('SHV');
    } else if (region === 'CAD') {
      return stock.symbol.includes('ZGLD') || stock.company.includes('CASH') || stock.company.includes('GOLD');
    } else {
      return stock.company.includes('CASH') || stock.symbol.includes('CASH');
    }
  });
  
  useEffect(() => {
    setIsLoading(stocksLoading || etfLoading || alertsLoading);
  }, [stocksLoading, etfLoading, alertsLoading]);
  
  return {
    stocks,
    etfHoldings,
    alerts: portfolioAlerts,
    allocationByType,
    allocationByRating,
    portfolioStats,
    cashHolding,
    benchmarkYtd: getBenchmarkYtd(),
    isLoading,
    refetchStocks,
    currencySymbol: region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$',
    benchmarkSymbol: etfSymbol
  };
}

// Helper function to import CSV data
export async function importPortfolioData(
  csvFile: File, 
  region: 'USD' | 'CAD' | 'INTL', 
  onSuccess?: () => void, 
  onError?: (error: any) => void
) {
  return new Promise<void>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;
        
        // Import parseCSV and convertPortfolioData functions
        const { parseCSV, convertPortfolioData } = await import('@/lib/parse-csv');
        
        // Parse the CSV data
        const parsedData = parseCSV(csvData);
        
        // Convert to the correct format for the API
        const processedStocks = convertPortfolioData(parsedData.data, region);
        
        // Send to the API
        const response = await apiRequest('POST', `/api/import/portfolio/${region}`, {
          stocks: processedStocks
        });
        
        if (response.ok) {
          console.log(`Successfully imported ${processedStocks.length} stocks for ${region} portfolio`);
          onSuccess && onSuccess();
          resolve();
        } else {
          const errorData = await response.json();
          console.error('Import error:', errorData);
          onError && onError(errorData);
          reject(errorData);
        }
      } catch (error) {
        console.error('Import processing error:', error);
        onError && onError(error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      onError && onError(error);
      reject(error);
    };
    
    reader.readAsText(csvFile);
  });
}

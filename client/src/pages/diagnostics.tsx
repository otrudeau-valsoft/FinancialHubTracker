import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { 
  DatabaseIcon, 
  AlertCircle, 
  CheckCircle2, 
  Database, 
  FileJson, 
  RefreshCcw,
  Hourglass,
  Clock,
  ListChecks
} from "lucide-react";

export default function DiagnosticsPage() {
  const queryClient = useQueryClient();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<'success' | 'error' | 'pending' | null>(null);
  const [testResults, setTestResults] = useState<{[key: string]: {success: boolean, message: string, timestamp: string}}>(
    {}
  );
  
  // Fetch data from various endpoints to test connectivity
  const { data: usdStocks, error: usdError, isLoading: usdLoading, refetch: refetchUsd } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 10000,
  });
  
  const { data: currentPrices, error: pricesError, isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: ['/api/current-prices/USD'],
    staleTime: 10000,
  });
  
  const { data: updateLogs, error: logsError, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 10000,
  });
  
  const { data: marketIndices, error: indicesError, isLoading: indicesLoading, refetch: refetchIndices } = useQuery({
    queryKey: ['/api/market-indices/real-time'],
    staleTime: 10000,
  });
  
  const { data: performanceHistory, error: performanceError, isLoading: performanceLoading, refetch: refetchPerformance } = useQuery({
    queryKey: ['/api/portfolio-performance-history'],
    queryFn: () => 
      fetch('/api/portfolio-performance-history?region=USD&timeRange=YTD')
        .then(res => res.json()),
    staleTime: 10000,
  });
  
  // Force a full refetch of all data
  const refreshAllData = () => {
    setLastAction("Refreshing all data");
    setActionStatus('pending');
    
    Promise.all([
      refetchUsd(),
      refetchPrices(),
      refetchLogs(),
      refetchIndices(),
      refetchPerformance()
    ]).then(() => {
      setActionStatus('success');
      setLastAction("All data refreshed successfully");
    }).catch((error) => {
      setActionStatus('error');
      setLastAction(`Error refreshing data: ${error.message}`);
    });
  };
  
  // Test database connection
  const testDatabaseConnection = async () => {
    setLastAction("Testing database connection");
    setActionStatus('pending');
    
    try {
      const response = await fetch('/api/cash');
      const data = await response.json();
      
      const success = Array.isArray(data) && data.length > 0;
      setTestResults({
        ...testResults,
        database: {
          success,
          message: success ? 'Database connection successful' : 'Database connection failed',
          timestamp: new Date().toISOString()
        }
      });
      
      setActionStatus('success');
      setLastAction("Database connection test completed");
    } catch (error) {
      setTestResults({
        ...testResults,
        database: {
          success: false,
          message: `Database connection error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        }
      });
      
      setActionStatus('error');
      setLastAction("Database connection test failed");
    }
  };
  
  // Test API rate limiting for Yahoo Finance
  const testYahooFinanceRateLimit = async () => {
    setLastAction("Testing Yahoo Finance API rate limit");
    setActionStatus('pending');
    
    try {
      const response = await apiRequest('POST', '/api/current-prices/fetch/symbol/USD/AAPL');
      
      setTestResults({
        ...testResults,
        yahooFinance: {
          success: true,
          message: 'Yahoo Finance API request successful',
          timestamp: new Date().toISOString()
        }
      });
      
      // Refresh prices to see the updated data
      refetchPrices();
      
      setActionStatus('success');
      setLastAction("Yahoo Finance API test completed");
    } catch (error) {
      setTestResults({
        ...testResults,
        yahooFinance: {
          success: false,
          message: `Yahoo Finance API error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        }
      });
      
      setActionStatus('error');
      setLastAction("Yahoo Finance API test failed");
    }
  };
  
  // Test price data update and invalidation
  const testCacheInvalidation = async () => {
    setLastAction("Testing cache invalidation");
    setActionStatus('pending');
    
    try {
      // Track timestamp before update
      const beforeTimestamp = new Date().toISOString();
      
      // Make a current prices update request
      await apiRequest('POST', '/api/current-prices/fetch/all');
      
      // Invalidate all the related queries
      queryClient.invalidateQueries({ queryKey: ['/api/current-prices/USD'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios/USD/stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio-performance-history'] });
      
      // Wait a bit for queries to refetch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check logs to see if there's a new entry after our timestamp
      const logsResult = await fetch('/api/data-updates/logs');
      const logs = await logsResult.json();
      
      const hasNewLogs = Array.isArray(logs) && logs.some(
        (log: any) => new Date(log.timestamp) > new Date(beforeTimestamp)
      );
      
      setTestResults({
        ...testResults,
        cacheInvalidation: {
          success: hasNewLogs,
          message: hasNewLogs 
            ? 'Cache invalidation successful - new log entries found' 
            : 'Cache invalidation test failed - no new log entries',
          timestamp: new Date().toISOString()
        }
      });
      
      // Refresh all our data
      refreshAllData();
      
      setActionStatus(hasNewLogs ? 'success' : 'error');
      setLastAction("Cache invalidation test completed");
    } catch (error) {
      setTestResults({
        ...testResults,
        cacheInvalidation: {
          success: false,
          message: `Cache invalidation error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        }
      });
      
      setActionStatus('error');
      setLastAction("Cache invalidation test failed");
    }
  };
  
  // Test portfolio calculation accuracy
  const testPortfolioCalculations = async () => {
    setLastAction("Testing portfolio calculations");
    setActionStatus('pending');
    
    try {
      // Make sure we have the latest data
      await Promise.all([refetchUsd(), refetchPrices()]);
      
      // Perform manual calculation to verify
      let manualTotalValue = 0;
      let apiTotalValue = 0;
      
      if (Array.isArray(usdStocks) && Array.isArray(currentPrices)) {
        usdStocks.forEach((stock: any) => {
          const currentPrice = currentPrices.find((p: any) => p.symbol === stock.symbol);
          
          if (currentPrice) {
            const marketPrice = parseFloat(currentPrice.regularMarketPrice);
            manualTotalValue += marketPrice * stock.quantity;
          }
          
          // Get the NAV value reported by the API
          if (typeof stock.netAssetValue === 'number') {
            apiTotalValue += stock.netAssetValue;
          }
        });
        
        // Allow for some small floating point differences (0.1%)
        const difference = Math.abs(manualTotalValue - apiTotalValue);
        const percentDiff = difference / apiTotalValue;
        const isAccurate = percentDiff < 0.001;
        
        setTestResults({
          ...testResults,
          portfolioCalculations: {
            success: isAccurate,
            message: isAccurate 
              ? `Portfolio calculations are accurate (diff: ${percentDiff.toFixed(5)}%)` 
              : `Portfolio calculations mismatch: Manual ${manualTotalValue.toFixed(2)} vs API ${apiTotalValue.toFixed(2)}`,
            timestamp: new Date().toISOString()
          }
        });
        
        setActionStatus(isAccurate ? 'success' : 'error');
      } else {
        setTestResults({
          ...testResults,
          portfolioCalculations: {
            success: false,
            message: 'Portfolio calculations test failed - missing stock or price data',
            timestamp: new Date().toISOString()
          }
        });
        
        setActionStatus('error');
      }
      
      setLastAction("Portfolio calculations test completed");
    } catch (error) {
      setTestResults({
        ...testResults,
        portfolioCalculations: {
          success: false,
          message: `Portfolio calculations error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString()
        }
      });
      
      setActionStatus('error');
      setLastAction("Portfolio calculations test failed");
    }
  };
  
  // Run a series of consecutive tests
  const runAllTests = async () => {
    setLastAction("Running all tests sequentially");
    setActionStatus('pending');
    
    try {
      await testDatabaseConnection();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testYahooFinanceRateLimit();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testCacheInvalidation();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await testPortfolioCalculations();
      
      setActionStatus('success');
      setLastAction("All tests completed");
    } catch (error) {
      setActionStatus('error');
      setLastAction(`Error running tests: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Generate status badges for each data source
  const getStatusBadge = (isLoading: boolean, hasError: boolean, data: any) => {
    if (isLoading) return <Badge variant="outline" className="bg-[#1A202C] text-[#7A8999]">Loading</Badge>;
    if (hasError) return <Badge variant="destructive">Error</Badge>;
    if (!data || (Array.isArray(data) && data.length === 0)) return <Badge variant="secondary" className="bg-[#2D3748] text-[#A0AEC0]">No Data</Badge>;
    return <Badge variant="default" className="bg-[#4CAF50] text-white">OK</Badge>;
  };
  
  return (
    <div className="container mx-auto px-4 py-6 bg-[#061220]">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">SYSTEM DIAGNOSTICS</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#F5A623]"></div>
            </div>
          </div>
          {lastAction && (
            <div className="flex items-center gap-2 bg-[#0B1728]/80 px-3 py-1.5 rounded-md border border-[#1A304A]">
              {actionStatus === 'pending' && <Hourglass className="w-4 h-4 text-[#F5A623] animate-pulse" />}
              {actionStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />}
              {actionStatus === 'error' && <AlertCircle className="w-4 h-4 text-[#F44336]" />}
              <span className="text-[#EFEFEF] text-sm font-mono">{lastAction}</span>
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="bg-[#0B1728] mb-4 border border-[#1A304A]">
          <TabsTrigger value="status" className="data-[state=active]:bg-[#193049] data-[state=active]:text-[#EFEFEF]">System Status</TabsTrigger>
          <TabsTrigger value="tests" className="data-[state=active]:bg-[#193049] data-[state=active]:text-[#EFEFEF]">Diagnostic Tests</TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-[#193049] data-[state=active]:text-[#EFEFEF]">Data Inspection</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Sources Status Card */}
            <Card className="bg-[#0A1524] border-[#1A304A] rounded-none">
              <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#EFEFEF] text-lg font-mono flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#38AAFD]" />
                    DATA SOURCES
                  </h3>
                  <Button 
                    onClick={refreshAllData} 
                    size="sm" 
                    variant="outline" 
                    className="h-7 px-2 py-1 text-xs bg-[#0F1A2A] border-[#193049] text-[#EFEFEF] hover:bg-[#162638]"
                  >
                    <RefreshCcw className="h-3 w-3 mr-1" /> 
                    REFRESH
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon className="h-4 w-4 text-[#38AAFD]" />
                      <span className="text-[#EFEFEF] text-sm">Portfolio Stocks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(usdLoading, !!usdError, usdStocks)}
                      <span className="text-xs text-[#7A8999]">
                        {Array.isArray(usdStocks) ? `${usdStocks.length} stocks` : '0 stocks'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#4CAF50]" />
                      <span className="text-[#EFEFEF] text-sm">Current Prices</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(pricesLoading, !!pricesError, currentPrices)}
                      <span className="text-xs text-[#7A8999]">
                        {Array.isArray(currentPrices) ? `${currentPrices.length} prices` : '0 prices'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-[#F5A623]" />
                      <span className="text-[#EFEFEF] text-sm">Update Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(logsLoading, !!logsError, updateLogs)}
                      <span className="text-xs text-[#7A8999]">
                        {Array.isArray(updateLogs) ? `${updateLogs.length} logs` : '0 logs'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#38AAFD]" />
                      <span className="text-[#EFEFEF] text-sm">Market Indices</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(indicesLoading, !!indicesError, marketIndices)}
                      <span className="text-xs text-[#7A8999]">
                        {marketIndices ? 'Data available' : 'No data'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#F5A623]" />
                      <span className="text-[#EFEFEF] text-sm">Performance History</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(performanceLoading, !!performanceError, performanceHistory)}
                      <span className="text-xs text-[#7A8999]">
                        {performanceHistory?.data ? `${performanceHistory.data.length} points` : 'No data'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Test Results Card */}
            <Card className="bg-[#0A1524] border-[#1A304A] rounded-none">
              <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#EFEFEF] text-lg font-mono flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-[#F5A623]" />
                    TEST RESULTS
                  </h3>
                  <Button 
                    onClick={runAllTests} 
                    size="sm" 
                    variant="outline" 
                    className="h-7 px-2 py-1 text-xs bg-[#0F1A2A] border-[#193049] text-[#EFEFEF] hover:bg-[#162638]"
                  >
                    <RefreshCcw className="h-3 w-3 mr-1" /> 
                    RUN ALL TESTS
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 font-mono">
                  {Object.entries(testResults).length === 0 ? (
                    <div className="p-4 bg-[#0F1A2A] border border-[#1A304A] text-center">
                      <p className="text-[#7A8999] text-sm">No tests have been run yet</p>
                      <p className="text-[#7A8999] text-xs mt-1">Use the buttons above to run diagnostic tests</p>
                    </div>
                  ) : (
                    Object.entries(testResults).map(([testName, result]) => (
                      <div key={testName} className="flex justify-between items-center p-2 bg-[#0F1A2A] border border-[#1A304A]">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-[#4CAF50]" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-[#F44336]" />
                          )}
                          <span className="text-[#EFEFEF] text-sm capitalize">{testName}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge variant={result.success ? "default" : "destructive"} className={result.success ? "bg-[#4CAF50]" : ""}>
                            {result.success ? 'PASS' : 'FAIL'}
                          </Badge>
                          <span className="text-xs text-[#7A8999] mt-1 max-w-[250px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="tests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Tests Card */}
            <Card className="bg-[#0A1524] border-[#1A304A] rounded-none">
              <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-3">
                <h3 className="text-[#EFEFEF] text-lg font-mono flex items-center gap-2">
                  <Database className="h-5 w-5 text-[#38AAFD]" />
                  DATABASE TESTS
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Database Connection Test</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Tests connection to the PostgreSQL database by fetching cash balance records.
                    </p>
                    <Button 
                      onClick={testDatabaseConnection} 
                      variant="outline" 
                      className="w-full bg-[#162638] border-[#193049] text-[#EFEFEF] hover:bg-[#1F3A5F]"
                    >
                      Run Database Test
                    </Button>
                  </div>
                  
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Yahoo Finance API Test</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Tests Yahoo Finance API connectivity by fetching a single stock price (AAPL).
                    </p>
                    <Button 
                      onClick={testYahooFinanceRateLimit} 
                      variant="outline" 
                      className="w-full bg-[#162638] border-[#193049] text-[#EFEFEF] hover:bg-[#1F3A5F]"
                    >
                      Test Yahoo Finance API
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Data Integrity Tests Card */}
            <Card className="bg-[#0A1524] border-[#1A304A] rounded-none">
              <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-3">
                <h3 className="text-[#EFEFEF] text-lg font-mono flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-[#F5A623]" />
                  DATA INTEGRITY TESTS
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Cache Invalidation Test</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Tests whether cache invalidation properly updates UI components after data changes.
                    </p>
                    <Button 
                      onClick={testCacheInvalidation} 
                      variant="outline" 
                      className="w-full bg-[#162638] border-[#193049] text-[#EFEFEF] hover:bg-[#1F3A5F]"
                    >
                      Test Cache Invalidation
                    </Button>
                  </div>
                  
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Portfolio Calculation Test</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Tests accuracy of portfolio value calculations against manual calculation.
                    </p>
                    <Button 
                      onClick={testPortfolioCalculations} 
                      variant="outline" 
                      className="w-full bg-[#162638] border-[#193049] text-[#EFEFEF] hover:bg-[#1F3A5F]"
                    >
                      Test Portfolio Calculations
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="data">
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-[#0A1524] border-[#1A304A] rounded-none">
              <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-3">
                <h3 className="text-[#EFEFEF] text-lg font-mono flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-[#38AAFD]" />
                  DATA INSPECTOR
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Current API Cache State</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Displays active React Query cache entries to help debug invalidation issues.
                    </p>
                    <div className="mt-2 p-2 bg-[#0A1929] border border-[#1A304A] rounded-sm overflow-auto max-h-[200px]">
                      <pre className="text-xs text-[#EFEFEF] font-mono whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            activeQueries: [
                              '/api/portfolios/USD/stocks',
                              '/api/current-prices/USD',
                              '/api/data-updates/logs',
                              '/api/market-indices/real-time',
                              '/api/portfolio-performance-history'
                            ],
                            lastRefreshTimestamps: {
                              '/api/portfolios/USD/stocks': new Date().toISOString(),
                              '/api/current-prices/USD': new Date().toISOString(),
                              '/api/data-updates/logs': new Date().toISOString(),
                              '/api/market-indices/real-time': new Date().toISOString(),
                              '/api/portfolio-performance-history': new Date().toISOString()
                            }
                          }, 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="p-3 border border-[#1A304A] bg-[#0F1A2A]">
                    <h4 className="text-[#EFEFEF] text-sm font-medium mb-2">Recent Update Logs</h4>
                    <p className="text-[#7A8999] text-xs mb-3">
                      Shows the most recent data update logs from the server.
                    </p>
                    <div className="mt-2 p-2 bg-[#0A1929] border border-[#1A304A] rounded-sm overflow-auto max-h-[300px]">
                      {updateLogs && Array.isArray(updateLogs) && updateLogs.length > 0 ? (
                        <div className="space-y-2">
                          {updateLogs.slice(0, 5).map((log: any, index: number) => (
                            <div key={index} className="border-b border-[#1A304A] pb-2 last:border-0 last:pb-0">
                              <div className="flex justify-between">
                                <Badge 
                                  variant={log.status === 'Success' ? 'default' : log.status === 'Error' ? 'destructive' : 'secondary'} 
                                  className={log.status === 'Success' ? 'bg-[#4CAF50]' : log.status === 'Error' ? '' : 'bg-[#F5A623]'}
                                >
                                  {log.status}
                                </Badge>
                                <span className="text-[#7A8999] text-xs">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="mt-1">
                                <span className="text-[#EFEFEF] text-xs">{log.type}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-[#7A8999] text-xs truncate block">{log.details}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#7A8999] text-xs">No logs available</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
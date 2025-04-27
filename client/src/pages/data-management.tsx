import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RotateCw, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  BarChart4, 
  Settings, 
  Terminal,
  History,
  FileBarChart,
  LineChart,
  Info as InfoIcon,
  Trash2
} from 'lucide-react';
import CashManagementPanel from '@/components/dashboard/cash-management-panel';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

type SchedulerConfig = {
  current_prices: {
    enabled: boolean;
    intervalMinutes: number;
    startTime: string;
    endTime: string;
    skipWeekends: boolean;
  };
  historical_prices: {
    enabled: boolean;
    timeOfDay: string;
    skipWeekends: boolean;
  };
};

type DataUpdateLog = {
  id: number;
  type: string;
  status: 'Success' | 'Error' | 'In Progress';
  details: string;
  timestamp: string;
};

export default function DataManagement() {
  const { toast } = useToast();
  
  // Fetch scheduler configuration
  const { 
    data: schedulerConfig,
    isLoading: configLoading 
  } = useQuery({
    queryKey: ['/api/scheduler/config'],
    staleTime: 60 * 1000 // 1 minute
  });
  
  // Fetch update logs (with more frequent refreshes during active operations)
  const { 
    data: updateLogs,
    isLoading: logsLoading,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 1000, // 1 second
    refetchInterval: 3000 // Poll every 3 seconds
  });
  
  // Determine if there are any in-progress logs
  const hasInProgressLogs = useMemo(() => {
    if (!updateLogs) return false;
    return updateLogs.some(log => log.status === 'In Progress');
  }, [updateLogs]);
  
  // Dynamically adjust the polling rate based on in-progress activity
  useEffect(() => {
    // If there are in-progress logs, temporarily increase the polling frequency
    if (hasInProgressLogs) {
      const interval = setInterval(() => {
        refetchLogs();
      }, 2000); // Poll every 2 seconds during active operations
      
      return () => clearInterval(interval);
    }
  }, [hasInProgressLogs, refetchLogs]);
  
  // Clear logs mutation
  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/data-updates/logs'),
    onSuccess: () => {
      toast({
        title: "Logs cleared",
        description: "All system logs have been cleared",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Failed to clear logs",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update all holdings mutation
  const updateAllHoldingsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/holdings/update'),
    onSuccess: () => {
      toast({
        title: "Holdings updated",
        description: "All portfolio holdings have been updated",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Failed to update holdings",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update USD holdings mutation
  const updateUSDHoldingsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/holdings/update/USD'),
    onSuccess: () => {
      toast({
        title: "USD Holdings updated",
        description: "USD portfolio holdings have been updated",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Failed to update USD holdings", 
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update CAD holdings mutation
  const updateCADHoldingsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/data-management/update-holdings/CAD'),
    onSuccess: () => {
      toast({
        title: "CAD Holdings updated",
        description: "CAD portfolio holdings have been updated",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Failed to update CAD holdings",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Update INTL holdings mutation
  const updateINTLHoldingsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/data-management/update-holdings/INTL'),
    onSuccess: () => {
      toast({
        title: "INTL Holdings updated",
        description: "INTL portfolio holdings have been updated",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Failed to update INTL holdings",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Process and consolidate logs
  const processedLogs = useMemo(() => {
    if (!updateLogs) return [];
    
    // Further classify logs by type and detail content to better group related operations
    const operationGroups = {};
    
    // First pass: classify logs into operation groups
    updateLogs.forEach(log => {
      try {
        // For historical price updates, we want to group by whether they're portfolio-specific
        // or "all portfolios" operations
        let groupKey = log.type;
        
        // Parse log details to extract more information
        const details = JSON.parse(log.details || '{}');
          
        // Check if this is an "all portfolios" update
        const isAllPortfolios = details.message && details.message.includes('all portfolios');
        
        if (log.type === 'historical_prices') {
          if (isAllPortfolios) {
            // For "all portfolios" updates, use a special key
            groupKey = `${log.type}_all`;
          } else if (details.portfolios) {
            // For specific portfolio groups
            groupKey = `${log.type}_${details.portfolios.join('_')}`;
          } else if (details.region) {
            // For individual region updates, group under a region-specific key
            groupKey = `${log.type}_region_${details.region}`;
          }
        } else if (log.type === 'current_prices') {
          if (isAllPortfolios) {
            // For "all portfolios" updates, use a special key
            groupKey = `${log.type}_all`;
          } else if (details.region) {
            // For individual region updates, group under a region-specific key
            groupKey = `${log.type}_region_${details.region}`;
          }
        }
        
        if (!operationGroups[groupKey]) {
          operationGroups[groupKey] = [];
        }
        operationGroups[groupKey].push(log);
      } catch (e) {
        // If parsing fails, use the log type as the key
        const groupKey = log.type;
        if (!operationGroups[groupKey]) {
          operationGroups[groupKey] = [];
        }
        operationGroups[groupKey].push(log);
      }
    });
    
    // For each operation group, consolidate logs
    const consolidatedLogs = [];
    
    // Check if we have a successful "all portfolios" update for historical prices
    const hasAllPortfoliosHistoricalPrices = Object.keys(operationGroups).some(key => 
      key === 'historical_prices_all' && 
      operationGroups[key].some(log => log.status === 'Success')
    );
    
    // Check if we have a successful "all portfolios" update for current prices
    const hasAllPortfoliosCurrentPrices = Object.keys(operationGroups).some(key => 
      key === 'current_prices_all' && 
      operationGroups[key].some(log => log.status === 'Success')
    );
    
    // Filter out individual region updates if we have an "all portfolios" update
    const filteredGroups = Object.entries(operationGroups).filter(([key, logs]) => {
      // If we have a successful "all portfolios" update for historical prices, skip region-specific historical logs
      if (hasAllPortfoliosHistoricalPrices && key.startsWith('historical_prices_region_')) {
        return false;
      }
      
      // If we have a successful "all portfolios" update for current prices, skip region-specific current price logs
      if (hasAllPortfoliosCurrentPrices && key.startsWith('current_prices_region_')) {
        return false;
      }
      
      return true;
    });
    
    filteredGroups.forEach(([_, logs]) => {
      // Sort logs by timestamp descending (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Find the latest success or error log
      const latestCompleted = logs.find(log => log.status === 'Success' || log.status === 'Error');
      
      if (latestCompleted) {
        // If we have completed logs, filter out duplicates and in-progress logs
        // Keep only the most recent Success/Error and any newer In Progress logs
        const filteredLogs = logs.filter(log => {
          // Always keep the latest completed log
          if (log.id === latestCompleted.id) return true;
          
          // Keep in-progress logs newer than our latest completed log
          if (log.status === 'In Progress' && 
              new Date(log.timestamp).getTime() > new Date(latestCompleted.timestamp).getTime()) {
            return true;
          }
          
          // Filter out all other logs of the same status as our latest completed
          if (log.status === latestCompleted.status) return false;
          
          // Keep other error logs (even if we have a success)
          if (log.status === 'Error' && latestCompleted.status === 'Success') return true;
          
          // Default: filter out
          return false;
        });
        
        consolidatedLogs.push(...filteredLogs);
      } else {
        // If no completed log, keep all logs
        consolidatedLogs.push(...logs);
      }
    });
    
    // Sort all logs by timestamp descending
    return consolidatedLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [updateLogs]);
  
  // Mutations for triggering manual updates
  const updateCurrentPricesMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/current-prices/fetch/all'),
    onSuccess: () => {
      toast({
        title: "Current prices updated",
        description: "Successfully updated current prices for all portfolios",
      });
      refetchLogs();
      queryClient.invalidateQueries({ queryKey: ['/api/current-prices/USD'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-prices/CAD'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-prices/INTL'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update current prices",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateHistoricalPricesMutation = useMutation({
    mutationFn: (region: string) => 
      apiRequest('POST', `/api/historical-prices/fetch/portfolio/${region}`),
    onSuccess: (_, region) => {
      toast({
        title: "Historical prices updated",
        description: `Successfully updated historical prices for ${region} portfolio`,
      });
      refetchLogs();
      queryClient.invalidateQueries({ queryKey: ['/api/historical-prices/region'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update historical prices",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateAllHistoricalPricesMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/historical-prices/fetch/all'),
    onSuccess: () => {
      toast({
        title: "All historical prices updated",
        description: "Successfully updated historical prices for all portfolios",
      });
      refetchLogs();
      queryClient.invalidateQueries({ queryKey: ['/api/historical-prices/region'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update all historical prices",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Holdings update mutations are defined lower in the file
  
  // Mutation for updating scheduler config
  const updateSchedulerConfigMutation = useMutation({
    mutationFn: ({ type, config }: { type: string, config: any }) => 
      apiRequest('POST', `/api/scheduler/config/${type}`, config),
    onSuccess: () => {
      toast({
        title: "Scheduler configuration updated",
        description: "Successfully updated scheduler configuration",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/config'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update scheduler configuration",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handler for toggling scheduler enabled states
  const handleToggleScheduler = (type: 'current_prices' | 'historical_prices', enabled: boolean) => {
    updateSchedulerConfigMutation.mutate({
      type,
      config: { enabled }
    });
  };
  
  // Format the details JSON from the update logs
  const formatDetails = (detailsJson: string) => {
    try {
      const details = JSON.parse(detailsJson);
      if (details.error) {
        return details.error;
      }
      
      // Always show message as is - it should already contain execution time
      return details.message || JSON.stringify(details, null, 2);
    } catch (e) {
      return detailsJson;
    }
  };
  
  // Extract and format progress information from log details
  const extractProgress = (detailsJson: string) => {
    try {
      const details = JSON.parse(detailsJson);
      
      // If we have explicit progress data, use it
      if (details.progress && typeof details.progress === 'object') {
        const current = details.progress.current || 0;
        const total = details.progress.total || 1;
        const percent = Math.round((current / total) * 100);
        return { current, total, percent };
      }
      
      // For current prices, check if we have results data with counts
      if (details.results) {
        let current = 0;
        let total = 0;
        
        // Sum up success counts across all regions
        Object.values(details.results).forEach((region: any) => {
          if (region.successCount !== undefined && region.totalSymbols !== undefined) {
            current += region.successCount;
            total += region.totalSymbols;
          }
        });
        
        if (total > 0) {
          return {
            current,
            total,
            percent: Math.round((current / total) * 100)
          };
        }
      }
      
      // For historical prices, look for symbols info in the message
      if (details.message && typeof details.message === 'string') {
        const match = details.message.match(/Processing (\w+) \((\w+)\) - (\d+)\/(\d+)/);
        if (match) {
          const current = parseInt(match[3]);
          const total = parseInt(match[4]);
          if (!isNaN(current) && !isNaN(total)) {
            return {
              current,
              total,
              percent: Math.round((current / total) * 100)
            };
          }
        }
      }
      
      return null;
    } catch (e) {
      console.error("Error parsing progress data:", e);
      return null;
    }
  };
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">DATA MANAGEMENT</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#FFCA28]"></div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#0B1728]/80 px-2.5 py-1 rounded-md border border-[#1A304A]">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full mr-1"></div>
              <span className="text-[#7A8999] font-mono">SCHEDULER:</span>
              <span className="ml-1 text-[#EFEFEF] font-mono">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-3 sm:gap-4">
        {/* Update Panels - Top Row */}
        <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
          <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                <FileBarChart className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#FFCA28]" />
                PORTFOLIO HOLDINGS
              </CardTitle>
              <Button 
                variant="default" 
                onClick={() => updateAllHoldingsMutation.mutate()}
                disabled={updateAllHoldingsMutation.isPending}
                className="bg-[#FFCA28] hover:bg-[#FFA000] text-black rounded-sm h-8 px-2 sm:px-3 py-1 text-xs sm:text-sm w-full sm:w-auto"
                size="sm"
              >
                {updateAllHoldingsMutation.isPending ? (
                  <>
                    <div className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                    RUNNING
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">UPDATE ALL HOLDINGS</span>
                    <span className="inline sm:hidden">UPDATE ALL</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-4">
            <div className="text-xs text-[#EFEFEF] mb-3">
              Update pre-calculated metrics in portfolio holdings tables including NAV, weights, benchmark comparison, and performance data.
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                onClick={() => updateUSDHoldingsMutation.mutate()}
                disabled={updateUSDHoldingsMutation.isPending}
                className="bg-[#1C2938] hover:bg-[#243447] text-[#38AAFD] border-[#1A304A] font-mono text-xs"
              >
                {updateUSDHoldingsMutation.isPending ? (
                  <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-[#38AAFD] border-t-transparent"></div>
                ) : (
                  <RotateCw className="h-3 w-3 mr-1" />
                )}
                USD
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => updateCADHoldingsMutation.mutate()}
                disabled={updateCADHoldingsMutation.isPending}
                className="bg-[#1C2938] hover:bg-[#243447] text-[#4CAF50] border-[#1A304A] font-mono text-xs"
              >
                {updateCADHoldingsMutation.isPending ? (
                  <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-[#4CAF50] border-t-transparent"></div>
                ) : (
                  <RotateCw className="h-3 w-3 mr-1" />
                )}
                CAD
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => updateINTLHoldingsMutation.mutate()}
                disabled={updateINTLHoldingsMutation.isPending}
                className="bg-[#1C2938] hover:bg-[#243447] text-[#FFCA28] border-[#1A304A] font-mono text-xs"
              >
                {updateINTLHoldingsMutation.isPending ? (
                  <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-[#FFCA28] border-t-transparent"></div>
                ) : (
                  <RotateCw className="h-3 w-3 mr-1" />
                )}
                INTL
              </Button>
            </div>
            <div className="mt-3 text-xs text-[#7A8999] border-t border-[#1A304A] pt-3">
              Cash balances are used in all portfolio calculations for NAV and weights
            </div>
          </CardContent>
        </Card>

        {/* Cash Management Panel */}
        <CashManagementPanel className="shadow-lg" />
        
        {/* Update Panels - Real-time and Historical Data Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
            <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                  <BarChart4 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#38AAFD]" />
                  REAL-TIME UPDATES
                </CardTitle>
                <Button 
                  variant="default" 
                  onClick={() => updateCurrentPricesMutation.mutate()}
                  disabled={updateCurrentPricesMutation.isPending}
                  className="bg-[#38AAFD] hover:bg-[#1D90E0] text-white rounded-sm h-8 px-2 sm:px-3 py-1 text-xs sm:text-sm w-full sm:w-auto"
                  size="sm"
                >
                  {updateCurrentPricesMutation.isPending ? (
                    <>
                      <div className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      RUNNING
                    </>
                  ) : (
                    <>
                      <RotateCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">UPDATE CURRENT PRICES</span>
                      <span className="inline sm:hidden">UPDATE PRICES</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-4">
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">MODE:</span>
                  <span className="text-[#EFEFEF]">ALL PORTFOLIOS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">REGIONS:</span>
                  <span className="text-[#EFEFEF]">USD | CAD | INTL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">SCHEDULED:</span>
                  <span className={`${schedulerConfig?.current_prices.enabled ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
                    {schedulerConfig?.current_prices.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">INTERVAL:</span>
                  <span className="text-[#EFEFEF]">{schedulerConfig?.current_prices.intervalMinutes} MIN</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-[#7A8999] border-t border-[#1A304A] pt-3">
                Updates include current price, percent change, volume, and other market metrics.
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
            <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                  <LineChart className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#4CAF50]" />
                  HISTORICAL DATA
                </CardTitle>
                <Button 
                  variant="default" 
                  onClick={() => updateAllHistoricalPricesMutation.mutate()}
                  disabled={updateHistoricalPricesMutation.isPending || updateAllHistoricalPricesMutation.isPending}
                  className="bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-sm h-8 px-2 sm:px-3 py-1 text-xs sm:text-sm w-full sm:w-auto"
                  size="sm"
                >
                  {updateAllHistoricalPricesMutation.isPending ? (
                    <>
                      <div className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      RUNNING
                    </>
                  ) : (
                    <>
                      <RotateCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">UPDATE ALL HISTORICAL DATA</span>
                      <span className="inline sm:hidden">UPDATE HISTORY</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-4">
              <div className="font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">MODE:</span>
                  <span className="text-[#EFEFEF]">ALL PORTFOLIOS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">REGIONS:</span>
                  <span className="text-[#EFEFEF]">USD | CAD | INTL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">SCHEDULED:</span>
                  <span className={`${schedulerConfig?.historical_prices.enabled ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
                    {schedulerConfig?.historical_prices.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A8999]">DAILY RUN:</span>
                  <span className="text-[#EFEFEF]">{schedulerConfig?.historical_prices.timeOfDay}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Update Logs Section */}
        <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
          <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                <Terminal className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#FFCA28]" />
                SYSTEM LOGS
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => clearLogsMutation.mutate()}
                  disabled={clearLogsMutation.isPending || !updateLogs || updateLogs.length === 0}
                  className="h-7 border-[#1A304A] text-[#EFEFEF] bg-transparent hover:bg-[#1A304A] rounded-sm text-xs"
                >
                  <Trash2 className="mr-1 sm:mr-2 h-3 w-3 text-[#F44336]" />
                  <span className="hidden xs:inline">CLEAR LOGS</span>
                  <span className="inline xs:hidden">CLEAR</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchLogs()}
                  className="h-7 border-[#1A304A] text-[#EFEFEF] bg-transparent hover:bg-[#1A304A] rounded-sm text-xs"
                >
                  <RotateCw className="mr-1 sm:mr-2 h-3 w-3" />
                  <span className="hidden xs:inline">REFRESH</span>
                  <span className="inline xs:hidden">REFRESH</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38AAFD]"></div>
              </div>
            ) : !processedLogs || processedLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#7A8999]">
                <History className="h-12 w-12 mb-2 opacity-30" />
                <p className="font-mono">NO UPDATE LOGS AVAILABLE</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] w-full">
                <div className="p-3">
                  <div className="grid grid-cols-1 gap-0">
                    {processedLogs.map((log: DataUpdateLog) => (
                      <div 
                        key={log.id} 
                        className="py-2 border-b border-[#1A304A] last:border-b-0"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-1">
                          <div className="flex flex-wrap items-center gap-1">
                            {log.type === 'current_prices' ? (
                              <BarChart4 className="h-4 w-4 text-[#38AAFD] flex-shrink-0" />
                            ) : (
                              <LineChart className="h-4 w-4 text-[#4CAF50] flex-shrink-0" />
                            )}
                            <span className="font-mono text-xs sm:text-sm text-[#EFEFEF] mr-1">
                              {log.type === 'current_prices' ? 'CURRENT PRICES' : 'HISTORICAL PRICES'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-mono ${
                              log.status === 'Success' ? 'bg-[#0D3A21] text-[#4CAF50]' : 
                              log.status === 'In Progress' ? 'bg-[#3A2F10] text-[#FFCA28]' : 
                              'bg-[#3A1A1A] text-[#F44336]'
                            }`}>
                              {log.status === 'Success' ? (
                                <span className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  SUCCESS
                                </span>
                              ) : log.status === 'In Progress' ? (
                                <span className="flex items-center">
                                  <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-[#FFCA28] border-t-transparent"></div>
                                  IN PROGRESS
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  ERROR
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-[#7A8999] ml-6 sm:ml-0 mt-1 sm:mt-0">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4 sm:ml-6 mt-1 text-xs font-mono text-[#C0C0C0] bg-[#081120] p-2 rounded-none border-l-2 border-[#1A304A]">
                          {formatDetails(log.details)}
                          
                          {/* Progress bar for In Progress status */}
                          {log.status === 'In Progress' && extractProgress(log.details) && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-[#7A8999]">PROGRESS:</span>
                                <span className="text-[#FFCA28]">
                                  {extractProgress(log.details)?.current} / {extractProgress(log.details)?.total} ({extractProgress(log.details)?.percent}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-[#111E2E] overflow-hidden">
                                <div 
                                  className="h-full bg-[#FFCA28]" 
                                  style={{ width: `${extractProgress(log.details)?.percent || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        {/* Scheduler Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {configLoading ? (
            <div className="col-span-2 flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#38AAFD]"></div>
            </div>
          ) : schedulerConfig && (
            <>
              <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
                <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                      <BarChart4 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#38AAFD]" />
                      CURRENT PRICES
                    </CardTitle>
                    <div className="bg-[#38AAFD]/20 text-[#38AAFD] text-xs px-2 py-0.5 font-mono rounded-sm">
                      SCHEDULER
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-3 sm:pt-4">
                  <div className="font-mono text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A8999]">SCHEDULER:</span>
                      <Switch 
                        id="current-price-enabled" 
                        checked={schedulerConfig.current_prices.enabled} 
                        onCheckedChange={(checked) => handleToggleScheduler('current_prices', checked)}
                        disabled={updateSchedulerConfigMutation.isPending}
                        className="scale-90 sm:scale-100"
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">STATUS:</span>
                      <span className={`${schedulerConfig.current_prices.enabled ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
                        {schedulerConfig.current_prices.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">INTERVAL:</span>
                      <span className="text-[#EFEFEF]">{schedulerConfig.current_prices.intervalMinutes} MIN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">MARKET HOURS:</span>
                      <span className="text-[#EFEFEF]">{schedulerConfig.current_prices.startTime} - {schedulerConfig.current_prices.endTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">SKIP WEEKENDS:</span>
                      <span className="text-[#EFEFEF]">{schedulerConfig.current_prices.skipWeekends ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-[#7A8999] border-t border-[#1A304A] pt-3">
                    Updates include current price, percent change, volume, and other market metrics.
                  </div>
                </CardContent>
                <CardFooter className="bg-[#0D1C30] border-t border-[#1A304A] p-2 text-xs text-[#7A8999]">
                  <InfoIcon className="h-4 w-4 mr-2 text-gray-500" />
                  Current prices update every {schedulerConfig.current_prices.intervalMinutes} minutes during market hours
                </CardFooter>
              </Card>
              
              <Card className="bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg">
                <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
                      <LineChart className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#4CAF50]" />
                      HISTORICAL DATA
                    </CardTitle>
                    <div className="bg-[#4CAF50]/20 text-[#4CAF50] text-xs px-2 py-0.5 font-mono rounded-sm">
                      SCHEDULER
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-3 sm:pt-4">
                  <div className="font-mono text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A8999]">SCHEDULER:</span>
                      <Switch 
                        id="hist-price-enabled" 
                        checked={schedulerConfig.historical_prices.enabled} 
                        onCheckedChange={(checked) => handleToggleScheduler('historical_prices', checked)}
                        disabled={updateSchedulerConfigMutation.isPending}
                        className="scale-90 sm:scale-100"
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">STATUS:</span>
                      <span className={`${schedulerConfig.historical_prices.enabled ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
                        {schedulerConfig.historical_prices.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">RUN TIME:</span>
                      <span className="text-[#EFEFEF]">{schedulerConfig.historical_prices.timeOfDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7A8999]">SKIP WEEKENDS:</span>
                      <span className="text-[#EFEFEF]">{schedulerConfig.historical_prices.skipWeekends ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-[#7A8999] border-t border-[#1A304A] pt-3">
                    Performs incremental fetching, only retrieving data since the last successful update.
                  </div>
                </CardContent>
                <CardFooter className="bg-[#0D1C30] border-t border-[#1A304A] p-2 text-xs text-[#7A8999]">
                  <InfoIcon className="h-4 w-4 mr-2 text-gray-500" />
                  Historical prices update once daily at {schedulerConfig.historical_prices.timeOfDay}
                </CardFooter>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
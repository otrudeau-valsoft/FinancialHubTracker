import { useState, useEffect } from 'react';
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
  Info as InfoIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { utcToZonedTime, format } from 'date-fns-tz';

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
  status: 'Success' | 'Error';
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
  
  // Fetch update logs
  const { 
    data: updateLogs,
    isLoading: logsLoading,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 30 * 1000 // 30 seconds
  });
  
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
      return details.message || JSON.stringify(details, null, 2);
    } catch (e) {
      return detailsJson;
    }
  };
  
  // Format timestamp to display in EST
  const formatTimestampToEST = (timestamp: string) => {
    const date = new Date(timestamp);
    const estDate = utcToZonedTime(date, 'America/New_York');
    return formatDistanceToNow(estDate, { addSuffix: true });
  };
  
  // Format timestamp to display exact EST time
  const formatExactESTTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const estDate = utcToZonedTime(date, 'America/New_York');
    return format(estDate, 'MM/dd/yyyy, h:mm:ss a (EST)');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100">Data Management</h1>
        <p className="text-gray-400 mt-2">Manage data updates and configure automated scheduling</p>
      </div>
      
      <div className="grid gap-6">
        {/* Update History Section */}
        <Card className="bg-[#0A1929] border-gray-800">
          <CardHeader className="bg-[#111E2E] border-b border-gray-800">
            <CardTitle className="text-gray-100 flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Data Update Logs
            </CardTitle>
            <CardDescription className="text-gray-400">
              History of all data updates to the system
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : !updateLogs || updateLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <History className="h-12 w-12 mb-2 opacity-30" />
                <p>No update logs available</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] w-full">
                <div className="p-4">
                  {updateLogs.map((log: DataUpdateLog) => (
                    <div 
                      key={log.id} 
                      className="mb-4 p-4 rounded-md border border-gray-800 bg-[#0E1F30]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {log.type === 'current_prices' ? (
                            <BarChart4 className="h-5 w-5 mr-2 text-blue-400" />
                          ) : (
                            <LineChart className="h-5 w-5 mr-2 text-green-400" />
                          )}
                          <span className="font-medium text-gray-200">
                            {log.type === 'current_prices' ? 'Current Price Update' : 'Historical Price Update'}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            log.status === 'Success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {log.status === 'Success' ? (
                              <span className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Success
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <XCircle className="h-3 w-3 mr-1" />
                                Error
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 hover:text-gray-300 cursor-help" title={formatExactESTTime(log.timestamp)}>
                          {formatTimestampToEST(log.timestamp)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-400 bg-[#0A1929] p-2 rounded-md">
                        {formatDetails(log.details)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter className="bg-[#111E2E] border-t border-gray-800 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchLogs()}
              className="border-gray-700 text-gray-300 hover:bg-blue-900/20 hover:text-white"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Refresh Logs
            </Button>
          </CardFooter>
        </Card>
        
        {/* Manual Updates Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-[#0A1929] border-gray-800">
            <CardHeader className="bg-[#111E2E] border-b border-gray-800">
              <CardTitle className="text-gray-100 flex items-center">
                <BarChart4 className="mr-2 h-5 w-5 text-blue-400" />
                Current Prices
              </CardTitle>
              <CardDescription className="text-gray-400">
                Fetch real-time market prices for all portfolio stocks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-4">
                This will update the current market prices for all stocks across USD, CAD, and INTL portfolios.
                Updated data includes current price, market change, and other market data points.
              </p>
            </CardContent>
            <CardFooter className="bg-[#111E2E] border-t border-gray-800 justify-end">
              <Button 
                variant="default" 
                onClick={() => updateCurrentPricesMutation.mutate()}
                disabled={updateCurrentPricesMutation.isPending}
                className="bg-blue-700 hover:bg-blue-600 text-white"
              >
                {updateCurrentPricesMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Update Current Prices
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="bg-[#0A1929] border-gray-800">
            <CardHeader className="bg-[#111E2E] border-b border-gray-800">
              <CardTitle className="text-gray-100 flex items-center">
                <LineChart className="mr-2 h-5 w-5 text-green-400" />
                Historical Prices
              </CardTitle>
              <CardDescription className="text-gray-400">
                Fetch historical price data for all portfolio stocks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-4">
                This will fetch and update historical price data for all stocks. You can update a single
                regional portfolio or all portfolios at once.
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateHistoricalPricesMutation.mutate('USD')}
                  disabled={updateHistoricalPricesMutation.isPending || updateAllHistoricalPricesMutation.isPending}
                  className="border-gray-700 text-gray-300 hover:bg-blue-900/20 hover:text-white"
                >
                  USD Portfolio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateHistoricalPricesMutation.mutate('CAD')}
                  disabled={updateHistoricalPricesMutation.isPending || updateAllHistoricalPricesMutation.isPending}
                  className="border-gray-700 text-gray-300 hover:bg-blue-900/20 hover:text-white"
                >
                  CAD Portfolio
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateHistoricalPricesMutation.mutate('INTL')}
                  disabled={updateHistoricalPricesMutation.isPending || updateAllHistoricalPricesMutation.isPending}
                  className="border-gray-700 text-gray-300 hover:bg-blue-900/20 hover:text-white"
                >
                  INTL Portfolio
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-[#111E2E] border-t border-gray-800 justify-end">
              <Button 
                variant="default" 
                onClick={() => updateAllHistoricalPricesMutation.mutate()}
                disabled={updateHistoricalPricesMutation.isPending || updateAllHistoricalPricesMutation.isPending}
                className="bg-green-700 hover:bg-green-600 text-white"
              >
                {updateAllHistoricalPricesMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Update All Historical Prices
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Scheduler Configuration Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {configLoading ? (
            <div className="col-span-2 flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : schedulerConfig && (
            <>
              <Card className="bg-[#0A1929] border-gray-800">
                <CardHeader className="bg-[#111E2E] border-b border-gray-800">
                  <CardTitle className="text-gray-100 flex items-center">
                    <BarChart4 className="mr-2 h-5 w-5 text-blue-400" />
                    Current Price Updates
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure automated current price data updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="current-price-enabled" className="text-gray-300">Enable scheduler</Label>
                      <Switch 
                        id="current-price-enabled" 
                        checked={schedulerConfig.current_prices.enabled} 
                        onCheckedChange={(checked) => handleToggleScheduler('current_prices', checked)}
                        disabled={updateSchedulerConfigMutation.isPending}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="interval-minutes" className="text-gray-300">Update interval (minutes)</Label>
                      <Input 
                        id="interval-minutes" 
                        type="number" 
                        min={5}
                        value={schedulerConfig.current_prices.intervalMinutes} 
                        disabled={true}
                        className="bg-[#0E1F30] border-gray-700 text-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        Set to {schedulerConfig.current_prices.intervalMinutes} minute intervals
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-gray-300">Start time (EST)</Label>
                      <Input 
                        id="start-time" 
                        type="time" 
                        value={schedulerConfig.current_prices.startTime} 
                        disabled={true}
                        className="bg-[#0E1F30] border-gray-700 text-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        Updates will run between {schedulerConfig.current_prices.startTime} and {schedulerConfig.current_prices.endTime} EST
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <Label htmlFor="skip-weekends-current" className="text-gray-300">Skip weekends</Label>
                      <Switch 
                        id="skip-weekends-current" 
                        checked={schedulerConfig.current_prices.skipWeekends}
                        disabled={true}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#111E2E] border-t border-gray-800 text-xs text-gray-500">
                  <InfoIcon className="h-4 w-4 mr-2 text-gray-500" />
                  Current prices update every {schedulerConfig.current_prices.intervalMinutes} minutes during market hours
                </CardFooter>
              </Card>
              
              <Card className="bg-[#0A1929] border-gray-800">
                <CardHeader className="bg-[#111E2E] border-b border-gray-800">
                  <CardTitle className="text-gray-100 flex items-center">
                    <LineChart className="mr-2 h-5 w-5 text-green-400" />
                    Historical Price Updates
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure automated historical price data updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hist-price-enabled" className="text-gray-300">Enable scheduler</Label>
                      <Switch 
                        id="hist-price-enabled" 
                        checked={schedulerConfig.historical_prices.enabled} 
                        onCheckedChange={(checked) => handleToggleScheduler('historical_prices', checked)}
                        disabled={updateSchedulerConfigMutation.isPending}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time-of-day" className="text-gray-300">Time of day (EST)</Label>
                      <Input 
                        id="time-of-day" 
                        type="time" 
                        value={schedulerConfig.historical_prices.timeOfDay} 
                        disabled={true}
                        className="bg-[#0E1F30] border-gray-700 text-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        Daily update at {schedulerConfig.historical_prices.timeOfDay} EST
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <Label htmlFor="skip-weekends-hist" className="text-gray-300">Skip weekends</Label>
                      <Switch 
                        id="skip-weekends-hist" 
                        checked={schedulerConfig.historical_prices.skipWeekends}
                        disabled={true}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#111E2E] border-t border-gray-800 text-xs text-gray-500">
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
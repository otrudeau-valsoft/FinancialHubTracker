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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LineChart
} from 'lucide-react';
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
  status: 'Success' | 'Error';
  details: string;
  timestamp: string;
};

export default function DataManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('updates');
  
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
    mutationFn: () => apiRequest('/api/current-prices/fetch/all', { method: 'POST' }),
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
      apiRequest(`/api/historical-prices/fetch/portfolio/${region}`, { method: 'POST' }),
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
    mutationFn: () => apiRequest('/api/historical-prices/fetch/all', { method: 'POST' }),
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
      apiRequest(`/api/scheduler/config/${type}`, { 
        method: 'POST',
        data: config
      }),
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
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100">Data Management</h1>
        <p className="text-gray-400 mt-2">Manage data updates and configure automated scheduling</p>
      </div>
      
      <Tabs defaultValue="updates" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#111E2E] border border-gray-800">
          <TabsTrigger value="updates" className="data-[state=active]:bg-blue-900/30">
            <History className="mr-2 h-4 w-4" />
            Update History
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-blue-900/30">
            <RotateCw className="mr-2 h-4 w-4" />
            Manual Updates
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="data-[state=active]:bg-blue-900/30">
            <Clock className="mr-2 h-4 w-4" />
            Scheduler Config
          </TabsTrigger>
        </TabsList>
        
        {/* Update History Tab */}
        <TabsContent value="updates" className="mt-4">
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
                <ScrollArea className="h-[500px] w-full">
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
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
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
        </TabsContent>
        
        {/* Manual Updates Tab */}
        <TabsContent value="manual" className="mt-4 grid gap-4 md:grid-cols-2">
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
        </TabsContent>
        
        {/* Scheduler Configuration Tab */}
        <TabsContent value="scheduler" className="mt-4 grid gap-4 md:grid-cols-2">
          {configLoading ? (
            <div className="col-span-2 flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : schedulerConfig && (
            <>
              <Card className="bg-[#0A1929] border-gray-800">
                <CardHeader className="bg-[#111E2E] border-b border-gray-800">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-gray-100 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-blue-400" />
                      Current Prices Scheduler
                    </CardTitle>
                    <Switch 
                      checked={schedulerConfig.current_prices.enabled}
                      onCheckedChange={(checked) => handleToggleScheduler('current_prices', checked)}
                      disabled={updateSchedulerConfigMutation.isPending}
                    />
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure automatic updates for current market prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interval" className="text-gray-400">Update Interval (minutes)</Label>
                      <select 
                        id="interval"
                        value={schedulerConfig.current_prices.intervalMinutes}
                        onChange={(e) => updateSchedulerConfigMutation.mutate({
                          type: 'current_prices',
                          config: { intervalMinutes: parseInt(e.target.value) }
                        })}
                        className="w-full p-2 rounded-md border border-gray-700 bg-[#111E2E] text-gray-200"
                        disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.current_prices.enabled}
                      >
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skip-weekends" className="text-gray-400">Weekend Updates</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch 
                          id="skip-weekends"
                          checked={!schedulerConfig.current_prices.skipWeekends}
                          onCheckedChange={(checked) => updateSchedulerConfigMutation.mutate({
                            type: 'current_prices',
                            config: { skipWeekends: !checked }
                          })}
                          disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.current_prices.enabled}
                        />
                        <Label htmlFor="skip-weekends" className="cursor-pointer text-sm">
                          {schedulerConfig.current_prices.skipWeekends ? 'Skip weekends' : 'Include weekends'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-gray-400">Market Hours Start</Label>
                      <input 
                        id="start-time"
                        type="time"
                        value={schedulerConfig.current_prices.startTime}
                        onChange={(e) => updateSchedulerConfigMutation.mutate({
                          type: 'current_prices',
                          config: { startTime: e.target.value }
                        })}
                        className="w-full p-2 rounded-md border border-gray-700 bg-[#111E2E] text-gray-200"
                        disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.current_prices.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-gray-400">Market Hours End</Label>
                      <input 
                        id="end-time"
                        type="time"
                        value={schedulerConfig.current_prices.endTime}
                        onChange={(e) => updateSchedulerConfigMutation.mutate({
                          type: 'current_prices',
                          config: { endTime: e.target.value }
                        })}
                        className="w-full p-2 rounded-md border border-gray-700 bg-[#111E2E] text-gray-200"
                        disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.current_prices.enabled}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#111E2E] border-t border-gray-800 text-xs text-gray-500">
                  Updates will run every {schedulerConfig.current_prices.intervalMinutes} minutes 
                  between {schedulerConfig.current_prices.startTime} and {schedulerConfig.current_prices.endTime}
                  {schedulerConfig.current_prices.skipWeekends ? ', excluding weekends' : ''}
                </CardFooter>
              </Card>
              
              <Card className="bg-[#0A1929] border-gray-800">
                <CardHeader className="bg-[#111E2E] border-b border-gray-800">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-gray-100 flex items-center">
                      <Calendar className="mr-2 h-5 w-5 text-green-400" />
                      Historical Prices Scheduler
                    </CardTitle>
                    <Switch 
                      checked={schedulerConfig.historical_prices.enabled}
                      onCheckedChange={(checked) => handleToggleScheduler('historical_prices', checked)} 
                      disabled={updateSchedulerConfigMutation.isPending}
                    />
                  </div>
                  <CardDescription className="text-gray-400">
                    Configure daily updates for historical price data
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time-of-day" className="text-gray-400">Time of Day</Label>
                      <input 
                        id="time-of-day"
                        type="time"
                        value={schedulerConfig.historical_prices.timeOfDay}
                        onChange={(e) => updateSchedulerConfigMutation.mutate({
                          type: 'historical_prices',
                          config: { timeOfDay: e.target.value }
                        })}
                        className="w-full p-2 rounded-md border border-gray-700 bg-[#111E2E] text-gray-200"
                        disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.historical_prices.enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hist-skip-weekends" className="text-gray-400">Weekend Updates</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch 
                          id="hist-skip-weekends"
                          checked={!schedulerConfig.historical_prices.skipWeekends}
                          onCheckedChange={(checked) => updateSchedulerConfigMutation.mutate({
                            type: 'historical_prices',
                            config: { skipWeekends: !checked }
                          })}
                          disabled={updateSchedulerConfigMutation.isPending || !schedulerConfig.historical_prices.enabled}
                        />
                        <Label htmlFor="hist-skip-weekends" className="cursor-pointer text-sm">
                          {schedulerConfig.historical_prices.skipWeekends ? 'Skip weekends' : 'Include weekends'}
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-400">
                      Historical price updates run once per day at the specified time. These updates fetch price data
                      since the last update for each stock in all three portfolios.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#111E2E] border-t border-gray-800 text-xs text-gray-500">
                  Updates will run daily at {schedulerConfig.historical_prices.timeOfDay}
                  {schedulerConfig.historical_prices.skipWeekends ? ', excluding weekends' : ''}
                </CardFooter>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
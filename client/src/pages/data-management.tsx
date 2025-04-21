import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Calendar,
  BarChart4,
  Database,
  History
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";

// Types
interface DataUpdateLog {
  id: number;
  type: string; // 'current_price' or 'historical_price'
  region: string;
  symbol?: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  timestamp: string;
  affectedRows?: number;
}

interface ScheduleConfig {
  enabled: boolean;
  interval: number; // minutes
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  lastRun?: string;
  nextRun?: string;
}

// Mock scheduler configs (will be replaced with actual API data)
const defaultSchedules = {
  current_prices: {
    enabled: true,
    interval: 10, // minutes
    startTime: "09:30",
    endTime: "16:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    lastRun: new Date().toISOString(),
    nextRun: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  },
  historical_prices: {
    enabled: true,
    interval: 1440, // once a day
    startTime: "16:30",
    endTime: "17:30",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    lastRun: new Date().toISOString(),
    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
};

export default function DataManagement() {
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("USD");
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [activeTab, setActiveTab] = useState("current-prices");

  // Fetch current prices
  const { data: currentPrices, isLoading: pricesLoading, refetch: refetchPrices } = useQuery({
    queryKey: [`/api/current-prices/${selectedRegion}`],
    staleTime: 60000, // 1 minute
  });

  // Fetch update logs
  const { data: updateLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/data-updates/logs'],
    staleTime: 60000,
    // For now we'll mock this until the API is built
    queryFn: async () => {
      const now = new Date();
      const mockLogs: DataUpdateLog[] = [
        {
          id: 1,
          type: 'current_price',
          region: 'USD',
          status: 'success',
          message: 'Updated 20 stocks',
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          affectedRows: 20
        },
        {
          id: 2,
          type: 'current_price',
          region: 'CAD',
          status: 'success',
          message: 'Updated 15 stocks',
          timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          affectedRows: 15
        },
        {
          id: 3,
          type: 'historical_price',
          region: 'USD',
          status: 'success',
          message: 'Updated historical prices for all USD stocks',
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          affectedRows: 20
        }
      ];
      return mockLogs;
    }
  });

  // Mutation for updating current prices
  const { mutate: updateCurrentPrices, isPending: isUpdatingPrices } = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/current-prices/fetch/portfolio/${selectedRegion}`, {});
    },
    onSuccess: () => {
      refetchPrices();
      refetchLogs();
    }
  });

  // Mutation for updating historical prices
  const { mutate: updateHistoricalPrices, isPending: isUpdatingHistorical } = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/historical-prices/fetch/portfolio/${selectedRegion}`, {});
    },
    onSuccess: () => {
      refetchLogs();
    }
  });

  // Update schedule settings
  const handleScheduleChange = (type: 'current_prices' | 'historical_prices', field: string, value: any) => {
    setSchedules(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  // Get status badge for log entry
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-900/20 text-gray-400 border-gray-800">Unknown</Badge>;
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold mb-6">Data Management</h1>

        <Tabs defaultValue="current-prices" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="current-prices" className="flex items-center">
              <BarChart4 className="mr-2 h-4 w-4" />
              Current Prices
            </TabsTrigger>
            <TabsTrigger value="historical-prices" className="flex items-center">
              <History className="mr-2 h-4 w-4" />
              Historical Prices
            </TabsTrigger>
            <TabsTrigger value="update-logs" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Update Logs
            </TabsTrigger>
          </TabsList>

          {/* Current Prices Tab */}
          <TabsContent value="current-prices">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Current Price Updates</CardTitle>
                  <CardDescription>
                    Fetch real-time market data for portfolio holdings
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <Label htmlFor="region-select" className="mb-2 block">Select Region</Label>
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => setSelectedRegion(value)}
                    >
                      <SelectTrigger id="region-select">
                        <SelectValue placeholder="Select Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD Portfolio</SelectItem>
                        <SelectItem value="CAD">CAD Portfolio</SelectItem>
                        <SelectItem value="INTL">INTL Portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-[#15202B] p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Last Updated</span>
                      <span className="text-xs text-gray-300 mono">
                        {updateLogs?.find(log => log.type === 'current_price' && log.region === selectedRegion)
                          ? formatTime(updateLogs.find(log => log.type === 'current_price' && log.region === selectedRegion)!.timestamp)
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Status</span>
                      <span>
                        {updateLogs?.find(log => log.type === 'current_price' && log.region === selectedRegion)
                          ? getStatusBadge(updateLogs.find(log => log.type === 'current_price' && log.region === selectedRegion)!.status)
                          : getStatusBadge('pending')
                        }
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => updateCurrentPrices()}
                    disabled={isUpdatingPrices}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isUpdatingPrices ? 'animate-spin' : ''}`} />
                    {isUpdatingPrices ? 'Updating...' : 'Update Current Prices'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Scheduler Settings</CardTitle>
                  <CardDescription>
                    Configure automatic updates of current prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="current-prices-scheduler">Enable Scheduler</Label>
                      <Switch 
                        id="current-prices-scheduler" 
                        checked={schedules.current_prices.enabled}
                        onCheckedChange={(checked) => handleScheduleChange('current_prices', 'enabled', checked)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="interval" className="mb-2 block">Update Interval (minutes)</Label>
                      <Input 
                        id="interval" 
                        type="number" 
                        min="1" 
                        value={schedules.current_prices.interval}
                        onChange={(e) => handleScheduleChange('current_prices', 'interval', parseInt(e.target.value))}
                        disabled={!schedules.current_prices.enabled}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time" className="mb-2 block">Market Open</Label>
                        <Input 
                          id="start-time"
                          type="time"
                          value={schedules.current_prices.startTime}
                          onChange={(e) => handleScheduleChange('current_prices', 'startTime', e.target.value)}
                          disabled={!schedules.current_prices.enabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time" className="mb-2 block">Market Close</Label>
                        <Input 
                          id="end-time"
                          type="time"
                          value={schedules.current_prices.endTime}
                          onChange={(e) => handleScheduleChange('current_prices', 'endTime', e.target.value)}
                          disabled={!schedules.current_prices.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#0E1622] text-xs text-gray-400 flex flex-col items-start">
                  <div className="flex items-center mb-1">
                    <Clock className="h-3 w-3 mr-1" />
                    Last Run: {schedules.current_prices.lastRun ? formatTime(schedules.current_prices.lastRun) : "Never"}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Next Run: {schedules.current_prices.enabled 
                      ? schedules.current_prices.nextRun 
                        ? formatTime(schedules.current_prices.nextRun) 
                        : "Not scheduled" 
                      : "Disabled"}
                  </div>
                </CardFooter>
              </Card>

              <Card className="col-span-1 lg:col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Current Prices</CardTitle>
                  <CardDescription>
                    Latest market prices for {selectedRegion} portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px] rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Change %</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricesLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">Loading price data...</TableCell>
                          </TableRow>
                        ) : currentPrices && currentPrices.length > 0 ? (
                          currentPrices.map((price: any) => (
                            <TableRow key={price.id}>
                              <TableCell className="font-medium">{price.symbol}</TableCell>
                              <TableCell>${parseFloat(price.regularMarketPrice).toFixed(2)}</TableCell>
                              <TableCell className={parseFloat(price.regularMarketChangePercent) >= 0 ? "text-green-500" : "text-red-500"}>
                                {parseFloat(price.regularMarketChangePercent).toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(price.updatedAt).toLocaleTimeString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">No price data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Historical Prices Tab */}
          <TabsContent value="historical-prices">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Historical Price Updates</CardTitle>
                  <CardDescription>
                    Fetch and store historical OHLCV data
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <Label htmlFor="hist-region-select" className="mb-2 block">Select Region</Label>
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => setSelectedRegion(value)}
                    >
                      <SelectTrigger id="hist-region-select">
                        <SelectValue placeholder="Select Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD Portfolio</SelectItem>
                        <SelectItem value="CAD">CAD Portfolio</SelectItem>
                        <SelectItem value="INTL">INTL Portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-[#15202B] p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Last Updated</span>
                      <span className="text-xs text-gray-300 mono">
                        {updateLogs?.find(log => log.type === 'historical_price' && log.region === selectedRegion)
                          ? formatTime(updateLogs.find(log => log.type === 'historical_price' && log.region === selectedRegion)!.timestamp)
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Status</span>
                      <span>
                        {updateLogs?.find(log => log.type === 'historical_price' && log.region === selectedRegion)
                          ? getStatusBadge(updateLogs.find(log => log.type === 'historical_price' && log.region === selectedRegion)!.status)
                          : getStatusBadge('pending')
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-amber-400 text-sm mb-4">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <span>Historical price updates can take some time</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Historical price updates fetch several years of daily OHLCV data for each symbol. 
                            This operation can take several minutes. The status will update when complete.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => updateHistoricalPrices()}
                    disabled={isUpdatingHistorical}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isUpdatingHistorical ? 'animate-spin' : ''}`} />
                    {isUpdatingHistorical ? 'Updating...' : 'Update Historical Prices'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Scheduler Settings</CardTitle>
                  <CardDescription>
                    Configure automatic updates of historical prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="historical-prices-scheduler">Enable Scheduler</Label>
                      <Switch 
                        id="historical-prices-scheduler" 
                        checked={schedules.historical_prices.enabled}
                        onCheckedChange={(checked) => handleScheduleChange('historical_prices', 'enabled', checked)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="historical-interval" className="mb-2 block">Update Interval (hours)</Label>
                      <Input 
                        id="historical-interval" 
                        type="number" 
                        min="1" 
                        value={schedules.historical_prices.interval / 60} // Convert minutes to hours
                        onChange={(e) => handleScheduleChange('historical_prices', 'interval', parseInt(e.target.value) * 60)}
                        disabled={!schedules.historical_prices.enabled}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="historical-start-time" className="mb-2 block">Start Time</Label>
                        <Input 
                          id="historical-start-time"
                          type="time"
                          value={schedules.historical_prices.startTime}
                          onChange={(e) => handleScheduleChange('historical_prices', 'startTime', e.target.value)}
                          disabled={!schedules.historical_prices.enabled}
                        />
                      </div>
                      <div>
                        <Label htmlFor="historical-end-time" className="mb-2 block">End Time</Label>
                        <Input 
                          id="historical-end-time"
                          type="time"
                          value={schedules.historical_prices.endTime}
                          onChange={(e) => handleScheduleChange('historical_prices', 'endTime', e.target.value)}
                          disabled={!schedules.historical_prices.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-[#0E1622] text-xs text-gray-400 flex flex-col items-start">
                  <div className="flex items-center mb-1">
                    <Clock className="h-3 w-3 mr-1" />
                    Last Run: {schedules.historical_prices.lastRun ? formatTime(schedules.historical_prices.lastRun) : "Never"}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Next Run: {schedules.historical_prices.enabled 
                      ? schedules.historical_prices.nextRun 
                        ? formatTime(schedules.historical_prices.nextRun) 
                        : "Not scheduled" 
                      : "Disabled"}
                  </div>
                </CardFooter>
              </Card>

              <Card className="col-span-1 lg:col-span-1 border-0 shadow bg-[#0A1929]">
                <CardHeader className="bg-[#111E2E]">
                  <CardTitle>Data Coverage</CardTitle>
                  <CardDescription>
                    Historical data availability by portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-[#15202B] p-4 rounded-md">
                      <h3 className="font-medium mb-2">USD Portfolio</h3>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Symbols with data</span>
                        <span>20/20</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Data range</span>
                        <span>5 years</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Last updated</span>
                        <span className="text-xs">{formatTime(new Date().toISOString())}</span>
                      </div>
                    </div>

                    <div className="bg-[#15202B] p-4 rounded-md">
                      <h3 className="font-medium mb-2">CAD Portfolio</h3>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Symbols with data</span>
                        <span>20/20</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Data range</span>
                        <span>5 years</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Last updated</span>
                        <span className="text-xs">{formatTime(new Date().toISOString())}</span>
                      </div>
                    </div>

                    <div className="bg-[#15202B] p-4 rounded-md">
                      <h3 className="font-medium mb-2">INTL Portfolio</h3>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Symbols with data</span>
                        <span>15/15</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Data range</span>
                        <span>5 years</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Last updated</span>
                        <span className="text-xs">{formatTime(new Date().toISOString())}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Update Logs Tab */}
          <TabsContent value="update-logs">
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="bg-[#111E2E]">
                <CardTitle>Data Update Logs</CardTitle>
                <CardDescription>
                  Recent price update activities and their statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Affected Rows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading update logs...</TableCell>
                      </TableRow>
                    ) : updateLogs && updateLogs.length > 0 ? (
                      updateLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatTime(log.timestamp)}</TableCell>
                          <TableCell>
                            {log.type === 'current_price' ? 'Current Prices' : 'Historical Prices'}
                          </TableCell>
                          <TableCell>{log.region}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.message}</TableCell>
                          <TableCell>{log.affectedRows}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No update logs available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
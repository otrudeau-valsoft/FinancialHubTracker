import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Activity,
  Database,
  BarChart2,
  AlertCircle,
  Trash2,
  Clock
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface DataQualityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  value?: any;
}

interface MonitoringAlert {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
  timestamp: string;
}

export default function MonitoringPage() {
  const [selectedTab, setSelectedTab] = useState('data-quality');

  // Fetch data quality checks
  const { data: qualityData, isLoading: qualityLoading, refetch: refetchQuality } = useQuery({
    queryKey: ['/api/monitoring/data-quality'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch system metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/monitoring/system-metrics'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch health status
  const { data: healthData } = useQuery({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  const clearAlerts = async () => {
    try {
      await fetch('/api/monitoring/alerts', { method: 'DELETE' });
      await refetchAlerts();
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1221] text-[#EFEFEF]">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-mono">System Monitoring</h1>
            <p className="text-[#7A8999] mt-2">Real-time monitoring and data quality checks</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={healthData?.status === 'healthy' ? 'default' : 
                      healthData?.status === 'degraded' ? 'secondary' : 'destructive'}
              className="px-3 py-1"
            >
              {getStatusIcon(healthData?.status || 'unknown')}
              <span className="ml-2">{healthData?.status?.toUpperCase() || 'CHECKING...'}</span>
            </Badge>
            <Button 
              onClick={() => {
                refetchQuality();
                refetchAlerts();
              }}
              size="sm"
              className="bg-[#38AAFD] hover:bg-[#1D90E0]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#0A1524] border-[#1A304A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center">
                <Database className="h-4 w-4 mr-2 text-[#38AAFD]" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metricsData?.metrics?.databaseStats?.usd_stocks || 0}</p>
              <p className="text-xs text-[#7A8999]">Total stocks tracked</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A1524] border-[#1A304A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center">
                <Activity className="h-4 w-4 mr-2 text-[#4CAF50]" />
                Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metricsData?.metrics?.uptime ? Math.floor(metricsData.metrics.uptime / 3600) : 0}h
              </p>
              <p className="text-xs text-[#7A8999]">System uptime</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A1524] border-[#1A304A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center">
                <BarChart2 className="h-4 w-4 mr-2 text-[#FF9800]" />
                Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {qualityData?.summary?.passed || 0}/{qualityData?.summary?.total || 0}
              </p>
              <p className="text-xs text-[#7A8999]">Passed checks</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A1524] border-[#1A304A]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-[#FF5252]" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{alertsData?.count || 0}</p>
              <p className="text-xs text-[#7A8999]">Active alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="bg-[#0A1524] border-[#1A304A]">
            <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="data-quality" className="space-y-4">
            <Card className="bg-[#0A1524] border-[#1A304A]">
              <CardHeader>
                <CardTitle>Data Quality Checks</CardTitle>
                <CardDescription>
                  Automated checks for data integrity and accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {qualityLoading ? (
                    <div className="text-center py-4 text-[#7A8999]">Loading checks...</div>
                  ) : (
                    qualityData?.checks?.map((check: DataQualityCheck, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-start justify-between p-3 bg-[#1C2938] rounded-lg border border-[#2A3F5A]"
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <h4 className="font-semibold">{check.name}</h4>
                            <p className="text-sm text-[#7A8999] mt-1">{check.details}</p>
                            {check.value && (
                              <pre className="text-xs text-[#7A8999] mt-2 bg-[#0A1524] p-2 rounded">
                                {JSON.stringify(check.value, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={check.status === 'pass' ? 'default' : 
                                  check.status === 'warning' ? 'secondary' : 'destructive'}
                        >
                          {check.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-[#0A1524] border-[#1A304A]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>System Alerts</CardTitle>
                    <CardDescription>
                      Recent system alerts and notifications
                    </CardDescription>
                  </div>
                  {alertsData?.count > 0 && (
                    <Button 
                      onClick={clearAlerts}
                      size="sm"
                      variant="outline"
                      className="border-[#FF5252] text-[#FF5252] hover:bg-[#FF5252] hover:text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {alertsLoading ? (
                      <div className="text-center py-4 text-[#7A8999]">Loading alerts...</div>
                    ) : alertsData?.alerts?.length === 0 ? (
                      <div className="text-center py-8 text-[#7A8999]">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>No active alerts</p>
                      </div>
                    ) : (
                      alertsData?.alerts?.map((alert: MonitoringAlert, idx: number) => (
                        <div 
                          key={idx}
                          className="p-3 bg-[#1C2938] rounded-lg border border-[#2A3F5A]"
                        >
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-semibold">{alert.category}</h5>
                                  <p className="text-sm text-[#EFEFEF] mt-1">{alert.message}</p>
                                  {alert.details && (
                                    <pre className="text-xs text-[#7A8999] mt-2 bg-[#0A1524] p-2 rounded">
                                      {JSON.stringify(alert.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                                <div className="text-xs text-[#7A8999] flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card className="bg-[#0A1524] border-[#1A304A]">
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>
                  Real-time system performance and resource usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Memory Usage */}
                  <div className="p-4 bg-[#1C2938] rounded-lg border border-[#2A3F5A]">
                    <h4 className="font-semibold mb-3">Memory Usage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">Heap Used</span>
                        <span>
                          {metricsData?.metrics?.memory?.heapUsed 
                            ? Math.round(metricsData.metrics.memory.heapUsed / 1024 / 1024) 
                            : 0} MB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">Heap Total</span>
                        <span>
                          {metricsData?.metrics?.memory?.heapTotal 
                            ? Math.round(metricsData.metrics.memory.heapTotal / 1024 / 1024) 
                            : 0} MB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">External</span>
                        <span>
                          {metricsData?.metrics?.memory?.external 
                            ? Math.round(metricsData.metrics.memory.external / 1024 / 1024) 
                            : 0} MB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Database Stats */}
                  <div className="p-4 bg-[#1C2938] rounded-lg border border-[#2A3F5A]">
                    <h4 className="font-semibold mb-3">Database Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">USD Stocks</span>
                        <span>{metricsData?.metrics?.databaseStats?.usd_stocks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">CAD Stocks</span>
                        <span>{metricsData?.metrics?.databaseStats?.cad_stocks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">INTL Stocks</span>
                        <span>{metricsData?.metrics?.databaseStats?.intl_stocks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8999]">Historical Prices</span>
                        <span>{metricsData?.metrics?.databaseStats?.historical_prices_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
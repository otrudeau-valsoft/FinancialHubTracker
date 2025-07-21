import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Activity,
  Database,
  BarChart2,
  AlertCircle,
  Play,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  FileText
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'running';
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
}

interface HealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  label: string;
}

export default function TestingMonitoringPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch diagnostics data
  const { data: diagnosticsHealth } = useQuery({
    queryKey: ['/api/diagnostics/health'],
    refetchInterval: 30000
  });

  // Fetch data quality metrics
  const { data: dataQuality } = useQuery({
    queryKey: ['/api/monitoring/data-quality'],
    refetchInterval: 60000
  });

  // Fetch system metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ['/api/monitoring/system-metrics'],
    refetchInterval: 5000
  });

  // Fetch alerts
  const { data: alerts } = useQuery({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: 10000
  });

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    const tests = [
      { name: 'Database Connection', endpoint: '/api/diagnostics/test/database' },
      { name: 'Yahoo Finance API', endpoint: '/api/diagnostics/test/yahoo-finance' },
      { name: 'Portfolio Consistency', endpoint: '/api/diagnostics/test/portfolio-consistency' },
      { name: 'Data Validation', endpoint: '/api/monitoring/data-quality' },
      { name: 'Performance Metrics', endpoint: '/api/monitoring/health' }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      
      setTestResults(prev => [...prev, {
        name: test.name,
        status: 'running',
        message: 'Running test...',
        timestamp: new Date().toISOString()
      }]);

      try {
        const response = await fetch(test.endpoint);
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        const status = response.ok && data.status === 'success' ? 'pass' : 
                       data.warning ? 'warning' : 'fail';
        
        setTestResults(prev => prev.map(r => 
          r.name === test.name ? {
            ...r,
            status,
            message: data.message || `Test completed in ${duration}ms`,
            details: data,
            duration,
            timestamp: new Date().toISOString()
          } : r
        ));
      } catch (error) {
        const duration = Date.now() - startTime;
        setTestResults(prev => prev.map(r => 
          r.name === test.name ? {
            ...r,
            status: 'fail',
            message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration,
            timestamp: new Date().toISOString()
          } : r
        ));
      }
    }

    setIsRunningTests(false);
  };

  // Calculate health score
  const calculateHealthScore = () => {
    if (!dataQuality?.summary) return 0;
    const { totalChecks, passedChecks } = dataQuality.summary;
    return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  };

  const healthScore = calculateHealthScore();
  const healthData = [{
    name: 'Health',
    value: healthScore,
    fill: healthScore >= 80 ? '#4CAF50' : healthScore >= 60 ? '#F5A623' : '#F44336'
  }];

  // Get system status
  const getSystemStatus = () => {
    if (!systemMetrics?.metrics) return 'unknown';
    const { cpu, memory } = systemMetrics.metrics;
    if (cpu > 90 || memory > 90) return 'critical';
    if (cpu > 70 || memory > 70) return 'warning';
    return 'healthy';
  };

  const systemStatus = getSystemStatus();

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-[#4CAF50]" />;
      case 'fail':
      case 'critical':
        return <XCircle className="h-4 w-4 text-[#F44336]" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-[#F5A623]" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-[#2196F3] animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-[#7A8999]" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pass: { className: "bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/30" },
      fail: { className: "bg-[#F44336]/20 text-[#F44336] border-[#F44336]/30" },
      warning: { className: "bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30" },
      running: { className: "bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3]/30" }
    };

    return (
      <Badge variant="outline" className={variants[status]?.className || ""}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Filter test results by category
  const filteredTests = testResults.filter(test => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'failed') return test.status === 'fail';
    if (selectedCategory === 'warnings') return test.status === 'warning';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-6 bg-[#061220]">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">
              TESTING & MONITORING
            </h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#F5A623]"></div>
            </div>
          </div>
          <Button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="bg-[#2196F3] hover:bg-[#1976D2] text-white"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* System Health */}
        <Card className="bg-[#0B1728] border-[#1A304A]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-[#7A8999]">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%">
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill="#82ca9d"
                    data={healthData}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-2xl font-bold fill-[#EFEFEF]"
                  >
                    {healthScore}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="bg-[#0B1728] border-[#1A304A]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-[#7A8999]">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-[#EFEFEF]">
                {alerts?.count || 0}
              </div>
              {alerts?.count > 0 && (
                <AlertCircle className="h-8 w-8 text-[#F5A623]" />
              )}
            </div>
            <p className="text-xs text-[#7A8999] mt-2">
              {alerts?.count > 0 ? 'Requires attention' : 'All systems normal'}
            </p>
          </CardContent>
        </Card>

        {/* Data Quality */}
        <Card className="bg-[#0B1728] border-[#1A304A]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-[#7A8999]">Data Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#7A8999]">Passed</span>
                <span className="text-sm font-mono text-[#EFEFEF]">
                  {dataQuality?.summary?.passedChecks || 0}/{dataQuality?.summary?.totalChecks || 0}
                </span>
              </div>
              <Progress 
                value={healthScore} 
                className="h-2 bg-[#1A304A]"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-[#0B1728] border-[#1A304A]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-[#7A8999]">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus)}
              <span className="text-lg font-mono text-[#EFEFEF] capitalize">
                {systemStatus}
              </span>
            </div>
            {systemMetrics?.metrics && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7A8999]">CPU</span>
                  <span className="text-[#EFEFEF]">{systemMetrics.metrics.cpu}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7A8999]">Memory</span>
                  <span className="text-[#EFEFEF]">{systemMetrics.metrics.memory}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="bg-[#0B1728] border border-[#1A304A]">
          <TabsTrigger value="tests" className="data-[state=active]:bg-[#1A304A]">
            <FileText className="h-4 w-4 mr-2" />
            Test Results
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-[#1A304A]">
            <BarChart2 className="h-4 w-4 mr-2" />
            Live Metrics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-[#1A304A]">
            <AlertCircle className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-[#1A304A]">
            <Database className="h-4 w-4 mr-2" />
            Data Analysis
          </TabsTrigger>
        </TabsList>

        {/* Test Results Tab */}
        <TabsContent value="tests" className="mt-4">
          <Card className="bg-[#0B1728] border-[#1A304A]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#EFEFEF] font-mono">Test Results</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs"
                  >
                    All ({testResults.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCategory === 'failed' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('failed')}
                    className="text-xs"
                  >
                    Failed ({testResults.filter(t => t.status === 'fail').length})
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedCategory === 'warnings' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('warnings')}
                    className="text-xs"
                  >
                    Warnings ({testResults.filter(t => t.status === 'warning').length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {filteredTests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#7A8999]">
                      {testResults.length === 0 
                        ? "No tests have been run yet. Click 'Run All Tests' to start."
                        : "No tests match the selected filter."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTests.map((test, index) => (
                      <div
                        key={index}
                        className="p-3 bg-[#0F1A2A] border border-[#1A304A] rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(test.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-[#EFEFEF]">
                                  {test.name}
                                </span>
                                {getStatusBadge(test.status)}
                              </div>
                              <p className="text-xs text-[#7A8999] mt-1">
                                {test.message}
                              </p>
                              {test.duration && (
                                <p className="text-xs text-[#7A8999] mt-1">
                                  Duration: {test.duration}ms
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-[#7A8999]">
                            {formatDistanceToNow(new Date(test.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Resources */}
            <Card className="bg-[#0B1728] border-[#1A304A]">
              <CardHeader>
                <CardTitle className="text-[#EFEFEF] font-mono flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics?.metrics && (
                  <>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#7A8999]">CPU Usage</span>
                        <span className="text-sm font-mono text-[#EFEFEF]">
                          {systemMetrics.metrics.cpu}%
                        </span>
                      </div>
                      <Progress
                        value={systemMetrics.metrics.cpu}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#7A8999]">Memory Usage</span>
                        <span className="text-sm font-mono text-[#EFEFEF]">
                          {systemMetrics.metrics.memory}%
                        </span>
                      </div>
                      <Progress
                        value={systemMetrics.metrics.memory}
                        className="h-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Database Stats */}
            <Card className="bg-[#0B1728] border-[#1A304A]">
              <CardHeader>
                <CardTitle className="text-[#EFEFEF] font-mono flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Database Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnosticsHealth?.database && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7A8999]">Connection</span>
                      <span className={`font-mono ${
                        diagnosticsHealth.database.connection === 'active' 
                          ? 'text-[#4CAF50]' 
                          : 'text-[#F44336]'
                      }`}>
                        {diagnosticsHealth.database.connection}
                      </span>
                    </div>
                    {diagnosticsHealth.database.rowCounts && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#7A8999]">USD Stocks</span>
                          <span className="font-mono text-[#EFEFEF]">
                            {diagnosticsHealth.database.rowCounts.portfolios_usd}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#7A8999]">Current Prices</span>
                          <span className="font-mono text-[#EFEFEF]">
                            {diagnosticsHealth.database.rowCounts.current_prices}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#7A8999]">Historical Prices</span>
                          <span className="font-mono text-[#EFEFEF]">
                            {diagnosticsHealth.database.rowCounts.historical_prices}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="bg-[#0B1728] border-[#1A304A]">
            <CardHeader>
              <CardTitle className="text-[#EFEFEF] font-mono">System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts?.alerts && alerts.alerts.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {alerts.alerts.map((alert: any, index: number) => (
                      <Alert
                        key={index}
                        className={`
                          ${alert.type === 'error' ? 'border-[#F44336]' : ''}
                          ${alert.type === 'warning' ? 'border-[#F5A623]' : ''}
                          ${alert.type === 'info' ? 'border-[#2196F3]' : ''}
                        `}
                      >
                        <AlertDescription>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm">{alert.message}</p>
                              <p className="text-xs text-[#7A8999] mt-1">
                                Category: {alert.category}
                              </p>
                            </div>
                            <span className="text-xs text-[#7A8999]">
                              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-[#4CAF50] mx-auto mb-2" />
                  <p className="text-[#7A8999]">No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Analysis Tab */}
        <TabsContent value="data" className="mt-4">
          <Card className="bg-[#0B1728] border-[#1A304A]">
            <CardHeader>
              <CardTitle className="text-[#EFEFEF] font-mono">Data Quality Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {dataQuality?.checks && (
                <div className="space-y-3">
                  {Object.entries(dataQuality.checks).map(([category, checks]: [string, any]) => (
                    <div key={category} className="border border-[#1A304A] rounded-md p-3">
                      <h3 className="font-mono text-sm text-[#EFEFEF] mb-2 capitalize">
                        {category.replace(/_/g, ' ')}
                      </h3>
                      <div className="space-y-2">
                        {checks.map((check: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-[#061220] rounded"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(check.status)}
                              <span className="text-xs text-[#7A8999]">{check.name}</span>
                            </div>
                            <span className="text-xs font-mono text-[#EFEFEF]">
                              {check.details}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
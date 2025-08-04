import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
  PlayCircle,
  Edit,
  History
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

interface SchedulerJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  running: boolean;
  nextRun: string | null;
}

export default function TestingMonitoringPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [togglingJob, setTogglingJob] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<SchedulerJob | null>(null);
  const [newSchedule, setNewSchedule] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

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

  // Fetch scheduler status
  const { data: schedulerStatus, refetch: refetchScheduler } = useQuery({
    queryKey: ['/api/scheduler/status'],
    refetchInterval: 5000
  });

  // Fetch scheduler audit logs
  const { data: auditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['/api/scheduler/audit-logs'],
    refetchInterval: 10000
  });

  // Toggle scheduler job
  const toggleSchedulerJob = async (jobId: string, enabled: boolean) => {
    setTogglingJob(jobId);
    try {
      const response = await fetch(`/api/scheduler/jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (!response.ok) throw new Error('Failed to toggle job');
      
      await refetchScheduler();
    } catch (error) {
      console.error('Error toggling job:', error);
    } finally {
      setTogglingJob(null);
    }
  };

  // Run scheduler job manually
  const runSchedulerJob = async (jobId: string) => {
    setRunningJob(jobId);
    try {
      const response = await fetch(`/api/scheduler/jobs/${jobId}/run`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to run job');
      
      // Refresh scheduler status after a short delay
      setTimeout(() => refetchScheduler(), 2000);
    } catch (error) {
      console.error('Error running job:', error);
    } finally {
      setRunningJob(null);
    }
  };

  // Update scheduler job schedule
  const updateSchedule = async () => {
    if (!editingJob || !newSchedule) return;
    
    setSavingSchedule(true);
    try {
      const response = await fetch(`/api/scheduler/jobs/${editingJob.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: newSchedule })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update schedule');
      }
      
      await refetchScheduler();
      setEditingJob(null);
      setNewSchedule('');
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert(error instanceof Error ? error.message : 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Convert cron expression to human-readable description
  const getCronDescription = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Invalid schedule';

    const [minute, hour, day, month, weekday] = parts;
    
    // Common patterns
    if (cron === '*/15 9-16 * * 1-5') return 'Every 15 minutes from 9 AM to 4 PM on weekdays';
    if (cron === '0 17 * * 1-5') return 'Daily at 5 PM on weekdays';
    if (cron === '30 9 * * 1-5') return 'Daily at 9:30 AM on weekdays';
    if (cron === '0 18 * * 0') return 'Weekly on Sundays at 6 PM';
    if (cron === '0 16 * * *') return 'Daily at 4 PM';
    if (cron === '0 9 * * 1-5') return 'Daily at 9 AM on weekdays';
    
    // Parse generic patterns
    let description = '';
    
    // Time part
    if (minute.includes('*/')) {
      const interval = minute.replace('*/', '');
      description += `Every ${interval} minutes`;
    } else if (minute === '*') {
      description += 'Every minute';
    } else {
      const min = minute === '0' ? '' : `:${minute.padStart(2, '0')}`;
      if (hour === '*') {
        description += `At ${minute} minutes past every hour`;
      } else if (hour.includes('-')) {
        const [start, end] = hour.split('-');
        const startHour = parseInt(start);
        const endHour = parseInt(end);
        description += `At ${minute} minutes past each hour from ${startHour % 12 || 12} ${startHour < 12 ? 'AM' : 'PM'} to ${endHour % 12 || 12} ${endHour < 12 ? 'AM' : 'PM'}`;
      } else {
        const h = parseInt(hour);
        description += `At ${h % 12 || 12}${min} ${h < 12 ? 'AM' : 'PM'}`;
      }
    }
    
    // Hour range
    if (minute.includes('*/') && hour.includes('-')) {
      const [start, end] = hour.split('-');
      const startHour = parseInt(start);
      const endHour = parseInt(end);
      description += ` from ${startHour % 12 || 12} ${startHour < 12 ? 'AM' : 'PM'} to ${endHour % 12 || 12} ${endHour < 12 ? 'AM' : 'PM'}`;
    }
    
    // Weekday part
    if (weekday === '1-5') {
      description += ' on weekdays';
    } else if (weekday === '0') {
      description += ' on Sundays';
    } else if (weekday === '6') {
      description += ' on Saturdays';
    } else if (weekday === '0,6') {
      description += ' on weekends';
    } else if (weekday !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayNums = weekday.split(',').map(d => parseInt(d));
      const dayNames = dayNums.map(d => days[d]).filter(Boolean);
      if (dayNames.length > 0) {
        description += ` on ${dayNames.join(', ')}`;
      }
    }
    
    return description || 'Custom schedule';
  };

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

      {/* Scheduler Controls Section */}
      <Card className="bg-[#0B1728] border-[#1A304A] mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#EFEFEF] font-mono flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Auto-Scheduler Controls
            </CardTitle>
            <Badge variant="outline" className="bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/30">
              {schedulerStatus?.jobs?.filter((job: SchedulerJob) => job.enabled).length || 0} / {schedulerStatus?.jobs?.length || 0} Active
            </Badge>
          </div>
          <CardDescription className="text-[#7A8999] text-sm">
            Configure automatic data updates on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedulerStatus?.jobs?.map((job: SchedulerJob) => (
              <div key={job.id} className="p-4 bg-[#0F1A2A] border border-[#1A304A] rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-mono text-sm text-[#EFEFEF] mb-1">{job.name}</h4>
                    <p className="text-xs text-[#7A8999] font-mono mb-1">{job.schedule}</p>
                    <p className="text-xs text-[#9FD3C7] mb-2">{getCronDescription(job.schedule)}</p>
                    {job.nextRun && (
                      <p className="text-xs text-[#7A8999]">
                        Next run: {formatDistanceToNow(new Date(job.nextRun), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingJob(job);
                        setNewSchedule(job.schedule);
                      }}
                      className="p-1"
                      title="Edit Schedule"
                    >
                      <Edit className="h-4 w-4 text-[#F5A623]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSchedulerJob(job.id, !job.enabled)}
                      disabled={togglingJob === job.id}
                      className="p-1"
                    >
                      {togglingJob === job.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-[#7A8999]" />
                      ) : job.enabled ? (
                        <ToggleRight className="h-5 w-5 text-[#4CAF50]" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-[#7A8999]" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runSchedulerJob(job.id)}
                      disabled={runningJob === job.id || job.running}
                      className="p-1"
                      title="Run Now"
                    >
                      {runningJob === job.id || job.running ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-[#2196F3]" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-[#2196F3]" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.enabled ? (
                    <Badge variant="outline" className="bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/30 text-xs">
                      ENABLED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-[#7A8999]/20 text-[#7A8999] border-[#7A8999]/30 text-xs">
                      DISABLED
                    </Badge>
                  )}
                  {job.running && (
                    <Badge variant="outline" className="bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3]/30 text-xs">
                      RUNNING
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!schedulerStatus?.jobs && (
            <div className="text-center py-8">
              <p className="text-[#7A8999]">Loading scheduler status...</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <span className="text-[#EFEFEF]">{systemMetrics.metrics.cpu || 0}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7A8999]">Memory</span>
                  <span className="text-[#EFEFEF]">
                    {systemMetrics.metrics.memory && typeof systemMetrics.metrics.memory === 'object' 
                      ? Math.round((systemMetrics.metrics.memory.heapUsed / systemMetrics.metrics.memory.heapTotal) * 100)
                      : systemMetrics.metrics.memory}%
                  </span>
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
          <TabsTrigger value="scheduler-logs" className="data-[state=active]:bg-[#1A304A]">
            <History className="h-4 w-4 mr-2" />
            Scheduler Logs
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
                          {systemMetrics.metrics.cpu || 0}%
                        </span>
                      </div>
                      <Progress
                        value={systemMetrics.metrics.cpu || 0}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[#7A8999]">Memory Usage</span>
                        <span className="text-sm font-mono text-[#EFEFEF]">
                          {systemMetrics.metrics.memory && typeof systemMetrics.metrics.memory === 'object' 
                            ? Math.round((systemMetrics.metrics.memory.heapUsed / systemMetrics.metrics.memory.heapTotal) * 100)
                            : systemMetrics.metrics.memory}%
                        </span>
                      </div>
                      <Progress
                        value={systemMetrics.metrics.memory && typeof systemMetrics.metrics.memory === 'object' 
                          ? Math.round((systemMetrics.metrics.memory.heapUsed / systemMetrics.metrics.memory.heapTotal) * 100)
                          : systemMetrics.metrics.memory}
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
              {dataQuality?.checks && Array.isArray(dataQuality.checks) && (
                <div className="space-y-3">
                  {dataQuality.checks.map((check: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-[#061220] rounded"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(check.status)}
                        <span className="text-sm text-[#7A8999]">{check.name}</span>
                      </div>
                      <span className="text-xs font-mono text-[#EFEFEF]">
                        {check.details}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduler Logs Tab */}
        <TabsContent value="scheduler-logs" className="mt-4">
          <Card className="bg-[#0B1728] border-[#1A304A]">
            <CardHeader>
              <CardTitle className="text-[#EFEFEF] font-mono flex items-center">
                <History className="h-4 w-4 mr-2" />
                Scheduler Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {auditLogs?.logs && auditLogs.logs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.logs.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-[#0F1A2A] border border-[#1A304A] rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getStatusIcon(log.status.toLowerCase())}
                            <div className="flex-1">
                              <p className="text-sm text-[#EFEFEF] font-mono">{log.details.message}</p>
                              {log.details.jobId && (
                                <p className="text-xs text-[#7A8999] mt-1">Job: {log.details.jobId}</p>
                              )}
                              {log.details.schedule && (
                                <p className="text-xs text-[#7A8999]">Schedule: {log.details.schedule}</p>
                              )}
                              {log.details.error && (
                                <p className="text-xs text-[#F44336] mt-1">Error: {log.details.error}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-[#7A8999]">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[#7A8999]">No scheduler logs available</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Edit Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent className="bg-[#0B1728] border-[#1A304A]">
          <DialogHeader>
            <DialogTitle className="text-[#EFEFEF] font-mono">
              Edit Schedule - {editingJob?.name}
            </DialogTitle>
            <DialogDescription className="text-[#7A8999]">
              Update the cron expression for this job. Times are in Eastern Time (ET).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-[#EFEFEF]">Cron Expression</label>
              <Input
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="*/15 9-16 * * 1-5"
                className="bg-[#061220] border-[#1A304A] text-[#EFEFEF] font-mono"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-[#7A8999]">Common patterns:</p>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-[#EFEFEF]">*/15 9-16 * * 1-5 - Every 15 min, 9AM-4PM weekdays</p>
                <p className="text-[#EFEFEF]">0 17 * * 1-5 - Daily at 5PM weekdays</p>
                <p className="text-[#EFEFEF]">0 9 * * 1-5 - Daily at 9AM weekdays</p>
                <p className="text-[#EFEFEF]">0 18 * * 0 - Weekly on Sundays at 6PM</p>
              </div>
            </div>
            <div className="bg-[#061220] p-3 rounded-md">
              <p className="text-xs text-[#7A8999]">Format: minute hour day month weekday</p>
              <p className="text-xs text-[#7A8999] mt-1">
                Use * for any, */n for intervals, n-m for ranges, n,m for lists
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingJob(null)}
              className="bg-transparent border-[#1A304A] text-[#7A8999]"
            >
              Cancel
            </Button>
            <Button
              onClick={updateSchedule}
              disabled={savingSchedule || !newSchedule}
              className="bg-[#2196F3] hover:bg-[#1976D2] text-white"
            >
              {savingSchedule ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '../../lib/apiRequest';
import { Loader2, AlertTriangle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// Alert severity types
type AlertSeverity = 'critical' | 'warning' | 'info';

// Alert interface matching our backend
interface Alert {
  symbol: string;
  message: string;
  details: string;
  severity: AlertSeverity;
  ruleType: string;
  region: string;
}

// Stock Alert Row for the data table
const StockAlertRow = ({ alert, index, symbolCount }: { alert: Alert, index: number, symbolCount?: { [key: string]: number } }) => {
  // Define color based on severity
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-[#FF3D00] text-white';
      case 'warning': return 'bg-[#FF9800] text-white';
      case 'info': return 'bg-[#38AAFD] text-white';
      default: return 'bg-[#38AAFD] text-white';
    }
  };

  // Define icon based on severity
  const SeverityIcon = () => {
    switch (alert.severity) {
      case 'critical': return <AlertTriangle className="h-3 w-3" />;
      case 'warning': return <AlertCircle className="h-3 w-3" />;
      case 'info': return <CheckCircle className="h-3 w-3" />;
      default: return <CheckCircle className="h-3 w-3" />;
    }
  };
  
  // Get rule type color
  const getRuleTypeColor = (ruleType: string) => {
    if (ruleType.includes('increase') || ruleType === 'rsi-low') {
      return 'text-[#4CAF50]';
    } else if (ruleType.includes('decrease') || ruleType === 'rsi-high' || ruleType.includes('max-weight')) {
      return 'text-[#FF3D00]';
    } else if (ruleType.includes('rating')) {
      return 'text-[#805AD5]';
    } else {
      return 'text-[#7A8999]';
    }
  };

  // Format rule name for display
  const formatRuleName = (ruleType: string) => {
    // Convert 'some-rule-name' to 'Some Rule Name'
    return ruleType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <tr className={`${index % 2 === 0 ? 'bg-[#061220]' : 'bg-[#0A1524]'}`}>
      <td className="py-2 px-3 text-xs">
        <div className="flex items-center">
          <Badge className={`h-5 px-1.5 mr-2 ${getSeverityColor(alert.severity)} flex items-center`}>
            <SeverityIcon />
          </Badge>
          <span className="font-mono text-[#EFEFEF]">{alert.symbol}</span>
          {symbolCount && symbolCount[alert.symbol] > 1 && (
            <Badge className="ml-2 bg-[#1C2938] text-[#EFEFEF] text-[10px]">
              {symbolCount[alert.symbol]}
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2 px-3 text-xs">
        <div className={`${getRuleTypeColor(alert.ruleType)}`}>
          {formatRuleName(alert.ruleType)}
        </div>
        <div className="text-[#7A8999] text-[10px]">{alert.message}</div>
      </td>
      <td className="py-2 px-3 text-xs text-right">
        <span className="text-[#EFEFEF] font-mono">{alert.details}</span>
      </td>
    </tr>
  );
};

// Matrix Engine Controls component
export const MatrixEngineControls = () => {
  const [activeRegion, setActiveRegion] = useState<string>("USD");
  const [alertsUSD, setAlertsUSD] = useState<Alert[]>([]);
  const [alertsCAD, setAlertsCAD] = useState<Alert[]>([]);
  const [alertsINTL, setAlertsINTL] = useState<Alert[]>([]);
  const [isLoadingUSD, setIsLoadingUSD] = useState(false);
  const [isLoadingCAD, setIsLoadingCAD] = useState(false);
  const [isLoadingINTL, setIsLoadingINTL] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [sortBy, setSortBy] = useState<string>("symbol");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Run matrix engine for a specific region
  const runMatrixEngine = async (region: string) => {
    const setLoading = (loading: boolean) => {
      switch (region) {
        case 'USD': setIsLoadingUSD(loading); break;
        case 'CAD': setIsLoadingCAD(loading); break;
        case 'INTL': setIsLoadingINTL(loading); break;
        default: break;
      }
    };

    const setAlerts = (alerts: Alert[]) => {
      switch (region) {
        case 'USD': setAlertsUSD(alerts); break;
        case 'CAD': setAlertsCAD(alerts); break;
        case 'INTL': setAlertsINTL(alerts); break;
        default: break;
      }
    };

    try {
      setLoading(true);
      const response = await apiRequest(`/api/matrix-engine/run/${region}`);
      
      if (response.status === 'success') {
        setAlerts(response.data);
        toast({
          title: 'Matrix Engine Analysis',
          description: `Generated ${response.data.length} insights for ${region} portfolio`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to run matrix engine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running matrix engine:', error);
      toast({
        title: 'Error',
        description: 'Failed to run matrix engine',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Run matrix engine for all regions
  const runMatrixEngineForAll = async () => {
    try {
      setIsLoadingAll(true);
      const response = await apiRequest('/api/matrix-engine/run-all');
      
      if (response.status === 'success') {
        // Filter alerts by region
        const usdAlerts = response.data.filter((alert: Alert) => alert.region === 'USD');
        const cadAlerts = response.data.filter((alert: Alert) => alert.region === 'CAD');
        const intlAlerts = response.data.filter((alert: Alert) => alert.region === 'INTL');
        
        setAlertsUSD(usdAlerts);
        setAlertsCAD(cadAlerts);
        setAlertsINTL(intlAlerts);
        
        toast({
          title: 'Matrix Engine Analysis',
          description: `Generated ${response.data.length} insights across all portfolios`,
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to run matrix engine',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error running matrix engine for all regions:', error);
      toast({
        title: 'Error',
        description: 'Failed to run matrix engine for all regions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Calculate alert statistics
  const getAlertStats = (alerts: Alert[]) => {
    const increasePositionCount = alerts.filter(a => 
      a.ruleType.includes('price-52wk') || 
      a.ruleType === 'rsi-low' || 
      a.ruleType.includes('sector-perf-neg')
    ).length;
    
    const decreasePositionCount = alerts.filter(a => 
      a.ruleType.includes('price-90day') || 
      a.ruleType === 'rsi-high' || 
      a.ruleType.includes('max-weight')
    ).length;
    
    const ratingChangeCount = alerts.filter(a => 
      a.ruleType.includes('rating') || 
      a.ruleType.includes('earnings') || 
      a.ruleType.includes('debt')
    ).length;

    // Group by symbol to see which stocks have the most alerts
    const symbolCount: {[key: string]: number} = {};
    alerts.forEach(alert => {
      symbolCount[alert.symbol] = (symbolCount[alert.symbol] || 0) + 1;
    });

    // Sort symbols by count
    const topSymbols = Object.entries(symbolCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      increasePositionCount,
      decreasePositionCount,
      ratingChangeCount,
      symbolCount,
      topSymbols
    };
  };

  // Get current alerts based on active region
  const currentAlerts = activeRegion === 'USD' 
    ? alertsUSD 
    : activeRegion === 'CAD' 
      ? alertsCAD 
      : alertsINTL;

  // Get alert stats for current region
  const alertStats = getAlertStats(currentAlerts);

  // Sort alerts
  const sortedAlerts = [...currentAlerts].sort((a, b) => {
    if (sortBy === 'symbol') {
      return sortOrder === 'asc' 
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    } else if (sortBy === 'severity') {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return sortOrder === 'asc'
        ? severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
        : severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
    } else if (sortBy === 'ruleType') {
      return sortOrder === 'asc'
        ? a.ruleType.localeCompare(b.ruleType)
        : b.ruleType.localeCompare(a.ruleType);
    }
    return 0;
  });

  // Handle sorting change
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <Card className="bg-[#0A1524] border-[#1A304A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#EFEFEF] font-mono text-lg">MATRIX ENGINE</CardTitle>
        <CardDescription className="text-[#7A8999]">
          Decision analysis system for portfolio optimization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setActiveRegion('USD'); runMatrixEngine('USD'); }} 
              disabled={isLoadingUSD || isLoadingAll}
              className={`h-8 bg-[#0A1524] border-[#38AAFD] hover:bg-[#0A1524]/80 ${activeRegion === 'USD' ? 'text-[#EFEFEF] bg-[#38AAFD]/20' : 'text-[#38AAFD]'}`}
              size="sm"
            >
              {isLoadingUSD && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {!isLoadingUSD && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              USD Portfolio
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { setActiveRegion('CAD'); runMatrixEngine('CAD'); }} 
              disabled={isLoadingCAD || isLoadingAll}
              className={`h-8 bg-[#0A1524] border-[#4CAF50] hover:bg-[#0A1524]/80 ${activeRegion === 'CAD' ? 'text-[#EFEFEF] bg-[#4CAF50]/20' : 'text-[#4CAF50]'}`}
              size="sm"
            >
              {isLoadingCAD && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {!isLoadingCAD && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              CAD Portfolio
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { setActiveRegion('INTL'); runMatrixEngine('INTL'); }} 
              disabled={isLoadingINTL || isLoadingAll}
              className={`h-8 bg-[#0A1524] border-[#FFD700] hover:bg-[#0A1524]/80 ${activeRegion === 'INTL' ? 'text-[#EFEFEF] bg-[#FFD700]/20' : 'text-[#FFD700]'}`}
              size="sm"
            >
              {isLoadingINTL && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {!isLoadingINTL && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              INTL Portfolio
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={runMatrixEngineForAll} 
            disabled={isLoadingUSD || isLoadingCAD || isLoadingINTL || isLoadingAll}
            className="h-8 bg-[#0A1524] border-[#FF9800] text-[#FF9800] hover:bg-[#0A1524]/80"
            size="sm"
          >
            {isLoadingAll && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {!isLoadingAll && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            All Portfolios
          </Button>
        </div>

        {/* Dashboard summary */}
        {currentAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#061220] border border-[#1A304A] rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#4CAF50] font-mono text-xs">INCREASE POSITION</span>
                <span className="font-mono text-lg text-[#EFEFEF]">{alertStats.increasePositionCount}</span>
              </div>
              <div className="text-[#7A8999] text-xs">
                {alertStats.increasePositionCount > 0 
                  ? "Stocks with buy or add signals based on technical and fundamental criteria"
                  : "No stocks currently have buy signals"}
              </div>
            </div>
            <div className="bg-[#061220] border border-[#1A304A] rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#FF3D00] font-mono text-xs">DECREASE POSITION</span>
                <span className="font-mono text-lg text-[#EFEFEF]">{alertStats.decreasePositionCount}</span>
              </div>
              <div className="text-[#7A8999] text-xs">
                {alertStats.decreasePositionCount > 0 
                  ? "Stocks with sell or reduce signals based on technical and fundamental criteria"
                  : "No stocks currently have sell signals"}
              </div>
            </div>
            <div className="bg-[#061220] border border-[#1A304A] rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#805AD5] font-mono text-xs">RATING CHANGES</span>
                <span className="font-mono text-lg text-[#EFEFEF]">{alertStats.ratingChangeCount}</span>
              </div>
              <div className="text-[#7A8999] text-xs">
                {alertStats.ratingChangeCount > 0 
                  ? "Stocks with quality rating change signals from earnings or fundamentals"
                  : "No stocks currently have rating change signals"}
              </div>
            </div>
          </div>
        )}

        {/* Top stocks with alerts */}
        {currentAlerts.length > 0 && alertStats.topSymbols.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <div className="h-0.5 w-4 bg-[#38AAFD]"></div>
              <h3 className="text-[#38AAFD] font-mono text-xs ml-2">TOP SIGNALS</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {alertStats.topSymbols.map(([symbol, count]) => (
                <Badge key={symbol} className="bg-[#1C2938] text-[#EFEFEF] p-1.5">
                  <span className="font-mono">{symbol}</span>
                  <span className="ml-1.5 bg-[#38AAFD] text-[#061220] rounded-full text-[10px] px-1.5">{count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Alert table */}
        {currentAlerts.length > 0 && (
          <div>
            <div className="bg-[#061220] border border-[#1A304A] rounded-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A304A]">
                    <th 
                      className="text-left py-2 px-3 text-xs font-mono text-[#7A8999] cursor-pointer hover:text-[#EFEFEF]"
                      onClick={() => handleSort('symbol')}
                    >
                      <div className="flex items-center">
                        SYMBOL
                        {sortBy === 'symbol' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-2 px-3 text-xs font-mono text-[#7A8999] cursor-pointer hover:text-[#EFEFEF]"
                      onClick={() => handleSort('ruleType')}
                    >
                      <div className="flex items-center">
                        SIGNAL
                        {sortBy === 'ruleType' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-mono text-[#7A8999]">DATA</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAlerts.map((alert, index) => (
                    <StockAlertRow 
                      key={`${activeRegion}-${alert.symbol}-${alert.ruleType}-${index}`} 
                      alert={alert}
                      index={index}
                      symbolCount={alertStats.symbolCount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {currentAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 bg-[#061220] border border-[#1A304A] rounded-md">
            <RefreshCw className="h-8 w-8 text-[#7A8999] mb-2 opacity-50" />
            <p className="text-[#7A8999] text-sm mb-1">No insights generated yet</p>
            <p className="text-[#7A8999] text-xs">
              Run the Matrix Engine to analyze your portfolio stocks against decision rules
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
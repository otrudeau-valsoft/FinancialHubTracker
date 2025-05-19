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

// Alert card for displaying individual alerts
const AlertCard = ({ alert }: { alert: Alert }) => {
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

  return (
    <div className="mb-2 bg-[#061220] border border-[#1A304A] rounded-md p-2 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Badge className={`h-5 px-1.5 ${getSeverityColor(alert.severity)} flex items-center`}>
            <SeverityIcon /> 
            <span className="ml-1 text-[10px]">{alert.severity}</span>
          </Badge>
          <span className="font-mono text-[#EFEFEF]">{alert.symbol}</span>
        </div>
        <Badge variant="outline" className="h-5 px-1.5 border-[#1A304A] text-[10px]">
          {alert.ruleType}
        </Badge>
      </div>
      <p className="text-[#EFEFEF] mb-1">{alert.message}</p>
      <p className="text-[#7A8999] text-[10px]">{alert.details}</p>
    </div>
  );
};

// Matrix Engine Controls component
export const MatrixEngineControls = () => {
  const [alertsUSD, setAlertsUSD] = useState<Alert[]>([]);
  const [alertsCAD, setAlertsCAD] = useState<Alert[]>([]);
  const [alertsINTL, setAlertsINTL] = useState<Alert[]>([]);
  const [isLoadingUSD, setIsLoadingUSD] = useState(false);
  const [isLoadingCAD, setIsLoadingCAD] = useState(false);
  const [isLoadingINTL, setIsLoadingINTL] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

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
          title: 'Matrix Engine',
          description: `Generated ${response.data.length} alerts for ${region} region`,
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
          title: 'Matrix Engine',
          description: `Generated ${response.data.length} alerts across all regions`,
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

  return (
    <Card className="bg-[#0A1524] border-[#1A304A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#EFEFEF] font-mono text-lg">MATRIX ENGINE CONTROLS</CardTitle>
        <CardDescription className="text-[#7A8999]">
          Execute rule evaluation against portfolio stocks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant="outline" 
            onClick={() => runMatrixEngine('USD')} 
            disabled={isLoadingUSD || isLoadingAll}
            className="h-8 bg-[#0A1524] border-[#38AAFD] text-[#38AAFD] hover:bg-[#0A1524]/80"
            size="sm"
          >
            {isLoadingUSD && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {!isLoadingUSD && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            USD Portfolio
          </Button>
          <Button 
            variant="outline" 
            onClick={() => runMatrixEngine('CAD')} 
            disabled={isLoadingCAD || isLoadingAll}
            className="h-8 bg-[#0A1524] border-[#4CAF50] text-[#4CAF50] hover:bg-[#0A1524]/80"
            size="sm"
          >
            {isLoadingCAD && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {!isLoadingCAD && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            CAD Portfolio
          </Button>
          <Button 
            variant="outline" 
            onClick={() => runMatrixEngine('INTL')} 
            disabled={isLoadingINTL || isLoadingAll}
            className="h-8 bg-[#0A1524] border-[#FFD700] text-[#FFD700] hover:bg-[#0A1524]/80"
            size="sm"
          >
            {isLoadingINTL && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {!isLoadingINTL && <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            INTL Portfolio
          </Button>
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

        {(alertsUSD.length > 0 || alertsCAD.length > 0 || alertsINTL.length > 0) && (
          <div className="mt-4">
            <Tabs defaultValue="usd" className="w-full">
              <TabsList className="bg-[#061220] border border-[#1A304A] grid grid-cols-3 mb-4 h-8 p-0.5">
                <TabsTrigger value="usd" className="text-xs h-7 data-[state=active]:bg-[#1C2938]">
                  USD
                  {alertsUSD.length > 0 && (
                    <Badge className="ml-2 bg-[#38AAFD] text-white text-[10px] h-4 px-1.5">{alertsUSD.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cad" className="text-xs h-7 data-[state=active]:bg-[#1C2938]">
                  CAD
                  {alertsCAD.length > 0 && (
                    <Badge className="ml-2 bg-[#4CAF50] text-white text-[10px] h-4 px-1.5">{alertsCAD.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="intl" className="text-xs h-7 data-[state=active]:bg-[#1C2938]">
                  INTL
                  {alertsINTL.length > 0 && (
                    <Badge className="ml-2 bg-[#FFD700] text-[#061220] text-[10px] h-4 px-1.5">{alertsINTL.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="usd" className="max-h-64 overflow-auto pr-1">
                {alertsUSD.length === 0 ? (
                  <p className="text-center text-[#7A8999] py-2 text-xs">No alerts generated</p>
                ) : (
                  alertsUSD.map((alert, index) => (
                    <AlertCard key={`usd-alert-${index}`} alert={alert} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="cad" className="max-h-64 overflow-auto pr-1">
                {alertsCAD.length === 0 ? (
                  <p className="text-center text-[#7A8999] py-2 text-xs">No alerts generated</p>
                ) : (
                  alertsCAD.map((alert, index) => (
                    <AlertCard key={`cad-alert-${index}`} alert={alert} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="intl" className="max-h-64 overflow-auto pr-1">
                {alertsINTL.length === 0 ? (
                  <p className="text-center text-[#7A8999] py-2 text-xs">No alerts generated</p>
                ) : (
                  alertsINTL.map((alert, index) => (
                    <AlertCard key={`intl-alert-${index}`} alert={alert} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
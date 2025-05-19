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
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-amber-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  // Define icon based on severity
  const SeverityIcon = () => {
    switch (alert.severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'info': return <CheckCircle className="h-5 w-5" />;
      default: return <CheckCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="mb-4 border-[#1A304A] bg-[#0A1524]">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Badge className={getSeverityColor(alert.severity)}>
              <SeverityIcon /> 
              <span className="ml-1">{alert.severity}</span>
            </Badge>
            <Badge className="bg-slate-700">{alert.region}</Badge>
          </div>
          <Badge variant="outline">{alert.ruleType}</Badge>
        </div>
        <CardTitle className="text-xl mt-2">{alert.symbol}</CardTitle>
        <CardDescription className="font-medium text-white/80">{alert.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{alert.details}</p>
      </CardContent>
    </Card>
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
    <Card className="border-[#1A304A] bg-[#0A1524] mb-8">
      <CardHeader>
        <CardTitle>Matrix Engine Controls</CardTitle>
        <CardDescription>
          Run rule evaluation against portfolio stocks to generate alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Button 
            variant="default" 
            onClick={() => runMatrixEngine('USD')} 
            disabled={isLoadingUSD || isLoadingAll}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            {isLoadingUSD && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoadingUSD && <RefreshCw className="mr-2 h-4 w-4" />}
            Run USD Portfolio
          </Button>
          <Button 
            variant="default" 
            onClick={() => runMatrixEngine('CAD')} 
            disabled={isLoadingCAD || isLoadingAll}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoadingCAD && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoadingCAD && <RefreshCw className="mr-2 h-4 w-4" />}
            Run CAD Portfolio
          </Button>
          <Button 
            variant="default" 
            onClick={() => runMatrixEngine('INTL')} 
            disabled={isLoadingINTL || isLoadingAll}
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            {isLoadingINTL && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoadingINTL && <RefreshCw className="mr-2 h-4 w-4" />}
            Run INTL Portfolio
          </Button>
        </div>
        <Button 
          variant="outline" 
          onClick={runMatrixEngineForAll} 
          disabled={isLoadingUSD || isLoadingCAD || isLoadingINTL || isLoadingAll}
          className="w-full"
        >
          {isLoadingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isLoadingAll && <RefreshCw className="mr-2 h-4 w-4" />}
          Run All Portfolios
        </Button>
      </CardContent>
      <CardFooter className="flex-col">
        <Tabs defaultValue="usd" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="usd">
              USD
              {alertsUSD.length > 0 && (
                <Badge className="ml-2 bg-blue-500">{alertsUSD.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cad">
              CAD
              {alertsCAD.length > 0 && (
                <Badge className="ml-2 bg-green-600">{alertsCAD.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="intl">
              INTL
              {alertsINTL.length > 0 && (
                <Badge className="ml-2 bg-amber-500">{alertsINTL.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="usd" className="max-h-96 overflow-auto">
            {alertsUSD.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No alerts generated for USD portfolio</p>
            ) : (
              alertsUSD.map((alert, index) => (
                <AlertCard key={`usd-alert-${index}`} alert={alert} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="cad" className="max-h-96 overflow-auto">
            {alertsCAD.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No alerts generated for CAD portfolio</p>
            ) : (
              alertsCAD.map((alert, index) => (
                <AlertCard key={`cad-alert-${index}`} alert={alert} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="intl" className="max-h-96 overflow-auto">
            {alertsINTL.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No alerts generated for INTL portfolio</p>
            ) : (
              alertsINTL.map((alert, index) => (
                <AlertCard key={`intl-alert-${index}`} alert={alert} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardFooter>
    </Card>
  );
};
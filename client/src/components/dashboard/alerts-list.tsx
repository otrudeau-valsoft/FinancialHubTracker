import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getAlertSeverityClass } from "@/lib/utils";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface Alert {
  id: number;
  symbol: string;
  message: string;
  details: string;
  severity: 'critical' | 'warning' | 'info';
  ruleType: string;
  isActive: boolean;
  createdAt: string;
}

interface AlertsListProps {
  alerts: Alert[];
  limit?: number;
}

export const AlertsList = ({ alerts, limit = 5 }: AlertsListProps) => {
  const displayAlerts = alerts.slice(0, limit);
  
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-danger" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-[#FFC107]" />;
      case 'info':
        return <Info className="h-5 w-5 text-secondary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };
  
  return (
    <Card className="mb-6 border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">MATRIX RULE ALERTS</h3>
          <div className="flex items-center gap-2">
            <button className="text-[10px] sm:text-xs text-[#38AAFD]">View All</button>
            <div className="h-1 w-8 bg-[#FF5722]"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 bg-[#0A1929]">
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {displayAlerts.length > 0 ? (
            displayAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-center p-2 rounded-md ${getAlertSeverityClass(alert.severity)}`}
              >
                <div className="flex-shrink-0 mr-3">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div>
                  <div className="text-xs font-medium">{alert.symbol} - {alert.message}</div>
                  <div className="text-xs text-gray-400">{alert.details}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4 text-sm text-gray-400">
              No active alerts at this time
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

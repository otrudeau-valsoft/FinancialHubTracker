import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getAlertSeverityClass } from "@/lib/utils";
import { AlertCircle, CheckCircle, AlertTriangle, Info, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

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

export const AlertsList = ({ alerts, limit = 15 }: AlertsListProps) => {
  const [, navigate] = useLocation();
  const displayAlerts = alerts.slice(0, limit);
  
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertCircle className="h-3 w-3 text-[#FF3D00]" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-[#FF9800]" />;
      case 'info':
        return <Info className="h-3 w-3 text-[#38AAFD]" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-[#4CAF50]" />;
      default:
        return <Info className="h-3 w-3 text-[#7A8999]" />;
    }
  };

  const getRuleTypeIcon = (ruleType: string) => {
    if (ruleType.includes('Increase') || ruleType.includes('Golden') || ruleType.includes('Above')) {
      return <TrendingUp className="h-3 w-3 text-[#4CAF50]" />;
    } else if (ruleType.includes('Decrease') || ruleType.includes('Death') || ruleType.includes('Below')) {
      return <TrendingDown className="h-3 w-3 text-[#FF3D00]" />;
    }
    return <Info className="h-3 w-3 text-[#38AAFD]" />;
  };

  const getAlertTypeColor = (message: string) => {
    if (message.includes('Golden Cross') || message.includes('Above Threshold') || message.includes('Increase')) {
      return 'text-[#4CAF50]';
    } else if (message.includes('Death Cross') || message.includes('Below Threshold') || message.includes('Negative')) {
      return 'text-[#FF3D00]';
    }
    return 'text-[#FF9800]';
  };
  
  return (
    <div className="bg-[#0A1524] border border-[#1A304A] overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-[#1A304A]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-[#EFEFEF] text-sm tracking-wide">MATRIX RULE ALERTS</h3>
            <div className="flex items-center mt-1">
              <div className="h-0.5 w-6 bg-[#FF3D00]"></div>
              <span className="ml-2 text-[#7A8999] font-mono text-xs">{alerts.length} ACTIVE</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/matrix-engine')}
            className="flex items-center gap-1 text-[#38AAFD] hover:text-[#EFEFEF] font-mono text-xs transition-colors group"
          >
            VIEW ALL
            <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-hidden">
        <div className="space-y-2 max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#1A304A] scrollbar-track-transparent">
          {displayAlerts.length > 0 ? (
            displayAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center p-2 rounded border border-[#1A304A]/50 bg-[#061220]/30 hover:bg-[#1A304A]/20 transition-colors"
              >
                <div className="flex-shrink-0 mr-2">
                  {getRuleTypeIcon(alert.message)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[#38AAFD] text-xs font-medium">{alert.symbol}</span>
                    <div className="flex-shrink-0">
                      {getSeverityIcon(alert.severity)}
                    </div>
                  </div>
                  <div className={`text-xs font-mono truncate ${getAlertTypeColor(alert.message)}`}>
                    {alert.message}
                  </div>
                  {alert.details && (
                    <div className="text-[10px] text-[#7A8999] font-mono mt-0.5 truncate">
                      {alert.details}
                    </div>
                  )}
                  <div className="text-[9px] text-[#7A8999] font-mono mt-1">
                    {new Date(alert.createdAt).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-[#7A8999] font-mono text-xs">
              NO ACTIVE ALERTS AT THIS TIME
            </div>
          )}
        </div>
      </div>
      
      {alerts.length > limit && (
        <div className="p-2 border-t border-[#1A304A] bg-[#061220]">
          <button 
            onClick={() => navigate('/matrix-engine')}
            className="w-full text-center text-[#38AAFD] hover:text-[#EFEFEF] font-mono text-xs transition-colors"
          >
            +{alerts.length - limit} MORE ALERTS
          </button>
        </div>
      )}
    </div>
  );
};

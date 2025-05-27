import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface CashPanelProps {
  className?: string;
}

interface CashBalance {
  id: number;
  region: string;
  amount: string;
  updatedAt: string;
}

export function CashManagementPanel({ className }: CashPanelProps) {
  const [usdValue, setUsdValue] = React.useState('0');
  const [cadValue, setCadValue] = React.useState('0');
  const [intlValue, setIntlValue] = React.useState('0');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  // Load cash data on mount
  React.useEffect(() => {
    const loadCashData = async () => {
      try {
        const response = await apiRequest('GET', '/api/cash');
        if (Array.isArray(response)) {
          response.forEach((cash: CashBalance) => {
            if (cash.region === 'USD') setUsdValue(cash.amount);
            if (cash.region === 'CAD') setCadValue(cash.amount);
            if (cash.region === 'INTL') setIntlValue(cash.amount);
          });
        }
      } catch (error) {
        console.error('Error loading cash data:', error);
      }
    };
    loadCashData();
  }, []);

  const handleSave = async (region: string, amount: string) => {
    if (!amount || isNaN(Number(amount))) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid number',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('POST', `/api/cash/${region}`, { amount });
      toast({
        title: 'Cash balance updated',
        description: `${region} cash balance updated to $${Number(amount).toLocaleString()}`
      });
      // Refresh page to sync all components
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error updating cash balance',
        description: 'Failed to update cash balance',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    const usd = parseFloat(usdValue) || 0;
    const cad = parseFloat(cadValue) || 0;
    const intl = parseFloat(intlValue) || 0;
    return usd + cad + intl;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4" />
          CASH BALANCES
          <span className="ml-auto text-green-400">
            TOTAL: ${calculateTotal().toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground mb-4">
          Cash values are used in portfolio calculations for NAV and weights
        </p>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">USD:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={usdValue}
              onChange={(e) => setUsdValue(e.target.value)}
              className="flex-1 h-8"
              placeholder="0"
            />
            <Button
              size="sm"
              onClick={() => handleSave('USD', usdValue)}
              disabled={isLoading}
              className="h-8 px-3"
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">CAD:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={cadValue}
              onChange={(e) => setCadValue(e.target.value)}
              className="flex-1 h-8"
              placeholder="0"
            />
            <Button
              size="sm"
              onClick={() => handleSave('CAD', cadValue)}
              disabled={isLoading}
              className="h-8 px-3"
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">INTL:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={intlValue}
              onChange={(e) => setIntlValue(e.target.value)}
              className="flex-1 h-8"
              placeholder="0"
            />
            <Button
              size="sm"
              onClick={() => handleSave('INTL', intlValue)}
              disabled={isLoading}
              className="h-8 px-3"
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
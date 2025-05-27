import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface CashPanelProps {
  className?: string;
}

export function CashManagementPanel({ className }: CashPanelProps) {
  const [usdValue, setUsdValue] = useState('0');
  const [cadValue, setCadValue] = useState('0');
  const [intlValue, setIntlValue] = useState('0');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load cash data when component mounts
  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      const response = await apiRequest('GET', '/api/cash');
      if (Array.isArray(response)) {
        response.forEach((cash: any) => {
          if (cash.region === 'USD') setUsdValue(cash.amount);
          if (cash.region === 'CAD') setCadValue(cash.amount);
          if (cash.region === 'INTL') setIntlValue(cash.amount);
        });
      }
    } catch (error) {
      console.error('Failed to load cash data:', error);
    }
  };

  const handleSave = async (region: string, amount: string) => {
    if (!amount || isNaN(Number(amount))) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid number',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await apiRequest('POST', `/api/cash/${region}`, { amount });
      toast({
        title: 'Success!',
        description: `${region} cash balance updated to $${Number(amount).toLocaleString()}`
      });
      // Reload the page to sync everything
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update cash balance',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const total = (parseFloat(usdValue) || 0) + (parseFloat(cadValue) || 0) + (parseFloat(intlValue) || 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4" />
          CASH BALANCES
          <span className="ml-auto text-green-400">
            TOTAL: ${total.toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground mb-4">
          Cash values are used in portfolio calculations for NAV and weights
        </p>
        
        {/* USD Row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">USD:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={usdValue}
              onChange={(e) => setUsdValue(e.target.value)}
              className="flex-1 h-8"
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={() => handleSave('USD', usdValue)}
              disabled={loading}
              className="h-8 px-3"
            >
              Save
            </Button>
          </div>
        </div>

        {/* CAD Row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">CAD:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={cadValue}
              onChange={(e) => setCadValue(e.target.value)}
              className="flex-1 h-8"
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={() => handleSave('CAD', cadValue)}
              disabled={loading}
              className="h-8 px-3"
            >
              Save
            </Button>
          </div>
        </div>

        {/* INTL Row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-[40px]">INTL:</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm">$</span>
            <Input
              type="number"
              value={intlValue}
              onChange={(e) => setIntlValue(e.target.value)}
              className="flex-1 h-8"
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={() => handleSave('INTL', intlValue)}
              disabled={loading}
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
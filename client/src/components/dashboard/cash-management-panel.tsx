import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [cashValues, setCashValues] = React.useState<{[key: string]: string}>({
    USD: '0',
    CAD: '0', 
    INTL: '0'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load data on mount
  React.useEffect(() => {
    const fetchCashData = async () => {
      try {
        const response = await apiRequest('GET', '/api/cash');
        if (Array.isArray(response)) {
          const newValues: {[key: string]: string} = { USD: '0', CAD: '0', INTL: '0' };
          response.forEach((cash: CashBalance) => {
            newValues[cash.region] = cash.amount;
          });
          setCashValues(newValues);
        }
      } catch (error) {
        console.error('Error loading cash data:', error);
      }
    };
    
    fetchCashData();
  }, []);

  // Mutation to update cash balance
  const updateCashMutation = useMutation({
    mutationFn: ({ region, amount }: { region: string; amount: string }) => 
      apiRequest('POST', `/api/cash/${region}`, { amount }),
    onSuccess: (_, variables) => {
      setCashValues(prev => ({
        ...prev,
        [variables.region]: variables.amount
      }));
      
      toast({
        title: 'Cash balance updated',
        description: `${variables.region} cash balance updated to $${Number(variables.amount).toLocaleString()}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating cash balance',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleInputChange = (region: string, value: string) => {
    setCashValues(prev => ({
      ...prev,
      [region]: value
    }));
  };

  const handleSave = (region: string) => {
    const amount = cashValues[region];
    if (amount && !isNaN(Number(amount))) {
      updateCashMutation.mutate({ region, amount });
    }
  };

  const calculateTotal = () => {
    return Object.values(cashValues).reduce((sum, value) => {
      const num = parseFloat(value) || 0;
      return sum + num;
    }, 0);
  };

  const regions = ['USD', 'CAD', 'INTL'];

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
        
        {regions.map((region) => (
          <div key={region} className="flex items-center gap-2">
            <span className="text-sm font-medium min-w-[40px]">
              {region}:
            </span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">$</span>
              <Input
                type="number"
                value={cashValues[region] || '0'}
                onChange={(e) => handleInputChange(region, e.target.value)}
                className="flex-1 h-8"
                placeholder="0"
              />
              <Button
                size="sm"
                onClick={() => handleSave(region)}
                disabled={updateCashMutation.isPending}
                className="h-8 px-3"
              >
                Save
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
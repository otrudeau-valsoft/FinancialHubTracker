import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Wallet } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CashPanelProps {
  className?: string;
}

interface CashBalance {
  id: number;
  region: string;
  amount: string;
  updatedAt: string;
}

const CashManagementPanel: React.FC<CashPanelProps> = ({ className }) => {
  const [cashValues, setCashValues] = useState<{[key: string]: string}>({
    USD: '',
    CAD: '',
    INTL: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch cash balances
  const { data: cashBalances, isLoading } = useQuery({
    queryKey: ['/api/cash'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/cash');
      return response as unknown as CashBalance[];
    }
  });
  
  // Update local state when data is loaded
  React.useEffect(() => {
    if (cashBalances && cashBalances.length > 0) {
      const values: {[key: string]: string} = {};
      cashBalances.forEach(cash => {
        values[cash.region] = cash.amount;
      });
      setCashValues(values);
    }
  }, [cashBalances]);

  // Mutation to update cash balance
  const updateCashMutation = useMutation({
    mutationFn: ({ region, amount }: { region: string; amount: string }) => 
      apiRequest('POST', `/api/cash/${region}`, { amount }),
    onSuccess: (_, variables) => {
      toast({
        title: 'Cash balance updated',
        description: `${variables.region} cash balance updated to $${Number(variables.amount).toLocaleString()}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cash'] });
      queryClient.invalidateQueries({ queryKey: ['/api/holdings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating cash balance',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handle input change
  const handleInputChange = (region: string, value: string) => {
    setCashValues(prev => ({
      ...prev,
      [region]: value
    }));
  };

  // Handle save button click
  const handleSave = (region: string) => {
    const amount = cashValues[region];
    if (!amount) return;
    
    updateCashMutation.mutate({ region, amount });
  };

  // Calculate total cash across all portfolios
  const totalCash = React.useMemo(() => {
    if (!cashBalances || !Array.isArray(cashBalances)) return 0;
    return cashBalances.reduce((sum: number, cash: CashBalance) => 
      sum + parseFloat(cash.amount || '0'), 0);
  }, [cashBalances]);

  return (
    <Card className={`bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg ${className}`}>
      <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
            <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#4CAF50]" />
            CASH BALANCES
          </CardTitle>
          <div className="text-sm text-[#EFEFEF] font-mono">
            TOTAL: <span className="text-[#4CAF50]">${totalCash.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-[#7A8999] py-3">
            Loading cash balances...
          </div>
        ) : (
          <>
            {Array.isArray(cashBalances) && cashBalances.map(cash => (
              <div key={cash.region} className="flex items-center gap-2">
                <div className="w-12 font-mono text-xs text-[#EFEFEF]">{cash.region}</div>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7A8999]" />
                  <Input
                    type="number"
                    value={cashValues[cash.region] || ''}
                    onChange={(e) => handleInputChange(cash.region, e.target.value)}
                    className="bg-[#1C2938] border-[#1A304A] pl-8 text-[#EFEFEF]"
                    placeholder="Amount"
                  />
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-[#1A304A] bg-[#1C2938] hover:bg-[#243447] text-[#4CAF50] h-9"
                  onClick={() => handleSave(cash.region)}
                  disabled={updateCashMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="text-xs text-[#7A8999] mt-2 border-t border-[#1A304A] pt-2">
              Cash values are used in portfolio calculations for NAV and weights
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CashManagementPanel;
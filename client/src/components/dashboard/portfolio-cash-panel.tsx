import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CashBalance {
  id: number;
  region: string;
  amount: string;
  updatedAt: string;
}

interface PortfolioCashPanelProps {
  className?: string;
  region?: string;
}

export function PortfolioCashPanel({ className, region = 'USD' }: PortfolioCashPanelProps) {
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query cash balances from API
  const { data: cashBalances, isLoading, error } = useQuery({
    queryKey: ['/api/cash'],
    select: (data: CashBalance[]) => data,
  });

  // Format currency based on region
  const formatCurrency = (amount: string, region: string) => {
    const value = parseFloat(amount);
    switch (region) {
      case 'USD':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'CAD':
        return `C$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'INTL':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Get the cash balance for the current region
  const currentCashBalance = Array.isArray(cashBalances) ? cashBalances.find(cash => cash.region === region) : undefined;

  // Mutation to update cash balance
  const updateCashMutation = useMutation({
    mutationFn: async (newBalance: { region: string; amount: string }) => {
      return apiRequest(`/api/cash/${newBalance.region}`, 'PATCH', newBalance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash'] });
      toast({
        title: 'Cash Balance Updated',
        description: `Successfully updated ${region} cash balance.`,
      });
      setIsEditing(false);
      setCashAmount('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: `Could not update cash balance: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleEditToggle = () => {
    if (isEditing && cashAmount) {
      // Save the changes
      const amount = parseFloat(cashAmount).toFixed(2);
      updateCashMutation.mutate({ region, amount });
    } else {
      // Start editing
      setIsEditing(true);
      if (currentCashBalance) {
        setCashAmount(parseFloat(currentCashBalance.amount).toFixed(2));
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCashAmount('');
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="bg-[#0A1524] border border-[#1A304A] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#1A304A]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-medium text-[#EFEFEF] font-mono tracking-tight">
                <DollarSign className="h-4 w-4 text-[#4CAF50]" />
                PORTFOLIO CASH
              </div>
              <div className="flex mt-1">
                <div className="h-0.5 w-6 bg-[#4CAF50]"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-[#4CAF50]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0A1524] border border-[#1A304A] rounded-md overflow-hidden">
        <div className="p-4 border-b border-[#1A304A]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-medium text-[#EFEFEF] font-mono tracking-tight">
                <DollarSign className="h-4 w-4 text-[#4CAF50]" />
                PORTFOLIO CASH
              </div>
              <div className="flex mt-1">
                <div className="h-0.5 w-6 bg-[#4CAF50]"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="text-[#FF3D00] font-mono text-sm">Error loading cash balance</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A1524] border border-[#1A304A] rounded-md overflow-hidden">
      <div className="p-4 border-b border-[#1A304A]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-medium text-[#EFEFEF] font-mono tracking-tight">
              <DollarSign className="h-4 w-4 text-[#4CAF50]" />
              PORTFOLIO CASH {region === 'INTL' ? '(USD)' : ''}
            </div>
            <div className="flex mt-1">
              <div className="h-0.5 w-6 bg-[#4CAF50]"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="cashAmount" className="text-[#7A8999] font-mono text-xs">Cash Amount</Label>
              <Input
                id="cashAmount"
                type="number"
                step="0.01"
                min="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Enter cash amount"
                className="border-[#1A304A] bg-[#0B1728] text-[#EFEFEF]"
              />
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5">
              <div className="text-2xl font-bold text-[#EFEFEF] font-mono">
                {currentCashBalance ? formatCurrency(currentCashBalance.amount, region) : 'N/A'}
              </div>
              <div className="text-xs text-[#7A8999] font-mono">
                Last updated: {currentCashBalance ? new Date(currentCashBalance.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
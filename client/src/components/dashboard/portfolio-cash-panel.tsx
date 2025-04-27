import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
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
  const currentCashBalance = cashBalances?.find(cash => cash.region === region);

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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Portfolio Cash Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Portfolio Cash Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-destructive">
            Error loading cash balances
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Portfolio Cash Balance
        </CardTitle>
        <CardDescription>
          Current available cash for {region} portfolio {region === 'INTL' ? '(in USD)' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="cashAmount">Cash Amount</Label>
              <Input
                id="cashAmount"
                type="number"
                step="0.01"
                min="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Enter cash amount"
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5">
              <div className="text-2xl font-bold">
                {currentCashBalance ? formatCurrency(currentCashBalance.amount, region) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {currentCashBalance ? new Date(currentCashBalance.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Quick view of other regions */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">All Portfolio Cash</h4>
            <div className="grid grid-cols-3 gap-2">
              {cashBalances?.map((cash) => (
                <div 
                  key={cash.region}
                  className={`p-2 rounded-md ${cash.region === region ? 'bg-primary/10' : 'bg-muted'}`}
                >
                  <div className="text-xs font-medium">{cash.region}</div>
                  <div className="text-sm font-semibold">{formatCurrency(cash.amount, cash.region)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditToggle} disabled={updateCashMutation.isPending}>
              {updateCashMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleEditToggle}
          >
            Edit Cash Balance
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Wallet, DollarSign } from 'lucide-react';

interface CashPanelProps {
  className?: string;
}

export default function CashManagementPanel({ className }: CashPanelProps) {
  const [usd, setUsd] = useState('0');
  const [cad, setCad] = useState('0');
  const [intl, setIntl] = useState('0');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load cash data on mount
  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      const response = await apiRequest('GET', '/api/cash');
      console.log('Cash API response:', response);
      if (Array.isArray(response)) {
        response.forEach((cash: any) => {
          const amount = String(cash.amount || '0');
          console.log(`Setting ${cash.region} to ${amount}`);
          if (cash.region === 'USD') setUsd(amount);
          if (cash.region === 'CAD') setCad(amount);
          if (cash.region === 'INTL') setIntl(amount);
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
        title: 'Cash balance updated',
        description: `${region} updated to $${Number(amount).toLocaleString()}`
      });
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

  const total = (parseFloat(usd) || 0) + (parseFloat(cad) || 0) + (parseFloat(intl) || 0);

  return (
    <Card className={`bg-[#0A1524] border border-[#1A304A] rounded-none shadow-lg ${className}`}>
      <CardHeader className="bg-[#0D1C30] border-b border-[#1A304A] p-2 sm:p-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#EFEFEF] text-base sm:text-lg font-mono flex items-center">
            <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#4CAF50]" />
            CASH BALANCES
          </CardTitle>
          <div className="text-sm text-[#EFEFEF] font-mono">
            TOTAL: <span className="text-[#4CAF50]">${total.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <p className="text-xs text-[#7A8999] mb-4">
          Cash values are used in portfolio calculations for NAV and weights
        </p>
        
        {/* USD */}
        <div className="flex items-center gap-2">
          <div className="w-12 font-mono text-xs text-[#EFEFEF]">USD</div>
          <div className="relative flex-1">
            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7A8999]" />
            <Input
              type="number"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              className="bg-[#1C2938] border-[#1A304A] pl-8 text-[#EFEFEF]"
              disabled={loading}
            />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleSave('USD', usd)}
            disabled={loading}
            className="bg-[#38AAFD] hover:bg-[#1D90E0] border-[#38AAFD] text-white text-xs px-3 py-1"
          >
            Save
          </Button>
        </div>

        {/* CAD */}
        <div className="flex items-center gap-2">
          <div className="w-12 font-mono text-xs text-[#EFEFEF]">CAD</div>
          <div className="relative flex-1">
            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7A8999]" />
            <Input
              type="number"
              value={cad}
              onChange={(e) => setCad(e.target.value)}
              className="bg-[#1C2938] border-[#1A304A] pl-8 text-[#EFEFEF]"
              disabled={loading}
            />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleSave('CAD', cad)}
            disabled={loading}
            className="bg-[#38AAFD] hover:bg-[#1D90E0] border-[#38AAFD] text-white text-xs px-3 py-1"
          >
            Save
          </Button>
        </div>

        {/* INTL */}
        <div className="flex items-center gap-2">
          <div className="w-12 font-mono text-xs text-[#EFEFEF]">INTL</div>
          <div className="relative flex-1">
            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7A8999]" />
            <Input
              type="number"
              value={intl}
              onChange={(e) => setIntl(e.target.value)}
              className="bg-[#1C2938] border-[#1A304A] pl-8 text-[#EFEFEF]"
              disabled={loading}
            />
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleSave('INTL', intl)}
            disabled={loading}
            className="bg-[#38AAFD] hover:bg-[#1D90E0] border-[#38AAFD] text-white text-xs px-3 py-1"
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
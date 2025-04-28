import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/financial';

interface PortfolioCashValuePanelProps {
  region: 'USD' | 'CAD' | 'INTL';
}

export function PortfolioCashValuePanel({ region }: PortfolioCashValuePanelProps) {
  const [cashValue, setCashValue] = useState(0);
  const [cashPercent, setCashPercent] = useState(0);
  const [cashSymbol, setCashSymbol] = useState('');
  const [cashShares, setCashShares] = useState(0);
  
  // Set currency symbol based on region
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  // Get all necessary data
  const { data: portfolioHoldings, isLoading: holdingsLoading } = useQuery({
    queryKey: [`/api/holdings/${region}`],
    staleTime: 60000, // 1 minute
  });
  
  const { data: cashBalance, isLoading: cashLoading } = useQuery({
    queryKey: ['/api/cash'],
    select: (data) => Array.isArray(data) ? data.find(cash => cash.region === region) : undefined,
    staleTime: 60000, // 1 minute
  });
  
  // Calculate cash position when data is available
  useEffect(() => {
    if (portfolioHoldings && Array.isArray(portfolioHoldings)) {
      // Find cash holdings
      const cashHolding = portfolioHoldings.find(h => h.stockType === 'Cash' || h.symbol === 'CASH');
      
      // Calculate total portfolio value
      const totalValue = portfolioHoldings.reduce((sum, holding) => {
        return sum + parseFloat(holding.netAssetValue || '0');
      }, 0);
      
      // Find ETF cash equivalent (like BIL)
      const cashEtf = portfolioHoldings.find(holding => 
        holding.symbol.includes('BIL') || 
        holding.symbol.includes('SHV')
      );
      
      // Set cash values
      if (cashHolding) {
        const cashValue = parseFloat(cashHolding.netAssetValue || '0');
        const cashPercentage = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;
        
        setCashValue(cashValue);
        setCashPercent(cashPercentage);
      }
      
      // Set cash ETF info if available
      if (cashEtf) {
        setCashSymbol(cashEtf.symbol);
        setCashShares(parseFloat(cashEtf.quantity || '0'));
      } else {
        setCashSymbol('CASH');
        setCashShares(0);
      }
    }
  }, [portfolioHoldings, cashBalance]);
  
  // Loading state
  if (holdingsLoading || cashLoading) {
    return (
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">CASH</h3>
            <div className="h-1 w-8 bg-[#FDD835]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-1.5">
          <div className="animate-pulse">
            <div className="h-6 bg-[#1A304A] rounded w-24 mb-2"></div>
            <div className="h-4 bg-[#1A304A] rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">CASH</h3>
          <div className="h-1 w-8 bg-[#FDD835]"></div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-lg sm:text-xl font-semibold text-[#EFEFEF] mono">
            {formatCurrency(cashValue, currencySymbol)}
          </span>
          <span className="text-[10px] sm:text-xs mono font-medium px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-400">
            {cashPercent.toFixed(1)}%
          </span>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 mt-2 flex justify-between">
          <span>{cashSymbol}:</span> 
          <span className="mono font-medium">{cashShares > 0 ? `${cashShares} shares` : 'Direct cash'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
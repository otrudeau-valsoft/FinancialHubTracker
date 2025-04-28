import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

interface AllocationData {
  [key: string]: number;
}

interface PortfolioAllocationPanelProps {
  region: 'USD' | 'CAD' | 'INTL';
}

export function PortfolioAllocationPanel({ region }: PortfolioAllocationPanelProps) {
  const [typeAllocation, setTypeAllocation] = useState<AllocationData>({
    Comp: 0, Cat: 0, Cycl: 0, Cash: 0
  });
  const [ratingAllocation, setRatingAllocation] = useState<AllocationData>({
    "1": 0, "2": 0, "3": 0, "4": 0
  });
  
  // Get holdings data
  const { data: portfolioHoldings, isLoading } = useQuery({
    queryKey: [`/api/holdings/${region}`],
    staleTime: 60000, // 1 minute
  });
  
  // Calculate allocations when holdings data is available
  useEffect(() => {
    if (portfolioHoldings && Array.isArray(portfolioHoldings)) {
      // Calculate total portfolio value
      const totalValue = portfolioHoldings.reduce((sum, holding) => {
        return sum + parseFloat(holding.netAssetValue || '0');
      }, 0);
      
      // Initialize allocation objects
      const typeAlloc: AllocationData = { Comp: 0, Cat: 0, Cycl: 0, Cash: 0 };
      const ratingAlloc: AllocationData = { "1": 0, "2": 0, "3": 0, "4": 0 };
      
      // Calculate allocations
      portfolioHoldings.forEach(holding => {
        const nav = parseFloat(holding.netAssetValue || '0');
        const weight = totalValue > 0 ? (nav / totalValue) * 100 : 0;
        
        // Stock type allocation
        const type = holding.stockType || 'Unknown';
        typeAlloc[type] = (typeAlloc[type] || 0) + weight;
        
        // Stock rating allocation
        const rating = holding.rating || 'Unknown';
        ratingAlloc[rating] = (ratingAlloc[rating] || 0) + weight;
      });
      
      // Round the values
      Object.keys(typeAlloc).forEach(key => {
        typeAlloc[key] = Math.round(typeAlloc[key]);
      });
      
      Object.keys(ratingAlloc).forEach(key => {
        ratingAlloc[key] = Math.round(ratingAlloc[key]);
      });
      
      // Update state
      setTypeAllocation(typeAlloc);
      setRatingAllocation(ratingAlloc);
    }
  }, [portfolioHoldings]);
  
  // Colors for the allocation charts
  const typeColors: Record<string, string> = {
    Comp: '#4CAF50',
    Cat: '#2196F3',
    Cycl: '#FF9800',
    Cash: '#9E9E9E'
  };
  
  const ratingColors: Record<string, string> = {
    "1": '#4CAF50',
    "2": '#2196F3',
    "3": '#FF9800',
    "4": '#F44336'
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden h-full">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">ALLOCATION</h3>
            <div className="h-1 w-8 bg-[#FFD700]"></div>
          </div>
        </CardHeader>
        <CardContent className="p-2 pt-3 min-h-[200px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center w-full">
            <div className="h-24 w-24 bg-[#1A304A] rounded-full mb-4"></div>
            <div className="h-4 bg-[#1A304A] rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-[#1A304A] rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden h-full">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">ALLOCATION</h3>
          <div className="h-1 w-8 bg-[#FFD700]"></div>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-3">
        <div className="space-y-4">
          {/* Stock Type Allocation */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-[#B8C4D9] uppercase">By Type</div>
            <div className="flex items-center justify-between">
              {Object.entries(typeAllocation).map(([type, value]) => (
                <div key={type} className="flex flex-col items-center">
                  <div className="text-xl font-bold" style={{ color: typeColors[type] || '#ccc' }}>
                    {value}%
                  </div>
                  <div className="text-[10px] text-[#7A8999] font-mono mt-1">{type}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Rating Allocation */}
          <div className="space-y-2 mt-6">
            <div className="text-[10px] font-mono text-[#B8C4D9] uppercase">By Rating</div>
            <div className="flex items-center justify-between">
              {Object.entries(ratingAllocation).map(([rating, value]) => (
                <div key={rating} className="flex flex-col items-center">
                  <div className="text-xl font-bold" style={{ color: ratingColors[rating] || '#ccc' }}>
                    {value}%
                  </div>
                  <div className="text-[10px] text-[#7A8999] font-mono mt-1">{rating}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
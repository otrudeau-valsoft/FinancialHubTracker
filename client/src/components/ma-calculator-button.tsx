import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { LineChart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

/**
 * Button component for calculating Moving Average data for all stocks
 * in all portfolios (USD, CAD, INTL)
 */
export function MACalculatorButton() {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Mutation for calculating MA data for all portfolios
  const calculateAllMAMutation = useMutation({
    mutationFn: async () => {
      try {
        setIsCalculating(true);
        
        // Process each region in sequence
        const usdResult = await apiRequest('POST', '/api/moving-average/calculate-portfolio/USD');
        toast({
          title: "USD Moving Averages",
          description: "Processing USD portfolio stocks...",
        });
        
        const cadResult = await apiRequest('POST', '/api/moving-average/calculate-portfolio/CAD');
        toast({
          title: "CAD Moving Averages",
          description: "Processing CAD portfolio stocks...",
        });
        
        const intlResult = await apiRequest('POST', '/api/moving-average/calculate-portfolio/INTL');
        toast({
          title: "INTL Moving Averages",
          description: "Processing INTL portfolio stocks...",
        });
        
        return {
          USD: usdResult,
          CAD: cadResult,
          INTL: intlResult
        };
      } finally {
        setIsCalculating(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Moving Averages Updated",
        description: "All portfolios now have updated Moving Average data",
      });
      
      // Invalidate all MA data queries to refresh any views
      queryClient.invalidateQueries({ queryKey: ['/api/moving-average'] });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Moving Averages",
        description: error.message || "An error occurred while calculating Moving Average data",
        variant: "destructive"
      });
    }
  });
  
  return (
    <Button 
      variant="default" 
      onClick={() => calculateAllMAMutation.mutate()}
      disabled={isCalculating || calculateAllMAMutation.isPending}
      className="bg-[#38AAFD] hover:bg-[#2B85DB] text-white rounded-sm"
      size="sm"
    >
      {isCalculating || calculateAllMAMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calculating MA...
        </>
      ) : (
        <>
          <LineChart className="mr-2 h-4 w-4" />
          Calculate All Moving Averages
        </>
      )}
    </Button>
  );
}
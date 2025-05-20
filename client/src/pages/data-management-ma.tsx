import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { LineChart, RotateCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { calculatePortfolioMovingAverages } from '@/hooks/use-moving-average';

/**
 * Moving Average Data Management Panel
 * 
 * This panel provides buttons to calculate Moving Average data for all stocks
 * in USD, CAD, and INTL portfolios.
 */
export function MovingAverageDataPanel() {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Mutation for calculating MA data for a specific portfolio region
  const calculateMAMutation = useMutation({
    mutationFn: async (region: string) => {
      try {
        setIsCalculating(true);
        return await calculatePortfolioMovingAverages(region);
      } finally {
        setIsCalculating(false);
      }
    },
    onSuccess: (data, region) => {
      toast({
        title: "Moving Averages Calculated",
        description: `Successfully calculated Moving Average data for ${region} portfolio`,
      });
      
      // Invalidate MA data queries to refresh any views
      queryClient.invalidateQueries({ queryKey: ['/api/moving-average'] });
    },
    onError: (error) => {
      toast({
        title: "Error Calculating Moving Averages",
        description: error.message || "An error occurred calculating Moving Average data",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for calculating MA data for all portfolios
  const calculateAllMAMutation = useMutation({
    mutationFn: async () => {
      try {
        setIsCalculating(true);
        // Calculate MA data for all three portfolios in sequence
        await calculatePortfolioMovingAverages('USD');
        await calculatePortfolioMovingAverages('CAD');
        await calculatePortfolioMovingAverages('INTL');
        return { success: true };
      } finally {
        setIsCalculating(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "All Moving Averages Calculated",
        description: "Successfully calculated Moving Average data for all portfolios",
      });
      
      // Invalidate all MA data queries to refresh any views
      queryClient.invalidateQueries({ queryKey: ['/api/moving-average'] });
    },
    onError: (error) => {
      toast({
        title: "Error Calculating All Moving Averages",
        description: error.message || "An error occurred calculating Moving Average data",
        variant: "destructive"
      });
    }
  });
  
  return (
    <Card className="border-[#1A304A] shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-mono flex items-center">
          <LineChart className="h-5 w-5 mr-2 text-[#38AAFD]" />
          Moving Average Data
        </CardTitle>
        <CardDescription>
          Calculate 50-day and 200-day Moving Averages for all stocks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => calculateMAMutation.mutate('USD')}
            disabled={isCalculating}
            className="flex items-center justify-center"
          >
            {calculateMAMutation.isPending && calculateMAMutation.variables === 'USD' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Update USD MA
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => calculateMAMutation.mutate('CAD')}
            disabled={isCalculating}
            className="flex items-center justify-center"
          >
            {calculateMAMutation.isPending && calculateMAMutation.variables === 'CAD' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Update CAD MA
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => calculateMAMutation.mutate('INTL')}
            disabled={isCalculating}
            className="flex items-center justify-center"
          >
            {calculateMAMutation.isPending && calculateMAMutation.variables === 'INTL' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Update INTL MA
          </Button>
        </div>
        
        <Button 
          variant="default" 
          onClick={() => calculateAllMAMutation.mutate()}
          disabled={isCalculating}
          className="w-full bg-[#38AAFD] hover:bg-[#2B85DB] text-white"
        >
          {calculateAllMAMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LineChart className="h-4 w-4 mr-2" />
          )}
          Calculate All Moving Averages
        </Button>
      </CardContent>
    </Card>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HistoricalPrice {
  id: number;
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  adjustedClose: number | null;
  region: string;
}

interface HistoricalPriceChartProps {
  symbol: string;
  region: 'USD' | 'CAD' | 'INTL';
  period?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
}

export const HistoricalPriceChart = ({ 
  symbol, 
  region,
  period = '1y'
}: HistoricalPriceChartProps) => {
  // Query to fetch historical prices
  const {
    data: prices,
    isLoading,
    isError,
    refetch
  } = useQuery<HistoricalPrice[]>({
    queryKey: [`/api/historical-prices/${symbol}/${region}`],
    enabled: !!symbol && !!region
  });

  // Fetch prices from Yahoo Finance
  const fetchHistoricalPrices = async () => {
    try {
      await apiRequest('POST', `/api/historical-prices/fetch/${symbol}/${region}`, {
        period, 
        interval: '1d'
      });
      
      toast({
        title: "Success",
        description: `Historical prices fetched for ${symbol}`,
        variant: "default",
      });
      
      // Refetch the data
      refetch();
    } catch (error) {
      console.error("Error fetching historical prices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch historical prices from Yahoo Finance",
        variant: "destructive",
      });
    }
  };

  // Format data for chart
  const formatDataForChart = (data: HistoricalPrice[] | undefined) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    return data.map(price => ({
      date: format(new Date(price.date), 'MM/dd/yyyy'),
      close: price.close,
      open: price.open,
      high: price.high,
      low: price.low,
      volume: price.volume
    }));
  };

  return (
    <Card className="w-full h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Historical Price Chart</CardTitle>
          <CardDescription>
            {symbol} price history ({region})
          </CardDescription>
        </div>
        <Button onClick={fetchHistoricalPrices} variant="outline" size="sm">
          Refresh Data
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Skeleton className="w-full h-[300px]" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <p className="text-lg text-destructive">Error loading price data</p>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : prices && prices.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={formatDataForChart(prices)}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.split('/')[0] + '/' + value.split('/')[1]}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toFixed(0)}
                domain={['auto', 'auto']}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#0A7AFF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <p className="text-lg text-muted-foreground">No historical price data</p>
            <Button 
              onClick={fetchHistoricalPrices} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              Fetch from Yahoo Finance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
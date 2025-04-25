import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FiAlertCircle, 
  FiCheckCircle, 
  FiXCircle, 
  FiRefreshCw, 
  FiDollarSign,
  FiCalendar,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

type EarningsConsensus = {
  id: number;
  symbol: string;
  region: string;
  quarter: string;
  reportDate: string | null;
  epsEstimate: number | null;
  epsActual: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  revenueSurprise: number | null;
  revenueSurprisePercent: number | null;
  earningsResult: string | null;
  consensusRecommendation: string | null;
  targetMeanPrice: number | null;
  numberOfAnalysts: number | null;
  updatedAt: string;
};

const formatCurrency = (value: number | null) => {
  if (value === null) return 'N/A';
  
  // Format based on size (M, B, T)
  if (Math.abs(value) >= 1000000000000) {
    return `$${(value / 1000000000000).toFixed(2)}T`;
  } else if (Math.abs(value) >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  }
};

const formatPercent = (value: number | null) => {
  if (value === null) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const getColorForRecommendation = (recommendation: string | null) => {
  if (!recommendation) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  
  switch (recommendation) {
    case 'Strong Buy':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Buy':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
    case 'Hold':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Sell':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'Strong Sell':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getColorForEarningsResult = (result: string | null) => {
  if (!result) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  
  switch (result) {
    case 'Beat':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Miss':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'In-line':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const getValueColor = (value: number | null) => {
  if (value === null) return 'text-gray-500';
  return value > 0 ? 'text-green-600 dark:text-green-400' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
};

const EarningsQuarterView = ({ region, quarter }: { region: string; quarter: string }) => {
  const { data: earningsData, isLoading, isError, refetch } = useQuery({ 
    queryKey: ['/api/earnings-consensus/quarter', quarter, region],
    queryFn: () => apiRequest(`/api/earnings-consensus/quarter/${quarter}/${region}`),
  });

  const { toast } = useToast();

  const fetchEarningsData = async (symbol: string) => {
    try {
      toast({
        title: "Fetching data",
        description: `Retrieving earnings data for ${symbol}...`,
        duration: 2000,
      });

      await apiRequest(`/api/earnings-consensus/fetch/${symbol}/${region}`, { method: 'POST' });
      
      toast({
        title: "Data updated",
        description: `Successfully updated earnings data for ${symbol}`,
        duration: 3000,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/earnings-consensus/quarter', quarter, region] });
      queryClient.invalidateQueries({ queryKey: ['/api/earnings-consensus', symbol, region] });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch earnings data for ${symbol}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const fetchAllEarningsData = async () => {
    try {
      toast({
        title: "Updating earnings data",
        description: `Beginning bulk update for ${region} region. This may take a moment...`,
        duration: 3000,
      });

      await apiRequest(`/api/earnings-consensus/fetch/region/${region}`, { method: 'POST' });
      
      toast({
        title: "Update initiated",
        description: "Earnings data update has been started. Check logs for progress.",
        duration: 3000,
      });
      
      // We'll refetch after a delay to allow some time for processing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/earnings-consensus/quarter', quarter, region] });
      }, 5000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate earnings data update",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{quarter} Earnings - {region}</h3>
          <Button variant="outline" size="sm" disabled>
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>
        
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>EPS Est.</TableHead>
                <TableHead>EPS Act.</TableHead>
                <TableHead>Surprise</TableHead>
                <TableHead>Rev. Est.</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Recom.</TableHead>
                <TableHead>Analysts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(8).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{quarter} Earnings - {region}</h3>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        
        <Card className="border-red-300 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-red-500 space-x-2">
              <FiAlertCircle className="h-8 w-8" />
              <p>Failed to load earnings data. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{quarter} Earnings - {region}</h3>
        <Button variant="outline" size="sm" onClick={fetchAllEarningsData}>
          <FiRefreshCw className="mr-2 h-4 w-4" />
          Refresh All
        </Button>
      </div>
      
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>EPS Est.</TableHead>
              <TableHead>EPS Act.</TableHead>
              <TableHead>Surprise</TableHead>
              <TableHead>Rev. Est.</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Recom.</TableHead>
              <TableHead>Analysts</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earningsData && earningsData.length > 0 ? (
              earningsData.map((item: EarningsConsensus) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.symbol}</TableCell>
                  <TableCell>{item.epsEstimate !== null ? `$${item.epsEstimate.toFixed(2)}` : 'N/A'}</TableCell>
                  <TableCell>{item.epsActual !== null ? `$${item.epsActual.toFixed(2)}` : 'N/A'}</TableCell>
                  <TableCell>
                    {item.epsSurprisePercent !== null ? (
                      <span className={getValueColor(item.epsSurprisePercent)}>
                        {formatPercent(item.epsSurprisePercent)}
                      </span>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.revenueEstimate !== null ? formatCurrency(item.revenueEstimate) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.earningsResult ? (
                      <Badge className={getColorForEarningsResult(item.earningsResult)}>
                        {item.earningsResult}
                      </Badge>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.consensusRecommendation ? (
                      <Badge className={getColorForRecommendation(item.consensusRecommendation)}>
                        {item.consensusRecommendation}
                      </Badge>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{item.numberOfAnalysts ?? 'N/A'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchEarningsData(item.symbol)}
                    >
                      <FiRefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No earnings data available for this quarter.
                  <Button variant="link" onClick={fetchAllEarningsData} className="ml-2">
                    Fetch data from Yahoo Finance
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

const EarningsPage = () => {
  const [activeRegion, setActiveRegion] = useState<string>('USD');
  const { data: latestQuarter, isLoading: isLoadingQuarter } = useQuery({ 
    queryKey: ['/api/earnings-consensus/latest-quarter'],
    queryFn: () => apiRequest('/api/earnings-consensus/latest-quarter'),
  });
  
  // Default to current quarter if API hasn't loaded yet
  const quarter = latestQuarter?.latestQuarter || 'Q2 2025';
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings Consensus Dashboard</h1>
          <p className="text-muted-foreground">
            Track earnings estimates, results, and analyst recommendations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-sm py-1 px-3">
                  <FiCalendar className="mr-1 h-3.5 w-3.5" />
                  {isLoadingQuarter ? "Loading..." : quarter}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Current earnings quarter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="USD" onValueChange={setActiveRegion}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="USD">US Portfolio</TabsTrigger>
          <TabsTrigger value="CAD">Canadian Portfolio</TabsTrigger>
          <TabsTrigger value="INTL">International Portfolio</TabsTrigger>
        </TabsList>
        
        <TabsContent value="USD" className="mt-6">
          <EarningsQuarterView region="USD" quarter={quarter} />
        </TabsContent>
        
        <TabsContent value="CAD" className="mt-6">
          <EarningsQuarterView region="CAD" quarter={quarter} />
        </TabsContent>
        
        <TabsContent value="INTL" className="mt-6">
          <EarningsQuarterView region="INTL" quarter={quarter} />
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FiDollarSign className="mr-2 h-5 w-5 text-blue-500" />
              EPS Surprises
            </CardTitle>
            <CardDescription>
              Earnings per share vs expectations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>EPS surprise visualization will be added soon</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FiUsers className="mr-2 h-5 w-5 text-purple-500" />
              Analyst Coverage
            </CardTitle>
            <CardDescription>
              Number of analysts covering each stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>Analyst coverage visualization will be added soon</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <FiTrendingUp className="mr-2 h-5 w-5 text-green-500" />
              Performance Impact
            </CardTitle>
            <CardDescription>
              Stock performance relative to earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>Performance impact visualization will be added soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EarningsPage;
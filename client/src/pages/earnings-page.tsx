import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Calendar, ChevronDown, ChevronUp, Minus, BarChart3, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EarningsResult {
  id: number;
  symbol: string;
  region: string;
  quarter: string;
  reportDate: string;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  revenueSurprise: number | null;
  revenueSurprisePercent: number | null;
  earningsScore: string | null;
  guidance: string | null;
}

interface UpcomingEarnings {
  symbol: string;
  company: string;
  expectedReportDate: string;
  consensusEPS: number | null;
  period: string;
}

interface QuarterSummary {
  quarter: string;
  stats: {
    totalReports: number;
    earningScore: {
      greatGood: number;
      notSoBad: number;
      ugly: number;
    };
  };
}

interface QuarterData {
  quarter: string;
  region: string;
  data: {
    symbol: string;
    company: string;
    epsActual: number | null;
    epsEstimate: number | null;
    epsSurprisePercent: number | null;
    revenueActual: number | null;
    revenueEstimate: number | null;
    revenueSurprisePercent: number | null;
    earningsScore: string | null;
    guidanceDirection: string | null;
    stockType: string | null;
    rating: string | null;
    reportDate: string;
  }[];
  stats: {
    totalReports: number;
    earningScore: {
      greatGood: number;
      notSoBad: number;
      ugly: number;
    };
  };
}

const EarningsPage: React.FC = () => {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<string>('USD');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('heatmap');

  // Fetch quarters
  const { 
    data: quarterData, 
    isLoading: loadingQuarters,
    refetch: refetchQuarters
  } = useQuery({
    queryKey: ['/api/earnings/quarters', selectedRegion],
    enabled: true,
  });

  // Set default selected quarter when data loads
  useEffect(() => {
    if (quarterData?.quarters?.length > 0 && !selectedQuarter) {
      setSelectedQuarter(quarterData.quarters[0].quarter);
    }
  }, [quarterData, selectedQuarter]);

  // Fetch quarter details when a quarter is selected
  const { 
    data: quarterDetails, 
    isLoading: loadingQuarterDetails,
    refetch: refetchQuarterDetails 
  } = useQuery({
    queryKey: ['/api/earnings/quarter', selectedQuarter, selectedRegion],
    enabled: !!selectedQuarter,
  });

  // Fetch upcoming earnings
  const { 
    data: upcomingEarnings,
    isLoading: loadingUpcoming,
    refetch: refetchUpcoming
  } = useQuery({
    queryKey: ['/api/earnings/estimates/upcoming', selectedRegion],
    enabled: true,
  });

  // Import earnings data mutations
  const importStockMutation = useMutation({
    mutationFn: (symbol: string) => 
      apiRequest(`/api/earnings/import/stock/${symbol}/${selectedRegion}`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Import started",
        description: `Importing earnings data for stock. This may take a few minutes.`,
      });
      
      // Set a timeout to refresh the data after a delay
      setTimeout(() => {
        refetchQuarters();
        if (selectedQuarter) {
          refetchQuarterDetails();
        }
        refetchUpcoming();
      }, 10000); // Wait 10 seconds before refreshing
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import earnings data: ${error}`,
        variant: "destructive",
      });
    }
  });

  const importRegionMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/earnings/import/region/${selectedRegion}`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Import started",
        description: `Importing earnings data for ${selectedRegion} region. This may take a few minutes.`,
      });
      
      // Set a timeout to refresh the data after a delay
      setTimeout(() => {
        refetchQuarters();
        if (selectedQuarter) {
          refetchQuarterDetails();
        }
        refetchUpcoming();
      }, 30000); // Wait 30 seconds before refreshing
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import earnings data: ${error}`,
        variant: "destructive",
      });
    }
  });

  const importAllMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/earnings/import/all`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Import started",
        description: `Importing earnings data for all portfolios. This may take a few minutes.`,
      });
      
      // Set a timeout to refresh the data after a delay
      setTimeout(() => {
        refetchQuarters();
        if (selectedQuarter) {
          refetchQuarterDetails();
        }
        refetchUpcoming();
      }, 60000); // Wait 60 seconds before refreshing
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import earnings data: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Format currency
  const formatCurrency = (value: number | null): string => {
    if (value === null) return 'N/A';
    
    // Determine if we should show in billions or millions
    if (Math.abs(value) >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  // Format percentage
  const formatPercent = (value: number | null): string => {
    if (value === null) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Render surprise indicator
  const renderSurpriseIndicator = (value: number | null) => {
    if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
    
    if (value > 0) {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Get color based on earnings score
  const getEarningsScoreColor = (score: string | null) => {
    if (!score) return 'bg-gray-200 text-gray-800';
    
    switch(score) {
      case 'Good': return 'bg-green-100 text-green-800 border-green-300';
      case 'Bad': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // 'Okay'
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="INTL">INTL</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => importRegionMutation.mutate()} 
            variant="outline" 
            size="sm"
            disabled={importRegionMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${importRegionMutation.isPending ? 'animate-spin' : ''}`} />
            {importRegionMutation.isPending ? 'Importing...' : 'Import Region'}
          </Button>
          <Button 
            onClick={() => importAllMutation.mutate()} 
            variant="outline" 
            size="sm"
            disabled={importAllMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${importAllMutation.isPending ? 'animate-spin' : ''}`} />
            {importAllMutation.isPending ? 'Importing...' : 'Import All'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="heatmap" className="w-full" onValueChange={(value) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heatmap">Earnings Heatmap</TabsTrigger>
          <TabsTrigger value="calendar">Earnings Calendar</TabsTrigger>
          <TabsTrigger value="details">Quarter Details</TabsTrigger>
        </TabsList>

        {/* Earnings Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Earnings Performance</CardTitle>
              <CardDescription>Overview of earnings results across quarters</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingQuarters ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-36 w-full" />
                  ))}
                </div>
              ) : quarterData?.quarters?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No earnings data available for {selectedRegion} region.</p>
                  <Button 
                    onClick={() => importRegionMutation.mutate()} 
                    variant="outline" 
                    className="mt-4"
                    disabled={importRegionMutation.isPending}
                  >
                    Import Earnings Data
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quarterData?.quarters?.map((quarter: QuarterSummary) => (
                    <Card 
                      key={quarter.quarter} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${selectedQuarter === quarter.quarter ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        setSelectedQuarter(quarter.quarter);
                        setActiveTab('details');
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{quarter.quarter}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Reports:</span>
                            <span className="font-medium">{quarter.stats.totalReports}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="flex flex-col items-center bg-green-50 rounded p-1">
                              <span className="text-xs text-muted-foreground">Good</span>
                              <span className="font-bold text-green-600">{quarter.stats.earningScore.greatGood}</span>
                            </div>
                            <div className="flex flex-col items-center bg-yellow-50 rounded p-1">
                              <span className="text-xs text-muted-foreground">Okay</span>
                              <span className="font-bold text-yellow-600">{quarter.stats.earningScore.notSoBad}</span>
                            </div>
                            <div className="flex flex-col items-center bg-red-50 rounded p-1">
                              <span className="text-xs text-muted-foreground">Bad</span>
                              <span className="font-bold text-red-600">{quarter.stats.earningScore.ugly}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Earnings</CardTitle>
              <CardDescription>Expected earnings reports in {selectedRegion} region</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUpcoming ? (
                <Skeleton className="h-64 w-full" />
              ) : !upcomingEarnings || upcomingEarnings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No upcoming earnings data available.</p>
                  <Button 
                    onClick={() => importRegionMutation.mutate()} 
                    variant="outline" 
                    className="mt-4"
                    disabled={importRegionMutation.isPending}
                  >
                    Import Earnings Data
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Report Date</TableHead>
                      <TableHead>EPS Est.</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEarnings.map((earning: UpcomingEarnings) => (
                      <TableRow key={`${earning.symbol}-${earning.period}`}>
                        <TableCell className="font-medium">{earning.symbol}</TableCell>
                        <TableCell>{earning.company}</TableCell>
                        <TableCell>
                          {earning.expectedReportDate 
                            ? format(new Date(earning.expectedReportDate), 'MMM d, yyyy') 
                            : 'TBD'}
                        </TableCell>
                        <TableCell>
                          {earning.consensusEPS !== null 
                            ? `$${earning.consensusEPS.toFixed(2)}` 
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{earning.period}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => importStockMutation.mutate(earning.symbol)}
                            disabled={importStockMutation.isPending}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${importStockMutation.isPending ? 'animate-spin' : ''}`} />
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarter Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {!selectedQuarter ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Quarter Selected</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please select a quarter from the Earnings Heatmap tab to view detailed results.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{selectedQuarter} Earnings Results</CardTitle>
                    <CardDescription>{selectedRegion} Region</CardDescription>
                  </div>
                  {quarterDetails && (
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="bg-green-50 border-green-200">
                        <span className="font-normal text-green-700 mr-1">Beat:</span> 
                        <span className="font-bold text-green-700">{quarterDetails.stats.earningScore.greatGood}</span>
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                        <span className="font-normal text-yellow-700 mr-1">In-line:</span> 
                        <span className="font-bold text-yellow-700">{quarterDetails.stats.earningScore.notSoBad}</span>
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 border-red-200">
                        <span className="font-normal text-red-700 mr-1">Miss:</span> 
                        <span className="font-bold text-red-700">{quarterDetails.stats.earningScore.ugly}</span>
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingQuarterDetails ? (
                  <Skeleton className="h-96 w-full" />
                ) : !quarterDetails || !quarterDetails.data || quarterDetails.data.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No detailed earnings data available for {selectedQuarter}.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">EPS Act</TableHead>
                          <TableHead className="text-right">EPS Est</TableHead>
                          <TableHead className="text-right">EPS Surprise</TableHead>
                          <TableHead className="text-right">Rev Act</TableHead>
                          <TableHead className="text-right">Rev Est</TableHead>
                          <TableHead className="text-right">Rev Surprise</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quarterDetails.data.map((result: any) => (
                          <TableRow key={result.symbol}>
                            <TableCell className="font-medium">{result.symbol}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{result.company}</TableCell>
                            <TableCell className="text-right">
                              {result.epsActual !== null ? `$${result.epsActual.toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              {result.epsEstimate !== null ? `$${result.epsEstimate.toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {renderSurpriseIndicator(result.epsSurprisePercent)}
                                <span className={
                                  result.epsSurprisePercent > 0 
                                    ? 'text-green-600' 
                                    : result.epsSurprisePercent < 0 
                                      ? 'text-red-600' 
                                      : 'text-gray-600'
                                }>
                                  {result.epsSurprisePercent !== null 
                                    ? formatPercent(result.epsSurprisePercent) 
                                    : 'N/A'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {result.revenueActual !== null ? formatCurrency(result.revenueActual) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              {result.revenueEstimate !== null ? formatCurrency(result.revenueEstimate) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {renderSurpriseIndicator(result.revenueSurprisePercent)}
                                <span className={
                                  result.revenueSurprisePercent > 0 
                                    ? 'text-green-600' 
                                    : result.revenueSurprisePercent < 0 
                                      ? 'text-red-600' 
                                      : 'text-gray-600'
                                }>
                                  {result.revenueSurprisePercent !== null 
                                    ? formatPercent(result.revenueSurprisePercent) 
                                    : 'N/A'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getEarningsScoreColor(result.earningsScore)}>
                                {result.earningsScore || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {result.stockType || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                result.rating === '1' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                result.rating === '2' ? 'bg-green-50 text-green-800 border-green-200' :
                                result.rating === '3' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                result.rating === '4' ? 'bg-red-50 text-red-800 border-red-200' :
                                'bg-gray-50 text-gray-800 border-gray-200'
                              }>
                                {result.rating || 'N/A'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <div className="text-sm text-muted-foreground">
                  {quarterDetails?.data?.length} companies reported in {selectedQuarter}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchQuarterDetails()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EarningsPage;
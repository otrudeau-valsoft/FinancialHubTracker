import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  ChevronLeft, 
  Loader2,
  TrendingUp,
  TrendingDown, 
  RefreshCw, 
  Info,
  Clock,
  Activity,
  Search,
  ChevronsUpDown,
  Eye
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartTooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UpgradeDowngradeTable } from '@/components/dashboard/upgrade-downgrade-table';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { getStockTypeBackground, getRatingClass } from "@/lib/utils";
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { processHistoricalData, useHistoricalPrices } from '@/hooks/use-historical-prices';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Historical price interface
interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
  rsi9?: number;
  rsi14?: number;
  rsi21?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
}

// Stock earnings interface
interface StockEarnings {
  id: number;
  ticker: string;
  company: string;
  region: string;
  earningsDate: string;
  quarterEndDate: string;
  fiscalYear: number;
  fiscalQ: number;
  epsActual: number;
  epsEstimate: number;
  epsSurprise: number;
  epsSurprisePercent: number;
  revenueActual: number;
  revenueEstimate: number;
  revenueSurprise: number;
  revenueSurprisePercent: number;
  earningsTime: string;
  guidanceStatus: string;
  guidanceText: string;
  stockReaction: number;
  stockReactionNextDay: number;
  stockReactionTwoDay: number;
  earningsScore: string;
  marketReactionScore: string;
  reactionNote: string;
  earningsNotes: string;
  updatedAt: string;
  createdAt: string;
}

// Earnings score badge color map
const scoreColorMap: Record<string, string> = {
  'Good': 'bg-green-950/30 text-green-500 border border-green-800',
  'Okay': 'bg-amber-950/30 text-amber-500 border border-amber-800',
  'Bad': 'bg-red-950/30 text-red-500 border border-red-800',
  'Excellent': 'bg-green-950/30 text-green-500 border border-green-800',
  'Mixed': 'bg-amber-950/30 text-amber-500 border border-amber-800',
  'Poor': 'bg-red-950/30 text-red-500 border border-red-800',
};

// Guidance status badge color map
const guidanceColorMap: Record<string, string> = {
  'Increased': 'bg-green-950/30 text-green-500 border border-green-800',
  'Maintain': 'bg-amber-950/30 text-amber-500 border border-amber-800',
  'Decreased': 'bg-red-950/30 text-red-500 border border-red-800',
  'Flat': 'bg-amber-950/30 text-amber-500 border border-amber-800',
  'Up': 'bg-green-950/30 text-green-500 border border-green-800',
  'Down': 'bg-red-950/30 text-red-500 border border-red-800',
};

// Using the imported processHistoricalData function from hooks/use-historical-prices

// Define a stock interface for the selector
interface StockOption {
  symbol: string;
  company: string;
  region: string;
  stockType?: string;
  stockRating?: string;
}

// Stock Directory Selector Component
function StockDirectorySelector({ currentRegion }: { currentRegion: string }) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<'USD' | 'CAD' | 'INTL'>(currentRegion as any);
  
  // Fetch stocks for all regions
  const { data: usdStocks } = useQuery({
    queryKey: ['allUSDStocks'],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/USD/stocks`);
      if (!response.ok) throw new Error('Failed to fetch USD stocks');
      return response.json();
    },
    staleTime: 3600000 // 1 hour
  });
  
  const { data: cadStocks } = useQuery({
    queryKey: ['allCADStocks'],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/CAD/stocks`);
      if (!response.ok) throw new Error('Failed to fetch CAD stocks');
      return response.json();
    },
    staleTime: 3600000 // 1 hour
  });
  
  const { data: intlStocks } = useQuery({
    queryKey: ['allINTLStocks'],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/INTL/stocks`);
      if (!response.ok) throw new Error('Failed to fetch INTL stocks');
      return response.json();
    },
    staleTime: 3600000 // 1 hour
  });
  
  // Combine stocks based on selected region
  const stockOptions = React.useMemo(() => {
    let stocks: StockOption[] = [];
    
    if (selectedRegion === 'USD' && usdStocks) {
      stocks = usdStocks.map((stock: any) => ({
        ...stock,
        region: 'USD'
      }));
    } else if (selectedRegion === 'CAD' && cadStocks) {
      stocks = cadStocks.map((stock: any) => ({
        ...stock,
        region: 'CAD'
      }));
    } else if (selectedRegion === 'INTL' && intlStocks) {
      stocks = intlStocks.map((stock: any) => ({
        ...stock,
        region: 'INTL'
      }));
    }
    
    return stocks;
  }, [selectedRegion, usdStocks, cadStocks, intlStocks]);
  
  // Handle stock selection
  const handleStockSelected = (stock: StockOption) => {
    setOpen(false);
    // Navigate to the selected stock details page using the working route format
    setLocation(`/stock/${stock.symbol}?region=${stock.region}`);
  };
  
  return (
    <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
        <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide mb-2 sm:mb-0">STOCK DIRECTORY</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setSelectedRegion('USD')}
            className={`rounded-sm h-7 text-xs font-mono border-[#1A304A] ${
              selectedRegion === 'USD' 
                ? 'bg-[#38AAFD]/20 text-[#38AAFD] border-[#38AAFD]' 
                : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'
            }`}
          >
            USD
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setSelectedRegion('CAD')}
            className={`rounded-sm h-7 text-xs font-mono border-[#1A304A] ${
              selectedRegion === 'CAD' 
                ? 'bg-[#38AAFD]/20 text-[#38AAFD] border-[#38AAFD]' 
                : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'
            }`}
          >
            CAD
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setSelectedRegion('INTL')}
            className={`rounded-sm h-7 text-xs font-mono border-[#1A304A] ${
              selectedRegion === 'INTL' 
                ? 'bg-[#38AAFD]/20 text-[#38AAFD] border-[#38AAFD]' 
                : 'bg-[#0B1728] text-[#7A8999] hover:bg-[#162639] hover:text-[#EFEFEF]'
            }`}
          >
            INTL
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <div className="flex flex-col">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search for a stock..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setOpen(true)}
              className="pl-8 bg-[#0B1728] border-[#1A304A] text-[#EFEFEF] text-xs font-mono placeholder-gray-500 w-full"
            />
          </div>
          
          {open && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-[#0B1728] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto py-1">
                {searchValue && stockOptions.filter(stock => 
                  stock.symbol.toLowerCase().includes(searchValue.toLowerCase()) || 
                  stock.company.toLowerCase().includes(searchValue.toLowerCase())
                ).length === 0 ? (
                  <div className="py-6 text-center text-sm text-[#7A8999]">
                    No stocks found.
                  </div>
                ) : (
                  <div>
                    <div className="px-2 py-1.5 text-xs text-[#7A8999] font-mono font-semibold border-b border-[#1A304A]">
                      {selectedRegion} STOCKS
                    </div>
                    <div>
                      {stockOptions
                        .filter(stock => 
                          searchValue ? (
                            stock.symbol.toLowerCase().includes(searchValue.toLowerCase()) || 
                            stock.company.toLowerCase().includes(searchValue.toLowerCase())
                          ) : true
                        )
                        .map((stock) => (
                          <div
                            key={stock.symbol}
                            onClick={() => handleStockSelected(stock)}
                            className="px-2 py-2 hover:bg-[#162639] cursor-pointer border-b border-[#1A304A]/30"
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-medium text-[#EFEFEF]">{stock.symbol}</span>
                                {stock.stockType && (
                                  <span className={`inline-block font-mono px-2 py-0.5 rounded-sm text-[10px] font-medium ${getStockTypeBackground(stock.stockType)}`}>
                                    {stock.stockType}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-[#7A8999]">{stock.company}</span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add click outside handler to close dropdown */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default function StockDetailsPage() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y' | '5y'>('3m');
  const [showRSI, setShowRSI] = useState<boolean>(true); // Default to showing RSI
  const [rsiPeriod, setRsiPeriod] = useState<'9' | '14' | '21'>('21'); // Default to 21-period RSI
  const [showMovingAverages, setShowMovingAverages] = useState<boolean>(true); // Default to showing MAs
  // MACD is now always visible (no toggle)
  
  // Get symbol and region from URL
  // Support both route patterns: /stock-details/:symbol/:region and /stock/:symbol?region=
  const [isDetailsRoute, detailsParams] = useRoute('/stock-details/:symbol/:region');
  const [isStockRoute, stockParams] = useRoute('/stock/:symbol');
  const [, setLocation] = useLocation();
  
  // Determine which route is active and get params accordingly
  const params = isDetailsRoute ? detailsParams : stockParams;
  
  // Get the URL query params
  const urlParams = new URLSearchParams(window.location.search);
  
  // Get region from URL params or query params (default to USD)
  const regionQueryParam = urlParams.get('region');
  const regionParam = isDetailsRoute 
    ? detailsParams?.region 
    : (regionQueryParam || 'USD');
  
  const region = (regionParam && ['USD', 'CAD', 'INTL'].includes(regionParam.toUpperCase())) 
    ? regionParam.toUpperCase() as 'USD' | 'CAD' | 'INTL' 
    : 'USD';
  
  // Get the tab from query params (default to overview)
  const tabParam = urlParams.get('tab');
  const defaultTab = tabParam || 'overview';
  
  // The symbol from URL params
  const symbol = params?.symbol?.toUpperCase() || '';
  
  // Fetch stock data
  const { data: stockData, isLoading, isError } = useQuery({
    queryKey: ['stockDetails', symbol, region],
    queryFn: async () => {
      // Find the right endpoint based on region
      const endpoint = `/api/portfolios/${region}/stocks`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      
      const stocks = await response.json();
      // Find the specific stock from the list
      return stocks.find((stock: any) => stock.symbol.toUpperCase() === symbol);
    },
    enabled: !!symbol,
    staleTime: 60000 // 1 minute
  });
  
  // Fetch current price data
  const { data: priceData, refetch: refetchPriceData } = useQuery({
    queryKey: ['currentPrice', symbol, region],
    queryFn: async () => {
      const response = await fetch(`/api/current-prices/${region}/${symbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch current price data');
      }
      
      return response.json();
    },
    enabled: !!symbol,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Fetch historical price data for chart - use the hook for consistency
  const { data: historicalPrices, isLoading: isLoadingHistorical } = useHistoricalPrices(symbol, region);
  
  // Fetch earnings data
  const { data: earningsData } = useQuery({
    queryKey: ['earningsData', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/earnings?ticker=${symbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!symbol, // Always fetch earnings data when symbol is available
    staleTime: 3600000 // 1 hour
  });
  
  // Refetch data manually, including RSI calculation
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const { toast } = useToast();
  
  const refreshPriceData = async () => {
    try {
      setIsRefreshing(true);
      
      // First, refresh current price data
      await refetchPriceData();
      
      try {
        // Step 1: Fetch and update new historical prices first
        const updateResponse = await fetch(`/api/historical-prices/fetch/${symbol}/${region}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            period: '5y',
            // Force refresh of most recent price point only
            forceRsiRefresh: true,
            forceMacdRefresh: true  
          })
        });
        
        if (updateResponse.ok) {
          // Log success message
          console.log('Historical price refresh complete with RSI data', {});
          
          // Check latest data to verify RSI values
          const rsiCheck = await fetch(`/api/historical-prices/${symbol}/${region}`);
          const historicalData = await rsiCheck.json();
          
          if (historicalData && historicalData.length > 0) {
            // Calculate how many data points have RSI values per period
            const totalPoints = historicalData.length;
            
            // Check for RSI-9 values
            const rsi9Datapoints = historicalData.filter((d: HistoricalPrice) => d.rsi9).length;
            console.log("RSI Data Check:", { 
              totalPoints, 
              rsiDatapoints: rsi9Datapoints, 
              period: "9",
              samplePoint: historicalData[historicalData.length - 1] // Most recent
            });
            
            // Check for RSI-14 values
            const rsi14Datapoints = historicalData.filter((d: HistoricalPrice) => d.rsi14).length;
            console.log("RSI Data Check:", { 
              totalPoints, 
              rsiDatapoints: rsi14Datapoints, 
              period: "14",
              samplePoint: historicalData[historicalData.length - 1] // Most recent
            });
            
            // Check for RSI-21 values
            const rsi21Datapoints = historicalData.filter((d: HistoricalPrice) => d.rsi21).length;
            console.log("RSI Data Check:", { 
              totalPoints, 
              rsiDatapoints: rsi21Datapoints, 
              period: "21",
              samplePoint: historicalData[historicalData.length - 1] // Most recent
            });
            
            // Log the latest price point with RSI values
            console.log("Latest historical price entry for " + symbol + " (" + region + "):", {
              date: historicalData[historicalData.length - 1].date,
              rsi9: historicalData[historicalData.length - 1].rsi9,
              rsi14: historicalData[historicalData.length - 1].rsi14,
              rsi21: historicalData[historicalData.length - 1].rsi21,
              macd: historicalData[historicalData.length - 1].macd,
              signal: historicalData[historicalData.length - 1].signal,
              histogram: historicalData[historicalData.length - 1].histogram
            });
            
            // Check for MACD values
            const macdDatapoints = historicalData.filter((d: HistoricalPrice) => d.macd).length;
            console.log("MACD Data Check:", { 
              totalPoints, 
              macdDatapoints, 
              samplePoint: historicalData[historicalData.length - 1] // Most recent
            });
          }
          
          // Invalidate queries to ensure UI is updated with fresh data
          await queryClient.invalidateQueries({
            queryKey: ['historicalPrices', symbol, region]
          });
          
          await queryClient.invalidateQueries({
            queryKey: [`/api/historical-prices/${symbol}/${region}`]
          });
          
          // Show success toast
          toast({
            title: "Updated historical prices",
            description: "Historical prices, RSI and MACD data have been updated",
            variant: "default"
          });
        } else {
          console.error('Failed to update historical prices');
          
          toast({
            title: "Update failed",
            description: "Failed to update historical prices",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error updating historical prices:', error);
        
        toast({
          title: "Update failed",
          description: "Error updating historical prices and RSI data",
          variant: "destructive"
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    // Update the URL without navigating away
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };
  
  // Currency symbol based on region
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  // Determine price change color and calculate some metrics
  const priceChangeColor = React.useMemo(() => {
    if (!priceData?.regularMarketChange) return 'text-[#7A8999]';
    const change = parseFloat(priceData.regularMarketChange);
    if (change > 0) return 'text-[#4CAF50]';
    if (change < 0) return 'text-[#F44336]';
    return 'text-[#7A8999]';
  }, [priceData]);
  
  // Calculate stock metrics with null safety
  const stockMetrics = React.useMemo(() => {
    if (!stockData || !priceData) return {
      nav: 0,
      marketValue: 0,
      bookValue: 0,
      profitLoss: 0,
      profitLossPercent: 0,
      unrealizedProfitLoss: 'Profit'
    };
    
    // Add null safety checks
    const bookPrice = stockData.price ? parseFloat(stockData.price) : 0;
    const marketPrice = priceData.regularMarketPrice ? parseFloat(priceData.regularMarketPrice) : 0;
    const quantity = stockData.quantity ? parseFloat(stockData.quantity) : 0;
    
    // Calculate metrics
    const marketValue = marketPrice * quantity;
    const bookValue = bookPrice * quantity;
    const profitLoss = marketValue - bookValue;
    const profitLossPercent = bookValue !== 0 ? (profitLoss / bookValue) * 100 : 0;
    const unrealizedProfitLoss = profitLoss >= 0 ? 'Profit' : 'Loss';
    
    return {
      nav: marketValue,
      marketValue,
      bookValue,
      profitLoss,
      profitLossPercent,
      unrealizedProfitLoss
    };
  }, [stockData, priceData]);
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      {/* Header section with back button and stock selector */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/${region.toLowerCase()}-portfolio`)}
            className="rounded-sm h-8 bg-[#0B1728] text-[#7A8999] text-xs font-mono border-[#1A304A] hover:bg-[#162639] hover:text-[#EFEFEF] mr-3"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            BACK
          </Button>
          
          <Button
            onClick={refreshPriceData}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className={`rounded-sm h-8 bg-[#0B1728] text-[#7A8999] text-xs font-mono border-[#1A304A] ${
              isRefreshing ? 'opacity-70' : 'hover:bg-[#162639] hover:text-[#EFEFEF]'
            }`}
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isRefreshing ? 'UPDATING...' : 'REFRESH'}
          </Button>
        </div>
        
        {/* Stock Directory/Selector Component */}
        <StockDirectorySelector currentRegion={region} />
      </div>
      
      {/* Stock header */}
      {isLoading ? (
        <div className="py-4 bg-[#0A1524] border border-[#1A304A] rounded-sm mb-4">
          <div className="px-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#38AAFD]" />
            <span className="text-[#7A8999] font-mono text-xs">LOADING STOCK DETAILS...</span>
          </div>
        </div>
      ) : isError || !stockData ? (
        <div className="py-4 bg-[#0A1524] border border-[#1A304A] border-red-800 rounded-sm mb-4">
          <div className="px-4">
            <h3 className="text-red-400 font-mono text-xs font-medium">ERROR</h3>
            <p className="text-red-400 text-xs font-mono mt-1">
              Stock not found or error loading data.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Top cards section - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
            {/* Stock info card - 1 col */}
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">{symbol}</h3>
                <div className="h-1 w-28 bg-[#38AAFD]"></div>
              </div>
              <div className="p-4">
                <h2 className="text-base sm:text-lg font-medium text-[#EFEFEF] font-mono tracking-wide mb-3">{stockData.company}</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">REGION</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">{region}</div>
                  </div>
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">SECTOR</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">{stockData.sector || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">TYPE</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">
                      <span className={`inline-block font-mono px-2 py-0.5 rounded-sm text-[10px] sm:text-[11px] font-medium ${getStockTypeBackground(stockData.stockType)}`}>
                        {stockData.stockType}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">RATING</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">
                      <span className={`inline-block font-mono min-w-[1.5rem] px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium ${getRatingClass(stockData.stockRating || stockData.rating)}`}>
                        {stockData.stockRating || stockData.rating}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">NEXT EARNINGS</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">{stockData.nextEarningsDate || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[#7A8999] font-mono text-xs mb-0.5">QUANTITY</div>
                    <div className="text-[#EFEFEF] font-mono text-sm">{stockData.quantity}</div>
                  </div>
                </div>
                
                <div className="border-t border-[#1A304A] pt-3">
                  <div className="text-[#7A8999] font-mono text-xs mb-2">PRICE HISTORY</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[#7A8999] font-mono text-[10px]">52W HIGH</div>
                      <div className="text-[#4CAF50] font-mono text-sm">
                        {priceData?.fiftyTwoWeekHigh 
                          ? formatCurrency(parseFloat(priceData.fiftyTwoWeekHigh), currencySymbol)
                          : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#7A8999] font-mono text-[10px]">52W LOW</div>
                      <div className="text-[#F44336] font-mono text-sm">
                        {priceData?.fiftyTwoWeekLow 
                          ? formatCurrency(parseFloat(priceData.fiftyTwoWeekLow), currencySymbol)
                          : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price card - 1 col */}
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">CURRENT PRICE</h3>
                <div className="h-1 w-28 bg-[#4CAF50]"></div>
              </div>
              <div className="p-4">
                {!priceData ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-[#38AAFD]" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2 mb-6">
                      <div className="text-[#EFEFEF] font-mono text-2xl font-bold">
                        {formatCurrency(parseFloat(priceData.regularMarketPrice), currencySymbol)}
                      </div>
                      <div className={cn("font-mono text-base", priceChangeColor)}>
                        {parseFloat(priceData.regularMarketChange) > 0 ? '+' : ''}
                        {formatCurrency(parseFloat(priceData.regularMarketChange), currencySymbol)} 
                        ({parseFloat(priceData.regularMarketChangePercent) > 0 ? '+' : ''}
                        {formatPercentage(parseFloat(priceData.regularMarketChangePercent))})
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">OPEN</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {formatCurrency(parseFloat(priceData.regularMarketOpen || '0'), currencySymbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">VOLUME</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {priceData.regularMarketVolume 
                            ? parseInt(priceData.regularMarketVolume).toLocaleString() 
                            : '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">DAY HIGH</div>
                        <div className="text-[#4CAF50] font-mono text-sm">
                          {formatCurrency(parseFloat(priceData.regularMarketDayHigh || '0'), currencySymbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">DAY LOW</div>
                        <div className="text-[#F44336] font-mono text-sm">
                          {formatCurrency(parseFloat(priceData.regularMarketDayLow || '0'), currencySymbol)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-[#1A304A] pt-3">
                      <div className="text-[#7A8999] font-mono text-xs mb-2">RATIOS</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[#7A8999] font-mono text-[10px]">P/E (TTM)</div>
                          <div className="text-[#EFEFEF] font-mono text-sm">
                            {priceData.trailingPE ? parseFloat(priceData.trailingPE).toFixed(2) : '--'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#7A8999] font-mono text-[10px]">P/E (FWD)</div>
                          <div className="text-[#EFEFEF] font-mono text-sm">
                            {priceData.forwardPE ? parseFloat(priceData.forwardPE).toFixed(2) : '--'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#7A8999] font-mono text-[10px]">DIVIDEND</div>
                          <div className="text-[#EFEFEF] font-mono text-sm">
                            {priceData.dividendYield 
                              ? parseFloat(priceData.dividendYield).toFixed(2) + '%'
                              : '--'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#7A8999] font-mono text-[10px]">MARKET CAP</div>
                          <div className="text-[#EFEFEF] font-mono text-sm">
                            {priceData.marketCap 
                              ? (parseFloat(priceData.marketCap) / 1000000000).toFixed(2) + 'B'
                              : '--'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Position card - 1 col */}
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">POSITION SUMMARY</h3>
                <div className="h-1 w-28 bg-[#FFD700]"></div>
              </div>
              <div className="p-4">
                {!stockMetrics.nav ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-[#38AAFD]" />
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="text-[#7A8999] font-mono text-xs">NET ASSET VALUE</div>
                      <div className="text-[#EFEFEF] font-mono text-2xl font-bold">
                        {formatCurrency(stockMetrics.nav, currencySymbol)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">BOOK PRICE</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {formatCurrency(parseFloat(stockData.price), currencySymbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">MARKET PRICE</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {formatCurrency(parseFloat(priceData?.regularMarketPrice || '0'), currencySymbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">BOOK VALUE</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {formatCurrency(stockMetrics.bookValue, currencySymbol)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7A8999] font-mono text-[10px]">MARKET VALUE</div>
                        <div className="text-[#EFEFEF] font-mono text-sm">
                          {formatCurrency(stockMetrics.marketValue, currencySymbol)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-[#1A304A] pt-3">
                      <div className="text-[#7A8999] font-mono text-xs mb-2">PERFORMANCE</div>
                      <div className="flex items-center">
                        <div>
                          <div className="text-[#7A8999] font-mono text-[10px]">UNREALIZED {stockMetrics.unrealizedProfitLoss}</div>
                          <div className={stockMetrics.profitLoss >= 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                            <div className="font-mono text-sm">
                              {formatCurrency(Math.abs(stockMetrics.profitLoss), currencySymbol)}
                              <span className="ml-1">
                                ({stockMetrics.profitLoss >= 0 ? '+' : '-'}{formatPercentage(Math.abs(stockMetrics.profitLossPercent))})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2">
                          {stockMetrics.profitLoss >= 0 ? (
                            <TrendingUp className="h-10 w-10 text-[#4CAF50]" />
                          ) : (
                            <TrendingDown className="h-10 w-10 text-[#F44336]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Price Chart Section - Full Width */}
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">PRICE CHART</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              {isLoadingHistorical ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#38AAFD]" />
                </div>
              ) : !historicalPrices || historicalPrices.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-[#7A8999] font-mono text-sm mb-2">No chart data available</div>
                  <div className="text-[#EFEFEF] font-mono text-xs">Historical price data is unavailable for this stock</div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-[#EFEFEF] font-mono text-xs">
                      <span className="text-[#7A8999]">HISTORICAL PRICE CHART</span>
                      <span className="text-[#38AAFD] ml-2">{symbol}</span>
                    </div>
                    
                    {/* Time period and RSI selector */}
                    <div className="flex items-center space-x-4">
                      {/* Time period buttons */}
                      <div className="flex items-center space-x-1">
                        {(['1m', '3m', '6m', '1y', '5y'] as const).map((period) => (
                          <button
                            key={period}
                            onClick={() => setTimeRange(period)}
                            className={`px-2 py-1 text-xs font-mono rounded-sm ${
                              timeRange === period 
                                ? 'bg-[#0A7AFF] text-white' 
                                : 'bg-[#0D1F32] text-[#7A8999] hover:bg-[#162639]'
                            }`}
                          >
                            {period.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      
                      {/* Toggle for RSI (replaced with Period buttons) */}
                      {/*
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setShowRSI(!showRSI)}
                                className={`flex items-center px-2 py-1 text-xs font-mono rounded-sm ${
                                  showRSI
                                    ? 'bg-[#805AD5] text-white' 
                                    : 'bg-[#0D1F32] text-[#7A8999] hover:bg-[#162639]'
                                }`}
                              >
                                <Activity className="h-3 w-3 mr-1" />
                                RSI
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Show/Hide Relative Strength Index</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      */}
                    </div>
                  </div>
                  
                  {/* Main price chart */}
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={processHistoricalData(historicalPrices, timeRange)}
                        margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                        syncId="stockChart" // Synchronize with RSI chart
                      >
                        <defs>
                          <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0A7AFF" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#0A7AFF" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
                        <XAxis 
                          dataKey="formattedDate" 
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          interval="preserveStartEnd"
                          tickMargin={10}
                          stroke="#1A304A"
                          minTickGap={30}
                          hide={true} // Hide X-axis on main chart since we'll show it on RSI chart
                        />
                        <YAxis 
                          domain={['dataMin', 'dataMax']}
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          tickFormatter={(val) => `${currencySymbol}${val.toFixed(2)}`}
                          width={60}
                          stroke="#1A304A"
                        />
                        <RechartTooltip
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Price']}
                          contentStyle={{ 
                            backgroundColor: '#0A1524', 
                            borderColor: '#1A304A',
                            color: '#EFEFEF',
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                          itemStyle={{ color: '#38AAFD' }}
                          labelStyle={{ color: '#7A8999', fontFamily: 'monospace' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="close" 
                          stroke="#0A7AFF" 
                          fill="url(#colorClose)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 5, stroke: '#0A7AFF', fill: '#FFFFFF' }}
                        />
                        {priceData && (
                          <ReferenceLine 
                            y={parseFloat(priceData.regularMarketPrice)} 
                            stroke="#4CAF50"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{ 
                              value: `Current: ${currencySymbol}${parseFloat(priceData.regularMarketPrice).toFixed(2)}`,
                              position: 'insideBottomRight',
                              fill: '#4CAF50',
                              fontSize: 10
                            }}
                          />
                        )}
                        {stockData && (
                          <ReferenceLine 
                            y={parseFloat(stockData.price)} 
                            stroke="#FFD700" 
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            label={{ 
                              value: `Book: ${currencySymbol}${parseFloat(stockData.price).toFixed(2)}`,
                              position: 'insideTopRight',
                              fill: '#FFD700',
                              fontSize: 10
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* RSI Chart Section - Full Width */}
          {!isLoadingHistorical && historicalPrices && historicalPrices.length > 0 && (
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-[#805AD5]" />
                  <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">RSI</h3>
                </div>
                <div className="flex items-center space-x-1">
                  {(['9', '14', '21'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setRsiPeriod(period)}
                      className={`px-2 py-1 text-xs font-mono rounded-sm ${
                        rsiPeriod === period 
                          ? 'bg-[#805AD5] text-white' 
                          : 'bg-[#0D1F32] text-[#7A8999] hover:bg-[#162639]'
                      }`}
                    >
                      <span>RSI-{period}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {/* Check if we have RSI data */}
                {(() => {
                  // Debug info about RSI data
                  if (historicalPrices && historicalPrices.length > 0) {
                    console.log(`RSI Data Check:`, {
                      totalPoints: historicalPrices.length,
                      rsiDatapoints: historicalPrices.filter((price: any) => price[`rsi${rsiPeriod}`] !== null && price[`rsi${rsiPeriod}`] !== undefined).length,
                      period: rsiPeriod,
                      samplePoint: historicalPrices[historicalPrices.length - 1]
                    });
                  }
                  
                  const hasRsiData = historicalPrices && historicalPrices.some((price: any) => 
                    price[`rsi${rsiPeriod}`] !== null && price[`rsi${rsiPeriod}`] !== undefined
                  );
                  
                  return hasRsiData;
                })() ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={processHistoricalData(historicalPrices, timeRange)}
                        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                        syncId="stockChart" // Synchronize with main chart
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
                        <XAxis 
                          dataKey="formattedDate" 
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          interval="preserveStartEnd"
                          tickMargin={5}
                          stroke="#1A304A"
                          minTickGap={30}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: '#805AD5' }}
                          tickFormatter={(val) => `${val}`}
                          width={30}
                          stroke="#1A304A"
                        />
                        <RechartTooltip
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value: number) => [`${value.toFixed(1)}`, `RSI-${rsiPeriod}`]}
                          contentStyle={{ 
                            backgroundColor: '#0A1524', 
                            borderColor: '#1A304A',
                            color: '#EFEFEF',
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                          itemStyle={{ color: '#805AD5' }}
                          labelStyle={{ color: '#7A8999', fontFamily: 'monospace' }}
                        />
                        
                        {/* Background fill for overbought/oversold regions */}
                        <rect x="0" y="0" width="100%" height="30%" fill="#4CAF5015" /> {/* Oversold region */}
                        <rect x="0" y="70%" width="100%" height="30%" fill="#F4433615" /> {/* Overbought region */}
                        
                        {/* RSI Reference Lines for Overbought/Oversold */}
                        <ReferenceLine 
                          y={70} 
                          stroke="#F44336" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                          label={{ 
                            value: "70", 
                            position: "insideLeft",
                            fill: "#F44336",
                            fontSize: 10
                          }}
                        />
                        
                        <ReferenceLine 
                          y={30} 
                          stroke="#4CAF50" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                          label={{ 
                            value: "30", 
                            position: "insideLeft",
                            fill: "#4CAF50",
                            fontSize: 10
                          }}
                        />
                        
                        {/* RSI Line */}
                        <Line
                          type="monotone"
                          dataKey={`rsi${rsiPeriod}`}
                          stroke="#805AD5"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#805AD5', fill: '#FFFFFF' }}
                          name={`RSI-${rsiPeriod}`}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center bg-[#0A1524]">
                    <div className="text-center">
                      <div className="text-[#805AD5] font-mono text-sm font-semibold mb-2">RSI Data Not Available</div>
                      <div className="text-[#7A8999] font-mono text-xs mb-3">
                        Use the REFRESH button at the top of the page to update historical prices and generate RSI data
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* MACD Chart Section - Full Width */}
          {!isLoadingHistorical && historicalPrices && historicalPrices.length > 0 && (
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-[#FF9800]" />
                  <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">MACD</h3>
                </div>
                <div className="flex items-center">
                  <span className="text-[#7A8999] font-mono text-xs">
                    Fast EMA(12), Slow EMA(26), Signal EMA(9)
                  </span>
                </div>
              </div>
              <div className="p-4">
                {(() => {
                  // Check if we have MACD data
                  const hasMacdData = historicalPrices && historicalPrices.some((price: any) => 
                    price.macd !== null && price.macd !== undefined &&
                    price.signal !== null && price.signal !== undefined &&
                    price.histogram !== null && price.histogram !== undefined
                  );
                  
                  if (historicalPrices && historicalPrices.length > 0) {
                    console.log(`MACD Data Check:`, {
                      totalPoints: historicalPrices.length,
                      macdDatapoints: historicalPrices.filter((price: any) => price.macd !== null && price.macd !== undefined).length,
                      samplePoint: historicalPrices[historicalPrices.length - 1]
                    });
                  }
                  
                  return hasMacdData;
                })() ? (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={processHistoricalData(historicalPrices, timeRange)}
                        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                        syncId="stockChart" // Synchronize with main chart
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
                        <XAxis 
                          dataKey="formattedDate"
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          interval="preserveStartEnd"
                          tickMargin={5}
                          stroke="#1A304A"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#FF9800' }}
                          tickFormatter={(val) => `${val.toFixed(1)}`}
                          width={35}
                          stroke="#1A304A"
                        />
                        <RechartTooltip
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value: number, name: string) => {
                            return [`${value.toFixed(2)}`, name === 'histogram' ? 'Histogram' : name === 'macd' ? 'MACD Line' : 'Signal Line'];
                          }}
                          contentStyle={{ 
                            backgroundColor: '#0A1524', 
                            borderColor: '#1A304A',
                            color: '#EFEFEF',
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                          itemStyle={{ color: '#FF9800' }}
                          labelStyle={{ color: '#7A8999', fontFamily: 'monospace' }}
                        />
                        
                        {/* Zero line reference */}
                        <ReferenceLine 
                          y={0} 
                          stroke="#7A8999" 
                          strokeDasharray="3 3" 
                          strokeWidth={1}
                        />
                        
                        {/* MACD and Signal Lines */}
                        <Line
                          type="monotone"
                          dataKey="macd"
                          stroke="#FF9800"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FF9800', fill: '#FFFFFF' }}
                          name="macd"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="signal"
                          stroke="#00B0FF"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#00B0FF', fill: '#FFFFFF' }}
                          name="signal"
                          connectNulls
                        />
                        
                        {/* MACD Histogram */}
                        <Bar
                          dataKey="histogram"
                          name="histogram"
                          barSize={3}
                          shape={(props: any) => {
                            const { x, y, width, height, fill } = props;
                            // Determine if the histogram value is positive or negative
                            const histValue = parseFloat(props.payload.histogram);
                            const barFill = histValue >= 0 ? '#4CAF50' : '#F44336';
                            
                            // For negative values, we need to adjust the y position
                            // to ensure bars go below the zero line
                            if (histValue < 0) {
                              // Draw the bar going down from the zero line
                              return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={barFill} />;
                            } else {
                              // Draw the bar going up from the zero line
                              return <rect x={x} y={y} width={width} height={height} fill={barFill} />;
                            }
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center bg-[#0A1524]">
                    <div className="text-center">
                      <div className="text-[#FF9800] font-mono text-sm font-semibold mb-2">MACD Data Not Available</div>
                      <div className="text-[#7A8999] font-mono text-xs mb-3">
                        Use the REFRESH button at the top of the page to update historical prices and generate MACD data
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Moving Average Chart Section - Full Width */}
          {showMovingAverages && !isLoadingHistorical && historicalPrices && historicalPrices.length > 0 && (
            <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
              <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-[#38AAFD]" />
                  <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">MOVING AVERAGES</h3>
                </div>
                <div className="flex items-center">
                  <span className="text-[#7A8999] font-mono text-xs mr-4">
                    <span className="text-[#38AAFD]">━</span> 50-Day MA
                  </span>
                  <span className="text-[#7A8999] font-mono text-xs">
                    <span className="text-[#FF3D00]">━</span> 200-Day MA
                  </span>
                </div>
              </div>
              <div className="p-4">
                {(() => {
                  // Check if we have enough data for moving averages
                  const hasMaData = historicalPrices && historicalPrices.some((price: any) => 
                    price.ma50 !== null && price.ma50 !== undefined
                  );
                  
                  if (historicalPrices && historicalPrices.length > 0) {
                    console.log(`Moving Average Data Check:`, {
                      totalPoints: historicalPrices.length,
                      ma50Datapoints: historicalPrices.filter((price: any) => price.ma50 !== null && price.ma50 !== undefined).length,
                      ma200Datapoints: historicalPrices.filter((price: any) => price.ma200 !== null && price.ma200 !== undefined).length,
                      samplePoint: historicalPrices[historicalPrices.length - 1]
                    });
                  }
                  
                  return hasMaData;
                })() ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={processHistoricalData(historicalPrices, timeRange)}
                        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                        syncId="stockChart" // Synchronize with main chart
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
                        <XAxis 
                          dataKey="formattedDate"
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          interval="preserveStartEnd"
                          tickMargin={5}
                          stroke="#1A304A"
                          minTickGap={30}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#7A8999' }}
                          tickFormatter={(val) => `${val.toFixed(1)}`}
                          domain={['auto', 'auto']}
                          stroke="#1A304A"
                        />
                        <RechartTooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'close') return [`${formatCurrency(value, 2)}`, 'Price'];
                            if (name === 'ma50') return [`${formatCurrency(value, 2)}`, '50-Day MA'];
                            if (name === 'ma200') return [`${formatCurrency(value, 2)}`, '200-Day MA'];
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ 
                            backgroundColor: '#0B1728', 
                            borderColor: '#1A304A',
                            color: '#EFEFEF'
                          }}
                          itemStyle={{ color: '#EFEFEF' }}
                        />
                        
                        {/* Price Line */}
                        <Line
                          type="monotone"
                          dataKey="close"
                          stroke="#EFEFEF"
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#EFEFEF', fill: '#0B1728' }}
                          name="close"
                        />
                        
                        {/* 50-Day Moving Average */}
                        <Line
                          type="monotone"
                          dataKey="ma50"
                          stroke="#38AAFD"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#38AAFD', fill: '#FFFFFF' }}
                          name="ma50"
                          connectNulls
                        />
                        
                        {/* 200-Day Moving Average */}
                        <Line
                          type="monotone"
                          dataKey="ma200"
                          stroke="#FF3D00"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, stroke: '#FF3D00', fill: '#FFFFFF' }}
                          name="ma200"
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-8 flex flex-col items-center justify-center">
                    <p className="text-[#7A8999] mb-4 text-center">
                      Not enough data to generate moving averages.<br />
                      50-day and 200-day moving averages require sufficient historical data.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-[#0B1728] border-[#1A304A] hover:bg-[#162639] text-[#38AAFD] hover:text-[#38AAFD] font-mono text-xs"
                      onClick={refreshPriceData}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Updating Price Data...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Refresh Price Data
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Company Overview Section - Full Width */}
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">COMPANY OVERVIEW</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              <div className="text-[#EFEFEF] font-mono text-sm">
                <p className="mb-3">{stockData?.company || symbol} is a {stockData?.stockType || 'Compounder'} stock in the {stockData?.sector || 'Technology'} sector with a rating of {stockData?.stockRating || stockData?.rating || 'N/A'}.</p>
                
                <div className="p-3 bg-[#0B1B2F] border border-[#1A304A] rounded-sm mb-3">
                  <div className="flex items-center gap-2 text-[#38AAFD]">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold">Analyst Consensus</span>
                  </div>
                  <p className="mt-2 text-[#7A8999]">Check the Analyst Ratings section below for detailed recommendations and price targets.</p>
                </div>
                
                <div className="p-3 bg-[#0B1B2F] border border-[#1A304A] rounded-sm">
                  <div className="flex items-center gap-2 text-[#4CAF50]">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">Upcoming Earnings</span>
                  </div>
                  <p className="mt-2 text-[#7A8999]">
                    {stockData?.nextEarningsDate 
                      ? `Next earnings date: ${stockData.nextEarningsDate}`
                      : 'No upcoming earnings date available'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Analyst Ratings Section - Full Width */}
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden mb-6">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">ANALYST RATINGS</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              <UpgradeDowngradeTable 
                region={region as 'USD' | 'CAD' | 'INTL'} 
                symbol={symbol} 
                limit={10} 
              />
            </div>
          </div>
          
          {/* Earnings History Section - Full Width */}
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">EARNINGS HISTORY</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              {!earningsData || earningsData.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-[#7A8999] font-mono text-sm mb-2">No earnings data available</div>
                  <div className="text-[#EFEFEF] font-mono text-xs">Check back later for updates</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                        <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">QUARTER</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">DATE</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TIME</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">EPS</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">EST.</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">REV ($B)</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">GUIDE</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SCORE</th>
                        <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MKT REACTION</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {earningsData && Array.isArray(earningsData) ? earningsData.map((earnings: any) => {
                        try {
                          if (!earnings || typeof earnings !== 'object') return null;
                          
                          // Safely extract values with fallbacks
                          const fiscalQ = earnings.fiscalQ || 1;
                          const fiscalYear = earnings.fiscalYear || new Date().getFullYear();
                          const fiscalQuarter = `Q${fiscalQ} ${fiscalYear}`;
                          
                          const earningsDate = earnings.earningsDate ? 
                            new Date(earnings.earningsDate).toLocaleDateString() : 
                            'N/A';
                          
                          const epsActual = typeof earnings.epsActual === 'number' ? earnings.epsActual : 0;
                          const epsEstimate = typeof earnings.epsEstimate === 'number' ? earnings.epsEstimate : 0;
                          
                          const revenueActual = typeof earnings.revenueActual === 'number' ? earnings.revenueActual : 0;
                          const revenueEstimate = typeof earnings.revenueEstimate === 'number' ? earnings.revenueEstimate : 0;
                          
                          const revenueActualB = (revenueActual / 1000000000).toFixed(2);
                          const revenueEstimateB = (revenueEstimate / 1000000000).toFixed(2);
                          
                          const stockReaction = typeof earnings.stockReaction === 'number' ? earnings.stockReaction : 0;
                          
                          return (
                            <tr key={earnings.id || Math.random()} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                              <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                                {fiscalQuarter}
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                                {earningsDate}
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center">
                                <div className="flex items-center justify-center">
                                  <Clock className="h-3 w-3 mr-1 text-[#7A8999]" />
                                  <span className="font-mono text-[#EFEFEF] text-xs">
                                    {earnings.earningsTime || 'AMC'}
                                  </span>
                                </div>
                              </td>
                              <td className={`px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap ${
                                epsActual > epsEstimate ? 'text-[#4CAF50]' : 
                                epsActual < epsEstimate ? 'text-[#F44336]' : 
                                'text-[#EFEFEF]'
                              }`}>
                                {epsActual.toFixed(2)}
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#38AAFD] text-xs whitespace-nowrap">
                                {epsEstimate.toFixed(2)}
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                                <span className={
                                  revenueActual > revenueEstimate ? 'text-[#4CAF50]' : 
                                  revenueActual < revenueEstimate ? 'text-[#F44336]' : 
                                  'text-[#EFEFEF]'
                                }>
                                  {revenueActualB}
                                </span>
                                <span className="text-[#7A8999] ml-1">
                                  ({revenueEstimateB})
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center">
                                <div className={`px-2 py-0.5 rounded-sm text-center font-mono text-[10px] ${guidanceColorMap[earnings.guidanceStatus] || 'bg-gray-800/30 text-gray-400 border border-gray-700'}`}>
                                  {earnings.guidanceStatus || 'N/A'}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center">
                                <div className={`px-2 py-0.5 rounded-sm text-center font-mono text-[10px] ${scoreColorMap[earnings.earningsScore] || 'bg-gray-800/30 text-gray-400 border border-gray-700'}`}>
                                  {earnings.earningsScore || 'N/A'}
                                </div>
                              </td>
                              <td className={`px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap ${
                                stockReaction > 0 ? 'text-[#4CAF50]' : 
                                stockReaction < 0 ? 'text-[#F44336]' : 
                                'text-[#EFEFEF]'
                              }`}>
                                {stockReaction > 0 ? '+' : ''}
                                {stockReaction.toFixed(2)}%
                              </td>
                            </tr>
                          );
                        } catch (error) {
                          console.error("Error rendering earnings row:", error);
                          return null;
                        }
                      }) : <tr><td colSpan={9} className="text-center py-4 text-[#7A8999]">No earnings data available</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
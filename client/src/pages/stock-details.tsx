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
  Activity
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
  AreaChart
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

// Process historical price data based on the selected time range
const processHistoricalData = (data: any[] | null | undefined, timeRange: '1m' | '3m' | '6m' | '1y' | '5y') => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  // Sort data by date in ascending order
  try {
    // Create a safe copy of the data
    const safeData = data.filter(item => item && typeof item === 'object' && item.date);
    
    const sortedData = [...safeData].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Determine how many days to include based on time range
    let daysToInclude = 90; // default to 3m
    switch (timeRange) {
      case '1m':
        daysToInclude = 30;
        break;
      case '3m':
        daysToInclude = 90;
        break;
      case '6m':
        daysToInclude = 180;
        break;
      case '1y':
        daysToInclude = 365;
        break;
      case '5y':
        daysToInclude = 1826; // ~5 years
        break;
    }
    
    // Get the last N days of data
    const filteredData = sortedData.slice(-Math.min(daysToInclude, sortedData.length));
    
    // Format dates for display with null safety
    return filteredData.map(p => {
      try {
        const date = p.date ? new Date(p.date) : new Date();
        // Format the date more cleanly (e.g., "Mar 2023")
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
        
        return {
          date: date.toLocaleDateString(),
          formattedDate,
          close: p.adjClose ? parseFloat(p.adjClose) : (p.close ? parseFloat(p.close) : 0),
          open: p.open ? parseFloat(p.open) : 0,
          high: p.high ? parseFloat(p.high) : 0,
          low: p.low ? parseFloat(p.low) : 0,
          // Add RSI values if they exist
          rsi9: p.rsi9 ? parseFloat(p.rsi9) : undefined,
          rsi14: p.rsi14 ? parseFloat(p.rsi14) : undefined,
          rsi21: p.rsi21 ? parseFloat(p.rsi21) : undefined,
          // Keep the original date object for sorting and calculations
          dateObj: date
        };
      } catch (error) {
        // Return a safe fallback object if anything goes wrong
        console.error("Error processing historical price data item:", error);
        const now = new Date();
        return {
          date: now.toLocaleDateString(),
          formattedDate: now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          close: 0,
          open: 0,
          high: 0,
          low: 0,
          rsi9: undefined,
          rsi14: undefined,
          rsi21: undefined,
          dateObj: now
        };
      }
    });
  } catch (error) {
    console.error("Error processing historical price data:", error);
    return [];
  }
};

export default function StockDetailsPage() {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y' | '5y'>('3m');
  const [showRSI, setShowRSI] = useState<boolean>(false);
  const [rsiPeriod, setRsiPeriod] = useState<'9' | '14' | '21'>('14');
  
  // Get symbol from URL - route pattern is /stock/:symbol
  const [, params] = useRoute('/stock/:symbol');
  const [, setLocation] = useLocation();
  
  // Get region from query params (default to USD)
  const urlParams = new URLSearchParams(window.location.search);
  const regionParam = urlParams.get('region');
  const region = (regionParam && ['USD', 'CAD', 'INTL'].includes(regionParam)) 
    ? regionParam as 'USD' | 'CAD' | 'INTL' 
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
  
  // Fetch historical price data for chart
  const { data: historicalPrices, isLoading: isLoadingHistorical } = useQuery({
    queryKey: ['historicalPrices', symbol, region],
    queryFn: async () => {
      // Try the main path first
      try {
        const response = await fetch(`/api/historical-prices/${symbol}/${region}`);
        
        if (!response.ok) {
          throw new Error('Failed with main path');
        }
        
        return response.json();
      } catch (error) {
        console.log('Trying alternative historical prices path...');
        // Try alternative path if the first one fails
        try {
          const response = await fetch(`/api/portfolios/${region}/stocks/${symbol}/historical`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch historical price data');
          }
          
          return response.json();
        } catch (secondError) {
          console.error('Both historical price paths failed:', secondError);
          throw secondError;
        }
      }
    },
    enabled: !!symbol, // Always fetch historical prices
    staleTime: 3600000 // 1 hour
  });
  
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
  
  // Refetch current price manually
  const refreshPriceData = () => {
    refetchPriceData();
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
      {/* Header section with back button */}
      <div className="mb-4 sm:mb-6 flex items-center">
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
          className="rounded-sm h-8 bg-[#0B1728] text-[#7A8999] text-xs font-mono border-[#1A304A] hover:bg-[#162639] hover:text-[#EFEFEF]"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          REFRESH
        </Button>
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
                <div className="h-80">
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
                      
                      {/* RSI Controls */}
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
                        
                        {showRSI && (
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
                                {period}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Main price chart */}
                  <ResponsiveContainer width="100%" height={showRSI ? "70%" : "90%"}>
                    <AreaChart
                      data={processHistoricalData(historicalPrices, timeRange)}
                      margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
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
                        hide={showRSI} // Hide X-axis labels on main chart when RSI is shown
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
                  
                  {/* RSI chart - separate chart below main price chart */}
                  {showRSI && (
                    <div className="w-full mt-0 border-t border-[#1A304A]">
                      <div className="flex items-center justify-between p-1 bg-[#061220] text-[#805AD5]">
                        <div className="text-xs font-mono flex items-center">
                          <span className="mr-1">RSI</span>
                          <span className="font-bold">{rsiPeriod}</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart
                          data={processHistoricalData(historicalPrices, timeRange)}
                          margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
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
                  )}
                </div>
              )}
            </div>
          </div>
          
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
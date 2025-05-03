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
  Clock
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

export default function StockDetailsPage() {
  const queryClient = useQueryClient();
  
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
    enabled: !!symbol && defaultTab === 'chart',
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
    enabled: !!symbol && defaultTab === 'earnings',
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
  
  // Calculate stock metrics
  const stockMetrics = React.useMemo(() => {
    if (!stockData || !priceData) return {};
    
    const bookPrice = parseFloat(stockData.price);
    const marketPrice = parseFloat(priceData.regularMarketPrice);
    const quantity = parseFloat(stockData.quantity);
    
    // Calculate metrics
    const nav = marketPrice * quantity;
    const marketValue = marketPrice * quantity;
    const bookValue = bookPrice * quantity;
    const profitLoss = marketValue - bookValue;
    const profitLossPercent = (profitLoss / bookValue) * 100;
    const unrealizedProfitLoss = profitLoss > 0 ? 'Profit' : 'Loss';
    
    return {
      nav,
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
      )}
      
      {/* Tabs for different sections */}
      <Tabs defaultValue={defaultTab} className="mt-6" onValueChange={handleTabChange}>
        <TabsList className="mb-6 flex h-auto space-x-1 bg-[#0A1524] p-1 rounded-sm border border-[#1A304A]">
          <TabsTrigger 
            value="overview" 
            className="flex-1 h-8 data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-[#EFEFEF] font-mono text-xs data-[state=inactive]:text-[#7A8999] data-[state=inactive]:bg-transparent rounded-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="analyst-ratings" 
            className="flex-1 h-8 data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-[#EFEFEF] font-mono text-xs data-[state=inactive]:text-[#7A8999] data-[state=inactive]:bg-transparent rounded-sm"
          >
            Analyst Ratings
          </TabsTrigger>
          <TabsTrigger 
            value="earnings" 
            className="flex-1 h-8 data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-[#EFEFEF] font-mono text-xs data-[state=inactive]:text-[#7A8999] data-[state=inactive]:bg-transparent rounded-sm"
          >
            Earnings
          </TabsTrigger>
          <TabsTrigger 
            value="chart" 
            className="flex-1 h-8 data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-[#EFEFEF] font-mono text-xs data-[state=inactive]:text-[#7A8999] data-[state=inactive]:bg-transparent rounded-sm"
          >
            Chart
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">COMPANY OVERVIEW</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              <div className="text-[#EFEFEF] font-mono text-sm">
                {/* Placeholder for company description - would typically come from an API like Yahoo Finance */}
                <p className="mb-3">{stockData?.company || symbol} is a {stockData?.stockType || 'Compounder'} stock in the {stockData?.sector || 'Technology'} sector with a rating of {stockData?.stockRating || stockData?.rating || 'N/A'}.</p>
                
                <div className="p-3 bg-[#0B1B2F] border border-[#1A304A] rounded-sm mb-3">
                  <div className="flex items-center gap-2 text-[#38AAFD]">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold">Analyst Consensus</span>
                  </div>
                  <p className="mt-2 text-[#7A8999]">For detailed analyst recommendations and price targets, check the Analyst Ratings tab.</p>
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
        </TabsContent>
        
        <TabsContent value="analyst-ratings" className="space-y-6">
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
            <div className="flex justify-between items-center py-2 px-4 border-b border-[#1A304A]">
              <h3 className="text-[#EFEFEF] font-mono text-sm font-medium tracking-wide">ANALYST RATINGS</h3>
              <div className="h-1 w-28 bg-[#38AAFD]"></div>
            </div>
            <div className="p-4">
              <UpgradeDowngradeTable 
                region={region as 'USD' | 'CAD' | 'INTL'} 
                symbol={symbol} 
                limit={50} 
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="earnings" className="space-y-6">
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
                      {earningsData.map((earnings: StockEarnings) => {
                        const fiscalQuarter = `Q${earnings.fiscalQ} ${earnings.fiscalYear}`;
                        const earningsDate = new Date(earnings.earningsDate).toLocaleDateString();
                        const revenueActualB = (earnings.revenueActual / 1000000000).toFixed(2);
                        const revenueEstimateB = (earnings.revenueEstimate / 1000000000).toFixed(2);
                        
                        return (
                          <tr key={earnings.id} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
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
                              earnings.epsActual > earnings.epsEstimate ? 'text-[#4CAF50]' : 
                              earnings.epsActual < earnings.epsEstimate ? 'text-[#F44336]' : 
                              'text-[#EFEFEF]'
                            }`}>
                              {earnings.epsActual.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#38AAFD] text-xs whitespace-nowrap">
                              {earnings.epsEstimate.toFixed(2)}
                            </td>
                            <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                              <span className={
                                earnings.revenueActual > earnings.revenueEstimate ? 'text-[#4CAF50]' : 
                                earnings.revenueActual < earnings.revenueEstimate ? 'text-[#F44336]' : 
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
                              earnings.stockReaction > 0 ? 'text-[#4CAF50]' : 
                              earnings.stockReaction < 0 ? 'text-[#F44336]' : 
                              'text-[#EFEFEF]'
                            }`}>
                              {earnings.stockReaction > 0 ? '+' : ''}
                              {earnings.stockReaction.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="chart" className="space-y-6">
          <div className="bg-[#0A1524] border border-[#1A304A] rounded-sm shadow-lg overflow-hidden">
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
                  <div className="text-[#EFEFEF] font-mono text-xs mb-4 flex justify-between items-center">
                    <div>
                      <span className="text-[#7A8999]">HISTORICAL PRICE CHART</span>
                      <span className="text-[#38AAFD] ml-2">{symbol}</span>
                    </div>
                    <div className="text-[#7A8999]">
                      {historicalPrices.length} DAYS OF DATA
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart
                      data={historicalPrices.slice(-90).map(p => ({
                        date: new Date(p.date).toLocaleDateString(),
                        close: parseFloat(p.adjClose || p.close),
                        open: parseFloat(p.open),
                        high: parseFloat(p.high),
                        low: parseFloat(p.low)
                      }))}
                      margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0A7AFF" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0A7AFF" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: '#7A8999' }}
                        tickCount={5}
                        tickMargin={10}
                        stroke="#1A304A"
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
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { ArrowLeftIcon, Loader2 } from 'lucide-react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UpgradeDowngradeTable } from '@/components/dashboard/upgrade-downgrade-table';
import { cn } from '@/lib/utils';

export default function StockDetailsPage() {
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
    enabled: !!symbol
  });
  
  // Fetch current price data
  const { data: priceData } = useQuery({
    queryKey: ['currentPrice', symbol, region],
    queryFn: async () => {
      const response = await fetch(`/api/current-prices/${region}/${symbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch current price data');
      }
      
      return response.json();
    },
    enabled: !!symbol
  });
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    // Update the URL without navigating away
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url.toString());
  };
  
  // Determine price change color
  const priceChangeColor = React.useMemo(() => {
    if (!priceData) return 'text-gray-500';
    const change = priceData.regularMarketChange;
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  }, [priceData]);
  
  return (
    <div className="container py-6 max-w-7xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          className="mb-4" 
          onClick={() => setLocation(`/${region.toLowerCase()}-portfolio`)}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to {region} Portfolio
        </Button>
        
        {/* Stock header */}
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading stock details...</span>
          </div>
        ) : isError || !stockData ? (
          <div className="text-red-500">
            Stock not found or error loading data.
          </div>
        ) : (
          <div className="border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {symbol}
                  <span className="text-sm font-normal text-muted-foreground ml-2 border border-border rounded-md px-2 py-0.5">
                    {region}
                  </span>
                </h1>
                <h2 className="text-lg text-muted-foreground mt-1">{stockData.company}</h2>
                
                <div className="flex items-center gap-4 mt-3">
                  {priceData && (
                    <>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="text-xl font-medium">
                          ${priceData.regularMarketPrice?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Change</span>
                        <span className={cn("text-xl font-medium", priceChangeColor)}>
                          {priceData.regularMarketChange?.toFixed(2) || '0.00'} 
                          ({priceData.regularMarketChangePercent?.toFixed(2) || '0.00'}%)
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-base">
                      {stockData.stockType || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <span className="text-base">
                      {stockData.stockRating || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Sector</span>
                    <span className="text-base">
                      {stockData.sector || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Add additional info or actions here */}
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs for different sections */}
      <Tabs defaultValue={defaultTab} className="mt-6" onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analyst-ratings">Analyst Ratings</TabsTrigger>
          <TabsTrigger value="historical-prices">Historical Prices</TabsTrigger>
          <TabsTrigger value="chart">Charts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <h3 className="text-lg font-medium mb-4">Stock Overview</h3>
              <p className="text-muted-foreground">
                Overview information for {symbol}.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analyst-ratings">
          <div className="grid grid-cols-1 gap-6">
            <UpgradeDowngradeTable 
              region={region as 'USD' | 'CAD' | 'INTL'} 
              symbol={symbol} 
              limit={50} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="historical-prices">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Historical Prices</h3>
              <p className="text-muted-foreground">
                Historical price information for {symbol} will be displayed here.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="chart">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Price Charts</h3>
              <p className="text-muted-foreground">
                Interactive charts for {symbol} will be displayed here.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { getStockTypeBackground, getRatingClass } from "@/lib/utils";
import { useState } from "react";
import { List, Filter, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CurrentPrice {
  id: number;
  symbol: string;
  region: string;
  regularMarketPrice: string;
  regularMarketChange: string;
  regularMarketChangePercent: string;
  regularMarketVolume: string;
  regularMarketDayHigh: string;
  regularMarketDayLow: string;
  marketCap: string;
  trailingPE: string;
  forwardPE: string;
  dividendYield: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  updatedAt: string;
}

interface PortfolioStock {
  id: number;
  symbol: string;
  company: string;
  stockType: string;
  rating: string;
  price: number;
  quantity: number;
  nav: number;
  portfolioWeight: number;
  dailyChange: number;
  mtdChange: number;
  ytdChange: number;
  sixMonthChange?: number;
  fiftyTwoWeekChange?: number;
  dividendYield?: number;
  profitLoss?: number;
  nextEarningsDate?: string;
}

interface PortfolioTableProps {
  stocks: PortfolioStock[];
  region: 'USD' | 'CAD' | 'INTL';
  currentPrices?: CurrentPrice[];
}

export const PortfolioTable = ({ stocks, region, currentPrices }: PortfolioTableProps) => {
  const [filter, setFilter] = useState<string>('all');
  
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  const filteredStocks = filter === 'all' 
    ? stocks 
    : stocks.filter(stock => stock.stockType.toLowerCase() === filter.toLowerCase());
    
  // Fetch current prices if not provided
  const { data: fetchedPrices, isLoading: pricesLoading } = useQuery({
    queryKey: [`/api/current-prices/${region}`],
    staleTime: 60000, // 1 minute
    enabled: !currentPrices // Only fetch if not provided via props
  });

  // Use either provided prices or fetched prices
  const prices = currentPrices || fetchedPrices || [];
  
  return (
    <Card className="mb-6 border-0 shadow bg-[#0A1929]">
      <CardHeader className="card-header flex flex-col px-3 sm:px-4 py-2 sm:py-3 bg-[#111E2E]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#4CAF50]" />
            <h3 className="text-left font-mono text-[#EFEFEF] text-xs sm:text-sm">{region} PORTFOLIO HOLDINGS</h3>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center ${filter === 'all' ? 'bg-gray-800/70 text-white' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}
            onClick={() => setFilter('all')}
          >
            <List className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center ${filter === 'comp' ? 'bg-blue-900/30 text-white' : 'text-gray-400 hover:bg-blue-900/20 hover:text-white'}`}
            onClick={() => setFilter('comp')}
          >
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-secondary mr-1"></div>
            Comp
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center ${filter === 'cat' ? 'bg-yellow-900/30 text-white' : 'text-gray-400 hover:bg-yellow-900/20 hover:text-white'}`}
            onClick={() => setFilter('cat')}
          >
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFC107] mr-1"></div>
            Cat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center ${filter === 'cycl' ? 'bg-purple-900/30 text-white' : 'text-gray-400 hover:bg-purple-900/20 hover:text-white'}`}
            onClick={() => setFilter('cycl')}
          >
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#9C27B0] mr-1"></div>
            Cycl
          </Button>
        </div>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <div className="h-1 w-12 bg-[#4CAF50]"></div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <table className="min-w-full divide-y divide-gray-800 data-table">
          <thead className="bg-[#0A1524]">
            <tr>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Symbol</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Company</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Type</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Rating</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Book Price</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Market Price</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Qty</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">NAV</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Weight</th>
              <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Daily %</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">MTD %</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">YTD %</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">P&L</th>
              <th scope="col" className="hidden lg:table-cell px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">Next ER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-[10px] sm:text-xs mono">
            {filteredStocks.map((stock) => {
              // Find current price data for this stock
              const currentPrice = prices.find(p => p.symbol === stock.symbol);
              const marketPrice = currentPrice ? parseFloat(currentPrice.regularMarketPrice) : null;
              const marketChange = currentPrice ? parseFloat(currentPrice.regularMarketChangePercent) : null;
              
              // Calculate difference between book price and market price
              const priceDiff = marketPrice ? (marketPrice - stock.price) / stock.price * 100 : null;
              
              return (
                <tr key={stock.id}>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 font-medium text-secondary whitespace-nowrap">{stock.symbol}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 max-w-[80px] sm:max-w-[150px] truncate">{stock.company}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center">
                    <Badge variant="outline" className={`text-[9px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 rounded-full ${getStockTypeBackground(stock.stockType)}`}>
                      {stock.stockType}
                    </Badge>
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-center">
                    <span className={`rating text-[9px] sm:text-xs ${getRatingClass(stock.rating)}`}>{stock.rating}</span>
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">{formatCurrency(stock.price, currencySymbol)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    {marketPrice ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={priceDiff ? getProfitLossClass(priceDiff) : ""}>
                              {formatCurrency(marketPrice, currencySymbol)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Market Price: {formatCurrency(marketPrice, currencySymbol)}</p>
                            <p>Daily Change: {formatPercentage(marketChange)}</p>
                            <p>Vs. Book: {formatPercentage(priceDiff)}</p>
                            <p>Last Updated: {new Date(currentPrice.updatedAt).toLocaleTimeString()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-500">--</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">{stock.quantity}</td>
                  <td className="hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">{formatCurrency(stock.nav, currencySymbol)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">{stock.portfolioWeight?.toFixed(1)}%</td>
                  <td className={`px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap ${getProfitLossClass(marketChange || stock.dailyChange)}`}>
                    {marketChange ? formatPercentage(marketChange) : formatPercentage(stock.dailyChange)}
                  </td>
                  <td className={`hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap ${getProfitLossClass(stock.mtdChange)}`}>
                    {formatPercentage(stock.mtdChange)}
                  </td>
                  <td className={`hidden sm:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap ${getProfitLossClass(stock.ytdChange)}`}>
                    {formatPercentage(stock.ytdChange)}
                  </td>
                  <td className={`hidden md:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap ${getProfitLossClass(stock.profitLoss)}`}>
                    {formatCurrency(stock.profitLoss, currencySymbol)}
                  </td>
                  <td className="hidden lg:table-cell px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">{stock.nextEarningsDate || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

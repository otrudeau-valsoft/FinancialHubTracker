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
    <Card className="mb-6 border-0 shadow bg-[#0A1929] rounded-none border border-[#1A304A]">
      <CardHeader className="card-header px-3 py-2 sm:px-4 sm:py-3 bg-[#0D1C30] border-b border-[#1A304A]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#4CAF50]" />
            <h3 className="text-left font-mono text-[#EFEFEF] text-xs sm:text-sm">{region} PORTFOLIO HOLDINGS</h3>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-sm flex items-center ${filter === 'all' ? 'bg-[#1A304A] text-white' : 'text-[#7A8999] hover:bg-[#1A304A]/50 hover:text-white'}`}
            onClick={() => setFilter('all')}
          >
            <List className="mr-1 h-3 w-3" />
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-sm flex items-center ${filter === 'comp' ? 'bg-blue-900/30 text-secondary' : 'text-[#7A8999] hover:bg-blue-900/20 hover:text-secondary'}`}
            onClick={() => setFilter('comp')}
          >
            <div className="w-2 h-2 rounded-full bg-secondary mr-1"></div>
            Comp
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-sm flex items-center ${filter === 'cat' ? 'bg-yellow-900/30 text-[#FFC107]' : 'text-[#7A8999] hover:bg-yellow-900/20 hover:text-[#FFC107]'}`}
            onClick={() => setFilter('cat')}
          >
            <div className="w-2 h-2 rounded-full bg-[#FFC107] mr-1"></div>
            Cat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-sm flex items-center ${filter === 'cycl' ? 'bg-purple-900/30 text-[#9C27B0]' : 'text-[#7A8999] hover:bg-purple-900/20 hover:text-[#9C27B0]'}`}
            onClick={() => setFilter('cycl')}
          >
            <div className="w-2 h-2 rounded-full bg-[#9C27B0] mr-1"></div>
            Cycl
          </Button>
        </div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
              <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SYMBOL</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">COMPANY</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TYPE</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">RATING</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">BOOK PRICE</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MKT PRICE</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">QTY</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NAV</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">WEIGHT</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">DAILY %</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MTD %</th>
              <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">YTD %</th>
              <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">P&L</th>
              <th scope="col" className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NEXT ER</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {filteredStocks.map((stock) => {
              // Find current price data for this stock
              const currentPrice = prices.find(p => p.symbol === stock.symbol);
              const marketPrice = currentPrice ? parseFloat(currentPrice.regularMarketPrice) : null;
              const marketChange = currentPrice ? parseFloat(currentPrice.regularMarketChangePercent) : null;
              
              // Calculate difference between book price and market price
              const priceDiff = marketPrice ? (marketPrice - stock.price) / stock.price * 100 : null;
              
              return (
                <tr key={stock.id} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                  <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#38AAFD] text-xs font-medium whitespace-nowrap">{stock.symbol}</td>
                  <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap overflow-hidden" style={{ maxWidth: '120px', textOverflow: 'ellipsis' }}>{stock.company}</td>
                  <td className="px-2 sm:px-3 py-0 text-center">
                    <span className={`inline-block font-mono px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium ${getStockTypeBackground(stock.stockType)}`}>
                      {stock.stockType}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-0 text-center">
                    <span className={`inline-block font-mono min-w-[1.5rem] px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium ${getRatingClass(stock.rating)}`}>{stock.rating}</span>
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{formatCurrency(stock.price, currencySymbol)}</td>
                  <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                    {marketPrice ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={priceDiff ? getProfitLossClass(priceDiff) : "text-[#EFEFEF]"}>
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
                      <span className="text-[#7A8999]">--</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{stock.quantity}</td>
                  <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{formatCurrency(stock.nav, currencySymbol)}</td>
                  <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{stock.portfolioWeight?.toFixed(1)}%</td>
                  <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                    <span className={marketChange || stock.dailyChange > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                      {marketChange ? formatPercentage(marketChange) : formatPercentage(stock.dailyChange)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                    <span className={stock.mtdChange > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                      {formatPercentage(stock.mtdChange)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                    <span className={stock.ytdChange > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                      {formatPercentage(stock.ytdChange)}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                    <span className={stock.profitLoss > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                      {formatCurrency(stock.profitLoss, currencySymbol)}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] text-xs whitespace-nowrap">{stock.nextEarningsDate || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

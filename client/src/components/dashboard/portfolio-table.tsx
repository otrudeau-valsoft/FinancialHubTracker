import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { getStockTypeBackground, getRatingClass } from "@/lib/utils";
import { useState } from "react";
import { List, Filter, AlertTriangle, InfoIcon, BarChart4, Repeat } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RebalanceModal } from "./rebalance-modal";

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
  netAssetValue?: number; // From API
  nav?: number; // Old field
  portfolioPercentage?: number; // From API
  portfolioWeight?: number; // Old field
  dailyChangePercent?: number; // From API
  dailyChange?: number; // Old field
  mtdChangePercent?: number; // From API
  mtdChange?: number; // Old field
  ytdChangePercent?: number; // From API
  ytdChange?: number; // Old field
  sixMonthChangePercent?: number;
  sixMonthChange?: number;
  fiftyTwoWeekChangePercent?: number;
  fiftyTwoWeekChange?: number;
  dividendYield?: number;
  profitLoss?: number;
  nextEarningsDate?: string;
  sector?: string;
  purchasePrice?: string; // Purchase Price
}

interface PortfolioTableProps {
  stocks: PortfolioStock[];
  region: 'USD' | 'CAD' | 'INTL';
  currentPrices?: CurrentPrice[];
}

export const PortfolioTable = ({ stocks, region, currentPrices }: PortfolioTableProps) => {
  const [filter, setFilter] = useState<string>('all');
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  const filteredStocks = filter === 'all' 
    ? stocks 
    : stocks.filter(stock => stock.stockType.toLowerCase() === filter.toLowerCase());
    
  // Fetch current prices if not provided
  const { data: fetchedPrices, isLoading: pricesLoading } = useQuery({
    queryKey: [`/api/current-prices/${region}`],
    staleTime: 30000, // 30 seconds - reduced for more frequent updates
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Fetch every 30 seconds automatically
    enabled: true // Always fetch to ensure we have latest prices
  });

  // Use either provided prices or fetched prices
  const prices = currentPrices || fetchedPrices || [];
  
  // Map portfolio stocks to the format expected by RebalanceModal
  const rebalanceStocks = stocks.map(stock => ({
    id: stock.id,
    symbol: stock.symbol,
    company: stock.company,
    stockType: stock.stockType,
    rating: stock.rating,
    quantity: stock.quantity,
    price: stock.price,
    purchasePrice: stock.purchasePrice,
    sector: stock.sector || 'Technology' // Default sector if not available
  }));
  
  return (
    <>
      <RebalanceModal 
        isOpen={isRebalanceModalOpen}
        onClose={() => setIsRebalanceModalOpen(false)}
        region={region}
        existingStocks={rebalanceStocks}
      />
      
      <Card className="mb-6 border-0 shadow bg-[#0A1929] rounded-none border border-[#1A304A]">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">HOLDINGS</h3>
              <Button 
                onClick={() => setIsRebalanceModalOpen(true)}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] font-mono bg-[#0F1A2A] border-[#193049] text-[#EFEFEF] hover:bg-[#162638]"
              >
                <Repeat size={12} className="mr-1" /> REBALANCE
              </Button>
            </div>
            <div className="h-1 w-8 bg-[#4CAF50]"></div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                <th scope="col" className="sticky left-0 bg-[#0D1F32] px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SYMBOL</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">COMPANY</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TYPE</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">RATING</th>
                <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">BOOK PRICE</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MKT PRICE</th>
                <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">QTY</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NAV</th>
                <th scope="col" className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">PURCHASE PRICE</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">WEIGHT %</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">DAILY %</th>
                <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MTD %</th>
                <th scope="col" className="hidden sm:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">YTD %</th>
                <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">52W %</th>
                <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">P&L</th>
                <th scope="col" className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NEXT ER</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {filteredStocks.map((stock) => {
                // Find current price data for this stock
                // Handle special case for Canadian stocks in INTL portfolio
                const lookupSymbol = stock.symbol;
                const lookupSymbolWithExtension = stock.symbol + '.TO';
                
                const currentPrice = Array.isArray(prices) 
                  ? prices.find((p: CurrentPrice) => 
                      p.symbol === lookupSymbol || 
                      p.symbol === lookupSymbolWithExtension)
                  : undefined;
                const marketPrice = currentPrice ? parseFloat(currentPrice.regularMarketPrice) : null;
                const marketChange = currentPrice ? parseFloat(currentPrice.regularMarketChangePercent) : null;
                
                // Calculate difference between book price and market price
                const priceDiff = marketPrice ? (marketPrice - stock.price) / stock.price * 100 : null;
                
                // Calculate P&L based on purchase price vs current market price
                const purchasePrice = stock.purchasePrice ? parseFloat(stock.purchasePrice) : null;
                const realProfitLoss = marketPrice && purchasePrice 
                  ? ((marketPrice - purchasePrice) / purchasePrice) * 100 
                  : null;
                
                return (
                  <tr key={stock.id} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                    <td className="sticky left-0 bg-[#0A1929] px-2 sm:px-3 py-0 text-left font-mono text-[#38AAFD] text-xs font-medium whitespace-nowrap">
                      <Link href={`/stock/${stock.symbol}?region=${region}`} className="flex items-center gap-1 hover:underline">
                        {stock.symbol}
                        <InfoIcon size={11} className="text-[#38AAFD] opacity-70" />
                      </Link>
                    </td>
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
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                      {stock.netAssetValue || stock.nav 
                        ? formatCurrency(stock.netAssetValue || stock.nav, currencySymbol)
                        : formatCurrency(stock.price * stock.quantity, currencySymbol)}
                    </td>
                    <td className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                      {stock.purchasePrice !== undefined ? formatCurrency(parseFloat(stock.purchasePrice), currencySymbol) : '--'}
                    </td>
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                      {typeof stock.portfolioPercentage === 'number' 
                        ? stock.portfolioPercentage.toFixed(1) 
                        : typeof stock.portfolioWeight === 'number' 
                          ? stock.portfolioWeight.toFixed(1) 
                          : '0.0'}%
                    </td>
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                      <span className={
                        marketChange || 
                        (stock.dailyChangePercent !== undefined && stock.dailyChangePercent > 0) || 
                        (stock.dailyChange !== undefined && stock.dailyChange > 0) 
                          ? 'text-[#4CAF50]' 
                          : 'text-[#F44336]'
                      }>
                        {marketChange 
                          ? formatPercentage(marketChange) 
                          : stock.dailyChangePercent !== undefined 
                            ? formatPercentage(stock.dailyChangePercent) 
                            : stock.dailyChange !== undefined
                              ? formatPercentage(stock.dailyChange)
                              : '--'
                        }
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                      <span className={
                        (stock.mtdChangePercent !== undefined && stock.mtdChangePercent > 0) || 
                        (stock.mtdChange !== undefined && stock.mtdChange > 0) 
                          ? 'text-[#4CAF50]' 
                          : 'text-[#F44336]'
                      }>
                        {stock.mtdChangePercent !== undefined 
                          ? formatPercentage(stock.mtdChangePercent) 
                          : stock.mtdChange !== undefined 
                            ? formatPercentage(stock.mtdChange)
                            : '--'
                        }
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                      <span className={
                        (stock.ytdChangePercent !== undefined && stock.ytdChangePercent > 0) || 
                        (stock.ytdChange !== undefined && stock.ytdChange > 0) 
                          ? 'text-[#4CAF50]' 
                          : 'text-[#F44336]'
                      }>
                        {stock.ytdChangePercent !== undefined 
                          ? formatPercentage(stock.ytdChangePercent) 
                          : stock.ytdChange !== undefined
                            ? formatPercentage(stock.ytdChange)
                            : '--'
                        }
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                      <span className={
                        (stock.fiftyTwoWeekChangePercent !== undefined && stock.fiftyTwoWeekChangePercent > 0) || 
                        (stock.fiftyTwoWeekChange !== undefined && stock.fiftyTwoWeekChange > 0) 
                          ? 'text-[#4CAF50]' 
                          : 'text-[#F44336]'
                      }>
                        {stock.fiftyTwoWeekChangePercent !== undefined 
                          ? formatPercentage(stock.fiftyTwoWeekChangePercent) 
                          : stock.fiftyTwoWeekChange !== undefined
                            ? formatPercentage(stock.fiftyTwoWeekChange)
                            : '--'
                        }
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                      {realProfitLoss !== null ? (
                        <span className={realProfitLoss > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}>
                          {formatPercentage(realProfitLoss)}
                        </span>
                      ) : (
                        <span className="text-[#7A8999]">--</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] text-xs whitespace-nowrap">{stock.nextEarningsDate || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};
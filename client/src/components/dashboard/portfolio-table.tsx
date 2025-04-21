import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage, getProfitLossClass } from "@/lib/financial";
import { getStockTypeBackground, getRatingClass } from "@/lib/utils";
import { useState } from "react";
import { List, Filter } from "lucide-react";

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
}

export const PortfolioTable = ({ stocks, region }: PortfolioTableProps) => {
  const [filter, setFilter] = useState<string>('all');
  
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  const filteredStocks = filter === 'all' 
    ? stocks 
    : stocks.filter(stock => stock.stockType.toLowerCase() === filter.toLowerCase());
  
  return (
    <Card className="mb-6 border-0 shadow bg-[#0A1929]">
      <CardHeader className="card-header flex flex-row items-center justify-between px-4 py-3 bg-[#111E2E]">
        <h3 className="text-left">{region} Portfolio Holdings</h3>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs px-3 py-1 rounded-full flex items-center ${filter === 'all' ? 'bg-gray-800/70 text-white' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'}`}
            onClick={() => setFilter('all')}
          >
            <List className="mr-1 h-4 w-4" />
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs px-3 py-1 rounded-full flex items-center ${filter === 'comp' ? 'bg-blue-900/30 text-white' : 'text-gray-400 hover:bg-blue-900/20 hover:text-white'}`}
            onClick={() => setFilter('comp')}
          >
            <div className="w-3 h-3 rounded-full bg-secondary mr-1"></div>
            Comp
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs px-3 py-1 rounded-full flex items-center ${filter === 'cat' ? 'bg-yellow-900/30 text-white' : 'text-gray-400 hover:bg-yellow-900/20 hover:text-white'}`}
            onClick={() => setFilter('cat')}
          >
            <div className="w-3 h-3 rounded-full bg-[#FFC107] mr-1"></div>
            Cat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-xs px-3 py-1 rounded-full flex items-center ${filter === 'cycl' ? 'bg-purple-900/30 text-white' : 'text-gray-400 hover:bg-purple-900/20 hover:text-white'}`}
            onClick={() => setFilter('cycl')}
          >
            <div className="w-3 h-3 rounded-full bg-[#9C27B0] mr-1"></div>
            Cycl
          </Button>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 data-table">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Company</th>
              <th scope="col">Type</th>
              <th scope="col">Rating</th>
              <th scope="col">Price</th>
              <th scope="col">Qty</th>
              <th scope="col">NAV</th>
              <th scope="col">Weight</th>
              <th scope="col">Daily %</th>
              <th scope="col">MTD %</th>
              <th scope="col">YTD %</th>
              <th scope="col">P&L</th>
              <th scope="col">Next ER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredStocks.map((stock) => (
              <tr key={stock.id}>
                <td className="mono font-medium">{stock.symbol}</td>
                <td>{stock.company}</td>
                <td>
                  <Badge className={getStockTypeBackground(stock.stockType)}>
                    {stock.stockType}
                  </Badge>
                </td>
                <td className="text-center">
                  <span className={`rating ${getRatingClass(stock.rating)}`}>{stock.rating}</span>
                </td>
                <td className="mono">{formatCurrency(stock.price, currencySymbol)}</td>
                <td className="mono">{stock.quantity}</td>
                <td className="mono">{formatCurrency(stock.nav, currencySymbol)}</td>
                <td className="mono">{stock.portfolioWeight?.toFixed(1)}%</td>
                <td className={`mono ${getProfitLossClass(stock.dailyChange)}`}>
                  {formatPercentage(stock.dailyChange)}
                </td>
                <td className={`mono ${getProfitLossClass(stock.mtdChange)}`}>
                  {formatPercentage(stock.mtdChange)}
                </td>
                <td className={`mono ${getProfitLossClass(stock.ytdChange)}`}>
                  {formatPercentage(stock.ytdChange)}
                </td>
                <td className={`mono ${getProfitLossClass(stock.profitLoss)}`}>
                  {formatCurrency(stock.profitLoss, currencySymbol)}
                </td>
                <td className="mono">{stock.nextEarningsDate || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Stock = {
  id: number;
  symbol: string;
  company: string;
  region: string;
  sector: string;
  stockType: string;
  stockRating: string;
  price: string;
  quantity: string;
  nextEarningsDate?: string;
};

export default function StockDirectory() {
  const [location, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Stock; direction: 'asc' | 'desc' }>({ 
    key: 'symbol', 
    direction: 'asc' 
  });
  
  // Fetch stocks from all regions
  const { data: usdStocks, isLoading: usdLoading } = useQuery<Stock[]>({
    queryKey: ['/api/portfolios/USD/stocks'],
  });
  
  const { data: cadStocks, isLoading: cadLoading } = useQuery<Stock[]>({
    queryKey: ['/api/portfolios/CAD/stocks'],
  });
  
  const { data: intlStocks, isLoading: intlLoading } = useQuery<Stock[]>({
    queryKey: ['/api/portfolios/INTL/stocks'],
  });
  
  const isLoading = usdLoading || cadLoading || intlLoading;
  
  // Combine all stocks
  const allStocks = useMemo(() => {
    const combined = [
      ...(usdStocks || []),
      ...(cadStocks || []),
      ...(intlStocks || [])
    ];
    return combined;
  }, [usdStocks, cadStocks, intlStocks]);
  
  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    return allStocks
      .filter(stock => {
        // Apply region filter
        if (regionFilter !== 'ALL' && stock.region !== regionFilter) {
          return false;
        }
        
        // Apply type filter
        if (typeFilter !== 'ALL' && stock.stockType !== typeFilter) {
          return false;
        }
        
        // Apply search
        if (searchTerm.trim() !== '') {
          const searchLower = searchTerm.toLowerCase();
          return (
            stock.symbol.toLowerCase().includes(searchLower) ||
            stock.company.toLowerCase().includes(searchLower) ||
            (stock.sector && stock.sector.toLowerCase().includes(searchLower))
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by the selected column
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        // Handle numeric values
        if (sortConfig.key === 'price' || sortConfig.key === 'quantity') {
          const aNum = parseFloat(aValue as string) || 0;
          const bNum = parseFloat(bValue as string) || 0;
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Handle string values
        const aString = String(aValue || '').toLowerCase();
        const bString = String(bValue || '').toLowerCase();
        return sortConfig.direction === 'asc' 
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      });
  }, [allStocks, searchTerm, regionFilter, typeFilter, sortConfig]);
  
  // Extract unique stock types for filter
  const stockTypes = useMemo(() => {
    const types = new Set<string>();
    allStocks.forEach(stock => {
      if (stock.stockType) {
        types.add(stock.stockType);
      }
    });
    return Array.from(types);
  }, [allStocks]);
  
  // Toggle sort order
  const handleSort = (key: keyof Stock) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  // Navigate to stock detail page
  const viewStockDetails = (symbol: string, region: string) => {
    navigate(`/stock-details/${symbol}/${region}`);
  };
  
  // Get rating class for color coding
  const getRatingClass = (rating: string) => {
    if (!rating) return "bg-gray-700 text-white";
    
    const ratingNum = parseInt(rating);
    if (ratingNum === 1) return "bg-red-800 text-white";
    if (ratingNum === 2) return "bg-yellow-800 text-white";
    if (ratingNum === 3) return "bg-blue-800 text-white";
    if (ratingNum === 4) return "bg-green-800 text-white";
    
    return "bg-gray-700 text-white";
  };
  
  // Get stock type background color
  const getStockTypeBackground = (stockType: string) => {
    if (!stockType) return "bg-gray-700 text-white";
    
    switch (stockType.toLowerCase()) {
      case 'compounder':
        return "bg-blue-800 text-white";
      case 'catalyst':
        return "bg-purple-800 text-white";
      case 'cyclical':
        return "bg-amber-800 text-white";
      default:
        return "bg-gray-700 text-white";
    }
  };
  
  // Get currency symbol based on region
  const getCurrencySymbol = (region: string) => {
    if (region === 'USD') return '$';
    if (region === 'CAD') return 'C$';
    return '$';
  };
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 bg-[#061220]">
      <div className="flex flex-col space-y-1.5 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-white font-mono">STOCK DIRECTORY</h1>
        <p className="text-sm text-gray-400">Browse and search all stocks across portfolios</p>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-[#0A1524] border-[#1A304A] text-white placeholder-gray-500"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="bg-[#0A1524] border-[#1A304A] text-white">
              <SelectValue placeholder="Filter by Region" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1524] border-[#1A304A] text-white">
              <SelectItem value="ALL">All Regions</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
              <SelectItem value="INTL">INTL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="bg-[#0A1524] border-[#1A304A] text-white">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1524] border-[#1A304A] text-white">
              <SelectItem value="ALL">All Types</SelectItem>
              {stockTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {filteredStocks.length} stocks
        {regionFilter !== 'ALL' && ` in ${regionFilter}`}
        {typeFilter !== 'ALL' && ` of type ${typeFilter}`}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>
      
      {/* Stocks Table */}
      <div className="rounded-sm border border-[#1A304A] bg-[#0A1524] overflow-hidden">
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#111E2E]">
              <TableRow className="border-b border-[#1A304A] hover:bg-[#162639]">
                <TableHead 
                  className="text-[#7A8999] font-mono text-xs"
                  onClick={() => handleSort('symbol')}
                >
                  <div className="flex items-center cursor-pointer">
                    SYMBOL
                    <ArrowUpDown className={cn(
                      "ml-1 h-3 w-3",
                      sortConfig.key === 'symbol' && (
                        sortConfig.direction === 'asc' 
                          ? "text-blue-400 rotate-0" 
                          : "text-blue-400 rotate-180"
                      )
                    )} />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-[#7A8999] font-mono text-xs"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center cursor-pointer">
                    COMPANY
                    <ArrowUpDown className={cn(
                      "ml-1 h-3 w-3",
                      sortConfig.key === 'company' && (
                        sortConfig.direction === 'asc' 
                          ? "text-blue-400 rotate-0" 
                          : "text-blue-400 rotate-180"
                      )
                    )} />
                  </div>
                </TableHead>
                <TableHead className="text-[#7A8999] font-mono text-xs">REGION</TableHead>
                <TableHead className="text-[#7A8999] font-mono text-xs">TYPE</TableHead>
                <TableHead className="text-[#7A8999] font-mono text-xs">RATING</TableHead>
                <TableHead 
                  className="text-[#7A8999] font-mono text-xs"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center cursor-pointer">
                    PRICE
                    <ArrowUpDown className={cn(
                      "ml-1 h-3 w-3",
                      sortConfig.key === 'price' && (
                        sortConfig.direction === 'asc' 
                          ? "text-blue-400 rotate-0" 
                          : "text-blue-400 rotate-180"
                      )
                    )} />
                  </div>
                </TableHead>
                <TableHead className="text-[#7A8999] font-mono text-xs">NEXT EARNINGS</TableHead>
                <TableHead className="text-[#7A8999] font-mono text-xs">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-[#1A304A] hover:bg-[#162639]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j} className="p-2">
                        <Skeleton className="h-4 w-full bg-[#162639]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-400">
                    No stocks found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredStocks.map((stock) => (
                  <TableRow key={`${stock.symbol}-${stock.region}`} className="border-b border-[#1A304A] hover:bg-[#162639]">
                    <TableCell className="font-mono text-white font-medium">
                      {stock.symbol}
                    </TableCell>
                    <TableCell className="text-gray-200 max-w-[300px] truncate">
                      {stock.company}
                    </TableCell>
                    <TableCell className="text-gray-200">
                      <span className="inline-block px-2 py-1 rounded-sm text-[10px] font-mono font-medium bg-gray-800 text-white">
                        {stock.region}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 rounded-sm text-[10px] font-mono font-medium ${getStockTypeBackground(stock.stockType)}`}>
                        {stock.stockType || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block min-w-[1.5rem] px-1.5 py-1 rounded text-center text-[10px] font-mono font-medium ${getRatingClass(stock.stockRating)}`}>
                        {stock.stockRating || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-gray-200">
                      {getCurrencySymbol(stock.region)}{parseFloat(stock.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-200 text-xs font-mono">
                      {stock.nextEarningsDate || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewStockDetails(stock.symbol, stock.region)}
                        className="rounded-sm h-7 text-[10px] bg-[#0B1728] text-[#7A8999] font-mono border-[#1A304A] hover:bg-[#162639] hover:text-[#EFEFEF]"
                      >
                        VIEW
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
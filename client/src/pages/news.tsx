import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NewsArticle, PortfolioStock } from "../lib/types";
import { Loader2, Calendar, MessageSquare, ExternalLink } from "lucide-react";

export default function NewsPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("USD");
  const [selectedStock, setSelectedStock] = useState<string>("all_stocks");
  const [selectedSector, setSelectedSector] = useState<string>("all_sectors");
  const [days, setDays] = useState<number>(7);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch portfolio stocks
  const { data: portfolioStocks, isLoading: isLoadingStocks } = useQuery({
    queryKey: ['/api/portfolios', selectedRegion, 'stocks'],
    queryFn: async () => {
      const response = await fetch(`/api/portfolios/${selectedRegion}/stocks`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio stocks');
      }
      return response.json();
    },
    enabled: !!selectedRegion
  });

  // Fetch news for the selected region
  const { data: newsData, isLoading: isLoadingNews } = useQuery({
    queryKey: ['/api/news/portfolio', selectedRegion, days],
    queryFn: async () => {
      const response = await fetch(`/api/news/portfolio?region=${selectedRegion}&days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      return response.json();
    },
    enabled: !!selectedRegion,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Get unique sectors from portfolio
  const sectors = portfolioStocks 
    ? [...new Set(portfolioStocks.map((stock: PortfolioStock) => stock.sector).filter(Boolean))]
    : [];
    
  // Filter news based on selected stock, sector, and search query
  const filteredNews = newsData?.data?.filter((article: NewsArticle) => {
    // Filter by stock if one is selected
    if (selectedStock && selectedStock !== "all_stocks" && article.symbol !== selectedStock) {
      return false;
    }
    
    // Filter by sector if one is selected
    if (selectedSector && selectedSector !== "all_sectors") {
      const stockWithSector = portfolioStocks?.find((stock: PortfolioStock) => 
        stock.symbol === article.symbol && stock.sector === selectedSector
      );
      if (!stockWithSector) {
        return false;
      }
    }
    
    // Filter by search query if provided
    if (searchQuery) {
      return article.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return true;
  }) || [];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="px-6 py-4 w-full max-w-[1600px] mx-auto">
      <div className="flex items-center mb-4 border-b border-[#1A3056] pb-1">
        <h1 className="text-2xl font-mono font-bold text-white tracking-tight">MARKET NEWS</h1>
      </div>
      
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-[#091524] p-4 border border-[#1A3056] rounded-sm">
        <div>
          <Label htmlFor="region" className="text-[#7A8999] text-xs font-mono pb-1 block">PORTFOLIO REGION</Label>
          <Select
            value={selectedRegion}
            onValueChange={setSelectedRegion}
          >
            <SelectTrigger id="region" className="bg-[#0A1929] border-[#1A304A] h-9 text-xs font-mono">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A]">
              <SelectGroup>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="INTL">INTL</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="stock" className="text-[#7A8999] text-xs font-mono pb-1 block">STOCK SYMBOL</Label>
          <Select
            value={selectedStock}
            onValueChange={setSelectedStock}
          >
            <SelectTrigger id="stock" className="bg-[#0A1929] border-[#1A304A] h-9 text-xs font-mono">
              <SelectValue placeholder="All Stocks" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A] max-h-[300px]">
              <SelectGroup>
                <SelectItem value="all_stocks">All Stocks</SelectItem>
                {portfolioStocks && portfolioStocks.map((stock: PortfolioStock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.company}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="sector" className="text-[#7A8999] text-xs font-mono pb-1 block">SECTOR</Label>
          <Select
            value={selectedSector}
            onValueChange={setSelectedSector}
          >
            <SelectTrigger id="sector" className="bg-[#0A1929] border-[#1A304A] h-9 text-xs font-mono">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A]">
              <SelectGroup>
                <SelectItem value="all_sectors">All Sectors</SelectItem>
                {sectors.map((sector: string) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="days" className="text-[#7A8999] text-xs font-mono pb-1 block">PAST DAYS</Label>
          <Select
            value={days.toString()}
            onValueChange={(value) => setDays(parseInt(value))}
          >
            <SelectTrigger id="days" className="bg-[#0A1929] border-[#1A304A] h-9 text-xs font-mono">
              <SelectValue placeholder="7 Days" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A]">
              <SelectGroup>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="search" className="text-[#7A8999] text-xs font-mono pb-1 block">SEARCH NEWS</Label>
          <Input
            id="search"
            className="bg-[#0A1929] border-[#1A304A] h-9 text-xs font-mono"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* News List */}
      <div className="space-y-4">
        {isLoadingNews || isLoadingStocks ? (
          <div className="flex justify-center items-center h-64 bg-[#091524] border border-[#1A3056]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-[#7A8999] font-mono">LOADING NEWS DATA...</span>
          </div>
        ) : filteredNews.length > 0 ? (
          filteredNews.map((article: NewsArticle) => (
            <Card 
              key={article.id} 
              className="border border-[#1A3056] bg-[#091524] shadow-md overflow-hidden"
            >
              <CardHeader className="p-4 flex flex-row items-start gap-4 pb-2">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="bg-blue-600 text-xs px-2 py-0.5 rounded font-mono tracking-tight">
                      {article.symbol || "NEWS"}
                    </span>
                    {article.sector && (
                      <span className="bg-[#1A304A] ml-2 text-xs px-2 py-0.5 rounded font-mono tracking-tight">
                        {article.sector}
                      </span>
                    )}
                    <div className="flex items-center ml-auto text-[10px] text-[#7A8999] font-mono">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(article.publishOn)}
                    </div>
                  </div>
                  <h3 className="text-sm font-mono text-[#E0E0E0] hover:text-blue-400">
                    <a 
                      href={`https://seekingalpha.com${article.link}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      {article.title}
                      <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                    </a>
                  </h3>
                </div>
                {article.imageUrl && (
                  <div className="w-16 h-16 rounded overflow-hidden hidden sm:block flex-shrink-0">
                    <img
                      src={article.imageUrl}
                      alt="News thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center text-[10px] text-[#7A8999] font-mono">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>{article.commentCount} comments</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex justify-center items-center h-32 bg-[#091524] border border-[#1A3056] rounded-sm">
            <div className="text-[#7A8999] font-mono text-xs">NO NEWS FOUND FOR THE SELECTED FILTERS</div>
          </div>
        )}
      </div>
    </div>
  );
}
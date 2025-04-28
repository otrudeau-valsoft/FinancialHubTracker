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
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [selectedSector, setSelectedSector] = useState<string>("");
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
    if (selectedStock && article.symbol !== selectedStock) {
      return false;
    }
    
    // Filter by sector if one is selected
    if (selectedSector) {
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
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#E0E0E0] mb-6">Market News</h1>
      
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div>
          <Label htmlFor="region" className="text-[#A0A0A0]">Portfolio Region</Label>
          <Select
            value={selectedRegion}
            onValueChange={setSelectedRegion}
          >
            <SelectTrigger id="region" className="bg-[#0A1929] border-[#1A304A]">
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
          <Label htmlFor="stock" className="text-[#A0A0A0]">Stock Symbol</Label>
          <Select
            value={selectedStock}
            onValueChange={setSelectedStock}
          >
            <SelectTrigger id="stock" className="bg-[#0A1929] border-[#1A304A]">
              <SelectValue placeholder="All Stocks" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A] max-h-[300px]">
              <SelectGroup>
                <SelectItem value="">All Stocks</SelectItem>
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
          <Label htmlFor="sector" className="text-[#A0A0A0]">Sector</Label>
          <Select
            value={selectedSector}
            onValueChange={setSelectedSector}
          >
            <SelectTrigger id="sector" className="bg-[#0A1929] border-[#1A304A]">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent className="bg-[#0A1929] border-[#1A304A]">
              <SelectGroup>
                <SelectItem value="">All Sectors</SelectItem>
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
          <Label htmlFor="days" className="text-[#A0A0A0]">Past Days</Label>
          <Select
            value={days.toString()}
            onValueChange={(value) => setDays(parseInt(value))}
          >
            <SelectTrigger id="days" className="bg-[#0A1929] border-[#1A304A]">
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
          <Label htmlFor="search" className="text-[#A0A0A0]">Search News</Label>
          <Input
            id="search"
            className="bg-[#0A1929] border-[#1A304A]"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* News List */}
      <div className="space-y-4">
        {isLoadingNews || isLoadingStocks ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-[#7A8999] font-mono">LOADING NEWS DATA...</span>
          </div>
        ) : filteredNews.length > 0 ? (
          filteredNews.map((article: NewsArticle) => (
            <Card 
              key={article.id} 
              className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md"
            >
              <CardHeader className="p-4 flex flex-row items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="bg-blue-600 text-xs px-2 py-1 rounded font-mono">
                      {article.symbol || "NEWS"}
                    </span>
                    {article.sector && (
                      <span className="bg-[#1A304A] ml-2 text-xs px-2 py-1 rounded font-mono">
                        {article.sector}
                      </span>
                    )}
                    <div className="flex items-center ml-auto text-[10px] sm:text-xs text-[#7A8999]">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(article.publishOn)}
                    </div>
                  </div>
                  <h3 className="text-md font-semibold text-[#E0E0E0] hover:text-blue-400">
                    <a 
                      href={`https://seekingalpha.com${article.link}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      {article.title}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </h3>
                </div>
                {article.imageUrl && (
                  <div className="w-16 h-16 rounded overflow-hidden hidden sm:block">
                    <img
                      src={article.imageUrl}
                      alt="News thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center text-[10px] sm:text-xs text-[#7A8999]">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  <span>{article.commentCount} comments</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-8 bg-[#0A1524] border border-[#1A304A]">
            <div className="text-[#7A8999] font-mono">NO NEWS FOUND FOR THE SELECTED FILTERS</div>
          </div>
        )}
      </div>
    </div>
  );
}
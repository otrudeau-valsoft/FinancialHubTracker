import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Info } from "lucide-react";

interface EtfHolding {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  assetClass: string | null;
  marketValue: number | null;
  weight: number | null;
  price: number | null;
  quantity: number | null;
  location: string | null;
  exchange: string | null;
  currency: string | null;
}

export default function EtfHoldings() {
  const [activeEtf, setActiveEtf] = useState<string>("SPY");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch ETF holdings
  const { data: spyHoldings, isLoading: spyLoading } = useQuery({
    queryKey: ["/api/etfs/SPY/holdings"],
    staleTime: 3600000, // 1 hour
  });

  const { data: xicHoldings, isLoading: xicLoading } = useQuery({
    queryKey: ["/api/etfs/XIC/holdings"],
    staleTime: 3600000, // 1 hour
  });

  const { data: acwxHoldings, isLoading: acwxLoading } = useQuery({
    queryKey: ["/api/etfs/ACWX/holdings"],
    staleTime: 3600000, // 1 hour
  });

  // Determine which holdings to display based on activeEtf
  const displayHoldings = (() => {
    if (activeEtf === "SPY") return spyHoldings || [];
    if (activeEtf === "XIC") return xicHoldings || [];
    if (activeEtf === "ACWX") return acwxHoldings || [];
    return [];
  })();

  // Filter holdings based on search term
  const filteredHoldings = displayHoldings.filter((holding: EtfHolding) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      holding.ticker?.toLowerCase().includes(term) ||
      holding.name?.toLowerCase().includes(term) ||
      holding.sector?.toLowerCase().includes(term)
    );
  });

  // Loading states
  const isLoading = (() => {
    if (activeEtf === "SPY") return spyLoading;
    if (activeEtf === "XIC") return xicLoading;
    if (activeEtf === "ACWX") return acwxLoading;
    return false;
  })();

  // Currency symbol based on ETF
  const currencySymbol = (() => {
    if (activeEtf === "SPY") return "$";
    if (activeEtf === "XIC") return "C$";
    if (activeEtf === "ACWX") return "$";
    return "$";
  })();

  // Determine ETF description
  const etfDescription = (() => {
    if (activeEtf === "SPY") return "S&P 500 ETF (US Large Cap)";
    if (activeEtf === "XIC") return "S&P/TSX Composite Index ETF (Canada)";
    if (activeEtf === "ACWX") return "MSCI ACWI ex US ETF (International)";
    return "";
  })();

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">ETF HOLDINGS VIEWER</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#38AAFD]"></div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeEtf}
        onValueChange={setActiveEtf}
        className="mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <TabsList className="h-9 bg-[#111E2E] border border-[#1A304A]">
            <TabsTrigger 
              value="SPY" 
              className="data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-white"
            >
              SPY
            </TabsTrigger>
            <TabsTrigger 
              value="XIC" 
              className="data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-white"
            >
              XIC
            </TabsTrigger>
            <TabsTrigger 
              value="ACWX" 
              className="data-[state=active]:bg-[#0A7AFF] data-[state=active]:text-white"
            >
              ACWX
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by ticker, name, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B1728] border border-[#1A304A] text-[#EFEFEF] text-sm rounded-md px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-[#38AAFD] focus:border-[#38AAFD]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#7A8999] hover:text-[#EFEFEF]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="py-2 px-3 rounded-md bg-[#0A1929]/80 border border-[#1A304A] mb-4">
          <div className="flex items-center gap-2 text-xs">
            <BarChart3 size={14} className="text-[#38AAFD]" />
            <div className="text-[#EFEFEF] font-mono">
              {activeEtf} - {etfDescription}
            </div>
            <div className="ml-auto text-[#7A8999] font-mono">
              {filteredHoldings.length} holdings
            </div>
          </div>
        </div>

        <Card className="mb-6 border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
          <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
            <div className="w-full flex items-center justify-between">
              <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">ETF HOLDINGS</h3>
              <div className="h-1 w-8 bg-[#38AAFD]"></div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto p-0">
            <table className="w-full border-collapse">
              <thead>
                <tr key="header" className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                  <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TICKER</th>
                  <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NAME</th>
                  <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SECTOR</th>
                  <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">WEIGHT</th>
                  <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">PRICE</th>
                  <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">QUANTITY</th>
                  <th scope="col" className="hidden md:table-cell px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">LOCATION</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-2 sm:px-3 py-4 text-center text-[#7A8999]">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-6 h-6 border-2 border-t-[#0A7AFF] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2"></div>
                        <div>Loading ETF holdings...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 sm:px-3 py-4 text-center text-[#7A8999]">
                      {searchTerm ? (
                        <div>No holdings match your search criteria.</div>
                      ) : (
                        <div>No holdings available for this ETF.</div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredHoldings.map((holding: EtfHolding) => (
                    <tr key={holding.id} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                      <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#38AAFD] text-xs font-medium whitespace-nowrap">{holding.ticker}</td>
                      <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap overflow-hidden" style={{ maxWidth: '150px', textOverflow: 'ellipsis' }}>{holding.name}</td>
                      <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] text-xs whitespace-nowrap">{holding.sector || 'N/A'}</td>
                      <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                        {holding.weight !== null && holding.weight !== undefined
                          ? `${Number(holding.weight).toFixed(2)}%`
                          : 'N/A'}
                      </td>
                      <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                        {holding.price !== null && holding.price !== undefined
                          ? `${currencySymbol}${Number(holding.price).toFixed(2)}`
                          : 'N/A'}
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">
                        {holding.quantity !== null && holding.quantity !== undefined
                          ? Number(holding.quantity).toLocaleString()
                          : 'N/A'}
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] text-xs whitespace-nowrap">
                        {holding.location || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </Tabs>
    </div>
  );
}
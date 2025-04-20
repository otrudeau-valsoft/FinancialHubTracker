import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, DownloadCloud, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { parseCSV, convertAcwxHoldings, convertXicHoldings } from "@/lib/parse-csv";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/financial";

interface EtfHolding {
  id: number;
  etfSymbol: string;
  ticker: string;
  name: string;
  sector: string;
  assetClass: string;
  marketValue: number;
  weight: number;
  quantity: number;
  price: number;
  location: string;
  exchange: string;
  currency: string;
  fxRate: number;
  marketCurrency: string;
}

export default function EtfHoldings() {
  const [activeTab, setActiveTab] = useState("spy");
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = React.createRef<HTMLInputElement>();

  // Fetch ETF holdings
  const { data: spyHoldings, isLoading: spyLoading, refetch: refetchSpyHoldings } = useQuery({
    queryKey: ['/api/etfs/SPY/holdings'],
    staleTime: 3600000, // 1 hour
  });

  const { data: xicHoldings, isLoading: xicLoading, refetch: refetchXicHoldings } = useQuery({
    queryKey: ['/api/etfs/XIC/holdings'],
    staleTime: 3600000, // 1 hour
  });

  const { data: acwxHoldings, isLoading: acwxLoading, refetch: refetchAcwxHoldings } = useQuery({
    queryKey: ['/api/etfs/ACWX/holdings'],
    staleTime: 3600000, // 1 hour
  });

  // Import ETF holdings from CSV
  const handleImportData = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          let formattedData;
          let etfSymbol = '';
          
          // Detect which ETF data is being imported based on file content or activeTab
          if (csvData.includes('ACWX') || activeTab === 'acwx') {
            formattedData = convertAcwxHoldings(parsed.data);
            etfSymbol = 'ACWX';
          } else if (csvData.includes('XIC') || activeTab === 'xic') {
            formattedData = convertXicHoldings(parsed.data);
            etfSymbol = 'XIC';
          } else {
            // Default to SPY or let user choose
            const confirmation = confirm("ETF type not detected. Import as SPY holdings?");
            if (confirmation) {
              etfSymbol = 'SPY';
              formattedData = parsed.data.map(row => ({
                etfSymbol: 'SPY',
                ...row
              }));
            } else {
              alert("Import cancelled.");
              return;
            }
          }
          
          // Send the formatted data to the server
          await apiRequest('POST', `/api/etfs/${etfSymbol}/holdings/bulk`, {
            holdings: formattedData
          });
          
          // Refetch data
          if (etfSymbol === 'SPY') refetchSpyHoldings();
          else if (etfSymbol === 'XIC') refetchXicHoldings();
          else if (etfSymbol === 'ACWX') refetchAcwxHoldings();
          
          alert(`Successfully imported ${formattedData.length} holdings for ${etfSymbol} ETF`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };

  // Filter holdings based on search term
  const filterHoldings = (holdings: EtfHolding[] | undefined) => {
    if (!holdings) return [];
    if (!searchTerm) return holdings;
    
    return holdings.filter(holding => 
      holding.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredSpyHoldings = filterHoldings(spyHoldings);
  const filteredXicHoldings = filterHoldings(xicHoldings);
  const filteredAcwxHoldings = filterHoldings(acwxHoldings);

  // Group holdings by sector for sector breakdown
  const getSectorBreakdown = (holdings: EtfHolding[] | undefined) => {
    if (!holdings || holdings.length === 0) return [];
    
    const sectors: {[key: string]: number} = {};
    
    holdings.forEach(holding => {
      const sector = holding.sector || 'Unknown';
      sectors[sector] = (sectors[sector] || 0) + (holding.weight || 0);
    });
    
    return Object.entries(sectors)
      .map(([sector, weight]) => ({ sector, weight }))
      .sort((a, b) => b.weight - a.weight);
  };

  const spySectorBreakdown = getSectorBreakdown(spyHoldings);
  const xicSectorBreakdown = getSectorBreakdown(xicHoldings);
  const acwxSectorBreakdown = getSectorBreakdown(acwxHoldings);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">ETF Holdings Analysis</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import ETF Data
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData(e.target.files[0])} 
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            Compare your portfolio to benchmark ETFs to identify allocation differences and potential opportunities.
            The system tracks SPY (S&P 500), XIC (Canadian Market), and ACWX (International) ETF holdings.
          </p>
        </div>
        
        <div className="flex items-center mb-4 gap-2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by ticker, name, or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md"
          />
        </div>
        
        <Tabs defaultValue="spy" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="spy">SPY (S&P 500)</TabsTrigger>
            <TabsTrigger value="xic">XIC (Canada)</TabsTrigger>
            <TabsTrigger value="acwx">ACWX (International)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="spy">
            {spyLoading ? (
              <div className="text-center p-8">Loading SPY holdings data...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="lg:col-span-3">
                  <Card className="bg-card">
                    <CardHeader className="card-header flex justify-between items-center">
                      <h3>SPY Holdings ({filteredSpyHoldings?.length || 0} of {spyHoldings?.length || 0})</h3>
                      <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleDateString()}</div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800 data-table">
                        <thead>
                          <tr>
                            <th scope="col">Ticker</th>
                            <th scope="col">Name</th>
                            <th scope="col">Sector</th>
                            <th scope="col">Weight (%)</th>
                            <th scope="col">Price ($)</th>
                            <th scope="col">Market Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-xs mono">
                          {filteredSpyHoldings?.length > 0 ? (
                            filteredSpyHoldings.map(holding => (
                              <tr key={holding.id}>
                                <td>{holding.ticker}</td>
                                <td>{holding.name}</td>
                                <td>{holding.sector}</td>
                                <td>{holding.weight?.toFixed(2)}%</td>
                                <td>{formatCurrency(holding.price, '$')}</td>
                                <td>{formatCurrency(holding.marketValue, '$')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center p-4">
                                {searchTerm ? "No holdings match your search criteria." : "No holdings data available. Import data to get started."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
                <div>
                  <Card className="bg-card">
                    <CardHeader className="card-header">
                      <h3>Sector Breakdown</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {spySectorBreakdown.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: `hsl(${index * 25}, 70%, 50%)` }}
                              ></div>
                              <span className="text-xs">{item.sector}</span>
                            </div>
                            <span className="text-xs font-mono">{item.weight.toFixed(2)}%</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="w-full bg-gray-800 h-6 rounded-full overflow-hidden mt-4">
                        <div className="flex h-full">
                          {spySectorBreakdown.map((item, index) => (
                            <div 
                              key={index}
                              style={{ 
                                width: `${item.weight}%`, 
                                backgroundColor: `hsl(${index * 25}, 70%, 50%)` 
                              }} 
                              className="h-full"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="xic">
            {xicLoading ? (
              <div className="text-center p-8">Loading XIC holdings data...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="lg:col-span-3">
                  <Card className="bg-card">
                    <CardHeader className="card-header flex justify-between items-center">
                      <h3>XIC Holdings ({filteredXicHoldings?.length || 0} of {xicHoldings?.length || 0})</h3>
                      <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleDateString()}</div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800 data-table">
                        <thead>
                          <tr>
                            <th scope="col">Ticker</th>
                            <th scope="col">Name</th>
                            <th scope="col">Sector</th>
                            <th scope="col">Weight (%)</th>
                            <th scope="col">Price (C$)</th>
                            <th scope="col">Market Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-xs mono">
                          {filteredXicHoldings?.length > 0 ? (
                            filteredXicHoldings.map(holding => (
                              <tr key={holding.id}>
                                <td>{holding.ticker}</td>
                                <td>{holding.name}</td>
                                <td>{holding.sector}</td>
                                <td>{holding.weight?.toFixed(2)}%</td>
                                <td>{formatCurrency(holding.price, 'C$')}</td>
                                <td>{formatCurrency(holding.marketValue, 'C$')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center p-4">
                                {searchTerm ? "No holdings match your search criteria." : "No holdings data available. Import data to get started."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
                <div>
                  <Card className="bg-card">
                    <CardHeader className="card-header">
                      <h3>Sector Breakdown</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {xicSectorBreakdown.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: `hsl(${index * 25}, 70%, 50%)` }}
                              ></div>
                              <span className="text-xs">{item.sector}</span>
                            </div>
                            <span className="text-xs font-mono">{item.weight.toFixed(2)}%</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="w-full bg-gray-800 h-6 rounded-full overflow-hidden mt-4">
                        <div className="flex h-full">
                          {xicSectorBreakdown.map((item, index) => (
                            <div 
                              key={index}
                              style={{ 
                                width: `${item.weight}%`, 
                                backgroundColor: `hsl(${index * 25}, 70%, 50%)` 
                              }} 
                              className="h-full"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="acwx">
            {acwxLoading ? (
              <div className="text-center p-8">Loading ACWX holdings data...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                <div className="lg:col-span-3">
                  <Card className="bg-card">
                    <CardHeader className="card-header flex justify-between items-center">
                      <h3>ACWX Holdings ({filteredAcwxHoldings?.length || 0} of {acwxHoldings?.length || 0})</h3>
                      <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleDateString()}</div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800 data-table">
                        <thead>
                          <tr>
                            <th scope="col">Ticker</th>
                            <th scope="col">Name</th>
                            <th scope="col">Sector</th>
                            <th scope="col">Weight (%)</th>
                            <th scope="col">Price ($)</th>
                            <th scope="col">Market Value</th>
                            <th scope="col">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-xs mono">
                          {filteredAcwxHoldings?.length > 0 ? (
                            filteredAcwxHoldings.map(holding => (
                              <tr key={holding.id}>
                                <td>{holding.ticker}</td>
                                <td>{holding.name}</td>
                                <td>{holding.sector}</td>
                                <td>{holding.weight?.toFixed(2)}%</td>
                                <td>{formatCurrency(holding.price, holding.currency)}</td>
                                <td>{formatCurrency(holding.marketValue, 'USD')}</td>
                                <td>{holding.location}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center p-4">
                                {searchTerm ? "No holdings match your search criteria." : "No holdings data available. Import data to get started."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
                <div>
                  <Card className="bg-card">
                    <CardHeader className="card-header">
                      <h3>Sector Breakdown</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {acwxSectorBreakdown.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2" 
                                style={{ backgroundColor: `hsl(${index * 25}, 70%, 50%)` }}
                              ></div>
                              <span className="text-xs">{item.sector}</span>
                            </div>
                            <span className="text-xs font-mono">{item.weight.toFixed(2)}%</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="w-full bg-gray-800 h-6 rounded-full overflow-hidden mt-4">
                        <div className="flex h-full">
                          {acwxSectorBreakdown.map((item, index) => (
                            <div 
                              key={index}
                              style={{ 
                                width: `${item.weight}%`, 
                                backgroundColor: `hsl(${index * 25}, 70%, 50%)` 
                              }} 
                              className="h-full"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

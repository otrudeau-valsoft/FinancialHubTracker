import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface EtfHolding {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  price: number;
  marketValue: number;
  location?: string;
  currency?: string;
}

interface EtfHoldingsTableProps {
  holdings: EtfHolding[];
  etfSymbol: string;
  currencySymbol?: string;
  showLocation?: boolean;
  isLoading?: boolean;
}

export const EtfHoldingsTable = ({
  holdings,
  etfSymbol,
  currencySymbol = '$',
  showLocation = false,
  isLoading = false
}: EtfHoldingsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter holdings based on search
  const filteredHoldings = searchTerm 
    ? holdings.filter(holding => 
        holding.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holding.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holding.sector.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : holdings;
  
  return (
    <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">
            {etfSymbol} HOLDINGS ({filteredHoldings.length} of {holdings.length})
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-6 w-36 sm:w-48 text-[10px] pl-7 pr-2 py-1 bg-[#0D1C30] border-[#1A304A]"
              />
            </div>
            <div className="h-1 w-8 bg-[#38AAFD]"></div>
          </div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 data-table">
          <thead>
            <tr>
              <th scope="col">Ticker</th>
              <th scope="col">Name</th>
              <th scope="col">Sector</th>
              <th scope="col">Weight (%)</th>
              <th scope="col">Price</th>
              <th scope="col">Market Value</th>
              {showLocation && <th scope="col">Location</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-xs mono">
            {isLoading ? (
              <tr>
                <td colSpan={showLocation ? 7 : 6} className="text-center p-4">
                  Loading holdings data...
                </td>
              </tr>
            ) : filteredHoldings.length > 0 ? (
              filteredHoldings.map(holding => (
                <tr key={holding.id}>
                  <td>{holding.ticker}</td>
                  <td>{holding.name}</td>
                  <td>{holding.sector}</td>
                  <td>{typeof holding.weight === 'number' ? holding.weight.toFixed(2) : parseFloat(String(holding.weight)).toFixed(2)}%</td>
                  <td>{formatCurrency(holding.price, holding.currency || currencySymbol)}</td>
                  <td>{formatCurrency(holding.marketValue, currencySymbol)}</td>
                  {showLocation && <td>{holding.location || '-'}</td>}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showLocation ? 7 : 6} className="text-center p-4">
                  {searchTerm ? "No holdings match your search criteria." : "No holdings data available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

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
    <Card className="bg-card">
      <CardHeader className="card-header flex justify-between items-center">
        <h3>{etfSymbol} Holdings ({filteredHoldings.length} of {holdings.length})</h3>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search holdings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-64"
          />
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
                  <td>{holding.weight?.toFixed(2)}%</td>
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

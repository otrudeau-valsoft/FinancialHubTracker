import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getProfitLossClass } from "@/lib/financial";
import { BarChart2 } from "lucide-react";

interface EtfHolding {
  id: number;
  ticker: string;
  name: string;
  sector: string;
  weight: number;
  price: number;
  inPortfolio: boolean;
  weightDifference: number;
}

interface EtfComparisonProps {
  holdings: EtfHolding[];
  etfSymbol: string;
  limit?: number;
  region: 'USD' | 'CAD' | 'INTL';
}

export const EtfComparison = ({ 
  holdings, 
  etfSymbol,
  limit = 10,
  region
}: EtfComparisonProps) => {
  const displayHoldings = holdings.slice(0, limit);
  const currencySymbol = region === 'USD' ? '$' : region === 'CAD' ? 'C$' : '$';
  
  return (
    <Card className="mb-6 border-0 shadow bg-[#0A1929]">
      <CardHeader className="card-header flex flex-col px-4 py-3 bg-[#111E2E]">
        <div className="flex items-center">
          <BarChart2 className="h-5 w-5 mr-2 text-[#38AAFD]" />
          <h3 className="text-left font-mono text-[#EFEFEF]">ETF BENCHMARK COMPARISON</h3>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <div className="h-1 w-12 bg-[#38AAFD]"></div>
        </div>
      </CardHeader>
      <div className="overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-gray-800 data-table">
          <thead>
            <tr>
              <th scope="col" className="px-3 py-2">Symbol</th>
              <th scope="col" className="px-3 py-2">Name</th>
              <th scope="col" className="px-3 py-2">Sector</th>
              <th scope="col" className="px-3 py-2">Weight</th>
              <th scope="col" className="px-3 py-2">Price</th>
              <th scope="col" className="px-3 py-2">Portfolio Status</th>
              <th scope="col" className="px-3 py-2">Overweight/Underweight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-xs mono">
            {displayHoldings.map((holding) => (
              <tr key={holding.id}>
                <td className="px-3 py-2 font-medium text-secondary">{holding.ticker}</td>
                <td className="px-3 py-2">{holding.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{holding.sector || 'N/A'}</td>
                <td className="px-3 py-2">
                  {holding.weight !== null && holding.weight !== undefined
                    ? `${Number(holding.weight).toFixed(2)}%`
                    : 'N/A'}
                </td>
                <td className="px-3 py-2">
                  {holding.price 
                    ? formatCurrency(holding.price, currencySymbol)
                    : 'N/A'}
                </td>
                <td className="px-3 py-2">
                  <Badge 
                    variant={holding.inPortfolio ? "default" : "outline"} 
                    className={`font-normal px-2.5 py-1 whitespace-nowrap ${
                      holding.inPortfolio 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'text-gray-400 border-gray-700'
                    }`}
                  >
                    {holding.inPortfolio ? 'In Portfolio' : 'Not Held'}
                  </Badge>
                </td>
                <td className={`px-3 py-2 ${holding.weightDifference !== undefined ? getProfitLossClass(holding.weightDifference) : ''}`}>
                  {holding.weightDifference !== undefined && holding.weightDifference !== null
                    ? `${holding.weightDifference > 0 ? '+' : ''}${Number(holding.weightDifference).toFixed(2)}%` 
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

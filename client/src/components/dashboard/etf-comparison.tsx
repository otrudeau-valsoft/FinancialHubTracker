import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getProfitLossClass } from "@/lib/financial";

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
    <Card className="bg-card mb-6">
      <CardHeader className="card-header">
        <h3>ETF Benchmark - {etfSymbol} Top {limit} Holdings</h3>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 data-table">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Name</th>
              <th scope="col">Sector</th>
              <th scope="col">Weight</th>
              <th scope="col">Price</th>
              <th scope="col">Portfolio Status</th>
              <th scope="col">Overweight/Underweight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-xs mono">
            {displayHoldings.map((holding) => (
              <tr key={holding.id}>
                <td>{holding.ticker}</td>
                <td>{holding.name}</td>
                <td>{holding.sector}</td>
                <td>{holding.weight?.toFixed(2)}%</td>
                <td>{formatCurrency(holding.price, currencySymbol)}</td>
                <td>
                  <Badge variant={holding.inPortfolio ? "secondary" : "outline"}>
                    {holding.inPortfolio ? 'In Portfolio' : 'Not Held'}
                  </Badge>
                </td>
                <td className={holding.weightDifference !== undefined ? getProfitLossClass(holding.weightDifference) : ''}>
                  {holding.weightDifference !== undefined 
                    ? `${holding.weightDifference > 0 ? '+' : ''}${holding.weightDifference.toFixed(2)}%` 
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

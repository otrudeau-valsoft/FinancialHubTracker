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
    <Card className="mb-6 border-0 shadow bg-[#0A1929] rounded-none border border-[#1A304A]">
      <CardHeader className="card-header px-3 py-2 sm:px-4 sm:py-3 bg-[#0D1C30] border-b border-[#1A304A]">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#38AAFD]" />
            <h3 className="text-left font-mono text-[#EFEFEF] text-xs sm:text-sm">ETF BENCHMARK COMPARISON</h3>
          </div>
          <Badge className="bg-[#38AAFD]/20 text-[#38AAFD] px-2 py-0.5 text-[10px] sm:text-xs font-mono rounded-sm">
            {etfSymbol}
          </Badge>
        </div>
      </CardHeader>
      <div className="overflow-x-auto p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
              <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SYMBOL</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NAME</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SECTOR</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">WEIGHT</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">PRICE</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">STATUS</th>
              <th scope="col" className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">DIFF</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {displayHoldings.map((holding) => (
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
                  {holding.price 
                    ? formatCurrency(holding.price, currencySymbol)
                    : 'N/A'}
                </td>
                <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                  <span className={`inline-block font-mono px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium ${
                    holding.inPortfolio 
                      ? 'bg-[#38AAFD]/20 text-[#38AAFD]' 
                      : 'bg-[#1A304A]/30 text-[#7A8999]'
                  }`}>
                    {holding.inPortfolio ? 'In Portfolio' : 'Not Held'}
                  </span>
                </td>
                <td className="px-2 sm:px-3 py-0 text-right font-mono text-xs whitespace-nowrap">
                  <span className={`${holding.weightDifference > 0 ? 'text-[#4CAF50]' : 'text-[#F44336]'}`}>
                    {holding.weightDifference !== undefined && holding.weightDifference !== null
                      ? `${holding.weightDifference > 0 ? '+' : ''}${Number(holding.weightDifference).toFixed(2)}%` 
                      : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

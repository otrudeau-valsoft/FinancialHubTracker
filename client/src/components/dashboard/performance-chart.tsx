import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface PerformanceChartProps {
  portfolioData: Array<{
    date: string;
    portfolioValue: number;
    benchmarkValue: number;
  }>;
  timeRanges: string[];
  benchmark: string;
}

export const PerformanceChart = ({ 
  portfolioData,
  timeRanges = ["1W", "1M", "YTD", "1Y"],
  benchmark = "SPY"
}: PerformanceChartProps) => {
  const [selectedRange, setSelectedRange] = useState("YTD");
  
  // Format the data specifically for the selected time range
  const filteredData = portfolioData.slice(-getTimeRangeLength(selectedRange));
  
  // Convert absolute values to percentage changes
  const percentageData = calculatePercentageChanges(filteredData);
  
  function getTimeRangeLength(range: string): number {
    switch (range) {
      case "1W": return 7;
      case "1M": return 30;
      case "YTD": 
        // Get days from Jan 1 to today
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      case "1Y": return 365;
      default: return 30;
    }
  }
  
  function calculatePercentageChanges(data: any[]): any[] {
    if (!data.length) return [];
    
    const baselinePortfolio = data[0].portfolioValue;
    const baselineBenchmark = data[0].benchmarkValue;
    
    return data.map(point => ({
      date: point.date,
      portfolio: ((point.portfolioValue / baselinePortfolio) - 1) * 100,
      benchmark: ((point.benchmarkValue / baselineBenchmark) - 1) * 100
    }));
  }
  
  return (
    <Card className="bg-card">
      <CardHeader className="card-header flex justify-between items-center">
        <h3>Performance vs {benchmark}</h3>
        <div className="flex items-center space-x-2 text-xs">
          {timeRanges.map(range => (
            <button
              key={range}
              className={cn(
                "text-gray-400 hover:text-white",
                selectedRange === range && "text-secondary underline"
              )}
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={percentageData}
              margin={{
                top: 5,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
              <XAxis 
                dataKey="date" 
                stroke="#9AA0A6" 
                fontSize={10}
                tickFormatter={(value) => {
                  // Format date for display (e.g., "Jan", "Feb", etc.)
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="#9AA0A6" 
                fontSize={10}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                }}
                contentStyle={{ 
                  backgroundColor: '#1A202C',
                  border: '1px solid #2D3748',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => {
                  return value === 'portfolio' ? 'Portfolio' : benchmark;
                }}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="#0A7AFF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#9AA0A6"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

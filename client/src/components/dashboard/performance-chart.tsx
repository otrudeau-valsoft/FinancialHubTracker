import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
  region: string;
  timeRanges?: string[];
  benchmark?: string;
}

export const PerformanceChart = ({ 
  region,
  timeRanges = ["1W", "1M", "YTD", "1Y"],
  benchmark = "SPY"
}: PerformanceChartProps) => {
  const [selectedRange, setSelectedRange] = useState("YTD");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  
  // Set date range based on selected time range
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    
    switch (selectedRange) {
      case "1W":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case "1M":
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case "YTD":
        start = new Date(now.getFullYear(), 0, 1); // Jan 1st of current year
        break;
      case "1Y":
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [selectedRange]);
  
  // Fetch portfolio performance data from our new history endpoint
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['/api/portfolio-performance-history', region, selectedRange],
    queryFn: () => 
      fetch(`/api/portfolio-performance-history?region=${region}&timeRange=${selectedRange}`)
        .then(res => {
          console.log('Performance history response:', res.status);
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .catch(error => {
          console.error('Error fetching performance data:', error);
          throw error;
        }),
    enabled: !!selectedRange && !!region,
    staleTime: 3600000, // 1 hour
  });
  
  // Define the API response and data types
  interface PerformanceDataPoint {
    date: string;
    portfolioValue: number;
    benchmarkValue: number;
    portfolioCumulativeReturn: number | null;
    benchmarkCumulativeReturn: number | null;
    portfolioReturnDaily: number | null;
    benchmarkReturnDaily: number | null;
    relativePerformance: number | null;
  }
  
  interface ApiResponse {
    status: string;
    data: PerformanceDataPoint[];
  }
  
  // Prepare the performance data from the API response
  const performanceData = useMemo(() => {
    return (apiResponse as ApiResponse)?.status === 'success' 
      ? (apiResponse as ApiResponse).data 
      : [];
  }, [apiResponse]);
  
  // Format data for chart display - using precalculated cumulative returns from database
  const percentageData = useMemo(() => {
    if (!performanceData || !performanceData.length) return [];
    
    return performanceData.map(point => ({
      date: point.date,
      portfolio: point.portfolioCumulativeReturn || 0,
      benchmark: point.benchmarkCumulativeReturn || 0
    }));
  }, [performanceData]);
  
  return (
    <Card className="mb-6 border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
      <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
        <div className="w-full flex items-center justify-between">
          <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">RELATIVE P&L</h3>
          <div className="h-1 w-8 bg-[#2196F3]"></div>
        </div>
      </CardHeader>
      <div className="px-3 py-2 flex gap-1">
        {timeRanges.map(range => (
          <button
            key={range}
            className={cn(
              "text-[10px] sm:text-xs px-2 py-0.5 rounded-sm",
              selectedRange === range 
                ? "bg-[#1A304A] text-white" 
                : "text-[#7A8999] hover:bg-[#1A304A]/50 hover:text-white"
            )}
            onClick={() => setSelectedRange(range)}
          >
            {range}
          </button>
        ))}
      </div>
      <CardContent className="p-4 bg-[#0A1929]">
        <div className="h-[200px]">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-[#7A8999] text-sm flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-t-[#0A7AFF] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2"></div>
                <span>Loading chart data...</span>
              </div>
            </div>
          ) : !performanceData || performanceData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-[#7A8999] text-sm text-center">
                <p>No historical price data available for this period.</p>
                <p className="text-xs mt-1">Try selecting a different time range or check data settings.</p>
              </div>
            </div>
          ) : percentageData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-[#7A8999] text-sm text-center">
                <p>Unable to calculate percentage changes.</p>
                <p className="text-xs mt-1">The historical price data may be incomplete.</p>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

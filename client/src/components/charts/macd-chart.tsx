import React from 'react';
import { 
  LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartTooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';

interface MacdChartProps {
  data: any[];
  height?: number;
  syncId?: string;
}

const MacdChart: React.FC<MacdChartProps> = ({ 
  data, 
  height = 140, 
  syncId = "stockChart" 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center bg-[#0A1524]">
        <div className="text-center">
          <div className="text-[#38AAFD] font-mono text-sm font-semibold mb-2">MACD Data Not Available</div>
          <div className="text-[#7A8999] font-mono text-xs mb-3">
            Use the REFRESH button at the top of the page to update historical prices and generate MACD data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: height || 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
          syncId={syncId} // Synchronize with main chart
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fontSize: 10, fill: '#7A8999' }}
            interval="preserveStartEnd"
            tickMargin={5}
            stroke="#1A304A"
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#38AAFD' }}
            tickFormatter={(val) => `${val.toFixed(1)}`}
            width={35}
            stroke="#1A304A"
          />
          <RechartTooltip
            labelFormatter={(label) => `Date: ${label}`}
            formatter={(value: number, name: string) => {
              let displayName = name;
              let color = '#38AAFD';
              
              // Create more descriptive names and match colors
              if (name === 'fast') {
                displayName = 'Fast EMA (12-period)';
                color = '#00BCD4';
              } else if (name === 'slow') {
                displayName = 'Slow EMA (26-period)';
                color = '#E91E63';
              } else if (name === 'histogram') {
                displayName = 'Histogram (Fast-Slow)';
                color = value >= 0 ? '#4CAF50' : '#FF3D00';
              }
              
              return [
                `${value.toFixed(2)}`, 
                displayName,
                color
              ];
            }}
            contentStyle={{ 
              backgroundColor: '#0A1524', 
              borderColor: '#1A304A',
              color: '#EFEFEF',
              fontSize: 12,
              fontFamily: 'monospace'
            }}
            itemStyle={{ color: '#38AAFD' }}
            labelStyle={{ color: '#7A8999', fontFamily: 'monospace' }}
          />
          
          {/* Zero Line Reference */}
          <ReferenceLine 
            y={0} 
            stroke="#7A8999" 
            strokeDasharray="3 3" 
            strokeWidth={1}
            label={{ 
              value: "0", 
              position: "insideLeft",
              fill: "#7A8999",
              fontSize: 10
            }}
          />
          
          {/* Fast EMA (12-period) */}
          <Line
            type="monotone"
            dataKey="fast"
            stroke="#00BCD4" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#00BCD4', fill: '#FFFFFF' }}
            name="fast"
            connectNulls
          />
          
          {/* Slow EMA (26-period) */}
          <Line
            type="monotone"
            dataKey="slow"
            stroke="#E91E63"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#E91E63', fill: '#FFFFFF' }}
            name="slow"
            connectNulls
          />
          
          {/* MACD Histogram (Fast EMA - Slow EMA) with dynamic coloring */}
          <Bar
            dataKey="histogram"
            name="histogram"
            barSize={3}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.histogram >= 0 ? '#4CAF50' : '#FF3D00'} 
                stroke={entry.histogram >= 0 ? '#4CAF50' : '#FF3D00'} 
              />
            ))}
          </Bar>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MacdChart;
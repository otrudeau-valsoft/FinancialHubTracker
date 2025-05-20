import React from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  Legend
} from 'recharts';

interface MovingAverageChartProps {
  data: any[];
  height?: number | string;
}

/**
 * Dedicated Moving Average Chart Component
 * 
 * Specifically designed to show price, 50-day MA and 200-day MA lines
 * with proper formatting and tooltips
 */
export default function MovingAverageChart({ data, height = '100%' }: MovingAverageChartProps) {
  // Format currency for display
  const formatCurrency = (value: number, decimals = 2) => {
    if (value === null || value === undefined) return '';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
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
          tick={{ fontSize: 10, fill: '#7A8999' }}
          tickFormatter={(val) => `${val.toFixed(1)}`}
          domain={['auto', 'auto']}
          stroke="#1A304A"
        />
        
        <RechartTooltip 
          formatter={(value: any, name: string) => {
            if (name === 'close') return [formatCurrency(value), 'Price'];
            if (name === 'ma50') return [formatCurrency(value), '50-Day MA'];
            if (name === 'ma200') return [formatCurrency(value), '200-Day MA'];
            return [value, name];
          }}
          labelFormatter={(label: any, payload: any) => {
            // If we have payload data with a date, use that for a more detailed label
            if (payload && payload.length > 0 && payload[0].payload.date) {
              const date = new Date(payload[0].payload.date);
              return `Date: ${format(date, 'MMM d, yyyy')}`;
            }
            return `Date: ${label}`;
          }}
          contentStyle={{ 
            backgroundColor: '#0B1728', 
            borderColor: '#1A304A',
            color: '#EFEFEF'
          }}
          itemStyle={{ color: '#EFEFEF' }}
        />
        
        {/* Price Line */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#EFEFEF"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, stroke: '#EFEFEF', fill: '#0B1728' }}
          name="close"
        />
        
        {/* 50-Day Moving Average */}
        <Line
          type="monotone"
          dataKey="ma50"
          stroke="#38AAFD"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#38AAFD', fill: '#FFFFFF' }}
          name="ma50"
          connectNulls
        />
        
        {/* 200-Day Moving Average */}
        <Line
          type="monotone"
          dataKey="ma200"
          stroke="#FF3D00"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#FF3D00', fill: '#FFFFFF' }}
          name="ma200"
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
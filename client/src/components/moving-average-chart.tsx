import React from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip
} from 'recharts';

interface MovingAverageChartProps {
  data: any[];
  height?: number | string;
}

/**
 * Dedicated Moving Average Chart Component
 * 
 * Specifically designed to show 50-day MA and 200-day MA lines
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

  // Make sure we have data
  if (!data || data.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center h-48 text-[#7A8999]">
        No moving average data available
      </div>
    );
  }

  // Check if we have valid data for the MA lines
  const hasMa50Data = data.some(item => item.ma50 !== null && item.ma50 !== undefined);
  const hasMa200Data = data.some(item => item.ma200 !== null && item.ma200 !== undefined);
  
  // For larger datasets (like 5Y view), adjust the interval
  const isLargeDataset = data.length > 100;
  const intervalValue = isLargeDataset ? Math.max(1, Math.floor(data.length / 12)) : "preserveStartEnd";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1A304A" vertical={false} />
        
        <XAxis 
          dataKey="formattedDate"
          tick={{ fontSize: 10, fill: '#7A8999' }}
          interval={intervalValue}
          tickMargin={5}
          stroke="#1A304A"
          minTickGap={isLargeDataset ? 60 : 30}
        />
        
        <YAxis 
          tick={{ fontSize: 10, fill: '#7A8999' }}
          tickFormatter={(val) => `${val.toFixed(1)}`}
          domain={['auto', 'auto']}
          stroke="#1A304A"
        />
        
        <RechartTooltip 
          cursor={{stroke: '#38AAFD', strokeWidth: 1, strokeDasharray: '5 5'}}
          formatter={(value: any, name: string) => {
            if (name === 'ma50') return [formatCurrency(value), '50-Day MA'];
            if (name === 'ma200') return [formatCurrency(value), '200-Day MA'];
            return [value, name];
          }}
          labelFormatter={(label: any, payload: any) => {
            // If we have payload data with a date, use that for a more detailed label
            if (payload && payload.length > 0 && payload[0].payload.date) {
              const date = new Date(payload[0].payload.date);
              return `Date: ${format(date, 'EEE, MMM d, yyyy')}`;
            }
            return `Date: ${label}`;
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
        
        {/* 50-Day Moving Average */}
        {hasMa50Data && (
          <Line
            type="monotone"
            dataKey="ma50"
            stroke="#38AAFD"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#38AAFD', fill: '#FFFFFF' }}
            name="ma50"
            connectNulls
            isAnimationActive={!isLargeDataset}
          />
        )}
        
        {/* 200-Day Moving Average */}
        {hasMa200Data && (
          <Line
            type="monotone"
            dataKey="ma200"
            stroke="#FF3D00"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#FF3D00', fill: '#FFFFFF' }}
            name="ma200"
            connectNulls
            isAnimationActive={!isLargeDataset}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
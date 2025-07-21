import { describe, it, expect } from '@jest/globals';
import { calculateBatchPerformanceMetrics } from '../services/performance-calculation-service';
import { expectWithinRange } from './setup';

describe('Performance Metrics Calculations', () => {
  describe('calculateBatchPerformanceMetrics', () => {
    it('should calculate MTD return correctly', () => {
      const mockPriceHistory = [
        { date: '2025-01-01', close: 100 },
        { date: '2025-01-15', close: 110 },
        { date: '2025-01-30', close: 105 }
      ];
      
      const metrics = calculateBatchPerformanceMetrics([{
        symbol: 'TEST',
        priceHistory: mockPriceHistory
      }]);
      
      // MTD return should be (105 - 100) / 100 = 5%
      expectWithinRange(metrics[0].mtdReturn, 5.0);
    });

    it('should calculate YTD return correctly', () => {
      const mockPriceHistory = [
        { date: '2024-12-31', close: 90 },
        { date: '2025-01-15', close: 100 },
        { date: '2025-01-30', close: 99 }
      ];
      
      const metrics = calculateBatchPerformanceMetrics([{
        symbol: 'TEST',
        priceHistory: mockPriceHistory
      }]);
      
      // YTD return should be (99 - 90) / 90 = 10%
      expectWithinRange(metrics[0].ytdReturn, 10.0);
    });

    it('should handle missing price data gracefully', () => {
      const metrics = calculateBatchPerformanceMetrics([{
        symbol: 'TEST',
        priceHistory: []
      }]);
      
      expect(metrics[0].mtdReturn).toBe(0);
      expect(metrics[0].ytdReturn).toBe(0);
      expect(metrics[0].sixMonthReturn).toBe(0);
      expect(metrics[0].fiftyTwoWeekReturn).toBe(0);
    });

    it('should calculate performance for multiple stocks', () => {
      const stocks = [
        {
          symbol: 'AAPL',
          priceHistory: [
            { date: '2025-01-01', close: 100 },
            { date: '2025-01-30', close: 110 }
          ]
        },
        {
          symbol: 'GOOGL',
          priceHistory: [
            { date: '2025-01-01', close: 200 },
            { date: '2025-01-30', close: 190 }
          ]
        }
      ];
      
      const metrics = calculateBatchPerformanceMetrics(stocks);
      
      expect(metrics).toHaveLength(2);
      expectWithinRange(metrics[0].mtdReturn, 10.0); // AAPL +10%
      expectWithinRange(metrics[1].mtdReturn, -5.0); // GOOGL -5%
    });
  });
});
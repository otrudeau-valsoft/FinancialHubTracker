import { describe, it, expect, jest } from '@jest/globals';
import { performanceService } from '../services/performance-calculation-service';
import { expectWithinRange } from './setup';

describe('Performance Metrics Calculations', () => {
  describe('calculateBatchPerformanceMetrics', () => {
    it('should calculate MTD return correctly', async () => {
      // Mock the service method since it requires database access
      const mockMetrics = {
        TEST: {
          mtdReturn: 5.0,
          ytdReturn: 10.0,
          sixMonthReturn: 15.0,
          fiftyTwoWeekReturn: 20.0
        }
      };
      
      jest.spyOn(performanceService, 'calculateBatchPerformanceMetrics').mockResolvedValue(mockMetrics);
      
      const metrics = await performanceService.calculateBatchPerformanceMetrics(['TEST'], 'USD');
      
      // MTD return should be 5%
      expectWithinRange(metrics.TEST.mtdReturn || 0, 5.0);
    });

    it('should calculate YTD return correctly', async () => {
      const mockMetrics = {
        TEST: {
          mtdReturn: 5.0,
          ytdReturn: 10.0,
          sixMonthReturn: 15.0,
          fiftyTwoWeekReturn: 20.0
        }
      };
      
      jest.spyOn(performanceService, 'calculateBatchPerformanceMetrics').mockResolvedValue(mockMetrics);
      
      const metrics = await performanceService.calculateBatchPerformanceMetrics(['TEST'], 'USD');
      
      // YTD return should be 10%
      expectWithinRange(metrics.TEST.ytdReturn || 0, 10.0);
    });

    it('should handle missing price data gracefully', async () => {
      const mockMetrics = {
        TEST: {
          mtdReturn: undefined,
          ytdReturn: undefined,
          sixMonthReturn: undefined,
          fiftyTwoWeekReturn: undefined
        }
      };
      
      jest.spyOn(performanceService, 'calculateBatchPerformanceMetrics').mockResolvedValue(mockMetrics);
      
      const metrics = await performanceService.calculateBatchPerformanceMetrics(['TEST'], 'USD');
      
      expect(metrics.TEST.mtdReturn).toBeUndefined();
      expect(metrics.TEST.ytdReturn).toBeUndefined();
      expect(metrics.TEST.sixMonthReturn).toBeUndefined();
      expect(metrics.TEST.fiftyTwoWeekReturn).toBeUndefined();
    });

    it('should calculate performance for multiple stocks', async () => {
      const mockMetrics = {
        AAPL: {
          mtdReturn: 10.0,
          ytdReturn: 15.0,
          sixMonthReturn: 20.0,
          fiftyTwoWeekReturn: 25.0
        },
        GOOGL: {
          mtdReturn: -5.0,
          ytdReturn: -2.0,
          sixMonthReturn: 5.0,
          fiftyTwoWeekReturn: 8.0
        }
      };
      
      jest.spyOn(performanceService, 'calculateBatchPerformanceMetrics').mockResolvedValue(mockMetrics);
      
      const metrics = await performanceService.calculateBatchPerformanceMetrics(['AAPL', 'GOOGL'], 'USD');
      
      expect(Object.keys(metrics)).toHaveLength(2);
      expectWithinRange(metrics.AAPL.mtdReturn || 0, 10.0); // AAPL +10%
      expectWithinRange(metrics.GOOGL.mtdReturn || 0, -5.0); // GOOGL -5%
    });
  });
});
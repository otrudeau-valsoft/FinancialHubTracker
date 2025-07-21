import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Data validation schemas for testing
const priceDataSchema = z.object({
  symbol: z.string().min(1),
  currentPrice: z.number().positive(),
  previousClose: z.number().positive().optional(),
  dailyChange: z.number(),
  dailyChangePercent: z.number(),
  volume: z.number().nonnegative().optional()
});

const portfolioStockSchema = z.object({
  symbol: z.string().min(1),
  companyName: z.string().min(1),
  stockType: z.enum(['Comp', 'Cat', 'Cycl', 'Cash', 'ETF']),
  rating: z.number().int().min(1).max(4),
  purchasePrice: z.number().positive(),
  currentPrice: z.number().positive(),
  quantity: z.number().positive(),
  region: z.enum(['USD', 'CAD', 'INTL'])
});

const performanceMetricsSchema = z.object({
  mtdReturn: z.number(),
  ytdReturn: z.number(),
  sixMonthReturn: z.number(),
  fiftyTwoWeekReturn: z.number()
});

describe('Data Validation', () => {
  describe('Price Data Validation', () => {
    it('should validate correct price data', () => {
      const validPriceData = {
        symbol: 'AAPL',
        currentPrice: 150.25,
        previousClose: 148.50,
        dailyChange: 1.75,
        dailyChangePercent: 1.18,
        volume: 52000000
      };
      
      expect(() => priceDataSchema.parse(validPriceData)).not.toThrow();
    });

    it('should reject invalid price data', () => {
      const invalidPriceData = {
        symbol: '',
        currentPrice: -100,
        dailyChange: 'invalid',
        dailyChangePercent: null
      };
      
      expect(() => priceDataSchema.parse(invalidPriceData)).toThrow();
    });
  });

  describe('Portfolio Stock Validation', () => {
    it('should validate correct portfolio stock data', () => {
      const validStock = {
        symbol: 'MSFT',
        companyName: 'Microsoft Corporation',
        stockType: 'Comp',
        rating: 1,
        purchasePrice: 300.00,
        currentPrice: 350.00,
        quantity: 100,
        region: 'USD'
      };
      
      expect(() => portfolioStockSchema.parse(validStock)).not.toThrow();
    });

    it('should reject invalid stock types', () => {
      const invalidStock = {
        symbol: 'MSFT',
        companyName: 'Microsoft',
        stockType: 'Invalid',
        rating: 1,
        purchasePrice: 300,
        currentPrice: 350,
        quantity: 100,
        region: 'USD'
      };
      
      expect(() => portfolioStockSchema.parse(invalidStock)).toThrow();
    });

    it('should reject invalid ratings', () => {
      const invalidStock = {
        symbol: 'MSFT',
        companyName: 'Microsoft',
        stockType: 'Comp',
        rating: 5, // Invalid: should be 1-4
        purchasePrice: 300,
        currentPrice: 350,
        quantity: 100,
        region: 'USD'
      };
      
      expect(() => portfolioStockSchema.parse(invalidStock)).toThrow();
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should validate performance metrics', () => {
      const validMetrics = {
        mtdReturn: 5.25,
        ytdReturn: 12.50,
        sixMonthReturn: -2.75,
        fiftyTwoWeekReturn: 25.00
      };
      
      expect(() => performanceMetricsSchema.parse(validMetrics)).not.toThrow();
    });

    it('should accept negative returns', () => {
      const negativeReturns = {
        mtdReturn: -10.50,
        ytdReturn: -15.25,
        sixMonthReturn: -20.00,
        fiftyTwoWeekReturn: -5.75
      };
      
      expect(() => performanceMetricsSchema.parse(negativeReturns)).not.toThrow();
    });
  });
});
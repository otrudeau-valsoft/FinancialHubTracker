import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('API Endpoints', () => {
  describe('Portfolio Endpoints', () => {
    it('GET /api/portfolios/USD/stocks should return stock data', async () => {
      const response = await request(app)
        .get('/api/portfolios/USD/stocks')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const stock = response.body[0];
        expect(stock).toHaveProperty('symbol');
        expect(stock).toHaveProperty('currentPrice');
        expect(stock).toHaveProperty('quantity');
        expect(stock).toHaveProperty('purchasePrice');
      }
    });

    it('GET /api/current-prices/USD should return current prices', async () => {
      const response = await request(app)
        .get('/api/current-prices/USD')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const price = response.body[0];
        expect(price).toHaveProperty('symbol');
        expect(price).toHaveProperty('region');
        expect(price).toHaveProperty('currentPrice');
        expect(typeof price.currentPrice).toBe('number');
      }
    });

    it('GET /api/cash should return cash balances', async () => {
      const response = await request(app)
        .get('/api/cash')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      const regions = response.body.map((cash: any) => cash.region);
      expect(regions).toContain('USD');
      expect(regions).toContain('CAD');
      expect(regions).toContain('INTL');
    });
  });

  describe('Performance History Endpoints', () => {
    it('GET /api/performance-history should return data or empty array', async () => {
      const response = await request(app)
        .get('/api/performance-history?region=USD')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Market Data Endpoints', () => {
    it('GET /api/market-indices/real-time should return market data', async () => {
      const response = await request(app)
        .get('/api/market-indices/real-time')
        .expect(200);
      
      expect(response.body).toHaveProperty('sp500');
      expect(response.body).toHaveProperty('nasdaq');
      expect(response.body).toHaveProperty('dow');
      
      const sp500 = response.body.sp500;
      expect(sp500).toHaveProperty('return');
      expect(sp500).toHaveProperty('positive');
      expect(typeof sp500.return).toBe('number');
    });
  });

  describe('ETF Holdings Endpoints', () => {
    it('GET /api/etfs/SPY/holdings/top/10 should return top holdings', async () => {
      const response = await request(app)
        .get('/api/etfs/SPY/holdings/top/10')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10);
      
      if (response.body.length > 0) {
        const holding = response.body[0];
        expect(holding).toHaveProperty('ticker');
        expect(holding).toHaveProperty('name');
        expect(holding).toHaveProperty('weight');
      }
    });
  });
});
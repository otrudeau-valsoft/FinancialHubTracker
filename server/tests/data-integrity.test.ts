import { describe, it, expect } from '@jest/globals';
import { testDb } from './setup';
import { sql } from 'drizzle-orm';

describe('Data Integrity Tests', () => {
  describe('Portfolio Data Integrity', () => {
    it('should have valid purchase prices for all stocks', async () => {
      const regions = ['usd', 'cad', 'intl'];
      
      for (const region of regions) {
        const tableName = `portfolio_${region}`;
        const result = await testDb.execute(sql.raw(`
          SELECT COUNT(*) as invalid_count
          FROM ${tableName}
          WHERE "purchasePrice" <= 0 OR "purchasePrice" IS NULL
        `));
        
        const invalidCount = parseInt(result.rows[0].invalid_count as string);
        expect(invalidCount).toBe(0);
      }
    });

    it('should have valid quantities for all stocks', async () => {
      const regions = ['usd', 'cad', 'intl'];
      
      for (const region of regions) {
        const tableName = `portfolio_${region}`;
        const result = await testDb.execute(sql.raw(`
          SELECT COUNT(*) as invalid_count
          FROM ${tableName}
          WHERE quantity <= 0 OR quantity IS NULL
        `));
        
        const invalidCount = parseInt(result.rows[0].invalid_count as string);
        expect(invalidCount).toBe(0);
      }
    });

    it('should have valid stock types', async () => {
      const validTypes = ['Comp', 'Cat', 'Cycl', 'Cash', 'ETF'];
      const regions = ['usd', 'cad', 'intl'];
      
      for (const region of regions) {
        const tableName = `portfolio_${region}`;
        const result = await testDb.execute(sql.raw(`
          SELECT DISTINCT "stockType"
          FROM ${tableName}
          WHERE "stockType" IS NOT NULL
        `));
        
        result.rows.forEach(row => {
          expect(validTypes).toContain(row.stockType);
        });
      }
    });

    it('should have valid ratings (1-4)', async () => {
      const regions = ['usd', 'cad', 'intl'];
      
      for (const region of regions) {
        const tableName = `portfolio_${region}`;
        const result = await testDb.execute(sql.raw(`
          SELECT COUNT(*) as invalid_count
          FROM ${tableName}
          WHERE rating < 1 OR rating > 4 OR rating IS NULL
        `));
        
        const invalidCount = parseInt(result.rows[0].invalid_count as string);
        expect(invalidCount).toBe(0);
      }
    });
  });

  describe('Price Data Integrity', () => {
    it('should not have negative current prices', async () => {
      const result = await testDb.execute(sql`
        SELECT COUNT(*) as negative_count
        FROM current_prices_usd
        WHERE "currentPrice" < 0
      `);
      
      const negativeCount = parseInt(result.rows[0].negative_count as string);
      expect(negativeCount).toBe(0);
    });

    it('should have consistent symbols between portfolio and current prices', async () => {
      const result = await testDb.execute(sql`
        SELECT p.symbol
        FROM portfolio_usd p
        LEFT JOIN current_prices_usd cp ON p.symbol = cp.symbol
        WHERE cp.symbol IS NULL
      `);
      
      // All portfolio stocks should have current prices
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Cash Balance Integrity', () => {
    it('should have exactly 3 cash regions', async () => {
      const result = await testDb.execute(sql`
        SELECT COUNT(DISTINCT region) as region_count
        FROM cash_portfolio
      `);
      
      const regionCount = parseInt(result.rows[0].region_count as string);
      expect(regionCount).toBe(3);
    });

    it('should have USD, CAD, and INTL regions', async () => {
      const result = await testDb.execute(sql`
        SELECT DISTINCT region
        FROM cash_portfolio
        ORDER BY region
      `);
      
      const regions = result.rows.map(r => r.region);
      expect(regions).toEqual(['CAD', 'INTL', 'USD']);
    });

    it('should not have negative cash balances', async () => {
      const result = await testDb.execute(sql`
        SELECT COUNT(*) as negative_count
        FROM cash_portfolio
        WHERE amount < 0
      `);
      
      const negativeCount = parseInt(result.rows[0].negative_count as string);
      expect(negativeCount).toBe(0);
    });
  });

  describe('Historical Data Integrity', () => {
    it('should not have future dates in historical prices', async () => {
      const result = await testDb.execute(sql`
        SELECT COUNT(*) as future_count
        FROM historical_prices_usd
        WHERE date > CURRENT_DATE
      `);
      
      const futureCount = parseInt(result.rows[0].future_count as string);
      expect(futureCount).toBe(0);
    });

    it('should have valid price values in historical data', async () => {
      const result = await testDb.execute(sql`
        SELECT COUNT(*) as invalid_count
        FROM historical_prices_usd
        WHERE close <= 0 OR high < low OR high < close OR low > close
      `);
      
      const invalidCount = parseInt(result.rows[0].invalid_count as string);
      expect(invalidCount).toBe(0);
    });
  });
});
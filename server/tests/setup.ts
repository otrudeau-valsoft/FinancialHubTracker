import { beforeAll, afterAll } from '@jest/globals';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Test database connection
export const testPool = new Pool({ 
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL 
});

export const testDb = drizzle({ client: testPool, schema });

// Setup and teardown for tests
beforeAll(async () => {
  console.log('Setting up test database...');
});

afterAll(async () => {
  await testPool.end();
});

// Test utilities
export const createTestStock = (overrides = {}) => ({
  symbol: 'TEST',
  companyName: 'Test Company',
  stockType: 'Comp',
  rating: 1,
  region: 'USD',
  purchasePrice: 100,
  currentPrice: 110,
  quantity: 100,
  ...overrides
});

export const expectWithinRange = (actual: number, expected: number, tolerance: number = 0.01) => {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Expected ${actual} to be within ${tolerance} of ${expected}, but difference was ${diff}`);
  }
};
import { Router } from 'express';
import { db } from '../db';
import { marketIndices } from '@shared/schema';
import yahooFinance from 'yahoo-finance2';
import { eq } from 'drizzle-orm';

const router = Router();

const INDICES = [
  { 
    symbol: 'SPY', 
    name: 'SPDR S&P 500 ETF Trust',
    region: 'USD',
    displaySymbol: 'S&P500',
  },
  { 
    symbol: 'XIC.TO', 
    name: 'iShares Core S&P/TSX Capped Composite Index ETF',
    region: 'CAD',
    displaySymbol: 'TSX',
  },
  { 
    symbol: 'ACWX', 
    name: 'iShares MSCI ACWI ex U.S. ETF',
    region: 'INTL',
    displaySymbol: 'ACWX',
  }
];

// Get all market indices data
router.get('/', async (req, res) => {
  try {
    const indices = await db.select().from(marketIndices);
    res.json(indices);
  } catch (error) {
    console.error('Error fetching market indices:', error);
    res.status(500).json({ message: 'Failed to fetch market indices data' });
  }
});

// Get real-time market indices data for the header
router.get('/real-time', async (req, res) => {
  try {
    const result = {
      sp500: { return: 0, positive: false },
      tsx: { return: 0, positive: false },
      acwx: { return: 0, positive: false }
    };
    
    // Fetch real-time quotes for all indices
    await Promise.all(INDICES.map(async (index) => {
      try {
        const quote = await yahooFinance.quote(index.symbol);
        
        // Handle different indices
        if (index.region === 'USD') {
          result.sp500 = {
            return: Number(quote.regularMarketChangePercent?.toFixed(2)) || 0,
            positive: (quote.regularMarketChangePercent || 0) > 0
          };
        } else if (index.region === 'CAD') {
          result.tsx = {
            return: Number(quote.regularMarketChangePercent?.toFixed(2)) || 0,
            positive: (quote.regularMarketChangePercent || 0) > 0
          };
        } else if (index.region === 'INTL') {
          result.acwx = {
            return: Number(quote.regularMarketChangePercent?.toFixed(2)) || 0,
            positive: (quote.regularMarketChangePercent || 0) > 0
          };
        }
        
        // Update the database record
        await db.update(marketIndices)
          .set({
            currentPrice: quote.regularMarketPrice,
            dailyChange: quote.regularMarketChange,
            dailyChangePercent: quote.regularMarketChangePercent,
            updatedAt: new Date()
          })
          .where(eq(marketIndices.symbol, index.symbol));
        
      } catch (error) {
        console.error(`Error fetching real-time data for ${index.symbol}:`, error);
        // If fetching real-time data fails, use the database values
        const indexData = await db.select().from(marketIndices).where(eq(marketIndices.symbol, index.symbol));
        if (indexData.length > 0) {
          const data = indexData[0];
          if (index.region === 'USD') {
            result.sp500 = {
              return: Number(data.dailyChangePercent) || 0,
              positive: (Number(data.dailyChangePercent) || 0) > 0
            };
          } else if (index.region === 'CAD') {
            result.tsx = {
              return: Number(data.dailyChangePercent) || 0,
              positive: (Number(data.dailyChangePercent) || 0) > 0
            };
          } else if (index.region === 'INTL') {
            result.acwx = {
              return: Number(data.dailyChangePercent) || 0,
              positive: (Number(data.dailyChangePercent) || 0) > 0
            };
          }
        }
      }
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching real-time market indices:', error);
    res.status(500).json({ message: 'Failed to fetch real-time market indices data' });
  }
});

// Fetch latest data from Yahoo Finance
router.post('/fetch', async (req, res) => {
  try {
    const results = [];
    
    for (const index of INDICES) {
      try {
        // Fetch current quote from Yahoo Finance
        const quote = await yahooFinance.quote(index.symbol, {});
        
        // Update the database
        await db.update(marketIndices)
          .set({
            currentPrice: quote.regularMarketPrice,
            dailyChange: quote.regularMarketChange,
            dailyChangePercent: quote.regularMarketChangePercent,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            updatedAt: new Date()
          })
          .where(eq(marketIndices.symbol, index.symbol));
        
        results.push({
          symbol: index.symbol,
          region: index.region,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error fetching data for ${index.symbol}:`, error);
        results.push({
          symbol: index.symbol,
          region: index.region,
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching market indices:', error);
    res.status(500).json({ message: 'Failed to fetch market indices data' });
  }
});

export default router;
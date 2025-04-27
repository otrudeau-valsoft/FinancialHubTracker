import { db } from '../db';
import { 
  portfolioUSD, portfolioCAD, portfolioINTL,
  holdingsUSD, holdingsCAD, holdingsINTL,
  currentPrices, etfHoldingsSPY, etfHoldingsXIC, etfHoldingsACWX,
  InsertHoldingsUSD, InsertHoldingsCAD, InsertHoldingsINTL,
  portfolioCash
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { historicalPriceService } from './historical-price-service';
import { currentPriceService } from './current-price-service';

/**
 * Service for managing holdings data
 * This service combines data from portfolio tables, current prices, and historical prices
 * to create the holdings tables with all required metrics for the frontend
 */
class HoldingsService {
  /**
   * Helper function to get cash balance for a specific region
   */
  private async getCashBalance(region: string): Promise<number> {
    try {
      const [cashBalance] = await db.select()
        .from(portfolioCash)
        .where(eq(portfolioCash.region, region));
      
      return cashBalance ? parseFloat(cashBalance.amount) : 10000; // Fallback to $10,000 if not found
    } catch (error) {
      console.error(`Error fetching cash balance for ${region}:`, error);
      return 10000; // Fallback to default $10,000
    }
  }
  /**
   * Calculate metrics for USD portfolio holdings
   */
  async updateUSDHoldings() {
    try {
      // 1. Get all symbols in USD portfolio
      const portfolioStocks = await db.select().from(portfolioUSD);
      if (!portfolioStocks.length) {
        console.log('No stocks found in USD portfolio');
        return [];
      }
      
      // 2. Get current prices for these symbols
      const currentPricesData = await db.select()
        .from(currentPrices)
        .where(eq(currentPrices.region, 'USD'));
      
      // Create a map of current prices by symbol for easier lookup
      const priceMap = new Map();
      currentPricesData.forEach(price => {
        priceMap.set(price.symbol, price);
      });
      
      // 3. Get benchmark weights from SPY ETF holdings
      const spyHoldings = await db.select().from(etfHoldingsSPY);
      const benchmarkWeightMap = new Map();
      spyHoldings.forEach(holding => {
        benchmarkWeightMap.set(holding.ticker, parseFloat(holding.weight?.toString() || '0'));
      });
      
      // 4. Calculate the total portfolio value (including CASH)
      let totalPortfolioValue = 0;
      const cashValue = await this.getCashBalance("USD");
      
      for (const stock of portfolioStocks) {
        const currentPrice = priceMap.get(stock.symbol);
        if (currentPrice) {
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          totalPortfolioValue += price * quantity;
        }
      }
      
      // Add cash to total portfolio value
      totalPortfolioValue += cashValue;
      
      // 5. Calculate performance metrics and prepare holdings data
      const holdingsData: InsertHoldingsUSD[] = [];
      
      // First add the cash entry
      const cashEntry: InsertHoldingsUSD = {
        symbol: 'CASH',
        company: 'CASH',
        stockType: 'Cash',
        rating: '1',
        sector: null,
        quantity: '1',
        currentPrice: cashValue.toString(),
        netAssetValue: cashValue.toString(),
        portfolioWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        benchmarkWeight: '0',
        deltaWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        dailyChangePercent: '0',
        mtdChangePercent: '0',
        ytdChangePercent: '0',
        sixMonthChangePercent: '0',
        fiftyTwoWeekChangePercent: '0',
        profitLossPercent: '0',
        dividendYield: '0'
      };
      
      holdingsData.push(cashEntry);
      
      // Then process normal stocks
      for (const stock of portfolioStocks) {
        try {
          const currentPrice = priceMap.get(stock.symbol);
          
          if (!currentPrice) {
            console.log(`No current price data found for ${stock.symbol}`);
            continue;
          }
          
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          const netAssetValue = price * quantity;
          const portfolioWeight = totalPortfolioValue > 0 ? (netAssetValue / totalPortfolioValue) * 100 : 0;
          const benchmarkWeight = benchmarkWeightMap.get(stock.symbol) || 0;
          const deltaWeight = portfolioWeight - benchmarkWeight;
          
          // Prepare historical prices query for this symbol
          const now = new Date();
          
          // Get month-to-date (MTD) historical data
          const mtdDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const mtdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'USD', mtdDate);
          const mtdStartPrice = mtdPrices.length > 0 ? parseFloat(mtdPrices[0].close?.toString() || '0') : 0;
          const mtdChangePercent = mtdStartPrice > 0 ? ((price - mtdStartPrice) / mtdStartPrice) * 100 : 0;
          
          // Get year-to-date (YTD) historical data
          const ytdDate = new Date(now.getFullYear(), 0, 1);
          const ytdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'USD', ytdDate);
          const ytdStartPrice = ytdPrices.length > 0 ? parseFloat(ytdPrices[0].close?.toString() || '0') : 0;
          const ytdChangePercent = ytdStartPrice > 0 ? ((price - ytdStartPrice) / ytdStartPrice) * 100 : 0;
          
          // Get six-month historical data
          const sixMonthDate = new Date();
          sixMonthDate.setMonth(sixMonthDate.getMonth() - 6);
          const sixMonthPrices = await this.getHistoricalPriceForDate(stock.symbol, 'USD', sixMonthDate);
          const sixMonthStartPrice = sixMonthPrices.length > 0 ? parseFloat(sixMonthPrices[0].close?.toString() || '0') : 0;
          const sixMonthChangePercent = sixMonthStartPrice > 0 ? ((price - sixMonthStartPrice) / sixMonthStartPrice) * 100 : 0;
          
          // Get 52-week historical data
          const fiftyTwoWeekDate = new Date();
          fiftyTwoWeekDate.setFullYear(fiftyTwoWeekDate.getFullYear() - 1);
          const fiftyTwoWeekPrices = await this.getHistoricalPriceForDate(stock.symbol, 'USD', fiftyTwoWeekDate);
          const fiftyTwoWeekStartPrice = fiftyTwoWeekPrices.length > 0 ? parseFloat(fiftyTwoWeekPrices[0].close?.toString() || '0') : 0;
          const fiftyTwoWeekChangePercent = fiftyTwoWeekStartPrice > 0 ? ((price - fiftyTwoWeekStartPrice) / fiftyTwoWeekStartPrice) * 100 : 0;
          
          // Prepare holdings entry
          const holdingEntry: InsertHoldingsUSD = {
            symbol: stock.symbol,
            company: stock.company,
            stockType: stock.stockType,
            rating: stock.rating,
            sector: stock.sector || null,
            quantity: stock.quantity?.toString() || '0',
            currentPrice: price.toString(),
            netAssetValue: netAssetValue.toString(),
            portfolioWeight: portfolioWeight.toString(),
            benchmarkWeight: benchmarkWeight.toString(),
            deltaWeight: deltaWeight.toString(),
            dailyChangePercent: currentPrice.regularMarketChangePercent?.toString() || '0',
            mtdChangePercent: mtdChangePercent.toString(),
            ytdChangePercent: ytdChangePercent.toString(),
            sixMonthChangePercent: sixMonthChangePercent.toString(),
            fiftyTwoWeekChangePercent: fiftyTwoWeekChangePercent.toString(),
            profitLossPercent: fiftyTwoWeekChangePercent.toString(), // Using 52-week change for P/L, could be adjusted based on purchase price
            dividendYield: '0' // Default to 0 since this data is often missing
          };
          
          holdingsData.push(holdingEntry);
        } catch (error) {
          console.error(`Error processing holdings for ${stock.symbol}:`, error);
        }
      }
      
      // 6. Clear existing holdings and insert new data
      await db.delete(holdingsUSD);
      if (holdingsData.length > 0) {
        await db.insert(holdingsUSD).values(holdingsData);
      }
      
      console.log(`Updated ${holdingsData.length} holdings for USD portfolio (including CASH)`);
      return holdingsData;
    } catch (error) {
      console.error('Error updating USD holdings:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for CAD portfolio holdings
   */
  async updateCADHoldings() {
    try {
      // 1. Get all symbols in CAD portfolio
      const portfolioStocks = await db.select().from(portfolioCAD);
      if (!portfolioStocks.length) {
        console.log('No stocks found in CAD portfolio');
        return [];
      }
      
      // 2. Get current prices for these symbols
      const currentPricesData = await db.select()
        .from(currentPrices)
        .where(eq(currentPrices.region, 'CAD'));
      
      // Create a map of current prices by symbol for easier lookup
      const priceMap = new Map();
      currentPricesData.forEach(price => {
        priceMap.set(price.symbol, price);
      });
      
      // 3. Get benchmark weights from XIC ETF holdings
      const xicHoldings = await db.select().from(etfHoldingsXIC);
      const benchmarkWeightMap = new Map();
      xicHoldings.forEach(holding => {
        // For CAD stocks, handle both with and without .TO suffix
        const symbol = holding.ticker;
        const baseSymbol = symbol.endsWith('.TO') ? symbol.slice(0, -3) : symbol;
        benchmarkWeightMap.set(symbol, parseFloat(holding.weight?.toString() || '0'));
        benchmarkWeightMap.set(baseSymbol, parseFloat(holding.weight?.toString() || '0'));
      });
      
      // 4. Calculate the total portfolio value (including CASH)
      let totalPortfolioValue = 0;
      const cashValue = await this.getCashBalance("CAD");
      
      for (const stock of portfolioStocks) {
        const currentPrice = priceMap.get(stock.symbol);
        if (currentPrice) {
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          totalPortfolioValue += price * quantity;
        }
      }
      
      // Add cash to total portfolio value
      totalPortfolioValue += cashValue;
      
      // 5. Calculate performance metrics and prepare holdings data
      const holdingsData: InsertHoldingsCAD[] = [];
      
      // First add the cash entry
      const cashEntry: InsertHoldingsCAD = {
        symbol: 'CASH',
        company: 'CASH',
        stockType: 'Cash',
        rating: '1',
        sector: null,
        quantity: '1',
        currentPrice: cashValue.toString(),
        netAssetValue: cashValue.toString(),
        portfolioWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        benchmarkWeight: '0',
        deltaWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        dailyChangePercent: '0',
        mtdChangePercent: '0',
        ytdChangePercent: '0',
        sixMonthChangePercent: '0',
        fiftyTwoWeekChangePercent: '0',
        profitLossPercent: '0',
        dividendYield: '0'
      };
      
      holdingsData.push(cashEntry);
      
      for (const stock of portfolioStocks) {
        try {
          const currentPrice = priceMap.get(stock.symbol);
          
          if (!currentPrice) {
            console.log(`No current price data found for ${stock.symbol}`);
            continue;
          }
          
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          const netAssetValue = price * quantity;
          const portfolioWeight = totalPortfolioValue > 0 ? (netAssetValue / totalPortfolioValue) * 100 : 0;
          
          // Handle benchmark weights for CAD stocks (with or without .TO suffix)
          let benchmarkWeight = benchmarkWeightMap.get(stock.symbol) || 0;
          // If not found, try with .TO suffix
          if (benchmarkWeight === 0 && !stock.symbol.endsWith('.TO')) {
            benchmarkWeight = benchmarkWeightMap.get(`${stock.symbol}.TO`) || 0;
          }
          
          const deltaWeight = portfolioWeight - benchmarkWeight;
          
          // Prepare historical prices query for this symbol
          const now = new Date();
          
          // Get month-to-date (MTD) historical data
          const mtdDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const mtdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'CAD', mtdDate);
          const mtdStartPrice = mtdPrices.length > 0 ? parseFloat(mtdPrices[0].close?.toString() || '0') : 0;
          const mtdChangePercent = mtdStartPrice > 0 ? ((price - mtdStartPrice) / mtdStartPrice) * 100 : 0;
          
          // Get year-to-date (YTD) historical data
          const ytdDate = new Date(now.getFullYear(), 0, 1);
          const ytdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'CAD', ytdDate);
          const ytdStartPrice = ytdPrices.length > 0 ? parseFloat(ytdPrices[0].close?.toString() || '0') : 0;
          const ytdChangePercent = ytdStartPrice > 0 ? ((price - ytdStartPrice) / ytdStartPrice) * 100 : 0;
          
          // Get six-month historical data
          const sixMonthDate = new Date();
          sixMonthDate.setMonth(sixMonthDate.getMonth() - 6);
          const sixMonthPrices = await this.getHistoricalPriceForDate(stock.symbol, 'CAD', sixMonthDate);
          const sixMonthStartPrice = sixMonthPrices.length > 0 ? parseFloat(sixMonthPrices[0].close?.toString() || '0') : 0;
          const sixMonthChangePercent = sixMonthStartPrice > 0 ? ((price - sixMonthStartPrice) / sixMonthStartPrice) * 100 : 0;
          
          // Get 52-week historical data
          const fiftyTwoWeekDate = new Date();
          fiftyTwoWeekDate.setFullYear(fiftyTwoWeekDate.getFullYear() - 1);
          const fiftyTwoWeekPrices = await this.getHistoricalPriceForDate(stock.symbol, 'CAD', fiftyTwoWeekDate);
          const fiftyTwoWeekStartPrice = fiftyTwoWeekPrices.length > 0 ? parseFloat(fiftyTwoWeekPrices[0].close?.toString() || '0') : 0;
          const fiftyTwoWeekChangePercent = fiftyTwoWeekStartPrice > 0 ? ((price - fiftyTwoWeekStartPrice) / fiftyTwoWeekStartPrice) * 100 : 0;
          
          // Prepare holdings entry
          const holdingEntry: InsertHoldingsCAD = {
            symbol: stock.symbol,
            company: stock.company,
            stockType: stock.stockType,
            rating: stock.rating,
            sector: stock.sector || null,
            quantity: stock.quantity?.toString() || '0',
            currentPrice: price.toString(),
            netAssetValue: netAssetValue.toString(),
            portfolioWeight: portfolioWeight.toString(),
            benchmarkWeight: benchmarkWeight.toString(),
            deltaWeight: deltaWeight.toString(),
            dailyChangePercent: currentPrice.regularMarketChangePercent?.toString() || '0',
            mtdChangePercent: mtdChangePercent.toString(),
            ytdChangePercent: ytdChangePercent.toString(),
            sixMonthChangePercent: sixMonthChangePercent.toString(),
            fiftyTwoWeekChangePercent: fiftyTwoWeekChangePercent.toString(),
            profitLossPercent: fiftyTwoWeekChangePercent.toString(), // Using 52-week change for P/L, could be adjusted based on purchase price
            dividendYield: '0' // Default to 0 since this data is often missing
          };
          
          holdingsData.push(holdingEntry);
        } catch (error) {
          console.error(`Error processing holdings for ${stock.symbol}:`, error);
        }
      }
      
      // 6. Clear existing holdings and insert new data
      await db.delete(holdingsCAD);
      if (holdingsData.length > 0) {
        await db.insert(holdingsCAD).values(holdingsData);
      }
      
      console.log(`Updated ${holdingsData.length} holdings for CAD portfolio (including CASH)`);
      return holdingsData;
    } catch (error) {
      console.error('Error updating CAD holdings:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for INTL portfolio holdings
   */
  async updateINTLHoldings() {
    try {
      // 1. Get all symbols in INTL portfolio
      const portfolioStocks = await db.select().from(portfolioINTL);
      if (!portfolioStocks.length) {
        console.log('No stocks found in INTL portfolio');
        return [];
      }
      
      // 2. Get current prices for these symbols
      const currentPricesData = await db.select()
        .from(currentPrices)
        .where(eq(currentPrices.region, 'INTL'));
      
      // Create a map of current prices by symbol for easier lookup
      const priceMap = new Map();
      currentPricesData.forEach(price => {
        priceMap.set(price.symbol, price);
      });
      
      // 3. Get benchmark weights from ACWX ETF holdings
      const acwxHoldings = await db.select().from(etfHoldingsACWX);
      const benchmarkWeightMap = new Map();
      acwxHoldings.forEach(holding => {
        benchmarkWeightMap.set(holding.ticker, parseFloat(holding.weight?.toString() || '0'));
      });
      
      // 4. Calculate the total portfolio value (including CASH)
      let totalPortfolioValue = 0;
      const cashValue = await this.getCashBalance("INTL");
      
      for (const stock of portfolioStocks) {
        const currentPrice = priceMap.get(stock.symbol);
        if (currentPrice) {
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          totalPortfolioValue += price * quantity;
        }
      }
      
      // Add cash to total portfolio value
      totalPortfolioValue += cashValue;
      
      // 5. Calculate performance metrics and prepare holdings data
      const holdingsData: InsertHoldingsINTL[] = [];
      
      // First add the cash entry
      const cashEntry: InsertHoldingsINTL = {
        symbol: 'CASH',
        company: 'CASH',
        stockType: 'Cash',
        rating: '1',
        sector: null,
        quantity: '1',
        currentPrice: cashValue.toString(),
        netAssetValue: cashValue.toString(),
        portfolioWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        benchmarkWeight: '0',
        deltaWeight: ((cashValue / totalPortfolioValue) * 100).toString(),
        dailyChangePercent: '0',
        mtdChangePercent: '0',
        ytdChangePercent: '0',
        sixMonthChangePercent: '0',
        fiftyTwoWeekChangePercent: '0',
        profitLossPercent: '0',
        dividendYield: '0'
      };
      
      holdingsData.push(cashEntry);
      
      for (const stock of portfolioStocks) {
        try {
          const currentPrice = priceMap.get(stock.symbol);
          
          if (!currentPrice) {
            console.log(`No current price data found for ${stock.symbol}`);
            continue;
          }
          
          const price = parseFloat(currentPrice.regularMarketPrice?.toString() || '0');
          const quantity = parseFloat(stock.quantity?.toString() || '0');
          const netAssetValue = price * quantity;
          const portfolioWeight = totalPortfolioValue > 0 ? (netAssetValue / totalPortfolioValue) * 100 : 0;
          const benchmarkWeight = benchmarkWeightMap.get(stock.symbol) || 0;
          const deltaWeight = portfolioWeight - benchmarkWeight;
          
          // Prepare historical prices query for this symbol
          const now = new Date();
          
          // Get month-to-date (MTD) historical data
          const mtdDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const mtdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'INTL', mtdDate);
          const mtdStartPrice = mtdPrices.length > 0 ? parseFloat(mtdPrices[0].close?.toString() || '0') : 0;
          const mtdChangePercent = mtdStartPrice > 0 ? ((price - mtdStartPrice) / mtdStartPrice) * 100 : 0;
          
          // Get year-to-date (YTD) historical data
          const ytdDate = new Date(now.getFullYear(), 0, 1);
          const ytdPrices = await this.getHistoricalPriceForDate(stock.symbol, 'INTL', ytdDate);
          const ytdStartPrice = ytdPrices.length > 0 ? parseFloat(ytdPrices[0].close?.toString() || '0') : 0;
          const ytdChangePercent = ytdStartPrice > 0 ? ((price - ytdStartPrice) / ytdStartPrice) * 100 : 0;
          
          // Get six-month historical data
          const sixMonthDate = new Date();
          sixMonthDate.setMonth(sixMonthDate.getMonth() - 6);
          const sixMonthPrices = await this.getHistoricalPriceForDate(stock.symbol, 'INTL', sixMonthDate);
          const sixMonthStartPrice = sixMonthPrices.length > 0 ? parseFloat(sixMonthPrices[0].close?.toString() || '0') : 0;
          const sixMonthChangePercent = sixMonthStartPrice > 0 ? ((price - sixMonthStartPrice) / sixMonthStartPrice) * 100 : 0;
          
          // Get 52-week historical data
          const fiftyTwoWeekDate = new Date();
          fiftyTwoWeekDate.setFullYear(fiftyTwoWeekDate.getFullYear() - 1);
          const fiftyTwoWeekPrices = await this.getHistoricalPriceForDate(stock.symbol, 'INTL', fiftyTwoWeekDate);
          const fiftyTwoWeekStartPrice = fiftyTwoWeekPrices.length > 0 ? parseFloat(fiftyTwoWeekPrices[0].close?.toString() || '0') : 0;
          const fiftyTwoWeekChangePercent = fiftyTwoWeekStartPrice > 0 ? ((price - fiftyTwoWeekStartPrice) / fiftyTwoWeekStartPrice) * 100 : 0;
          
          // Prepare holdings entry
          const holdingEntry: InsertHoldingsINTL = {
            symbol: stock.symbol,
            company: stock.company,
            stockType: stock.stockType,
            rating: stock.rating,
            sector: stock.sector || null,
            quantity: stock.quantity?.toString() || '0',
            currentPrice: price.toString(),
            netAssetValue: netAssetValue.toString(),
            portfolioWeight: portfolioWeight.toString(),
            benchmarkWeight: benchmarkWeight.toString(),
            deltaWeight: deltaWeight.toString(),
            dailyChangePercent: currentPrice.regularMarketChangePercent?.toString() || '0',
            mtdChangePercent: mtdChangePercent.toString(),
            ytdChangePercent: ytdChangePercent.toString(),
            sixMonthChangePercent: sixMonthChangePercent.toString(),
            fiftyTwoWeekChangePercent: fiftyTwoWeekChangePercent.toString(),
            profitLossPercent: fiftyTwoWeekChangePercent.toString(), // Using 52-week change for P/L, could be adjusted based on purchase price
            dividendYield: '0' // Default to 0 since this data is often missing
          };
          
          holdingsData.push(holdingEntry);
        } catch (error) {
          console.error(`Error processing holdings for ${stock.symbol}:`, error);
        }
      }
      
      // 6. Clear existing holdings and insert new data
      await db.delete(holdingsINTL);
      if (holdingsData.length > 0) {
        await db.insert(holdingsINTL).values(holdingsData);
      }
      
      console.log(`Updated ${holdingsData.length} holdings for INTL portfolio (including CASH)`);
      return holdingsData;
    } catch (error) {
      console.error('Error updating INTL holdings:', error);
      throw error;
    }
  }

  /**
   * Helper function to get historical price data for a specific date
   */
  private async getHistoricalPriceForDate(symbol: string, region: string, date: Date) {
    try {
      // Query for the closest price to the target date
      // Get the price on or after the target date
      const sql_date = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      const result = await db.query.historicalPrices.findMany({
        where: and(
          eq(sql.raw('symbol'), symbol),
          eq(sql.raw('region'), region),
          sql`date >= ${sql_date}`,
        ),
        orderBy: [sql.raw('date ASC')],
        limit: 1,
      });
      
      // If no price found after the date, try to get the last price before the date
      if (!result.length) {
        const beforeResult = await db.query.historicalPrices.findMany({
          where: and(
            eq(sql.raw('symbol'), symbol),
            eq(sql.raw('region'), region),
            sql`date < ${sql_date}`,
          ),
          orderBy: [sql.raw('date DESC')],
          limit: 1,
        });
        
        return beforeResult;
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting historical price for ${symbol} on ${date.toISOString().split('T')[0]}:`, error);
      return [];
    }
  }

  /**
   * Update all holdings tables
   */
  async updateAllHoldings() {
    try {
      console.log('Updating all portfolio holdings...');
      
      const results = {
        USD: { success: false, message: '', count: 0 },
        CAD: { success: false, message: '', count: 0 },
        INTL: { success: false, message: '', count: 0 }
      };
      
      try {
        const usdHoldings = await this.updateUSDHoldings();
        results.USD = { success: true, message: 'Updated successfully', count: usdHoldings.length };
      } catch (error) {
        results.USD = { success: false, message: error.message || 'Unknown error', count: 0 };
      }
      
      try {
        const cadHoldings = await this.updateCADHoldings();
        results.CAD = { success: true, message: 'Updated successfully', count: cadHoldings.length };
      } catch (error) {
        results.CAD = { success: false, message: error.message || 'Unknown error', count: 0 };
      }
      
      try {
        const intlHoldings = await this.updateINTLHoldings();
        results.INTL = { success: true, message: 'Updated successfully', count: intlHoldings.length };
      } catch (error) {
        results.INTL = { success: false, message: error.message || 'Unknown error', count: 0 };
      }
      
      // Log the total count
      const totalCount = results.USD.count + results.CAD.count + results.INTL.count;
      console.log(`Updated ${totalCount} total holdings across all portfolios (including CASH rows)`);
      
      return results;
    } catch (error) {
      console.error('Error updating all holdings:', error);
      throw error;
    }
  }
}

export const holdingsService = new HoldingsService();
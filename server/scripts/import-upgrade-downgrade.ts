import { storage } from '../db-storage';
import yahooFinance from 'yahoo-finance2';
import { sleep } from '../util';

/**
 * Import upgrade/downgrade history for a specific ticker
 * @param symbol Stock symbol
 * @param region Portfolio region (USD, CAD, INTL)
 */
export async function importUpgradeDowngradeHistory(symbol: string, region: string): Promise<void> {
  try {
    console.log(`Fetching upgrade/downgrade history for ${symbol} (${region})...`);
    
    // Fetch stock to ensure it exists in the portfolio
    const stock = await storage.getPortfolioStockBySymbol(symbol, region);
    if (!stock) {
      console.log(`Stock ${symbol} not found in ${region} portfolio.`);
      return;
    }
    
    // Delete existing data for this symbol
    await storage.deleteUpgradeDowngradeHistory(symbol, region);
    
    // Fetch upgrade/downgrade history from Yahoo Finance
    const apiSymbol = region === 'CAD' && !symbol.endsWith('.TO') ? `${symbol}.TO` : symbol;
    const result = await yahooFinance.recommendationsBySymbol(apiSymbol);
    
    if (!result.upgradeDowngradeHistory || result.upgradeDowngradeHistory.length === 0) {
      console.log(`No upgrade/downgrade history found for ${symbol}.`);
      return;
    }
    
    // Process and save the data
    const historyItems = result.upgradeDowngradeHistory.map(item => ({
      symbol,
      region,
      epochGradeDate: item.epochGradeDate.toString(),
      firm: item.firm,
      toGrade: item.toGrade,
      fromGrade: item.fromGrade,
      action: item.action
    }));
    
    await storage.bulkCreateUpgradeDowngradeHistory(historyItems);
    console.log(`Imported ${historyItems.length} upgrade/downgrade records for ${symbol}.`);
    
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Import upgrade/downgrade history for all stocks in a specific region
 * @param region Portfolio region (USD, CAD, INTL)
 */
export async function importRegionUpgradeDowngradeHistory(region: string): Promise<{
  processed: number;
  withData: number;
}> {
  try {
    console.log(`Fetching portfolio stocks for ${region}...`);
    const stocks = await storage.getPortfolioStocks(region);
    
    let processed = 0;
    let withData = 0;
    
    for (const stock of stocks) {
      try {
        processed++;
        console.log(`Processing ${stock.symbol} (${processed}/${stocks.length})...`);
        
        // Fetch upgrade/downgrade history from Yahoo Finance
        const apiSymbol = region === 'CAD' && !stock.symbol.endsWith('.TO') 
          ? `${stock.symbol}.TO` 
          : stock.symbol;
        
        const result = await yahooFinance.recommendationsBySymbol(apiSymbol);
        
        if (!result.upgradeDowngradeHistory || result.upgradeDowngradeHistory.length === 0) {
          console.log(`No upgrade/downgrade history found for ${stock.symbol}.`);
          continue;
        }
        
        // Delete existing data for this symbol
        await storage.deleteUpgradeDowngradeHistory(stock.symbol, region);
        
        // Process and save the data
        const historyItems = result.upgradeDowngradeHistory.map(item => ({
          symbol: stock.symbol,
          region,
          epochGradeDate: item.epochGradeDate.toString(),
          firm: item.firm,
          toGrade: item.toGrade,
          fromGrade: item.fromGrade,
          action: item.action
        }));
        
        await storage.bulkCreateUpgradeDowngradeHistory(historyItems);
        console.log(`Imported ${historyItems.length} upgrade/downgrade records for ${stock.symbol}.`);
        withData++;
        
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
      
      // Add delay to avoid rate limiting
      await sleep(1000);
    }
    
    return { processed, withData };
    
  } catch (error) {
    console.error(`Error importing upgrade/downgrade history for ${region}:`, error);
    throw error;
  }
}
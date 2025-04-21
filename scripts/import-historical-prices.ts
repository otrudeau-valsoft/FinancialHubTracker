import { storage } from '../server/storage';
import { historicalPriceService } from '../server/services/historical-price-service';
import yahooFinance from 'yahoo-finance2';
import { InsertHistoricalPrice } from '../shared/schema';
import { DateTime } from 'luxon';

/**
 * Fetch and import historical prices for all stocks in all portfolios
 */
async function importHistoricalPrices() {
  try {
    console.log('Starting historical price import for all portfolios...');
    
    // Import USD portfolio historical prices
    console.log('\n--- Importing historical prices for USD portfolio ---');
    const usdStocks = await storage.getPortfolioStocks('USD');
    console.log(`Found ${usdStocks.length} stocks in USD portfolio`);
    
    let usdSuccessCount = 0;
    for (const stock of usdStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
          stock.symbol,
          'USD',
          '1y',
          '1d'
        );
        
        if (success) {
          usdSuccessCount++;
          console.log(`✓ Successfully imported historical prices for ${stock.symbol}`);
        } else {
          console.log(`✗ Failed to import historical prices for ${stock.symbol}`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    console.log(`USD Portfolio: Imported historical prices for ${usdSuccessCount}/${usdStocks.length} stocks`);
    
    // Import CAD portfolio historical prices
    console.log('\n--- Importing historical prices for CAD portfolio ---');
    const cadStocks = await storage.getPortfolioStocks('CAD');
    console.log(`Found ${cadStocks.length} stocks in CAD portfolio`);
    
    let cadSuccessCount = 0;
    for (const stock of cadStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
          stock.symbol,
          'CAD',
          '1y',
          '1d'
        );
        
        if (success) {
          cadSuccessCount++;
          console.log(`✓ Successfully imported historical prices for ${stock.symbol}`);
        } else {
          console.log(`✗ Failed to import historical prices for ${stock.symbol}`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    console.log(`CAD Portfolio: Imported historical prices for ${cadSuccessCount}/${cadStocks.length} stocks`);
    
    // Import INTL portfolio historical prices
    console.log('\n--- Importing historical prices for INTL portfolio ---');
    const intlStocks = await storage.getPortfolioStocks('INTL');
    console.log(`Found ${intlStocks.length} stocks in INTL portfolio`);
    
    let intlSuccessCount = 0;
    for (const stock of intlStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
          stock.symbol,
          'INTL',
          '1y',
          '1d'
        );
        
        if (success) {
          intlSuccessCount++;
          console.log(`✓ Successfully imported historical prices for ${stock.symbol}`);
        } else {
          console.log(`✗ Failed to import historical prices for ${stock.symbol}`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    console.log(`INTL Portfolio: Imported historical prices for ${intlSuccessCount}/${intlStocks.length} stocks`);
    
    console.log('\n--- Import Summary ---');
    console.log(`USD Portfolio: ${usdSuccessCount}/${usdStocks.length} stocks`);
    console.log(`CAD Portfolio: ${cadSuccessCount}/${cadStocks.length} stocks`);
    console.log(`INTL Portfolio: ${intlSuccessCount}/${intlStocks.length} stocks`);
    console.log(`Total: ${usdSuccessCount + cadSuccessCount + intlSuccessCount}/${usdStocks.length + cadStocks.length + intlStocks.length} stocks`);
    
    console.log('\nHistorical price import complete!');
  } catch (error) {
    console.error('Error importing historical prices:', error);
  }
}

/**
 * Directly fetch and import historical prices using Yahoo Finance
 * This is an alternative implementation that bypasses the service
 */
async function directImportHistoricalPrices() {
  try {
    console.log('Starting direct historical price import for all portfolios...');
    
    // Import USD portfolio historical prices
    console.log('\n--- Importing historical prices for USD portfolio ---');
    const usdStocks = await storage.getPortfolioStocks('USD');
    console.log(`Found ${usdStocks.length} stocks in USD portfolio`);
    
    let usdSuccessCount = 0;
    for (const stock of usdStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        // Use Yahoo Finance directly
        const yahooSymbol = stock.symbol;
        const result = await yahooFinance.chart(yahooSymbol, {
          period1: DateTime.now().minus({ year: 1 }).toJSDate(),
          interval: '1d',
          includePrePost: false
        });
        
        if (!result.quotes || result.quotes.length === 0) {
          console.warn(`No historical data found for ${yahooSymbol}`);
          continue;
        }

        // Delete existing data
        await storage.deleteHistoricalPrices(stock.symbol, 'USD');
        
        // Map and store the data
        console.log(`Quote data example: ${JSON.stringify(result.quotes[0]).substring(0, 200)}`);
        
        const historicalPrices: InsertHistoricalPrice[] = result.quotes.map(quote => {
          // Handle date according to schema requirements (date column in PostgreSQL)
          let dateStr: string;
          
          if (quote.date) {
            // Format date as ISO string and take only the date part (YYYY-MM-DD)
            dateStr = new Date(quote.date).toISOString().split('T')[0];
          } else {
            console.warn(`Quote missing date field for ${stock.symbol}, skipping`);
            // Use a placeholder date as fallback (today's date as string)
            dateStr = new Date().toISOString().split('T')[0];
          }
          
          // Convert all numerical values to strings as required by schema
          return {
            symbol: stock.symbol,
            date: dateStr,
            open: quote.open !== null ? String(quote.open) : null,
            high: quote.high !== null ? String(quote.high) : null,
            low: quote.low !== null ? String(quote.low) : null,
            close: quote.close !== null ? String(quote.close) : "0", // Required field, defaults to "0"
            volume: quote.volume !== null ? String(quote.volume) : null,
            adjustedClose: quote.adjclose !== null ? String(quote.adjclose) : null,
            region: 'USD'
          };
        });
        
        // Store in database
        await storage.bulkCreateHistoricalPrices(historicalPrices);
        
        usdSuccessCount++;
        console.log(`✓ Successfully imported ${historicalPrices.length} historical prices for ${stock.symbol}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    
    console.log(`USD Portfolio: Imported historical prices for ${usdSuccessCount}/${usdStocks.length} stocks`);
    
    // Import CAD portfolio historical prices
    console.log('\n--- Importing historical prices for CAD portfolio ---');
    const cadStocks = await storage.getPortfolioStocks('CAD');
    console.log(`Found ${cadStocks.length} stocks in CAD portfolio`);
    
    let cadSuccessCount = 0;
    for (const stock of cadStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        // Use Yahoo Finance directly with Toronto Stock Exchange suffix
        const yahooSymbol = `${stock.symbol}.TO`;
        console.log(`Using Yahoo symbol: ${yahooSymbol}`);
        
        const result = await yahooFinance.chart(yahooSymbol, {
          period1: DateTime.now().minus({ year: 1 }).toJSDate(),
          interval: '1d',
          includePrePost: false
        });
        
        if (!result.quotes || result.quotes.length === 0) {
          console.warn(`No historical data found for ${yahooSymbol}`);
          continue;
        }

        // Delete existing data
        await storage.deleteHistoricalPrices(stock.symbol, 'CAD');
        
        // Map and store the data
        console.log(`Quote data example: ${JSON.stringify(result.quotes[0]).substring(0, 200)}`);
        
        const historicalPrices: InsertHistoricalPrice[] = result.quotes.map(quote => {
          // Handle date according to schema requirements (date column in PostgreSQL)
          let dateStr: string;
          
          if (quote.date) {
            // Format date as ISO string and take only the date part (YYYY-MM-DD)
            dateStr = new Date(quote.date).toISOString().split('T')[0];
          } else {
            console.warn(`Quote missing date field for ${stock.symbol}, skipping`);
            // Use a placeholder date as fallback (today's date as string)
            dateStr = new Date().toISOString().split('T')[0];
          }
          
          // Convert all numerical values to strings as required by schema
          return {
            symbol: stock.symbol,
            date: dateStr,
            open: quote.open !== null ? String(quote.open) : null,
            high: quote.high !== null ? String(quote.high) : null,
            low: quote.low !== null ? String(quote.low) : null,
            close: quote.close !== null ? String(quote.close) : "0", // Required field, defaults to "0"
            volume: quote.volume !== null ? String(quote.volume) : null,
            adjustedClose: quote.adjclose !== null ? String(quote.adjclose) : null,
            region: 'CAD'
          };
        });
        
        // Store in database
        await storage.bulkCreateHistoricalPrices(historicalPrices);
        
        cadSuccessCount++;
        console.log(`✓ Successfully imported ${historicalPrices.length} historical prices for ${stock.symbol}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    
    console.log(`CAD Portfolio: Imported historical prices for ${cadSuccessCount}/${cadStocks.length} stocks`);
    
    // Import INTL portfolio historical prices
    console.log('\n--- Importing historical prices for INTL portfolio ---');
    const intlStocks = await storage.getPortfolioStocks('INTL');
    console.log(`Found ${intlStocks.length} stocks in INTL portfolio`);
    
    let intlSuccessCount = 0;
    for (const stock of intlStocks) {
      console.log(`Processing ${stock.symbol}...`);
      try {
        // For international stocks, we might need different suffixes
        // Check if the symbol already has a suffix
        let yahooSymbol = stock.symbol;
        if (!yahooSymbol.includes('.')) {
          // Default to London Stock Exchange if no exchange suffix
          yahooSymbol = `${stock.symbol}.L`;
        }
        console.log(`Using Yahoo symbol: ${yahooSymbol}`);
        
        const result = await yahooFinance.chart(yahooSymbol, {
          period1: DateTime.now().minus({ year: 1 }).toJSDate(),
          interval: '1d',
          includePrePost: false
        });
        
        if (!result.quotes || result.quotes.length === 0) {
          console.warn(`No historical data found for ${yahooSymbol}`);
          continue;
        }

        // Delete existing data
        await storage.deleteHistoricalPrices(stock.symbol, 'INTL');
        
        // Map and store the data
        console.log(`Quote data example: ${JSON.stringify(result.quotes[0]).substring(0, 200)}`);
        
        const historicalPrices: InsertHistoricalPrice[] = result.quotes.map(quote => {
          // Handle date according to schema requirements (date column in PostgreSQL)
          let dateStr: string;
          
          if (quote.date) {
            // Format date as ISO string and take only the date part (YYYY-MM-DD)
            dateStr = new Date(quote.date).toISOString().split('T')[0];
          } else {
            console.warn(`Quote missing date field for ${stock.symbol}, skipping`);
            // Use a placeholder date as fallback (today's date as string)
            dateStr = new Date().toISOString().split('T')[0];
          }
          
          // Convert all numerical values to strings as required by schema
          return {
            symbol: stock.symbol,
            date: dateStr,
            open: quote.open !== null ? String(quote.open) : null,
            high: quote.high !== null ? String(quote.high) : null,
            low: quote.low !== null ? String(quote.low) : null,
            close: quote.close !== null ? String(quote.close) : "0", // Required field, defaults to "0"
            volume: quote.volume !== null ? String(quote.volume) : null,
            adjustedClose: quote.adjclose !== null ? String(quote.adjclose) : null,
            region: 'INTL'
          };
        });
        
        // Store in database
        await storage.bulkCreateHistoricalPrices(historicalPrices);
        
        intlSuccessCount++;
        console.log(`✓ Successfully imported ${historicalPrices.length} historical prices for ${stock.symbol}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
      }
    }
    
    console.log(`INTL Portfolio: Imported historical prices for ${intlSuccessCount}/${intlStocks.length} stocks`);
    
    // Print summary
    console.log('\n--- Import Summary ---');
    console.log(`USD Portfolio: ${usdSuccessCount}/${usdStocks.length} stocks`);
    console.log(`CAD Portfolio: ${cadSuccessCount}/${cadStocks.length} stocks`);
    console.log(`INTL Portfolio: ${intlSuccessCount}/${intlStocks.length} stocks`);
    console.log(`Total: ${usdSuccessCount + cadSuccessCount + intlSuccessCount}/${usdStocks.length + cadStocks.length + intlStocks.length} stocks`);
    
    console.log('\nDirect historical price import complete!');
  } catch (error) {
    console.error('Error during direct import of historical prices:', error);
  }
}

// Choose which implementation to use
// importHistoricalPrices().catch(console.error);
directImportHistoricalPrices().catch(console.error);
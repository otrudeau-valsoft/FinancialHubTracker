import { storage } from '../server/storage';
import { historicalPriceService } from '../server/services/historical-price-service';

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

// Run the import function
importHistoricalPrices().catch(console.error);
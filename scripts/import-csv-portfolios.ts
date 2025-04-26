import fs from 'fs';
import path from 'path';
import papa from 'papaparse';
import { storage } from '../server/db-storage';

/**
 * Clean a string value from the CSV
 */
function cleanValue(value: string): string | null {
  if (!value || value === '' || value === '#N/A') {
    return null;
  }
  // Remove non-breaking spaces, dollar signs, commas
  return value.replace(/\u00A0/g, ' ').replace(/\$/g, '').replace(/,/g, '').trim();
}

/**
 * Parse a number from a string, handle null values
 */
function parseNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Import USD portfolio
 */
async function importUSPortfolio() {
  console.log('Importing USD portfolio...');
  const filePath = path.join(__dirname, '../attached_assets/USD-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const results = papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (results.data && Array.isArray(results.data)) {
    // Delete existing stocks
    console.log('Clearing existing USD portfolio data...');
    try {
      // Get all existing stocks
      const existingStocks = await storage.getPortfolioStocks('USD');
      // Delete each stock
      for (const stock of existingStocks) {
        await storage.deletePortfolioStock(stock.id, 'USD');
      }
      console.log(`Deleted ${existingStocks.length} existing USD stocks`);
    } catch (error) {
      console.error('Error clearing USD portfolio:', error);
    }
    
    // Import new data
    const stocks: any[] = [];
    
    for (const row of results.data as any[]) {
      if (!row.SYM) continue; // Skip empty rows
      
      const stock = {
        symbol: cleanValue(row.SYM) || '',
        company: cleanValue(row.Company) || '',
        stockType: cleanValue(row['Stock Type']) || 'Comp',
        rating: cleanValue(row['Stock Rating']) || '1',
        sector: cleanValue(row.Sector) || 'Technology',
        quantity: parseNumber(cleanValue(row.Qty)) || 0,
        price: parseNumber(cleanValue(row.Price)) || 0,
        pbr: parseNumber(cleanValue(row.PBR)) || null
      };
      
      stocks.push(stock);
    }
    
    console.log(`Importing ${stocks.length} USD stocks...`);
    await storage.bulkCreatePortfolioStocks(stocks, 'USD');
    console.log('USD portfolio import completed.');
    return stocks.length;
  }
  
  return 0;
}

/**
 * Import CAD portfolio
 */
async function importCADPortfolio() {
  console.log('Importing CAD portfolio...');
  const filePath = path.join(__dirname, '../attached_assets/CAD-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const results = papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (results.data && Array.isArray(results.data)) {
    // Delete existing stocks
    console.log('Clearing existing CAD portfolio data...');
    try {
      // Get all existing stocks
      const existingStocks = await storage.getPortfolioStocks('CAD');
      // Delete each stock
      for (const stock of existingStocks) {
        await storage.deletePortfolioStock(stock.id, 'CAD');
      }
      console.log(`Deleted ${existingStocks.length} existing CAD stocks`);
    } catch (error) {
      console.error('Error clearing CAD portfolio:', error);
    }
    
    // Import new data
    const stocks: any[] = [];
    
    for (const row of results.data as any[]) {
      if (!row.SYM) continue; // Skip empty rows
      
      // Add .TO suffix for Canadian stocks if not already present
      let symbol = cleanValue(row.SYM) || '';
      if (!symbol.includes('.') && symbol !== 'ZGLD') {
        symbol = `${symbol}.TO`;
      }
      
      const stock = {
        symbol: symbol,
        company: cleanValue(row.Company) || '',
        stockType: cleanValue(row['Stock Type']) || 'Comp',
        rating: cleanValue(row['Stock Rating']) || '1',
        sector: cleanValue(row.Sector) || 'Technology',
        quantity: parseNumber(cleanValue(row.QTY)) || 0,
        price: parseNumber(cleanValue(row.PRICE)) || 0,
        pbr: parseNumber(cleanValue(row.PBR)) || null
      };
      
      stocks.push(stock);
    }
    
    console.log(`Importing ${stocks.length} CAD stocks...`);
    await storage.bulkCreatePortfolioStocks(stocks, 'CAD');
    console.log('CAD portfolio import completed.');
    return stocks.length;
  }
  
  return 0;
}

/**
 * Import INTL portfolio
 */
async function importINTLPortfolio() {
  console.log('Importing INTL portfolio...');
  const filePath = path.join(__dirname, '../attached_assets/INTL-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const results = papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (results.data && Array.isArray(results.data)) {
    // Delete existing stocks
    console.log('Clearing existing INTL portfolio data...');
    try {
      // Get all existing stocks
      const existingStocks = await storage.getPortfolioStocks('INTL');
      // Delete each stock
      for (const stock of existingStocks) {
        await storage.deletePortfolioStock(stock.id, 'INTL');
      }
      console.log(`Deleted ${existingStocks.length} existing INTL stocks`);
    } catch (error) {
      console.error('Error clearing INTL portfolio:', error);
    }
    
    // Import new data
    const stocks: any[] = [];
    
    for (const row of results.data as any[]) {
      if (!row.SYM) continue; // Skip empty rows
      
      const stock = {
        symbol: cleanValue(row.SYM) || '',
        company: cleanValue(row.Company) || '',
        stockType: cleanValue(row['Stock Type']) || 'Comp',
        rating: cleanValue(row['Stock Rating']) || '1',
        sector: cleanValue(row.Sector) || 'Technology',
        quantity: parseNumber(cleanValue(row.Qty)) || 0,
        price: parseNumber(cleanValue(row.Price)) || 0,
        pbr: parseNumber(cleanValue(row.PBR)) || null
      };
      
      stocks.push(stock);
    }
    
    console.log(`Importing ${stocks.length} INTL stocks...`);
    await storage.bulkCreatePortfolioStocks(stocks, 'INTL');
    console.log('INTL portfolio import completed.');
    return stocks.length;
  }
  
  return 0;
}

/**
 * Main function to run all importers
 */
async function main() {
  try {
    console.log('Starting portfolio import from CSV files...');
    const usdStocks = await importUSPortfolio();
    const cadStocks = await importCADPortfolio();
    const intlStocks = await importINTLPortfolio();
    
    console.log('-----------------------------------');
    console.log('Portfolio import summary:');
    console.log(`USD: ${usdStocks} stocks imported`);
    console.log(`CAD: ${cadStocks} stocks imported`);
    console.log(`INTL: ${intlStocks} stocks imported`);
    console.log(`Total: ${usdStocks + cadStocks + intlStocks} stocks imported`);
    console.log('-----------------------------------');
    
    console.log('All portfolios imported successfully!');
  } catch (error) {
    console.error('Error importing portfolios:', error);
  } finally {
    process.exit(0);
  }
}

// Run the main function
main();
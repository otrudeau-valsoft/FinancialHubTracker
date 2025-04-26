/**
 * Portfolio CSV Import Script
 * 
 * This script imports portfolio data from CSV files into the new regional portfolio tables.
 * It supports USD, CAD, and INTL portfolios and handles specific data needs for each region.
 */

import fs from 'fs';
import path from 'path';
import papa from 'papaparse';
import { db } from '../server/db';
import { 
  portfolioUSD, 
  portfolioCAD, 
  portfolioINTL,
  dataUpdateLogs
} from '../shared/schema';
import { eq } from 'drizzle-orm';
import { createAdaptedDataUpdateLog } from '../server/adapters/data-management-adapter';

/**
 * Clean a string value from the CSV
 */
function cleanValue(value: string | null): string | null {
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
 * Log an update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', region: string, message: string) {
  try {
    const logEntry = createAdaptedDataUpdateLog(type, status, region, message);
    await db.insert(dataUpdateLogs).values(logEntry);
    console.log(`[${status}] ${region}: ${message}`);
  } catch (error) {
    console.error('Error logging update:', error);
  }
}

/**
 * Import USD portfolio
 */
async function importUSPortfolio() {
  const region = 'USD';
  console.log(`Importing ${region} portfolio...`);
  await logUpdate('portfolio_import', 'In Progress', region, 'Starting portfolio import');
  
  try {
    const filePath = path.join(__dirname, '../attached_assets/USD-portfolio.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const results = papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (results.data && Array.isArray(results.data)) {
      // Delete existing stocks
      console.log(`Clearing existing ${region} portfolio data...`);
      await db.delete(portfolioUSD);
      
      // Import new data
      const stocks = [];
      
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
          pbr: parseNumber(cleanValue(row.PBR)),
          nextEarningsDate: cleanValue(row['Next Earnings']),
          // Additional fields will be calculated or updated separately
        };
        
        stocks.push(stock);
      }
      
      console.log(`Importing ${stocks.length} ${region} stocks...`);
      
      if (stocks.length > 0) {
        await db.insert(portfolioUSD).values(stocks);
      }
      
      await logUpdate('portfolio_import', 'Success', region, `Imported ${stocks.length} portfolio stocks`);
      console.log(`${region} portfolio import completed.`);
      return stocks.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error importing ${region} portfolio:`, error);
    await logUpdate('portfolio_import', 'Error', region, `Import error: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Import CAD portfolio
 */
async function importCADPortfolio() {
  const region = 'CAD';
  console.log(`Importing ${region} portfolio...`);
  await logUpdate('portfolio_import', 'In Progress', region, 'Starting portfolio import');
  
  try {
    const filePath = path.join(__dirname, '../attached_assets/CAD-portfolio.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const results = papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (results.data && Array.isArray(results.data)) {
      // Delete existing stocks
      console.log(`Clearing existing ${region} portfolio data...`);
      await db.delete(portfolioCAD);
      
      // Import new data
      const stocks = [];
      
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
          pbr: parseNumber(cleanValue(row.PBR)),
          nextEarningsDate: cleanValue(row['Next Earnings']),
          // Additional fields will be calculated or updated separately
        };
        
        stocks.push(stock);
      }
      
      console.log(`Importing ${stocks.length} ${region} stocks...`);
      
      if (stocks.length > 0) {
        await db.insert(portfolioCAD).values(stocks);
      }
      
      await logUpdate('portfolio_import', 'Success', region, `Imported ${stocks.length} portfolio stocks`);
      console.log(`${region} portfolio import completed.`);
      return stocks.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error importing ${region} portfolio:`, error);
    await logUpdate('portfolio_import', 'Error', region, `Import error: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Import INTL portfolio
 */
async function importINTLPortfolio() {
  const region = 'INTL';
  console.log(`Importing ${region} portfolio...`);
  await logUpdate('portfolio_import', 'In Progress', region, 'Starting portfolio import');
  
  try {
    const filePath = path.join(__dirname, '../attached_assets/INTL-portfolio.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const results = papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (results.data && Array.isArray(results.data)) {
      // Delete existing stocks
      console.log(`Clearing existing ${region} portfolio data...`);
      await db.delete(portfolioINTL);
      
      // Import new data
      const stocks = [];
      
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
          pbr: parseNumber(cleanValue(row.PBR)),
          nextEarningsDate: cleanValue(row['Next Earnings']),
          // Additional fields will be calculated or updated separately
        };
        
        stocks.push(stock);
      }
      
      console.log(`Importing ${stocks.length} ${region} stocks...`);
      
      if (stocks.length > 0) {
        await db.insert(portfolioINTL).values(stocks);
      }
      
      await logUpdate('portfolio_import', 'Success', region, `Imported ${stocks.length} portfolio stocks`);
      console.log(`${region} portfolio import completed.`);
      return stocks.length;
    }
    
    return 0;
  } catch (error) {
    console.error(`Error importing ${region} portfolio:`, error);
    await logUpdate('portfolio_import', 'Error', region, `Import error: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Validate that required CSV files exist
 */
function validateCSVFiles(): boolean {
  const requiredFiles = [
    'USD-portfolio.csv',
    'CAD-portfolio.csv',
    'INTL-portfolio.csv'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '../attached_assets', file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing required file: ${file}`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * Main function to run all importers
 */
async function main() {
  console.log('Starting portfolio import from CSV files...');
  
  if (!validateCSVFiles()) {
    console.error('Missing required CSV files. Import aborted.');
    process.exit(1);
  }
  
  try {
    await logUpdate('portfolio_import', 'In Progress', 'ALL', 'Starting import for all portfolios');
    
    const usdStocks = await importUSPortfolio();
    const cadStocks = await importCADPortfolio();
    const intlStocks = await importINTLPortfolio();
    
    const totalStocks = usdStocks + cadStocks + intlStocks;
    
    console.log('-----------------------------------');
    console.log('Portfolio import summary:');
    console.log(`USD: ${usdStocks} stocks imported`);
    console.log(`CAD: ${cadStocks} stocks imported`);
    console.log(`INTL: ${intlStocks} stocks imported`);
    console.log(`Total: ${totalStocks} stocks imported`);
    console.log('-----------------------------------');
    
    await logUpdate('portfolio_import', 'Success', 'ALL', `Completed import of ${totalStocks} stocks across all portfolios`);
    console.log('All portfolios imported successfully!');
  } catch (error) {
    console.error('Error importing portfolios:', error);
    await logUpdate('portfolio_import', 'Error', 'ALL', `Import failed: ${(error as Error).message}`);
  } finally {
    // Close the database connection
    await db.$pool.end();
    process.exit(0);
  }
}

// Run the main function
main();
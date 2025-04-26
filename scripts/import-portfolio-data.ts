/**
 * Portfolio CSV Import Script
 * 
 * This script imports portfolio data from CSV files into the regional portfolio tables.
 * It supports USD, CAD, and INTL portfolios and handles specific data needs for each region.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { 
  portfolioUSD, 
  portfolioCAD, 
  portfolioINTL,
  dataUpdateLogs
} from '../shared/schema';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean a string value from the CSV
 */
function cleanValue(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  value = value.trim();
  if (value === '' || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'null' || value === '#N/A') {
    return null;
  }
  return value;
}

/**
 * Parse a number from a string, handle null values
 */
function parseNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  
  // Handle special values
  if (value.includes('$')) {
    // Extract the number from dollar format (e.g., "$ 10.5")
    const numericPart = value.replace(/[$,\s]/g, '').trim();
    if (numericPart === '' || numericPart.toLowerCase() === 'n/a') return null;
    const num = parseFloat(numericPart);
    return isNaN(num) ? null : num;
  }
  
  // Handle regular numeric values
  const cleaned = value.replace(/[,$%\s]/g, '').trim();
  if (cleaned === '' || cleaned.toLowerCase() === 'n/a') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Log an update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', region: string, message: string) {
  try {
    await db.insert(dataUpdateLogs).values({
      type,
      status,
      timestamp: new Date(),
      details: message,
      region,
      message
    });
    console.log(`[${status}] ${region}: ${message}`);
  } catch (error) {
    console.error('Error logging update:', error);
  }
}

/**
 * Import USD portfolio
 */
async function importUSPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/USD-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('USD portfolio CSV file not found:', filePath);
    await logUpdate('portfolio_import', 'Error', 'USD', 'CSV file not found');
    return 0;
  }
  
  try {
    await logUpdate('portfolio_import', 'In Progress', 'USD', 'Starting USD portfolio import');
    console.log(`Importing USD portfolio from ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in USD CSV`);
    
    // Clear existing data
    await db.delete(portfolioUSD);
    
    let importCount = 0;
    for (const record of records) {
      // Extract and clean data
      const symbol = cleanValue(record.SYM) || '';
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector);
      const quantity = parseNumber(record.QTY) || 0;
      const price = parseNumber(record.PRICE) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      if (!symbol || symbol.trim() === '') {
        console.log('Skipping record with empty symbol');
        continue;
      }
      
      // Insert into the database
      await db.insert(portfolioUSD).values({
        symbol,
        company,
        stockType,
        rating,
        sector,
        quantity,
        price,
        pbr,
        nextEarningsDate
      });
      
      importCount++;
    }
    
    await logUpdate(
      'portfolio_import',
      'Success',
      'USD',
      `Imported ${importCount} USD portfolio items`
    );
    
    console.log(`Successfully imported ${importCount} USD portfolio items`);
    return importCount;
  } catch (error) {
    console.error('Error importing USD portfolio:', error);
    await logUpdate(
      'portfolio_import',
      'Error',
      'USD',
      `Error importing portfolio: ${(error as Error).message}`
    );
    return 0;
  }
}

/**
 * Import CAD portfolio
 */
async function importCADPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/CAD-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('CAD portfolio CSV file not found:', filePath);
    await logUpdate('portfolio_import', 'Error', 'CAD', 'CSV file not found');
    return 0;
  }
  
  try {
    await logUpdate('portfolio_import', 'In Progress', 'CAD', 'Starting CAD portfolio import');
    console.log(`Importing CAD portfolio from ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in CAD CSV`);
    
    // Clear existing data
    await db.delete(portfolioCAD);
    
    let importCount = 0;
    for (const record of records) {
      // Extract and clean data
      let symbol = cleanValue(record.SYM) || '';
      
      // Add .TO suffix for Canadian stocks if not already present and not ETFs or Cash
      if (symbol && !symbol.includes('.') && 
          record['Stock Type'] !== 'ETF' && 
          record['Stock Type'] !== 'Cash') {
        symbol = `${symbol}.TO`;
      }
      
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector);
      const quantity = parseNumber(record.QTY) || 0;
      const price = parseNumber(record.PRICE) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      if (!symbol || symbol.trim() === '') {
        console.log('Skipping record with empty symbol');
        continue;
      }
      
      // Insert into the database
      await db.insert(portfolioCAD).values({
        symbol,
        company,
        stockType,
        rating,
        sector,
        quantity,
        price,
        pbr,
        nextEarningsDate
      });
      
      importCount++;
    }
    
    await logUpdate(
      'portfolio_import',
      'Success',
      'CAD',
      `Imported ${importCount} CAD portfolio items`
    );
    
    console.log(`Successfully imported ${importCount} CAD portfolio items`);
    return importCount;
  } catch (error) {
    console.error('Error importing CAD portfolio:', error);
    await logUpdate(
      'portfolio_import',
      'Error',
      'CAD',
      `Error importing portfolio: ${(error as Error).message}`
    );
    return 0;
  }
}

/**
 * Import INTL portfolio
 */
async function importINTLPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/INTL-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('INTL portfolio CSV file not found:', filePath);
    await logUpdate('portfolio_import', 'Error', 'INTL', 'CSV file not found');
    return 0;
  }
  
  try {
    await logUpdate('portfolio_import', 'In Progress', 'INTL', 'Starting INTL portfolio import');
    console.log(`Importing INTL portfolio from ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in INTL CSV`);
    
    // Clear existing data
    await db.delete(portfolioINTL);
    
    let importCount = 0;
    for (const record of records) {
      // Extract and clean data
      const symbol = cleanValue(record.SYM) || '';
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector);
      const quantity = parseNumber(record.QTY) || 0;
      const price = parseNumber(record.PRICE) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      if (!symbol || symbol.trim() === '') {
        console.log('Skipping record with empty symbol');
        continue;
      }
      
      // Insert into the database
      await db.insert(portfolioINTL).values({
        symbol,
        company,
        stockType,
        rating,
        sector,
        quantity,
        price,
        pbr,
        nextEarningsDate
      });
      
      importCount++;
    }
    
    await logUpdate(
      'portfolio_import',
      'Success',
      'INTL',
      `Imported ${importCount} INTL portfolio items`
    );
    
    console.log(`Successfully imported ${importCount} INTL portfolio items`);
    return importCount;
  } catch (error) {
    console.error('Error importing INTL portfolio:', error);
    await logUpdate(
      'portfolio_import',
      'Error',
      'INTL',
      `Error importing portfolio: ${(error as Error).message}`
    );
    return 0;
  }
}

/**
 * Validate that required CSV files exist
 */
function validateCSVFiles(): boolean {
  const usdFile = path.join(__dirname, '../attached_assets/USD-portfolio.csv');
  const cadFile = path.join(__dirname, '../attached_assets/CAD-portfolio.csv');
  const intlFile = path.join(__dirname, '../attached_assets/INTL-portfolio.csv');
  
  let allFilesExist = true;
  
  if (!fs.existsSync(usdFile)) {
    console.error('USD portfolio CSV file not found:', usdFile);
    allFilesExist = false;
  }
  
  if (!fs.existsSync(cadFile)) {
    console.error('CAD portfolio CSV file not found:', cadFile);
    allFilesExist = false;
  }
  
  if (!fs.existsSync(intlFile)) {
    console.error('INTL portfolio CSV file not found:', intlFile);
    allFilesExist = false;
  }
  
  return allFilesExist;
}

/**
 * Main function to run all importers
 */
async function main() {
  console.log('Starting portfolio import...');
  
  try {
    await logUpdate('portfolio_import', 'In Progress', 'ALL', 'Starting import for all portfolios');
    
    // Validate that all required CSV files exist
    if (!validateCSVFiles()) {
      await logUpdate('portfolio_import', 'Error', 'ALL', 'One or more CSV files are missing');
      console.error('Import aborted: One or more CSV files are missing');
      return;
    }
    
    // Import all three regional portfolios
    const usdCount = await importUSPortfolio();
    const cadCount = await importCADPortfolio();
    const intlCount = await importINTLPortfolio();
    
    const totalCount = usdCount + cadCount + intlCount;
    
    console.log('-----------------------------------');
    console.log('Portfolio import summary:');
    console.log(`USD: ${usdCount} items imported`);
    console.log(`CAD: ${cadCount} items imported`);
    console.log(`INTL: ${intlCount} items imported`);
    console.log(`Total: ${totalCount} items imported`);
    console.log('-----------------------------------');
    
    await logUpdate(
      'portfolio_import', 
      'Success', 
      'ALL', 
      `Imported ${totalCount} portfolio items across all regions`
    );
    
    console.log('Portfolio import completed.');
  } catch (error) {
    console.error('Error importing portfolios:', error);
    await logUpdate('portfolio_import', 'Error', 'ALL', `Import failed: ${(error as Error).message}`);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the main function
main();
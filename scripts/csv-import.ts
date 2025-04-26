/**
 * CSV Import Script for Portfolio Data
 * 
 * This script imports portfolio data from CSV files into the database tables.
 * It's designed to handle the specific CSV format provided in the attached_assets folder.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to clean values
function cleanValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  value = value.trim();
  if (value === '' || value.toLowerCase() === 'n/a' || value === '#N/A') {
    return null;
  }
  return value;
}

// Helper function to parse numbers
function parseNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  // Replace common formatting characters
  const cleaned = value.replace(/[\$,\s%]/g, '').trim();
  if (cleaned === '' || cleaned.toLowerCase() === 'n/a') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Log progress
function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Import USD portfolio
async function importUSDPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/USD-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('USD portfolio file not found:', filePath);
    return;
  }
  
  logProgress('Importing USD portfolio data...');
  
  try {
    // Read and parse CSV
    const content = fs.readFileSync(filePath, 'utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    logProgress(`Found ${records.length} records in USD portfolio`);
    
    // Clear existing data
    await db.execute(sql`DELETE FROM "portfolio_USD"`);
    
    // Insert records
    let importCount = 0;
    
    for (const record of records) {
      const symbol = cleanValue(record.SYM);
      if (!symbol) {
        logProgress(`Skipping record with empty symbol: ${JSON.stringify(record)}`);
        continue;
      }
      
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector) || 'Technology';
      const quantity = parseNumber(record.Qty) || 0;
      const price = parseNumber(record.Price) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      try {
        await db.execute(sql`
          INSERT INTO "portfolio_USD" 
          (symbol, company, stock_type, rating, sector, quantity, price, pbr, next_earnings_date)
          VALUES (${symbol}, ${company}, ${stockType}, ${rating}, ${sector}, ${quantity}, ${price}, ${pbr}, ${nextEarningsDate})
        `);
        importCount++;
      } catch (err) {
        console.error(`Error inserting record ${symbol}:`, err);
      }
    }
    
    logProgress(`Successfully imported ${importCount} USD portfolio records`);
    return importCount;
  } catch (err) {
    console.error('Error importing USD portfolio:', err);
    return 0;
  }
}

// Import CAD portfolio
async function importCADPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/CAD-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('CAD portfolio file not found:', filePath);
    return;
  }
  
  logProgress('Importing CAD portfolio data...');
  
  try {
    // Read and parse CSV
    const content = fs.readFileSync(filePath, 'utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    logProgress(`Found ${records.length} records in CAD portfolio`);
    
    // Clear existing data
    await db.execute(sql`DELETE FROM "portfolio_CAD"`);
    
    // Insert records
    let importCount = 0;
    
    for (const record of records) {
      let symbol = cleanValue(record.SYM);
      if (!symbol) {
        logProgress(`Skipping record with empty symbol: ${JSON.stringify(record)}`);
        continue;
      }
      
      // Add .TO suffix for Canadian stocks if not already present
      if (!symbol.includes('.') && 
          record['Stock Type'] !== 'ETF' && 
          record['Stock Type'] !== 'Cash') {
        symbol = `${symbol}.TO`;
      }
      
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector) || 'Technology';
      const quantity = parseNumber(record.QTY) || 0;
      const price = parseNumber(record.PRICE) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      try {
        await db.execute(sql`
          INSERT INTO "portfolio_CAD" 
          (symbol, company, stock_type, rating, sector, quantity, price, pbr, next_earnings_date)
          VALUES (${symbol}, ${company}, ${stockType}, ${rating}, ${sector}, ${quantity}, ${price}, ${pbr}, ${nextEarningsDate})
        `);
        importCount++;
      } catch (err) {
        console.error(`Error inserting record ${symbol}:`, err);
      }
    }
    
    logProgress(`Successfully imported ${importCount} CAD portfolio records`);
    return importCount;
  } catch (err) {
    console.error('Error importing CAD portfolio:', err);
    return 0;
  }
}

// Import INTL portfolio
async function importINTLPortfolio() {
  const filePath = path.join(__dirname, '../attached_assets/INTL-portfolio.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error('INTL portfolio file not found:', filePath);
    return;
  }
  
  logProgress('Importing INTL portfolio data...');
  
  try {
    // Read and parse CSV
    const content = fs.readFileSync(filePath, 'utf8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    logProgress(`Found ${records.length} records in INTL portfolio`);
    
    // Clear existing data
    await db.execute(sql`DELETE FROM "portfolio_INTL"`);
    
    // Insert records
    let importCount = 0;
    
    for (const record of records) {
      const symbol = cleanValue(record.SYM);
      if (!symbol) {
        logProgress(`Skipping record with empty symbol: ${JSON.stringify(record)}`);
        continue;
      }
      
      const company = cleanValue(record.Company) || symbol;
      const stockType = cleanValue(record['Stock Type']) || 'Comp';
      const rating = cleanValue(record['Stock Rating']) || '1';
      const sector = cleanValue(record.Sector) || 'Technology';
      const quantity = parseNumber(record.QTY) || 0;
      const price = parseNumber(record.Price) || 0;
      const pbr = parseNumber(record.PBR);
      const nextEarningsDate = cleanValue(record['Next Earnings']);
      
      try {
        await db.execute(sql`
          INSERT INTO "portfolio_INTL" 
          (symbol, company, stock_type, rating, sector, quantity, price, pbr, next_earnings_date)
          VALUES (${symbol}, ${company}, ${stockType}, ${rating}, ${sector}, ${quantity}, ${price}, ${pbr}, ${nextEarningsDate})
        `);
        importCount++;
      } catch (err) {
        console.error(`Error inserting record ${symbol}:`, err);
      }
    }
    
    logProgress(`Successfully imported ${importCount} INTL portfolio records`);
    return importCount;
  } catch (err) {
    console.error('Error importing INTL portfolio:', err);
    return 0;
  }
}

// Main function
async function main() {
  logProgress('Starting portfolio import process...');
  
  try {
    const usdCount = await importUSDPortfolio();
    const cadCount = await importCADPortfolio();
    const intlCount = await importINTLPortfolio();
    
    const totalCount = (usdCount || 0) + (cadCount || 0) + (intlCount || 0);
    
    logProgress('Portfolio import summary:');
    logProgress(`USD: ${usdCount} records imported`);
    logProgress(`CAD: ${cadCount} records imported`);
    logProgress(`INTL: ${intlCount} records imported`);
    logProgress(`Total: ${totalCount} records imported`);
    
    logProgress('Portfolio import completed successfully');
  } catch (err) {
    console.error('Error in import process:', err);
  }
}

// Run the import process
main();
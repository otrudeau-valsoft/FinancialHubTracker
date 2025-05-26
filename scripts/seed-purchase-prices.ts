/**
 * Script to seed purchase prices from CSV files into portfolio tables
 * 
 * This script reads the PBR column from CSV files and imports them as purchase prices
 * into the respective portfolio tables (USD, CAD, INTL).
 */

import { db } from '../server/db';
import { portfolioUSD, portfolioCAD, portfolioINTL } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Clean a string value from the CSV
 */
function cleanValue(value: string): string | null {
  if (!value || value.trim() === '' || value.trim() === 'N/A' || value.trim() === '-') {
    return null;
  }
  return value.trim();
}

/**
 * Parse a number from a string, handle null values
 */
function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const cleanedValue = value.replace(/[$,%]/g, '');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Import purchase prices for USD portfolio
 */
async function importUSDPurchasePrices() {
  console.log('Importing USD portfolio purchase prices...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'USD-portfolio.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('USD-portfolio.csv not found, skipping...');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let updated = 0;
  
  for (const record of records) {
    const symbol = cleanValue(record.SYM);
    const purchasePrice = parseNumber(cleanValue(record.PBR));
    
    console.log(`Processing: Symbol=${symbol}, PBR=${record.PBR}, ParsedPrice=${purchasePrice}`);
    
    if (symbol && purchasePrice !== null) {
      try {
        const result = await db.update(portfolioUSD)
          .set({ purchasePrice: purchasePrice.toString() })
          .where(eq(portfolioUSD.symbol, symbol));
        
        console.log(`Updated ${symbol}: $${purchasePrice}`);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${symbol}:`, error);
      }
    } else {
      console.log(`Skipped: Symbol=${symbol}, PurchasePrice=${purchasePrice}`);
    }
  }
  
  console.log(`Updated ${updated} USD portfolio stocks with purchase prices`);
}

/**
 * Import purchase prices for CAD portfolio
 */
async function importCADPurchasePrices() {
  console.log('Importing CAD portfolio purchase prices...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'CAD-portfolio.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('CAD-portfolio.csv not found, skipping...');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let updated = 0;
  
  for (const record of records) {
    const symbol = cleanValue(record.SYM);
    const purchasePrice = parseNumber(cleanValue(record.PBR));
    
    if (symbol && purchasePrice !== null) {
      try {
        await db.update(portfolioCAD)
          .set({ purchasePrice: purchasePrice.toString() })
          .where(eq(portfolioCAD.symbol, symbol));
        
        console.log(`Updated ${symbol}: C$${purchasePrice}`);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${symbol}:`, error);
      }
    }
  }
  
  console.log(`Updated ${updated} CAD portfolio stocks with purchase prices`);
}

/**
 * Import purchase prices for INTL portfolio
 */
async function importINTLPurchasePrices() {
  console.log('Importing INTL portfolio purchase prices...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'INTL-portfolio.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('INTL-portfolio.csv not found, skipping...');
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  let updated = 0;
  
  for (const record of records) {
    const symbol = cleanValue(record.SYM);
    const purchasePrice = parseNumber(cleanValue(record.PBR));
    
    if (symbol && purchasePrice !== null) {
      try {
        await db.update(portfolioINTL)
          .set({ purchasePrice: purchasePrice.toString() })
          .where(eq(portfolioINTL.symbol, symbol));
        
        console.log(`Updated ${symbol}: $${purchasePrice}`);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${symbol}:`, error);
      }
    }
  }
  
  console.log(`Updated ${updated} INTL portfolio stocks with purchase prices`);
}

/**
 * Main function to run all importers
 */
async function main() {
  try {
    console.log('Starting purchase price import...');
    
    await importUSDPurchasePrices();
    await importCADPurchasePrices();
    await importINTLPurchasePrices();
    
    console.log('Purchase price import completed successfully!');
  } catch (error) {
    console.error('Error during purchase price import:', error);
    process.exit(1);
  }
}

// Run the script
main();
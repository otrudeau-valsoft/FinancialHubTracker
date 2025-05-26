/**
 * Quick script to seed purchase prices from CSV files
 */
import { db } from '../server/db';
import { portfolioUSD, portfolioCAD, portfolioINTL } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

function cleanValue(value: string): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim().replace(/^[﻿\uFEFF]/, ''); // Remove BOM
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const cleanedValue = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? null : parsed;
}

async function importUSDPurchasePrices() {
  console.log('Importing USD portfolio purchase prices...');
  
  const csvPath = path.join(process.cwd(), 'attached_assets', 'USD-portfolio.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('USD-portfolio.csv not found, skipping...');
    return;
  }
  
  // Read and clean the CSV content to remove BOM
  let csvContent = fs.readFileSync(csvPath, 'utf-8');
  csvContent = csvContent.replace(/^\uFEFF/, ''); // Remove BOM if present
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log('Sample record keys:', Object.keys(records[0] || {}));
  
  let updated = 0;
  
  for (const record of records) {
    // Try different possible column names for symbol
    const symbol = cleanValue(record.SYM) || cleanValue(record['SYM']) || cleanValue(record['﻿SYM']);
    const purchasePrice = parseNumber(cleanValue(record.PBR));
    
    console.log(`Processing: Symbol="${symbol}", PBR="${record.PBR}", ParsedPrice=${purchasePrice}`);
    
    if (symbol && purchasePrice !== null) {
      try {
        await db.update(portfolioUSD)
          .set({ purchasePrice: purchasePrice.toString() })
          .where(eq(portfolioUSD.symbol, symbol));
        
        console.log(`✓ Updated ${symbol}: $${purchasePrice}`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed to update ${symbol}:`, error);
      }
    }
  }
  
  console.log(`Updated ${updated} USD portfolio stocks with purchase prices`);
}

async function main() {
  try {
    console.log('Starting purchase price import...');
    await importUSDPurchasePrices();
    console.log('Purchase price import completed successfully!');
  } catch (error) {
    console.error('Error during purchase price import:', error);
  } finally {
    process.exit(0);
  }
}

main();
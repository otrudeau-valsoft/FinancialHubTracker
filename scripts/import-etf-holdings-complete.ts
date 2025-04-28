/**
 * ETF Holdings Import Script
 * 
 * This script imports ETF holdings data from CSV files into the database.
 * It handles SPY, XIC, and ACWX ETFs with their specific CSV formats.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { etfHoldingsSPY, etfHoldingsXIC, etfHoldingsACWX } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Helper functions
function cleanValue(value: string): string | null {
  if (!value) return null;
  return value.trim();
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  
  // Remove commas, percentage signs, etc.
  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
  
  // Check if it's a valid number
  if (cleaned === '' || isNaN(Number(cleaned))) {
    return null;
  }
  
  return Number(cleaned);
}

/**
 * Import SPY Holdings
 */
async function importSPYHoldings() {
  console.log('Importing SPY holdings data...');
  
  try {
    // Clear existing data
    await db.execute(sql`DELETE FROM ${etfHoldingsSPY}`);
    
    // Read the SPY holdings CSV file
    const filePath = path.join(process.cwd(), 'attached_assets', 'holdings-daily-us-en-spy (1).csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV
    const records = parse(fileContent, { 
      columns: false,
      skip_empty_lines: true,
      from_line: 6 // Skip header rows
    });
    
    // Process records
    const holdings = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      // Check if this is a valid record with expected columns
      if (record.length >= 6) {
        const holding = {
          ticker: cleanValue(record[1]) || '',
          name: cleanValue(record[0]) || '',
          sector: cleanValue(record[5]) || null,
          assetClass: 'Equity',
          weight: parseNumber(record[4]),
          price: null, // Not provided in the SPY CSV
          quantity: parseNumber(record[6]),
          location: 'United States',
          exchange: 'NYSE',
          currency: 'USD'
        };
        
        // Skip records with special characters in ticker or empty tickers
        if (holding.ticker && !holding.ticker.includes('-') && holding.ticker !== 'US DOLLAR') {
          holdings.push(holding);
        }
      }
    }
    
    // Insert into database
    if (holdings.length > 0) {
      const inserted = await db.insert(etfHoldingsSPY).values(holdings).returning();
      console.log(`Successfully imported ${inserted.length} SPY holdings`);
      return inserted.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error importing SPY holdings:', error);
    throw error;
  }
}

/**
 * Import XIC Holdings
 */
async function importXICHoldings() {
  console.log('Importing XIC holdings data...');
  
  try {
    // Clear existing data
    await db.execute(sql`DELETE FROM ${etfHoldingsXIC}`);
    
    // Read the XIC holdings CSV file
    const filePath = path.join(process.cwd(), 'attached_assets', 'XIC_holdings (1).csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV
    const records = parse(fileContent, { 
      columns: false,
      skip_empty_lines: true,
      from_line: 3 // Skip header rows
    });
    
    // Process records
    const holdings = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      // Check if this is a valid record with expected columns
      if (record.length >= 8) {
        const holding = {
          ticker: cleanValue(record[0]) || '',
          name: cleanValue(record[1]) || '',
          sector: cleanValue(record[2]) || null,
          assetClass: cleanValue(record[3]) || 'Equity',
          marketValue: parseNumber(record[4]),
          weight: parseNumber(record[5]),
          price: parseNumber(record[8]),
          quantity: parseNumber(record[7]),
          location: cleanValue(record[9]) || 'Canada',
          exchange: cleanValue(record[10]) || 'Toronto Stock Exchange',
          currency: cleanValue(record[11]) || 'CAD'
        };
        
        // Skip cash entries or empty tickers
        if (holding.ticker && holding.ticker !== 'CAD' && holding.assetClass !== 'Cash') {
          holdings.push(holding);
        }
      }
    }
    
    // Insert into database
    if (holdings.length > 0) {
      const inserted = await db.insert(etfHoldingsXIC).values(holdings).returning();
      console.log(`Successfully imported ${inserted.length} XIC holdings`);
      return inserted.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error importing XIC holdings:', error);
    throw error;
  }
}

/**
 * Import ACWX Holdings
 */
async function importACWXHoldings() {
  console.log('Importing ACWX holdings data...');
  
  try {
    // Clear existing data
    await db.execute(sql`DELETE FROM ${etfHoldingsACWX}`);
    
    // Read the ACWX holdings CSV file
    const filePath = path.join(process.cwd(), 'attached_assets', 'ACWX_holdings (2).csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV
    const records = parse(fileContent, { 
      columns: false,
      skip_empty_lines: true,
      from_line: 6 // Skip header rows
    });
    
    // Process records
    const holdings = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      // Check if this is a valid record with expected columns
      if (record.length >= 12) {
        const holding = {
          ticker: cleanValue(record[0]) || '',
          name: cleanValue(record[1]) || '',
          sector: cleanValue(record[2]) || null,
          assetClass: cleanValue(record[3]) || 'Equity',
          marketValue: parseNumber(record[4]),
          weight: parseNumber(record[5]),
          price: parseNumber(record[8]),
          quantity: parseNumber(record[7]),
          location: cleanValue(record[9]) || null,
          exchange: cleanValue(record[10]) || null,
          currency: cleanValue(record[11]) || 'USD'
        };
        
        // Skip cash, bond, or other non-equity holdings
        if (holding.ticker && holding.ticker !== '-' && holding.assetClass === 'Equity') {
          holdings.push(holding);
        }
      }
    }
    
    // Insert into database
    if (holdings.length > 0) {
      const inserted = await db.insert(etfHoldingsACWX).values(holdings).returning();
      console.log(`Successfully imported ${inserted.length} ACWX holdings`);
      return inserted.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error importing ACWX holdings:', error);
    throw error;
  }
}

/**
 * Main function to run all importers
 */
async function main() {
  try {
    console.log('Starting ETF holdings import...');
    
    const spyCount = await importSPYHoldings();
    const xicCount = await importXICHoldings();
    const acwxCount = await importACWXHoldings();
    
    console.log(`Import complete. Imported ${spyCount} SPY, ${xicCount} XIC, and ${acwxCount} ACWX holdings.`);
    process.exit(0);
  } catch (error) {
    console.error('Error in main import function:', error);
    process.exit(1);
  }
}

// Run the script
main();
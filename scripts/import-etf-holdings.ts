import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../server/db';
import { etfHoldingsSPY, etfHoldingsXIC, etfHoldingsACWX } from '../shared/schema';

// Function to clean up data values
function cleanValue(value: string): string | null {
  if (!value || value === ' ' || value === '-' || value === 'N/A' || value === '%') {
    return null;
  }
  
  // Strip special characters like '$', ',', '%' etc. and quotes
  return value.replace(/[$,%"]/g, '').trim();
}

// Function to parse a number or return null
function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importSPYHoldings() {
  console.log('Importing SPY holdings data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'holdings-daily-us-en-spy.csv');
  
  if (!fs.existsSync(filePath)) {
    console.log('SPY holdings file not found.');
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the SPY holdings CSV.');
    return;
  }

  // Clear existing data
  await db.delete(etfHoldingsSPY);
  
  // Insert new data
  for (const row of data) {
    await db.insert(etfHoldingsSPY).values({
      ticker: cleanValue(row.Ticker) || '',
      name: cleanValue(row.Name) || '',
      sector: cleanValue(row.Sector),
      assetClass: cleanValue(row['Asset Class']),
      marketValue: parseNumber(cleanValue(row['Market Value'])),
      weight: parseNumber(cleanValue(row['Weight (%)'])),
      price: parseNumber(cleanValue(row.Price)),
      quantity: parseNumber(cleanValue(row.Shares || row.Quantity)),
      location: cleanValue(row.Location),
      exchange: cleanValue(row.Exchange),
      currency: cleanValue(row.Currency)
    });
  }
  
  console.log(`Imported ${data.length} SPY holdings.`);
}

async function importXICHoldings() {
  console.log('Importing XIC holdings data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'XIC_holdings.csv');
  
  if (!fs.existsSync(filePath)) {
    console.log('XIC holdings file not found.');
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data - Skip the first few lines if needed
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the XIC holdings CSV.');
    return;
  }

  // Clear existing data
  await db.delete(etfHoldingsXIC);
  
  // Insert new data
  for (const row of data) {
    await db.insert(etfHoldingsXIC).values({
      ticker: cleanValue(row.Ticker) || '',
      name: cleanValue(row.Name) || '',
      sector: cleanValue(row.Sector),
      assetClass: cleanValue(row['Asset Class']),
      marketValue: parseNumber(cleanValue(row['Market Value'])),
      weight: parseNumber(cleanValue(row['Weight (%)'])),
      price: parseNumber(cleanValue(row.Price)),
      quantity: parseNumber(cleanValue(row.Shares)),
      location: cleanValue(row.Location),
      exchange: cleanValue(row.Exchange),
      currency: cleanValue(row.Currency)
    });
  }
  
  console.log(`Imported ${data.length} XIC holdings.`);
}

async function importACWXHoldings() {
  console.log('Importing ACWX holdings data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'ACWX_holdings.csv');
  
  if (!fs.existsSync(filePath)) {
    console.log('ACWX holdings file not found.');
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data, skipping header rows
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  
  if (data.length === 0) {
    console.log('No data found in the ACWX holdings CSV.');
    return;
  }

  // Clear existing data
  await db.delete(etfHoldingsACWX);
  
  // Insert new data - skip the first few rows which are metadata
  const actualData = data.filter(row => row.Ticker && row.Name);
  
  for (const row of actualData) {
    await db.insert(etfHoldingsACWX).values({
      ticker: cleanValue(row.Ticker) || '',
      name: cleanValue(row.Name) || '',
      sector: cleanValue(row.Sector),
      assetClass: cleanValue(row['Asset Class']),
      marketValue: parseNumber(cleanValue(row['Market Value'])),
      weight: parseNumber(cleanValue(row['Weight (%)'])),
      price: parseNumber(cleanValue(row.Price)),
      quantity: parseNumber(cleanValue(row.Quantity)),
      location: cleanValue(row.Location),
      exchange: cleanValue(row.Exchange),
      currency: cleanValue(row.Currency)
    });
  }
  
  console.log(`Imported ${actualData.length} ACWX holdings.`);
}

async function main() {
  try {
    await importSPYHoldings();
    await importXICHoldings();
    await importACWXHoldings();
    console.log('All ETF holdings data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing ETF holdings data:', error);
    process.exit(1);
  }
}

main();
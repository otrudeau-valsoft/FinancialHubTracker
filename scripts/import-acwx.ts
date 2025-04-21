import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../server/db';
import { etfHoldingsACWX } from '../shared/schema';

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
    transformHeader: (header) => header.trim(),
    dynamicTyping: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the ACWX holdings CSV.');
    return;
  }

  // Clear existing data
  await db.delete(etfHoldingsACWX);
  
  // Filter rows based on whether they have both Ticker and Name fields
  const actualData = data.filter(row => {
    return row.Ticker && row.Name && !(row.Ticker === 'Ticker' && row.Name === 'Name');
  });
  
  console.log(`Found ${actualData.length} valid ACWX holdings.`);
  
  // Process in smaller batches to avoid overloading the database
  const batchSize = 50;
  for (let i = 0; i < actualData.length; i += batchSize) {
    const batch = actualData.slice(i, i + batchSize);
    const values = batch.map(row => ({
      ticker: String(row.Ticker || ''),
      name: String(row.Name || ''),
      sector: row.Sector ? String(row.Sector) : null,
      assetClass: row['Asset Class'] ? String(row['Asset Class']) : null,
      marketValue: row['Market Value'] ? parseNumber(String(row['Market Value'])) : null,
      weight: row['Weight (%)'] ? parseNumber(String(row['Weight (%)'])) : null,
      price: row.Price ? parseNumber(String(row.Price)) : null,
      quantity: row.Quantity ? parseNumber(String(row.Quantity)) : null,
      location: row.Location ? String(row.Location) : null,
      exchange: row.Exchange ? String(row.Exchange) : null,
      currency: row.Currency ? String(row.Currency) : null
    }));
    
    await db.insert(etfHoldingsACWX).values(values);
    console.log(`Imported batch ${i/batchSize + 1} (${i} - ${i + batch.length}) of ACWX holdings.`);
  }
  
  const count = actualData.length;
  console.log(`Imported ${count} ACWX holdings.`);
}

async function main() {
  try {
    await importACWXHoldings();
    console.log('ACWX ETF holdings data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing ACWX ETF holdings data:', error);
    process.exit(1);
  }
}

main();
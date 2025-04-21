import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../server/db';
import { etfHoldingsSPY } from '../shared/schema';

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
  
  // Read the file content
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse the CSV data
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
  console.log(`Found ${data.length} SPY holdings to import.`);
  
  // Process in smaller batches
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(data.length/batchSize)}`);
    const batch = data.slice(i, i + batchSize);
    
    for (const row of batch) {
      try {
        // Parse the CSV data into the correct format
        await db.insert(etfHoldingsSPY).values({
          ticker: cleanValue(row.Ticker || row.ticker || row.Symbol || row.symbol) || '',
          name: cleanValue(row.Name || row.name || row['Security Name'] || row['Company Name']) || '',
          sector: cleanValue(row.Sector || row.sector),
          assetClass: cleanValue(row['Asset Class'] || row.assetClass),
          marketValue: parseNumber(cleanValue(row['Market Value'] || row.marketValue)),
          weight: parseNumber(cleanValue(row['Weight (%)'] || row.weight || row['Weight'])),
          price: parseNumber(cleanValue(row.Price || row.price)),
          quantity: parseNumber(cleanValue(row.Quantity || row.quantity || row.Shares))
        });
      } catch (error) {
        console.error('Error importing row:', row);
        console.error('Error message:', error);
      }
    }
    
    console.log(`Imported batch ${Math.floor(i/batchSize) + 1}`);
  }
  
  console.log(`Imported ${data.length} SPY holdings.`);
}

async function main() {
  try {
    await importSPYHoldings();
    console.log('SPY ETF holdings data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing SPY ETF holdings data:', error);
    process.exit(1);
  }
}

main();
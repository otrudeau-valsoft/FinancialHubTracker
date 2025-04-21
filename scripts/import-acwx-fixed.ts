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
  
  // Read the file content
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Find the line where the actual data starts (after the metadata)
  const lines = fileContent.split('\n');
  let dataStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Ticker,Name,Sector')) {
      dataStartLine = i;
      break;
    }
  }
  
  if (dataStartLine === 0) {
    console.log('Could not find the header row in the ACWX holdings CSV.');
    return;
  }
  
  // Extract just the data portion (header + rows)
  const dataContent = lines.slice(dataStartLine).join('\n');
  
  // Parse the CSV data
  const { data } = Papa.parse(dataContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the ACWX holdings CSV.');
    return;
  }

  // Clear existing data
  await db.delete(etfHoldingsACWX);
  console.log(`Found ${data.length} ACWX holdings to import.`);
  
  // Process in smaller batches
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(data.length/batchSize)}`);
    const batch = data.slice(i, i + batchSize);
    
    for (const row of batch) {
      try {
        // Parse the CSV data into the correct format
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
      } catch (error) {
        console.error('Error importing row:', row);
        console.error('Error message:', error);
      }
    }
    
    console.log(`Imported batch ${Math.floor(i/batchSize) + 1}`);
  }
  
  console.log(`Imported ${data.length} ACWX holdings.`);
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
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
  
  // Find the line where the actual data starts (after the metadata)
  const lines = fileContent.split('\n');
  let dataStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Name,Ticker,Identifier')) {
      dataStartLine = i;
      break;
    }
  }
  
  if (dataStartLine === 0) {
    console.log('Could not find the header row in the SPY holdings CSV.');
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
          ticker: cleanValue(row.Ticker) || '',
          name: cleanValue(row.Name) || '',
          sector: cleanValue(row.Sector),
          marketValue: null, // Not available in this dataset
          weight: parseNumber(cleanValue(row.Weight)),
          price: null, // Not available in this dataset
          quantity: parseNumber(cleanValue(row['Shares Held']))
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
    // Clear existing data
    await db.delete(etfHoldingsSPY);
    
    await importSPYHoldings();
    console.log('SPY ETF holdings data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing SPY ETF holdings data:', error);
    process.exit(1);
  }
}

main();
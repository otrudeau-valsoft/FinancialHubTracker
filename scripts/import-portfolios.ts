import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../server/db';
import { assetsUS, assetsCAD, assetsINTL } from '../shared/schema';

// Function to clean up data values
function cleanValue(value: string): string | null {
  if (!value || value === ' ' || value === '#N/A' || value === '%' || value === ' $ ' || value === '$ ') {
    return null;
  }
  
  // Strip special characters like '$', ',', '%' etc.
  return value.replace(/[$,%]/g, '').trim();
}

// Function to parse a number or return null
function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importUSPortfolio() {
  console.log('Importing USD portfolio data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'USD-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the USD portfolio CSV.');
    return;
  }

  // Clear existing data
  await db.delete(assetsUS);
  
  // Insert new data
  for (const row of data) {
    await db.insert(assetsUS).values({
      symbol: row.SYM,
      company: row.Company,
      sector: cleanValue(row.Sector),
      quantity: parseNumber(cleanValue(row.Qty)),
      pbr: parseNumber(cleanValue(row.PBR)),
      stockRating: cleanValue(row['Stock Rating']),
      stockType: cleanValue(row['Stock Type']),
      nextEarningsDate: cleanValue(row['Next Earnings'])
    });
  }
  
  console.log(`Imported ${data.length} USD portfolio stocks.`);
}

async function importCADPortfolio() {
  console.log('Importing CAD portfolio data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'CAD-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the CAD portfolio CSV.');
    return;
  }

  // Clear existing data
  await db.delete(assetsCAD);
  
  // Insert new data
  for (const row of data) {
    await db.insert(assetsCAD).values({
      symbol: row.SYM,
      company: row.Company,
      sector: cleanValue(row.Sector),
      quantity: parseNumber(cleanValue(row.QTY)),
      pbr: parseNumber(cleanValue(row.PBR)),
      stockRating: cleanValue(row['Stock Rating']),
      stockType: cleanValue(row['Stock Type']),
      nextEarningsDate: cleanValue(row['Next Earnings'])
    });
  }
  
  console.log(`Imported ${data.length} CAD portfolio stocks.`);
}

async function importINTLPortfolio() {
  console.log('Importing INTL portfolio data...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'INTL-portfolio.csv');
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  
  // Parse CSV data
  const { data } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });
  
  if (data.length === 0) {
    console.log('No data found in the INTL portfolio CSV.');
    return;
  }

  // Clear existing data
  await db.delete(assetsINTL);
  
  // Insert new data
  for (const row of data) {
    await db.insert(assetsINTL).values({
      symbol: row.SYM,
      company: row.Company,
      sector: cleanValue(row.Sector),
      quantity: parseNumber(cleanValue(row.Qty)),
      pbr: parseNumber(cleanValue(row.PBR)),
      stockRating: cleanValue(row['Stock Rating']),
      stockType: cleanValue(row['Stock Type']),
      nextEarningsDate: cleanValue(row['Next Earnings'])
    });
  }
  
  console.log(`Imported ${data.length} INTL portfolio stocks.`);
}

async function main() {
  try {
    await importUSPortfolio();
    await importCADPortfolio();
    await importINTLPortfolio();
    console.log('All portfolio data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing portfolio data:', error);
    process.exit(1);
  }
}

main();
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db';
import { importUpgradeDowngradeHistory, importRegionUpgradeDowngradeHistory } from './scripts/import-upgrade-downgrade';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * List of available script functions
 */
const scripts: Record<string, Function> = {
  'import-upgrade-downgrade': importUpgradeDowngradeScript,
  'check-database': checkDatabaseScript,
  'verify-routes': verifyRoutesScript,
  'help': showHelp
};

/**
 * Main entry point for running scripts
 */
async function main() {
  const scriptName = process.argv[2] || 'help';
  
  if (!scripts[scriptName]) {
    console.error(`Unknown script: ${scriptName}`);
    return showHelp();
  }
  
  try {
    await scripts[scriptName]();
  } catch (error) {
    console.error(`Error running script ${scriptName}:`, error);
    process.exit(1);
  }
}

/**
 * Import upgrade/downgrade data
 */
async function importUpgradeDowngradeScript() {
  const region = process.argv[3] || 'USD';
  const symbol = process.argv[4];
  
  if (symbol) {
    console.log(`Importing upgrade/downgrade history for ${symbol} (${region})...`);
    await importUpgradeDowngradeHistory(symbol, region);
    console.log('Import complete.');
  } else {
    console.log(`Importing upgrade/downgrade history for all stocks in ${region}...`);
    const result = await importRegionUpgradeDowngradeHistory(region);
    console.log(`Import complete. Processed ${result.processed} stocks, found data for ${result.withData} stocks.`);
  }
}

/**
 * Check database connection and tables
 */
async function checkDatabaseScript() {
  try {
    console.log('Checking database connection...');
    
    // Try a simple query
    const result = await db.execute('SELECT current_database()');
    console.log('Database connection successful:', result.rows[0].current_database);
    
    // List tables
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nDatabase tables:');
    tables.rows.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Verify API routes are properly set up
 */
async function verifyRoutesScript() {
  const verifyRoutesPath = path.join(__dirname, 'verify-routes.ts');
  
  if (!fs.existsSync(verifyRoutesPath)) {
    console.error('verify-routes.ts not found');
    return;
  }
  
  // We're just importing the script which will run automatically
  await import('./verify-routes');
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Available scripts:
  import-upgrade-downgrade [region] [symbol]  Import upgrade/downgrade history
                                              If symbol is omitted, imports all stocks for the region
                                              Default region is USD
  
  check-database                              Check database connection and list tables
  
  verify-routes                               Verify API routes are properly set up
  
  help                                        Show this help information
  
Examples:
  tsx server/scripts.ts import-upgrade-downgrade USD AAPL
  tsx server/scripts.ts import-upgrade-downgrade CAD
  tsx server/scripts.ts check-database
  tsx server/scripts.ts verify-routes
  `);
}

// Run main function
main().catch(console.error);
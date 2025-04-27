/**
 * Initialize Portfolio Cash Balances
 * 
 * This script initializes the portfolio_cash table with default cash balances
 * for each region (USD, CAD, INTL).
 */

import { db } from '../server/db';
import { portfolioCash } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function initializeCashBalances() {
  try {
    console.log('Initializing portfolio cash balances...');
    
    // Check if cash balances already exist
    const existingBalances = await db.select().from(portfolioCash);
    console.log(`Found ${existingBalances.length} existing cash balances`);
    
    // Define the regions and default amounts
    const regions = [
      { region: 'USD', amount: '10000.00' },
      { region: 'CAD', amount: '12500.00' },
      { region: 'INTL', amount: '15000.00' }
    ];
    
    // For each region, create or update the cash balance
    for (const regionData of regions) {
      const existing = existingBalances.find(b => b.region === regionData.region);
      
      if (existing) {
        // Update existing balance
        console.log(`Updating ${regionData.region} cash balance to ${regionData.amount}`);
        await db.update(portfolioCash)
          .set({ amount: regionData.amount })
          .where(eq(portfolioCash.region, regionData.region));
      } else {
        // Create new balance
        console.log(`Creating new ${regionData.region} cash balance of ${regionData.amount}`);
        await db.insert(portfolioCash).values({
          region: regionData.region,
          amount: regionData.amount
        });
      }
    }
    
    // Verify the results
    const updatedBalances = await db.select().from(portfolioCash);
    console.log('Cash balances initialized successfully:');
    updatedBalances.forEach(balance => {
      console.log(`- ${balance.region}: $${balance.amount}`);
    });
    
  } catch (error) {
    console.error('Error initializing cash balances:', error);
  }
}

async function main() {
  try {
    await initializeCashBalances();
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

main();
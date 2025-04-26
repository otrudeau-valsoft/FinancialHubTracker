/**
 * Earnings Data Import Script
 * 
 * This script extracts earnings data from Yahoo Finance for all stocks in our portfolios,
 * and imports it into our earnings and earnings calendar tables.
 */

import { db } from '../server/db';
import { 
  portfolioUSD, 
  portfolioCAD, 
  portfolioINTL,
  earnings,
  earningsCalendar,
  dataUpdateLogs
} from '../shared/schema';
import { createAdaptedDataUpdateLog } from '../server/adapters/data-management-adapter';
import yahooFinance from 'yahoo-finance2';

/**
 * Log an update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', region: string, message: string) {
  try {
    const logEntry = createAdaptedDataUpdateLog(type, status, region, message);
    await db.insert(dataUpdateLogs).values(logEntry);
    console.log(`[${status}] ${region}: ${message}`);
  } catch (error) {
    console.error('Error logging update:', error);
  }
}

/**
 * Get unique tickers from a specific regional portfolio
 */
async function getPortfolioTickers(region: string): Promise<{symbol: string, company: string, stockType: string, stockRating: string}[]> {
  try {
    let tickers: {symbol: string, company: string, stockType: string, stockRating: string}[] = [];
    
    switch (region) {
      case 'USD':
        const usdStocks = await db
          .select({
            symbol: portfolioUSD.symbol,
            company: portfolioUSD.company,
            stockType: portfolioUSD.stockType,
            stockRating: portfolioUSD.rating
          })
          .from(portfolioUSD);
        tickers = usdStocks;
        break;
        
      case 'CAD':
        const cadStocks = await db
          .select({
            symbol: portfolioCAD.symbol,
            company: portfolioCAD.company,
            stockType: portfolioCAD.stockType,
            stockRating: portfolioCAD.rating
          })
          .from(portfolioCAD);
        tickers = cadStocks;
        break;
        
      case 'INTL':
        const intlStocks = await db
          .select({
            symbol: portfolioINTL.symbol,
            company: portfolioINTL.company,
            stockType: portfolioINTL.stockType,
            stockRating: portfolioINTL.rating
          })
          .from(portfolioINTL);
        tickers = intlStocks;
        break;
        
      default:
        throw new Error(`Invalid region: ${region}`);
    }
    
    return tickers;
  } catch (error) {
    console.error(`Error getting tickers for ${region}:`, error);
    return [];
  }
}

/**
 * Determine the time of day for earnings (BMO or AMC)
 */
function determineTimeOfDay(hourUTC: number): string {
  // Convert UTC to EST (UTC-5 or UTC-4 depending on daylight saving)
  // For simplicity, we'll use a fixed offset of UTC-5 (EST)
  const hourEST = (hourUTC - 5 + 24) % 24;
  
  // Before market open (BMO) is typically before 9:30 AM EST
  // After market close (AMC) is typically after 4:00 PM EST
  if (hourEST < 9.5) {
    return 'BMO';
  } else if (hourEST >= 16) {
    return 'AMC';
  } else {
    return 'DURING';
  }
}

/**
 * Import earnings data for a specific stock
 */
async function importEarningsData(
  symbol: string, 
  company: string, 
  region: string,
  stockType: string,
  stockRating: string
): Promise<number> {
  try {
    console.log(`Fetching earnings data for ${symbol} (${region})...`);
    
    // Get earnings data from Yahoo Finance
    const earningsData = await yahooFinance.quoteSummary(symbol, {
      modules: ['earnings', 'calendarEvents', 'defaultKeyStatistics']
    });
    
    let importCount = 0;
    
    // Process historical earnings
    if (earningsData.earnings && earningsData.earnings.earningsChart) {
      const { earningsChart, financialsChart } = earningsData.earnings;
      
      // Current year earnings quarters
      if (earningsChart.quarterly && earningsChart.quarterly.length > 0) {
        for (const quarter of earningsChart.quarterly) {
          const fiscalQuarter = `Q${quarter.quarter}`;
          const fiscalYear = earningsChart.currentQuarterEstimateYear || new Date().getFullYear();
          
          // Check if we already have this earnings record
          const existingRecord = await db
            .select()
            .from(earnings)
            .where('symbol = $1 AND region = $2 AND fiscal_quarter = $3 AND fiscal_year = $4')
            .prepare()
            .execute([symbol, region, fiscalQuarter, fiscalYear]);
          
          if (existingRecord.length === 0) {
            // Insert new earnings record
            await db.insert(earnings).values({
              symbol,
              region,
              company,
              fiscalQuarter,
              fiscalYear,
              reportDate: quarter.date,
              epsEstimate: quarter.estimatedEPS,
              epsActual: quarter.actualEPS,
              epsSurprise: quarter.surpriseEPS,
              epsSurprisePercent: quarter.estimatedEPS ? 
                ((quarter.actualEPS - quarter.estimatedEPS) / Math.abs(quarter.estimatedEPS)) * 100 : 
                null
            });
            
            importCount++;
          }
        }
      }
      
      // Process financials data (revenue, etc.)
      if (financialsChart && financialsChart.quarterly && financialsChart.quarterly.length > 0) {
        for (const quarter of financialsChart.quarterly) {
          const fiscalQuarter = quarter.code.substring(0, 2);
          const fiscalYear = parseInt(quarter.code.substring(2));
          
          // Find the matching earnings record we just created or updated
          const matchingRecords = await db
            .select()
            .from(earnings)
            .where('symbol = $1 AND region = $2 AND fiscal_quarter = $3 AND fiscal_year = $4')
            .prepare()
            .execute([symbol, region, fiscalQuarter, fiscalYear]);
          
          if (matchingRecords.length > 0) {
            // Update with revenue data
            await db
              .update(earnings)
              .set({
                revenueActual: quarter.revenue,
                // Revenue estimates not available in this data
              })
              .where('id = $1')
              .prepare()
              .execute([matchingRecords[0].id]);
          }
        }
      }
    }
    
    // Process upcoming earnings date for calendar
    if (earningsData.calendarEvents && earningsData.calendarEvents.earnings) {
      const upcomingEarnings = earningsData.calendarEvents.earnings;
      
      if (upcomingEarnings.earningsDate && upcomingEarnings.earningsDate.length > 0) {
        const earningsDate = new Date(upcomingEarnings.earningsDate[0] * 1000);
        const formattedDate = earningsDate.toISOString().split('T')[0];
        
        // Get time of day (if available)
        const hourUTC = earningsDate.getUTCHours();
        const timeOfDay = determineTimeOfDay(hourUTC);
        
        // Get market cap
        const marketCap = earningsData.defaultKeyStatistics?.enterpriseValue || null;
        
        // Check if we already have this calendar entry
        const existingCalendar = await db
          .select()
          .from(earningsCalendar)
          .where('symbol = $1 AND region = $2 AND earnings_date = $3')
          .prepare()
          .execute([symbol, region, formattedDate]);
        
        if (existingCalendar.length === 0) {
          // Insert new calendar entry
          await db.insert(earningsCalendar).values({
            symbol,
            region,
            company,
            earningsDate: formattedDate,
            confirmed: true,
            timeOfDay,
            estimatedEPS: upcomingEarnings.earningsAverage,
            lastQuarterEPS: null, // Need to fetch separately
            marketCap,
            importance: "normal",
            stockRating,
            stockType
          });
          
          importCount++;
        } else {
          // Update existing calendar entry
          await db
            .update(earningsCalendar)
            .set({
              confirmed: true,
              timeOfDay,
              estimatedEPS: upcomingEarnings.earningsAverage,
              marketCap,
              stockRating,
              stockType
            })
            .where('id = $1')
            .prepare()
            .execute([existingCalendar[0].id]);
        }
      }
    }
    
    return importCount;
  } catch (error) {
    console.error(`Error importing earnings for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Import earnings data for all stocks in a portfolio
 */
async function importPortfolioEarnings(region: string): Promise<number> {
  await logUpdate('earnings_import', 'In Progress', region, 'Starting earnings data import');
  
  try {
    const tickers = await getPortfolioTickers(region);
    console.log(`Found ${tickers.length} tickers in ${region} portfolio`);
    
    let totalImported = 0;
    let processedCount = 0;
    
    for (const ticker of tickers) {
      try {
        const importCount = await importEarningsData(
          ticker.symbol, 
          ticker.company, 
          region,
          ticker.stockType,
          ticker.stockRating
        );
        
        totalImported += importCount;
        processedCount++;
        
        // Log progress every 5 stocks
        if (processedCount % 5 === 0) {
          await logUpdate(
            'earnings_import', 
            'In Progress', 
            region, 
            `Processed ${processedCount}/${tickers.length} stocks`
          );
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${ticker.symbol}:`, error);
      }
    }
    
    await logUpdate(
      'earnings_import', 
      'Success', 
      region, 
      `Imported ${totalImported} earnings records for ${processedCount} stocks`
    );
    
    return totalImported;
  } catch (error) {
    console.error(`Error importing earnings for ${region}:`, error);
    await logUpdate('earnings_import', 'Error', region, `Import failed: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * Main function to import earnings data for all portfolios
 */
async function main() {
  console.log('Starting earnings data import...');
  
  try {
    await logUpdate('earnings_import', 'In Progress', 'ALL', 'Starting earnings import for all portfolios');
    
    const usdImported = await importPortfolioEarnings('USD');
    const cadImported = await importPortfolioEarnings('CAD');
    const intlImported = await importPortfolioEarnings('INTL');
    
    const totalImported = usdImported + cadImported + intlImported;
    
    console.log('-----------------------------------');
    console.log('Earnings import summary:');
    console.log(`USD: ${usdImported} earnings records imported`);
    console.log(`CAD: ${cadImported} earnings records imported`);
    console.log(`INTL: ${intlImported} earnings records imported`);
    console.log(`Total: ${totalImported} earnings records imported`);
    console.log('-----------------------------------');
    
    await logUpdate(
      'earnings_import', 
      'Success', 
      'ALL', 
      `Imported ${totalImported} earnings records across all portfolios`
    );
    
    console.log('Earnings data import completed.');
  } catch (error) {
    console.error('Error importing earnings data:', error);
    await logUpdate('earnings_import', 'Error', 'ALL', `Import failed: ${(error as Error).message}`);
  } finally {
    // Close the database connection
    await db.$pool.end();
    process.exit(0);
  }
}

// Run the main function
main();
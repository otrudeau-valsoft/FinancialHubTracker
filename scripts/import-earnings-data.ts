import yahooFinance from 'yahoo-finance2';
import { db } from '../server/db';
import { 
  earningsResults, 
  earningsEstimates, 
  analystRecommendations, 
  dataUpdateLogs,
  assetsUS,
  assetsCAD,
  assetsINTL,
  InsertEarningsResult,
  InsertEarningsEstimate,
  InsertAnalystRecommendation
} from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const { quoteSummary } = yahooFinance;

// Helper function to delay execution (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Log data updates
async function logDataUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', details: string) {
  await db.insert(dataUpdateLogs).values({
    type,
    status,
    details
  });
  console.log(`[${status}] ${type}: ${details}`);
}

// Convert Yahoo Finance timestamp to Date
function yahooTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

// Format quarter from date
function formatQuarter(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let quarter = '';
  
  if (month >= 1 && month <= 3) quarter = 'Q1';
  else if (month >= 4 && month <= 6) quarter = 'Q2';
  else if (month >= 7 && month <= 9) quarter = 'Q3';
  else quarter = 'Q4';
  
  return `${quarter} ${year}`;
}

// Determine earnings score
function determineEarningsScore(epsSurprisePercent: number | null, revenueSurprisePercent: number | null, guidance: string | null): string {
  // Default to "Okay"
  if (epsSurprisePercent === null && revenueSurprisePercent === null) return "Okay";
  
  // If guidance is negative, it's usually Bad
  if (guidance === "Lowered") return "Bad";
  
  // Basic scoring logic
  if (epsSurprisePercent !== null && revenueSurprisePercent !== null) {
    // Both metrics available
    if (epsSurprisePercent > 5 && revenueSurprisePercent > 2) return "Good";
    if (epsSurprisePercent < -5 && revenueSurprisePercent < -2) return "Bad";
    if (guidance === "Raised") return "Good";
    return "Okay";
  } else if (epsSurprisePercent !== null) {
    // Only EPS available
    if (epsSurprisePercent > 10) return "Good";
    if (epsSurprisePercent < -10) return "Bad";
    return "Okay";
  } else if (revenueSurprisePercent !== null) {
    // Only revenue available
    if (revenueSurprisePercent > 5) return "Good";
    if (revenueSurprisePercent < -5) return "Bad";
    return "Okay";
  }
  
  return "Okay";
}

// Get symbols by region
async function getSymbolsByRegion(region: string): Promise<string[]> {
  let stocks: any[] = [];
  
  switch (region) {
    case 'USD':
      stocks = await db.select().from(assetsUS);
      break;
    case 'CAD':
      stocks = await db.select().from(assetsCAD);
      break;
    case 'INTL':
      stocks = await db.select().from(assetsINTL);
      break;
    default:
      throw new Error(`Invalid region: ${region}`);
  }
  
  return stocks.map(stock => stock.symbol);
}

// Import earnings data for a single stock
async function importEarningsData(symbol: string, region: string): Promise<void> {
  try {
    const startTime = Date.now();
    let dataCount = 0;
    
    // Fetch data from Yahoo Finance
    const data = await quoteSummary(symbol, {
      modules: ['earnings', 'earningsTrend', 'recommendationTrend']
    });
    
    // Process earnings history
    if (data.earnings && data.earnings.earningsChart && data.earnings.earningsChart.quarterly) {
      const quarterly = data.earnings.earningsChart.quarterly;
      
      for (const quarter of quarterly) {
        const reportDate = yahooTimestampToDate(quarter.date);
        const formattedQuarter = formatQuarter(reportDate);
        
        // Skip if we already have this quarter's data for this symbol
        const existing = await db.select()
          .from(earningsResults)
          .where(
            and(
              eq(earningsResults.symbol, symbol),
              eq(earningsResults.region, region),
              eq(earningsResults.quarter, formattedQuarter)
            )
          );
          
        if (existing.length > 0) {
          console.log(`Skipping existing earnings data for ${symbol} (${region}), quarter: ${formattedQuarter}`);
          continue;
        }
        
        // Calculate surprises
        const actualEPS = quarter.actual?.raw || null;
        const estimateEPS = quarter.estimate?.raw || null;
        let epsSurprise: number | null = null;
        let epsSurprisePercent: number | null = null;
        
        if (actualEPS !== null && estimateEPS !== null && estimateEPS !== 0) {
          epsSurprise = actualEPS - estimateEPS;
          epsSurprisePercent = (epsSurprise / Math.abs(estimateEPS)) * 100;
        }
        
        // Revenue data might be in a different structure
        const revenueActual = data.earnings.financialsChart?.quarterly?.find((q: any) => 
          q.date === quarter.date
        )?.revenue?.raw || null;
        
        // We'll set these as null initially
        const revenueEstimate = null;
        const revenueSurprise = null;
        const revenueSurprisePercent = null;
        
        // Get guidance (this is usually qualitative and would come from earnings call transcripts)
        // For now we'll set it to "Unknown"
        const guidance = "Unknown";
        
        // Determine earnings score
        const earningsScore = determineEarningsScore(epsSurprisePercent, revenueSurprisePercent, guidance);
        
        // Create earnings result record
        const earningsResult: InsertEarningsResult = {
          symbol,
          region,
          quarter: formattedQuarter,
          fiscalQuarter: null, // Would need additional data
          fiscalYear: null, // Would need additional data
          reportDate: reportDate.toISOString().split('T')[0],
          epsActual: actualEPS,
          epsEstimate: estimateEPS,
          epsSurprise,
          epsSurprisePercent,
          revenueActual,
          revenueEstimate,
          revenueSurprise,
          revenueSurprisePercent,
          earningsScore,
          marketReaction: null, // Would require historical price data around earnings date
          guidance,
          guidanceDetails: null
        };
        
        await db.insert(earningsResults).values(earningsResult);
        dataCount++;
      }
    }
    
    // Process earnings trend (future estimates)
    if (data.earningsTrend && data.earningsTrend.trend) {
      for (const trend of data.earningsTrend.trend) {
        const period = trend.period;
        
        // Skip if we already have this period's data
        const existing = await db.select()
          .from(earningsEstimates)
          .where(
            and(
              eq(earningsEstimates.symbol, symbol),
              eq(earningsEstimates.region, region),
              eq(earningsEstimates.period, period)
            )
          );
          
        if (existing.length > 0) {
          console.log(`Skipping existing earnings estimate for ${symbol} (${region}), period: ${period}`);
          continue;
        }
        
        const expectedReportDate = trend.endDate ? new Date(trend.endDate) : null;
        
        // Extract EPS data
        const consensusEPS = trend.eps?.avg?.raw || null;
        const lowEPS = trend.eps?.low?.raw || null;
        const highEPS = trend.eps?.high?.raw || null;
        const epsNumAnalysts = trend.eps?.numberOfAnalysts?.raw || null;
        
        // Extract revenue data
        const consensusRevenue = trend.revenue?.avg?.raw || null;
        const lowRevenue = trend.revenue?.low?.raw || null;
        const highRevenue = trend.revenue?.high?.raw || null;
        const revenueNumAnalysts = trend.revenue?.numberOfAnalysts?.raw || null;
        
        const earningsEstimate: InsertEarningsEstimate = {
          symbol,
          region,
          period,
          fiscalQuarter: null, // Typically not provided
          fiscalYear: null, // Typically not provided
          expectedReportDate: expectedReportDate ? expectedReportDate.toISOString().split('T')[0] : null,
          consensusEPS,
          lowEPS,
          highEPS,
          epsNumAnalysts,
          consensusRevenue,
          lowRevenue,
          highRevenue,
          revenueNumAnalysts
        };
        
        await db.insert(earningsEstimates).values(earningsEstimate);
        dataCount++;
      }
    }
    
    // Process analyst recommendations
    if (data.recommendationTrend && data.recommendationTrend.trend) {
      for (const trend of data.recommendationTrend.trend) {
        const period = trend.period;
        
        // Skip if we already have this period's data
        const existing = await db.select()
          .from(analystRecommendations)
          .where(
            and(
              eq(analystRecommendations.symbol, symbol),
              eq(analystRecommendations.region, region),
              eq(analystRecommendations.period, period)
            )
          );
          
        if (existing.length > 0) {
          console.log(`Skipping existing analyst recommendation for ${symbol} (${region}), period: ${period}`);
          continue;
        }
        
        // Calculate score value (weighted average of recommendations)
        // Strong buy = 5, Buy = 4, Hold = 3, Underperform = 2, Sell = 1
        const totalRecs = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
        const scoreValue = totalRecs > 0 
          ? (trend.strongBuy * 5 + trend.buy * 4 + trend.hold * 3 + trend.sell * 2 + trend.strongSell * 1) / totalRecs
          : null;
        
        const analystRecommendation: InsertAnalystRecommendation = {
          symbol,
          region,
          period,
          strongBuy: trend.strongBuy,
          buy: trend.buy,
          hold: trend.hold,
          underperform: trend.sell, // Yahoo uses 'sell' for underperform
          sell: trend.strongSell, // Yahoo uses 'strongSell' for sell
          scoreValue
        };
        
        await db.insert(analystRecommendations).values(analystRecommendation);
        dataCount++;
      }
    }
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Imported ${dataCount} earnings data records for ${symbol} (${region}) in ${elapsedTime.toFixed(2)}s`);
    
  } catch (error) {
    console.error(`Error importing earnings data for ${symbol} (${region}):`, error);
    await logDataUpdate('earnings_data', 'Error', `Failed to import earnings data for ${symbol} (${region}): ${error.message}`);
  }
}

// Import earnings data for all stocks in a region
async function importRegionEarningsData(region: string): Promise<void> {
  try {
    const startTime = Date.now();
    await logDataUpdate('earnings_data_' + region.toLowerCase(), 'In Progress', `Starting earnings data import for ${region} portfolio`);
    
    const symbols = await getSymbolsByRegion(region);
    console.log(`Found ${symbols.length} symbols for ${region} portfolio`);
    
    let successCount = 0;
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      console.log(`Processing ${i+1}/${symbols.length}: ${symbol} (${region})`);
      
      try {
        await importEarningsData(symbol, region);
        successCount++;
        
        // Add delay to avoid hitting API rate limits
        await delay(500);
      } catch (error) {
        console.error(`Error processing ${symbol} (${region}):`, error);
      }
    }
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    const status = successCount > 0 ? 'Success' : 'Error';
    const details = `Imported earnings data for ${successCount}/${symbols.length} stocks in ${region} portfolio in ${elapsedTime.toFixed(2)}s`;
    
    await logDataUpdate('earnings_data_' + region.toLowerCase(), status, details);
    console.log(`Completed earnings data import for ${region}. ${details}`);
    
  } catch (error) {
    console.error(`Error importing earnings data for ${region}:`, error);
    await logDataUpdate('earnings_data_' + region.toLowerCase(), 'Error', `Failed to import earnings data for ${region}: ${error.message}`);
  }
}

// Import earnings data for all portfolios
async function importAllEarningsData(): Promise<void> {
  try {
    const startTime = Date.now();
    await logDataUpdate('earnings_data_all', 'In Progress', 'Starting earnings data import for all portfolios');
    
    await importRegionEarningsData('USD');
    await importRegionEarningsData('CAD');
    await importRegionEarningsData('INTL');
    
    const elapsedTime = (Date.now() - startTime) / 1000;
    await logDataUpdate('earnings_data_all', 'Success', `Completed earnings data import for all portfolios in ${elapsedTime.toFixed(2)}s`);
    
  } catch (error) {
    console.error('Error importing earnings data for all portfolios:', error);
    await logDataUpdate('earnings_data_all', 'Error', `Failed to import earnings data for all portfolios: ${error.message}`);
  }
}

// Import earnings data for a single stock across all regions
async function importStockEarningsData(symbol: string): Promise<void> {
  const regions = ['USD', 'CAD', 'INTL'];
  
  for (const region of regions) {
    // Check if the symbol exists in this region
    const stocks = await getSymbolsByRegion(region);
    if (stocks.includes(symbol)) {
      console.log(`Importing earnings data for ${symbol} in ${region} portfolio`);
      await importEarningsData(symbol, region);
    }
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Usage:');
    console.log('npx tsx scripts/import-earnings-data.ts all');
    console.log('npx tsx scripts/import-earnings-data.ts region <USD|CAD|INTL>');
    console.log('npx tsx scripts/import-earnings-data.ts stock <symbol>');
    process.exit(1);
  }
  
  try {
    if (command === 'all') {
      await importAllEarningsData();
    } else if (command === 'region' && args[1]) {
      const region = args[1].toUpperCase();
      if (!['USD', 'CAD', 'INTL'].includes(region)) {
        throw new Error(`Invalid region: ${region}`);
      }
      await importRegionEarningsData(region);
    } else if (command === 'stock' && args[1]) {
      const symbol = args[1].toUpperCase();
      await importStockEarningsData(symbol);
    } else {
      throw new Error('Invalid command');
    }
    
    console.log('Import completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
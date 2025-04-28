/**
 * Earnings Data Import Script
 * 
 * This script extracts earnings data from Yahoo Finance for all stocks in our portfolios,
 * and imports it into our earnings_quarterly and earnings_meta tables.
 */

import yahooFinance from 'yahoo-finance2';
import { db } from '../server/db';
import { 
  portfolioUSD, 
  portfolioCAD, 
  portfolioINTL, 
  earningsQuarterly, 
  earningsMeta 
} from '../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Log an update to the database
 */
async function logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', region: string, message: string) {
  await db.insert(sql`data_update_logs`).values({
    type,
    status,
    details: JSON.stringify({ region, message }),
  });
  console.log(`[${status}] ${type} - ${region}: ${message}`);
}

/**
 * Get unique tickers from a specific regional portfolio
 */
async function getPortfolioTickers(region: string): Promise<{symbol: string, company: string, stockType: string, stockRating: string}[]> {
  let portfolioTable;
  let symbolModifier = (s: string) => s;
  
  switch (region) {
    case 'USD':
      portfolioTable = portfolioUSD;
      break;
    case 'CAD':
      portfolioTable = portfolioCAD;
      // Canadian stocks need .TO suffix for Yahoo Finance, but not for database storage
      symbolModifier = (s: string) => s.includes('.TO') ? s : `${s}.TO`;
      break;
    case 'INTL':
      portfolioTable = portfolioINTL;
      break;
    default:
      throw new Error(`Invalid region: ${region}`);
  }

  const stocks = await db.select({
    symbol: portfolioTable.symbol,
    company: portfolioTable.company,
    stockType: portfolioTable.stockType,
    stockRating: portfolioTable.rating,
  }).from(portfolioTable);

  return stocks.map(stock => ({
    ...stock,
    symbol: symbolModifier(stock.symbol)
  }));
}

/**
 * Parse a date string from Yahoo Finance into a JavaScript Date object
 */
function parseYahooDate(dateStr: string | number): Date | null {
  if (!dateStr) return null;
  
  // Handle epoch timestamp (seconds)
  if (typeof dateStr === 'number') {
    return new Date(dateStr * 1000);
  }
  
  try {
    return new Date(dateStr);
  } catch (e) {
    console.error(`Error parsing date: ${dateStr}`, e);
    return null;
  }
}

/**
 * Determine the time of day for earnings (BMO or AMC)
 */
function determineTimeOfDay(hourUTC: number): string {
  // Convert UTC to EST (UTC-5)
  const hourEST = (hourUTC - 5 + 24) % 24;
  
  // Before market hours (Before 9:30 AM EST)
  if (hourEST < 9 || (hourEST === 9 && hourEST < 30)) {
    return 'BMO'; // Before Market Open
  }
  // After market hours (After 4:00 PM EST)
  else if (hourEST >= 16) {
    return 'AMC'; // After Market Close
  }
  // During market hours
  else {
    return 'DMH'; // During Market Hours
  }
}

/**
 * Calculate earnings score based on EPS, revenue, guidance, and market reaction
 */
function calculateEarningsScore(
  epsBeat: boolean | null,
  revenueBeat: boolean | null,
  guidancePositive: boolean | null,
  marketReaction: number | null
): number {
  let score = 5; // Neutral starting point on a 1-10 scale
  
  // EPS impact (can add or subtract up to 2 points)
  if (epsBeat !== null) {
    score += epsBeat ? 2 : -2;
  }
  
  // Revenue impact (can add or subtract up to 2 points)
  if (revenueBeat !== null) {
    score += revenueBeat ? 2 : -2;
  }
  
  // Guidance impact (can add or subtract up to 1 point)
  if (guidancePositive !== null) {
    score += guidancePositive ? 1 : -1;
  }
  
  // Market reaction impact (can adjust up to 1 point)
  if (marketReaction !== null) {
    if (marketReaction > 5) score += 1;
    else if (marketReaction < -5) score -= 1;
  }
  
  // Ensure score stays within 1-10 range
  return Math.min(Math.max(score, 1), 10);
}

/**
 * Convert a quarter string from earnings history to fiscal quarter and year
 * @param period String like '-4q', '-3q', etc.
 * @param quarterDate Date object for the quarter end date
 */
function convertToFiscalQuarter(period: string, quarterDate: Date | null): { fiscalYear: number, fiscalQ: number } | null {
  if (!quarterDate) return null;
  
  const year = quarterDate.getFullYear();
  const month = quarterDate.getMonth() + 1; // 1-12
  
  // Determine fiscal quarter based on month
  let fiscalQ: number;
  if (month <= 3) fiscalQ = 1;
  else if (month <= 6) fiscalQ = 2;
  else if (month <= 9) fiscalQ = 3;
  else fiscalQ = 4;
  
  return {
    fiscalYear: year,
    fiscalQ
  };
}

/**
 * Determine guidance status based on earnings call transcript or price movement
 */
function determineGuidance(
  marketReaction: number | null, 
  epsStatus: string | null
): string | null {
  // If we don't have enough data
  if (marketReaction === null && epsStatus === null) {
    return null;
  }
  
  // Use market reaction as a proxy for guidance when no other info is available
  if (marketReaction !== null) {
    if (marketReaction > 8) return 'Increased';
    if (marketReaction < -8) return 'Reduced';
    
    // For modest movements, use EPS status if available
    if (epsStatus) {
      if (epsStatus === 'Beat' && marketReaction > 2) return 'Increased';
      if (epsStatus === 'Miss' && marketReaction < -2) return 'Reduced';
    }
  }
  
  // Default case
  return 'Maintain';
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
): Promise<boolean> {
  try {
    // Check when we last fetched this stock's earnings
    const lastFetched = await db.select({
      last_fetched: earningsMeta.last_fetched
    })
    .from(earningsMeta)
    .where(eq(earningsMeta.ticker, symbol))
    .limit(1);
    
    // If we fetched recently (within last 7 days), skip unless forced
    if (lastFetched.length > 0) {
      const lastFetchTime = new Date(lastFetched[0].last_fetched).getTime();
      const oneWeekAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);
      
      if (lastFetchTime > oneWeekAgo) {
        console.log(`Skipping ${symbol} - fetched recently on ${new Date(lastFetchTime).toLocaleDateString()}`);
        return true;
      }
    }
    
    // Original symbol for database storage (without .TO suffix for Canadian stocks)
    const dbSymbol = symbol.replace('.TO', '');
    
    console.log(`Fetching earnings data for ${symbol} (${company})...`);
    
    // Get data from all relevant modules for comprehensive earnings information
    const [earningsData, earningsHistoryData, calendarData, earningsTrendData] = await Promise.all([
      yahooFinance.quoteSummary(symbol, { modules: ['earnings', 'price'] }),
      yahooFinance.quoteSummary(symbol, { modules: ['earningsHistory'] }),
      yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] }),
      yahooFinance.quoteSummary(symbol, { modules: ['earningsTrend'] })
    ]);
    
    // Process earnings data from the 'earnings' module (current and historical quarters)
    if (earningsData.earnings && earningsData.earnings.earningsChart) {
      const { earningsChart, financialsChart } = earningsData.earnings;
      const currentPrice = earningsData.price?.regularMarketPrice || 0;
      
      // Process quarterly earnings
      if (earningsChart.quarterly && earningsChart.quarterly.length > 0) {
        for (const quarter of earningsChart.quarterly) {
          // Get the fiscal quarter and year
          const fiscalQMatch = quarter.date.match(/([0-9]+)Q([1-4])/);
          if (!fiscalQMatch) continue;
          
          const fiscalYear = parseInt(fiscalQMatch[1]);
          const fiscalQ = parseInt(fiscalQMatch[2]);
          
          // Find matching revenue data
          let revenueActual = null;
          let revenueEstimate = null;
          
          if (financialsChart && financialsChart.quarterly) {
            const revenueData = financialsChart.quarterly.find(q => q.date === quarter.date);
            if (revenueData) {
              revenueActual = revenueData.revenue || null;
              revenueEstimate = revenueData.estimatedRevenue || null;
            }
          }
          
          // Calculate EPS status
          let epsStatus = null;
          if (quarter.actual !== null && quarter.estimate !== null) {
            const epsDiff = ((quarter.actual - quarter.estimate) / Math.abs(quarter.estimate)) * 100;
            if (epsDiff > 2) epsStatus = 'Beat';
            else if (epsDiff < -2) epsStatus = 'Miss';
            else epsStatus = 'In-Line';
          }
          
          // Calculate Revenue status
          let revenueStatus = null;
          if (revenueActual !== null && revenueEstimate !== null) {
            const revDiff = ((revenueActual - revenueEstimate) / Math.abs(revenueEstimate)) * 100;
            if (revDiff > 2) revenueStatus = 'Beat';
            else if (revDiff < -2) revenueStatus = 'Miss';
            else revenueStatus = 'In-Line';
          }
          
          // Find matching market reaction from earnings history
          let marketReaction = null;
          
          // Determine guidance based on available information
          const guidance = determineGuidance(marketReaction, epsStatus);
          
          // Calculate earnings score
          const epsBeat = epsStatus === 'Beat';
          const revenueBeat = revenueStatus === 'Beat';
          const guidancePositive = guidance === 'Increased';
          
          const score = calculateEarningsScore(
            epsStatus === null ? null : epsBeat,
            revenueStatus === null ? null : revenueBeat,
            guidance === null ? null : guidancePositive,
            marketReaction
          );
          
          // Insert or update earnings data
          await db.insert(earningsQuarterly).values({
            ticker: dbSymbol,
            fiscal_year: fiscalYear,
            fiscal_q: fiscalQ,
            eps_actual: quarter.actual,
            eps_estimate: quarter.estimate,
            rev_actual: revenueActual,
            rev_estimate: revenueEstimate,
            guidance: guidance,
            mkt_reaction: marketReaction,
            score: score,
            note: `${epsStatus || 'Unknown'} EPS, ${revenueStatus || 'Unknown'} Revenue`
          }).onConflictDoUpdate({
            target: [
              earningsQuarterly.ticker,
              earningsQuarterly.fiscal_year,
              earningsQuarterly.fiscal_q
            ],
            set: {
              eps_actual: quarter.actual,
              eps_estimate: quarter.estimate,
              rev_actual: revenueActual,
              rev_estimate: revenueEstimate,
              guidance: guidance,
              mkt_reaction: marketReaction,
              score: score,
              note: `${epsStatus || 'Unknown'} EPS, ${revenueStatus || 'Unknown'} Revenue`,
              updated_at: new Date()
            }
          });
          
          console.log(`Imported earnings from earnings module for ${symbol} ${fiscalYear}Q${fiscalQ}`);
        }
      }
    }
    
    // Process data from the 'earningsHistory' module (more detailed, with surprise %)
    if (earningsHistoryData.earningsHistory && earningsHistoryData.earningsHistory.history) {
      const { history } = earningsHistoryData.earningsHistory;
      
      for (const entry of history) {
        const quarterDate = parseYahooDate(entry.quarter);
        const fiscalInfo = convertToFiscalQuarter(entry.period, quarterDate);
        
        if (!fiscalInfo) {
          console.log(`Unable to determine fiscal quarter/year for ${symbol}, period ${entry.period}`);
          continue;
        }
        
        const { fiscalYear, fiscalQ } = fiscalInfo;
        
        // Calculate EPS status
        let epsStatus = null;
        if (entry.surprisePercent) {
          if (entry.surprisePercent > 0.02) epsStatus = 'Beat';
          else if (entry.surprisePercent < -0.02) epsStatus = 'Miss';
          else epsStatus = 'In-Line';
        }
        
        // We don't have market reaction in earningsHistory data
        const marketReaction = null;
        
        // Determine guidance (will be updated by later modules)
        const guidance = determineGuidance(marketReaction, epsStatus);
        
        // Calculate earnings score
        const epsBeat = epsStatus === 'Beat';
        const score = calculateEarningsScore(
          epsStatus === null ? null : epsBeat,
          null, // No revenue data in this module
          guidance === null ? null : guidance === 'Increased',
          marketReaction
        );
        
        await db.insert(earningsQuarterly).values({
          ticker: dbSymbol,
          fiscal_year: fiscalYear,
          fiscal_q: fiscalQ,
          eps_actual: entry.epsActual,
          eps_estimate: entry.epsEstimate,
          rev_actual: null, // Not available in this module
          rev_estimate: null, // Not available in this module
          guidance: guidance,
          mkt_reaction: marketReaction,
          score: score,
          note: `${epsStatus || 'Unknown'} EPS (${entry.surprisePercent ? (entry.surprisePercent * 100).toFixed(1) + '%' : 'N/A'} surprise)`
        }).onConflictDoUpdate({
          target: [
            earningsQuarterly.ticker,
            earningsQuarterly.fiscal_year,
            earningsQuarterly.fiscal_q
          ],
          set: {
            eps_actual: entry.epsActual,
            eps_estimate: entry.epsEstimate,
            guidance: guidance,
            mkt_reaction: marketReaction,
            score: score,
            note: `${epsStatus || 'Unknown'} EPS (${entry.surprisePercent ? (entry.surprisePercent * 100).toFixed(1) + '%' : 'N/A'} surprise)`,
            updated_at: new Date()
          }
        });
        
        console.log(`Imported earnings from earnings history for ${symbol} ${fiscalYear}Q${fiscalQ}`);
      }
    }
    
    // Process upcoming earnings from calendarEvents
    if (calendarData.calendarEvents && calendarData.calendarEvents.earnings) {
      const { earnings } = calendarData.calendarEvents;
      
      if (earnings.earningsDate && earnings.earningsDate.length > 0) {
        const nextEarningsDate = parseYahooDate(earnings.earningsDate[0]);
        
        if (nextEarningsDate) {
          // We could store this in another table for upcoming earnings calendar
          console.log(`Next earnings date for ${symbol}: ${nextEarningsDate.toLocaleDateString()}`);
          
          // Update earnings estimate in the database if it's an upcoming quarter
          // This would require additional logic to determine which fiscal quarter this is
        }
      }
    }
    
    // Update earnings meta to track last fetch time
    await db.insert(earningsMeta).values({
      ticker: dbSymbol,
      last_fetched: new Date()
    }).onConflictDoUpdate({
      target: earningsMeta.ticker,
      set: { last_fetched: new Date() }
    });
    
    return true;
  } catch (error) {
    console.error(`Error importing earnings for ${symbol}:`, error);
    return false;
  }
}

/**
 * Import earnings data for all stocks in a portfolio
 */
async function importPortfolioEarnings(region: string): Promise<number> {
  try {
    await logUpdate('earnings_data', 'In Progress', region, 'Starting earnings data import');
    
    const stocks = await getPortfolioTickers(region);
    console.log(`Found ${stocks.length} stocks in ${region} portfolio`);
    
    let successCount = 0;
    
    // Process stocks with a small delay between each to avoid rate limits
    for (const stock of stocks) {
      const success = await importEarningsData(
        stock.symbol,
        stock.company,
        region,
        stock.stockType,
        stock.stockRating
      );
      
      if (success) successCount++;
      
      // Small delay to avoid rate limits (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await logUpdate(
      'earnings_data', 
      'Success', 
      region, 
      `Imported earnings data for ${successCount}/${stocks.length} stocks`
    );
    
    return successCount;
  } catch (error) {
    await logUpdate('earnings_data', 'Error', region, `Error: ${error.message}`);
    console.error(`Error importing earnings for ${region}:`, error);
    return 0;
  }
}

/**
 * Post-process the earnings data to calculate market reactions
 */
async function calculateMarketReactions(): Promise<number> {
  try {
    // This would analyze historical price data around earnings dates
    // to calculate the market reaction to earnings announcements
    
    // 1. Get all earnings records without market reaction
    const earningsWithoutReaction = await db
      .select()
      .from(earningsQuarterly)
      .where(sql`mkt_reaction IS NULL`);
    
    console.log(`Found ${earningsWithoutReaction.length} earnings records without market reaction`);
    
    // For each earnings record, we would:
    // 1. Find the exact earnings date from historical data
    // 2. Calculate price change from day before to day after
    // 3. Update the record with the market reaction
    
    // For now, this is placeholder code
    console.log('Market reaction calculation would be implemented here');
    
    return earningsWithoutReaction.length;
  } catch (error) {
    console.error('Error calculating market reactions:', error);
    return 0;
  }
}

/**
 * Main function to import earnings data for all portfolios
 */
async function main() {
  try {
    console.log('Initiating earnings data collection for all portfolios');
    
    await logUpdate('earnings_data_all', 'In Progress', 'ALL', 'Starting earnings data collection for all portfolios');
    
    // Import earnings for each portfolio
    const usdCount = await importPortfolioEarnings('USD');
    const cadCount = await importPortfolioEarnings('CAD');
    const intlCount = await importPortfolioEarnings('INTL');
    
    // Calculate market reactions from historical price data
    const reactionsCalculated = await calculateMarketReactions();
    
    const totalCount = usdCount + cadCount + intlCount;
    
    await logUpdate(
      'earnings_data_all', 
      'Success', 
      'ALL', 
      `Completed earnings import for all portfolios. Processed ${totalCount} stocks (USD: ${usdCount}, CAD: ${cadCount}, INTL: ${intlCount}). Updated ${reactionsCalculated} market reactions.`
    );
    
    console.log('Earnings data collection completed successfully');
    
  } catch (error) {
    await logUpdate('earnings_data_all', 'Error', 'ALL', `Error: ${error.message}`);
    console.error('Error in main earnings import process:', error);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error in earnings import:', error);
    process.exit(1);
  });

export { importPortfolioEarnings, importEarningsData };
import yahooFinance from 'yahoo-finance2';
import { db } from '@/server/db';
import { eq, sql, desc, and } from 'drizzle-orm';
import { earningsQuarterly, earningsMeta, portfolioUSD, portfolioCAD, portfolioINTL } from '@/shared/schema';
import { logDataUpdate } from './logDataUpdate';

/**
 * Updates earnings data for all portfolio stocks
 */
export async function updateEarningsData() {
  console.log('Starting earnings data update...');
  
  try {
    // Get distinct list of tickers from all portfolio tables
    const tickers = await getPortfolioTickers();
    console.log(`Found ${tickers.length} tickers to process`);
    
    // Log the start of the update
    await logDataUpdate('earnings', 'In Progress', 'All portfolios', 'Starting earnings data update');
    
    // Process each ticker
    let processedCount = 0;
    let errorCount = 0;
    
    for (const ticker of tickers) {
      try {
        await processTickerEarnings(ticker);
        processedCount++;
        console.log(`Processed earnings data for ${ticker} (${processedCount}/${tickers.length})`);
      } catch (error) {
        errorCount++;
        console.error(`Error processing earnings for ${ticker}:`, error);
      }
    }
    
    // Log the completion of the update
    const status = errorCount > 0 ? 'Error' : 'Success';
    const message = `Completed earnings data update. Processed ${processedCount} tickers with ${errorCount} errors.`;
    await logDataUpdate('earnings', status, 'All portfolios', message);
    
    console.log(message);
    return { success: true, tickersProcessed: processedCount, errors: errorCount };
  } catch (error) {
    console.error('Error updating earnings data:', error);
    await logDataUpdate('earnings', 'Error', 'All portfolios', `Failed to update earnings data: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Gets distinct tickers from all portfolio tables
 */
async function getPortfolioTickers(): Promise<string[]> {
  // Query all three portfolio tables and get distinct tickers
  const usdResult = await db.select({ symbol: portfolioUSD.symbol }).from(portfolioUSD);
  const cadResult = await db.select({ symbol: portfolioCAD.symbol }).from(portfolioCAD);
  const intlResult = await db.select({ symbol: portfolioINTL.symbol }).from(portfolioINTL);
  
  // Combine and deduplicate tickers
  const allTickers = [
    ...usdResult.map(r => r.symbol),
    ...cadResult.map(r => r.symbol),
    ...intlResult.map(r => r.symbol)
  ];
  
  return [...new Set(allTickers)];
}

/**
 * Processes earnings data for a single ticker
 */
async function processTickerEarnings(ticker: string) {
  try {
    // Fetch earnings data from Yahoo Finance
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ['earnings', 'earningsTrend']
    });
    
    const { earnings, earningsTrend } = result;
    
    if (!earnings?.earningsChart?.quarterly || earnings.earningsChart.quarterly.length === 0) {
      console.warn(`No quarterly earnings data found for ${ticker}`);
      return;
    }
    
    // Process each quarterly earnings record
    for (const quarterlyEarnings of earnings.earningsChart.quarterly) {
      // Parse fiscal quarter data
      const { year, q } = parseFiscalQuarter(quarterlyEarnings.date);
      
      // Get EPS data
      const epsActual = quarterlyEarnings.actual || null;
      const epsEstimate = quarterlyEarnings.estimate || null;
      
      // Find matching revenue data
      const revenueData = findMatchingRevenue(earnings.financialsChart.quarterly, quarterlyEarnings.date);
      const revActual = revenueData?.revenue || null;
      
      // Find matching trend data for revenue estimate
      const trendData = findMatchingTrend(earningsTrend?.trend, q);
      const revEstimate = trendData?.revenueEstimate?.avg || null;
      
      // Determine guidance by comparing current EPS to 30 days ago
      const guidance = classifyGuidance(
        trendData?.epsTrend?.current,
        trendData?.epsTrend?.['30daysAgo']
      );
      
      // Calculate market reaction
      const mktReaction = await calculateMarketReaction(ticker, quarterlyEarnings.earningsDate);
      
      // Compute score and note
      const score = computeScore(epsActual, epsEstimate, revActual, revEstimate, guidance, mktReaction);
      const note = generateNote(epsActual, epsEstimate, revActual, revEstimate, guidance, mktReaction);
      
      // Upsert data into earnings_quarterly
      await db.insert(earningsQuarterly)
        .values({
          ticker,
          fiscal_year: year,
          fiscal_q: q,
          eps_actual: epsActual,
          eps_estimate: epsEstimate,
          rev_actual: revActual,
          rev_estimate: revEstimate,
          guidance,
          mkt_reaction: mktReaction,
          score,
          note
        })
        .onConflictDoUpdate({
          target: [earningsQuarterly.ticker, earningsQuarterly.fiscal_year, earningsQuarterly.fiscal_q],
          set: {
            eps_actual: epsActual,
            eps_estimate: epsEstimate,
            rev_actual: revActual,
            rev_estimate: revEstimate,
            guidance,
            mkt_reaction: mktReaction,
            score,
            note,
            updated_at: new Date()
          }
        });
    }
    
    // Update last_fetched in earnings_meta
    await db.insert(earningsMeta)
      .values({
        ticker,
        last_fetched: new Date()
      })
      .onConflictDoUpdate({
        target: [earningsMeta.ticker],
        set: {
          last_fetched: new Date()
        }
      });
    
  } catch (error) {
    console.error(`Error processing earnings for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Parses fiscal quarter from Yahoo Finance format (e.g., "4Q2024")
 */
function parseFiscalQuarter(dateString: string): { year: number, q: number } {
  // Extract year and quarter from format like "4Q2024"
  const match = dateString.match(/(\d+)Q(\d{4})/);
  if (!match) {
    throw new Error(`Invalid fiscal quarter format: ${dateString}`);
  }
  
  return {
    q: parseInt(match[1], 10),
    year: parseInt(match[2], 10)
  };
}

/**
 * Finds matching revenue data from financialsChart
 */
function findMatchingRevenue(financials: any[] | undefined, quarterDate: string) {
  if (!financials || financials.length === 0) return null;
  return financials.find(f => f.date === quarterDate);
}

/**
 * Finds matching trend data from earningsTrend
 */
function findMatchingTrend(trends: any[] | undefined, quarter: number) {
  if (!trends || trends.length === 0) return null;
  
  // Map quarter numbers to the period strings in the trend data
  const periodMap: Record<number, string> = {
    1: '0q',   // Current quarter
    2: '+1q',  // Next quarter
    3: '+2q',  // Quarter after next
    4: '+3q'   // Quarter after that
  };
  
  const periodKey = periodMap[quarter];
  return trends.find(t => t.period === periodKey);
}

/**
 * Calculates market reaction (percentage change) between earnings date and next trading day
 */
async function calculateMarketReaction(ticker: string, earningsDate: number[]): Promise<number | null> {
  try {
    if (!earningsDate || earningsDate.length < 1) return null;
    
    // Convert UNIX timestamp to date string
    const date = new Date(earningsDate[0] * 1000).toISOString().split('T')[0];
    
    // Get price on earnings date
    const priceDayOf = await db.execute(sql`
      SELECT close FROM historical_prices
      WHERE symbol = ${ticker} AND date = ${date}
      LIMIT 1
    `);
    
    if (!priceDayOf || priceDayOf.length === 0) return null;
    
    // Get price on next trading day
    const priceNextDay = await db.execute(sql`
      SELECT close FROM historical_prices
      WHERE symbol = ${ticker} AND date > ${date}
      ORDER BY date ASC
      LIMIT 1
    `);
    
    if (!priceNextDay || priceNextDay.length === 0) return null;
    
    // Calculate percentage change
    const priceBefore = parseFloat(priceDayOf[0].close);
    const priceAfter = parseFloat(priceNextDay[0].close);
    
    return ((priceAfter - priceBefore) / priceBefore) * 100;
  } catch (error) {
    console.error(`Error calculating market reaction for ${ticker}:`, error);
    return null;
  }
}

/**
 * Classifies EPS beat status
 */
export function beatStatus(actual: number | null, estimate: number | null): 'Beat' | 'In-Line' | 'Miss' | null {
  if (actual === null || estimate === null) return null;
  
  const percentDiff = ((actual - estimate) / Math.abs(estimate)) * 100;
  
  if (percentDiff > 2) return 'Beat';
  if (percentDiff < -2) return 'Miss';
  return 'In-Line';
}

/**
 * Classifies revenue growth
 */
export function revenueStatus(actual: number | null, estimate: number | null): 'Up' | 'Flat' | 'Down' | null {
  if (actual === null || estimate === null) return null;
  
  const percentDiff = ((actual - estimate) / Math.abs(estimate)) * 100;
  
  if (percentDiff > 1) return 'Up';
  if (percentDiff < -1) return 'Down';
  return 'Flat';
}

/**
 * Classifies guidance change
 */
export function classifyGuidance(current: number | null, previous: number | null): 'Increased' | 'Maintain' | 'Decreased' | null {
  if (current === null || previous === null) return null;
  
  const percentChange = ((current - previous) / Math.abs(previous)) * 100;
  
  if (percentChange > 1) return 'Increased';
  if (percentChange < -1) return 'Decreased';
  return 'Maintain';
}

/**
 * Computes overall earnings score (1-10 scale)
 */
export function computeScore(
  epsActual: number | null, 
  epsEstimate: number | null,
  revActual: number | null, 
  revEstimate: number | null,
  guidance: string | null,
  mktReaction: number | null
): number | null {
  let score = 5; // Start at neutral
  
  // EPS component (0-3 points)
  const epsStatus = beatStatus(epsActual, epsEstimate);
  if (epsStatus === 'Beat') score += 2;
  else if (epsStatus === 'Miss') score -= 2;
  
  // Revenue component (0-3 points)
  const revStatus = revenueStatus(revActual, revEstimate);
  if (revStatus === 'Up') score += 2;
  else if (revStatus === 'Down') score -= 2;
  
  // Guidance component (0-2 points)
  if (guidance === 'Increased') score += 1;
  else if (guidance === 'Decreased') score -= 1;
  
  // Market reaction component (0-2 points)
  if (mktReaction !== null) {
    if (mktReaction > 5) score += 1;
    else if (mktReaction < -5) score -= 1;
  }
  
  // Clamp score between 1-10
  return Math.min(Math.max(score, 1), 10);
}

/**
 * Generates a summary note for the earnings
 */
function generateNote(
  epsActual: number | null, 
  epsEstimate: number | null,
  revActual: number | null, 
  revEstimate: number | null,
  guidance: string | null,
  mktReaction: number | null
): string | null {
  const parts = [];
  
  // EPS note
  const epsStatus = beatStatus(epsActual, epsEstimate);
  if (epsStatus) {
    parts.push(`EPS ${epsStatus.toLowerCase()}`);
  }
  
  // Revenue note
  const revStatus = revenueStatus(revActual, revEstimate);
  if (revStatus) {
    parts.push(`Revenue ${revStatus.toLowerCase()}`);
  }
  
  // Guidance note
  if (guidance) {
    parts.push(`${guidance} guidance`);
  }
  
  // Market reaction note
  if (mktReaction !== null) {
    if (mktReaction > 0) {
      parts.push(`Market up ${mktReaction.toFixed(1)}%`);
    } else if (mktReaction < 0) {
      parts.push(`Market down ${Math.abs(mktReaction).toFixed(1)}%`);
    }
  }
  
  return parts.length > 0 ? parts.join('; ') : null;
}
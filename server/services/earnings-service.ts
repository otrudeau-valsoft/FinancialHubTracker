import { quoteSummary } from 'yahoo-finance2';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  earningsConsensus, 
  InsertEarningsConsensus, 
  assetsUS, 
  assetsCAD, 
  assetsINTL 
} from '@shared/schema';
import { 
  logger 
} from '../logger';

export class EarningsService {
  constructor() {}

  /**
   * Gets the latest quarter (e.g., Q1 2025)
   */
  getLatestQuarter(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed

    let quarter;
    if (month >= 1 && month <= 3) {
      quarter = 'Q1';
    } else if (month >= 4 && month <= 6) {
      quarter = 'Q2';
    } else if (month >= 7 && month <= 9) {
      quarter = 'Q3';
    } else {
      quarter = 'Q4';
    }

    return `${quarter} ${year}`;
  }

  /**
   * Gets all symbols from assets tables by region
   */
  async getSymbolsByRegion(region: string): Promise<string[]> {
    try {
      let symbols: string[] = [];

      if (region === 'USD') {
        const assets = await db.select({ symbol: assetsUS.symbol }).from(assetsUS);
        symbols = assets.map(asset => asset.symbol);
      } else if (region === 'CAD') {
        const assets = await db.select({ symbol: assetsCAD.symbol }).from(assetsCAD);
        symbols = assets.map(asset => asset.symbol);
      } else if (region === 'INTL') {
        const assets = await db.select({ symbol: assetsINTL.symbol }).from(assetsINTL);
        symbols = assets.map(asset => asset.symbol);
      }

      return symbols;
    } catch (error) {
      logger.error(`Error fetching symbols for region ${region}:`, error);
      return [];
    }
  }

  /**
   * Fetches earnings consensus data from Yahoo Finance
   */
  async fetchEarningsConsensus(symbol: string, region: string): Promise<InsertEarningsConsensus | null> {
    try {
      // Adjust symbol for CAD stocks (add .TO suffix)
      const adjustedSymbol = region === 'CAD' ? `${symbol}.TO` : symbol;
      
      // Fetch data from Yahoo Finance
      const result = await quoteSummary(adjustedSymbol, {
        modules: ['recommendationTrend', 'earnings', 'earningsTrend']
      });

      if (!result) {
        logger.warn(`No data returned for ${symbol}`);
        return null;
      }

      const { recommendationTrend, earnings, earningsTrend } = result;

      // Get recommendation trends
      const recommendations = recommendationTrend?.trend?.[0] || null;
      
      // Get earnings data
      const earningsData = earnings?.financialsChart?.quarterly || [];
      const latestEarning = earningsData.length > 0 ? earningsData[earningsData.length - 1] : null;
      
      // Get earnings trend data
      const earningsTrendData = earningsTrend?.trend?.find(t => t.period === '0q') || null;
      
      // Calculate the latest quarter
      const latestQuarter = this.getLatestQuarter();

      // Create earnings consensus record
      const consensusData: InsertEarningsConsensus = {
        symbol,
        region,
        quarter: latestQuarter,
        reportDate: earningsTrendData?.endDate || null,
        epsEstimate: earningsTrendData?.earningsEstimate?.avg || null,
        epsActual: latestEarning?.actual || null,
        epsSurprise: latestEarning?.actual && earningsTrendData?.earningsEstimate?.avg 
          ? latestEarning.actual - earningsTrendData.earningsEstimate.avg 
          : null,
        epsSurprisePercent: null, // Will calculate in the database if both values are present
        revenueEstimate: earningsTrendData?.revenueEstimate?.avg || null,
        revenueActual: latestEarning?.revenue || null,
        revenueSurprise: latestEarning?.revenue && earningsTrendData?.revenueEstimate?.avg 
          ? latestEarning.revenue - earningsTrendData.revenueEstimate.avg 
          : null,
        revenueSurprisePercent: null, // Will calculate in the database if both values are present
        earningsResult: null, // Will determine based on surprise
        consensusRecommendation: recommendations 
          ? this.calculateConsensusRecommendation(
              recommendations.strongBuy || 0, 
              recommendations.buy || 0, 
              recommendations.hold || 0, 
              recommendations.sell || 0, 
              recommendations.strongSell || 0
            ) 
          : null,
        targetMeanPrice: earningsTrendData?.priceTargetEstimate?.targetMean || null,
        numberOfAnalysts: earningsTrendData?.earningsEstimate?.numberOfAnalysts || null
      };

      // Calculate surprise percentages if possible
      if (consensusData.epsEstimate && consensusData.epsSurprise) {
        consensusData.epsSurprisePercent = consensusData.epsEstimate !== 0 
          ? (consensusData.epsSurprise / consensusData.epsEstimate) * 100 
          : null;
      }

      if (consensusData.revenueEstimate && consensusData.revenueSurprise) {
        consensusData.revenueSurprisePercent = consensusData.revenueEstimate !== 0 
          ? (consensusData.revenueSurprise / consensusData.revenueEstimate) * 100 
          : null;
      }

      // Determine earnings result
      if (consensusData.epsSurprisePercent !== null) {
        if (consensusData.epsSurprisePercent > 2) {
          consensusData.earningsResult = 'Beat';
        } else if (consensusData.epsSurprisePercent < -2) {
          consensusData.earningsResult = 'Miss';
        } else {
          consensusData.earningsResult = 'In-line';
        }
      }

      return consensusData;
    } catch (error) {
      logger.error(`Error fetching earnings consensus for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Save earnings consensus data to database
   */
  async saveEarningsConsensus(data: InsertEarningsConsensus): Promise<void> {
    try {
      // Check if record exists
      const existing = await db
        .select()
        .from(earningsConsensus)
        .where(
          and(
            eq(earningsConsensus.symbol, data.symbol),
            eq(earningsConsensus.region, data.region),
            eq(earningsConsensus.quarter, data.quarter)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(earningsConsensus)
          .set(data)
          .where(eq(earningsConsensus.id, existing[0].id));
      } else {
        // Insert new record
        await db.insert(earningsConsensus).values(data);
      }
    } catch (error) {
      logger.error(`Error saving earnings consensus for ${data.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get earnings consensus for a specific stock
   */
  async getEarningsConsensus(symbol: string, region: string): Promise<any> {
    try {
      const result = await db
        .select()
        .from(earningsConsensus)
        .where(
          and(
            eq(earningsConsensus.symbol, symbol),
            eq(earningsConsensus.region, region)
          )
        )
        .orderBy(desc(earningsConsensus.quarter))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error(`Error getting earnings consensus for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get earnings consensus for a specific quarter and region
   */
  async getEarningsConsensusByQuarter(quarter: string, region: string): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(earningsConsensus)
        .where(
          and(
            eq(earningsConsensus.quarter, quarter),
            eq(earningsConsensus.region, region)
          )
        );

      return result;
    } catch (error) {
      logger.error(`Error getting earnings consensus for quarter ${quarter}:`, error);
      return [];
    }
  }

  /**
   * Calculate consensus recommendation based on analyst counts
   */
  private calculateConsensusRecommendation(
    strongBuy: number,
    buy: number,
    hold: number,
    sell: number,
    strongSell: number
  ): string {
    const total = strongBuy + buy + hold + sell + strongSell;
    if (total === 0) return null;

    const scoreMap = {
      strongBuy: 5,
      buy: 4,
      hold: 3,
      sell: 2,
      strongSell: 1
    };

    const weightedScore = (
      (strongBuy * scoreMap.strongBuy) +
      (buy * scoreMap.buy) +
      (hold * scoreMap.hold) +
      (sell * scoreMap.sell) +
      (strongSell * scoreMap.strongSell)
    ) / total;

    if (weightedScore >= 4.5) return 'Strong Buy';
    if (weightedScore >= 3.5) return 'Buy';
    if (weightedScore >= 2.5) return 'Hold';
    if (weightedScore >= 1.5) return 'Sell';
    return 'Strong Sell';
  }
}

export const earningsService = new EarningsService();
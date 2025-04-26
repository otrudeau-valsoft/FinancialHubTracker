/**
 * Data Management Adapter
 * 
 * This adapter maintains backward compatibility between our new database structure
 * and the existing Data Management page. It handles transformations for logs,
 * import status, and other data-related operations.
 */

import { 
  DataUpdateLog,
  InsertDataUpdateLog,
  UpgradeDowngradeHistory,
  InsertUpgradeDowngradeHistory,
  InsertEarnings,
  Earnings
} from '@shared/schema';

/**
 * Legacy Log Format interface
 */
export interface LegacyLogFormat {
  id: number;
  type: string;
  status: string;
  details?: string;
  timestamp: Date;
  region?: string;
  message?: string;
}

/**
 * Legacy Import Status interface
 */
export interface LegacyImportStatus {
  success: boolean;
  recordCount: number;
  failedItems?: any[];
  timestamp: Date;
  message?: string;
}

/**
 * Adapt data update logs to legacy format for UI
 */
export function adaptDataUpdateLogs(logs: DataUpdateLog[]): LegacyLogFormat[] {
  return logs.map(log => {
    let details;
    let region;
    let message;

    // Try to parse details if available
    if (log.details) {
      try {
        const parsedDetails = JSON.parse(log.details);
        region = parsedDetails.region;
        message = parsedDetails.message;
      } catch (error) {
        // If can't parse, use as is
        message = log.details;
      }
    }

    return {
      id: log.id,
      type: log.type,
      status: log.status,
      details: log.details,
      timestamp: log.timestamp,
      region,
      message
    };
  });
}

/**
 * Adapt import status to legacy format
 */
export function adaptImportStatus(
  success: boolean, 
  recordCount: number, 
  failedItems?: any[],
  message?: string
): LegacyImportStatus {
  return {
    success,
    recordCount,
    failedItems,
    timestamp: new Date(),
    message
  };
}

/**
 * Create a data update log entry that matches the expected format
 */
export function createAdaptedDataUpdateLog(
  type: string,
  status: 'Success' | 'Error' | 'In Progress',
  region?: string,
  message?: string,
  additionalDetails?: Record<string, any>
): InsertDataUpdateLog {
  // Construct the details object
  const details = JSON.stringify({
    region,
    message,
    ...additionalDetails
  });
  
  return {
    type,
    status,
    details,
    timestamp: new Date()
  };
}

/**
 * Adapt upgrade/downgrade history for UI display
 */
export function adaptUpgradeDowngradeHistory(
  history: UpgradeDowngradeHistory[]
): any[] {
  return history.map(item => ({
    id: item.id,
    symbol: item.symbol,
    region: item.region,
    firm: item.firm,
    toGrade: item.toGrade,
    fromGrade: item.fromGrade,
    action: item.action,
    epochGradeDate: item.epochGradeDate,
    gradeDate: item.gradeDate,
    createdAt: item.createdAt
  }));
}

/**
 * Adapt earnings data for UI display
 */
export function adaptEarningsData(earnings: Earnings[]): any[] {
  return earnings.map(item => ({
    id: item.id,
    symbol: item.symbol,
    region: item.region,
    company: item.company,
    fiscalQuarter: item.fiscalQuarter,
    fiscalYear: item.fiscalYear,
    reportDate: item.reportDate,
    timeOfDay: item.timeOfDay,
    epsEstimate: item.epsEstimate ? Number(item.epsEstimate) : null,
    epsActual: item.epsActual ? Number(item.epsActual) : null,
    epsSurprisePercent: item.epsSurprisePercent ? Number(item.epsSurprisePercent) : null,
    revenueEstimate: item.revenueEstimate ? Number(item.revenueEstimate) : null,
    revenueActual: item.revenueActual ? Number(item.revenueActual) : null,
    revenueSurprisePercent: item.revenueSurprisePercent ? Number(item.revenueSurprisePercent) : null,
    stockImpact: item.stockImpact ? Number(item.stockImpact) : null,
    guidance: item.guidance,
    notes: item.notes
  }));
}

/**
 * Transform earnings data into a quarterly heatmap format
 */
export function transformEarningsForHeatmap(earningsData: Earnings[]): any {
  // Group by fiscal quarters and years
  const quarterData: Record<string, any> = {};
  
  earningsData.forEach(item => {
    const quarter = `${item.fiscalYear}-${item.fiscalQuarter}`;
    
    if (!quarterData[quarter]) {
      quarterData[quarter] = {
        quarter: item.fiscalQuarter,
        year: item.fiscalYear,
        beat: 0,
        miss: 0,
        inLine: 0,
        total: 0,
        details: []
      };
    }
    
    // Determine if it's a beat, miss, or in-line
    let result = 'inLine';
    if (item.epsSurprisePercent) {
      if (Number(item.epsSurprisePercent) > 2) {
        result = 'beat';
      } else if (Number(item.epsSurprisePercent) < -2) {
        result = 'miss';
      }
    }
    
    // Increment the corresponding counter
    quarterData[quarter][result]++;
    quarterData[quarter].total++;
    
    // Add details
    quarterData[quarter].details.push({
      symbol: item.symbol,
      epsEstimate: item.epsEstimate ? Number(item.epsEstimate) : null,
      epsActual: item.epsActual ? Number(item.epsActual) : null,
      epsSurprisePercent: item.epsSurprisePercent ? Number(item.epsSurprisePercent) : null,
      stockImpact: item.stockImpact ? Number(item.stockImpact) : null,
      guidance: item.guidance,
      result
    });
  });
  
  // Convert to array and sort by year and quarter
  return Object.values(quarterData).sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year; // Sort by year descending
    }
    // Extract quarter number (Q1, Q2, etc.)
    const aQuarterNum = parseInt(a.quarter.replace('Q', ''));
    const bQuarterNum = parseInt(b.quarter.replace('Q', ''));
    return bQuarterNum - aQuarterNum; // Sort by quarter descending
  });
}
import { db } from '../db';
import { dataUpdateLogs } from '@shared/schema';
import type { InsertDataUpdateLog } from '@shared/schema';
import { sql } from 'drizzle-orm';

export interface LogDetails {
  symbol?: string;
  region?: string;
  symbols?: string[];
  pricesUpdated?: number;
  failedUpdates?: number;
  message?: string;
  error?: string;
  progress?: string;
  totalStocks?: number;
  processedStocks?: number;
  batchNumber?: number;
  totalBatches?: number;
  currentPrice?: number;
  changePercent?: number;
  metrics?: {
    mtdReturn?: number;
    ytdReturn?: number;
    sixMonthReturn?: number;
    fiftyTwoWeekReturn?: number;
  };
}

class DataUpdateLogger {
  private pendingLogs: Map<string, NodeJS.Timeout> = new Map();
  private logBuffer: InsertDataUpdateLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush logs every 500ms to avoid overwhelming the database
    this.flushInterval = setInterval(() => this.flushLogs(), 500);
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      await db.insert(dataUpdateLogs).values(logsToFlush);
    } catch (error) {
      console.error('Error flushing logs:', error);
    }
  }

  async log(type: string, status: 'Success' | 'Error' | 'In Progress', details: LogDetails) {
    const logEntry: InsertDataUpdateLog = {
      type,
      status,
      details: JSON.stringify(details),
      timestamp: new Date()
    };
    
    this.logBuffer.push(logEntry);
  }

  async logStockPriceUpdate(symbol: string, region: string, status: 'In Progress' | 'Success' | 'Error', details?: Partial<LogDetails>) {
    const logDetails: LogDetails = {
      symbol,
      region,
      message: status === 'In Progress' ? `Fetching price for ${symbol}` : 
               status === 'Success' ? `Price updated for ${symbol}` : 
               `Failed to update ${symbol}`,
      ...details
    };
    
    await this.log('current_prices', status, logDetails);
  }

  async logBatchProgress(type: string, batchNumber: number, totalBatches: number, symbols: string[], region: string) {
    const logDetails: LogDetails = {
      region,
      symbols,
      batchNumber,
      totalBatches,
      message: `Processing batch ${batchNumber}/${totalBatches}: ${symbols.join(', ')}`,
      progress: `${Math.round((batchNumber / totalBatches) * 100)}%`
    };
    
    await this.log(type, 'In Progress', logDetails);
  }

  async logPerformanceMetricsUpdate(symbol: string, region: string, metrics: LogDetails['metrics']) {
    const logDetails: LogDetails = {
      symbol,
      region,
      metrics,
      message: `Performance metrics calculated for ${symbol}`,
      progress: 'Complete'
    };
    
    await this.log('performance_metrics', 'Success', logDetails);
  }

  async logHistoricalPriceUpdate(symbol: string, region: string, daysUpdated: number, status: 'Success' | 'Error', error?: string) {
    const logDetails: LogDetails = {
      symbol,
      region,
      message: status === 'Success' ? 
        `Historical prices updated for ${symbol}: ${daysUpdated} days` : 
        `Failed to update historical prices for ${symbol}`,
      error,
      totalStocks: daysUpdated
    };
    
    await this.log('historical_prices', status, logDetails);
  }

  async logUpdateStart(type: string, region: string, totalStocks: number) {
    const logDetails: LogDetails = {
      region,
      totalStocks,
      processedStocks: 0,
      message: `Starting ${type} update for ${region} portfolio (${totalStocks} stocks)`,
      progress: '0%'
    };
    
    await this.log(type, 'In Progress', logDetails);
  }

  async logUpdateComplete(type: string, region: string, totalStocks: number, successCount: number, failureCount: number) {
    const logDetails: LogDetails = {
      region,
      totalStocks,
      pricesUpdated: successCount,
      failedUpdates: failureCount,
      message: `${type} update completed for ${region}: ${successCount}/${totalStocks} successful`,
      progress: '100%'
    };
    
    await this.log(type, successCount === totalStocks ? 'Success' : 'Error', logDetails);
  }

  // Clear old logs (keep only last 1000 entries)
  async clearOldLogs() {
    try {
      const allLogs = await db.select({ id: dataUpdateLogs.id })
        .from(dataUpdateLogs)
        .orderBy(dataUpdateLogs.timestamp);
      
      if (allLogs.length > 1000) {
        const idsToDelete = allLogs.slice(0, allLogs.length - 1000).map(log => log.id);
        await db.delete(dataUpdateLogs)
          .where(sql`${dataUpdateLogs.id} = ANY(${idsToDelete})`);
      }
    } catch (error) {
      console.error('Error clearing old logs:', error);
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Flush any remaining logs
    this.flushLogs();
  }
}

// Export singleton instance
export const dataUpdateLogger = new DataUpdateLogger();
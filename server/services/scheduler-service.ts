import { db } from "../db";
import { dataUpdateLogs, insertDataUpdateLogSchema } from "@shared/schema";
import { InsertDataUpdateLog } from "@shared/schema";
import { isWeekend, isWithinMarketHours, toESTTime } from "../util";
import { currentPriceService } from "./current-price-service";
import { historicalPriceService } from "./historical-price-service";

/**
 * Configuration type for the scheduler
 */
type SchedulerConfig = {
  current_prices: {
    enabled: boolean;
    intervalMinutes: number;
    startTime: string; // HH:MM format (market open)
    endTime: string;   // HH:MM format (market close)
    skipWeekends: boolean;
  };
  historical_prices: {
    enabled: boolean;
    timeOfDay: string; // HH:MM format
    skipWeekends: boolean;
  };
};

/**
 * Scheduler service for managing automatic updates
 */
class SchedulerService {
  private config: SchedulerConfig;
  private currentPriceTimer: NodeJS.Timeout | null = null;
  private historicalPriceTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the scheduler service
   */
  constructor() {
    // Default configuration
    this.config = {
      current_prices: {
        enabled: true,
        intervalMinutes: 10,
        startTime: '09:30', // US market open
        endTime: '16:00',   // US market close
        skipWeekends: true,
      },
      historical_prices: {
        enabled: true,
        timeOfDay: '17:00', // 5:00 PM
        skipWeekends: true,
      }
    };
  }

  /**
   * Initialize the scheduler service
   */
  async init() {
    console.log('Initializing scheduler service...');
    
    try {
      // Load any saved configuration from database
      // For simplicity, we'll just use the default config for now
      
      // Start the schedulers
      if (this.config.current_prices.enabled) {
        this.startCurrentPriceScheduler();
      }
      
      if (this.config.historical_prices.enabled) {
        this.startHistoricalPriceScheduler();
      }
      
      console.log('Scheduler service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize scheduler service:', error);
      return false;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): SchedulerConfig {
    return this.config;
  }

  /**
   * Update the configuration
   */
  updateConfig(type: 'current_prices' | 'historical_prices', config: any): any {
    // Merge the new config with the existing one
    this.config[type] = {
      ...this.config[type],
      ...config
    };
    
    // Restart the appropriate scheduler
    if (type === 'current_prices') {
      this.restartCurrentPriceScheduler();
    } else {
      this.restartHistoricalPriceScheduler();
    }
    
    return this.config[type];
  }

  /**
   * Start the current price scheduler
   */
  private startCurrentPriceScheduler() {
    const { intervalMinutes } = this.config.current_prices;
    console.log(`Starting current price scheduler with interval of ${intervalMinutes} minutes`);

    // Run immediately if within market hours
    const estNow = toESTTime(new Date());
    console.log(`Current EST time: ${estNow.toLocaleString()}`);
    
    const { startTime, endTime, skipWeekends } = this.config.current_prices;
    
    if (
      (!skipWeekends || !isWeekend(estNow)) && 
      isWithinMarketHours(estNow, startTime, endTime)
    ) {
      this.updateCurrentPrices();
    }
    
    // Schedule regular updates
    this.currentPriceTimer = setInterval(() => {
      const estNow = toESTTime(new Date());
      
      if (
        (!skipWeekends || !isWeekend(estNow)) && 
        isWithinMarketHours(estNow, startTime, endTime)
      ) {
        console.log(`Running scheduled current price update at EST: ${estNow.toLocaleString()}`);
        this.updateCurrentPrices();
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Restart the current price scheduler
   */
  private restartCurrentPriceScheduler() {
    if (this.currentPriceTimer) {
      clearInterval(this.currentPriceTimer);
      this.currentPriceTimer = null;
    }
    
    if (this.config.current_prices.enabled) {
      this.startCurrentPriceScheduler();
    }
  }

  /**
   * Start the historical price scheduler
   */
  private startHistoricalPriceScheduler() {
    const nextRunTime = this.calculateNextHistoricalPriceRunTime();
    const now = new Date();
    const msUntilNextRun = nextRunTime.getTime() - now.getTime();
    
    console.log(`Scheduling historical price update at EST: ${nextRunTime.toLocaleString()}`);
    
    // Schedule the next run
    this.historicalPriceTimer = setTimeout(() => {
      this.updateHistoricalPrices();
      
      // Schedule daily runs
      this.historicalPriceTimer = setInterval(() => {
        const estNow = toESTTime(new Date());
        if (!this.config.historical_prices.skipWeekends || !isWeekend(estNow)) {
          console.log(`Running scheduled historical price update at EST: ${estNow.toLocaleString()}`);
          this.updateHistoricalPrices();
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilNextRun);
  }

  /**
   * Restart the historical price scheduler
   */
  private restartHistoricalPriceScheduler() {
    if (this.historicalPriceTimer) {
      clearTimeout(this.historicalPriceTimer);
      clearInterval(this.historicalPriceTimer);
      this.historicalPriceTimer = null;
    }
    
    if (this.config.historical_prices.enabled) {
      this.startHistoricalPriceScheduler();
    }
  }

  /**
   * Calculate the next time to run the historical price update
   */
  private calculateNextHistoricalPriceRunTime(): Date {
    // Get current time in EST timezone
    const estNow = toESTTime(new Date());
    console.log(`Current EST time: ${estNow.toLocaleString()}`);
    
    const [hours, minutes] = this.config.historical_prices.timeOfDay.split(':').map(Number);
    
    const nextRun = new Date(estNow);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= estNow) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    // If we're skipping weekends and the next run is on a weekend, adjust
    if (this.config.historical_prices.skipWeekends) {
      const day = nextRun.getDay();
      if (day === 0) { // Sunday
        nextRun.setDate(nextRun.getDate() + 1); // Move to Monday
      } else if (day === 6) { // Saturday
        nextRun.setDate(nextRun.getDate() + 2); // Move to Monday
      }
    }
    
    console.log(`Next historical price update scheduled for EST: ${nextRun.toLocaleString()}`);
    return nextRun;
  }

  /**
   * Update current prices for all portfolios
   */
  private async updateCurrentPrices() {
    console.log('Running scheduled current price update');
    
    try {
      // Call the current price service to update all prices
      const results = await currentPriceService.updateAllCurrentPrices();
      
      const successCount = results.filter(r => r.success).length;
      const totalSymbols = results.length;
      
      // Log the successful update
      await this.logUpdate('current_prices', 'Success', {
        message: `Scheduled current price update completed successfully - ${successCount}/${totalSymbols} symbols updated`,
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          symbol: r.symbol,
          success: r.success,
          error: r.error ? r.error : undefined
        }))
      });
      
    } catch (error) {
      console.error('Failed to update current prices:', error);
      
      // Log the failed update
      await this.logUpdate('current_prices', 'Error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update historical prices for all portfolios
   */
  private async updateHistoricalPrices() {
    console.log('Running scheduled historical price update');
    
    try {
      // Call the historical price service to update all prices
      const results = await historicalPriceService.updateAllHistoricalPrices();
      
      const successCount = results.filter(r => r.success).length;
      const totalSymbols = results.length;
      const totalPrices = results.reduce((acc, r) => acc + (r.result?.length || 0), 0);
      
      // Log the successful update
      await this.logUpdate('historical_prices', 'Success', {
        message: `Scheduled historical price update completed successfully - ${successCount}/${totalSymbols} symbols updated, ${totalPrices} new price points added`,
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          symbol: r.symbol,
          success: r.success,
          pricesAdded: r.result?.length || 0,
          error: r.error ? r.error : undefined
        }))
      });
      
    } catch (error) {
      console.error('Failed to update historical prices:', error);
      
      // Log the failed update
      await this.logUpdate('historical_prices', 'Error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log an update to the database or update an existing log entry
   * This is public so that route handlers can call it directly for manual updates
   * @param type The type of update
   * @param status The status of the update
   * @param details The details of the update
   * @param logId Optional ID of an existing log entry to update instead of creating a new one
   * @returns The log entry
   */
  async logUpdate(type: string, status: 'Success' | 'Error' | 'In Progress', details: any, logId?: number): Promise<any> {
    try {
      // If a Success log is being created, clean up any In Progress logs of the same type
      if (status === 'Success' && !logId) {
        try {
          // Must use explicit equality comparison for type and status to avoid PostgreSQL type conversion errors
          await db.execute(
            `DELETE FROM "data_update_logs" WHERE "type" = $1 AND "status" = $2`,
            [type, 'In Progress']
          );
          
          console.log(`Cleaned up In Progress logs for ${type}`);
        } catch (deleteError) {
          console.error('Error cleaning up In Progress logs:', deleteError);
          // Continue with the log creation even if cleanup fails
        }
      }
      
      // Make sure details is properly stringified
      const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);
      
      // If logId is provided, update the existing log entry
      if (logId && typeof logId === 'number') {
        try {
          // Use raw SQL to avoid PostgreSQL type conversion issues
          const result = await db.execute(
            `UPDATE "data_update_logs" SET "status" = $1, "details" = $2 WHERE "id" = $3 RETURNING *`,
            [status, detailsJson, logId]
          );
          
          if (result.rows && result.rows.length > 0) {
            return result.rows[0];
          }
        } catch (updateError) {
          console.error('Error updating log entry:', updateError);
          // If update fails, create a new log instead
          logId = undefined;
        }
      }
      
      // Otherwise, create a new log entry
      const logEntry: InsertDataUpdateLog = {
        type,
        status, // Now status can be 'Success', 'Error', or 'In Progress'
        details: detailsJson,
      };
      
      try {
        const [result] = await db.insert(dataUpdateLogs).values(logEntry).returning();
        return result;
      } catch (insertError) {
        console.error('Error inserting log entry:', insertError);
        return null;
      }
    } catch (error) {
      console.error('Failed to log update:', error);
      return null;
    }
  }

  /**
   * Get update logs
   */
  async getLogs(limit: number = 50): Promise<any[]> {
    try {
      const logs = await db.select().from(dataUpdateLogs).orderBy(dataUpdateLogs.timestamp, 'desc').limit(limit);
      return logs;
    } catch (error) {
      console.error('Error fetching update logs:', error);
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();
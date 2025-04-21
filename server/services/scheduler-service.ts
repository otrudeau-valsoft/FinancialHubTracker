import { historicalPriceService } from './historical-price-service';
import { currentPriceService } from './current-price-service';
import { db } from '../db';
import { dataUpdateLogs, type DataUpdateLog, type InsertDataUpdateLog } from '@shared/schema';
import { isWeekend, formatDateTime, isWithinMarketHours } from '../util';

// Default config for schedulers
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

class SchedulerService {
  private config: SchedulerConfig;
  private currentPriceTimer: NodeJS.Timeout | null = null;
  private historicalPriceTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // Initialize with default configuration
    this.config = {
      current_prices: {
        enabled: true,
        intervalMinutes: 10,
        startTime: '09:30', // Market open (Eastern Time)
        endTime: '16:00',   // Market close (Eastern Time)
        skipWeekends: true,
      },
      historical_prices: {
        enabled: true,
        timeOfDay: '17:00', // Run after market close
        skipWeekends: true,
      }
    };
  }
  
  /**
   * Initialize the scheduler service
   */
  async init() {
    console.log('Initializing scheduler service...');
    
    // Start scheduled tasks
    this.startCurrentPriceScheduler();
    this.startHistoricalPriceScheduler();
    
    console.log('Scheduler service initialized successfully');
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
    // Merge the new config with the old one
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
    if (this.currentPriceTimer) {
      clearInterval(this.currentPriceTimer);
    }
    
    if (!this.config.current_prices.enabled) {
      console.log('Current price scheduler is disabled');
      return;
    }
    
    const intervalMs = this.config.current_prices.intervalMinutes * 60 * 1000;
    
    console.log(`Starting current price scheduler with interval of ${this.config.current_prices.intervalMinutes} minutes`);
    
    this.currentPriceTimer = setInterval(async () => {
      try {
        const now = new Date();
        
        // Skip if it's a weekend and skipWeekends is enabled
        if (this.config.current_prices.skipWeekends && isWeekend(now)) {
          console.log('Skipping current price update on weekend');
          return;
        }
        
        // Skip if it's outside market hours
        if (!isWithinMarketHours(now, 
                               this.config.current_prices.startTime,
                               this.config.current_prices.endTime)) {
          console.log('Skipping current price update outside market hours');
          return;
        }
        
        console.log('Running scheduled current price update');
        await this.updateCurrentPrices();
        
      } catch (error) {
        console.error('Error in scheduled current price update:', error);
      }
    }, intervalMs);
  }
  
  /**
   * Restart the current price scheduler
   */
  private restartCurrentPriceScheduler() {
    console.log('Restarting current price scheduler');
    this.startCurrentPriceScheduler();
  }
  
  /**
   * Start the historical price scheduler
   */
  private startHistoricalPriceScheduler() {
    if (this.historicalPriceTimer) {
      clearInterval(this.historicalPriceTimer);
    }
    
    if (!this.config.historical_prices.enabled) {
      console.log('Historical price scheduler is disabled');
      return;
    }
    
    // Calculate time until next run
    const nextRunTime = this.calculateNextHistoricalPriceRunTime();
    const timeUntilNextRun = nextRunTime.getTime() - new Date().getTime();
    
    console.log(`Scheduling historical price update at ${formatDateTime(nextRunTime)}`);
    
    // Schedule the first run
    this.historicalPriceTimer = setTimeout(async () => {
      try {
        await this.updateHistoricalPrices();
      } catch (error) {
        console.error('Error in scheduled historical price update:', error);
      } finally {
        // Schedule the next run for tomorrow
        this.startHistoricalPriceScheduler();
      }
    }, timeUntilNextRun);
  }
  
  /**
   * Restart the historical price scheduler
   */
  private restartHistoricalPriceScheduler() {
    console.log('Restarting historical price scheduler');
    this.startHistoricalPriceScheduler();
  }
  
  /**
   * Calculate the next time to run the historical price update
   */
  private calculateNextHistoricalPriceRunTime(): Date {
    const now = new Date();
    const [hours, minutes] = this.config.historical_prices.timeOfDay.split(':').map(Number);
    
    // Create a date for today at the specified time
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time is in the past, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // If skipWeekends is enabled and the next run falls on a weekend, skip to Monday
    if (this.config.historical_prices.skipWeekends && isWeekend(scheduledTime)) {
      // If it's a Saturday, add 2 days to get to Monday
      if (scheduledTime.getDay() === 6) {
        scheduledTime.setDate(scheduledTime.getDate() + 2);
      } 
      // If it's a Sunday, add 1 day to get to Monday
      else if (scheduledTime.getDay() === 0) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
    }
    
    return scheduledTime;
  }
  
  /**
   * Update current prices for all portfolios
   */
  private async updateCurrentPrices() {
    try {
      console.log('Starting scheduled current price update');
      
      const results = await currentPriceService.updateAllCurrentPrices();
      
      // Log the update
      await this.logUpdate('current_prices', 'Success', {
        message: `Updated current prices for all portfolios`,
        results
      });
      
      console.log('Successfully completed current price update');
      return results;
    } catch (error) {
      console.error('Error updating current prices:', error);
      
      // Log the error
      await this.logUpdate('current_prices', 'Error', {
        message: 'Failed to update current prices',
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  /**
   * Update historical prices for all portfolios
   */
  private async updateHistoricalPrices() {
    try {
      console.log('Starting scheduled historical price update');
      
      // Update historical prices for all three regions
      const usdResults = await historicalPriceService.updatePortfolioHistoricalPrices('USD');
      const cadResults = await historicalPriceService.updatePortfolioHistoricalPrices('CAD');
      const intlResults = await historicalPriceService.updatePortfolioHistoricalPrices('INTL');
      
      // Log the update
      await this.logUpdate('historical_prices', 'Success', {
        message: `Updated historical prices for all portfolios`,
        usdResults,
        cadResults,
        intlResults
      });
      
      console.log('Successfully completed historical price update');
      return { usdResults, cadResults, intlResults };
    } catch (error) {
      console.error('Error updating historical prices:', error);
      
      // Log the error
      await this.logUpdate('historical_prices', 'Error', {
        message: 'Failed to update historical prices',
        error: (error as Error).message
      });
      
      throw error;
    }
  }
  
  /**
   * Log an update to the database
   */
  private async logUpdate(type: string, status: 'Success' | 'Error', details: any): Promise<DataUpdateLog> {
    const log: InsertDataUpdateLog = {
      type,
      status,
      details: JSON.stringify(details),
      timestamp: new Date()
    };
    
    const [result] = await db.insert(dataUpdateLogs).values(log).returning();
    return result;
  }
  
  /**
   * Get update logs
   */
  async getLogs(limit: number = 50): Promise<DataUpdateLog[]> {
    const logs = await db.select().from(dataUpdateLogs).orderBy(dataUpdateLogs.timestamp, 'desc').limit(limit);
    return logs;
  }
}

export const schedulerService = new SchedulerService();
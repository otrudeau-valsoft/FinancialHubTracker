import { db } from '../db';
import { currentPriceService } from './current-price-service';
import { historicalPriceService } from './historical-price-service';
import { eq, and, lt } from 'drizzle-orm';
import { dataUpdateLogs, type InsertDataUpdateLog } from '@shared/schema';

// In-memory storage for schedule config
let scheduleConfig = {
  current_prices: {
    enabled: true,
    interval: 10, // minutes
    startTime: "09:30",
    endTime: "16:00",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    lastRun: null as Date | null,
    nextRun: null as Date | null
  },
  historical_prices: {
    enabled: true,
    interval: 1440, // once a day (in minutes)
    startTime: "16:30",
    endTime: "17:30",
    daysOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    lastRun: null as Date | null,
    nextRun: null as Date | null
  }
};

// Timers
let currentPriceTimer: NodeJS.Timeout | null = null;
let historicalPriceTimer: NodeJS.Timeout | null = null;

class SchedulerService {
  /**
   * Initialize scheduler service and restore previous state if available
   */
  async init() {
    console.log("Initializing scheduler service...");
    
    // TODO: Load state from database if we decide to persist scheduler config
    
    // Calculate next run times
    this.calculateNextRun('current_prices');
    this.calculateNextRun('historical_prices');
    
    // Start timers if enabled
    if (scheduleConfig.current_prices.enabled) {
      this.startCurrentPriceScheduler();
    }
    
    if (scheduleConfig.historical_prices.enabled) {
      this.startHistoricalPriceScheduler();
    }
  }
  
  /**
   * Get scheduler configuration
   */
  getConfig() {
    return scheduleConfig;
  }
  
  /**
   * Update scheduler configuration
   */
  updateConfig(type: 'current_prices' | 'historical_prices', config: Partial<typeof scheduleConfig.current_prices>) {
    const oldConfig = {...scheduleConfig[type]};
    
    // Update config
    scheduleConfig[type] = {
      ...scheduleConfig[type],
      ...config
    };
    
    // If enabled state changed
    if (oldConfig.enabled !== scheduleConfig[type].enabled) {
      if (scheduleConfig[type].enabled) {
        // Scheduler was enabled, start it
        if (type === 'current_prices') {
          this.startCurrentPriceScheduler();
        } else {
          this.startHistoricalPriceScheduler();
        }
      } else {
        // Scheduler was disabled, stop it
        if (type === 'current_prices' && currentPriceTimer) {
          clearTimeout(currentPriceTimer);
          currentPriceTimer = null;
        } else if (type === 'historical_prices' && historicalPriceTimer) {
          clearTimeout(historicalPriceTimer);
          historicalPriceTimer = null;
        }
      }
    } else if (scheduleConfig[type].enabled) {
      // Scheduler is enabled and config changed, recalculate next run
      this.calculateNextRun(type);
      
      // Restart timer with new config
      if (type === 'current_prices') {
        if (currentPriceTimer) {
          clearTimeout(currentPriceTimer);
        }
        this.startCurrentPriceScheduler();
      } else {
        if (historicalPriceTimer) {
          clearTimeout(historicalPriceTimer);
        }
        this.startHistoricalPriceScheduler();
      }
    }
    
    // TODO: Persist config to database if we decide to persist scheduler config
    
    return scheduleConfig[type];
  }
  
  /**
   * Calculate next run time based on schedule configuration
   */
  calculateNextRun(type: 'current_prices' | 'historical_prices') {
    const config = scheduleConfig[type];
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if today is a scheduled day
    if (!config.daysOfWeek.includes(today)) {
      // Next run will be on the next scheduled day
      let daysToAdd = 1;
      let nextDay = new Date();
      nextDay.setDate(now.getDate() + daysToAdd);
      let nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
      
      while (!config.daysOfWeek.includes(nextDayName)) {
        daysToAdd++;
        nextDay = new Date();
        nextDay.setDate(now.getDate() + daysToAdd);
        nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
      }
      
      // Set time to start time
      const [startHour, startMinute] = config.startTime.split(':').map(Number);
      nextDay.setHours(startHour, startMinute, 0, 0);
      
      config.nextRun = nextDay;
      return;
    }
    
    // Parse start and end times
    const [startHour, startMinute] = config.startTime.split(':').map(Number);
    const [endHour, endMinute] = config.endTime.split(':').map(Number);
    
    // Create Date objects for start and end times today
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // Check if we're within the scheduled time window
    if (now >= startTime && now <= endTime) {
      // We're within the window, calculate next run based on interval
      if (config.lastRun) {
        const nextRun = new Date(config.lastRun);
        nextRun.setMinutes(nextRun.getMinutes() + config.interval);
        
        // If next run would be after end time, schedule for tomorrow's start time
        if (nextRun > endTime) {
          const tomorrow = new Date();
          tomorrow.setDate(now.getDate() + 1);
          const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Find next scheduled day
          if (config.daysOfWeek.includes(tomorrowDay)) {
            tomorrow.setHours(startHour, startMinute, 0, 0);
            config.nextRun = tomorrow;
          } else {
            // Next run will be on the next scheduled day
            let daysToAdd = 1;
            let nextDay = new Date();
            nextDay.setDate(now.getDate() + daysToAdd);
            let nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
            
            while (!config.daysOfWeek.includes(nextDayName)) {
              daysToAdd++;
              nextDay = new Date();
              nextDay.setDate(now.getDate() + daysToAdd);
              nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
            }
            
            // Set time to start time
            nextDay.setHours(startHour, startMinute, 0, 0);
            config.nextRun = nextDay;
          }
        } else {
          config.nextRun = nextRun;
        }
      } else {
        // No last run, schedule for now
        config.nextRun = new Date(now);
      }
    } else if (now < startTime) {
      // Before start time, schedule for today's start time
      config.nextRun = new Date(startTime);
    } else {
      // After end time, schedule for tomorrow's start time
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Find next scheduled day
      if (config.daysOfWeek.includes(tomorrowDay)) {
        tomorrow.setHours(startHour, startMinute, 0, 0);
        config.nextRun = tomorrow;
      } else {
        // Next run will be on the next scheduled day
        let daysToAdd = 1;
        let nextDay = new Date();
        nextDay.setDate(now.getDate() + daysToAdd);
        let nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
        
        while (!config.daysOfWeek.includes(nextDayName)) {
          daysToAdd++;
          nextDay = new Date();
          nextDay.setDate(now.getDate() + daysToAdd);
          nextDayName = nextDay.toLocaleDateString('en-US', { weekday: 'long' });
        }
        
        // Set time to start time
        nextDay.setHours(startHour, startMinute, 0, 0);
        config.nextRun = nextDay;
      }
    }
  }
  
  /**
   * Start the current price scheduler
   */
  startCurrentPriceScheduler() {
    if (!scheduleConfig.current_prices.enabled || !scheduleConfig.current_prices.nextRun) {
      return;
    }
    
    const now = new Date();
    const nextRun = scheduleConfig.current_prices.nextRun;
    const timeUntilNextRun = Math.max(0, nextRun.getTime() - now.getTime());
    
    console.log(`Scheduling current price update in ${Math.round(timeUntilNextRun / 1000 / 60)} minutes`);
    
    // Set timeout for next run
    currentPriceTimer = setTimeout(async () => {
      await this.runCurrentPriceUpdate();
      
      // Schedule next run
      scheduleConfig.current_prices.lastRun = new Date();
      this.calculateNextRun('current_prices');
      this.startCurrentPriceScheduler();
    }, timeUntilNextRun);
  }
  
  /**
   * Start the historical price scheduler
   */
  startHistoricalPriceScheduler() {
    if (!scheduleConfig.historical_prices.enabled || !scheduleConfig.historical_prices.nextRun) {
      return;
    }
    
    const now = new Date();
    const nextRun = scheduleConfig.historical_prices.nextRun;
    const timeUntilNextRun = Math.max(0, nextRun.getTime() - now.getTime());
    
    console.log(`Scheduling historical price update in ${Math.round(timeUntilNextRun / 1000 / 60)} minutes`);
    
    // Set timeout for next run
    historicalPriceTimer = setTimeout(async () => {
      await this.runHistoricalPriceUpdate();
      
      // Schedule next run
      scheduleConfig.historical_prices.lastRun = new Date();
      this.calculateNextRun('historical_prices');
      this.startHistoricalPriceScheduler();
    }, timeUntilNextRun);
  }
  
  /**
   * Run current price update for all portfolios
   */
  async runCurrentPriceUpdate() {
    console.log("Running scheduled current price update for all portfolios...");
    
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      
      for (const region of regions) {
        try {
          console.log(`Updating current prices for ${region} portfolio...`);
          const result = await currentPriceService.updatePortfolioCurrentPrices(region);
          
          // Log update
          await this.logUpdate({
            type: 'current_price',
            region,
            status: 'success',
            message: `Updated ${result.length} current prices for ${region} portfolio`,
            affectedRows: result.length,
            timestamp: new Date()
          });
          
          console.log(`Successfully updated ${result.length} current prices for ${region} portfolio`);
        } catch (error) {
          console.error(`Error updating current prices for ${region} portfolio:`, error);
          
          // Log error
          await this.logUpdate({
            type: 'current_price',
            region,
            status: 'failed',
            message: `Error: ${error.message}`,
            affectedRows: 0,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error("Error running scheduled current price update:", error);
    }
  }
  
  /**
   * Run historical price update for all portfolios
   * 
   * This version only fetches the latest historical prices since the last update
   */
  async runHistoricalPriceUpdate() {
    console.log("Running scheduled historical price update for all portfolios...");
    
    try {
      const regions = ['USD', 'CAD', 'INTL'];
      
      for (const region of regions) {
        try {
          console.log(`Updating historical prices for ${region} portfolio...`);
          
          // Get portfolio symbols
          const symbols = await currentPriceService.getPortfolioSymbols(region);
          let totalUpdated = 0;
          
          // For each symbol, find most recent historical price and update from there
          for (const symbol of symbols) {
            // Find most recent historical price date
            const latestPrices = await historicalPriceService.getLatestHistoricalPrice(symbol, region);
            
            let startDate: Date;
            if (latestPrices && latestPrices.length > 0) {
              // Use the day after the latest price as start date
              startDate = new Date(latestPrices[0].date);
              startDate.setDate(startDate.getDate() + 1);
            } else {
              // No existing data, default to 5 years ago
              startDate = new Date();
              startDate.setFullYear(startDate.getFullYear() - 5);
            }
            
            // Only fetch if startDate is before today
            const today = new Date();
            if (startDate < today) {
              console.log(`Fetching historical prices for ${symbol} (${region}) from ${startDate.toISOString().split('T')[0]}`);
              
              // Fetch and store historical prices
              const result = await historicalPriceService.fetchAndStoreHistoricalPrices(
                symbol, 
                region, 
                startDate, 
                today
              );
              
              totalUpdated += result.length;
              console.log(`Added ${result.length} new historical prices for ${symbol} (${region})`);
            } else {
              console.log(`Historical prices for ${symbol} (${region}) are up to date`);
            }
          }
          
          // Log update
          await this.logUpdate({
            type: 'historical_price',
            region,
            status: 'success',
            message: `Updated ${totalUpdated} historical prices for ${region} portfolio`,
            affectedRows: totalUpdated,
            timestamp: new Date()
          });
          
          console.log(`Successfully updated ${totalUpdated} historical prices for ${region} portfolio`);
        } catch (error) {
          console.error(`Error updating historical prices for ${region} portfolio:`, error);
          
          // Log error
          await this.logUpdate({
            type: 'historical_price',
            region,
            status: 'failed',
            message: `Error: ${error.message}`,
            affectedRows: 0,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error("Error running scheduled historical price update:", error);
    }
  }
  
  /**
   * Manually trigger current price update for a specific region
   */
  async triggerCurrentPriceUpdate(region: string) {
    console.log(`Manually triggering current price update for ${region} portfolio...`);
    
    try {
      const result = await currentPriceService.updatePortfolioCurrentPrices(region);
      
      // Log update
      await this.logUpdate({
        type: 'current_price',
        region,
        status: 'success',
        message: `Manually updated ${result.length} current prices for ${region} portfolio`,
        affectedRows: result.length,
        timestamp: new Date()
      });
      
      console.log(`Successfully updated ${result.length} current prices for ${region} portfolio`);
      return result;
    } catch (error) {
      console.error(`Error updating current prices for ${region} portfolio:`, error);
      
      // Log error
      await this.logUpdate({
        type: 'current_price',
        region,
        status: 'failed',
        message: `Error: ${error.message}`,
        affectedRows: 0,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Manually trigger historical price update for a specific region
   * This version only fetches the latest historical prices since the last update
   */
  async triggerHistoricalPriceUpdate(region: string) {
    console.log(`Manually triggering historical price update for ${region} portfolio...`);
    
    try {
      // Get portfolio symbols
      const symbols = await currentPriceService.getPortfolioSymbols(region);
      let totalUpdated = 0;
      let results = [];
      
      // For each symbol, find most recent historical price and update from there
      for (const symbol of symbols) {
        // Find most recent historical price date
        const latestPrices = await historicalPriceService.getLatestHistoricalPrice(symbol, region);
        
        let startDate: Date;
        if (latestPrices && latestPrices.length > 0) {
          // Use the day after the latest price as start date
          startDate = new Date(latestPrices[0].date);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          // No existing data, default to 5 years ago
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 5);
        }
        
        // Only fetch if startDate is before today
        const today = new Date();
        if (startDate < today) {
          console.log(`Fetching historical prices for ${symbol} (${region}) from ${startDate.toISOString().split('T')[0]}`);
          
          // Fetch and store historical prices
          const result = await historicalPriceService.fetchAndStoreHistoricalPrices(
            symbol, 
            region, 
            startDate, 
            today
          );
          
          results.push({ symbol, count: result.length });
          totalUpdated += result.length;
          console.log(`Added ${result.length} new historical prices for ${symbol} (${region})`);
        } else {
          console.log(`Historical prices for ${symbol} (${region}) are up to date`);
          results.push({ symbol, count: 0 });
        }
      }
      
      // Log update
      await this.logUpdate({
        type: 'historical_price',
        region,
        status: 'success',
        message: `Manually updated ${totalUpdated} historical prices for ${region} portfolio`,
        affectedRows: totalUpdated,
        timestamp: new Date()
      });
      
      console.log(`Successfully updated ${totalUpdated} historical prices for ${region} portfolio`);
      return results;
    } catch (error) {
      console.error(`Error updating historical prices for ${region} portfolio:`, error);
      
      // Log error
      await this.logUpdate({
        type: 'historical_price',
        region,
        status: 'failed',
        message: `Error: ${error.message}`,
        affectedRows: 0,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Log update to database
   */
  async logUpdate(log: InsertDataUpdateLog) {
    try {
      const [result] = await db.insert(dataUpdateLogs).values(log).returning();
      return result;
    } catch (error) {
      console.error("Error logging update:", error);
      return null;
    }
  }
  
  /**
   * Get update logs
   */
  async getLogs(limit: number = 100) {
    try {
      const logs = await db.select().from(dataUpdateLogs).orderBy(dataUpdateLogs.timestamp, 'desc').limit(limit);
      return logs;
    } catch (error) {
      console.error("Error getting update logs:", error);
      return [];
    }
  }
}

export const schedulerService = new SchedulerService();
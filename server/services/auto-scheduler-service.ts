/**
 * Auto Scheduler Service
 * 
 * This service manages scheduled automatic updates for:
 * - Current prices (every 15 minutes during market hours)
 * - Historical prices (daily after market close)
 * - Performance metrics (after price updates)
 * - Portfolio performance history (weekly)
 */

import cron from 'node-cron';
import { currentPriceService } from './current-price-service';
import { historicalPriceService } from './historical-price-service';
// @ts-ignore - JavaScript module
import { portfolioPerformanceService } from './portfolio-performance-service.js';
import { dataUpdateLogger } from './data-update-logger';
import { db } from '../db';
import { schedulerConfigs, schedulerLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ScheduledJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
  cronJob?: cron.ScheduledTask;
}

class AutoSchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private isInitialized = false;

  constructor() {
    this.defineJobs();
    // Load configurations from database on startup
    this.loadConfigurationsFromDatabase().catch(console.error);
  }

  private async loadConfigurationsFromDatabase() {
    try {
      console.log('📄 Loading scheduler configurations from database...');
      
      // First ensure all jobs have database records
      await this.ensureJobsInDatabase();
      
      // Then load configurations from database
      const configs = await db.select().from(schedulerConfigs);
      
      for (const config of configs) {
        const job = this.jobs.get(config.id);
        if (job) {
          // Update job schedule from database if it was modified
          if (config.schedule && config.schedule !== job.schedule) {
            job.schedule = config.schedule;
          }
          
          // Enable/disable based on database config
          if (config.enabled && !job.enabled) {
            await this.enableJob(config.id, false); // false to skip DB update since we're loading from DB
          } else if (!config.enabled && job.enabled) {
            await this.disableJob(config.id, false);
          }
        }
      }
      console.log('✅ Scheduler configurations loaded from database');
    } catch (error) {
      console.error('❌ Error loading scheduler configurations from database:', error);
    }
  }

  private async ensureJobsInDatabase() {
    try {
      // Get all job IDs from memory
      const jobIds = Array.from(this.jobs.keys());
      
      // Get existing configs from database
      const existingConfigs = await db.select().from(schedulerConfigs);
      const existingIds = existingConfigs.map(c => c.id);
      
      // Insert any missing jobs into database
      for (const [jobId, job] of this.jobs) {
        if (!existingIds.includes(jobId)) {
          await db.insert(schedulerConfigs).values({
            id: jobId,
            name: job.name,
            schedule: job.schedule,
            enabled: false, // Default to disabled
            lastRun: null,
            lastStatus: null
          });
          console.log(`📝 Added job ${jobId} to database`);
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring jobs in database:', error);
    }
  }

  private async updateDatabaseConfig(jobId: string, updates: Partial<{ enabled: boolean; schedule: string; lastRun: Date; lastStatus: string }>) {
    try {
      await db.update(schedulerConfigs).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(schedulerConfigs.id, jobId));
    } catch (error) {
      console.error(`❌ Error updating database config for job ${jobId}:`, error);
    }
  }

  private async logToDatabase(jobId: string, action: string, status: string, details?: any) {
    try {
      await db.insert(schedulerLogs).values({
        jobId,
        action,
        status,
        details
      });
    } catch (error) {
      console.error('❌ Error logging to database:', error);
    }
  }

  private defineJobs() {
    // Current prices update - every 15 minutes during market hours (9:30 AM - 4:00 PM ET, weekdays)
    this.jobs.set('current-prices', {
      name: 'Current Prices Update',
      schedule: '*/15 9-16 * * 1-5', // Every 15 minutes, 9 AM to 4 PM, Monday to Friday
      task: async () => {
        try {
          console.log('🔄 Auto-scheduler: Starting current prices update...');
          await dataUpdateLogger.log('scheduler', 'In Progress', {
            message: 'Auto-scheduler starting current prices update for all regions',
            region: 'ALL'
          });

          // Update all regions
          await currentPriceService.updateAllCurrentPrices();

          await dataUpdateLogger.log('scheduler', 'Success', {
            message: 'Auto-scheduler completed current prices update for all regions',
            region: 'ALL'
          });
          console.log('✅ Auto-scheduler: Current prices update completed');
        } catch (error) {
          console.error('❌ Auto-scheduler: Error updating current prices:', error);
          await dataUpdateLogger.log('scheduler', 'Error', {
            message: 'Auto-scheduler failed to update current prices',
            error: error instanceof Error ? error.message : String(error),
            region: 'ALL'
          });
        }
      },
      enabled: false, // Disabled by default, enable via API
      running: false
    });

    // Historical prices update - daily at 5:00 PM ET (after market close)
    this.jobs.set('historical-prices', {
      name: 'Historical Prices Update',
      schedule: '0 17 * * 1-5', // 5:00 PM, Monday to Friday
      task: async () => {
        try {
          console.log('🔄 Auto-scheduler: Starting historical prices update...');
          await dataUpdateLogger.log('scheduler', 'In Progress', {
            message: 'Auto-scheduler starting historical prices update for all regions',
            region: 'ALL'
          });

          // Update historical prices for all portfolios
          await historicalPriceService.updateAllHistoricalPrices();

          await dataUpdateLogger.log('scheduler', 'Success', {
            message: 'Auto-scheduler completed historical prices update for all regions',
            region: 'ALL'
          });
          console.log('✅ Auto-scheduler: Historical prices update completed');
        } catch (error) {
          console.error('❌ Auto-scheduler: Error updating historical prices:', error);
          await dataUpdateLogger.log('scheduler', 'Error', {
            message: 'Auto-scheduler failed to update historical prices',
            error: error instanceof Error ? error.message : String(error),
            region: 'ALL'
          });
        }
      },
      enabled: false,
      running: false
    });

    // Performance history update - weekly on Sundays at 6:00 PM ET
    this.jobs.set('performance-history', {
      name: 'Performance History Update',
      schedule: '0 18 * * 0', // 6:00 PM on Sundays
      task: async () => {
        try {
          console.log('🔄 Auto-scheduler: Starting performance history update...');
          await dataUpdateLogger.log('scheduler', 'In Progress', {
            message: 'Auto-scheduler starting performance history update for all regions',
            region: 'ALL'
          });

          // Update performance history
          await portfolioPerformanceService.updateAllPerformanceHistory();

          await dataUpdateLogger.log('scheduler', 'Success', {
            message: 'Auto-scheduler completed performance history update for all regions',
            region: 'ALL'
          });
          console.log('✅ Auto-scheduler: Performance history update completed');
        } catch (error) {
          console.error('❌ Auto-scheduler: Error updating performance history:', error);
          await dataUpdateLogger.log('scheduler', 'Error', {
            message: 'Auto-scheduler failed to update performance history',
            error: error instanceof Error ? error.message : String(error),
            region: 'ALL'
          });
        }
      },
      enabled: false,
      running: false
    });

    // Quick morning update - current prices at market open
    this.jobs.set('market-open', {
      name: 'Market Open Quick Update',
      schedule: '30 9 * * 1-5', // 9:30 AM ET, Monday to Friday
      task: async () => {
        try {
          console.log('🔄 Auto-scheduler: Starting market open update...');
          await dataUpdateLogger.log('scheduler', 'In Progress', {
            message: 'Auto-scheduler starting market open quick update',
            region: 'ALL'
          });

          // Quick current price update at market open
          await currentPriceService.updateAllCurrentPrices();

          await dataUpdateLogger.log('scheduler', 'Success', {
            message: 'Auto-scheduler completed market open quick update',
            region: 'ALL'
          });
          console.log('✅ Auto-scheduler: Market open update completed');
        } catch (error) {
          console.error('❌ Auto-scheduler: Error in market open update:', error);
          await dataUpdateLogger.log('scheduler', 'Error', {
            message: 'Auto-scheduler failed market open update',
            error: error instanceof Error ? error.message : String(error),
            region: 'ALL'
          });
        }
      },
      enabled: false,
      running: false
    });
  }

  /**
   * Initialize the scheduler and start enabled jobs
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Auto-scheduler already initialized');
      return;
    }

    console.log('🚀 Initializing auto-scheduler service...');
    
    // Start each enabled job
    for (const [jobId, job] of Array.from(this.jobs)) {
      if (job.enabled) {
        this.startJob(jobId);
      }
    }

    this.isInitialized = true;
    console.log('✅ Auto-scheduler service initialized');
  }

  /**
   * Start a specific job
   */
  startJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    if (job.cronJob) {
      console.log(`Job ${jobId} is already running`);
      return;
    }

    console.log(`Starting job: ${job.name}`);
    job.cronJob = cron.schedule(job.schedule, async () => {
      if (job.running) {
        console.log(`Job ${job.name} is already running, skipping...`);
        return;
      }

      job.running = true;
      job.lastRun = new Date();
      
      try {
        await job.task();
      } finally {
        job.running = false;
      }
    }, {
      scheduled: true,
      timezone: "America/New_York"
    });

    job.enabled = true;
    console.log(`✅ Job ${job.name} started with schedule: ${job.schedule}`);
  }

  /**
   * Stop a specific job
   */
  stopJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    if (job.cronJob) {
      job.cronJob.stop();
      job.cronJob = undefined;
      job.enabled = false;
      console.log(`✅ Job ${job.name} stopped`);
    }
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus() {
    const status: any[] = [];
    
    for (const [jobId, job] of Array.from(this.jobs)) {
      status.push({
        id: jobId,
        name: job.name,
        schedule: job.schedule,
        enabled: job.enabled,
        running: job.running,
        lastRun: job.lastRun,
        nextRun: job.cronJob ? this.getNextRunTime(job.schedule) : null
      });
    }

    return status;
  }

  /**
   * Update schedule for a specific job
   */
  async updateSchedule(jobId: string, newSchedule: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Validate cron expression
    const isValid = cron.validate(newSchedule);
    if (!isValid) {
      throw new Error(`Invalid cron expression: ${newSchedule}`);
    }

    try {
      // Log the schedule change
      await this.logToDatabase(jobId, 'schedule_change', 'info', {
        oldSchedule: job.schedule,
        newSchedule
      });

      // Stop existing cron job if running
      if (job.cronJob) {
        job.cronJob.stop();
      }

      // Update schedule
      job.schedule = newSchedule;

      // If job is enabled, restart with new schedule
      if (job.enabled) {
        const cronJob = cron.schedule(newSchedule, async () => {
          job.running = true;
          job.lastRun = new Date();
          try {
            await job.task();
            await this.updateDatabaseConfig(jobId, { 
              lastRun: job.lastRun, 
              lastStatus: 'success' 
            });
          } catch (error) {
            await this.updateDatabaseConfig(jobId, { 
              lastRun: job.lastRun, 
              lastStatus: 'error' 
            });
            throw error;
          } finally {
            job.running = false;
          }
        }, {
          scheduled: true,
          timezone: 'America/New_York'
        });

        job.cronJob = cronJob;
      }

      // Update database with new schedule
      await this.updateDatabaseConfig(jobId, { schedule: newSchedule });
      await this.logToDatabase(jobId, 'schedule_change', 'success', { newSchedule });

      return true;
    } catch (error) {
      await dataUpdateLogger.log('scheduler', 'Error', {
        message: `Failed to update schedule for ${job.name}`,
        jobId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Calculate next run time for a cron schedule
   * Simple implementation for our common cron patterns
   */
  private getNextRunTime(schedule: string): Date | null {
    try {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const currentHour = nyTime.getHours();
      const currentMinute = nyTime.getMinutes();
      const currentDay = nyTime.getDay(); // 0 = Sunday
      
      // Parse the schedule pattern
      if (schedule === '*/15 9-16 * * 1-5') {
        // Every 15 minutes during market hours (9-4pm) on weekdays
        const nextRun = new Date(nyTime);
        
        // If weekend, jump to Monday 9:00
        if (currentDay === 0 || currentDay === 6) {
          const daysUntilMonday = currentDay === 0 ? 1 : 2;
          nextRun.setDate(nextRun.getDate() + daysUntilMonday);
          nextRun.setHours(9, 0, 0, 0);
        } else if (currentHour < 9) {
          // Before market open
          nextRun.setHours(9, 0, 0, 0);
        } else if (currentHour >= 16) {
          // After market close, next day 9:00
          nextRun.setDate(nextRun.getDate() + (currentDay === 5 ? 3 : 1));
          nextRun.setHours(9, 0, 0, 0);
        } else {
          // During market hours, calculate next 15-minute interval
          const minutesUntilNext = 15 - (currentMinute % 15);
          nextRun.setMinutes(currentMinute + minutesUntilNext, 0, 0);
          
          // Check if we've gone past market hours
          if (nextRun.getHours() >= 16) {
            nextRun.setDate(nextRun.getDate() + (currentDay === 5 ? 3 : 1));
            nextRun.setHours(9, 0, 0, 0);
          }
        }
        return nextRun;
      } else if (schedule === '0 17 * * 1-5') {
        // Daily at 5 PM on weekdays
        const nextRun = new Date(nyTime);
        
        if (currentDay === 0 || currentDay === 6) {
          // Weekend - next Monday 5pm
          const daysUntilMonday = currentDay === 0 ? 1 : 2;
          nextRun.setDate(nextRun.getDate() + daysUntilMonday);
          nextRun.setHours(17, 0, 0, 0);
        } else if (currentHour < 17) {
          // Today at 5pm
          nextRun.setHours(17, 0, 0, 0);
        } else {
          // Tomorrow (or Monday if Friday)
          nextRun.setDate(nextRun.getDate() + (currentDay === 5 ? 3 : 1));
          nextRun.setHours(17, 0, 0, 0);
        }
        return nextRun;
      } else if (schedule === '0 18 * * 0') {
        // Weekly on Sunday at 6 PM
        const nextRun = new Date(nyTime);
        const daysUntilSunday = (7 - currentDay) % 7;
        
        if (daysUntilSunday === 0 && currentHour < 18) {
          // Today at 6pm
          nextRun.setHours(18, 0, 0, 0);
        } else {
          // Next Sunday
          nextRun.setDate(nextRun.getDate() + (daysUntilSunday || 7));
          nextRun.setHours(18, 0, 0, 0);
        }
        return nextRun;
      } else if (schedule === '30 9 * * 1-5') {
        // Daily at 9:30 AM on weekdays
        const nextRun = new Date(nyTime);
        
        if (currentDay === 0 || currentDay === 6) {
          // Weekend - next Monday 9:30am
          const daysUntilMonday = currentDay === 0 ? 1 : 2;
          nextRun.setDate(nextRun.getDate() + daysUntilMonday);
          nextRun.setHours(9, 30, 0, 0);
        } else if (currentHour < 9 || (currentHour === 9 && currentMinute < 30)) {
          // Today at 9:30am
          nextRun.setHours(9, 30, 0, 0);
        } else {
          // Tomorrow (or Monday if Friday)
          nextRun.setDate(nextRun.getDate() + (currentDay === 5 ? 3 : 1));
          nextRun.setHours(9, 30, 0, 0);
        }
        return nextRun;
      }
      
      // For unknown patterns, return null
      return null;
    } catch (error) {
      console.error('Error calculating next run time:', error);
      return null;
    }
  }

  /**
   * Enable/disable a job
   */
  async setJobEnabled(jobId: string, enabled: boolean) {
    if (enabled) {
      this.startJob(jobId);
      await this.updateDatabaseConfig(jobId, { enabled: true });
      await this.logToDatabase(jobId, 'toggle', 'success', { enabled: true });
    } else {
      this.stopJob(jobId);
      await this.updateDatabaseConfig(jobId, { enabled: false });
      await this.logToDatabase(jobId, 'toggle', 'success', { enabled: false });
    }
  }

  /**
   * Enable a specific job (with database persistence control)
   */
  async enableJob(jobId: string, updateDb: boolean = true) {
    this.startJob(jobId);
    if (updateDb) {
      await this.updateDatabaseConfig(jobId, { enabled: true });
      await this.logToDatabase(jobId, 'toggle', 'success', { enabled: true });
    }
  }

  /**
   * Disable a specific job (with database persistence control)
   */
  async disableJob(jobId: string, updateDb: boolean = true) {
    this.stopJob(jobId);
    if (updateDb) {
      await this.updateDatabaseConfig(jobId, { enabled: false });
      await this.logToDatabase(jobId, 'toggle', 'success', { enabled: false });
    }
  }

  /**
   * Run a job immediately (manual trigger)
   */
  async runJobNow(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.running) {
      throw new Error(`Job ${job.name} is already running`);
    }

    console.log(`Manually triggering job: ${job.name}`);
    
    // Log manual run to database
    await this.logToDatabase(jobId, 'manual_trigger', 'info', {
      schedule: job.schedule
    });
    
    job.running = true;
    
    try {
      await job.task();
      job.lastRun = new Date();
      
      // Update database with successful run
      await this.updateDatabaseConfig(jobId, { 
        lastRun: job.lastRun, 
        lastStatus: 'success' 
      });
      await this.logToDatabase(jobId, 'manual_trigger', 'success', {
        completedAt: job.lastRun
      });
      
      console.log(`✅ Manual run completed for ${job.name}`);
    } catch (error) {
      await this.updateDatabaseConfig(jobId, { 
        lastRun: new Date(), 
        lastStatus: 'error' 
      });
      await this.logToDatabase(jobId, 'manual_trigger', 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      job.running = false;
    }
  }

  /**
   * Cleanup and stop all jobs
   */
  shutdown() {
    console.log('Shutting down auto-scheduler...');
    
    for (const [jobId, job] of Array.from(this.jobs)) {
      if (job.cronJob) {
        job.cronJob.stop();
      }
    }

    this.isInitialized = false;
    console.log('Auto-scheduler shut down');
  }
}

// Export singleton instance
export const autoSchedulerService = new AutoSchedulerService();
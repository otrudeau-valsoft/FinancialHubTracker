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
      await dataUpdateLogger.log('scheduler', 'Info', {
        message: `Updating schedule for ${job.name}`,
        jobId,
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
          } finally {
            job.running = false;
          }
        }, {
          scheduled: true,
          timezone: 'America/New_York'
        });

        job.cronJob = cronJob;
      }

      await dataUpdateLogger.log('scheduler', 'Success', {
        message: `Schedule updated for ${job.name}`,
        jobId,
        newSchedule
      });

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
   */
  private getNextRunTime(schedule: string): Date | null {
    try {
      const interval = cron.parseExpression(schedule, {
        tz: 'America/New_York'
      });
      return interval.next().toDate();
    } catch (error) {
      console.error('Error parsing cron expression:', error);
      return null;
    }
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean) {
    if (enabled) {
      this.startJob(jobId);
    } else {
      this.stopJob(jobId);
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
    
    // Log manual run
    await dataUpdateLogger.log('scheduler', 'Info', {
      message: `Manually triggering ${job.name}`,
      jobId,
      schedule: job.schedule
    });
    
    job.running = true;
    
    try {
      await job.task();
      job.lastRun = new Date();
      
      await dataUpdateLogger.log('scheduler', 'Success', {
        message: `Manual run completed for ${job.name}`,
        jobId
      });
    } catch (error) {
      await dataUpdateLogger.log('scheduler', 'Error', {
        message: `Manual run failed for ${job.name}`,
        jobId,
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
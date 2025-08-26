/**
 * Auto-Scheduler API Routes
 * 
 * Endpoints for controlling the automatic data update scheduler
 */

import { Router } from 'express';
import { autoSchedulerService } from '../services/auto-scheduler-service';
import { dataUpdateLogger } from '../services/data-update-logger';

const router = Router();

/**
 * Get the status of all scheduled jobs
 */
router.get('/status', async (req, res) => {
  try {
    const status = autoSchedulerService.getJobsStatus();
    res.json({
      status: 'success',
      jobs: status,
      message: 'Scheduler status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get scheduler status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Enable or disable a specific job
 */
router.post('/jobs/:jobId/toggle', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide "enabled" as a boolean value'
      });
    }

    await autoSchedulerService.setJobEnabled(jobId, enabled);
    
    await dataUpdateLogger.log('scheduler', 'Success', {
      message: `Job ${jobId} ${enabled ? 'enabled' : 'disabled'} | Job: ${jobId} | Enabled: ${enabled}`
    });

    res.json({
      status: 'success',
      message: `Job ${jobId} has been ${enabled ? 'enabled' : 'disabled'}`,
      jobId,
      enabled
    });
  } catch (error) {
    console.error('Error toggling job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle job',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Manually trigger a job to run immediately
 */
router.post('/jobs/:jobId/run', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Start the job execution asynchronously
    autoSchedulerService.runJobNow(jobId)
      .then(() => {
        console.log(`Job ${jobId} completed successfully`);
      })
      .catch((error) => {
        console.error(`Job ${jobId} failed:`, error);
      });

    await dataUpdateLogger.log('scheduler', 'In Progress', {
      message: `Manually triggered job ${jobId} | Triggered by: manual`
    });

    res.json({
      status: 'success',
      message: `Job ${jobId} has been triggered and is running in the background`,
      jobId
    });
  } catch (error) {
    console.error('Error running job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to run job',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Initialize the scheduler (usually called on server startup)
 */
router.post('/initialize', async (req, res) => {
  try {
    await autoSchedulerService.initialize();
    
    await dataUpdateLogger.log('scheduler', 'Success', {
      message: 'Auto-scheduler initialized | Action: initialize'
    });

    res.json({
      status: 'success',
      message: 'Auto-scheduler has been initialized'
    });
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize scheduler',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Update schedule for a specific job
 */
router.put('/jobs/:jobId/schedule', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { schedule } = req.body;
    
    if (!schedule) {
      return res.status(400).json({
        status: 'error',
        message: 'Schedule is required'
      });
    }
    
    await autoSchedulerService.updateSchedule(jobId, schedule);
    
    return res.json({
      status: 'success',
      message: `Schedule updated for job ${jobId}`
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update schedule'
    });
  }
});

/**
 * Get scheduler audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // Import necessary database modules
    const { db } = await import('../db');
    const { schedulerLogs } = await import('@shared/schema');
    const { desc } = await import('drizzle-orm');
    
    // Fetch logs from scheduler_logs table
    const logs = await db
      .select()
      .from(schedulerLogs)
      .orderBy(desc(schedulerLogs.timestamp))
      .limit(Number(limit));
    
    return res.json({
      status: 'success',
      logs,
      message: 'Scheduler audit logs retrieved'
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch audit logs'
    });
  }
});

/**
 * Shutdown the scheduler (stop all jobs)
 */
router.post('/shutdown', async (req, res) => {
  try {
    autoSchedulerService.shutdown();
    
    await dataUpdateLogger.log('scheduler', 'Success', {
      message: 'Auto-scheduler shut down | Action: shutdown'
    });

    res.json({
      status: 'success',
      message: 'Auto-scheduler has been shut down'
    });
  } catch (error) {
    console.error('Error shutting down scheduler:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to shutdown scheduler',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
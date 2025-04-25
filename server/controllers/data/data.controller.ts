import { Request, Response } from 'express';
import { schedulerService } from '../../services/scheduler.service';
import { AppError } from '../../middleware/error-handler';

/**
 * Get all data update logs
 */
export async function getLogs(req: Request, res: Response) {
  try {
    const logs = schedulerService.getLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    throw new AppError('Failed to get logs', 500);
  }
}

/**
 * Clear all data update logs
 */
export async function clearLogs(req: Request, res: Response) {
  try {
    schedulerService.clearLogs();
    res.json({ message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    throw new AppError('Failed to clear logs', 500);
  }
}

/**
 * Get scheduler configuration
 */
export async function getSchedulerConfig(req: Request, res: Response) {
  try {
    const config = schedulerService.getSchedulerConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting scheduler config:', error);
    throw new AppError('Failed to get scheduler configuration', 500);
  }
}

/**
 * Update scheduler configuration
 */
export async function updateSchedulerConfig(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const config = req.body;
    
    if (type !== 'current_prices' && type !== 'historical_prices') {
      throw new AppError(`Invalid scheduler type: ${type}`, 400);
    }
    
    const updatedConfig = schedulerService.updateSchedulerConfig(type, config);
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating scheduler config:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update scheduler configuration', 500);
  }
}
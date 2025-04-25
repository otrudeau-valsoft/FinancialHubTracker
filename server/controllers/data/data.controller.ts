import { Request, Response } from 'express';
import { schedulerService } from '../../services/scheduler-service';

/**
 * Get data update logs
 */
export const getDataUpdateLogs = async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const logs = await schedulerService.getLogs(limit);
  return res.json(logs);
};

/**
 * Clear all data update logs
 */
export const clearDataUpdateLogs = async (req: Request, res: Response) => {
  await schedulerService.clearLogs();
  return res.json({ message: "Data update logs cleared successfully" });
};

/**
 * Get scheduler configuration
 */
export const getSchedulerConfig = async (req: Request, res: Response) => {
  return res.json(schedulerService.getConfig());
};

/**
 * Update scheduler configuration
 */
export const updateSchedulerConfig = async (req: Request, res: Response) => {
  const { type } = req.params;
  
  if (type !== 'current_prices' && type !== 'historical_prices') {
    return res.status(400).json({ message: "Invalid scheduler type" });
  }
  
  const config = schedulerService.updateConfig(type, req.body);
  return res.json(config);
};
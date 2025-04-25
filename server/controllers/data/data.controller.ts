import { Request, Response } from 'express';
import { AppError } from '../../middleware/error-handler';

// Mock logs array for development
const logs: Array<{
  id: number;
  type: string;
  status: 'Success' | 'Error' | 'In Progress';
  details: string;
  timestamp: string;
}> = [];

/**
 * Get all data update logs
 */
export async function getLogs(req: Request, res: Response) {
  try {
    // For now, just return the mock logs array
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
    // Clear the mock logs array
    logs.length = 0;
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
    // Return mock scheduler configuration for now
    const config = {
      current_prices: {
        enabled: true,
        interval: 300, // 5 minutes in seconds
        lastRun: new Date().toISOString()
      },
      historical_prices: {
        enabled: false,
        interval: 86400, // 24 hours in seconds
        lastRun: null
      }
    };
    
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
    
    // For now, just echo back the received configuration
    const mockResponse = {
      type,
      ...config,
      updated: true,
      timestamp: new Date().toISOString()
    };
    
    // Add a mock log for this configuration update
    logs.push({
      id: logs.length + 1,
      type: `Scheduler Configuration: ${type}`,
      status: 'Success',
      details: JSON.stringify(config),
      timestamp: new Date().toISOString()
    });
    
    res.json(mockResponse);
  } catch (error) {
    console.error('Error updating scheduler config:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update scheduler configuration', 500);
  }
}
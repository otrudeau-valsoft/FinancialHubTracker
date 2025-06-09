import { Request, Response } from 'express';
import { db } from '../../db';
import { dataUpdateLogs } from '@shared/schema';
import { desc } from 'drizzle-orm';

/**
 * Get all data update logs
 */
export async function getLogs(req: Request, res: Response) {
  try {
    // Retrieve logs from the database instead of using a mock array
    const logs = await db.select()
      .from(dataUpdateLogs)
      .orderBy(desc(dataUpdateLogs.timestamp));
    
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
    // Delete all logs from the database
    await db.delete(dataUpdateLogs);
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
    
    // Add a log entry for this configuration update
    await db.insert(dataUpdateLogs).values({
      type: `Scheduler Configuration: ${type}`,
      status: 'Success',
      details: JSON.stringify(config),
      timestamp: new Date()
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
import { db } from '../db';
import { storage } from '../db-storage';
import { Express } from 'express';

// Task interface for all scheduled tasks
interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression?: string;
  intervalMs?: number;
  lastRun?: Date;
  isRunning: boolean;
  enabled: boolean;
  execute: () => Promise<any>;
}

// List of available scheduled tasks
const scheduledTasks: ScheduledTask[] = [
  {
    id: 'current-prices-update',
    name: 'Update Current Prices',
    description: 'Fetch and update current prices for all portfolio stocks',
    intervalMs: 5 * 60 * 1000, // 5 minutes
    isRunning: false,
    enabled: true,
    execute: async () => {
      console.log('[Scheduler] Executing current prices update task');
      
      // This is just a stub - implementation will be added later
      const regions = ['USD', 'CAD', 'INTL'];
      let updatedCount = 0;
      
      for (const region of regions) {
        try {
          // In real implementation, we would fetch current prices from Yahoo Finance
          console.log(`[Scheduler] Updating current prices for ${region} portfolio`);
          // await updateCurrentPricesForRegion(region);
          updatedCount++;
        } catch (error) {
          console.error(`[Scheduler] Error updating prices for ${region}:`, error);
        }
      }
      
      return { updatedRegions: updatedCount };
    }
  },
  {
    id: 'historical-prices-update',
    name: 'Update Historical Prices',
    description: 'Fetch and update historical prices for all portfolio stocks',
    intervalMs: 24 * 60 * 60 * 1000, // Once a day
    isRunning: false,
    enabled: false, // Disabled by default
    execute: async () => {
      console.log('[Scheduler] Executing historical prices update task');
      
      // This is just a stub - implementation will be added later
      return { updated: false, message: 'Not implemented yet' };
    }
  }
];

// Dictionary to store interval handles
const taskIntervals: Record<string, NodeJS.Timeout> = {};

// Task history for logging purposes
const taskHistory: Array<{
  taskId: string;
  timestamp: Date;
  success: boolean;
  result: any;
}> = [];

// Get task by ID
export const getTaskById = (taskId: string): ScheduledTask | undefined => {
  return scheduledTasks.find(task => task.id === taskId);
};

// Get all tasks
export const getAllTasks = (): ScheduledTask[] => {
  return scheduledTasks.map(task => ({
    ...task,
    execute: undefined // Remove the function reference for serialization
  })) as any;
};

// Get task history
export const getTaskHistory = (): typeof taskHistory => {
  return taskHistory;
};

// Start a specific task by ID
export const startTask = async (taskId: string): Promise<any> => {
  const task = getTaskById(taskId);
  
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`, 404);
  }
  
  if (task.isRunning) {
    throw new Error(`Task ${task.name} is already running`, 400);
  }
  
  try {
    task.isRunning = true;
    task.lastRun = new Date();
    
    const result = await task.execute();
    
    // Log successful execution
    taskHistory.unshift({
      taskId: task.id,
      timestamp: new Date(),
      success: true,
      result
    });
    
    // Limit history size
    if (taskHistory.length > 100) {
      taskHistory.pop();
    }
    
    return { 
      status: 'success', 
      taskId: task.id, 
      result 
    };
  } catch (error) {
    // Log failed execution
    taskHistory.unshift({
      taskId: task.id,
      timestamp: new Date(),
      success: false,
      result: error
    });
    
    throw new Error(`Task execution failed: ${error instanceof Error ? error.message : String(error)}`, 500);
  } finally {
    task.isRunning = false;
  }
};

// Enable or disable a task
export const setTaskEnabled = (taskId: string, enabled: boolean): void => {
  const task = getTaskById(taskId);
  
  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`, 404);
  }
  
  task.enabled = enabled;
  
  if (!enabled && taskIntervals[taskId]) {
    clearInterval(taskIntervals[taskId]);
    delete taskIntervals[taskId];
  } else if (enabled && task.intervalMs && !taskIntervals[taskId]) {
    scheduleTask(task);
  }
};

// Schedule a task to run at its defined interval
const scheduleTask = (task: ScheduledTask): void => {
  if (!task.intervalMs) {
    console.warn(`[Scheduler] Task ${task.id} has no interval defined`);
    return;
  }
  
  console.log(`[Scheduler] Scheduling task ${task.name} to run every ${task.intervalMs / 1000} seconds`);
  
  // Clear any existing interval
  if (taskIntervals[task.id]) {
    clearInterval(taskIntervals[task.id]);
  }
  
  // Create new interval
  taskIntervals[task.id] = setInterval(async () => {
    if (task.isRunning) {
      console.log(`[Scheduler] Task ${task.name} is already running, skipping this run`);
      return;
    }
    
    try {
      await startTask(task.id);
    } catch (error) {
      console.error(`[Scheduler] Error running scheduled task ${task.name}:`, error);
    }
  }, task.intervalMs);
};

// Initialize the scheduler service
export const initSchedulerService = (app: Express): void => {
  console.log('Initializing scheduler service...');
  
  // Schedule all enabled tasks
  scheduledTasks.forEach(task => {
    if (task.enabled && task.intervalMs) {
      scheduleTask(task);
    }
  });
  
  // Make scheduler methods available to the routes
  app.locals.scheduler = {
    getTaskById,
    getAllTasks,
    getTaskHistory,
    startTask,
    setTaskEnabled
  };
  
  console.log(`Scheduler service initialized with ${scheduledTasks.length} tasks`);
};
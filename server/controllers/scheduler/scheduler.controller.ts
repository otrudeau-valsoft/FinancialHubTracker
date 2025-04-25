import { Request, Response } from 'express';
import { 
  getAllTasks, 
  getTaskById, 
  getTaskHistory, 
  startTask,
  setTaskEnabled
} from '../../services/scheduler.service';
import { AppError } from '../../middleware/error-handler';

/**
 * Get all scheduled tasks
 */
export const getTasks = async (req: Request, res: Response) => {
  try {
    const tasks = getAllTasks();
    
    return res.json({
      status: 'success',
      count: tasks.length,
      tasks
    });
  } catch (error) {
    throw new AppError(
      `Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
};

/**
 * Get a specific task by ID
 */
export const getTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = getTaskById(id);
    
    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: `Task with ID ${id} not found`
      });
    }
    
    return res.json({
      status: 'success',
      task: {
        ...task,
        execute: undefined // Remove function reference
      }
    });
  } catch (error) {
    throw new AppError(
      `Error fetching task: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
};

/**
 * Execute a specific task
 */
export const executeTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await startTask(id);
    
    return res.json({
      status: 'success',
      message: `Task ${id} executed successfully`,
      result
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message
      });
    }
    
    throw new AppError(
      `Error executing task: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
};

/**
 * Get task execution history
 */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const history = getTaskHistory();
    const { limit = '10', taskId } = req.query;
    
    let filteredHistory = [...history];
    
    // Filter by task ID if provided
    if (taskId) {
      filteredHistory = filteredHistory.filter(entry => entry.taskId === taskId);
    }
    
    // Apply limit
    const parsedLimit = parseInt(limit as string, 10) || 10;
    filteredHistory = filteredHistory.slice(0, parsedLimit);
    
    return res.json({
      status: 'success',
      count: filteredHistory.length,
      history: filteredHistory
    });
  } catch (error) {
    throw new AppError(
      `Error fetching task history: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
};

/**
 * Enable or disable a task
 */
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'The "enabled" property must be a boolean'
      });
    }
    
    setTaskEnabled(id, enabled);
    
    return res.json({
      status: 'success',
      message: `Task ${id} ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message
      });
    }
    
    throw new AppError(
      `Error updating task status: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
};
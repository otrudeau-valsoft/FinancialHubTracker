import { Router } from 'express';
import * as schedulerController from '../../controllers/scheduler/scheduler.controller';

const router = Router();

// Get all tasks
router.get('/', schedulerController.getTasks);

// Get task execution history
router.get('/history', schedulerController.getHistory);

// Get a specific task
router.get('/:id', schedulerController.getTask);

// Execute a specific task
router.post('/:id/execute', schedulerController.executeTask);

// Update task status (enable/disable)
router.patch('/:id/status', schedulerController.updateTaskStatus);

export default router;
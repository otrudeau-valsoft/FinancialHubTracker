import { Router } from 'express';
import { 
  getLogs,
  clearLogs,
  getSchedulerConfig,
  updateSchedulerConfig
} from '../../controllers/data/data.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// Data update logs routes
router.get('/logs', asyncHandler(getLogs));
router.delete('/logs', asyncHandler(clearLogs));

// Scheduler routes
router.get('/scheduler/config', asyncHandler(getSchedulerConfig));
router.post('/scheduler/config/:type', asyncHandler(updateSchedulerConfig));

export default router;
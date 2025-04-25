import { Router } from 'express';
import { 
  getDataUpdateLogs,
  clearDataUpdateLogs,
  getSchedulerConfig,
  updateSchedulerConfig
} from '../../controllers/data/data.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// GET /api/data-updates/logs - Get data update logs
router.get('/logs', asyncHandler(getDataUpdateLogs));

// DELETE /api/data-updates/logs - Clear all data update logs
router.delete('/logs', asyncHandler(clearDataUpdateLogs));

// GET /api/scheduler/config - Get scheduler configuration
router.get('/scheduler/config', asyncHandler(getSchedulerConfig));

// POST /api/scheduler/config/:type - Update scheduler configuration
router.post('/scheduler/config/:type', asyncHandler(updateSchedulerConfig));

export default router;
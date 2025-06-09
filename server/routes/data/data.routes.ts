import { Router } from 'express';
import { 
  getLogs,
  clearLogs,
  getSchedulerConfig,
  updateSchedulerConfig
} from '../../controllers/data/data.controller';

const router = Router();

// Data update logs routes
router.get('/logs', getLogs);
router.delete('/logs', clearLogs);

// Scheduler routes
router.get('/scheduler/:type', getSchedulerConfig);
router.put('/scheduler/:type', updateSchedulerConfig);

export default router;
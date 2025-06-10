import { Router } from 'express';
import { 
  getAlerts,
  createAlert,
  updateAlert
} from '../../controllers/alerts/alerts.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// GET /api/alerts - Get all alerts
router.get('/', asyncHandler(getAlerts));

// POST /api/alerts - Create a new alert
router.post('/', asyncHandler(createAlert));

// PUT /api/alerts/:id - Update an alert
router.put('/:id', asyncHandler(updateAlert));

export default router;
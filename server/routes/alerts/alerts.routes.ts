import { Router } from 'express';
import { 
  getAlerts,
  createAlert,
  updateAlert
} from '../../controllers/alerts/alerts.controller';

const router = Router();

// GET /api/alerts - Get all alerts

// POST /api/alerts - Create a new alert

// PUT /api/alerts/:id - Update an alert

export default router;
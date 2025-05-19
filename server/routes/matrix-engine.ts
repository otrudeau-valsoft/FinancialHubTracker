import { Router } from 'express';
import { runMatrixEngineForRegion, runMatrixEngineForAll, getAlerts } from '../controllers/matrix-engine-controller';

const router = Router();

// Run matrix engine for a specific region
router.get('/run/:region', runMatrixEngineForRegion);

// Run matrix engine for all regions
router.get('/run-all', runMatrixEngineForAll);

// Get active alerts (redirects to our mock implementation for now)
router.get('/alerts', getAlerts);

export default router;
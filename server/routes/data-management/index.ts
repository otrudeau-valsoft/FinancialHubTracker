import { Router } from 'express';
import populateDataRoutes from './populate-data.routes';

const router = Router();

// Register data management sub-routes
router.use('/populate-data', populateDataRoutes);

export default router;
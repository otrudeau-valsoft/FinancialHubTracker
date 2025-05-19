import { Router } from 'express';
import matrixRulesRoutes from '../matrix-rules';

const router = Router();

// Use the matrix rules routes
router.use('/', matrixRulesRoutes);

export default router;
import { Router } from 'express';
import { 
  getMatrixRules,
  createMatrixRule,
  bulkImportMatrixRules
} from '../../controllers/matrix/matrix.controller';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

// GET /api/matrix-rules/:actionType - Get rules by action type
router.get('/:actionType', asyncHandler(getMatrixRules));

// POST /api/matrix-rules - Create a matrix rule
router.post('/', asyncHandler(createMatrixRule));

// POST /api/matrix-rules/bulk - Bulk import matrix rules
router.post('/bulk', asyncHandler(bulkImportMatrixRules));

export default router;
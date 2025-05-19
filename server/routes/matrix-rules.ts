import { Router } from "express";
import { getMatrixRulesByActionType, getAllMatrixRules, getMatrixRuleById } from "../controllers/matrix-rules-controller";

const router = Router();

// GET /api/matrix-rules - Get all matrix rules
router.get("/", getAllMatrixRules);

// GET /api/matrix-rules/:id - Get matrix rule by ID
router.get("/:id", getMatrixRuleById);

// GET /api/matrix-rules/action/:actionType - Get matrix rules by action type
router.get("/action/:actionType", getMatrixRulesByActionType);

export default router;
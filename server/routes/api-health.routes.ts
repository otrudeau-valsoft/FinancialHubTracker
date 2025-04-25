import { Router } from 'express';

const router = Router();

// Simple health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API is running with new modular architecture'
  });
});

export default router;
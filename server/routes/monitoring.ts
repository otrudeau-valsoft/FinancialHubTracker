import { Router } from 'express';
import { monitoringService } from '../services/monitoring-service';

const router = Router();

// Get data quality checks
router.get('/data-quality', async (req, res) => {
  try {
    const checks = await monitoringService.runDataQualityChecks();
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warning');
    
    res.json({
      status: 'success',
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: warningChecks.length,
        failures: failedChecks.length
      },
      checks,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get system metrics
router.get('/system-metrics', async (req, res) => {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    res.json({
      status: 'success',
      metrics
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get alerts
router.get('/alerts', (req, res) => {
  try {
    const { category, since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;
    const alerts = monitoringService.getAlerts(category as string, sinceDate);
    
    res.json({
      status: 'success',
      alerts,
      count: alerts.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Clear alerts
router.delete('/alerts', (req, res) => {
  try {
    monitoringService.clearAlerts();
    res.json({
      status: 'success',
      message: 'Alerts cleared'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Run quick checks
    const checks = await monitoringService.runDataQualityChecks();
    const hasFailures = checks.some(c => c.status === 'fail');
    const hasWarnings = checks.some(c => c.status === 'warning');
    
    const health = {
      status: hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      checks: {
        database: 'connected',
        dataQuality: hasFailures ? 'issues' : 'ok'
      }
    };
    
    res.status(hasFailures ? 503 : 200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

export default router;
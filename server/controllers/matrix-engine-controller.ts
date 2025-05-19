import { Request, Response } from 'express';
import { runMatrixEngine, runMatrixEngineForAllRegions, getActiveAlerts } from '../services/matrix-engine-service';

/**
 * Run matrix engine for a specific region
 */
export const runMatrixEngineForRegion = async (req: Request, res: Response) => {
  try {
    const { region } = req.params;
    
    if (!region || !['USD', 'CAD', 'INTL'].includes(region)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid region specified'
      });
    }
    
    const alerts = await runMatrixEngine(region as any);
    
    return res.status(200).json({
      status: 'success',
      data: alerts,
      count: alerts.length,
      message: `Matrix engine completed for ${region} region with ${alerts.length} alerts`
    });
  } catch (error) {
    console.error('Error running matrix engine:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to run matrix engine'
    });
  }
};

/**
 * Run matrix engine for all regions
 */
export const runMatrixEngineForAll = async (req: Request, res: Response) => {
  try {
    const alerts = await runMatrixEngineForAllRegions();
    
    return res.status(200).json({
      status: 'success',
      data: alerts,
      count: alerts.length,
      message: `Matrix engine completed for all regions with ${alerts.length} alerts`
    });
  } catch (error) {
    console.error('Error running matrix engine for all regions:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to run matrix engine for all regions'
    });
  }
};

/**
 * Get active alerts
 */
export const getAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await getActiveAlerts();
    
    return res.status(200).json(alerts);
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get active alerts'
    });
  }
};
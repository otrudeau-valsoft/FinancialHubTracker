import express from 'express';
import { db } from '../db';
import { holdingsUSD, holdingsCAD, holdingsINTL } from '@shared/schema';
import { holdingsService } from '../services/holdings-service';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Get holdings for USD portfolio
 */
router.get('/USD', async (req, res) => {
  try {
    const holdings = await db.select().from(holdingsUSD);
    res.json(holdings);
  } catch (error) {
    console.error('Error getting USD holdings:', error);
    res.status(500).json({ error: 'Failed to get USD holdings' });
  }
});

/**
 * Get holdings for CAD portfolio
 */
router.get('/CAD', async (req, res) => {
  try {
    const holdings = await db.select().from(holdingsCAD);
    res.json(holdings);
  } catch (error) {
    console.error('Error getting CAD holdings:', error);
    res.status(500).json({ error: 'Failed to get CAD holdings' });
  }
});

/**
 * Get holdings for INTL portfolio
 */
router.get('/INTL', async (req, res) => {
  try {
    const holdings = await db.select().from(holdingsINTL);
    res.json(holdings);
  } catch (error) {
    console.error('Error getting INTL holdings:', error);
    res.status(500).json({ error: 'Failed to get INTL holdings' });
  }
});

/**
 * Update holdings for a specific portfolio
 */
router.post('/update/:region', async (req, res) => {
  try {
    const { region } = req.params;
    
    if (!['USD', 'CAD', 'INTL'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Must be USD, CAD, or INTL' });
    }
    
    let result: any[] = [];
    
    if (region === 'USD') {
      result = await holdingsService.updateUSDHoldings();
    } else if (region === 'CAD') {
      result = await holdingsService.updateCADHoldings();
    } else if (region === 'INTL') {
      result = await holdingsService.updateINTLHoldings();
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${result.length} holdings for ${region} portfolio`,
      count: result.length 
    });
  } catch (error) {
    console.error(`Error updating ${req.params.region} holdings:`, error);
    res.status(500).json({ error: `Failed to update ${req.params.region} holdings` });
  }
});

/**
 * Update all holdings
 */
router.post('/update', async (req, res) => {
  try {
    const result = await holdingsService.updateAllHoldings();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating all holdings:', error);
    res.status(500).json({ error: 'Failed to update all holdings' });
  }
});

export default router;
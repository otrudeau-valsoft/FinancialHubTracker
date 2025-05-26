import express from 'express';
import { db } from '../db';
import { portfolioCash } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Get all portfolio cash balances
 */
router.get('/', async (req, res) => {
  try {
    const cashBalances = await db.select().from(portfolioCash);
    res.json(cashBalances);
  } catch (error) {
    console.error('Error getting cash balances:', error);
    res.status(500).json({ error: 'Failed to get cash balances' });
  }
});

/**
 * Get portfolio cash balance for a specific region
 */
router.get('/:region', async (req, res) => {
  try {
    const { region } = req.params;
    
    if (!['USD', 'CAD', 'INTL'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Must be USD, CAD, or INTL' });
    }
    
    const [cashBalance] = await db.select()
      .from(portfolioCash)
      .where(eq(portfolioCash.region, region));
    
    if (!cashBalance) {
      return res.status(404).json({ error: `Cash balance for ${region} not found` });
    }
    
    res.json(cashBalance);
  } catch (error) {
    console.error(`Error getting ${req.params.region} cash balance:`, error);
    res.status(500).json({ error: `Failed to get ${req.params.region} cash balance` });
  }
});

/**
 * Update portfolio cash balance for a specific region
 */
router.patch('/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { amount } = req.body;
    
    if (!['USD', 'CAD', 'INTL'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Must be USD, CAD, or INTL' });
    }
    
    if (amount === undefined || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }
    
    // Update the cash balance
    await db.update(portfolioCash)
      .set({ amount: amount.toString() })
      .where(eq(portfolioCash.region, region));
    
    // Get the updated cash balance
    const [updatedCashBalance] = await db.select()
      .from(portfolioCash)
      .where(eq(portfolioCash.region, region));
    
    res.json({ 
      success: true, 
      message: `Updated cash balance for ${region} portfolio to ${updatedCashBalance.amount}`,
      cashBalance: updatedCashBalance
    });
  } catch (error) {
    console.error(`Error updating ${req.params.region} cash balance:`, error);
    res.status(500).json({ error: `Failed to update ${req.params.region} cash balance` });
  }
});

export default router;
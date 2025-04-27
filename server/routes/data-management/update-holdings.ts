import express from 'express';
import { holdingsService } from '../../services/holdings-service';

const router = express.Router();

/**
 * Update all holdings
 */
router.post('/', async (req, res) => {
  try {
    console.log('Starting update of all holdings...');
    const result = await holdingsService.updateAllHoldings();
    console.log('Completed update of all holdings');
    res.json({ 
      success: true, 
      message: 'All holdings updated successfully',
      result 
    });
  } catch (error) {
    console.error('Error updating all holdings:', error);
    res.status(500).json({ error: 'Failed to update all holdings' });
  }
});

/**
 * Update holdings for USD portfolio
 */
router.post('/USD', async (req, res) => {
  try {
    console.log('Starting update of USD holdings...');
    const result = await holdingsService.updateUSDHoldings();
    console.log(`Completed update of ${result.length} USD holdings`);
    res.json({ 
      success: true, 
      message: `Updated ${result.length} USD holdings`
    });
  } catch (error) {
    console.error('Error updating USD holdings:', error);
    res.status(500).json({ error: 'Failed to update USD holdings' });
  }
});

/**
 * Update holdings for CAD portfolio
 */
router.post('/CAD', async (req, res) => {
  try {
    console.log('Starting update of CAD holdings...');
    const result = await holdingsService.updateCADHoldings();
    console.log(`Completed update of ${result.length} CAD holdings`);
    res.json({ 
      success: true, 
      message: `Updated ${result.length} CAD holdings` 
    });
  } catch (error) {
    console.error('Error updating CAD holdings:', error);
    res.status(500).json({ error: 'Failed to update CAD holdings' });
  }
});

/**
 * Update holdings for INTL portfolio
 */
router.post('/INTL', async (req, res) => {
  try {
    console.log('Starting update of INTL holdings...');
    const result = await holdingsService.updateINTLHoldings();
    console.log(`Completed update of ${result.length} INTL holdings`);
    res.json({ 
      success: true, 
      message: `Updated ${result.length} INTL holdings` 
    });
  } catch (error) {
    console.error('Error updating INTL holdings:', error);
    res.status(500).json({ error: 'Failed to update INTL holdings' });
  }
});

export default router;
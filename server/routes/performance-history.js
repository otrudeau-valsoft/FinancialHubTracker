/**
 * Portfolio Performance History API Routes
 * 
 * These routes handle requests for portfolio performance metrics
 * and integration with historical price updates.
 */

const express = require('express');
const { portfolioPerformanceService } = require('../services/portfolio-performance-service');
const { DateTime } = require('luxon');

const router = express.Router();

/**
 * Get portfolio performance history data
 * 
 * @route GET /api/performance-history
 * @param {string} region - The portfolio region (USD, CAD, INTL)
 * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
 * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
 * @param {string} [timeRange] - Optional time range (1W, 1M, YTD, 1Y, etc.)
 * @returns {Object} Performance history data with status
 */
router.get('/', async (req, res) => {
  try {
    // Get parameters with validation
    const region = (req.query.region || 'USD').toUpperCase();
    const { startDate, endDate, timeRange } = req.query;
    
    // Validate region
    const validRegions = ['USD', 'CAD', 'INTL'];
    if (!validRegions.includes(region)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid region: ${region}. Must be one of: ${validRegions.join(', ')}`
      });
    }
    
    console.log('Performance history request:', { region, timeRange, startDate, endDate });
    
    // If timeRange is provided, calculate startDate from it
    let calculatedStartDate;
    if (timeRange && !startDate) {
      const now = DateTime.now().setZone('America/New_York');
      
      switch (timeRange) {
        case '1W':
          calculatedStartDate = now.minus({ weeks: 1 }).toFormat('yyyy-MM-dd');
          break;
        case '1M':
          calculatedStartDate = now.minus({ months: 1 }).toFormat('yyyy-MM-dd');
          break;
        case 'YTD':
          calculatedStartDate = DateTime.fromObject({ 
            year: now.year, month: 1, day: 1 
          }).toFormat('yyyy-MM-dd');
          break;
        case '1Y':
          calculatedStartDate = now.minus({ years: 1 }).toFormat('yyyy-MM-dd');
          break;
        case '5Y':
          calculatedStartDate = now.minus({ years: 5 }).toFormat('yyyy-MM-dd');
          break;
        default:
          // Default to 18 months
          calculatedStartDate = now.minus({ months: 18 }).toFormat('yyyy-MM-dd');
      }
    }
    
    // Get the performance data - use calculated or provided startDate
    const finalStartDate = startDate || calculatedStartDate;
    const performanceData = await portfolioPerformanceService.getPerformanceHistory(
      region, 
      finalStartDate,
      endDate
    );
    
    return res.json({
      status: 'success',
      data: performanceData
    });
  } catch (error) {
    console.error('Error fetching portfolio performance history:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch portfolio performance history',
      details: error.message
    });
  }
});

/**
 * Manually trigger a portfolio performance history update
 * 
 * @route POST /api/performance-history/update
 * @param {string} [region] - Optional specific region to update (USD, CAD, INTL)
 * @param {string} [startDate] - Optional start date in YYYY-MM-DD format
 * @param {string} [endDate] - Optional end date in YYYY-MM-DD format
 * @returns {Object} Update status result
 */
router.post('/update', async (req, res) => {
  try {
    const { region, startDate, endDate } = req.body;
    
    let result;
    
    if (region) {
      // Update specific region
      console.log(`Manually updating performance history for ${region} region...`);
      
      // Validate region
      const validRegions = ['USD', 'CAD', 'INTL'];
      if (!validRegions.includes(region.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid region: ${region}. Must be one of: ${validRegions.join(', ')}`
        });
      }
      
      result = await portfolioPerformanceService.updatePerformanceHistory(
        region.toUpperCase(),
        startDate,
        endDate
      );
    } else {
      // Update all regions
      console.log('Manually updating performance history for all regions...');
      result = await portfolioPerformanceService.updateAllPerformanceHistory(
        startDate,
        endDate
      );
    }
    
    if (result) {
      return res.json({
        status: 'success',
        message: 'Successfully updated portfolio performance history'
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update portfolio performance history'
      });
    }
  } catch (error) {
    console.error('Error updating portfolio performance history:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update portfolio performance history',
      details: error.message
    });
  }
});

module.exports = router;
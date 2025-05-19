/**
 * Moving Average Controller
 * 
 * Handles endpoints related to Moving Average data
 */

import { Request, Response } from 'express';
import * as MovingAverageService from '../services/moving-average-service';

/**
 * Get Moving Average data for a specific symbol and region
 */
export const getMovingAverageData = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  
  try {
    const data = await MovingAverageService.getMovingAverageData(symbol, region, limit);
    return res.json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error(`Error fetching Moving Average data for ${symbol} (${region}):`, error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to fetch Moving Average data'
    });
  }
};

/**
 * Calculate and update Moving Average data for a specific symbol
 */
export const calculateMovingAverageData = async (req: Request, res: Response) => {
  const { symbol, region } = req.params;
  
  try {
    const processed = await MovingAverageService.calculateAndStoreMovingAverages(symbol, region);
    return res.json({
      status: 'success',
      message: `Successfully processed ${processed} Moving Average data points for ${symbol} (${region})`,
      dataPointsProcessed: processed
    });
  } catch (error) {
    console.error(`Error calculating Moving Average data for ${symbol} (${region}):`, error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to calculate Moving Average data'
    });
  }
};

/**
 * Calculate and update Moving Average data for all symbols in a portfolio
 */
export const calculatePortfolioMovingAverages = async (req: Request, res: Response) => {
  const { region } = req.params;
  
  try {
    const processed = await MovingAverageService.calculateMovingAveragesForPortfolio(region);
    return res.json({
      status: 'success',
      message: `Successfully processed ${processed} Moving Average data points for ${region} portfolio`,
      dataPointsProcessed: processed
    });
  } catch (error) {
    console.error(`Error calculating Moving Average data for ${region} portfolio:`, error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to calculate Moving Average data for portfolio'
    });
  }
};
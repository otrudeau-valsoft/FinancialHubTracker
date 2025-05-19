/**
 * Moving Average Controller
 * 
 * Handles endpoints related to Moving Average data
 */

import { Request, Response } from 'express';
import { movingAverageService } from '../services/moving-average-service';
import { historicalPriceService } from '../services/historical-price-service';
import { storage } from '../db-storage';
import { AppError } from '../middleware/error-handler';

/**
 * Get Moving Average data for a specific symbol and region
 */
export const getMovingAverageData = async (req: Request, res: Response) => {
  try {
    const { symbol, region } = req.params;
    
    if (!symbol || !region) {
      throw new AppError('Symbol and region are required', 400);
    }
    
    // Get the moving average data
    const maData = await storage.getMovingAverageData(symbol, region);
    
    return res.json({
      status: 'success',
      data: maData
    });
  } catch (error) {
    console.error('Error getting Moving Average data:', error);
    return res.status(error instanceof AppError ? error.statusCode : 500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error retrieving Moving Average data'
    });
  }
};

/**
 * Calculate and update Moving Average data for a specific symbol
 */
export const calculateMovingAverageData = async (req: Request, res: Response) => {
  try {
    const { symbol, region } = req.params;
    const { forceRefresh } = req.query;
    
    if (!symbol || !region) {
      throw new AppError('Symbol and region are required', 400);
    }
    
    // Determine if we should force a refresh
    const shouldForceRefresh = forceRefresh === 'true';
    
    // Calculate and update moving averages
    const result = await movingAverageService.calculateAndUpdateMovingAverages(
      symbol,
      region,
      shouldForceRefresh
    );
    
    return res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error calculating Moving Average data:', error);
    return res.status(error instanceof AppError ? error.statusCode : 500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error calculating Moving Average data'
    });
  }
};

/**
 * Calculate and update Moving Average data for all symbols in a portfolio
 */
export const calculateMovingAveragesForPortfolio = async (req: Request, res: Response) => {
  try {
    const { region } = req.params;
    const { forceRefresh } = req.query;
    
    if (!region) {
      throw new AppError('Region is required', 400);
    }
    
    // Determine if we should force a refresh
    const shouldForceRefresh = forceRefresh === 'true';
    
    // Get all stocks in this portfolio
    const stocks = await storage.getPortfolioStocks(region);
    
    if (!stocks || stocks.length === 0) {
      return res.json({
        status: 'success',
        data: {
          message: `No stocks found in ${region} portfolio`,
          updated: 0
        }
      });
    }
    
    // Process each stock's moving averages
    const results = [];
    
    for (const stock of stocks) {
      try {
        const result = await movingAverageService.calculateAndUpdateMovingAverages(
          stock.symbol,
          region,
          shouldForceRefresh
        );
        results.push({
          symbol: stock.symbol,
          success: true,
          result
        });
      } catch (error) {
        console.error(`Error calculating Moving Averages for ${stock.symbol}:`, error);
        results.push({
          symbol: stock.symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Add a brief pause between stocks to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return res.json({
      status: 'success',
      data: {
        processed: stocks.length,
        results
      }
    });
  } catch (error) {
    console.error('Error calculating Moving Averages for portfolio:', error);
    return res.status(error instanceof AppError ? error.statusCode : 500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error calculating Moving Averages for portfolio'
    });
  }
};
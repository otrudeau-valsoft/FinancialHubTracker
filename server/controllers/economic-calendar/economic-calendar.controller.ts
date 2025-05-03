/**
 * Economic Calendar Controller
 * Handles API requests for economic calendar data from Trading Economics
 */

import { Request, Response } from 'express';
import { TradingEconomicsClient } from '../../utils/trading-economics-client';

// Singleton client instance
let tradingEconomicsClient: TradingEconomicsClient | null = null;

// Function to initialize the client if not already initialized
function getClient(): TradingEconomicsClient {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    throw new Error("RapidAPI key not configured");
  }
  
  if (!tradingEconomicsClient) {
    tradingEconomicsClient = new TradingEconomicsClient(apiKey);
  }
  
  return tradingEconomicsClient;
}

/**
 * Get economic calendar events for the current month
 */
export const getCurrentMonthCalendar = async (req: Request, res: Response) => {
  try {
    const client = getClient();
    
    // Get current date
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // JavaScript months are 0-based
    
    console.log(`[EconomicCalendarAPI] Fetching calendar for ${year}-${month}`);
    
    const response = await client.getEconomicCalendar({
      year,
      month,
      timezone: 'UTC-5' // EST timezone as requested
    });
    
    const formattedEvents = client.formatCalendarEvents(response.data);
    
    res.json({
      status: "success",
      data: formattedEvents
    });
  } catch (error: any) {
    console.error("[EconomicCalendarAPI] Error fetching economic calendar:", error.message);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch economic calendar data",
      details: error.message
    });
  }
};

/**
 * Get economic calendar events for a specific date range
 */
export const getCalendarForDateRange = async (req: Request, res: Response) => {
  try {
    const { year, month, day } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        status: "error", 
        message: "Year and month parameters are required" 
      });
    }
    
    const client = getClient();
    
    console.log(`[EconomicCalendarAPI] Fetching calendar for ${year}-${month}${day ? `-${day}` : ''}`);
    
    const response = await client.getEconomicCalendar({
      year: parseInt(year as string),
      month: parseInt(month as string),
      day: day ? parseInt(day as string) : undefined,
      timezone: 'UTC-5' // EST timezone as requested
    });
    
    const formattedEvents = client.formatCalendarEvents(response.data);
    
    res.json({
      status: "success",
      data: formattedEvents
    });
  } catch (error: any) {
    console.error("[EconomicCalendarAPI] Error fetching economic calendar:", error.message);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch economic calendar data",
      details: error.message
    });
  }
};
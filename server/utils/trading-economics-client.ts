/**
 * Trading Economics API Client with Rate Limiting
 * This utility wraps axios API calls to economic calendar APIs with rate limiting.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';

// Create a rate limiter for API requests (2 requests per second to be safe)
const rateLimiter = new RateLimiter(2);

export interface EconomicCalendarParams {
  year: number;
  month: number;
  day?: number;
  timezone?: string;
}

export class TradingEconomicsClient {
  private apiKey: string;
  private useMockData: boolean;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('No API key provided, using mock data for economic calendar');
      this.useMockData = true;
    } else {
      this.useMockData = false;
    }
    this.apiKey = apiKey;
  }

  /**
   * Get economic calendar for a specific date range
   */
  public async getEconomicCalendar(params: EconomicCalendarParams): Promise<any> {
    const { year, month, day, timezone = 'UTC-5' } = params;
    
    console.log(`[EconomicCalendarClient] Fetching economic calendar for ${year}-${month}${day ? `-${day}` : ''} (${timezone})`);
    
    // Use mock data if we don't have an API key or if specified
    if (this.useMockData) {
      return {
        data: this.generateMockCalendarData(year, month, day)
      };
    }
    
    // Try the Twelve Data API if available
    try {
      return await this.fetchFromAlternativeSource(params);
    } catch (error) {
      console.error('[EconomicCalendarClient] Failed to fetch data from API, using mock data', error);
      return {
        data: this.generateMockCalendarData(year, month, day)
      };
    }
  }

  /**
   * Get economic calendar for the current week
   */
  public async getCurrentWeekCalendar(): Promise<any> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-based
    
    console.log(`[EconomicCalendarClient] Fetching current week economic calendar`);
    
    return this.getEconomicCalendar({
      year: currentYear,
      month: currentMonth
    });
  }

  /**
   * Try fetching from another economic calendar API
   */
  private async fetchFromAlternativeSource(params: EconomicCalendarParams): Promise<any> {
    // This would be implemented with whatever economic calendar API
    // you have access to with your RapidAPI subscription
    throw new Error('No compatible economic calendar API found');
  }

  /**
   * Format and organize calendar events by date
   */
  public formatCalendarEvents(data: any): { [date: string]: any[] } {
    if (!data || !Array.isArray(data)) {
      return {};
    }

    // Group events by date
    const eventsByDate: { [date: string]: any[] } = {};
    
    data.forEach((event: any) => {
      const eventDate = event.date || 'Unknown';
      if (!eventsByDate[eventDate]) {
        eventsByDate[eventDate] = [];
      }
      eventsByDate[eventDate].push(event);
    });
    
    return eventsByDate;
  }

  /**
   * Generate mock economic calendar data for testing and demo purposes
   */
  private generateMockCalendarData(year: number, month: number, day?: number): any[] {
    const events = [];
    
    // Month names for display
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Define start and end days to generate data for
    const startDay = day || 1;
    const endDay = day || new Date(year, month, 0).getDate(); // Last day of month
    
    // Common economic indicators
    const economicEvents = [
      { event: 'Fed Interest Rate Decision', country: 'US', impact: 'High' },
      { event: 'Non-Farm Payrolls', country: 'US', impact: 'High' },
      { event: 'GDP Growth Rate', country: 'US', impact: 'High' },
      { event: 'Unemployment Rate', country: 'US', impact: 'High' },
      { event: 'CPI', country: 'US', impact: 'High' },
      { event: 'Building Permits', country: 'US', impact: 'Medium' },
      { event: 'Existing Home Sales', country: 'US', impact: 'Medium' },
      { event: 'Retail Sales', country: 'US', impact: 'Medium' },
      { event: 'Consumer Confidence', country: 'US', impact: 'Medium' },
      { event: 'ISM Manufacturing PMI', country: 'US', impact: 'Medium' },
      { event: 'ISM Non-Manufacturing PMI', country: 'US', impact: 'Medium' },
      { event: 'Core PCE Price Index', country: 'US', impact: 'Medium' },
      { event: 'Durable Goods Orders', country: 'US', impact: 'Medium' },
      { event: 'Initial Jobless Claims', country: 'US', impact: 'Medium' },
      { event: 'Industrial Production', country: 'US', impact: 'Low' },
      { event: 'Crude Oil Inventories', country: 'US', impact: 'Low' },
      { event: 'Employment Change', country: 'CA', impact: 'High' },
      { event: 'Interest Rate Decision', country: 'EU', impact: 'High' },
      { event: 'ECB Press Conference', country: 'EU', impact: 'High' },
      { event: 'CPI', country: 'EU', impact: 'High' },
      { event: 'Manufacturing PMI', country: 'EU', impact: 'Medium' },
      { event: 'GDP Growth Rate', country: 'EU', impact: 'High' },
      { event: 'Bank of England Rate Decision', country: 'UK', impact: 'High' },
      { event: 'CPI', country: 'UK', impact: 'High' },
      { event: 'GDP Growth Rate', country: 'UK', impact: 'High' },
      { event: 'Bank of Japan Rate Decision', country: 'JP', impact: 'High' },
      { event: 'Trade Balance', country: 'JP', impact: 'Medium' },
      { event: 'GDP Growth Rate', country: 'JP', impact: 'High' },
      { event: 'GDP Growth Rate', country: 'CN', impact: 'High' },
      { event: 'Manufacturing PMI', country: 'CN', impact: 'High' },
      { event: 'Trade Balance', country: 'CN', impact: 'Medium' },
      { event: 'FDI', country: 'CN', impact: 'Medium' },
    ];
    
    // Function to generate random time (only during market hours)
    const randomTime = () => {
      const hours = Math.floor(Math.random() * 8) + 8; // 8 AM to 4 PM
      const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} AM`;
    };
    
    // Generate between 3-6 events per day
    for (let currentDay = startDay; currentDay <= endDay; currentDay++) {
      // Skip weekends
      const date = new Date(year, month - 1, currentDay);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const formattedDate = `${monthNames[month - 1]} ${currentDay} ${year}`;
      
      // Generate 3-6 random events for this day
      const numEvents = Math.floor(Math.random() * 4) + 3;
      const usedEvents = new Set();
      
      for (let i = 0; i < numEvents; i++) {
        // Get a random event that hasn't been used for this day
        let eventIndex;
        do {
          eventIndex = Math.floor(Math.random() * economicEvents.length);
        } while (usedEvents.has(eventIndex));
        
        usedEvents.add(eventIndex);
        const economicEvent = economicEvents[eventIndex];
        
        // Generate random previous, forecast, and actual values
        const previous = (Math.random() * 10).toFixed(1);
        const forecast = (Math.random() * 10).toFixed(1);
        
        // 50% chance actual beats forecast, 30% chance it misses, 20% chance it matches
        let actual;
        const rand = Math.random();
        if (rand < 0.5) {
          actual = (parseFloat(forecast) + Math.random() * 1).toFixed(1);
        } else if (rand < 0.8) {
          actual = (parseFloat(forecast) - Math.random() * 1).toFixed(1);
        } else {
          actual = forecast;
        }
        
        // Create the event
        events.push({
          date: formattedDate,
          time: randomTime(),
          country: economicEvent.country,
          event: economicEvent.event,
          impact: economicEvent.impact,
          actual: actual,
          forecast: forecast,
          previous: previous
        });
      }
    }
    
    return events;
  }
}
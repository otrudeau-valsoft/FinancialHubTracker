/**
 * Trading Economics API Client with Rate Limiting
 * This utility wraps axios API calls to Trading Economics Scraper API with rate limiting.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';

// Create a rate limiter for Trading Economics API (2 requests per second to be safe)
const rateLimiter = new RateLimiter(2);

export interface EconomicCalendarParams {
  year: number;
  month: number;
  day?: number;
  timezone?: string;
}

export class TradingEconomicsClient {
  private apiKey: string;
  private baseUrl: string = 'https://trading-econmics-scraper.p.rapidapi.com';
  private host: string = 'trading-econmics-scraper.p.rapidapi.com';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for TradingEconomicsClient');
    }
    this.apiKey = apiKey;
  }

  /**
   * Get economic calendar for a specific date range
   */
  public async getEconomicCalendar(params: EconomicCalendarParams): Promise<any> {
    const { year, month, day, timezone = 'UTC-5' } = params;
    
    let path = `/get_trading_economics_calendar_details?year=${year}&month=${month}&timezone=${timezone}`;
    
    // Add day parameter if provided
    if (day) {
      path += `&day=${day}`;
    }
    
    console.log(`[TradingEconomicsClient] Fetching economic calendar for ${year}-${month}${day ? `-${day}` : ''} (${timezone})`);
    
    return this.makeRequest(path);
  }

  /**
   * Get economic calendar for the current week
   */
  public async getCurrentWeekCalendar(): Promise<any> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-based
    
    console.log(`[TradingEconomicsClient] Fetching current week economic calendar`);
    
    return this.getEconomicCalendar({
      year: currentYear,
      month: currentMonth
    });
  }

  /**
   * Make a rate-limited request to the Trading Economics API
   */
  private async makeRequest(path: string, config: AxiosRequestConfig = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    
    // Add headers to request config
    const requestConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        'x-rapidapi-host': this.host,
        'x-rapidapi-key': this.apiKey
      }
    };
    
    // Submit request to rate limiter
    return rateLimiter.submit(async () => {
      try {
        console.log(`[TradingEconomicsClient] Making request to ${path}`);
        const response = await axios.get(url, requestConfig);
        console.log(`[TradingEconomicsClient] Request to ${path} successful`);
        return response;
      } catch (error: any) {
        console.error(`[TradingEconomicsClient] Request to ${path} failed:`, error.message);
        throw error;
      }
    });
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
}
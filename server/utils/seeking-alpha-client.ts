/**
 * Seeking Alpha API Client with Rate Limiting
 * This utility wraps axios API calls to Seeking Alpha with rate limiting.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { RateLimiter } from './rate-limiter';

// Create a singleton rate limiter for Seeking Alpha API
// Allow 4 requests per second as per user's requirement
const rateLimiter = new RateLimiter(4);

export interface NewsRequestParams {
  id: string | string[];
  size?: number;
  number?: number;
}

export class SeekingAlphaClient {
  private apiKey: string;
  private baseUrl: string = 'https://seeking-alpha.p.rapidapi.com';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for SeekingAlphaClient');
    }
    this.apiKey = apiKey;
  }

  /**
   * Get news for a single symbol
   */
  public async getNewsBySymbol(symbol: string, size: number = 5, number: number = 1): Promise<any> {
    // Remove '.TO' suffix from Canadian stocks for Seeking Alpha API
    const cleanSymbol = symbol.endsWith('.TO') ? symbol.replace('.TO', '') : symbol;
    
    console.log(`[SeekingAlphaClient] Queuing news request for symbol: ${symbol}, cleaned: ${cleanSymbol}`);
    
    return this.makeRequest('/news/v2/list-by-symbol', {
      params: {
        id: cleanSymbol,
        size,
        number
      }
    });
  }

  /**
   * Get news for multiple symbols
   * Adds each request to the rate limiter queue individually
   */
  public async getNewsForSymbols(symbols: string[], size: number = 5, number: number = 1): Promise<Record<string, any>> {
    console.log(`[SeekingAlphaClient] Queuing news requests for ${symbols.length} symbols`);
    
    const results: Record<string, any> = {};
    
    // Queue individual requests for each symbol
    const requests = symbols.map(async (symbol) => {
      try {
        const response = await this.getNewsBySymbol(symbol, size, number);
        results[symbol] = response.data || [];
        return { symbol, success: true };
      } catch (error) {
        console.error(`[SeekingAlphaClient] Error fetching news for ${symbol}:`, error);
        results[symbol] = [];
        return { symbol, success: false, error };
      }
    });
    
    // Wait for all requests to complete
    await Promise.allSettled(requests);
    
    return results;
  }

  /**
   * Make a rate-limited request to the Seeking Alpha API
   */
  private async makeRequest(endpoint: string, config: AxiosRequestConfig = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add headers to request config
    const requestConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config.headers,
        'x-rapidapi-host': 'seeking-alpha.p.rapidapi.com',
        'x-rapidapi-key': this.apiKey
      }
    };
    
    // Submit request to rate limiter
    return rateLimiter.submit(async () => {
      try {
        console.log(`[SeekingAlphaClient] Making request to ${endpoint}`);
        const response = await axios.get(url, requestConfig);
        console.log(`[SeekingAlphaClient] Request to ${endpoint} successful`);
        return response;
      } catch (error: any) {
        console.error(`[SeekingAlphaClient] Request to ${endpoint} failed:`, error.message);
        throw error;
      }
    });
  }

  /**
   * Check the current request queue length
   */
  public get queueLength(): number {
    return rateLimiter.queueLength;
  }
  
  /**
   * Check if the rate limiter is active
   */
  public get isProcessing(): boolean {
    return rateLimiter.isActive;
  }
}
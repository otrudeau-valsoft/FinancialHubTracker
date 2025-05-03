/**
 * Test script to verify the Trading Economics API integration
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.RAPIDAPI_KEY;

if (!apiKey) {
  console.error('RAPIDAPI_KEY environment variable is not set');
  process.exit(1);
}

async function testTradingEconomicsAPI() {
  try {
    console.log('Testing Trading Economics API integration...');
    
    const options = {
      method: 'GET',
      url: 'https://trading-econmics-scraper.p.rapidapi.com/get_trading_economics_calendar_details',
      params: {
        year: '2025', 
        month: '5',
        timezone: 'UTC-5'
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'trading-econmics-scraper.p.rapidapi.com'
      }
    };

    console.log('Sending request to Trading Economics API...');
    const response = await axios.request(options);
    
    console.log('Response status:', response.status);
    console.log('Sample of received data:');
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      // Just log first few items to avoid console clutter
      console.log(response.data.slice(0, 3));
      console.log(`Total events received: ${response.data.length}`);
    } else {
      console.log('Received data:', response.data);
    }
    
    console.log('API test completed successfully');
    
  } catch (error) {
    console.error('Error testing Trading Economics API:');
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Request URL:', error.config?.url);
    } else {
      console.error(error);
    }
  }
}

// Run the test
testTradingEconomicsAPI();
import { Request, Response } from "express";
import axios from "axios";
import { SeekingAlphaClient } from "../utils/seeking-alpha-client";

// Create a singleton client instance
let seekingAlphaClient: SeekingAlphaClient | null = null;

// Function to initialize the client if not already initialized
function getClient(): SeekingAlphaClient {
  const apiKey = process.env.SEEKING_ALPHA_API_KEY;
  
  if (!apiKey) {
    throw new Error("Seeking Alpha API key not configured");
  }
  
  if (!seekingAlphaClient) {
    seekingAlphaClient = new SeekingAlphaClient(apiKey);
  }
  
  return seekingAlphaClient;
}

// Function to fetch news by symbol from Seeking Alpha
export const getNewsBySymbol = async (req: Request, res: Response) => {
  try {
    const { symbol, size = 20, number = 1 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ 
        status: "error", 
        message: "Symbol parameter is required" 
      });
    }
    
    // Get client instance
    const client = getClient();
    
    console.log(`[NewsAPI] Request for news by symbol: ${symbol}`);
    
    // Use the client to make the request
    const response = await client.getNewsBySymbol(
      symbol as string, 
      Number(size), 
      Number(number)
    );
    
    res.json(response.data);
    
  } catch (error: any) {
    console.error("[NewsAPI] Error fetching news:", error.message);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch news from Seeking Alpha",
      details: error.message
    });
  }
};

// Function to fetch news for multiple symbols
export const getNewsForPortfolio = async (req: Request, res: Response) => {
  try {
    const { region, days = 7 } = req.query;
    
    if (!region) {
      return res.status(400).json({ 
        status: "error", 
        message: "Region parameter is required" 
      });
    }
    
    console.log(`[NewsAPI] Fetching news for ${region} portfolio with ${days} days of history`);
    
    // First, fetch the portfolio stocks for the specified region
    const portfolioResponse = await axios.get(`http://localhost:5000/api/portfolios/${region}/stocks`);
    const stocks = portfolioResponse.data;
    
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(404).json({
        status: "error",
        message: `No stocks found for ${region} portfolio`
      });
    }
    
    // Get top 10 symbols by market value for news fetching
    const topSymbols = stocks
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 10)
      .map(stock => stock.symbol);
    
    console.log(`[NewsAPI] Fetching news for top ${topSymbols.length} symbols by market value`);
    
    // Get client instance
    const client = getClient();
    
    // Use our new batch approach with the rate limiter
    const allNewsResult = await Promise.allSettled(
      topSymbols.map(async symbol => {
        try {
          const symbolNews = await getNewsForSymbol(symbol);
          return {
            symbol,
            news: symbolNews
          };
        } catch (error) {
          console.error(`[NewsAPI] Error fetching news for ${symbol}:`, error);
          return {
            symbol,
            news: []
          };
        }
      })
    );
    
    const allNews = allNewsResult
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    // Flatten all news and sort by publish date
    const flattenedNews = allNews
      .flatMap(item => 
        item.news.map((news: any) => ({
          ...news,
          symbol: item.symbol
        }))
      )
      .filter((news: any) => {
        // Filter by date - only include news from the last 'days' days
        const publishDate = new Date(news.publishOn);
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(days));
        return publishDate >= daysAgo;
      })
      .sort((a: any, b: any) => 
        new Date(b.publishOn).getTime() - new Date(a.publishOn).getTime()
      );
    
    console.log(`[NewsAPI] Retrieved ${flattenedNews.length} news items for portfolio`);
    
    res.json({
      status: "success",
      data: flattenedNews
    });
    
  } catch (error: any) {
    console.error("[NewsAPI] Error fetching portfolio news:", error.message);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch portfolio news",
      details: error.message
    });
  }
};

// Helper function to fetch news for a single symbol
async function getNewsForSymbol(symbol: string): Promise<any[]> {
  try {
    // Get client instance
    const client = getClient();
    
    console.log(`[NewsHelper] Fetching news for symbol: ${symbol}`);
    
    // Use the rate-limited client
    const response = await client.getNewsBySymbol(symbol, 5, 1);
    
    if (response.data && response.data.data) {
      return response.data.data.map((item: any) => ({
        id: item.id,
        title: item.attributes.title,
        publishOn: item.attributes.publishOn,
        commentCount: item.attributes.commentCount,
        imageUrl: item.attributes.gettyImageUrl || null,
        link: item.links.self,
        sector: item.attributes.categories?.[0]?.name || null
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error(`[NewsHelper] Error fetching news for ${symbol}:`, error);
    return [];
  }
}
import { Request, Response } from "express";
import axios from "axios";

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

    const apiKey = process.env.SEEKING_ALPHA_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        status: "error", 
        message: "API key not configured" 
      });
    }
    
    // Remove '.TO' suffix from Canadian stocks for Seeking Alpha API
    const cleanSymbol = typeof symbol === 'string' && symbol.endsWith('.TO') 
      ? symbol.replace('.TO', '') 
      : symbol;
    
    console.log(`Fetching news for symbol: ${symbol}, using clean symbol: ${cleanSymbol}`);
    
    const response = await axios.get(`https://seeking-alpha.p.rapidapi.com/news/v2/list-by-symbol`, {
      headers: {
        "x-rapidapi-host": "seeking-alpha.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      },
      params: {
        id: cleanSymbol,
        size: size,
        number: number
      }
    });
    
    res.json(response.data);
    
  } catch (error: any) {
    console.error("Error fetching news:", error.message);
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
    
    const newsPromises = topSymbols.map(async (symbol) => {
      try {
        const symbolNews = await getNewsForSymbol(symbol);
        return {
          symbol,
          news: symbolNews
        };
      } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error);
        return {
          symbol,
          news: []
        };
      }
    });
    
    const allNews = await Promise.all(newsPromises);
    
    // Flatten all news and sort by publish date
    const flattenedNews = allNews
      .flatMap(item => 
        item.news.map(news => ({
          ...news,
          symbol: item.symbol
        }))
      )
      .filter(news => {
        // Filter by date - only include news from the last 'days' days
        const publishDate = new Date(news.publishOn);
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(days));
        return publishDate >= daysAgo;
      })
      .sort((a, b) => 
        new Date(b.publishOn).getTime() - new Date(a.publishOn).getTime()
      );
    
    res.json({
      status: "success",
      data: flattenedNews
    });
    
  } catch (error: any) {
    console.error("Error fetching portfolio news:", error.message);
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
    const apiKey = process.env.SEEKING_ALPHA_API_KEY;
    
    if (!apiKey) {
      throw new Error("API key not configured");
    }
    
    // Remove '.TO' suffix from Canadian stocks for Seeking Alpha API
    const cleanSymbol = symbol.endsWith('.TO') ? symbol.replace('.TO', '') : symbol;
    
    console.log(`Fetching news for symbol: ${symbol}, using clean symbol: ${cleanSymbol}`);
    
    const response = await axios.get(`https://seeking-alpha.p.rapidapi.com/news/v2/list-by-symbol`, {
      headers: {
        "x-rapidapi-host": "seeking-alpha.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      },
      params: {
        id: cleanSymbol,
        size: 5,  // Limit to 5 news items per symbol
        number: 1
      }
    });
    
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
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}
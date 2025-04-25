import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMatrixRuleSchema, insertAlertSchema, insertPortfolioSummarySchema, dataUpdateLogs } from "@shared/schema";
import { InsertPortfolioStock, InsertEtfHolding } from "./types";
import { z } from "zod";
import { historicalPriceService } from "./services/historical-price-service";
import { currentPriceService } from "./services/current-price-service";
import { schedulerService } from "./services/scheduler-service";
import { earningsService } from "./services/earnings-service";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

// Define validation schemas for the compatibility types
const insertPortfolioStockSchema = z.object({
  symbol: z.string(),
  company: z.string(),
  region: z.string(),
  sector: z.string().nullable().optional(),
  stockType: z.string(),
  rating: z.string(),
  price: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  nav: z.string().nullable().optional(),
  portfolioWeight: z.string().nullable().optional(),
  dailyChange: z.string().nullable().optional(),
  mtdChange: z.string().nullable().optional(),
  ytdChange: z.string().nullable().optional(),
  sixMonthChange: z.string().nullable().optional(),
  fiftyTwoWeekChange: z.string().nullable().optional(),
  dividendYield: z.string().nullable().optional(),
  profitLoss: z.string().nullable().optional(),
  nextEarningsDate: z.string().nullable().optional()
});

const insertEtfHoldingSchema = z.object({
  etfSymbol: z.string(),
  ticker: z.string(),
  name: z.string(),
  sector: z.string().nullable().optional(),
  assetClass: z.string().nullable().optional(),
  marketValue: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  notionalValue: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  fxRate: z.string().nullable().optional(),
  marketCurrency: z.string().nullable().optional()
});
export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiRouter = app.route("/api");

  // Portfolio Stocks Routes
  app.get("/api/portfolios/:region/stocks", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const stocks = await storage.getPortfolioStocks(region);
      return res.json(stocks);
    } catch (error) {
      console.error("Error fetching portfolio stocks:", error);
      return res.status(500).json({ message: "Failed to fetch portfolio stocks" });
    }
  });

  app.post("/api/portfolios/:region/stocks", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const stockData = { ...req.body, region };
      
      // Validate the request body
      const validatedStock = insertPortfolioStockSchema.parse(stockData);
      
      const stock = await storage.createPortfolioStock(validatedStock);
      return res.status(201).json(stock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stock data", errors: error.errors });
      }
      console.error("Error creating portfolio stock:", error);
      return res.status(500).json({ message: "Failed to create portfolio stock" });
    }
  });

  app.post("/api/portfolios/:region/stocks/bulk", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const stocksData = req.body.stocks.map((stock: any) => ({ ...stock, region }));
      
      // Validate each stock in the array
      const validatedStocks = stocksData.map((stock: any) => insertPortfolioStockSchema.parse(stock));
      
      const stocks = await storage.bulkCreatePortfolioStocks(validatedStocks);
      return res.status(201).json(stocks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stock data", errors: error.errors });
      }
      console.error("Error creating portfolio stocks in bulk:", error);
      return res.status(500).json({ message: "Failed to create portfolio stocks in bulk" });
    }
  });

  app.get("/api/portfolios/:region/stocks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stock = await storage.getPortfolioStock(id);
      
      if (!stock) {
        return res.status(404).json({ message: "Portfolio stock not found" });
      }
      
      return res.json(stock);
    } catch (error) {
      console.error("Error fetching portfolio stock:", error);
      return res.status(500).json({ message: "Failed to fetch portfolio stock" });
    }
  });

  app.put("/api/portfolios/:region/stocks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const stockData = req.body;
      
      const updatedStock = await storage.updatePortfolioStock(id, stockData);
      
      if (!updatedStock) {
        return res.status(404).json({ message: "Portfolio stock not found" });
      }
      
      return res.json(updatedStock);
    } catch (error) {
      console.error("Error updating portfolio stock:", error);
      return res.status(500).json({ message: "Failed to update portfolio stock" });
    }
  });

  app.delete("/api/portfolios/:region/stocks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePortfolioStock(id);
      
      if (!success) {
        return res.status(404).json({ message: "Portfolio stock not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting portfolio stock:", error);
      return res.status(500).json({ message: "Failed to delete portfolio stock" });
    }
  });

  // ETF Holdings Routes
  app.get("/api/etfs/:symbol/holdings", async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const holdings = await storage.getEtfHoldings(symbol);
      return res.json(holdings);
    } catch (error) {
      console.error("Error fetching ETF holdings:", error);
      return res.status(500).json({ message: "Failed to fetch ETF holdings" });
    }
  });

  app.get("/api/etfs/:symbol/holdings/top/:limit", async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const limit = parseInt(req.params.limit) || 10;
      const holdings = await storage.getTopEtfHoldings(symbol, limit);
      return res.json(holdings);
    } catch (error) {
      console.error("Error fetching top ETF holdings:", error);
      return res.status(500).json({ message: "Failed to fetch top ETF holdings" });
    }
  });

  app.post("/api/etfs/:symbol/holdings", async (req: Request, res: Response) => {
    try {
      const etfSymbol = req.params.symbol.toUpperCase();
      const holdingData = { ...req.body, etfSymbol };
      
      // Validate the request body
      const validatedHolding = insertEtfHoldingSchema.parse(holdingData);
      
      const holding = await storage.createEtfHolding(validatedHolding);
      return res.status(201).json(holding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid holding data", errors: error.errors });
      }
      console.error("Error creating ETF holding:", error);
      return res.status(500).json({ message: "Failed to create ETF holding" });
    }
  });

  app.post("/api/etfs/:symbol/holdings/bulk", async (req: Request, res: Response) => {
    try {
      const etfSymbol = req.params.symbol.toUpperCase();
      const holdingsData = req.body.holdings.map((holding: any) => ({ ...holding, etfSymbol }));
      
      // Validate each holding in the array
      const validatedHoldings = holdingsData.map((holding: any) => insertEtfHoldingSchema.parse(holding));
      
      const holdings = await storage.bulkCreateEtfHoldings(validatedHoldings);
      return res.status(201).json(holdings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid holding data", errors: error.errors });
      }
      console.error("Error creating ETF holdings in bulk:", error);
      return res.status(500).json({ message: "Failed to create ETF holdings in bulk" });
    }
  });

  // Matrix Rules Routes
  app.get("/api/matrix-rules/:actionType", async (req: Request, res: Response) => {
    try {
      const actionType = req.params.actionType;
      const rules = await storage.getMatrixRules(actionType);
      return res.json(rules);
    } catch (error) {
      console.error("Error fetching matrix rules:", error);
      return res.status(500).json({ message: "Failed to fetch matrix rules" });
    }
  });

  app.post("/api/matrix-rules", async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validatedRule = insertMatrixRuleSchema.parse(req.body);
      
      const rule = await storage.createMatrixRule(validatedRule);
      return res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rule data", errors: error.errors });
      }
      console.error("Error creating matrix rule:", error);
      return res.status(500).json({ message: "Failed to create matrix rule" });
    }
  });

  app.post("/api/matrix-rules/bulk", async (req: Request, res: Response) => {
    try {
      // Check if there are rules in the request
      const rules = req.body.rules;
      
      if (!Array.isArray(rules) || rules.length === 0) {
        return res.status(400).json({ message: "Invalid or empty rules data array" });
      }
      
      // Validate each rule in the array
      const validatedRules = rules.map((rule: any) => insertMatrixRuleSchema.parse(rule));
      
      // Clear existing rules to avoid duplicates
      const existingRules = await Promise.all([
        storage.getMatrixRules('Increase'),
        storage.getMatrixRules('Decrease')
      ]);
      
      const allExistingRules = [...existingRules[0], ...existingRules[1]];
      await Promise.all(allExistingRules.map(async (rule) => {
        await storage.deleteMatrixRule(rule.id);
      }));
      
      const createdRules = await storage.bulkCreateMatrixRules(validatedRules);
      
      return res.status(201).json({
        message: `Successfully imported ${createdRules.length} matrix rules`,
        rules: createdRules
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid rule data", errors: error.errors });
      }
      console.error("Error creating matrix rules in bulk:", error);
      return res.status(500).json({ message: "Failed to create matrix rules in bulk" });
    }
  });

  // Alerts Routes
  app.get("/api/alerts", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const alerts = await storage.getAlerts(activeOnly);
      return res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      return res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validatedAlert = insertAlertSchema.parse(req.body);
      
      const alert = await storage.createAlert(validatedAlert);
      return res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid alert data", errors: error.errors });
      }
      console.error("Error creating alert:", error);
      return res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.put("/api/alerts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const alertData = req.body;
      
      const updatedAlert = await storage.updateAlert(id, alertData);
      
      if (!updatedAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      return res.json(updatedAlert);
    } catch (error) {
      console.error("Error updating alert:", error);
      return res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // Portfolio Summaries Routes
  app.get("/api/portfolios/:region/summary", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const summary = await storage.getPortfolioSummary(region);
      
      if (!summary) {
        return res.status(404).json({ message: "Portfolio summary not found" });
      }
      
      return res.json(summary);
    } catch (error) {
      console.error("Error fetching portfolio summary:", error);
      return res.status(500).json({ message: "Failed to fetch portfolio summary" });
    }
  });

  app.post("/api/portfolios/:region/summary", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const summaryData = { ...req.body, region };
      
      // Validate the request body
      const validatedSummary = insertPortfolioSummarySchema.parse(summaryData);
      
      const summary = await storage.createPortfolioSummary(validatedSummary);
      return res.status(201).json(summary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid summary data", errors: error.errors });
      }
      console.error("Error creating portfolio summary:", error);
      return res.status(500).json({ message: "Failed to create portfolio summary" });
    }
  });

  app.put("/api/portfolios/:region/summary/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const summaryData = req.body;
      
      const updatedSummary = await storage.updatePortfolioSummary(id, summaryData);
      
      if (!updatedSummary) {
        return res.status(404).json({ message: "Portfolio summary not found" });
      }
      
      return res.json(updatedSummary);
    } catch (error) {
      console.error("Error updating portfolio summary:", error);
      return res.status(500).json({ message: "Failed to update portfolio summary" });
    }
  });

  // CSV Import Routes
  app.post("/api/import/portfolio/:region", async (req: Request, res: Response) => {
    try {
      const region = req.params.region.toUpperCase();
      const stocks = req.body.stocks;
      
      if (!Array.isArray(stocks) || stocks.length === 0) {
        return res.status(400).json({ message: "Invalid or empty stocks data array" });
      }
      
      // Clear existing stocks for this region first to avoid duplicates
      await Promise.all((await storage.getPortfolioStocks(region)).map(async (stock) => {
        await storage.deletePortfolioStock(stock.id);
      }));
      
      // Process each stock and add to database
      const processedStocks = stocks.map(stock => ({
        ...stock,
        region  // Ensure region is set
      }));
      
      const importedStocks = await storage.bulkCreatePortfolioStocks(processedStocks);
      
      return res.status(200).json({ 
        message: `Successfully imported ${importedStocks.length} stocks to ${region} portfolio`,
        stocks: importedStocks 
      });
    } catch (error) {
      console.error("Error importing portfolio data:", error);
      return res.status(500).json({ message: "Failed to import portfolio data" });
    }
  });

  app.post("/api/import/etf/:symbol", async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const holdings = req.body.holdings;
      
      if (!Array.isArray(holdings) || holdings.length === 0) {
        return res.status(400).json({ message: "Invalid or empty holdings data array" });
      }
      
      // Clear existing holdings for this ETF first to avoid duplicates
      await Promise.all((await storage.getEtfHoldings(symbol)).map(async (holding) => {
        await storage.deleteEtfHolding(holding.id);
      }));
      
      // Process each holding and add to database
      const processedHoldings = holdings.map(holding => ({
        ...holding,
        etfSymbol: symbol  // Ensure ETF symbol is set
      }));
      
      const importedHoldings = await storage.bulkCreateEtfHoldings(processedHoldings);
      
      return res.status(200).json({ 
        message: `Successfully imported ${importedHoldings.length} holdings to ${symbol} ETF`,
        holdings: importedHoldings 
      });
    } catch (error) {
      console.error("Error importing ETF data:", error);
      return res.status(500).json({ message: "Failed to import ETF data" });
    }
  });

  // Historical Prices Routes
  app.get("/api/historical-prices/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;
      
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (startDateStr) {
        startDate = new Date(startDateStr);
      }
      
      if (endDateStr) {
        endDate = new Date(endDateStr);
      }
      
      const prices = await storage.getHistoricalPrices(symbol, region.toUpperCase(), startDate, endDate);
      return res.json(prices);
    } catch (error) {
      console.error("Error fetching historical prices:", error);
      return res.status(500).json({ message: "Failed to fetch historical prices" });
    }
  });

  app.get("/api/historical-prices/region/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`API Request - Fetching historical prices for region: ${regionUpper}`);
      
      // Import the direct query function
      const { getHistoricalPricesDirect } = await import('./direct-query');
      
      // Select a representative stock for each region
      let symbol = "";
      
      if (regionUpper === "USD") {
        symbol = "AAPL";
        console.log("Using Apple (AAPL) data for USD region");
      } else if (regionUpper === "CAD") {
        symbol = "RY";
        console.log("Using Royal Bank of Canada (RY) data for CAD region");
      } else if (regionUpper === "INTL") {
        symbol = "NOK";
        console.log("Using Nokia (NOK) data for INTL region");
      } else {
        console.log(`Unknown region "${regionUpper}" - returning empty data`);
        return res.json([]);
      }
      
      // Use the direct query approach that works
      const data = await getHistoricalPricesDirect(symbol, regionUpper);
      console.log(`Historical price endpoint found ${data.length} records for ${symbol} in ${regionUpper}`);
      
      return res.json(data);
    } catch (error) {
      console.error("Error in regional historical price endpoint:", error);
      return res.status(500).json({ 
        message: "Failed to fetch historical prices by region", 
        error: (error as Error).message 
      });
    }
  });

  app.post("/api/historical-prices/fetch/portfolio/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      const { period, interval } = req.body;
      
      console.log(`Fetching historical prices for portfolio: ${regionUpper}`);
      
      // Determine which table to query based on region
      let tableName;
      switch (regionUpper) {
        case 'USD':
          tableName = 'assets_us';
          break;
        case 'CAD':
          tableName = 'assets_cad';
          break;
        case 'INTL':
          tableName = 'assets_intl';
          break;
        default:
          return res.status(400).json({ 
            message: `Invalid region: ${region}. Must be USD, CAD, or INTL.`
          });
      }
      
      // Query for symbols directly using SQL for better control
      const result = await db.execute(sql.raw(`SELECT symbol FROM ${tableName}`));
      const symbols = result.rows.map(row => row.symbol);
      
      if (!symbols || symbols.length === 0) {
        return res.status(404).json({ 
          message: `No symbols found for ${regionUpper} portfolio. Please import portfolio first.`
        });
      }
      
      console.log(`Found ${symbols.length} symbols for ${regionUpper} portfolio`);
      
      // Process symbols with rate limiting to avoid Yahoo Finance API limits
      let successCount = 0;
      for (const symbol of symbols) {
        try {
          // Normalize symbol case for Yahoo Finance
          const yahooSymbol = symbol.toUpperCase();
          console.log(`Processing ${yahooSymbol} (${regionUpper}) - ${successCount+1}/${symbols.length}`);
          
          const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
            yahooSymbol,
            regionUpper,
            period || '5y', // Default to 5 years of data as required
            interval || '1d'  // Default to daily data
          );
          
          if (success) {
            successCount++;
            console.log(`✓ Successfully updated ${yahooSymbol} (${regionUpper})`);
          } else {
            console.log(`✗ Failed to update ${yahooSymbol} (${regionUpper})`);
          }
          
          // Add a delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          // Continue to next symbol
        }
      }
      
      return res.status(200).json({ 
        message: `Updated historical prices for ${successCount}/${symbols.length} symbols in ${regionUpper} portfolio`,
        successCount,
        totalSymbols: symbols.length
      });
    } catch (error) {
      console.error("Error updating historical prices for portfolio:", error);
      return res.status(500).json({ 
        message: "Failed to update historical prices for portfolio",
        error: (error as Error).message
      });
    }
  });
  
  // Streamlined endpoint to fetch historical prices for ALL portfolios (USD, CAD, INTL)
  app.post("/api/historical-prices/fetch/all", async (req: Request, res: Response) => {
    try {
      const { period, interval } = req.body;
      console.log("Initiating historical price collection for all portfolios");
      
      // Track start time for execution duration
      const startTime = new Date();
      
      // Create a single log entry that we'll update throughout the process
      const initialLog = await schedulerService.logUpdate('historical_prices', 'In Progress', {
        message: `Starting historical price update for all portfolios...`,
        timestamp: new Date().toISOString(),
        startTime: startTime.toISOString(),
        progress: { current: 0, total: 0 } // We'll update this as we go
      });
      
      // Respond to the client immediately to avoid timeout
      res.status(200).json({ 
        message: "Historical price collection initiated for all portfolios",
        status: "processing"
      });
      
      // Continue the work asynchronously
      (async () => {
        const regions = ['USD', 'CAD', 'INTL'];
        const results = {};
        let totalSuccessCount = 0;
        let totalSymbolCount = 0;
        
        try {
          // Process each region portfolio
          for (const region of regions) {
            let tableName;
            switch (region) {
              case 'USD': tableName = 'assets_us'; break;
              case 'CAD': tableName = 'assets_cad'; break;
              case 'INTL': tableName = 'assets_intl'; break;
            }
            
            // Query for symbols directly using SQL
            const result = await db.execute(sql.raw(`SELECT symbol FROM ${tableName}`));
            const symbols = result.rows.map(row => row.symbol);
            
            if (!symbols || symbols.length === 0) {
              results[region] = { status: 'error', message: `No symbols found for ${region} portfolio` };
              continue;
            }
            
            // Track successful updates
            let successCount = 0;
            totalSymbolCount += symbols.length;
            
            // Update the initial log with the new region we're processing
            try {
              await schedulerService.logUpdate('historical_prices', 'In Progress', {
                message: `Processing ${region} portfolio (0/${symbols.length} symbols)`,
                region,
                progress: { current: 0, total: totalSymbolCount },
                timestamp: new Date().toISOString()
              }, initialLog && typeof initialLog.id === 'number' ? initialLog.id : undefined);
            } catch (logError) {
              console.error(`Error updating log for ${region} portfolio:`, logError);
              // Continue processing even if logging fails
            }
            
            // Process symbols with rate limiting
            for (const symbol of symbols) {
              try {
                // Ensure symbol is treated as a string
                const symbolStr = String(symbol);
                const yahooSymbol = symbolStr.toUpperCase();
                console.log(`Processing ${yahooSymbol} (${region}) - ${successCount+1}/${symbols.length}`);
                
                // Update the log with current progress
                if ((successCount + 1) % 5 === 0 || successCount === 0) { // Log every 5 symbols to avoid too many logs
                  // Calculate the overall progress across all portfolios
                  const overallProgress = totalSuccessCount + 1; // +1 for the current symbol being processed
                  
                  try {
                    await schedulerService.logUpdate('historical_prices', 'In Progress', {
                      message: `Processing ${region} portfolio: ${yahooSymbol} (${successCount+1}/${symbols.length} symbols)`,
                      region,
                      symbol: yahooSymbol,
                      progress: { current: overallProgress, total: totalSymbolCount },
                      timestamp: new Date().toISOString()
                    }, initialLog && typeof initialLog.id === 'number' ? initialLog.id : undefined);
                  } catch (logError) {
                    console.error(`Error updating progress log for ${yahooSymbol}:`, logError);
                    // Continue processing even if logging fails
                  }
                }
                
                const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
                  yahooSymbol,
                  region,
                  period || '5y', // Default to 5 years of data as required
                  interval || '1d'  // Default to daily data
                );
                
                if (success) {
                  successCount++;
                  totalSuccessCount++;
                  console.log(`✓ Successfully updated ${yahooSymbol} (${region})`);
                } else {
                  console.log(`✗ Failed to update ${yahooSymbol} (${region})`);
                }
                
                // Add a delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (error) {
                console.error(`Error processing ${symbol}:`, error);
                // Continue to next symbol
              }
            }
            
            results[region] = { 
              status: 'success', 
              message: `Updated ${successCount}/${symbols.length} symbols in ${region} portfolio`,
              successCount,
              totalSymbols: symbols.length
            };
            
            // Log completion for this region
            await schedulerService.logUpdate('historical_prices', 'Success', {
              message: `Completed ${region} portfolio: ${successCount}/${symbols.length} symbols updated`,
              region,
              progress: { current: symbols.length, total: symbols.length },
              timestamp: new Date().toISOString()
            });
          }
          
          // Log the final completion with execution time
          const endTime = new Date();
          const executionTime = endTime.getTime() - startTime.getTime();
          const minutes = Math.floor(executionTime / 60000);
          const seconds = Math.floor((executionTime % 60000) / 1000);
          
          await schedulerService.logUpdate('historical_prices', 'Success', {
            message: `Manual historical price update completed - ${totalSuccessCount}/${totalSymbolCount} symbols updated across all portfolios (${minutes}m ${seconds}s)`,
            results,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            executionTime: { minutes, seconds, totalMs: executionTime },
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error("Error in asynchronous historical price update:", error);
          // Calculate execution time until error
          const endTime = new Date();
          const executionTime = endTime.getTime() - startTime.getTime();
          const minutes = Math.floor(executionTime / 60000);
          const seconds = Math.floor((executionTime % 60000) / 1000);
          
          await schedulerService.logUpdate('historical_prices', 'Error', {
            message: `Error updating historical prices: ${(error as Error).message} (${minutes}m ${seconds}s)`,
            error: (error as Error).message,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            executionTime: { minutes, seconds, totalMs: executionTime },
            timestamp: new Date().toISOString()
          });
        }
      })();
      
    } catch (error) {
      console.error("Error initiating historical prices update for all portfolios:", error);
      
      // Log the error with time info
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      const minutes = Math.floor(executionTime / 60000);
      const seconds = Math.floor((executionTime % 60000) / 1000);
      
      await schedulerService.logUpdate('historical_prices', 'Error', {
        message: `Failed to initiate historical price update: ${(error as Error).message} (${minutes}m ${seconds}s)`,
        error: (error as Error).message,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime: { minutes, seconds, totalMs: executionTime },
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        message: "Failed to update historical prices for all portfolios", 
        error: (error as Error).message 
      });
    }
  });
  
  // Test route for historical price import
  // Very simple direct query test route - no storage layer
  app.get("/api/direct-query/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const regionUpper = region.toUpperCase();
      
      // Import the direct query function
      const { getHistoricalPricesDirect } = await import('./direct-query');
      
      console.log(`Testing direct query for ${symbol} in ${regionUpper}`);
      const data = await getHistoricalPricesDirect(symbol, regionUpper);
      
      return res.json({
        message: `Direct query for ${symbol} in ${regionUpper}`,
        count: data.length,
        data: data
      });
    } catch (error) {
      console.error("Error in direct query test:", error);
      return res.status(500).json({ 
        message: "Failed to run direct query test", 
        error: (error as Error).message 
      });
    }
  });

  // New test endpoint to verify symbol retrieval and display
  app.get("/api/portfolio-symbols/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      // Get symbols from the database for this region
      const symbols = await historicalPriceService.getSymbolsByRegionDirectSql(regionUpper);
      
      return res.json({
        region: regionUpper,
        count: symbols.length,
        symbols: symbols
      });
    } catch (error) {
      console.error("Error retrieving portfolio symbols:", error);
      return res.status(500).json({ 
        message: "Failed to retrieve portfolio symbols", 
        error: (error as Error).message 
      });
    }
  });

  app.get("/api/test/historical-prices", async (_req: Request, res: Response) => {
    try {
      // Test with a few sample stocks from each region
      const usdSymbols = ['AAPL', 'MSFT', 'GOOGL'];
      const cadSymbols = ['RY', 'TD', 'BMO'];
      // Use international stocks that trade as ADRs on US exchanges
      const intlSymbols = ['NSANY', 'NTDOY', 'NOK'];
      
      const results = {
        USD: [] as any[],
        CAD: [] as any[],
        INTL: [] as any[]
      };
      
      // Test USD symbols
      for (const symbol of usdSymbols) {
        try {
          const success = await historicalPriceService.fetchAndStoreHistoricalPrices(symbol, 'USD', '5y');
          const data = await storage.getHistoricalPrices(symbol, 'USD');
          results.USD.push({ symbol, success, count: data.length });
        } catch (error) {
          results.USD.push({ symbol, success: false, error: (error as Error).message });
        }
      }
      
      // Test CAD symbols
      for (const symbol of cadSymbols) {
        try {
          const success = await historicalPriceService.fetchAndStoreHistoricalPrices(symbol, 'CAD', '5y');
          const data = await storage.getHistoricalPrices(symbol, 'CAD');
          results.CAD.push({ symbol, success, count: data.length });
        } catch (error) {
          results.CAD.push({ symbol, success: false, error: (error as Error).message });
        }
      }
      
      // Test INTL symbols
      for (const symbol of intlSymbols) {
        try {
          // For the test, directly use the symbols without region-specific suffix
          // since these are ADRs that trade on US exchanges
          console.log(`Testing international symbol: ${symbol}`);
          const success = await historicalPriceService.fetchAndStoreHistoricalPrices(symbol, 'INTL', '5y');
          const data = await storage.getHistoricalPrices(symbol, 'INTL');
          results.INTL.push({ symbol, success, count: data.length });
        } catch (error) {
          results.INTL.push({ symbol, success: false, error: (error as Error).message });
        }
      }
      
      return res.json({
        message: 'Historical price test complete',
        results
      });
    } catch (error) {
      console.error("Error in historical price test:", error);
      return res.status(500).json({ message: "Failed to run historical price test", error: (error as Error).message });
    }
  });
  
  // Individual stock historical price fetching endpoint
  // IMPORTANT: This must be after other more specific endpoints with similar URL patterns
  app.post("/api/historical-prices/fetch/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const { period, interval } = req.body;
      
      const success = await historicalPriceService.fetchAndStoreHistoricalPrices(
        symbol,
        region.toUpperCase(),
        period || '5y', // Default to 5 years of data as required
        interval || '1d'  // Default to daily data
      );
      
      if (!success) {
        return res.status(404).json({ message: `No historical data found for ${symbol}` });
      }
      
      return res.status(200).json({ 
        message: `Successfully fetched and stored historical prices for ${symbol} (${region})`
      });
    } catch (error) {
      console.error("Error fetching historical prices from Yahoo Finance:", error);
      return res.status(500).json({ message: "Failed to fetch historical prices" });
    }
  });

  // ================== CURRENT PRICE ENDPOINTS ==================
  
  // Get current prices for a region
  app.get("/api/current-prices/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      const prices = await storage.getCurrentPrices(regionUpper);
      return res.json(prices);
    } catch (error) {
      console.error("Error fetching current prices:", error);
      return res.status(500).json({ message: "Failed to fetch current prices" });
    }
  });
  
  // Get current price for a specific symbol and region
  app.get("/api/current-prices/:region/:symbol", async (req: Request, res: Response) => {
    try {
      const { region, symbol } = req.params;
      const regionUpper = region.toUpperCase();
      const symbolUpper = symbol.toUpperCase();
      
      const price = await storage.getCurrentPrice(symbolUpper, regionUpper);
      
      if (!price) {
        return res.status(404).json({ message: `No current price found for ${symbolUpper} in ${regionUpper}` });
      }
      
      return res.json(price);
    } catch (error) {
      console.error("Error fetching current price:", error);
      return res.status(500).json({ message: "Failed to fetch current price" });
    }
  });
  
  // Fetch and store current prices for an entire portfolio
  app.post("/api/current-prices/fetch/portfolio/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`Fetching current prices for portfolio: ${regionUpper}`);
      
      // Track start time for execution duration
      const startTime = new Date();
      
      // Create a log entry with 'In Progress' status
      let inProgressLog = null;
      try {
        inProgressLog = await schedulerService.logUpdate('current_prices', 'In Progress', {
          message: `Starting current price update for ${regionUpper} portfolio...`,
          startTime: startTime.toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error("Failed to create initial 'In Progress' log:", logError);
        // Continue processing even if logging fails
      }
      
      const result = await currentPriceService.updatePortfolioCurrentPrices(regionUpper);
      
      // Calculate execution time
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      const minutes = Math.floor(executionTime / 60000);
      const seconds = Math.floor((executionTime % 60000) / 1000);
      
      // Log the success
      try {
        await schedulerService.logUpdate('current_prices', 'Success', {
          message: `Manual current price update completed - ${result.successCount}/${result.totalSymbols} symbols updated in ${regionUpper} portfolio (${minutes}m ${seconds}s)`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          executionTime: { minutes, seconds, totalMs: executionTime },
          result
        });
      } catch (logError) {
        console.error("Failed to create 'Success' log:", logError);
      }
      
      return res.status(200).json({
        message: `Updated current prices for ${result.successCount}/${result.totalSymbols} symbols in ${regionUpper} portfolio (${minutes}m ${seconds}s)`,
        successCount: result.successCount,
        totalSymbols: result.totalSymbols,
        executionTime: { minutes, seconds, totalMs: executionTime }
      });
    } catch (error) {
      console.error("Error updating current prices for portfolio:", error);
      
      // Log the error with execution time if possible
      try {
        // Make sure startTime exists in this scope
        if (typeof startTime !== 'undefined') {
          const endTime = new Date();
          const executionTime = endTime.getTime() - startTime.getTime();
          const minutes = Math.floor(executionTime / 60000);
          const seconds = Math.floor((executionTime % 60000) / 1000);
          
          const { region } = req.params;
          const regionUpper = region.toUpperCase();
          await schedulerService.logUpdate('current_prices', 'Error', {
            message: `Error updating current prices for ${regionUpper} portfolio (${minutes}m ${seconds}s): ${(error as Error).message}`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            executionTime: { minutes, seconds, totalMs: executionTime },
            error: (error as Error).message
          });
        } else {
          // If startTime is not defined, log without execution time
          const { region } = req.params;
          const regionUpper = region.toUpperCase();
          await schedulerService.logUpdate('current_prices', 'Error', {
            message: `Error updating current prices for ${regionUpper} portfolio: ${(error as Error).message}`,
            error: (error as Error).message
          });
        }
      } catch (logError) {
        console.error("Failed to create 'Error' log:", logError);
      }
      
      return res.status(500).json({
        message: "Failed to update current prices for portfolio",
        error: (error as Error).message
      });
    }
  });
  
  // Fetch and store current price for a single symbol
  app.post("/api/current-prices/fetch/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const symbolUpper = symbol.toUpperCase();
      const regionUpper = region.toUpperCase();
      
      console.log(`Fetching current price for ${symbolUpper} (${regionUpper})`);
      
      const success = await currentPriceService.fetchAndStoreCurrentPrice(symbolUpper, regionUpper);
      
      if (!success) {
        return res.status(404).json({ message: `No current price data found for ${symbolUpper}` });
      }
      
      // Get the updated price to return in the response
      const currentPrice = await storage.getCurrentPrice(symbolUpper, regionUpper);
      
      return res.status(200).json({
        message: `Successfully fetched and stored current price for ${symbolUpper} (${regionUpper})`,
        data: currentPrice
      });
    } catch (error) {
      console.error("Error fetching current price from Yahoo Finance:", error);
      return res.status(500).json({ 
        message: "Failed to fetch current price",
        error: (error as Error).message
      });
    }
  });
  
  // Fetch and store current prices for ALL portfolios (USD, CAD, INTL)
  app.post("/api/current-prices/fetch/all", async (req: Request, res: Response) => {
    try {
      console.log("Starting current price update for all portfolios");
      
      // Track start time for execution duration
      const startTime = new Date();
      
      // Create a log entry with 'In Progress' status
      let inProgressLog = null;
      try {
        inProgressLog = await schedulerService.logUpdate('current_prices', 'In Progress', {
          message: "Starting current price update for all portfolios...",
          startTime: startTime.toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error("Failed to create initial 'In Progress' log:", logError);
        // Continue processing even if logging fails
      }
      
      const results = await currentPriceService.updateAllCurrentPrices();
      
      // Log the update in the data_update_logs table
      const successCount = Object.values(results).reduce((total, region: any) => total + (region.successCount || 0), 0);
      const totalSymbols = Object.values(results).reduce((total, region: any) => total + (region.totalSymbols || 0), 0);
      
      try {
        // Calculate execution time
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();
        const minutes = Math.floor(executionTime / 60000);
        const seconds = Math.floor((executionTime % 60000) / 1000);
        
        await schedulerService.logUpdate('current_prices', 'Success', {
          message: `Manual current price update completed - ${successCount}/${totalSymbols} symbols updated (${minutes}m ${seconds}s)`,
          timestamp: new Date().toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          executionTime: { minutes, seconds, totalMs: executionTime },
          results
        });
      } catch (logError) {
        console.error("Failed to create 'Success' log:", logError);
        // Continue to return results even if logging fails
      }
      
      return res.status(200).json({
        message: "Successfully updated current prices for all portfolios",
        results
      });
    } catch (error) {
      console.error("Error updating current prices for all portfolios:", error);
      
      // Log the error in the data_update_logs table
      try {
        // Make sure startTime exists in this scope
        if (typeof startTime !== 'undefined') {
          // Calculate execution time until error
          const endTime = new Date();
          const executionTime = endTime.getTime() - startTime.getTime();
          const minutes = Math.floor(executionTime / 60000);
          const seconds = Math.floor((executionTime % 60000) / 1000);
          
          await schedulerService.logUpdate('current_prices', 'Error', {
            message: `Failed to update current prices (${minutes}m ${seconds}s)`, 
            error: error instanceof Error ? error.message : String(error),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            executionTime: { minutes, seconds, totalMs: executionTime },
            timestamp: new Date().toISOString()
          });
        } else {
          // If startTime is not defined, log without execution time
          await schedulerService.logUpdate('current_prices', 'Error', {
            message: `Failed to update current prices`, 
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
      } catch (logError) {
        console.error("Failed to create 'Error' log:", logError);
        // Continue to return error even if logging fails
      }
      
      return res.status(500).json({
        message: "Failed to update current prices for all portfolios",
        error: (error as Error).message
      });
    }
  });

  // Data Update Logs API
  app.get("/api/data-updates/logs", async (_req: Request, res: Response) => {
    try {
      const logs = await schedulerService.getLogs();
      return res.json(logs);
    } catch (error) {
      console.error("Error fetching update logs:", error);
      return res.status(500).json({ 
        message: "Failed to fetch update logs",
        error: (error as Error).message
      });
    }
  });
  
  // Clear all data update logs
  app.delete("/api/data-updates/logs", async (_req: Request, res: Response) => {
    try {
      await db.delete(dataUpdateLogs);
      return res.json({ 
        success: true, 
        message: "All logs cleared successfully" 
      });
    } catch (error) {
      console.error("Error clearing update logs:", error);
      return res.status(500).json({ 
        message: "Failed to clear update logs",
        error: (error as Error).message
      });
    }
  });

  // Upgrade/Downgrade History Routes
  // Regional endpoints (must come before stock-specific endpoints to avoid routing conflicts)
  app.get("/api/upgrade-downgrade/region/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`Fetching all upgrade/downgrade history for ${regionUpper} region`);
      
      const history = await storage.getAllUpgradeDowngradeHistory(regionUpper);
      return res.json(history);
    } catch (error) {
      console.error(`Error fetching upgrade/downgrade history for ${req.params.region} region:`, error);
      return res.status(500).json({ 
        message: "Failed to fetch regional upgrade/downgrade history",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/upgrade-downgrade/fetch/region/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`Initiating bulk fetch of upgrade/downgrade history for ${regionUpper} region`);
      
      // Respond to client immediately to prevent timeout
      res.status(202).json({ 
        message: `Started bulk import of upgrade/downgrade history for ${regionUpper} region stocks`,
        status: "processing"
      });
      
      // Import the service for fetching upgrade/downgrade history
      const { importRegionUpgradeDowngradeHistory } = await import('../scripts/import-upgrade-downgrade');
      
      // Run the import process asynchronously
      (async () => {
        try {
          const result = await importRegionUpgradeDowngradeHistory(regionUpper);
          console.log(`Completed bulk upgrade/downgrade import for ${regionUpper} region:`, result);
        } catch (error) {
          console.error(`Error in bulk upgrade/downgrade import for ${regionUpper} region:`, error);
        }
      })();
      
    } catch (error) {
      console.error(`Error initiating bulk upgrade/downgrade data import for ${req.params.region}:`, error);
      return res.status(500).json({ 
        message: "Failed to initiate bulk upgrade/downgrade data import",
        error: (error as Error).message
      });
    }
  });

  // Stock-specific endpoints
  app.get("/api/upgrade-downgrade/stock/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`Fetching upgrade/downgrade history for ${symbol} in ${regionUpper} region`);
      
      const history = await storage.getUpgradeDowngradeHistory(symbol, regionUpper);
      return res.json(history);
    } catch (error) {
      console.error(`Error fetching upgrade/downgrade history for ${req.params.symbol}:`, error);
      return res.status(500).json({ 
        message: "Failed to fetch upgrade/downgrade history",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/upgrade-downgrade/fetch/stock/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const regionUpper = region.toUpperCase();
      
      console.log(`Initiating fetch of upgrade/downgrade history for ${symbol} in ${regionUpper} region`);
      
      // Import the service for fetching upgrade/downgrade history
      const { importUpgradeDowngradeHistory } = await import('../scripts/import-upgrade-downgrade');
      
      // Run the import function
      await importUpgradeDowngradeHistory(symbol, regionUpper);
      
      // Get the updated history to return
      const history = await storage.getUpgradeDowngradeHistory(symbol, regionUpper);
      
      return res.json({
        message: `Successfully fetched upgrade/downgrade history for ${symbol} in ${regionUpper} region`,
        count: history.length,
        data: history
      });
    } catch (error) {
      console.error(`Error fetching upgrade/downgrade data for ${req.params.symbol}:`, error);
      return res.status(500).json({ 
        message: "Failed to fetch upgrade/downgrade data",
        error: (error as Error).message
      });
    }
  });

  // Scheduler Configuration API
  app.get("/api/scheduler/config", async (_req: Request, res: Response) => {
    try {
      const config = schedulerService.getConfig();
      return res.json(config);
    } catch (error) {
      console.error("Error fetching scheduler config:", error);
      return res.status(500).json({ 
        message: "Failed to fetch scheduler config",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/scheduler/config/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as 'current_prices' | 'historical_prices';
      if (type !== 'current_prices' && type !== 'historical_prices') {
        return res.status(400).json({ message: "Invalid scheduler type" });
      }
      
      const config = req.body;
      const updatedConfig = schedulerService.updateConfig(type, config);
      
      return res.json({
        message: `Successfully updated ${type} scheduler configuration`,
        config: updatedConfig
      });
    } catch (error) {
      console.error("Error updating scheduler config:", error);
      return res.status(500).json({ 
        message: "Failed to update scheduler config",
        error: (error as Error).message
      });
    }
  });
  
  // Earnings Consensus Routes
  
  // Get earnings consensus data for a specific stock
  app.get("/api/earnings-consensus/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      const consensusData = await earningsService.getEarningsConsensus(symbol, region);
      
      if (!consensusData) {
        return res.status(404).json({ message: "Earnings consensus data not found" });
      }
      
      return res.json(consensusData);
    } catch (error) {
      console.error("Error fetching earnings consensus data:", error);
      return res.status(500).json({ message: "Failed to fetch earnings consensus data" });
    }
  });
  
  // Get earnings consensus data for a specific quarter and region
  app.get("/api/earnings-consensus/quarter/:quarter/:region", async (req: Request, res: Response) => {
    try {
      const { quarter, region } = req.params;
      const consensusData = await earningsService.getEarningsConsensusByQuarter(quarter, region);
      
      return res.json(consensusData);
    } catch (error) {
      console.error("Error fetching earnings consensus data by quarter:", error);
      return res.status(500).json({ message: "Failed to fetch earnings consensus data by quarter" });
    }
  });
  
  // Get latest quarter
  app.get("/api/earnings-consensus/latest-quarter", async (_req: Request, res: Response) => {
    try {
      const latestQuarter = earningsService.getLatestQuarter();
      return res.json({ latestQuarter });
    } catch (error) {
      console.error("Error fetching latest quarter:", error);
      return res.status(500).json({ message: "Failed to fetch latest quarter" });
    }
  });
  
  // Fetch and save earnings consensus data for a specific stock
  app.post("/api/earnings-consensus/fetch/:symbol/:region", async (req: Request, res: Response) => {
    try {
      const { symbol, region } = req.params;
      
      // Log the start of the operation
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${symbol}`,
        status: 'In Progress',
        details: JSON.stringify({
          symbol,
          region,
          timestamp: new Date().toISOString()
        })
      });
      
      // Fetch the consensus data
      const consensusData = await earningsService.fetchEarningsConsensus(symbol, region);
      
      if (!consensusData) {
        await db.insert(dataUpdateLogs).values({
          type: `earnings_consensus_${symbol}`,
          status: 'Error',
          details: JSON.stringify({
            symbol,
            region,
            error: 'No data returned from Yahoo Finance',
            timestamp: new Date().toISOString()
          })
        });
        
        return res.status(404).json({ 
          message: "Failed to fetch earnings consensus data. No data returned from Yahoo Finance." 
        });
      }
      
      // Save the consensus data
      await earningsService.saveEarningsConsensus(consensusData);
      
      // Log the successful completion of the operation
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${symbol}`,
        status: 'Success',
        details: JSON.stringify({
          symbol,
          region,
          timestamp: new Date().toISOString()
        })
      });
      
      return res.json({
        message: "Successfully fetched and saved earnings consensus data",
        data: consensusData
      });
    } catch (error) {
      console.error("Error fetching and saving earnings consensus data:", error);
      
      // Log the error
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${req.params.symbol}`,
        status: 'Error',
        details: JSON.stringify({
          symbol: req.params.symbol,
          region: req.params.region,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        })
      });
      
      return res.status(500).json({ 
        message: "Failed to fetch and save earnings consensus data",
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Fetch and save earnings consensus data for all stocks in a region
  app.post("/api/earnings-consensus/fetch/region/:region", async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const validRegions = ['USD', 'CAD', 'INTL'];
      
      if (!validRegions.includes(region)) {
        return res.status(400).json({ message: "Invalid region. Must be one of USD, CAD, or INTL." });
      }
      
      // Log the start of the operation
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${region}`,
        status: 'In Progress',
        details: JSON.stringify({
          region,
          timestamp: new Date().toISOString()
        })
      });
      
      // Get all symbols for the region
      const symbols = await earningsService.getSymbolsByRegion(region);
      
      if (symbols.length === 0) {
        await db.insert(dataUpdateLogs).values({
          type: `earnings_consensus_${region}`,
          status: 'Error',
          details: JSON.stringify({
            region,
            error: 'No symbols found for the region',
            timestamp: new Date().toISOString()
          })
        });
        
        return res.status(404).json({ message: "No symbols found for the region" });
      }
      
      // Start the process in the background
      res.json({ 
        message: `Started fetching earnings consensus data for ${symbols.length} symbols in ${region} region in the background.`,
        symbolsCount: symbols.length
      });
      
      // Process each symbol
      let successCount = 0;
      let errorCount = 0;
      
      for (const symbol of symbols) {
        try {
          const consensusData = await earningsService.fetchEarningsConsensus(symbol, region);
          
          if (consensusData) {
            await earningsService.saveEarningsConsensus(consensusData);
            successCount++;
          } else {
            errorCount++;
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          errorCount++;
        }
      }
      
      // Log the completion of the operation
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${region}`,
        status: 'Success',
        details: JSON.stringify({
          region,
          totalSymbols: symbols.length,
          successCount,
          errorCount,
          timestamp: new Date().toISOString()
        })
      });
      
    } catch (error) {
      console.error("Error fetching and saving earnings consensus data for region:", error);
      
      // Log the error
      await db.insert(dataUpdateLogs).values({
        type: `earnings_consensus_${req.params.region}`,
        status: 'Error',
        details: JSON.stringify({
          region: req.params.region,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        })
      });
    }
  });

  // Initialize the scheduler service when the app starts
  // This will automatically start any scheduled tasks
  schedulerService.init().catch(error => {
    console.error("Error initializing scheduler service:", error);
  });

  const httpServer = createServer(app);
  return httpServer;
}

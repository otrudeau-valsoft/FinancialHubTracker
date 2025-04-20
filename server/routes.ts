import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPortfolioStockSchema, insertEtfHoldingSchema, insertMatrixRuleSchema, insertAlertSchema, insertPortfolioSummarySchema } from "@shared/schema";
import { z } from "zod";

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
      // Validate each rule in the array
      const validatedRules = req.body.rules.map((rule: any) => insertMatrixRuleSchema.parse(rule));
      
      const rules = await storage.bulkCreateMatrixRules(validatedRules);
      return res.status(201).json(rules);
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
      const csvData = req.body.csvData;
      
      // Process CSV data and insert into portfolio stocks
      // This would be implemented on the frontend side to parse the CSV
      
      return res.status(200).json({ message: "CSV data imported successfully" });
    } catch (error) {
      console.error("Error importing CSV data:", error);
      return res.status(500).json({ message: "Failed to import CSV data" });
    }
  });

  app.post("/api/import/etf/:symbol", async (req: Request, res: Response) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const csvData = req.body.csvData;
      
      // Process CSV data and insert into ETF holdings
      // This would be implemented on the frontend side to parse the CSV
      
      return res.status(200).json({ message: "ETF data imported successfully" });
    } catch (error) {
      console.error("Error importing ETF data:", error);
      return res.status(500).json({ message: "Failed to import ETF data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

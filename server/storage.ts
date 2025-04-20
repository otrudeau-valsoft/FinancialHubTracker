import { 
  users, type User, type InsertUser,
  portfolioStocks, type PortfolioStock, type InsertPortfolioStock,
  etfHoldings, type EtfHolding, type InsertEtfHolding,
  matrixRules, type MatrixRule, type InsertMatrixRule,
  alerts, type Alert, type InsertAlert,
  portfolioSummaries, type PortfolioSummary, type InsertPortfolioSummary,
  PortfolioRegion
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Portfolio stock methods
  getPortfolioStocks(region: string): Promise<PortfolioStock[]>;
  getPortfolioStock(id: number): Promise<PortfolioStock | undefined>;
  getPortfolioStockBySymbol(symbol: string, region: string): Promise<PortfolioStock | undefined>;
  createPortfolioStock(stock: InsertPortfolioStock): Promise<PortfolioStock>;
  updatePortfolioStock(id: number, stock: Partial<InsertPortfolioStock>): Promise<PortfolioStock | undefined>;
  deletePortfolioStock(id: number): Promise<boolean>;
  bulkCreatePortfolioStocks(stocks: InsertPortfolioStock[]): Promise<PortfolioStock[]>;

  // ETF holdings methods
  getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]>;
  getEtfHolding(id: number): Promise<EtfHolding | undefined>;
  createEtfHolding(holding: InsertEtfHolding): Promise<EtfHolding>;
  updateEtfHolding(id: number, holding: Partial<InsertEtfHolding>): Promise<EtfHolding | undefined>;
  deleteEtfHolding(id: number): Promise<boolean>;
  bulkCreateEtfHoldings(holdings: InsertEtfHolding[]): Promise<EtfHolding[]>;
  getTopEtfHoldings(etfSymbol: string, limit: number): Promise<EtfHolding[]>;

  // Matrix rules methods
  getMatrixRules(actionType: string): Promise<MatrixRule[]>;
  getMatrixRule(id: number): Promise<MatrixRule | undefined>;
  createMatrixRule(rule: InsertMatrixRule): Promise<MatrixRule>;
  updateMatrixRule(id: number, rule: Partial<InsertMatrixRule>): Promise<MatrixRule | undefined>;
  deleteMatrixRule(id: number): Promise<boolean>;
  bulkCreateMatrixRules(rules: InsertMatrixRule[]): Promise<MatrixRule[]>;

  // Alert methods
  getAlerts(activeOnly?: boolean): Promise<Alert[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  deleteAlert(id: number): Promise<boolean>;

  // Portfolio summary methods
  getPortfolioSummary(region: string): Promise<PortfolioSummary | undefined>;
  createPortfolioSummary(summary: InsertPortfolioSummary): Promise<PortfolioSummary>;
  updatePortfolioSummary(id: number, summary: Partial<InsertPortfolioSummary>): Promise<PortfolioSummary | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private portfolioStocks: Map<number, PortfolioStock>;
  private etfHoldings: Map<number, EtfHolding>;
  private matrixRules: Map<number, MatrixRule>;
  private alerts: Map<number, Alert>;
  private portfolioSummaries: Map<number, PortfolioSummary>;

  private userId: number;
  private portfolioStockId: number;
  private etfHoldingId: number;
  private matrixRuleId: number;
  private alertId: number;
  private portfolioSummaryId: number;

  constructor() {
    this.users = new Map();
    this.portfolioStocks = new Map();
    this.etfHoldings = new Map();
    this.matrixRules = new Map();
    this.alerts = new Map();
    this.portfolioSummaries = new Map();

    this.userId = 1;
    this.portfolioStockId = 1;
    this.etfHoldingId = 1;
    this.matrixRuleId = 1;
    this.alertId = 1;
    this.portfolioSummaryId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Portfolio stock methods
  async getPortfolioStocks(region: string): Promise<PortfolioStock[]> {
    return Array.from(this.portfolioStocks.values()).filter(
      (stock) => stock.region === region
    );
  }

  async getPortfolioStock(id: number): Promise<PortfolioStock | undefined> {
    return this.portfolioStocks.get(id);
  }

  async getPortfolioStockBySymbol(symbol: string, region: string): Promise<PortfolioStock | undefined> {
    return Array.from(this.portfolioStocks.values()).find(
      (stock) => stock.symbol === symbol && stock.region === region
    );
  }

  async createPortfolioStock(stock: InsertPortfolioStock): Promise<PortfolioStock> {
    const id = this.portfolioStockId++;
    const now = new Date();
    const portfolioStock: PortfolioStock = { ...stock, id, updatedAt: now };
    this.portfolioStocks.set(id, portfolioStock);
    return portfolioStock;
  }

  async updatePortfolioStock(id: number, stock: Partial<InsertPortfolioStock>): Promise<PortfolioStock | undefined> {
    const existingStock = this.portfolioStocks.get(id);
    if (!existingStock) return undefined;

    const updatedStock: PortfolioStock = {
      ...existingStock,
      ...stock,
      updatedAt: new Date(),
    };

    this.portfolioStocks.set(id, updatedStock);
    return updatedStock;
  }

  async deletePortfolioStock(id: number): Promise<boolean> {
    return this.portfolioStocks.delete(id);
  }

  async bulkCreatePortfolioStocks(stocks: InsertPortfolioStock[]): Promise<PortfolioStock[]> {
    const createdStocks: PortfolioStock[] = [];
    for (const stock of stocks) {
      createdStocks.push(await this.createPortfolioStock(stock));
    }
    return createdStocks;
  }

  // ETF holdings methods
  async getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]> {
    return Array.from(this.etfHoldings.values()).filter(
      (holding) => holding.etfSymbol === etfSymbol
    );
  }

  async getEtfHolding(id: number): Promise<EtfHolding | undefined> {
    return this.etfHoldings.get(id);
  }

  async createEtfHolding(holding: InsertEtfHolding): Promise<EtfHolding> {
    const id = this.etfHoldingId++;
    const now = new Date();
    const etfHolding: EtfHolding = { ...holding, id, updatedAt: now };
    this.etfHoldings.set(id, etfHolding);
    return etfHolding;
  }

  async updateEtfHolding(id: number, holding: Partial<InsertEtfHolding>): Promise<EtfHolding | undefined> {
    const existingHolding = this.etfHoldings.get(id);
    if (!existingHolding) return undefined;

    const updatedHolding: EtfHolding = {
      ...existingHolding,
      ...holding,
      updatedAt: new Date(),
    };

    this.etfHoldings.set(id, updatedHolding);
    return updatedHolding;
  }

  async deleteEtfHolding(id: number): Promise<boolean> {
    return this.etfHoldings.delete(id);
  }

  async bulkCreateEtfHoldings(holdings: InsertEtfHolding[]): Promise<EtfHolding[]> {
    const createdHoldings: EtfHolding[] = [];
    for (const holding of holdings) {
      createdHoldings.push(await this.createEtfHolding(holding));
    }
    return createdHoldings;
  }

  async getTopEtfHoldings(etfSymbol: string, limit: number): Promise<EtfHolding[]> {
    const holdings = await this.getEtfHoldings(etfSymbol);
    return holdings
      .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
      .slice(0, limit);
  }

  // Matrix rules methods
  async getMatrixRules(actionType: string): Promise<MatrixRule[]> {
    return Array.from(this.matrixRules.values()).filter(
      (rule) => rule.actionType === actionType
    );
  }

  async getMatrixRule(id: number): Promise<MatrixRule | undefined> {
    return this.matrixRules.get(id);
  }

  async createMatrixRule(rule: InsertMatrixRule): Promise<MatrixRule> {
    const id = this.matrixRuleId++;
    const matrixRule: MatrixRule = { ...rule, id };
    this.matrixRules.set(id, matrixRule);
    return matrixRule;
  }

  async updateMatrixRule(id: number, rule: Partial<InsertMatrixRule>): Promise<MatrixRule | undefined> {
    const existingRule = this.matrixRules.get(id);
    if (!existingRule) return undefined;

    const updatedRule: MatrixRule = {
      ...existingRule,
      ...rule,
    };

    this.matrixRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteMatrixRule(id: number): Promise<boolean> {
    return this.matrixRules.delete(id);
  }

  async bulkCreateMatrixRules(rules: InsertMatrixRule[]): Promise<MatrixRule[]> {
    const createdRules: MatrixRule[] = [];
    for (const rule of rules) {
      createdRules.push(await this.createMatrixRule(rule));
    }
    return createdRules;
  }

  // Alert methods
  async getAlerts(activeOnly: boolean = true): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values());
    return activeOnly ? alerts.filter(alert => alert.isActive) : alerts;
  }

  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.alertId++;
    const now = new Date();
    const newAlert: Alert = { ...alert, id, createdAt: now };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: number, alert: Partial<InsertAlert>): Promise<Alert | undefined> {
    const existingAlert = this.alerts.get(id);
    if (!existingAlert) return undefined;

    const updatedAlert: Alert = {
      ...existingAlert,
      ...alert,
    };

    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }

  // Portfolio summary methods
  async getPortfolioSummary(region: string): Promise<PortfolioSummary | undefined> {
    return Array.from(this.portfolioSummaries.values()).find(
      (summary) => summary.region === region
    );
  }

  async createPortfolioSummary(summary: InsertPortfolioSummary): Promise<PortfolioSummary> {
    const id = this.portfolioSummaryId++;
    const now = new Date();
    const portfolioSummary: PortfolioSummary = { ...summary, id, updatedAt: now };
    this.portfolioSummaries.set(id, portfolioSummary);
    return portfolioSummary;
  }

  async updatePortfolioSummary(id: number, summary: Partial<InsertPortfolioSummary>): Promise<PortfolioSummary | undefined> {
    const existingSummary = this.portfolioSummaries.get(id);
    if (!existingSummary) return undefined;

    const updatedSummary: PortfolioSummary = {
      ...existingSummary,
      ...summary,
      updatedAt: new Date(),
    };

    this.portfolioSummaries.set(id, updatedSummary);
    return updatedSummary;
  }
}

export const storage = new MemStorage();

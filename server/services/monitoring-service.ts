import { db } from '../db';
import { sql } from 'drizzle-orm';

interface MonitoringAlert {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
  timestamp: Date;
}

interface DataQualityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  value?: any;
}

export class MonitoringService {
  private alerts: MonitoringAlert[] = [];

  // Data Quality Checks
  async runDataQualityChecks(): Promise<DataQualityCheck[]> {
    const checks: DataQualityCheck[] = [];

    // Check 1: Price data freshness
    try {
      const staleDataCheck = await this.checkStalePriceData();
      checks.push(staleDataCheck);
    } catch (error) {
      checks.push({
        name: 'Price Data Freshness',
        status: 'fail',
        details: `Error checking price data: ${error.message}`
      });
    }

    // Check 2: Cash balance consistency
    try {
      const cashBalanceCheck = await this.checkCashBalanceConsistency();
      checks.push(cashBalanceCheck);
    } catch (error) {
      checks.push({
        name: 'Cash Balance Consistency',
        status: 'fail',
        details: `Error checking cash balances: ${error.message}`
      });
    }

    // Check 3: Portfolio value accuracy
    try {
      const portfolioValueCheck = await this.checkPortfolioValueAccuracy();
      checks.push(portfolioValueCheck);
    } catch (error) {
      checks.push({
        name: 'Portfolio Value Accuracy',
        status: 'fail',
        details: `Error checking portfolio values: ${error.message}`
      });
    }

    // Check 4: Price anomalies
    try {
      const priceAnomalyCheck = await this.checkPriceAnomalies();
      checks.push(priceAnomalyCheck);
    } catch (error) {
      checks.push({
        name: 'Price Anomaly Detection',
        status: 'fail',
        details: `Error checking price anomalies: ${error.message}`
      });
    }

    // Check 5: Data completeness
    try {
      const dataCompletenessCheck = await this.checkDataCompleteness();
      checks.push(dataCompletenessCheck);
    } catch (error) {
      checks.push({
        name: 'Data Completeness',
        status: 'fail',
        details: `Error checking data completeness: ${error.message}`
      });
    }

    return checks;
  }

  private async checkStalePriceData(): Promise<DataQualityCheck> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as stale_count,
        MIN("updatedAt") as oldest_update
      FROM current_prices_usd
      WHERE "updatedAt" < NOW() - INTERVAL '2 days'
    `);

    const staleCount = parseInt(result.rows[0].stale_count as string);
    const oldestUpdate = result.rows[0].oldest_update;

    if (staleCount > 0) {
      return {
        name: 'Price Data Freshness',
        status: 'warning',
        details: `${staleCount} stocks have prices older than 2 days`,
        value: { staleCount, oldestUpdate }
      };
    }

    return {
      name: 'Price Data Freshness',
      status: 'pass',
      details: 'All price data is up to date'
    };
  }

  private async checkCashBalanceConsistency(): Promise<DataQualityCheck> {
    const result = await db.execute(sql`
      SELECT 
        region,
        amount
      FROM cash_portfolio
      WHERE amount < 0
    `);

    if (result.rows.length > 0) {
      return {
        name: 'Cash Balance Consistency',
        status: 'fail',
        details: `Negative cash balances detected in regions: ${result.rows.map(r => r.region).join(', ')}`,
        value: result.rows
      };
    }

    return {
      name: 'Cash Balance Consistency',
      status: 'pass',
      details: 'All cash balances are valid'
    };
  }

  private async checkPortfolioValueAccuracy(): Promise<DataQualityCheck> {
    const regions = ['USD', 'CAD', 'INTL'];
    const discrepancies: any[] = [];

    for (const region of regions) {
      const tableName = region === 'USD' ? 'portfolio_usd' : 
                       region === 'CAD' ? 'portfolio_cad' : 'portfolio_intl';
      
      const result = await db.execute(sql.raw(`
        SELECT 
          symbol,
          quantity,
          "purchasePrice",
          "currentPrice",
          (quantity * "currentPrice") as calculated_value,
          ABS((quantity * "currentPrice") - (quantity * "purchasePrice")) as value_diff
        FROM ${tableName}
        WHERE "currentPrice" IS NULL OR "currentPrice" <= 0
      `));

      if (result.rows.length > 0) {
        discrepancies.push(...result.rows.map(row => ({ ...row, region })));
      }
    }

    if (discrepancies.length > 0) {
      return {
        name: 'Portfolio Value Accuracy',
        status: 'warning',
        details: `${discrepancies.length} stocks have invalid or missing current prices`,
        value: discrepancies
      };
    }

    return {
      name: 'Portfolio Value Accuracy',
      status: 'pass',
      details: 'All portfolio values are accurate'
    };
  }

  private async checkPriceAnomalies(): Promise<DataQualityCheck> {
    // Check for extreme price movements (>50% in a day)
    const result = await db.execute(sql`
      SELECT 
        symbol,
        "currentPrice",
        "previousClose",
        "dailyChangePercent"
      FROM current_prices_usd
      WHERE ABS("dailyChangePercent") > 50
    `);

    if (result.rows.length > 0) {
      return {
        name: 'Price Anomaly Detection',
        status: 'warning',
        details: `${result.rows.length} stocks show extreme price movements (>50%)`,
        value: result.rows
      };
    }

    return {
      name: 'Price Anomaly Detection',
      status: 'pass',
      details: 'No extreme price anomalies detected'
    };
  }

  private async checkDataCompleteness(): Promise<DataQualityCheck> {
    const checks = {
      missingCompanyNames: 0,
      missingStockTypes: 0,
      missingRatings: 0
    };

    // Check USD portfolio
    const usdResult = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN "companyName" IS NULL OR "companyName" = '' THEN 1 END) as missing_names,
        COUNT(CASE WHEN "stockType" IS NULL THEN 1 END) as missing_types,
        COUNT(CASE WHEN rating IS NULL OR rating = 0 THEN 1 END) as missing_ratings
      FROM portfolio_usd
    `);

    checks.missingCompanyNames += parseInt(usdResult.rows[0].missing_names as string);
    checks.missingStockTypes += parseInt(usdResult.rows[0].missing_types as string);
    checks.missingRatings += parseInt(usdResult.rows[0].missing_ratings as string);

    const totalIssues = Object.values(checks).reduce((sum, val) => sum + val, 0);

    if (totalIssues > 0) {
      return {
        name: 'Data Completeness',
        status: 'warning',
        details: `Found ${totalIssues} data completeness issues`,
        value: checks
      };
    }

    return {
      name: 'Data Completeness',
      status: 'pass',
      details: 'All required data fields are complete'
    };
  }

  // Alert Management
  addAlert(alert: Omit<MonitoringAlert, 'timestamp'>) {
    this.alerts.push({
      ...alert,
      timestamp: new Date()
    });

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  getAlerts(category?: string, since?: Date): MonitoringAlert[] {
    let filtered = this.alerts;

    if (category) {
      filtered = filtered.filter(a => a.category === category);
    }

    if (since) {
      filtered = filtered.filter(a => a.timestamp >= since);
    }

    return filtered;
  }

  clearAlerts() {
    this.alerts = [];
  }

  // Performance Monitoring
  async getSystemMetrics() {
    const metrics = {
      timestamp: new Date(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      databaseStats: await this.getDatabaseStats()
    };

    return metrics;
  }

  private async getDatabaseStats() {
    try {
      const result = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM portfolio_usd) as usd_stocks,
          (SELECT COUNT(*) FROM portfolio_cad) as cad_stocks,
          (SELECT COUNT(*) FROM portfolio_intl) as intl_stocks,
          (SELECT COUNT(*) FROM historical_prices_usd) as historical_prices_count,
          (SELECT COUNT(*) FROM current_prices_usd) as current_prices_count
      `);

      return result.rows[0];
    } catch (error) {
      return { error: error.message };
    }
  }
}

export const monitoringService = new MonitoringService();
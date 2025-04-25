import { db } from '../db';
import { etfHoldingsSPY, etfHoldingsXIC, etfHoldingsACWX, assetsUS, assetsCAD, assetsINTL } from '../../shared/schema';

/**
 * Populate ETF holdings data
 */
async function populateETFHoldings() {
  console.log('Populating SPY ETF holdings...');
  
  // Clear existing data
  await db.delete(etfHoldingsSPY);
  
  // Insert sample holdings for SPY
  const spyHoldings = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc',
      sector: 'Information Technology',
      assetClass: 'Equity',
      marketValue: 500000000,
      weight: 7.2,
      price: 175.25,
      quantity: 2853637,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      sector: 'Information Technology',
      assetClass: 'Equity',
      marketValue: 450000000,
      weight: 6.5,
      price: 415.33,
      quantity: 1083716,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'AMZN',
      name: 'Amazon.com Inc',
      sector: 'Consumer Discretionary',
      assetClass: 'Equity',
      marketValue: 350000000,
      weight: 5.1,
      price: 180.75,
      quantity: 1935825,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corp',
      sector: 'Information Technology',
      assetClass: 'Equity',
      marketValue: 320000000,
      weight: 4.6,
      price: 950.02,
      quantity: 336832,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc Class A',
      sector: 'Communication Services',
      assetClass: 'Equity',
      marketValue: 280000000,
      weight: 4.0,
      price: 172.63,
      quantity: 1622021,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'META',
      name: 'Meta Platforms Inc',
      sector: 'Communication Services',
      assetClass: 'Equity',
      marketValue: 240000000,
      weight: 3.5,
      price: 485.58,
      quantity: 494275,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'BRK.B',
      name: 'Berkshire Hathaway Inc Class B',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 200000000,
      weight: 2.9,
      price: 435.22,
      quantity: 459541,
      location: 'US',
      exchange: 'NYSE',
      currency: 'USD'
    },
    {
      ticker: 'TSLA',
      name: 'Tesla Inc',
      sector: 'Consumer Discretionary',
      assetClass: 'Equity',
      marketValue: 180000000,
      weight: 2.6,
      price: 175.76,
      quantity: 1024122,
      location: 'US',
      exchange: 'NASDAQ',
      currency: 'USD'
    },
    {
      ticker: 'UNH',
      name: 'UnitedHealth Group Inc',
      sector: 'Health Care',
      assetClass: 'Equity',
      marketValue: 170000000,
      weight: 2.5,
      price: 525.33,
      quantity: 323607,
      location: 'US',
      exchange: 'NYSE',
      currency: 'USD'
    },
    {
      ticker: 'JPM',
      name: 'JPMorgan Chase & Co',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 160000000,
      weight: 2.3,
      price: 198.44,
      quantity: 806490,
      location: 'US',
      exchange: 'NYSE',
      currency: 'USD'
    }
  ];
  
  // Insert SPY holdings
  for (const holding of spyHoldings) {
    await db.insert(etfHoldingsSPY).values({
      ...holding,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${spyHoldings.length} SPY holdings`);
  
  // Clear existing XIC holdings
  await db.delete(etfHoldingsXIC);
  
  // Insert sample holdings for XIC
  const xicHoldings = [
    {
      ticker: 'RY.TO',
      name: 'Royal Bank of Canada',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 300000000,
      weight: 6.2,
      price: 140.87,
      quantity: 2129765,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'TD.TO',
      name: 'Toronto-Dominion Bank',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 250000000,
      weight: 5.2,
      price: 80.14,
      quantity: 3120039,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'ENB.TO',
      name: 'Enbridge Inc',
      sector: 'Energy',
      assetClass: 'Equity',
      marketValue: 180000000,
      weight: 3.7,
      price: 49.35,
      quantity: 3647821,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'CNR.TO',
      name: 'Canadian National Railway Co',
      sector: 'Industrials',
      assetClass: 'Equity',
      marketValue: 170000000,
      weight: 3.5,
      price: 175.25,
      quantity: 970044,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'BMO.TO',
      name: 'Bank of Montreal',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 150000000,
      weight: 3.1,
      price: 128.98,
      quantity: 1163044,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'CP.TO',
      name: 'Canadian Pacific Kansas City Ltd',
      sector: 'Industrials',
      assetClass: 'Equity',
      marketValue: 140000000,
      weight: 2.9,
      price: 107.45,
      quantity: 1303398,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'BNS.TO',
      name: 'Bank of Nova Scotia',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 130000000,
      weight: 2.7,
      price: 64.32,
      quantity: 2021771,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'SU.TO',
      name: 'Suncor Energy Inc',
      sector: 'Energy',
      assetClass: 'Equity',
      marketValue: 120000000,
      weight: 2.5,
      price: 52.74,
      quantity: 2275503,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'CM.TO',
      name: 'Canadian Imperial Bank of Commerce',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 110000000,
      weight: 2.3,
      price: 60.12,
      quantity: 1829674,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    },
    {
      ticker: 'BCE.TO',
      name: 'BCE Inc',
      sector: 'Communication Services',
      assetClass: 'Equity',
      marketValue: 100000000,
      weight: 2.1,
      price: 45.25,
      quantity: 2209945,
      location: 'Canada',
      exchange: 'TSX',
      currency: 'CAD'
    }
  ];
  
  // Insert XIC holdings
  for (const holding of xicHoldings) {
    await db.insert(etfHoldingsXIC).values({
      ...holding,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${xicHoldings.length} XIC holdings`);
  
  // Clear existing ACWX holdings
  await db.delete(etfHoldingsACWX);
  
  // Insert sample holdings for ACWX
  const acwxHoldings = [
    {
      ticker: 'NESN',
      name: 'Nestle SA',
      sector: 'Consumer Staples',
      assetClass: 'Equity',
      marketValue: 200000000,
      weight: 2.8,
      price: 95.18,
      quantity: 2100254,
      location: 'Switzerland',
      exchange: 'SIX',
      currency: 'CHF'
    },
    {
      ticker: 'ASML',
      name: 'ASML Holding NV',
      sector: 'Information Technology',
      assetClass: 'Equity',
      marketValue: 180000000,
      weight: 2.5,
      price: 675.50,
      quantity: 266468,
      location: 'Netherlands',
      exchange: 'Euronext',
      currency: 'EUR'
    },
    {
      ticker: 'LVMH',
      name: 'LVMH Moet Hennessy Louis Vuitton SE',
      sector: 'Consumer Discretionary',
      assetClass: 'Equity',
      marketValue: 170000000,
      weight: 2.4,
      price: 798.00,
      quantity: 212906,
      location: 'France',
      exchange: 'Euronext',
      currency: 'EUR'
    },
    {
      ticker: 'SHEL',
      name: 'Shell PLC',
      sector: 'Energy',
      assetClass: 'Equity',
      marketValue: 160000000,
      weight: 2.2,
      price: 29.26,
      quantity: 5468557,
      location: 'United Kingdom',
      exchange: 'LSE',
      currency: 'GBP'
    },
    {
      ticker: 'NOVN',
      name: 'Novartis AG',
      sector: 'Health Care',
      assetClass: 'Equity',
      marketValue: 150000000,
      weight: 2.1,
      price: 93.56,
      quantity: 1603248,
      location: 'Switzerland',
      exchange: 'SIX',
      currency: 'CHF'
    },
    {
      ticker: '1398.HK',
      name: 'Industrial and Commercial Bank of China Ltd',
      sector: 'Financials',
      assetClass: 'Equity',
      marketValue: 140000000,
      weight: 2.0,
      price: 4.22,
      quantity: 33175355,
      location: 'China',
      exchange: 'HKEX',
      currency: 'HKD'
    },
    {
      ticker: 'SAP',
      name: 'SAP SE',
      sector: 'Information Technology',
      assetClass: 'Equity',
      marketValue: 130000000,
      weight: 1.8,
      price: 175.12,
      quantity: 742347,
      location: 'Germany',
      exchange: 'XETRA',
      currency: 'EUR'
    },
    {
      ticker: 'AZN',
      name: 'AstraZeneca PLC',
      sector: 'Health Care',
      assetClass: 'Equity',
      marketValue: 125000000,
      weight: 1.7,
      price: 122.24,
      quantity: 1022579,
      location: 'United Kingdom',
      exchange: 'LSE',
      currency: 'GBP'
    },
    {
      ticker: '7203.T',
      name: 'Toyota Motor Corp',
      sector: 'Consumer Discretionary',
      assetClass: 'Equity',
      marketValue: 120000000,
      weight: 1.7,
      price: 2675.00,
      quantity: 44859,
      location: 'Japan',
      exchange: 'TSE',
      currency: 'JPY'
    },
    {
      ticker: 'ROG',
      name: 'Roche Holding AG',
      sector: 'Health Care',
      assetClass: 'Equity',
      marketValue: 115000000,
      weight: 1.6,
      price: 254.40,
      quantity: 452043,
      location: 'Switzerland',
      exchange: 'SIX',
      currency: 'CHF'
    }
  ];
  
  // Insert ACWX holdings
  for (const holding of acwxHoldings) {
    await db.insert(etfHoldingsACWX).values({
      ...holding,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${acwxHoldings.length} ACWX holdings`);
}

/**
 * Populate portfolio data
 */
async function populatePortfolios() {
  console.log('Populating portfolio data...');
  
  // Clear existing data
  await db.delete(assetsUS);
  await db.delete(assetsCAD);
  await db.delete(assetsINTL);
  
  // Insert USD portfolio stocks
  const usStocks = [
    {
      symbol: 'AAPL',
      company: 'Apple Inc',
      sector: 'Information Technology',
      quantity: 50,
      pbr: 150.75,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-28'
    },
    {
      symbol: 'MSFT',
      company: 'Microsoft Corp',
      sector: 'Information Technology',
      quantity: 25,
      pbr: 350.25,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-23'
    },
    {
      symbol: 'AMZN',
      company: 'Amazon.com Inc',
      sector: 'Consumer Discretionary',
      quantity: 40,
      pbr: 175.35,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-08-01'
    },
    {
      symbol: 'NVDA',
      company: 'NVIDIA Corp',
      sector: 'Information Technology',
      quantity: 15,
      pbr: 930.15,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-08-21'
    },
    {
      symbol: 'GOOGL',
      company: 'Alphabet Inc Class A',
      sector: 'Communication Services',
      quantity: 30,
      pbr: 170.50,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-30'
    },
    {
      symbol: 'META',
      company: 'Meta Platforms Inc',
      sector: 'Communication Services',
      quantity: 20,
      pbr: 475.30,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-24'
    },
    {
      symbol: 'CRM',
      company: 'Salesforce Inc',
      sector: 'Information Technology',
      quantity: 35,
      pbr: 280.45,
      stockRating: '2',
      stockType: 'Cat',
      nextEarningsDate: '2025-08-28'
    },
    {
      symbol: 'JPM',
      company: 'JPMorgan Chase & Co',
      sector: 'Financials',
      quantity: 45,
      pbr: 195.20,
      stockRating: '3',
      stockType: 'Cycl',
      nextEarningsDate: '2025-07-12'
    },
    {
      symbol: 'PG',
      company: 'Procter & Gamble Co',
      sector: 'Consumer Staples',
      quantity: 25,
      pbr: 165.80,
      stockRating: '2',
      stockType: 'Cat',
      nextEarningsDate: '2025-07-31'
    },
    {
      symbol: 'V',
      company: 'Visa Inc',
      sector: 'Financials',
      quantity: 30,
      pbr: 275.15,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-22'
    }
  ];
  
  // Insert US stocks
  for (const stock of usStocks) {
    await db.insert(assetsUS).values({
      ...stock,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${usStocks.length} USD portfolio stocks`);
  
  // Insert CAD portfolio stocks
  const cadStocks = [
    {
      symbol: 'RY.TO',
      company: 'Royal Bank of Canada',
      sector: 'Financials',
      quantity: 100,
      pbr: 138.75,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-08-26'
    },
    {
      symbol: 'TD.TO',
      company: 'Toronto-Dominion Bank',
      sector: 'Financials',
      quantity: 120,
      pbr: 81.35,
      stockRating: '2',
      stockType: 'Cycl',
      nextEarningsDate: '2025-08-29'
    },
    {
      symbol: 'ENB.TO',
      company: 'Enbridge Inc',
      sector: 'Energy',
      quantity: 150,
      pbr: 48.75,
      stockRating: '2',
      stockType: 'Cat',
      nextEarningsDate: '2025-08-02'
    },
    {
      symbol: 'CNR.TO',
      company: 'Canadian National Railway Co',
      sector: 'Industrials',
      quantity: 80,
      pbr: 174.25,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-21'
    },
    {
      symbol: 'SU.TO',
      company: 'Suncor Energy Inc',
      sector: 'Energy',
      quantity: 200,
      pbr: 52.15,
      stockRating: '3',
      stockType: 'Cycl',
      nextEarningsDate: '2025-08-05'
    },
    {
      symbol: 'BMO.TO',
      company: 'Bank of Montreal',
      sector: 'Financials',
      quantity: 90,
      pbr: 127.50,
      stockRating: '2',
      stockType: 'Cycl',
      nextEarningsDate: '2025-08-27'
    },
    {
      symbol: 'CP.TO',
      company: 'Canadian Pacific Kansas City Ltd',
      sector: 'Industrials',
      quantity: 110,
      pbr: 106.75,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-26'
    },
    {
      symbol: 'BCE.TO',
      company: 'BCE Inc',
      sector: 'Communication Services',
      quantity: 130,
      pbr: 44.85,
      stockRating: '2',
      stockType: 'Cat',
      nextEarningsDate: '2025-08-01'
    },
    {
      symbol: 'ATD.TO',
      company: 'Alimentation Couche-Tard Inc',
      sector: 'Consumer Staples',
      quantity: 120,
      pbr: 80.25,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-09-04'
    },
    {
      symbol: 'QSR.TO',
      company: 'Restaurant Brands International Inc',
      sector: 'Consumer Discretionary',
      quantity: 100,
      pbr: 102.15,
      stockRating: '3',
      stockType: 'Cat',
      nextEarningsDate: '2025-08-08'
    }
  ];
  
  // Insert CAD stocks
  for (const stock of cadStocks) {
    await db.insert(assetsCAD).values({
      ...stock,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${cadStocks.length} CAD portfolio stocks`);
  
  // Insert INTL portfolio stocks
  const intlStocks = [
    {
      symbol: 'ASML',
      company: 'ASML Holding NV',
      sector: 'Information Technology',
      quantity: 20,
      pbr: 650.25,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-17'
    },
    {
      symbol: 'LVMH',
      company: 'LVMH Moet Hennessy Louis Vuitton SE',
      sector: 'Consumer Discretionary',
      quantity: 15,
      pbr: 785.50,
      stockRating: '3',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-25'
    },
    {
      symbol: 'NOVN',
      company: 'Novartis AG',
      sector: 'Health Care',
      quantity: 40,
      pbr: 92.75,
      stockRating: '2',
      stockType: 'Cat',
      nextEarningsDate: '2025-07-18'
    },
    {
      symbol: 'SAP',
      company: 'SAP SE',
      sector: 'Information Technology',
      quantity: 25,
      pbr: 172.35,
      stockRating: '4',
      stockType: 'Comp',
      nextEarningsDate: '2025-07-23'
    },
    {
      symbol: 'AZN',
      company: 'AstraZeneca PLC',
      sector: 'Health Care',
      quantity: 35,
      pbr: 120.50,
      stockRating: '3',
      stockType: 'Cat',
      nextEarningsDate: '2025-07-27'
    },
    {
      symbol: 'TTE',
      company: 'TotalEnergies SE',
      sector: 'Energy',
      quantity: 45,
      pbr: 60.25,
      stockRating: '2',
      stockType: 'Cycl',
      nextEarningsDate: '2025-07-31'
    },
    {
      symbol: 'SAN',
      company: 'Banco Santander SA',
      sector: 'Financials',
      quantity: 200,
      pbr: 4.15,
      stockRating: '2',
      stockType: 'Cycl',
      nextEarningsDate: '2025-07-24'
    },
    {
      symbol: 'SHEL',
      company: 'Shell PLC',
      sector: 'Energy',
      quantity: 70,
      pbr: 28.75,
      stockRating: '3',
      stockType: 'Cycl',
      nextEarningsDate: '2025-08-01'
    },
    {
      symbol: 'SONY',
      company: 'Sony Group Corp',
      sector: 'Consumer Discretionary',
      quantity: 30,
      pbr: 85.40,
      stockRating: '3',
      stockType: 'Cat',
      nextEarningsDate: '2025-08-04'
    },
    {
      symbol: 'HSBC',
      company: 'HSBC Holdings PLC',
      sector: 'Financials',
      quantity: 150,
      pbr: 45.25,
      stockRating: '2',
      stockType: 'Cycl',
      nextEarningsDate: '2025-08-05'
    }
  ];
  
  // Insert INTL stocks
  for (const stock of intlStocks) {
    await db.insert(assetsINTL).values({
      ...stock,
      updatedAt: new Date()
    });
  }
  console.log(`Inserted ${intlStocks.length} INTL portfolio stocks`);
}

/**
 * Execute all data population functions
 */
async function main() {
  try {
    console.log('Starting data population...');
    await populateETFHoldings();
    await populatePortfolios();
    console.log('Data population completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error populating data:', error);
    return { success: false, error };
  }
}

export { main as populateData };
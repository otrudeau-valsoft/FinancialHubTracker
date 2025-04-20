import Papa from 'papaparse';

/**
 * Parse and clean a CSV string to JSON objects
 * @param csvString Raw CSV string
 * @param headerRowIndex Index of the row that contains headers (defaults to 0)
 * @returns Array of JSON objects
 */
export const parseCSV = (csvString: string, headerRowIndex = 0) => {
  try {
    const result = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => {
        // Convert headers to camelCase
        return header
          .trim()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
      }
    });

    // Clean the data
    const cleanedData = result.data.map((row: any) => {
      const cleanedRow: any = {};
      
      for (const [key, value] of Object.entries(row)) {
        // Convert strings that are actually numbers
        if (typeof value === 'string' && value.trim().match(/^-?\d+(\.\d+)?%?$/)) {
          const numStr = value.trim().replace('%', '');
          cleanedRow[key] = parseFloat(numStr);
        } else if (typeof value === 'string' && value.includes('$')) {
          // Handle currency strings
          cleanedRow[key] = parseFloat(value.replace(/[\$,]/g, ''));
        } else {
          cleanedRow[key] = value;
        }
      }
      
      return cleanedRow;
    });

    return {
      data: cleanedData,
      errors: result.errors,
      meta: result.meta
    };
  } catch (error) {
    console.error('CSV Parsing Error:', error);
    return {
      data: [],
      errors: [{ message: 'Failed to parse CSV data', type: 'Parse', code: 'Error', row: 0 }],
      meta: {}
    };
  }
};

/**
 * Convert ACWX ETF Holdings CSV to a standardized format
 * @param data Parsed CSV data
 * @returns Standardized ETF holdings array
 */
export const convertAcwxHoldings = (data: any[]) => {
  if (!data || !data.length) return [];
  
  return data.map(row => ({
    etfSymbol: 'ACWX',
    ticker: row.ticker || '',
    name: row.name || '',
    sector: row.sector || '',
    assetClass: row.assetClass || 'Equity',
    marketValue: parseFloat((row.marketValue || '0').toString().replace(/[\$,]/g, '')),
    weight: parseFloat((row.weight || '0').toString().replace(/[%,]/g, '')),
    notionalValue: parseFloat((row.notionalValue || '0').toString().replace(/[\$,]/g, '')),
    quantity: parseFloat((row.quantity || '0').toString().replace(/[,]/g, '')),
    price: parseFloat((row.price || '0').toString().replace(/[\$,]/g, '')),
    location: row.location || '',
    exchange: row.exchange || '',
    currency: row.currency || '',
    fxRate: parseFloat((row.fxRate || '1').toString()),
    marketCurrency: row.marketCurrency || ''
  }));
};

/**
 * Convert XIC ETF Holdings CSV to a standardized format
 * @param data Parsed CSV data
 * @returns Standardized ETF holdings array
 */
export const convertXicHoldings = (data: any[]) => {
  if (!data || !data.length) return [];
  
  return data.map(row => ({
    etfSymbol: 'XIC',
    ticker: row.ticker || '',
    name: row.name || '',
    sector: row.sector || '',
    assetClass: row.assetClass || 'Equity',
    marketValue: parseFloat((row.marketValue || '0').toString().replace(/[\$,]/g, '')),
    weight: parseFloat((row.weight || '0').toString().replace(/[%,]/g, '')),
    notionalValue: parseFloat((row.notionalValue || '0').toString().replace(/[\$,]/g, '')),
    quantity: parseFloat((row.shares || '0').toString().replace(/[,]/g, '')),
    price: parseFloat((row.price || '0').toString().replace(/[\$,]/g, '')),
    location: row.location || '',
    exchange: row.exchange || '',
    currency: row.currency || '',
    fxRate: parseFloat((row.fxRate || '1').toString()),
    marketCurrency: row.marketCurrency || ''
  }));
};

/**
 * Convert portfolio CSV (USD, CAD, INTL) to a standardized format
 * @param data Parsed CSV data
 * @param region Portfolio region (USD, CAD, INTL)
 * @returns Standardized portfolio stocks array
 */
export const convertPortfolioData = (data: any[], region: 'USD' | 'CAD' | 'INTL') => {
  if (!data || !data.length) return [];
  
  return data.map(row => ({
    region,
    symbol: row.sym || '',
    company: row.company || '',
    sector: row.sector || '',
    stockType: row.stockType || 'Comp',
    rating: row.stockRating || '2',
    price: parseFloat((row.price || '0').toString().replace(/[\$,]/g, '')),
    quantity: parseFloat((row.qty || '0').toString().replace(/[,]/g, '')),
    nav: parseFloat((row.nav || '0').toString().replace(/[\$,]/g, '')),
    portfolioWeight: parseFloat((row.ptf || '0').toString().replace(/[%,]/g, '')),
    dailyChange: parseFloat((row.daily || '0').toString().replace(/[%,]/g, '')),
    mtdChange: parseFloat((row.mtd || '0').toString().replace(/[%,]/g, '')),
    ytdChange: parseFloat((row.ytd || '0').toString().replace(/[%,]/g, '')),
    sixMonthChange: parseFloat((row['6m'] || '0').toString().replace(/[%,]/g, '')),
    fiftyTwoWeekChange: parseFloat((row['52wks'] || '0').toString().replace(/[%,]/g, '')),
    dividendYield: parseFloat((row.divvy || '0').toString().replace(/[%,]/g, '')),
    profitLoss: parseFloat((row.pl || '0').toString().replace(/[\$,]/g, '')),
    nextEarningsDate: row.nextEarnings || ''
  }));
};

/**
 * Convert matrix decision rules CSV to standardized format
 * @param data Parsed CSV data
 * @returns Standardized matrix rules array
 */
export const convertMatrixRulesData = (data: any[]) => {
  if (!data || !data.length) return [];
  
  const rules: any[] = [];
  let currentActionType = '';
  let currentRuleType = '';
  
  // Process the decision matrices
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Check for section headers to identify action type
    if (row && row.hasOwnProperty('') && row[''].includes('Increase position')) {
      currentActionType = 'Increase';
      continue;
    } else if (row && row.hasOwnProperty('') && row[''].includes('Decrease position')) {
      currentActionType = 'Decrease';
      continue;
    }
    
    // Get rule type from first column
    if (row && row.hasOwnProperty('Ordre # / Type d\'action')) {
      currentRuleType = row['Ordre # / Type d\'action'];
    }
    
    // Skip empty rows or headers
    if (!currentRuleType || !currentActionType || !row.Compounder) {
      continue;
    }
    
    // Process rules by order number
    if (row && row.hasOwnProperty('Ordre #')) {
      const orderNumber = parseInt(row['Ordre #']);
      
      if (!isNaN(orderNumber)) {
        rules.push({
          ruleType: currentRuleType,
          actionType: currentActionType,
          orderNumber,
          stockTypeValue: {
            Comp: row.Compounder || '',
            Cat: row.Catalyst || '',
            Cycl: row.Cyclical || ''
          }
        });
      }
    }
  }
  
  return rules;
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'papaparse';

// Convert paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV file and return the data
 * @param filePath Path to CSV file relative to project root
 */
export function parseCSV<T = any>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      return reject(new Error(`File not found: ${fullPath}`));
    }
    
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    
    parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Clean string value, handling null and undefined
 */
export function cleanValue(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value.trim();
}

/**
 * Parse number from string, handling null and undefined
 */
export function parseNumber(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  // Remove any non-numeric characters except dot and negative sign
  const cleanedValue = value.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanedValue);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get current date in Eastern Standard Time (EST)
 */
export function getCurrentESTDate(): Date {
  const date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Get Eastern Standard Time (EST) formatted datetime
 */
export function getESTFormattedTime(): string {
  return new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert portfolio data from CSV format to database format
 */
export function convertPortfolioData(data: any, region: string): any {
  return {
    symbol: cleanValue(data.Symbol) || '',
    name: cleanValue(data.Name) || '',
    region,
    sector: cleanValue(data.Sector),
    industry: cleanValue(data.Industry),
    rating: parseNumber(data.Rating),
    classificationLevel1: cleanValue(data.ClassificationLevel1),
    classificationLevel2: cleanValue(data.ClassificationLevel2),
    position: parseNumber(data.Position),
    targetPrice: parseNumber(data.TargetPrice),
    stopLoss: parseNumber(data.StopLoss),
    entryPrice: parseNumber(data.EntryPrice),
    entryDate: cleanValue(data.EntryDate),
    notes: cleanValue(data.Notes)
  };
}

/**
 * Sanitize values for database insertion
 * Converts undefined to null to avoid database errors
 */
export function sanitizeForDb<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value === undefined ? null : value;
  }
  
  return result as T;
}
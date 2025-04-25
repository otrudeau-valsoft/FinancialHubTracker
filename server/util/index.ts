/**
 * Sleep for a specified number of milliseconds
 * Useful for rate limiting API requests
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current date/time in EST timezone
 * @returns Date object in EST timezone
 */
export function getCurrentESTDate(): Date {
  const date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Get formatted time string in EST timezone
 * @returns Formatted time string in EST timezone
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
 * Parse CSV data using papaparse
 * @param csvData CSV string to parse
 * @returns Parsed CSV data as an array of objects
 */
export async function parseCSV(csvData: string): Promise<any[]> {
  const Papa = await import('papaparse');
  const result = Papa.default.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });
  return result.data;
}

/**
 * Check if a value is undefined or null
 * @param value Value to check
 * @returns True if value is undefined or null
 */
export function isNil(value: any): boolean {
  return value === undefined || value === null;
}

/**
 * Format a number as a percentage
 * @param value Number to format
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as currency
 * @param value Number to format
 * @param currency Currency code (USD, CAD, etc.)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value);
}

/**
 * Convert a date to EST timezone
 * @param date Date to convert
 * @returns Date in EST timezone
 */
export function toESTTime(date: Date = new Date()): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Check if date is a weekend
 * @param date Date to check
 * @returns True if date is a weekend
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if current time is within market hours (9:30am - 4:00pm EST, weekdays)
 * @param date Date to check
 * @returns True if within market hours
 */
export function isWithinMarketHours(date: Date = new Date()): boolean {
  const estDate = toESTTime(date);
  
  // Check if weekend
  if (isWeekend(estDate)) {
    return false;
  }
  
  const hours = estDate.getHours();
  const minutes = estDate.getMinutes();
  
  // Convert to total minutes since midnight
  const totalMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30am (570 minutes) to 4:00pm (960 minutes)
  return totalMinutes >= 570 && totalMinutes <= 960;
}
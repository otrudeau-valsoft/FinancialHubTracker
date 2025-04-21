/**
 * Format a date to YYYY-MM-DD format for SQL
 */
export function dateToSQLDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date falls on a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get the next business day (skip weekends)
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  
  // If it's a weekend, add days until we get to Monday
  if (isWeekend(result)) {
    const daysUntilMonday = result.getDay() === 0 ? 1 : 2;
    result.setDate(result.getDate() + daysUntilMonday);
  }
  
  return result;
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time to a human-readable string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get the start of the day
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Parse a date string to a Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if a time is within market hours
 * Note: The time parameter should already be in EST timezone
 */
export function isWithinMarketHours(time: Date, startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const marketStart = new Date(time);
  marketStart.setHours(startHour, startMinute, 0, 0);
  
  const marketEnd = new Date(time);
  marketEnd.setHours(endHour, endMinute, 0, 0);
  
  return time >= marketStart && time <= marketEnd;
}

/**
 * Get the day name for a date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Convert a date to EST timezone
 */
export function toESTTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}
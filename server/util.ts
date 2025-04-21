/**
 * Format a date to YYYY-MM-DD format for SQL
 */
export function dateToSQLDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // If it's a weekend, skip to Monday
  if (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + (nextDay.getDay() === 0 ? 1 : 2));
  }
  
  return nextDay;
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date with time to a human-readable string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
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
 */
export function isWithinMarketHours(time: Date, startTime: string, endTime: string): boolean {
  // Convert the time strings to hours and minutes
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Create Date objects for start and end times on the same day as the input time
  const marketStartTime = new Date(time);
  marketStartTime.setHours(startHour, startMinute, 0, 0);
  
  const marketEndTime = new Date(time);
  marketEndTime.setHours(endHour, endMinute, 0, 0);
  
  // Check if the time is within market hours
  return time >= marketStartTime && time <= marketEndTime;
}

/**
 * Get the day name for a date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}
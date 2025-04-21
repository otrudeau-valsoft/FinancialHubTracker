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
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

/**
 * Get the next business day (skip weekends)
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  
  // If it's a weekend, skip to Monday
  if (result.getDay() === 0) { // Sunday
    result.setDate(result.getDate() + 1);
  } else if (result.getDay() === 6) { // Saturday
    result.setDate(result.getDate() + 2);
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
    hour: '2-digit',
    minute: '2-digit'
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
  // Try to parse as ISO string first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try to parse as SQL date string (YYYY-MM-DD)
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  throw new Error(`Invalid date string: ${dateString}`);
}

/**
 * Check if a time is within market hours
 */
export function isWithinMarketHours(time: Date, startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const hour = time.getHours();
  const minute = time.getMinutes();
  
  const timeValue = hour * 60 + minute;
  const startTimeValue = startHour * 60 + startMinute;
  const endTimeValue = endHour * 60 + endMinute;
  
  return timeValue >= startTimeValue && timeValue <= endTimeValue;
}

/**
 * Get the day name for a date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}
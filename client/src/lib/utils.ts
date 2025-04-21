import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | undefined, format: string = "PPp"): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Format: MM/DD/YY
  if (format === "MM/DD/YY") {
    return `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(2)}`;
  }
  
  // Format: MM/DD/YYYY
  if (format === "MM/DD/YYYY") {
    return `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`;
  }
  
  // Format: YYYY-MM-DD
  if (format === "YYYY-MM-DD") {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  }
  
  return dateObj.toLocaleDateString();
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

export function calculatePercentChange(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return 0;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

export function getStockTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'comp':
    case 'compounder':
      return '#0A7AFF'; // Blue
    case 'cat':
    case 'catalyst':
      return '#FFC107'; // Yellow/Gold
    case 'cycl':
    case 'cyclical':
      return '#9C27B0'; // Purple
    default:
      return '#9AA0A6'; // Gray
  }
}

export function getStockTypeBackground(type: string): string {
  switch (type.toLowerCase()) {
    case 'comp':
    case 'compounder':
      return 'bg-[#0A7AFF] text-white';
    case 'cat':
    case 'catalyst':
      return 'bg-[#FFC107] text-black';
    case 'cycl':
    case 'cyclical':
      return 'bg-[#9C27B0] text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}

export function getRatingClass(rating: string | number): string {
  const ratingNum = typeof rating === "string" ? parseInt(rating) : rating;
  
  switch (ratingNum) {
    case 1:
      return 'rating-1';
    case 2:
      return 'rating-2';
    case 3:
      return 'rating-3';
    case 4:
      return 'rating-4';
    default:
      return '';
  }
}

export function getAlertSeverityClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-danger-400 bg-opacity-10 text-danger';
    case 'warning':
      return 'bg-[#FFC107] bg-opacity-10 text-[#FFC107]';
    case 'info':
      return 'bg-secondary bg-opacity-10 text-secondary';
    default:
      return 'bg-gray-800 bg-opacity-30 text-gray-400';
  }
}

export function isDateInFuture(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // Handle date formats like "MM/DD/YY"
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1; // JS months are 0-based
    const day = parseInt(parts[1]);
    let year = parseInt(parts[2]);
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
    
    const date = new Date(year, month, day);
    return date > new Date();
  }
  
  return false;
}

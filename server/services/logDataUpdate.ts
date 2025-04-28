import { db } from '../db';
import { dataUpdateLogs } from '../../shared/schema';

/**
 * Logs an update to the database
 * 
 * @param type The type of update (e.g., 'earnings', 'current_prices', etc.)
 * @param status The status of the update ('Success', 'Error', 'In Progress')
 * @param region The region being updated (e.g., 'USD', 'CAD', 'INTL', or 'All portfolios')
 * @param message The message to log
 * @returns The created log entry
 */
export async function logDataUpdate(
  type: string, 
  status: 'Success' | 'Error' | 'In Progress', 
  region: string, 
  message: string
) {
  try {
    const details = JSON.stringify({ region, message });
    
    const [result] = await db.insert(dataUpdateLogs).values({
      type,
      status,
      details
    }).returning();
    
    return result;
  } catch (error) {
    console.error('Error logging data update:', error);
    // Return a minimal log object to prevent failures in calling code
    return {
      id: -1,
      type,
      status,
      details: JSON.stringify({ region, message, error: 'Failed to log' }),
      timestamp: new Date()
    };
  }
}
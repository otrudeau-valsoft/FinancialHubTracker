import { db } from "../db";
import { dataUpdateLogs, insertDataUpdateLogSchema } from "@shared/schema";

/**
 * Log a data update operation to the database
 * @param type Type of data update (e.g., 'current_prices', 'historical_prices')
 * @param status Status of the update ('Success', 'Error', 'In Progress')
 * @param details Additional details about the update
 */
export async function logDataUpdate(
  type: string,
  status: 'Success' | 'Error' | 'In Progress',
  region: string,
  details: string
): Promise<void> {
  try {
    const logData = {
      type: region !== 'ALL' ? `${type}_${region}` : type,
      status,
      details
    };
    
    await db.insert(dataUpdateLogs).values(logData);
  } catch (error) {
    console.error(`Error logging data update: ${error.message}`);
  }
}
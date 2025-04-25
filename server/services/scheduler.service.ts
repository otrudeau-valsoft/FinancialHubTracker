// Helper functions for EST time conversion
function getCurrentESTDate(): Date {
  const date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

function getESTFormattedTime(): string {
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
 * Configuration for different scheduler operations
 */
export interface SchedulerConfig {
  enabled: boolean;
  interval: number; // in minutes
  lastRun?: string;
  nextRun?: string;
}

/**
 * Service status and configuration
 */
export interface SchedulerStatus {
  current_prices: SchedulerConfig;
  historical_prices: SchedulerConfig;
}

// Default service configuration
const defaultConfig: SchedulerStatus = {
  current_prices: {
    enabled: true,
    interval: 10, // 10 minutes
    lastRun: undefined,
    nextRun: undefined
  },
  historical_prices: {
    enabled: true,
    interval: 24 * 60, // daily
    lastRun: undefined,
    nextRun: undefined
  }
};

// Current configuration
let schedulerConfig: SchedulerStatus = { ...defaultConfig };

// Timers for scheduled tasks
let currentPriceTimer: NodeJS.Timeout | null = null;
let historicalPriceTimer: NodeJS.Timeout | null = null;

// Service log entries
export interface LogEntry {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
  details?: any;
}

// In-memory log storage
const logs: LogEntry[] = [];
let logCounter = 0;

/**
 * Add a log entry
 */
export function addLog(
  type: string,
  message: string,
  status: 'success' | 'error' | 'info' = 'info',
  details?: any
): LogEntry {
  const log: LogEntry = {
    id: ++logCounter,
    type,
    message,
    timestamp: new Date().toISOString(),
    status,
    details
  };
  logs.push(log);
  
  // Limit logs to last 500 entries
  if (logs.length > 500) {
    logs.shift();
  }
  
  return log;
}

/**
 * Get all logs
 */
export function getLogs(): LogEntry[] {
  return [...logs].reverse(); // Return most recent first
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logs.length = 0;
  logCounter = 0;
}

/**
 * Get scheduler configuration
 */
export function getSchedulerConfig(): SchedulerStatus {
  return { ...schedulerConfig };
}

/**
 * Update scheduler configuration
 */
export function updateSchedulerConfig(
  type: 'current_prices' | 'historical_prices',
  config: Partial<SchedulerConfig>
): SchedulerStatus {
  // Update config
  schedulerConfig[type] = {
    ...schedulerConfig[type],
    ...config
  };
  
  // Restart scheduler
  if (type === 'current_prices' && currentPriceTimer) {
    clearTimeout(currentPriceTimer);
    startCurrentPriceScheduler();
  } else if (type === 'historical_prices' && historicalPriceTimer) {
    clearTimeout(historicalPriceTimer);
    startHistoricalPriceScheduler();
  }
  
  addLog(
    'scheduler_config',
    `Updated ${type} scheduler configuration`,
    'success',
    config
  );
  
  return { ...schedulerConfig };
}

/**
 * Calculate next run time for historical prices
 * Runs at 5pm EST every day
 */
function calculateNextHistoricalRunTime(): Date {
  const now = getCurrentESTDate();
  const targetHour = 17; // 5pm
  
  let nextRun = new Date(now);
  nextRun.setHours(targetHour, 0, 0, 0);
  
  // If it's already past target time, schedule for next day
  if (now.getHours() >= targetHour) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}

/**
 * Start current price scheduler
 */
function startCurrentPriceScheduler(): void {
  const { enabled, interval } = schedulerConfig.current_prices;
  
  if (!enabled) {
    addLog('current_prices', 'Current price scheduler is disabled');
    return;
  }
  
  // Log current EST time
  console.log('Current EST time:', getESTFormattedTime());
  
  // Update configuration with current time
  schedulerConfig.current_prices.lastRun = new Date().toISOString();
  
  // Start the timer
  const intervalMs = interval * 60 * 1000;
  currentPriceTimer = setTimeout(() => {
    // Add a log entry for the scheduled run
    addLog(
      'current_prices',
      `Scheduled current price update triggered`,
      'info'
    );
    
    // Restart the scheduler (this creates a recurring schedule)
    startCurrentPriceScheduler();
  }, intervalMs);
  
  // Calculate and set next run time
  const nextRun = new Date(Date.now() + intervalMs);
  schedulerConfig.current_prices.nextRun = nextRun.toISOString();
  
  addLog(
    'current_prices',
    `Starting current price scheduler with interval of ${interval} minutes`,
    'info'
  );
}

/**
 * Start historical price scheduler
 */
function startHistoricalPriceScheduler(): void {
  const { enabled } = schedulerConfig.historical_prices;
  
  if (!enabled) {
    addLog('historical_prices', 'Historical price scheduler is disabled');
    return;
  }
  
  // Calculate next run time (5pm EST)
  const nextRun = calculateNextHistoricalRunTime();
  const now = getCurrentESTDate();
  
  // Log current and next run times
  console.log('Current EST time:', getESTFormattedTime());
  console.log('Next historical price update scheduled for EST:', nextRun.toLocaleString('en-US', { 
    timeZone: 'America/New_York' 
  }));
  
  // Calculate delay until next run
  const delay = nextRun.getTime() - now.getTime();
  
  // Start the timer
  historicalPriceTimer = setTimeout(() => {
    // Add a log entry for the scheduled run
    addLog(
      'historical_prices',
      `Scheduled historical price update triggered`,
      'info'
    );
    
    // Update last run time
    schedulerConfig.historical_prices.lastRun = new Date().toISOString();
    
    // Restart the scheduler (this creates a recurring schedule)
    startHistoricalPriceScheduler();
  }, delay);
  
  // Update configuration
  schedulerConfig.historical_prices.nextRun = nextRun.toISOString();
  
  addLog(
    'historical_prices',
    `Scheduling historical price update at EST: ${nextRun.toLocaleString('en-US', { 
      timeZone: 'America/New_York' 
    })}`,
    'info'
  );
}

/**
 * Initialize the scheduler service
 */
export async function initSchedulerService(): Promise<void> {
  // Start current price scheduler
  startCurrentPriceScheduler();
  
  // Start historical price scheduler
  startHistoricalPriceScheduler();
  
  // Add initial log entry
  addLog('scheduler', 'Scheduler service initialized', 'success');
}

/**
 * Shutdown the scheduler service
 */
export function shutdownSchedulerService(): void {
  // Clear all timers
  if (currentPriceTimer) {
    clearTimeout(currentPriceTimer);
    currentPriceTimer = null;
  }
  
  if (historicalPriceTimer) {
    clearTimeout(historicalPriceTimer);
    historicalPriceTimer = null;
  }
  
  addLog('scheduler', 'Scheduler service shutdown', 'info');
}

// Make logs and config available for controller
export const schedulerService = {
  getLogs,
  clearLogs,
  getSchedulerConfig,
  updateSchedulerConfig
};
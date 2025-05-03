/**
 * Rate Limiter Utility
 * Handles API rate limiting by batching requests and spreading them over time.
 */

type PendingRequest = {
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
};

export class RateLimiter {
  private requestsPerSecond: number;
  private queue: PendingRequest[] = [];
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private batchSize: number;

  constructor(requestsPerSecond: number = 5) {
    this.requestsPerSecond = requestsPerSecond;
    this.batchSize = Math.max(1, Math.floor(requestsPerSecond));
    
    // Log configuration
    console.log(`[RateLimiter] Initialized with ${requestsPerSecond} requests per second, batch size: ${this.batchSize}`);
  }

  /**
   * Submit a request to be executed according to rate limits
   * @param requestFn Function that returns a promise for the API request
   * @returns Promise that resolves with the API response
   */
  public submit<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add request to queue
      this.queue.push({
        request: requestFn,
        resolve: resolve as (value: any) => void,
        reject
      });
      
      // Start processing if not already started
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue in batches
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    // Set interval to process batches of requests
    this.processingInterval = setInterval(() => {
      this.processBatch();
    }, 1000); // Process a batch every second
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(): Promise<void> {
    // If queue is empty, stop processing
    if (this.queue.length === 0) {
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }
      this.isProcessing = false;
      return;
    }

    // Take a batch of requests from the queue
    const batchSize = Math.min(this.batchSize, this.queue.length);
    const batch = this.queue.splice(0, batchSize);
    
    console.log(`[RateLimiter] Processing batch of ${batchSize} requests. ${this.queue.length} remaining in queue.`);

    // Process each request in the batch
    const promises = batch.map(async ({ request, resolve, reject }) => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    // Wait for all requests in the batch to complete
    await Promise.allSettled(promises);
  }

  /**
   * Get the number of requests in the queue
   */
  public get queueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if the rate limiter is currently processing
   */
  public get isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear the queue and stop processing
   */
  public clear(): void {
    this.queue = [];
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isProcessing = false;
  }
}
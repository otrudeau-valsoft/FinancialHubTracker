import { Request, Response, NextFunction } from 'express';

export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip: string;
  responseSize?: number;
  error?: string;
}

class RequestLogger {
  private logs: RequestLog[] = [];
  private readonly MAX_LOGS = 1000;

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const logId = this.generateId();
      
      // Override res.end to capture response details
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: BufferEncoding, cb?: (() => void)) {
        const duration = Date.now() - startTime;
        
        const log: RequestLog = {
          id: logId,
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          responseSize: chunk ? Buffer.byteLength(chunk) : 0
        };

        // Add error info if status >= 400
        if (res.statusCode >= 400) {
          log.error = `HTTP ${res.statusCode}`;
        }

        // Store log
        requestLogger.addLog(log);
        
        return originalEnd.call(this, chunk, encoding, cb);
      };
      
      next();
    };
  }

  private addLog(log: RequestLog) {
    this.logs.unshift(log);
    
    // Trim logs if exceeding max
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }
  }

  getLogs(limit: number = 50): RequestLog[] {
    return this.logs.slice(0, limit);
  }

  getErrorLogs(limit: number = 20): RequestLog[] {
    return this.logs
      .filter(log => log.statusCode >= 400)
      .slice(0, limit);
  }

  getSlowRequests(thresholdMs: number = 1000, limit: number = 20): RequestLog[] {
    return this.logs
      .filter(log => log.duration > thresholdMs)
      .slice(0, limit);
  }

  clearLogs() {
    this.logs = [];
  }

  getStats() {
    const last24h = this.logs.filter(log => 
      Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    return {
      totalRequests: this.logs.length,
      last24h: last24h.length,
      errorRate: last24h.filter(log => log.statusCode >= 400).length / last24h.length || 0,
      avgResponseTime: last24h.reduce((sum, log) => sum + log.duration, 0) / last24h.length || 0,
      slowRequests: last24h.filter(log => log.duration > 1000).length
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const requestLogger = new RequestLogger();
import { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import apiRoutes from './routes/index';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Register API routes
  app.use('/api', apiRoutes);
  
  // Not found handler
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  return httpServer;
}
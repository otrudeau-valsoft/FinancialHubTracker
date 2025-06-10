import { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import apiRoutes from './routes/index';
import { errorHandler } from './middleware/error-handler';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a different path than Vite's HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'info', 
      message: 'Connected to AlphaGen real-time data feed',
      timestamp: new Date().toISOString()
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Echo back as acknowledgment
        ws.send(JSON.stringify({ 
          type: 'ack', 
          received: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast function for sending data to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // Make broadcast function available to other modules
  app.locals.wsBroadcast = broadcast;
  
  // Register API routes
  app.use('/api', apiRoutes);
  
  // Not found handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ 
      status: 'error',
      message: `Route not found: ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  return httpServer;
}
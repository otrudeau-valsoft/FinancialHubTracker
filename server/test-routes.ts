import express, { Express } from 'express';
import { registerRoutes } from './new-routes';

/**
 * Simple script to test route registration without starting a full server
 */
async function testRouteRegistration() {
  const app = express();
  app.use(express.json());
  
  const routeMap: Record<string, string[]> = {};
  
  // Intercept route registrations
  const originalGet = app.get;
  const originalPost = app.post;
  const originalPut = app.put;
  const originalDelete = app.delete;
  
  app.get = function(path: any, ...handlers: any[]): Express {
    if (typeof path === 'string') {
      const basePath = path.split('/')[1];
      routeMap[basePath] = routeMap[basePath] || [];
      routeMap[basePath].push(`GET ${path}`);
    }
    return originalGet.apply(this, [path, ...handlers]);
  };
  
  app.post = function(path: any, ...handlers: any[]): Express {
    if (typeof path === 'string') {
      const basePath = path.split('/')[1];
      routeMap[basePath] = routeMap[basePath] || [];
      routeMap[basePath].push(`POST ${path}`);
    }
    return originalPost.apply(this, [path, ...handlers]);
  };
  
  app.put = function(path: any, ...handlers: any[]): Express {
    if (typeof path === 'string') {
      const basePath = path.split('/')[1];
      routeMap[basePath] = routeMap[basePath] || [];
      routeMap[basePath].push(`PUT ${path}`);
    }
    return originalPut.apply(this, [path, ...handlers]);
  };
  
  app.delete = function(path: any, ...handlers: any[]): Express {
    if (typeof path === 'string') {
      const basePath = path.split('/')[1];
      routeMap[basePath] = routeMap[basePath] || [];
      routeMap[basePath].push(`DELETE ${path}`);
    }
    return originalDelete.apply(this, [path, ...handlers]);
  };
  
  // Register routes
  await registerRoutes(app);
  
  // Print route map
  console.log('API Routes:');
  Object.keys(routeMap).forEach(basePath => {
    console.log(`\n[${basePath}]:`);
    routeMap[basePath].forEach(route => {
      console.log(`  ${route}`);
    });
  });
}

testRouteRegistration().catch(console.error);
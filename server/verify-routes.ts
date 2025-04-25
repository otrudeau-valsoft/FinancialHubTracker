/**
 * This script verifies that the refactored routes structure matches the original routes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of all API endpoints from the original routes.ts file
const originalEndpoints = [
  // Portfolio endpoints
  { method: 'GET', path: '/api/portfolios/:region/stocks' },
  { method: 'POST', path: '/api/portfolios/:region/stocks' },
  { method: 'POST', path: '/api/portfolios/:region/stocks/bulk' },
  { method: 'GET', path: '/api/portfolios/:region/stocks/:id' },
  { method: 'PUT', path: '/api/portfolios/:region/stocks/:id' },
  { method: 'DELETE', path: '/api/portfolios/:region/stocks/:id' },
  { method: 'GET', path: '/api/portfolios/:region/summary' },
  { method: 'POST', path: '/api/portfolios/:region/summary' },
  { method: 'PUT', path: '/api/portfolios/:region/summary/:id' },
  { method: 'POST', path: '/api/import/portfolio/:region' },
  
  // ETF endpoints
  { method: 'GET', path: '/api/etfs/:symbol/holdings' },
  { method: 'GET', path: '/api/etfs/:symbol/holdings/top/:limit' },
  { method: 'POST', path: '/api/etfs/:symbol/holdings' },
  { method: 'POST', path: '/api/etfs/:symbol/holdings/bulk' },
  { method: 'POST', path: '/api/import/etf/:symbol' },
  
  // Matrix rules endpoints
  { method: 'GET', path: '/api/matrix-rules/:actionType' },
  { method: 'POST', path: '/api/matrix-rules' },
  { method: 'POST', path: '/api/matrix-rules/bulk' },
  
  // Alerts endpoints
  { method: 'GET', path: '/api/alerts' },
  { method: 'POST', path: '/api/alerts' },
  { method: 'PUT', path: '/api/alerts/:id' },
  
  // Historical price endpoints
  { method: 'GET', path: '/api/historical-prices/:symbol/:region' },
  { method: 'GET', path: '/api/historical-prices/region/:region' },
  { method: 'POST', path: '/api/historical-prices/fetch/portfolio/:region' },
  { method: 'POST', path: '/api/historical-prices/fetch/all' },
  { method: 'POST', path: '/api/historical-prices/fetch/:symbol/:region' },
  
  // Current price endpoints
  { method: 'GET', path: '/api/current-prices/:region' },
  { method: 'GET', path: '/api/current-prices/:region/:symbol' },
  { method: 'POST', path: '/api/current-prices/fetch/portfolio/:region' },
  { method: 'POST', path: '/api/current-prices/fetch/:symbol/:region' },
  { method: 'POST', path: '/api/current-prices/fetch/all' },
  
  // Data update endpoints
  { method: 'GET', path: '/api/data-updates/logs' },
  { method: 'DELETE', path: '/api/data-updates/logs' },
  
  // Scheduler endpoints
  { method: 'GET', path: '/api/scheduler/config' },
  { method: 'POST', path: '/api/scheduler/config/:type' },
  
  // Upgrade/downgrade endpoints
  { method: 'GET', path: '/api/upgrade-downgrade/region/:region' },
  { method: 'POST', path: '/api/upgrade-downgrade/fetch/region/:region' },
  { method: 'GET', path: '/api/upgrade-downgrade/stock/:symbol/:region' },
  { method: 'POST', path: '/api/upgrade-downgrade/fetch/stock/:symbol/:region' },
  
  // Misc endpoints
  { method: 'GET', path: '/api/portfolio-symbols/:region' },
  { method: 'GET', path: '/api/direct-query/:symbol/:region' },
  { method: 'GET', path: '/api/test/historical-prices' },
];

// Helper function to normalize paths for comparison
function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/');
}

// Read all route files
function findRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fileList = findRouteFiles(filePath, fileList);
    } else if (file.endsWith('.routes.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract routes from route files using simple regex
function extractRoutesFromFile(filePath: string): { method: string, path: string }[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes: { method: string, path: string }[] = [];
  
  // Extract route prefix from imports
  const importMatch = content.match(/import\s+.*\s+from\s+['"](.+?)['"]/);
  const filePathParts = filePath.split('/');
  const lastPathPart = filePathParts[filePathParts.length - 2];
  
  // Look for router.X calls (get, post, put, delete)
  const getMethods = content.match(/router\.get\(['"](.+?)['"]/g) || [];
  const postMethods = content.match(/router\.post\(['"](.+?)['"]/g) || [];
  const putMethods = content.match(/router\.put\(['"](.+?)['"]/g) || [];
  const deleteMethods = content.match(/router\.delete\(['"](.+?)['"]/g) || [];
  
  // Process GET routes
  getMethods.forEach(method => {
    const pathMatch = method.match(/router\.get\(['"](.+?)['"]/);
    if (pathMatch && pathMatch[1]) {
      routes.push({ 
        method: 'GET', 
        path: '/api/' + lastPathPart + pathMatch[1] 
      });
    }
  });
  
  // Process POST routes
  postMethods.forEach(method => {
    const pathMatch = method.match(/router\.post\(['"](.+?)['"]/);
    if (pathMatch && pathMatch[1]) {
      routes.push({ 
        method: 'POST', 
        path: '/api/' + lastPathPart + pathMatch[1]
      });
    }
  });
  
  // Process PUT routes
  putMethods.forEach(method => {
    const pathMatch = method.match(/router\.put\(['"](.+?)['"]/);
    if (pathMatch && pathMatch[1]) {
      routes.push({ 
        method: 'PUT', 
        path: '/api/' + lastPathPart + pathMatch[1]
      });
    }
  });
  
  // Process DELETE routes
  deleteMethods.forEach(method => {
    const pathMatch = method.match(/router\.delete\(['"](.+?)['"]/);
    if (pathMatch && pathMatch[1]) {
      routes.push({ 
        method: 'DELETE', 
        path: '/api/' + lastPathPart + pathMatch[1]
      });
    }
  });
  
  return routes;
}

// Main verification function
function verifyRoutes() {
  console.log('Verifying routes...');
  
  // Find all route files
  const routeFiles = findRouteFiles(path.join(__dirname, 'routes'));
  console.log(`Found ${routeFiles.length} route files.`);
  
  // Extract routes from files
  let newRoutes: { method: string, path: string }[] = [];
  routeFiles.forEach(filePath => {
    const routes = extractRoutesFromFile(filePath);
    newRoutes = [...newRoutes, ...routes];
  });
  
  // Normalize paths
  const normalizedOriginalEndpoints = originalEndpoints.map(endpoint => ({
    ...endpoint,
    path: normalizePath(endpoint.path)
  }));
  
  const normalizedNewRoutes = newRoutes.map(route => ({
    ...route,
    path: normalizePath(route.path)
  }));
  
  // Find missing routes
  const missingRoutes = normalizedOriginalEndpoints.filter(originalRoute => 
    !normalizedNewRoutes.some(newRoute => 
      newRoute.method === originalRoute.method && 
      newRoute.path === originalRoute.path
    )
  );
  
  // Find new routes
  const additionalRoutes = normalizedNewRoutes.filter(newRoute => 
    !normalizedOriginalEndpoints.some(originalRoute => 
      originalRoute.method === newRoute.method && 
      originalRoute.path === newRoute.path
    )
  );
  
  // Print results
  console.log(`\nOriginal endpoints: ${normalizedOriginalEndpoints.length}`);
  console.log(`New endpoints: ${normalizedNewRoutes.length}`);
  
  if (missingRoutes.length > 0) {
    console.log('\nMissing routes:');
    missingRoutes.forEach(route => {
      console.log(`  ${route.method} ${route.path}`);
    });
  } else {
    console.log('\nAll original routes are accounted for!');
  }
  
  if (additionalRoutes.length > 0) {
    console.log('\nAdditional routes:');
    additionalRoutes.forEach(route => {
      console.log(`  ${route.method} ${route.path}`);
    });
  }
}

// Run the verification
verifyRoutes();
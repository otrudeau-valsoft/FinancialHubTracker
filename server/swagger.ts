/**
 * Swagger API Documentation Configuration
 * Provides comprehensive API documentation for AlphaGen Portfolio Management System
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlphaGen Portfolio Management API',
      version: '1.0.0',
      description: 'Comprehensive API for managing multi-regional investment portfolios with real-time market data, performance tracking, and automated scheduling.',
      contact: {
        name: 'AlphaGen Team',
        email: 'support@alphagen.com'
      }
    },
    servers: [
      {
        url: process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server'
      }
    ],
    components: {
      schemas: {
        Portfolio: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique identifier' },
            symbol: { type: 'string', description: 'Stock symbol' },
            companyName: { type: 'string', description: 'Company name' },
            sector: { type: 'string', description: 'Business sector' },
            region: { type: 'string', enum: ['USD', 'CAD', 'INTL'] },
            purchasePrice: { type: 'number', format: 'float' },
            quantity: { type: 'integer' },
            currentPrice: { type: 'number', format: 'float' },
            dailyChange: { type: 'number', format: 'float' },
            dailyChangePercent: { type: 'number', format: 'float' },
            totalValue: { type: 'number', format: 'float' },
            mtdReturn: { type: 'number', format: 'float' },
            ytdReturn: { type: 'number', format: 'float' },
            sixMonthReturn: { type: 'number', format: 'float' },
            fiftyTwoWeekReturn: { type: 'number', format: 'float' }
          }
        },
        CurrentPrice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            symbol: { type: 'string' },
            region: { type: 'string', enum: ['USD', 'CAD', 'INTL'] },
            price: { type: 'number', format: 'float' },
            change: { type: 'number', format: 'float' },
            changePercent: { type: 'number', format: 'float' },
            lastUpdated: { type: 'string', format: 'date-time' }
          }
        },
        SchedulerJob: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            schedule: { type: 'string', description: 'Cron expression' },
            enabled: { type: 'boolean' },
            running: { type: 'boolean' },
            lastRun: { type: 'string', format: 'date-time', nullable: true },
            nextRun: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            symbol: { type: 'string' },
            message: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        MarketIndex: {
          type: 'object',
          properties: {
            sp500: {
              type: 'object',
              properties: {
                return: { type: 'number', format: 'float' },
                position: { type: 'string' }
              }
            },
            nasdaq: {
              type: 'object',
              properties: {
                return: { type: 'number', format: 'float' },
                position: { type: 'string' }
              }
            },
            dow: {
              type: 'object',
              properties: {
                return: { type: 'number', format: 'float' },
                position: { type: 'string' }
              }
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success', 'error'] },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      },
      parameters: {
        Region: {
          name: 'region',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['USD', 'CAD', 'INTL']
          },
          description: 'Portfolio region'
        },
        Symbol: {
          name: 'symbol',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Stock symbol'
        },
        JobId: {
          name: 'jobId',
          in: 'path',
          required: true,
          schema: {
            type: 'string'
          },
          description: 'Scheduler job identifier'
        }
      }
    },
    tags: [
      { name: 'Portfolios', description: 'Portfolio management operations' },
      { name: 'Prices', description: 'Current and historical price data' },
      { name: 'Performance', description: 'Performance metrics and history' },
      { name: 'Scheduler', description: 'Automated task scheduling' },
      { name: 'Market Data', description: 'Real-time market information' },
      { name: 'Monitoring', description: 'System monitoring and alerts' },
      { name: 'ETFs', description: 'ETF holdings and data' },
      { name: 'Matrix Rules', description: 'Decision matrix rules' },
      { name: 'Cash Management', description: 'Cash position management' }
    ]
  },
  apis: ['./server/routes/*.ts', './server/routes/*.js'] // Path to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export function setupSwagger(app: Express) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1f2937; font-size: 2rem; }
      .swagger-ui .info .description { font-size: 1.1rem; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #f8fafc; border: 1px solid #e2e8f0; }
    `,
    customSiteTitle: 'AlphaGen API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // JSON endpoint for the specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

export { swaggerSpec };
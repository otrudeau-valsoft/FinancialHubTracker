/**
 * Swagger Documentation Annotations
 * This file contains OpenAPI/Swagger annotations for all API endpoints
 */

/**
 * @swagger
 * /api/portfolios/{region}/stocks:
 *   get:
 *     tags: [Portfolios]
 *     summary: Get portfolio stocks for a specific region
 *     description: Retrieve all stocks in a portfolio with current prices and performance metrics
 *     parameters:
 *       - $ref: '#/components/parameters/Region'
 *     responses:
 *       200:
 *         description: Portfolio stocks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Portfolio'
 *       404:
 *         description: Portfolio not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @swagger
 * /api/current-prices/{region}:
 *   get:
 *     tags: [Prices]
 *     summary: Get current prices for region
 *     description: Retrieve current stock prices for all symbols in a specific region
 *     parameters:
 *       - $ref: '#/components/parameters/Region'
 *     responses:
 *       200:
 *         description: Current prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CurrentPrice'
 * 
 *   post:
 *     tags: [Prices]
 *     summary: Update current prices manually
 *     description: Manually trigger price updates for a specific region
 *     parameters:
 *       - $ref: '#/components/parameters/Region'
 *     responses:
 *       200:
 *         description: Price update initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @swagger
 * /api/historical-prices:
 *   get:
 *     tags: [Prices]
 *     summary: Get historical prices
 *     description: Retrieve historical price data with technical indicators
 *     parameters:
 *       - name: symbols
 *         in: query
 *         description: Comma-separated list of symbols
 *         schema:
 *           type: string
 *         example: "AAPL,MSFT,GOOGL"
 *       - name: period
 *         in: query
 *         description: Time period for historical data
 *         schema:
 *           type: string
 *           enum: ['1mo', '3mo', '6mo', '1y', '2y']
 *         example: "6mo"
 *     responses:
 *       200:
 *         description: Historical prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                         price:
 *                           type: number
 *                         rsi:
 *                           type: number
 *                         macd:
 *                           type: number
 */

/**
 * @swagger
 * /api/performance-history:
 *   get:
 *     tags: [Performance]
 *     summary: Get portfolio performance history
 *     description: Retrieve historical performance data for portfolios
 *     parameters:
 *       - name: region
 *         in: query
 *         description: Portfolio region
 *         schema:
 *           type: string
 *           enum: ['USD', 'CAD', 'INTL']
 *       - name: timeRange
 *         in: query
 *         description: Time range for performance data
 *         schema:
 *           type: string
 *           enum: ['1M', '3M', '6M', '1Y']
 *       - name: startDate
 *         in: query
 *         description: Start date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         description: End date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Performance history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       totalValue:
 *                         type: number
 *                       dailyReturn:
 *                         type: number
 */

/**
 * @swagger
 * /api/scheduler/status:
 *   get:
 *     tags: [Scheduler]
 *     summary: Get scheduler status
 *     description: Retrieve status of all scheduled jobs
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SchedulerJob'
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/scheduler/jobs/{jobId}/toggle:
 *   post:
 *     tags: [Scheduler]
 *     summary: Toggle job enabled/disabled
 *     description: Enable or disable a scheduled job
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *             required:
 *               - enabled
 *     responses:
 *       200:
 *         description: Job toggle successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @swagger
 * /api/scheduler/jobs/{jobId}/run:
 *   post:
 *     tags: [Scheduler]
 *     summary: Manually run a job
 *     description: Trigger a scheduled job to run immediately
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: Job triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @swagger
 * /api/scheduler/audit-logs:
 *   get:
 *     tags: [Scheduler]
 *     summary: Get scheduler audit logs
 *     description: Retrieve audit log history for scheduler operations
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Maximum number of logs to return
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       jobId:
 *                         type: string
 *                       action:
 *                         type: string
 *                       status:
 *                         type: string
 *                       details:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/market-indices/real-time:
 *   get:
 *     tags: [Market Data]
 *     summary: Get real-time market indices
 *     description: Retrieve current market index values and changes
 *     responses:
 *       200:
 *         description: Market indices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketIndex'
 */

/**
 * @swagger
 * /api/etfs/{symbol}/holdings/top/{count}:
 *   get:
 *     tags: [ETFs]
 *     summary: Get top ETF holdings
 *     description: Retrieve top holdings for a specific ETF
 *     parameters:
 *       - name: symbol
 *         in: path
 *         required: true
 *         description: ETF symbol
 *         schema:
 *           type: string
 *         example: "SPY"
 *       - name: count
 *         in: path
 *         required: true
 *         description: Number of top holdings to return
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: ETF holdings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   ticker:
 *                     type: string
 *                   name:
 *                     type: string
 *                   weight:
 *                     type: number
 *                   shares:
 *                     type: number
 *                   marketValue:
 *                     type: number
 */

/**
 * @swagger
 * /api/monitoring/alerts:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get system alerts
 *     description: Retrieve current system alerts and notifications
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 count:
 *                   type: integer
 */

/**
 * @swagger
 * /api/monitoring/system-metrics:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get system performance metrics
 *     description: Retrieve current system performance and health metrics
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *                     uptime:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/monitoring/data-quality:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get data quality metrics
 *     description: Retrieve data quality analysis and validation results
 *     responses:
 *       200:
 *         description: Data quality metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                     validRecords:
 *                       type: integer
 *                     invalidRecords:
 *                       type: integer
 *                     qualityScore:
 *                       type: number
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/diagnostics/health:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get system health status
 *     description: Comprehensive health check of all system components
 *     responses:
 *       200:
 *         description: System health check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['ok', 'warning', 'error']
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 components:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     scheduler:
 *                       type: string
 *                     apis:
 *                       type: string
 */

/**
 * @swagger
 * /api/matrix-rules/{action}:
 *   get:
 *     tags: [Matrix Rules]
 *     summary: Get decision matrix rules
 *     description: Retrieve decision matrix rules for specific actions
 *     parameters:
 *       - name: action
 *         in: path
 *         required: true
 *         description: Action type for matrix rules
 *         schema:
 *           type: string
 *           enum: ['Increase', 'Decrease', 'Hold', 'Buy', 'Sell']
 *     responses:
 *       200:
 *         description: Matrix rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   ruleId:
 *                     type: string
 *                   ruleName:
 *                     type: string
 *                   operator:
 *                     type: string
 *                   threshold:
 *                     type: number
 *                   weight:
 *                     type: number
 */

/**
 * @swagger
 * /api/cash:
 *   get:
 *     tags: [Cash Management]
 *     summary: Get cash positions
 *     description: Retrieve cash positions for all regions
 *     responses:
 *       200:
 *         description: Cash positions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   region:
 *                     type: string
 *                     enum: ['USD', 'CAD', 'INTL']
 *                   amount:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /api/data-updates/logs:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get data update logs
 *     description: Retrieve logs of data update operations
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Maximum number of logs to return
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: type
 *         in: query
 *         description: Filter by log type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data update logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   level:
 *                     type: string
 *                   message:
 *                     type: string
 *                   details:
 *                     type: object
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 */

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get portfolio alerts
 *     description: Retrieve active alerts for portfolio positions
 *     responses:
 *       200:
 *         description: Portfolio alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 */
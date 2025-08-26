# AlphaGen Portfolio Management System

## Overview

AlphaGen is a comprehensive portfolio monitoring and management application built for tracking investments across USD, CAD, and International markets. The system provides real-time portfolio analysis, performance tracking, technical indicators, and automated data updates for informed investment decisions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with Node.js 20
- **Database**: Neon PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints with structured JSON responses
- **Real-time Updates**: Scheduled data fetching using cron-like scheduling
- **Error Handling**: Centralized error middleware with structured error responses

### Frontend Architecture
- **Framework**: React with TypeScript
- **State Management**: TanStack React Query for server state
- **UI Components**: Radix UI with Tailwind CSS styling
- **Routing**: Wouter for client-side routing
- **Charts**: Recharts for data visualization

### Data Architecture
- **Multi-region Support**: Separate portfolio tables for USD, CAD, and INTL assets
- **Shared Price Data**: Centralized current_prices and historical_prices tables
- **Performance Metrics**: Calculated MTD, YTD, 6-month, and 52-week returns
- **Technical Indicators**: RSI, MACD, and moving averages

## Key Components

### Database Schema
1. **Portfolio Tables**: `assets_us`, `assets_cad`, `assets_intl` for holdings
2. **Price Tables**: `current_prices` for real-time data, `historical_prices` for EOD data
3. **Performance Tables**: Region-specific performance history tracking
4. **Technical Data**: RSI, MACD, and moving average calculations
5. **ETF Holdings**: SPY holdings data for comparison
6. **Cash Management**: Cash positions by region

### Core Services
1. **Price Service**: Yahoo Finance integration for real-time and historical data
2. **Performance Service**: Batch calculation of portfolio metrics
3. **Scheduler Service**: Automated data updates with configurable intervals
4. **Portfolio Service**: CRUD operations for portfolio management
5. **Technical Analysis Service**: RSI, MACD, and moving average calculations

### API Endpoints
- `/api/portfolios/{region}/stocks` - Portfolio holdings with performance metrics
- `/api/current-prices/{region}` - Real-time price data
- `/api/historical-prices` - Historical price data and technical indicators
- `/api/performance-history` - Portfolio performance over time
- `/api/market-indices/real-time` - Market index data
- `/api/etfs/{symbol}/holdings` - ETF composition data

### Frontend Components
1. **Portfolio Tables**: Display holdings with performance metrics
2. **Charts**: Price charts with technical indicators
3. **Dashboard**: Overview of all portfolios with market data
4. **Stock Details**: Detailed view with technical analysis
5. **ETF Comparison**: Compare portfolio against benchmark ETFs

## Data Flow

### Real-time Price Updates
1. Scheduler triggers price updates based on market hours
2. Yahoo Finance API fetches current prices for all portfolio symbols
3. Database stores updated prices with timestamps
4. Frontend queries updated data through React Query

### Historical Data Pipeline
1. Daily EOD data fetched after market close
2. Technical indicators calculated and stored
3. Performance metrics updated for all portfolios
4. Moving averages and RSI/MACD values computed

### Portfolio Performance Calculation
1. Current prices retrieved from database
2. Historical prices fetched for specific time periods
3. Return percentages calculated for MTD, YTD, 6M, 52W periods
4. Results cached and served to frontend

## External Dependencies

### Data Sources
- **Yahoo Finance API**: Primary source for price data and market information
- **Neon PostgreSQL**: Cloud-hosted database with serverless scaling

### Third-party Libraries
- **yahoo-finance2**: Node.js library for financial data
- **Drizzle ORM**: Type-safe database operations
- **Zod**: Runtime type validation
- **Luxon**: Date manipulation and formatting

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Chart and visualization library
- **TanStack React Query**: Server state management

## Deployment Strategy

### Development Environment
- **Platform**: Replit with live development server
- **Hot Reload**: Vite for frontend, tsx for backend development
- **Database**: Neon development instance with connection pooling

### Build Process
- **Frontend**: Vite builds optimized production bundle
- **Backend**: ESBuild compiles TypeScript to ES modules
- **Assets**: Static files served from dist/public directory

### Environment Configuration
- **Database URL**: Environment variable for database connection
- **API Keys**: Secured through environment variables
- **Scheduling**: Configurable intervals for data updates

### Testing Framework
- **Unit Tests**: Jest with TypeScript support
- **API Testing**: Supertest for endpoint validation
- **Coverage**: Code coverage reporting for quality assurance
- **Validation Testing**: Zod schema validation testing
- **Test Suites**: 4 comprehensive test suites covering data validation, performance metrics, data integrity, and API endpoints
- **Testing Status**: Data validation and performance metrics tests fully passing; Data integrity test identified 7 real data quality issues in historical prices

## Recent Updates (August 26, 2025)

### Production-Ready Scheduler with Full Database Persistence
- Created `scheduler_configs` and `scheduler_logs` tables for complete persistence
- All scheduler configurations survive server restarts and deployments
- Automatic database loading on startup - reads saved configurations and starts enabled jobs
- Complete audit trail - every action (toggle, schedule change, manual run) is logged with timestamps
- Real-time persistence - all changes immediately save to database
- Natural language scheduler interface - user-friendly scheduling descriptions instead of cron syntax
- Scheduler service uses async database operations for all configuration changes
- Testing & Monitoring page fully integrated with database-backed scheduler

### Previous Updates (August 3, 2025)
- Fixed Current Price Updates
- Resolved ES module import errors by converting require() to dynamic imports
- Fixed PostgreSQL case sensitivity issues with quoted table names
- Corrected SQL column references (price → purchase_price)
- Removed weekend market closure restrictions for manual updates
- Fixed Express route ordering (specific routes before wildcards)
- Temporarily disabled slow performance history updates to improve response times
- All three regional portfolios (USD, CAD, INTL) now updating correctly with fresh Yahoo Finance data

The system is designed for scalability and maintainability, with clear separation of concerns between data fetching, business logic, and presentation layers. The modular architecture allows for easy extension of new features and markets while maintaining data consistency across all portfolio regions.
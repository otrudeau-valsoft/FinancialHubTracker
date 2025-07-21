# Testing and Monitoring Framework

This document describes the comprehensive testing and monitoring framework implemented for the AlphaGen portfolio management system.

## Overview

The testing framework provides automated validation for all critical data points in the application, including:
- Performance metric calculations
- API endpoint responses
- Data validation and integrity
- Real-time monitoring of system health

## Testing Structure

### Test Files

1. **server/tests/setup.ts**
   - Test database configuration
   - Common test utilities
   - Setup and teardown functions

2. **server/tests/performance-metrics.test.ts**
   - Tests for MTD, YTD, 6-month, and 52-week return calculations
   - Batch performance calculation validation
   - Edge case handling for missing data

3. **server/tests/data-validation.test.ts**
   - Zod schema validation for:
     - Price data structure
     - Portfolio stock data
     - Performance metrics
   - Input validation testing

4. **server/tests/api-endpoints.test.ts**
   - API endpoint response testing
   - Status code validation
   - Response structure verification
   - Tests for all major endpoints

5. **server/tests/data-integrity.test.ts**
   - Database integrity checks
   - Valid price ranges
   - Stock type validation
   - Rating constraints (1-4)
   - Cash balance consistency

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- server/tests/performance-metrics.test.ts
```

## Monitoring System

### Monitoring Service (server/services/monitoring-service.ts)

The monitoring service provides real-time data quality checks:

1. **Price Data Freshness**
   - Checks for stale price data older than 2 days
   - Identifies stocks needing updates

2. **Cash Balance Consistency**
   - Validates no negative cash balances
   - Ensures all regions have cash entries

3. **Portfolio Value Accuracy**
   - Checks for missing or invalid current prices
   - Validates price calculations

4. **Price Anomaly Detection**
   - Identifies extreme price movements (>50% daily)
   - Flags potential data errors

5. **Data Completeness**
   - Checks for missing company names
   - Validates stock types and ratings

### Monitoring Endpoints

- `GET /api/monitoring/data-quality` - Run all data quality checks
- `GET /api/monitoring/system-metrics` - Get system performance metrics
- `GET /api/monitoring/alerts` - Retrieve system alerts
- `DELETE /api/monitoring/alerts` - Clear alerts
- `GET /api/monitoring/health` - Overall health status

### Monitoring Dashboard

Access the monitoring dashboard at `/monitoring` to view:
- Real-time data quality status
- System metrics (memory, uptime, database stats)
- Active alerts and notifications
- Overall system health

## Data Validation Examples

### Valid Portfolio Stock Data
```javascript
{
  symbol: 'MSFT',
  companyName: 'Microsoft Corporation',
  stockType: 'Comp',  // Must be: Comp, Cat, Cycl, Cash, or ETF
  rating: 1,          // Must be 1-4
  purchasePrice: 300.00,
  currentPrice: 350.00,
  quantity: 100,
  region: 'USD'       // Must be: USD, CAD, or INTL
}
```

### Valid Performance Metrics
```javascript
{
  mtdReturn: 5.25,        // Can be positive or negative
  ytdReturn: 12.50,
  sixMonthReturn: -2.75,
  fiftyTwoWeekReturn: 25.00
}
```

## Alert Categories

1. **Error Alerts**
   - Critical system failures
   - Data corruption issues
   - API failures

2. **Warning Alerts**
   - Stale data detected
   - Performance degradation
   - Near-limit conditions

3. **Info Alerts**
   - Successful operations
   - System updates
   - Scheduled task completions

## Best Practices

1. **Regular Monitoring**
   - Check monitoring dashboard daily
   - Review alerts promptly
   - Run data quality checks after major updates

2. **Test Before Deploy**
   - Run full test suite
   - Check coverage report
   - Validate all endpoints

3. **Data Integrity**
   - Maintain valid stock types and ratings
   - Keep price data current
   - Ensure cash balances are accurate

4. **Performance**
   - Monitor memory usage trends
   - Track database query performance
   - Watch for increasing alert frequencies

## Troubleshooting

### Common Issues

1. **Stale Price Data**
   - Run manual price update from Data Management
   - Check scheduler configuration
   - Verify API connectivity

2. **Failed Tests**
   - Check test database connection
   - Verify environment variables
   - Review recent code changes

3. **High Alert Volume**
   - Check for systematic data issues
   - Review recent imports/updates
   - Validate external API responses

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test -- --coverage

- name: Check Data Quality
  run: curl http://localhost:5000/api/monitoring/health
```

## Future Enhancements

1. **Automated Remediation**
   - Self-healing for common issues
   - Automatic data refresh triggers
   - Smart alert resolution

2. **Advanced Analytics**
   - Trend analysis for metrics
   - Predictive failure detection
   - Performance optimization suggestions

3. **Extended Coverage**
   - Transaction validation tests
   - News feed integrity checks
   - Economic calendar data validation
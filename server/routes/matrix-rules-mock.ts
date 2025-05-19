import { Router } from 'express';
// Import directly from matrix-thresholds.ts to fix module resolution
import { MATRIX_THRESHOLDS } from './matrix-thresholds.js';

const router = Router();

/**
 * GET /api/matrix-rules/Increase
 * Return increase position rules  
 */
router.get('/Increase', (req, res) => {
  // Extract just the position increase rules
  const increaseRules = [
    {
      id: 1,
      ruleId: 'price-52wk',
      ruleName: 'Price % vs 52-wk High',
      description: 'Triggers when current price is below 52-week high by specified percentage',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['price-52wk'],
      evaluationMethod: 'percent',
      evaluationLogic: 'below',
      dataSource: 'historical_prices',
      orderNumber: 1
    },
    {
      id: 2,
      ruleId: 'rsi-low',
      ruleName: 'RSI Below Threshold',
      description: 'Triggers when 14-day RSI falls below specified value indicating oversold condition',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['rsi-low'],
      evaluationMethod: 'value',
      evaluationLogic: 'below',
      dataSource: 'rsi_data',
      orderNumber: 2
    },
    {
      id: 3,
      ruleId: 'macd-below',
      ruleName: 'MACD Positive Crossover',
      description: 'Triggers when MACD line crosses above signal line indicating positive momentum shift',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['macd-below'],
      evaluationMethod: 'delta',
      evaluationLogic: 'positive',
      dataSource: 'macd_data',
      orderNumber: 3
    },
    {
      id: 4,
      ruleId: 'golden-cross-pos',
      ruleName: 'Golden Cross',
      description: 'Triggers when 50-day MA crosses above 200-day MA indicating bullish trend',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['golden-cross-pos'],
      evaluationMethod: 'delta',
      evaluationLogic: 'positive',
      dataSource: 'historical_prices',
      orderNumber: 4
    },
    {
      id: 5,
      ruleId: 'sector-perf-neg',
      ruleName: 'Sector Underperformance',
      description: 'Triggers when sector underperforms broader market by specified percentage',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['sector-perf-neg'],
      evaluationMethod: 'percent',
      evaluationLogic: 'below',
      dataSource: 'market_indices',
      orderNumber: 5
    },
    {
      id: 6,
      ruleId: 'at-200ma',
      ruleName: 'At 200-day Moving Average',
      description: 'Triggers when price is near 200-day moving average indicating potential support',
      actionType: 'Increase',
      thresholds: MATRIX_THRESHOLDS['at-200ma'],
      evaluationMethod: 'percent',
      evaluationLogic: 'at',
      dataSource: 'historical_prices',
      orderNumber: 6
    }
  ];

  return res.status(200).json(increaseRules);
});

/**
 * GET /api/matrix-rules/Decrease
 * Return decrease position rules  
 */
router.get('/Decrease', (req, res) => {
  // Extract just the position decrease rules
  const decreaseRules = [
    {
      id: 7,
      ruleId: 'price-90day',
      ruleName: '90-day Price Increase',
      description: 'Triggers when price increases by specified percentage over 90 days',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['price-90day'],
      evaluationMethod: 'percent',
      evaluationLogic: 'above',
      dataSource: 'historical_prices',
      orderNumber: 1
    },
    {
      id: 8,
      ruleId: 'max-weight',
      ruleName: 'Maximum Position Weight',
      description: 'Triggers when position weight exceeds specified percentage of portfolio',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['max-weight'],
      evaluationMethod: 'percent',
      evaluationLogic: 'above',
      dataSource: 'portfolio',
      orderNumber: 2
    },
    {
      id: 9,
      ruleId: 'max-weight-intl',
      ruleName: 'Maximum INTL Position Weight',
      description: 'Triggers when position weight exceeds specified percentage for international stocks',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['max-weight-intl'],
      evaluationMethod: 'percent',
      evaluationLogic: 'above',
      dataSource: 'portfolio',
      orderNumber: 3
    },
    {
      id: 10,
      ruleId: 'active-risk',
      ruleName: 'Active Risk Threshold',
      description: 'Triggers when active risk vs benchmark exceeds specified percentage',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['active-risk'],
      evaluationMethod: 'percent',
      evaluationLogic: 'above',
      dataSource: 'portfolio',
      orderNumber: 4
    },
    {
      id: 11,
      ruleId: 'rsi-high',
      ruleName: 'RSI Above Threshold',
      description: 'Triggers when 14-day RSI rises above specified value indicating overbought condition',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['rsi-high'],
      evaluationMethod: 'value',
      evaluationLogic: 'above',
      dataSource: 'rsi_data',
      orderNumber: 5
    },
    {
      id: 12,
      ruleId: 'macd-above',
      ruleName: 'MACD Negative Crossover',
      description: 'Triggers when MACD line crosses below signal line indicating negative momentum shift',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['macd-above'],
      evaluationMethod: 'delta',
      evaluationLogic: 'negative',
      dataSource: 'macd_data',
      orderNumber: 6
    },
    {
      id: 13,
      ruleId: 'golden-cross-neg',
      ruleName: 'Death Cross',
      description: 'Triggers when 50-day MA crosses below 200-day MA indicating bearish trend',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['golden-cross-neg'],
      evaluationMethod: 'delta',
      evaluationLogic: 'negative',
      dataSource: 'historical_prices',
      orderNumber: 7
    },
    {
      id: 14,
      ruleId: 'sector-perf-pos',
      ruleName: 'Sector Outperformance',
      description: 'Triggers when sector outperforms broader market by specified percentage',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['sector-perf-pos'],
      evaluationMethod: 'percent',
      evaluationLogic: 'above',
      dataSource: 'market_indices',
      orderNumber: 8
    },
    {
      id: 15,
      ruleId: 'under-200ma',
      ruleName: 'Under 200-day Moving Average',
      description: 'Triggers when price falls below 200-day moving average by specified percentage',
      actionType: 'Decrease',
      thresholds: MATRIX_THRESHOLDS['under-200ma'],
      evaluationMethod: 'percent',
      evaluationLogic: 'below',
      dataSource: 'historical_prices',
      orderNumber: 9
    }
  ];

  return res.status(200).json(decreaseRules);
});

/**
 * GET /api/matrix-rules/Rating
 * Return rating change rules
 */
router.get('/Rating', (req, res) => {
  // Get ratingAction query parameter (Increase or Decrease)
  const { ratingAction } = req.query;
  
  if (ratingAction === 'Increase') {
    const ratingIncreaseRules = [
      {
        id: 16,
        ruleId: 'earnings-quality',
        ruleName: 'Earnings Quality',
        description: 'Triggers when earnings quality exceeds expectations for consecutive quarters',
        actionType: 'Rating',
        ratingAction: 'Increase',
        thresholds: MATRIX_THRESHOLDS['earnings-quality'],
        evaluationMethod: 'value',
        evaluationLogic: 'above',
        dataSource: 'earnings',
        orderNumber: 1
      },
      {
        id: 17,
        ruleId: 'ebitda-margin',
        ruleName: 'EBITDA Margin Improvement',
        description: 'Triggers when EBITDA margin improves by specified amount over consecutive quarters',
        actionType: 'Rating',
        ratingAction: 'Increase',
        thresholds: MATRIX_THRESHOLDS['ebitda-margin'],
        evaluationMethod: 'value',
        evaluationLogic: 'above',
        dataSource: 'earnings',
        orderNumber: 2
      },
      {
        id: 18,
        ruleId: 'roic-increase',
        ruleName: 'ROIC Improvement',
        description: 'Triggers when Return on Invested Capital improves by specified amount over time',
        actionType: 'Rating',
        ratingAction: 'Increase',
        thresholds: MATRIX_THRESHOLDS['roic-increase'],
        evaluationMethod: 'value',
        evaluationLogic: 'above',
        dataSource: 'earnings',
        orderNumber: 3
      },
      {
        id: 19,
        ruleId: 'debt-reduction',
        ruleName: 'Debt Reduction',
        description: 'Triggers when debt-to-EBITDA ratio decreases by specified amount',
        actionType: 'Rating',
        ratingAction: 'Increase',
        thresholds: MATRIX_THRESHOLDS['debt-reduction'],
        evaluationMethod: 'value',
        evaluationLogic: 'above',
        dataSource: 'earnings',
        orderNumber: 4
      }
    ];
    
    return res.status(200).json(ratingIncreaseRules);
  }
  else if (ratingAction === 'Decrease') {
    const ratingDecreaseRules = [
      {
        id: 20,
        ruleId: 'negative-quarters',
        ruleName: 'Consecutive Negative Quarters',
        description: 'Triggers when company reports specified number of consecutive negative earnings surprises',
        actionType: 'Rating',
        ratingAction: 'Decrease',
        thresholds: MATRIX_THRESHOLDS['negative-quarters'],
        evaluationMethod: 'value',
        evaluationLogic: 'below',
        dataSource: 'earnings',
        orderNumber: 1
      },
      {
        id: 21,
        ruleId: 'ebitda-margin-neg',
        ruleName: 'EBITDA Margin Deterioration',
        description: 'Triggers when EBITDA margin deteriorates by specified amount over consecutive quarters',
        actionType: 'Rating',
        ratingAction: 'Decrease',
        thresholds: MATRIX_THRESHOLDS['ebitda-margin-neg'],
        evaluationMethod: 'value',
        evaluationLogic: 'below',
        dataSource: 'earnings',
        orderNumber: 2
      },
      {
        id: 22,
        ruleId: 'roic-decrease',
        ruleName: 'ROIC Deterioration',
        description: 'Triggers when Return on Invested Capital deteriorates by specified amount over time',
        actionType: 'Rating',
        ratingAction: 'Decrease',
        thresholds: MATRIX_THRESHOLDS['roic-decrease'],
        evaluationMethod: 'value',
        evaluationLogic: 'below',
        dataSource: 'earnings',
        orderNumber: 3
      },
      {
        id: 23,
        ruleId: 'debt-increase',
        ruleName: 'Debt Increase',
        description: 'Triggers when debt-to-EBITDA ratio increases by specified amount',
        actionType: 'Rating',
        ratingAction: 'Decrease',
        thresholds: MATRIX_THRESHOLDS['debt-increase'],
        evaluationMethod: 'value',
        evaluationLogic: 'below',
        dataSource: 'earnings',
        orderNumber: 4
      }
    ];
    
    return res.status(200).json(ratingDecreaseRules);
  }
  
  // If no rating action specified, return all rating rules
  return res.status(200).json([]);
});

// GET alerts (mock implementation for now)
router.get('/alerts', (req, res) => {
  const mockAlerts = [
    {
      id: 1,
      symbol: 'MSFT',
      message: 'RSI below threshold',
      details: 'Current RSI(14): 29.8, Threshold: 30',
      severity: 'info',
      ruleType: 'rsi-low',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      symbol: 'AAPL',
      message: 'Price > 20% from 52-week high',
      details: 'Current: $208.65, 52wk high: $274.21 (-23.9%)',
      severity: 'warning',
      ruleType: 'price-52wk',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      symbol: 'META',
      message: 'MACD positive crossover',
      details: 'Signal line crossed by MACD line',
      severity: 'info',
      ruleType: 'macd-below',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];
  
  return res.status(200).json(mockAlerts);
});

export default router;
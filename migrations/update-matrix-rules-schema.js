/**
 * Migration to update matrix_rules table schema for enhanced rule engine
 * 
 * This script:
 * 1. Drops the existing matrix_rules table if it exists
 * 2. Creates a new matrix_rules table with enhanced fields for rule evaluation
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting migration: Update Matrix Rules Schema');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Initialize the database client
    const client = postgres(process.env.DATABASE_URL);
    const db = drizzle(client);

    // Check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'matrix_rules'
      );
    `);

    if (tableExists[0] && tableExists[0].exists) {
      console.log('Dropping existing matrix_rules table');
      await db.execute(sql`DROP TABLE IF EXISTS matrix_rules;`);
    }

    // Create the new matrix_rules table
    console.log('Creating new matrix_rules table');
    await db.execute(sql`
      CREATE TABLE matrix_rules (
        id SERIAL PRIMARY KEY,
        rule_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        description TEXT,
        action_type TEXT NOT NULL,
        rating_action TEXT,
        thresholds JSONB NOT NULL,
        evaluation_method TEXT NOT NULL,
        evaluation_logic TEXT NOT NULL,
        data_source TEXT NOT NULL,
        order_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on rule_id and action_type for fast lookups
    await db.execute(sql`
      CREATE INDEX matrix_rules_rule_id_idx ON matrix_rules (rule_id);
    `);

    await db.execute(sql`
      CREATE INDEX matrix_rules_action_type_idx ON matrix_rules (action_type);
    `);

    console.log('Successfully updated matrix_rules table schema');

    // Seed the table with initial rule data
    console.log('Seeding matrix_rules with initial data...');
    await seedMatrixRules(db);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Failed to update matrix_rules schema:', error);
    throw error;
  }
}

async function seedMatrixRules(db) {
  // Position Increase Rules
  const increaseRules = [
    {
      rule_id: 'price-52wk',
      rule_name: 'Price % vs 52-wk High',
      description: 'Triggers when current price is below 52-week high by specified percentage',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': '10%', '2': '15%', '3': '20%', '4': 'N/A' },
        Catalyst: { '1': '20%', '2': 'N/A', '3': 'N/A', '4': 'N/A' },
        Cyclical: { '1': '15%', '2': '20%', '3': 'N/A', '4': 'N/A' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'below',
      data_source: 'historical_prices',
      order_number: 1
    },
    {
      rule_id: 'rsi-low',
      rule_name: 'RSI Below Threshold',
      description: 'Triggers when 14-day RSI falls below specified value indicating oversold condition',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': '40', '2': '40', '3': '40', '4': 'N/A' },
        Catalyst: { '1': '30', '2': '30', '3': '30', '4': 'N/A' },
        Cyclical: { '1': '35', '2': '35', '3': '35', '4': 'N/A' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'below',
      data_source: 'rsi_data',
      order_number: 2
    },
    {
      rule_id: 'macd-below',
      rule_name: 'MACD Positive Crossover',
      description: 'Triggers when MACD line crosses above signal line indicating positive momentum shift',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' },
        Catalyst: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' },
        Cyclical: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' }
      },
      evaluation_method: 'delta',
      evaluation_logic: 'positive',
      data_source: 'macd_data',
      order_number: 3
    },
    {
      rule_id: 'golden-cross-pos',
      rule_name: 'Golden Cross',
      description: 'Triggers when 50-day MA crosses above 200-day MA indicating bullish trend',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' },
        Catalyst: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' },
        Cyclical: { '1': 'Δ POSITIVE', '2': 'Δ POSITIVE', '3': 'Δ POSITIVE', '4': 'N/A' }
      },
      evaluation_method: 'delta',
      evaluation_logic: 'positive',
      data_source: 'historical_prices',
      order_number: 4
    },
    {
      rule_id: 'sector-perf-neg',
      rule_name: 'Sector Underperformance',
      description: 'Triggers when sector underperforms broader market by specified percentage',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': '-10%', '2': '-15%', '3': '-15%', '4': 'N/A' },
        Catalyst: { '1': '-20%', '2': '-20%', '3': '-20%', '4': 'N/A' },
        Cyclical: { '1': '-15%', '2': '-15%', '3': '-15%', '4': 'N/A' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'below',
      data_source: 'market_indices',
      order_number: 5
    },
    {
      rule_id: 'at-200ma',
      rule_name: 'At 200-day Moving Average',
      description: 'Triggers when price is near 200-day moving average indicating potential support',
      action_type: 'Increase',
      thresholds: {
        Compounder: { '1': '+/- 2.5%', '2': '+/- 2.5%', '3': '+/- 2.5%', '4': 'N/A' },
        Catalyst: { '1': 'N/A', '2': 'N/A', '3': 'N/A', '4': 'N/A' },
        Cyclical: { '1': '+/- 2.5%', '2': '+/- 2.5%', '3': 'N/A', '4': 'N/A' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'at',
      data_source: 'historical_prices',
      order_number: 6
    }
  ];

  // Position Decrease Rules
  const decreaseRules = [
    {
      rule_id: 'price-90day',
      rule_name: '90-day Price Increase',
      description: 'Triggers when price increases by specified percentage over 90 days',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '25%', '3': '25%', '4': '20%' },
        Catalyst: { '1': '25%', '2': '20%', '3': '15%', '4': '20%' },
        Cyclical: { '1': '25%', '2': '20%', '3': '15%', '4': '20%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'above',
      data_source: 'historical_prices',
      order_number: 1
    },
    {
      rule_id: 'max-weight',
      rule_name: 'Maximum Position Weight',
      description: 'Triggers when position weight exceeds specified percentage of portfolio',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': '8%', '2': '8%', '3': '5%', '4': '4%' },
        Catalyst: { '1': '6%', '2': '4%', '3': '4%', '4': '4%' },
        Cyclical: { '1': '6%', '2': '6%', '3': '4%', '4': '4%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'above',
      data_source: 'portfolio',
      order_number: 2
    },
    {
      rule_id: 'max-weight-intl',
      rule_name: 'Maximum INTL Position Weight',
      description: 'Triggers when position weight exceeds specified percentage for international stocks',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': '10%', '2': '10%', '3': '7%', '4': '6%' },
        Catalyst: { '1': '8%', '2': '6%', '3': '6%', '4': '6%' },
        Cyclical: { '1': '8%', '2': '8%', '3': '6%', '4': '6%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'above',
      data_source: 'portfolio',
      order_number: 3
    },
    {
      rule_id: 'active-risk',
      rule_name: 'Active Risk Threshold',
      description: 'Triggers when active risk vs benchmark exceeds specified percentage',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': 'N/A', '3': 'N/A', '4': 'N/A' },
        Catalyst: { '1': '4%', '2': '4%', '3': '4%', '4': '4%' },
        Cyclical: { '1': '5%', '2': '5%', '3': '5%', '4': '5%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'above',
      data_source: 'portfolio',
      order_number: 4
    },
    {
      rule_id: 'rsi-high',
      rule_name: 'RSI Above Threshold',
      description: 'Triggers when 14-day RSI rises above specified value indicating overbought condition',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '70', '3': '70', '4': '70' },
        Catalyst: { '1': '60', '2': '60', '3': '60', '4': '60' },
        Cyclical: { '1': '70', '2': '70', '3': '70', '4': '70' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'above',
      data_source: 'rsi_data',
      order_number: 5
    },
    {
      rule_id: 'macd-above',
      rule_name: 'MACD Negative Crossover',
      description: 'Triggers when MACD line crosses below signal line indicating negative momentum shift',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' },
        Catalyst: { '1': 'Δ NEGATIVE', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' },
        Cyclical: { '1': 'Δ NEGATIVE', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' }
      },
      evaluation_method: 'delta',
      evaluation_logic: 'negative',
      data_source: 'macd_data',
      order_number: 6
    },
    {
      rule_id: 'golden-cross-neg',
      rule_name: 'Death Cross',
      description: 'Triggers when 50-day MA crosses below 200-day MA indicating bearish trend',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' },
        Catalyst: { '1': 'Δ NEGATIVE', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' },
        Cyclical: { '1': 'Δ NEGATIVE', '2': 'Δ NEGATIVE', '3': 'Δ NEGATIVE', '4': 'Δ NEGATIVE' }
      },
      evaluation_method: 'delta',
      evaluation_logic: 'negative',
      data_source: 'historical_prices',
      order_number: 7
    },
    {
      rule_id: 'sector-perf-pos',
      rule_name: 'Sector Outperformance',
      description: 'Triggers when sector outperforms broader market by specified percentage',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '10%', '3': '15%', '4': '15%' },
        Catalyst: { '1': '20%', '2': '20%', '3': '20%', '4': '20%' },
        Cyclical: { '1': '15%', '2': '15%', '3': '15%', '4': '15%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'above',
      data_source: 'market_indices',
      order_number: 8
    },
    {
      rule_id: 'under-200ma',
      rule_name: 'Under 200-day Moving Average',
      description: 'Triggers when price falls below 200-day moving average by specified percentage',
      action_type: 'Decrease',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '- 5%', '3': '- 5%', '4': 'N/A' },
        Catalyst: { '1': '- 5%', '2': '- 5%', '3': '- 5%', '4': '- 5%' },
        Cyclical: { '1': '- 5%', '2': '- 5%', '3': '- 5%', '4': '- 5%' }
      },
      evaluation_method: 'percent',
      evaluation_logic: 'below',
      data_source: 'historical_prices',
      order_number: 9
    }
  ];

  // Rating Increase Rules
  const ratingIncreaseRules = [
    {
      rule_id: 'earnings-quality',
      rule_name: 'Earnings Quality',
      description: 'Triggers when earnings quality exceeds expectations for consecutive quarters',
      action_type: 'Rating',
      rating_action: 'Increase',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '5', '3': '5', '4': '5' },
        Catalyst: { '1': 'N/A', '2': '5', '3': '5', '4': '5' },
        Cyclical: { '1': 'N/A', '2': '5', '3': '5', '4': '5' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'above',
      data_source: 'earnings',
      order_number: 1
    },
    {
      rule_id: 'ebitda-margin',
      rule_name: 'EBITDA Margin Improvement',
      description: 'Triggers when EBITDA margin improves by specified amount over consecutive quarters',
      action_type: 'Rating',
      rating_action: 'Increase',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Catalyst: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Cyclical: { '1': 'N/A', '2': '4', '3': '3', '4': '2' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'above',
      data_source: 'earnings',
      order_number: 2
    },
    {
      rule_id: 'roic-increase',
      rule_name: 'ROIC Improvement',
      description: 'Triggers when Return on Invested Capital improves by specified amount over time',
      action_type: 'Rating',
      rating_action: 'Increase',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Catalyst: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Cyclical: { '1': 'N/A', '2': '4', '3': '3', '4': '2' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'above',
      data_source: 'earnings',
      order_number: 3
    },
    {
      rule_id: 'debt-reduction',
      rule_name: 'Debt Reduction',
      description: 'Triggers when debt-to-EBITDA ratio decreases by specified amount',
      action_type: 'Rating',
      rating_action: 'Increase',
      thresholds: {
        Compounder: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Catalyst: { '1': 'N/A', '2': '4', '3': '3', '4': '2' },
        Cyclical: { '1': 'N/A', '2': '4', '3': '3', '4': '2' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'above',
      data_source: 'earnings',
      order_number: 4
    }
  ];

  // Rating Decrease Rules
  const ratingDecreaseRules = [
    {
      rule_id: 'negative-quarters',
      rule_name: 'Consecutive Negative Quarters',
      description: 'Triggers when company reports specified number of consecutive negative earnings surprises',
      action_type: 'Rating',
      rating_action: 'Decrease',
      thresholds: {
        Compounder: { '1': '-4', '2': '-4', '3': '-4', '4': 'N/A' },
        Catalyst: { '1': '-4', '2': '-4', '3': '-4', '4': 'N/A' },
        Cyclical: { '1': '-4', '2': '-4', '3': '-4', '4': 'N/A' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'below',
      data_source: 'earnings',
      order_number: 1
    },
    {
      rule_id: 'ebitda-margin-neg',
      rule_name: 'EBITDA Margin Deterioration',
      description: 'Triggers when EBITDA margin deteriorates by specified amount over consecutive quarters',
      action_type: 'Rating',
      rating_action: 'Decrease',
      thresholds: {
        Compounder: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Catalyst: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Cyclical: { '1': '3', '2': '2', '3': '2', '4': 'N/A' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'below',
      data_source: 'earnings',
      order_number: 2
    },
    {
      rule_id: 'roic-decrease',
      rule_name: 'ROIC Deterioration',
      description: 'Triggers when Return on Invested Capital deteriorates by specified amount over time',
      action_type: 'Rating',
      rating_action: 'Decrease',
      thresholds: {
        Compounder: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Catalyst: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Cyclical: { '1': '3', '2': '2', '3': '2', '4': 'N/A' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'below',
      data_source: 'earnings',
      order_number: 3
    },
    {
      rule_id: 'debt-increase',
      rule_name: 'Debt Increase',
      description: 'Triggers when debt-to-EBITDA ratio increases by specified amount',
      action_type: 'Rating',
      rating_action: 'Decrease',
      thresholds: {
        Compounder: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Catalyst: { '1': '3', '2': '2', '3': '2', '4': 'N/A' },
        Cyclical: { '1': '3', '2': '2', '3': '2', '4': 'N/A' }
      },
      evaluation_method: 'value',
      evaluation_logic: 'below',
      data_source: 'earnings',
      order_number: 4
    }
  ];

  // Combine all rule types
  const allRules = [
    ...increaseRules,
    ...decreaseRules,
    ...ratingIncreaseRules,
    ...ratingDecreaseRules
  ];

  // Insert each rule
  for (const rule of allRules) {
    await db.execute(sql`
      INSERT INTO matrix_rules (
        rule_id, rule_name, description, action_type, rating_action,
        thresholds, evaluation_method, evaluation_logic, data_source, order_number
      ) VALUES (
        ${rule.rule_id}, ${rule.rule_name}, ${rule.description}, ${rule.action_type}, ${rule.rating_action},
        ${JSON.stringify(rule.thresholds)}::jsonb, ${rule.evaluation_method}, ${rule.evaluation_logic}, 
        ${rule.data_source}, ${rule.order_number}
      );
    `);
  }

  console.log(`Successfully seeded ${allRules.length} matrix rules`);
}

// Run the migration
runMigration().catch(console.error);
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { matrixRules } from '../shared/schema';

// Function to clean up data values
function cleanValue(value: string): string | null {
  if (!value || value === ' ' || value === '-' || value === 'N/A' || value === '#N/A') {
    return null;
  }
  
  // Strip quotes and trim
  return value.replace(/"/g, '').trim();
}

// Function to parse a number or return null
function parseNumber(value: string | null): number | null {
  if (!value) return null;
  
  // Handle percentage values
  if (value.includes('%')) {
    value = value.replace('%', '');
  }
  
  // Handle delta indicators
  if (value === 'Δ POSITIVE') return 1;
  if (value === 'Δ NEGATIVE') return -1;
  
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importMatrixRules() {
  console.log('Importing matrix decision rules...');
  
  // Clear existing data
  await db.delete(matrixRules);
  
  // Manually create rules based on the CSV structure
  const rules = [
    // Increase position rules - "Price % vs 52-wk Hi"
    {
      ruleType: 'Price % vs 52-wk Hi',
      actionType: 'increase_position',
      stockType: 'Comp',
      ratingOrder: 1,
      value: '10%',
      numericValue: 10
    },
    {
      ruleType: 'Price % vs 52-wk Hi',
      actionType: 'increase_position',
      stockType: 'Cat',
      ratingOrder: 1,
      value: '20%',
      numericValue: 20
    },
    {
      ruleType: 'Price % vs 52-wk Hi',
      actionType: 'increase_position',
      stockType: 'Cycl',
      ratingOrder: 1,
      value: '15%',
      numericValue: 15
    },
    
    // RSI rules for increasing position
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockType: 'Comp',
      ratingOrder: 1,
      value: '40',
      numericValue: 40
    },
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockType: 'Cat',
      ratingOrder: 1,
      value: '30',
      numericValue: 30
    },
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockType: 'Cycl',
      ratingOrder: 1,
      value: '35',
      numericValue: 35
    },
    
    // MACD rules for increasing position
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockType: 'Comp',
      ratingOrder: 1,
      value: 'Δ POSITIVE',
      numericValue: 1
    },
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockType: 'Cat',
      ratingOrder: 1,
      value: 'Δ POSITIVE',
      numericValue: 1
    },
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockType: 'Cycl',
      ratingOrder: 1,
      value: 'Δ POSITIVE',
      numericValue: 1
    },
    
    // Decrease position rules - "Price performance % - 90 day"
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockType: 'Comp',
      ratingOrder: 2,
      value: '25%',
      numericValue: 25
    },
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockType: 'Cat',
      ratingOrder: 2,
      value: '20%',
      numericValue: 20
    },
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockType: 'Cycl',
      ratingOrder: 2,
      value: '20%',
      numericValue: 20
    },
    
    // Max portfolio weight rules - USD
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockType: 'Comp',
      ratingOrder: 1,
      value: '8%',
      numericValue: 8
    },
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockType: 'Cat',
      ratingOrder: 1,
      value: '6%',
      numericValue: 6
    },
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockType: 'Cycl',
      ratingOrder: 1,
      value: '6%',
      numericValue: 6
    },
    
    // Max portfolio weight rules - INTL
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockType: 'Comp',
      ratingOrder: 1,
      value: '10%',
      numericValue: 10
    },
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockType: 'Cat',
      ratingOrder: 1,
      value: '8%',
      numericValue: 8
    },
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockType: 'Cycl',
      ratingOrder: 1,
      value: '8%',
      numericValue: 8
    },
    
    // RSI rules for decreasing position
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockType: 'Comp',
      ratingOrder: 2,
      value: '70',
      numericValue: 70
    },
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockType: 'Cat',
      ratingOrder: 2,
      value: '60',
      numericValue: 60
    },
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockType: 'Cycl',
      ratingOrder: 2,
      value: '70',
      numericValue: 70
    },
    
    // MACD rules for decreasing position
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockType: 'Comp',
      ratingOrder: 2,
      value: 'Δ NEGATIVE',
      numericValue: -1
    },
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockType: 'Cat',
      ratingOrder: 2,
      value: 'Δ NEGATIVE',
      numericValue: -1
    },
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockType: 'Cycl',
      ratingOrder: 2,
      value: 'Δ NEGATIVE',
      numericValue: -1
    }
  ];
  
  // Insert all rules
  for (const rule of rules) {
    await db.insert(matrixRules).values(rule);
  }
  
  console.log(`Imported ${rules.length} matrix rules.`);
}

async function main() {
  try {
    await importMatrixRules();
    console.log('Matrix rules imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing matrix rules:', error);
    process.exit(1);
  }
}

main();
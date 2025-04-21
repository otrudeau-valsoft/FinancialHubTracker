import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { matrixRules } from '../shared/schema';

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
      stockTypeValue: { Comp: '10%', Cat: '20%', Cycl: '15%' },
      orderNumber: 1
    },
    {
      ruleType: 'Price % vs 52-wk Hi',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '15%', Cat: null, Cycl: '20%' },
      orderNumber: 2
    },
    {
      ruleType: 'Price % vs 52-wk Hi',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '20%', Cat: null, Cycl: null },
      orderNumber: 3
    },
    
    // RSI rules for increasing position
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '40', Cat: '30', Cycl: '35' },
      orderNumber: 1
    },
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '40', Cat: '30', Cycl: '35' },
      orderNumber: 2
    },
    {
      ruleType: 'RSI',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '40', Cat: '30', Cycl: '35' },
      orderNumber: 3
    },
    
    // MACD rules for increasing position
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockTypeValue: { Comp: 'Δ POSITIVE', Cat: 'Δ POSITIVE', Cycl: 'Δ POSITIVE' },
      orderNumber: 1
    },
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockTypeValue: { Comp: 'Δ POSITIVE', Cat: 'Δ POSITIVE', Cycl: 'Δ POSITIVE' },
      orderNumber: 2
    },
    {
      ruleType: 'MACD- below zero line',
      actionType: 'increase_position',
      stockTypeValue: { Comp: 'Δ POSITIVE', Cat: 'Δ POSITIVE', Cycl: 'Δ POSITIVE' },
      orderNumber: 3
    },
    
    // Golden Cross rules for increasing position
    {
      ruleType: 'Golden Cross (positive)',
      actionType: 'increase_position',
      stockTypeValue: { Comp: 'Δ POSITIVE', Cat: 'Δ POSITIVE', Cycl: 'Δ POSITIVE' },
      orderNumber: 1
    },
    
    // Peformance diff. % with sector for increasing position
    {
      ruleType: 'Peformance diff. % with sector',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '-10%', Cat: '-20%', Cycl: '-15%' },
      orderNumber: 1
    },
    
    // On 200 MA for increasing position
    {
      ruleType: 'On 200 MA',
      actionType: 'increase_position',
      stockTypeValue: { Comp: '+/- 2.5%', Cat: null, Cycl: '+/- 2.5%' },
      orderNumber: 1
    },
    
    // Decrease position rules - "Price performance % - 90 day"
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: null, Cat: '25%', Cycl: '25%' },
      orderNumber: 1
    },
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '25%', Cat: '20%', Cycl: '20%' },
      orderNumber: 2
    },
    {
      ruleType: 'Price performance % - 90 day',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '25%', Cat: '15%', Cycl: '15%' },
      orderNumber: 3
    },
    
    // Max portfolio weight rules - USD
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '8%', Cat: '6%', Cycl: '6%' },
      orderNumber: 1
    },
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '8%', Cat: '4%', Cycl: '6%' },
      orderNumber: 2
    },
    {
      ruleType: 'Max PTF weight % - CROISS & SPEC',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '5%', Cat: '4%', Cycl: '4%' },
      orderNumber: 3
    },
    
    // Max portfolio weight rules - INTL
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '10%', Cat: '8%', Cycl: '8%' },
      orderNumber: 1
    },
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '10%', Cat: '6%', Cycl: '8%' },
      orderNumber: 2
    },
    {
      ruleType: 'Max PTF weight % - INTL',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '7%', Cat: '6%', Cycl: '6%' },
      orderNumber: 3
    },
    
    // RSI rules for decreasing position
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: null, Cat: '60', Cycl: '70' },
      orderNumber: 1
    },
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '70', Cat: '60', Cycl: '70' },
      orderNumber: 2
    },
    {
      ruleType: 'RSI',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '70', Cat: '60', Cycl: '70' },
      orderNumber: 3
    },
    
    // MACD rules for decreasing position
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: null, Cat: 'Δ NEGATIVE', Cycl: 'Δ NEGATIVE' },
      orderNumber: 1
    },
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: 'Δ NEGATIVE', Cat: 'Δ NEGATIVE', Cycl: 'Δ NEGATIVE' },
      orderNumber: 2
    },
    {
      ruleType: 'MACD- above zero line',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: 'Δ NEGATIVE', Cat: 'Δ NEGATIVE', Cycl: 'Δ NEGATIVE' },
      orderNumber: 3
    },
    
    // Under 200 MA for decreasing position
    {
      ruleType: 'Under 200 MA',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: null, Cat: '- 5%', Cycl: '- 5%' },
      orderNumber: 1
    },
    {
      ruleType: 'Under 200 MA',
      actionType: 'decrease_position',
      stockTypeValue: { Comp: '- 5%', Cat: '- 5%', Cycl: '- 5%' },
      orderNumber: 2
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
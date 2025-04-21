import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
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
  
  // Handle positive/negative indicators
  if (value === 'Δ POSITIVE') return 1;
  if (value === 'Δ NEGATIVE') return -1;
  
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

interface RuleSection {
  actionType: string;
  ruleType: string;
  rules: any[][];
}

async function importMatrixRules() {
  console.log('Importing matrix decision rules...');
  const filePath = path.join(process.cwd(), 'attached_assets', 'Matrices decisionnelles.csv');
  
  if (!fs.existsSync(filePath)) {
    console.log('Matrix rules file not found.');
    return;
  }
  
  // Read the file content
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const lines = fileContent.split('\n');
  
  // Clear existing data
  await db.delete(matrixRules);
  
  // Parse the CSV to extract rule sections
  const sections: RuleSection[] = [];
  let currentSection: RuleSection | null = null;
  let headerRow: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Detect action type sections
    if (line.includes('Increase position') || line.includes('Decrease position') || 
        line.includes('Increase rating') || line.includes('Decrease rating')) {
      const actionType = line.toLowerCase();
      i++; // Skip the next empty line
      continue;
    }
    
    // Detect rule type sections
    if (!line.startsWith(',') && !line.startsWith('Ordre #') && line !== 'Price Action Matrices' && 
        line !== 'Rating Changes' && !line.includes('point grading system') && line.length > 0) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        actionType: line.includes('price') || line.includes('RSI') || line.includes('MACD') || 
                  line.includes('Cross') || line.includes('Performance') || line.includes('MA') || 
                  line.includes('weight') ? 'position_change' : 'rating_change',
        ruleType: line,
        rules: []
      };
      continue;
    }
    
    // Parse the header row with stock types
    if (line.startsWith('Ordre #')) {
      headerRow = line.split(',');
      continue;
    }
    
    // Parse rule rows
    if (line.startsWith('1,') || line.startsWith('2,') || line.startsWith('3,') || line.startsWith('4,')) {
      if (currentSection) {
        currentSection.rules.push(line.split(','));
      }
    }
  }
  
  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Process all the rule sections and insert them into the database
  for (const section of sections) {
    const { actionType, ruleType, rules } = section;
    
    for (const row of rules) {
      const ratingOrder = parseInt(row[0]);
      
      // Skip if order is not a number
      if (isNaN(ratingOrder)) continue;
      
      // Extract values for different stock types
      const compounderValue = cleanValue(row[1]);
      const catalystValue = cleanValue(row[2]);
      const cyclicalValue = cleanValue(row[3]);
      
      // Insert rules for each stock type if they have a value
      if (compounderValue) {
        await db.insert(matrixRules).values({
          ruleType,
          actionType,
          stockType: 'Comp',
          ratingOrder,
          value: compounderValue,
          numericValue: parseNumber(compounderValue)
        });
      }
      
      if (catalystValue) {
        await db.insert(matrixRules).values({
          ruleType,
          actionType,
          stockType: 'Cat',
          ratingOrder,
          value: catalystValue,
          numericValue: parseNumber(catalystValue)
        });
      }
      
      if (cyclicalValue) {
        await db.insert(matrixRules).values({
          ruleType,
          actionType,
          stockType: 'Cycl',
          ratingOrder,
          value: cyclicalValue,
          numericValue: parseNumber(cyclicalValue)
        });
      }
    }
  }
  
  // Count the number of rules imported
  const count = await db
    .select({ count: matrixRules.id })
    .from(matrixRules)
    .then(result => result.length);
  
  console.log(`Imported ${count} matrix rules.`);
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
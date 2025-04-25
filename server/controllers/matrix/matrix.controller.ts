import { Request, Response } from 'express';
import { storage } from '../../db-storage';
import { z } from 'zod';

/**
 * Get matrix rules by action type
 */
export const getMatrixRules = async (req: Request, res: Response) => {
  const { actionType } = req.params;
  const rules = await storage.getMatrixRules(actionType);
  return res.json(rules);
};

/**
 * Create a matrix rule
 */
export const createMatrixRule = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      actionType: z.string(),
      ruleType: z.string(),
      baseSymbol: z.string(),
      comparisonSymbol: z.string().nullable().optional(),
      operator: z.string(),
      value: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      timeframe: z.string().nullable().optional(),
      priority: z.number().int().nullable().optional()
    });
    
    const validData = schema.parse(req.body);
    const rule = await storage.createMatrixRule(validData);
    
    return res.status(201).json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};

/**
 * Bulk import matrix rules
 */
export const bulkImportMatrixRules = async (req: Request, res: Response) => {
  if (!req.body.rules || !Array.isArray(req.body.rules)) {
    return res.status(400).json({ message: "Invalid rules data - expected an array" });
  }
  
  try {
    const schema = z.object({
      actionType: z.string(),
      ruleType: z.string(),
      baseSymbol: z.string(),
      comparisonSymbol: z.string().nullable().optional(),
      operator: z.string(),
      value: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      timeframe: z.string().nullable().optional(),
      priority: z.number().int().nullable().optional()
    });
    
    const validRules = req.body.rules.map(rule => schema.parse(rule));
    const results = await storage.bulkImportMatrixRules(validRules);
    
    return res.json({
      message: "Matrix rules imported successfully",
      count: results.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};
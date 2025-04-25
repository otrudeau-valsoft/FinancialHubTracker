import { Request, Response } from 'express';
import { storage } from '../../storage';
import { z } from 'zod';

/**
 * Get all alerts
 */
export const getAlerts = async (req: Request, res: Response) => {
  const { isActive, symbol, region } = req.query;
  
  let filters: any = {};
  
  if (isActive !== undefined) {
    filters.isActive = isActive === 'true';
  }
  
  if (symbol) {
    filters.symbol = symbol as string;
  }
  
  if (region) {
    filters.region = (region as string).toUpperCase();
  }
  
  const alerts = await storage.getAlerts(filters);
  return res.json(alerts);
};

/**
 * Create a new alert
 */
export const createAlert = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      symbol: z.string(),
      region: z.string(),
      alertType: z.string(),
      message: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      isActive: z.boolean().default(true),
      expiresAt: z.string().nullable().optional(),
      notes: z.string().nullable().optional()
    });
    
    const validData = schema.parse(req.body);
    validData.region = validData.region.toUpperCase();
    
    const alert = await storage.createAlert(validData);
    return res.status(201).json(alert);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};

/**
 * Update an alert
 */
export const updateAlert = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const schema = z.object({
      symbol: z.string().optional(),
      region: z.string().optional(),
      alertType: z.string().optional(),
      message: z.string().optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().nullable().optional(),
      notes: z.string().nullable().optional()
    });
    
    const validData = schema.parse(req.body);
    
    if (validData.region) {
      validData.region = validData.region.toUpperCase();
    }
    
    const alert = await storage.updateAlert(parseInt(id), validData);
    
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    
    return res.json(alert);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    
    throw error;
  }
};
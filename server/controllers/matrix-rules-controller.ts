import { Request, Response } from "express";
import { db } from "../db";
import { matrixRules } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get matrix rules by action type 
 */
export const getMatrixRulesByActionType = async (req: Request, res: Response) => {
  try {
    const { actionType } = req.params;
    
    if (!actionType) {
      return res.status(400).json({
        status: "error",
        error: {
          message: "Action type is required"
        }
      });
    }
    
    // If actionType is "Rating", we need to also filter by ratingAction if provided
    const { ratingAction } = req.query;
    
    let result;
    
    if (actionType === "Rating" && ratingAction) {
      result = await db.select().from(matrixRules)
        .where(and(
          eq(matrixRules.actionType, actionType),
          eq(matrixRules.ratingAction, ratingAction as string)
        ))
        .orderBy(matrixRules.orderNumber);
    } else {
      result = await db.select().from(matrixRules)
        .where(eq(matrixRules.actionType, actionType))
        .orderBy(matrixRules.orderNumber);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting matrix rules:", error);
    return res.status(500).json({
      status: "error",
      error: {
        statusCode: 500,
        status: "error",
        message: "Failed to retrieve matrix rules"
      }
    });
  }
};

/**
 * Get all matrix rules
 */
export const getAllMatrixRules = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(matrixRules).orderBy(matrixRules.actionType, matrixRules.orderNumber);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error getting all matrix rules:", error);
    return res.status(500).json({
      status: "error",
      error: {
        statusCode: 500,
        status: "error",
        message: "Failed to retrieve all matrix rules"
      }
    });
  }
};

/**
 * Get matrix rule by ID
 */
export const getMatrixRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        status: "error",
        error: {
          message: "Rule ID is required"
        }
      });
    }
    
    const result = await db.select().from(matrixRules).where(eq(matrixRules.id, parseInt(id)));
    
    if (result.length === 0) {
      return res.status(404).json({
        status: "error",
        error: {
          message: `Matrix rule with ID ${id} not found`
        }
      });
    }
    
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error getting matrix rule by ID:", error);
    return res.status(500).json({
      status: "error",
      error: {
        statusCode: 500,
        status: "error",
        message: "Failed to retrieve matrix rule"
      }
    });
  }
};
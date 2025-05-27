import { Router, Request, Response } from 'express';
import { db } from '../db';
import { transactions, insertTransactionSchema } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Create a new transaction
export async function createTransaction(req: Request, res: Response) {
  try {
    console.log('Raw request body:', req.body);
    
    // Convert string values to correct types before validation
    const processedData = {
      ...req.body,
      quantity: parseInt(req.body.quantity),
      price: parseFloat(req.body.price),
      totalValue: parseFloat(req.body.totalValue)
    };
    
    console.log('Processed data before validation:', processedData);
    
    const validatedData = insertTransactionSchema.parse(processedData);
    
    console.log('Successfully validated data:', validatedData);
    
    const [transaction] = await db
      .insert(transactions)
      .values(validatedData)
      .returning();
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to create transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get all transactions for a region
export async function getTransactionsByRegion(req: Request, res: Response) {
  try {
    const { region } = req.params;
    
    const regionTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.region, region))
      .orderBy(desc(transactions.createdAt));
    
    res.json(regionTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get all transactions
export async function getAllTransactions(req: Request, res: Response) {
  try {
    const allTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
    
    res.json(allTransactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get transactions for a specific symbol
export async function getTransactionsBySymbol(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    
    const symbolTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.symbol, symbol))
      .orderBy(desc(transactions.createdAt));
    
    res.json(symbolTransactions);
  } catch (error) {
    console.error('Error fetching symbol transactions:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch symbol transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Set up routes
router.post('/', createTransaction);
router.get('/region/:region', getTransactionsByRegion);
router.get('/symbol/:symbol', getTransactionsBySymbol);
router.get('/', getAllTransactions);

export default router;
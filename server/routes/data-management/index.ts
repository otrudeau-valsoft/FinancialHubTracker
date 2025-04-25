import { Router, Request, Response, NextFunction } from 'express';
import populateDataRoutes from './populate-data.routes';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';

// Simple async handler middleware to avoid try/catch blocks in route handlers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = Router();

// Register data management sub-routes
router.use('/populate-data', populateDataRoutes);

// Get database status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check if database is accessible using raw pool query
    const result = await pool.query('SELECT current_timestamp');
    
    return res.json({
      status: 'success',
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString(),
      dbTimestamp: result.rows[0].current_timestamp
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

// Get available tables
router.get('/tables', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Query to get all tables in the public schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    return res.json({
      status: 'success',
      count: result.rowCount,
      tables: result.rows.map((row) => row.table_name)
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching database tables',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

// Clear data from a specific table
router.delete('/clear/:table', asyncHandler(async (req: Request, res: Response) => {
  const { table } = req.params;
  
  try {
    // First verify the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [table]);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(400).json({
        status: 'error',
        message: `Table does not exist: ${table}`
      });
    }
    
    // If table exists, truncate it
    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
    
    return res.json({
      status: 'success',
      message: `Successfully cleared table: ${table}`
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: `Error clearing table: ${table}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

// Get database schema information
router.get('/schema', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Query column information for all tables
    const result = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public'
      ORDER BY 
        table_name, ordinal_position
    `);
    
    // Organize the data by table
    const schema: Record<string, any[]> = {};
    result.rows.forEach((row) => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    });
    
    return res.json({
      status: 'success',
      tableCount: Object.keys(schema).length,
      schema
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching database schema',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

// Get table schema and sample data
router.get('/table/:table', asyncHandler(async (req: Request, res: Response) => {
  const { table } = req.params;
  
  try {
    // First verify the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [table]);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(400).json({
        status: 'error',
        message: `Table does not exist: ${table}`
      });
    }
    
    // Get table columns
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_schema = 'public'
        AND table_name = $1
      ORDER BY 
        ordinal_position
    `, [table]);
    
    // Get row count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM "${table}"
    `);
    
    // Get sample data (first 10 rows)
    const sampleResult = await pool.query(`
      SELECT * FROM "${table}" LIMIT 10
    `);
    
    return res.json({
      status: 'success',
      table,
      totalRows: parseInt(countResult.rows[0].count, 10),
      columns: columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      })),
      sampleData: sampleResult.rows
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: `Error fetching table info: ${table}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}));

export default router;
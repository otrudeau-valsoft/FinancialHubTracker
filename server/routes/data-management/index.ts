import { Router } from 'express';
import { db, pool } from '../../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Health check endpoint for data management routes
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT 1 as test`);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      testQuery: result
    });
  } catch (error) {
    console.error('Data management health check failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get available tables
router.get('/tables', async (req, res) => {
  try {
    // Query to get all tables in the public schema
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map((row: any) => row.table_name);
    
    res.json({
      status: 'success',
      tables,
      count: tables.length
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch database tables',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
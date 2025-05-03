/**
 * Economic Calendar Routes
 * Define API endpoints for the economic calendar
 */

import { Router } from 'express';
import * as economicCalendarController from '../../controllers/economic-calendar/economic-calendar.controller';

const router = Router();

// Get current month's economic calendar
router.get('/current', economicCalendarController.getCurrentMonthCalendar);

// Get economic calendar for specific date range
router.get('/', economicCalendarController.getCalendarForDateRange);

export default router;
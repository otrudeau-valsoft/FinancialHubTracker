import CronParser from 'cron-parser';

console.log('Testing parseExpression as static method...');

const schedules = [
  '*/15 9-16 * * 1-5',
  '0 17 * * 1-5',
  '0 18 * * 0',
  '30 9 * * 1-5'
];

schedules.forEach(schedule => {
  try {
    const interval = CronParser.parseExpression(schedule, {
      tz: 'America/New_York'
    });
    const nextRun = interval.next().toDate();
    console.log(`✓ Schedule: ${schedule} - Next Run: ${nextRun}`);
  } catch (error) {
    console.error(`✗ Error parsing: ${schedule} - ${error.message}`);
  }
});

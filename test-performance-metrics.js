import { performanceService } from './server/services/performance-calculation-service.js';

async function testPerformanceMetrics() {
  console.log('🧪 TESTING PERFORMANCE METRICS CALCULATION');
  console.log('==========================================');
  
  try {
    // Test with a few sample symbols from USD portfolio
    const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];
    const testRegion = 'USD';
    
    console.log(`📊 Testing symbols: ${testSymbols.join(', ')}`);
    console.log(`🌍 Region: ${testRegion}`);
    console.log('');
    
    // Call the performance calculation service
    const startTime = Date.now();
    const results = await performanceService.calculateBatchPerformanceMetrics(testSymbols, testRegion);
    const endTime = Date.now();
    
    console.log(`⏱️  Calculation took: ${endTime - startTime}ms`);
    console.log('');
    
    // Display results
    console.log('📈 RESULTS:');
    console.log('===========');
    
    for (const symbol of testSymbols) {
      const metrics = results[symbol];
      console.log(`\n${symbol}:`);
      console.log(`  MTD Return: ${metrics?.mtdReturn !== undefined ? metrics.mtdReturn.toFixed(2) + '%' : 'N/A'}`);
      console.log(`  YTD Return: ${metrics?.ytdReturn !== undefined ? metrics.ytdReturn.toFixed(2) + '%' : 'N/A'}`);
      console.log(`  6M Return:  ${metrics?.sixMonthReturn !== undefined ? metrics.sixMonthReturn.toFixed(2) + '%' : 'N/A'}`);
      console.log(`  52W Return: ${metrics?.fiftyTwoWeekReturn !== undefined ? metrics.fiftyTwoWeekReturn.toFixed(2) + '%' : 'N/A'}`);
    }
    
    // Check if MTD and YTD are different (the main issue)
    console.log('\n🔍 VALIDATION CHECKS:');
    console.log('====================');
    
    for (const symbol of testSymbols) {
      const metrics = results[symbol];
      if (metrics?.mtdReturn !== undefined && metrics?.ytdReturn !== undefined) {
        const mtdYtdDifferent = Math.abs(metrics.mtdReturn - metrics.ytdReturn) > 0.01;
        console.log(`${symbol}: MTD vs YTD different? ${mtdYtdDifferent ? '✅ YES' : '❌ NO'}`);
        if (!mtdYtdDifferent) {
          console.log(`  MTD: ${metrics.mtdReturn.toFixed(4)}%, YTD: ${metrics.ytdReturn.toFixed(4)}%`);
        }
      } else {
        console.log(`${symbol}: ❌ Missing performance data`);
      }
    }
    
    console.log('\n✅ TEST COMPLETED');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  }
}

// Run the test
testPerformanceMetrics().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ FATAL ERROR:', error);
  process.exit(1);
});
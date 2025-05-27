// Quick test to verify performance metrics work
import('dotenv/config');

// Simple test function
async function testDirect() {
  console.log('🧪 TESTING PERFORMANCE METRICS - DIRECT APPROACH');
  
  // Import required modules
  const { db } = await import('./server/db.js');
  const { historicalPrices } = await import('./shared/schema.js');
  const { eq, and, sql, desc } = await import('drizzle-orm');
  
  try {
    // Test with a real symbol from the portfolio
    const testSymbol = 'AAPL';
    const region = 'USD';
    
    console.log(`📊 Testing symbol: ${testSymbol}`);
    
    // Get current price
    const currentPricesQuery = await db
      .select()
      .from(historicalPrices)
      .where(
        and(
          eq(historicalPrices.symbol, testSymbol),
          eq(historicalPrices.region, region)
        )
      )
      .orderBy(desc(historicalPrices.date))
      .limit(1);
    
    if (currentPricesQuery.length === 0) {
      console.log('❌ No historical data found for', testSymbol);
      return;
    }
    
    const currentPrice = Number(currentPricesQuery[0].close);
    console.log(`💰 Current price: $${currentPrice.toFixed(2)}`);
    
    // Calculate dates
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    const mtdStartDate = formatDate(firstDayOfMonth);
    const ytdStartDate = formatDate(firstDayOfYear);
    
    console.log(`📅 MTD Start: ${mtdStartDate}`);
    console.log(`📅 YTD Start: ${ytdStartDate}`);
    
    // Get MTD price
    const mtdPriceQuery = await db
      .select()
      .from(historicalPrices)
      .where(
        and(
          eq(historicalPrices.symbol, testSymbol),
          eq(historicalPrices.region, region),
          sql`${historicalPrices.date} >= ${mtdStartDate}`
        )
      )
      .orderBy(sql`${historicalPrices.date} ASC`)
      .limit(1);
    
    // Get YTD price
    const ytdPriceQuery = await db
      .select()
      .from(historicalPrices)
      .where(
        and(
          eq(historicalPrices.symbol, testSymbol),
          eq(historicalPrices.region, region),
          sql`${historicalPrices.date} >= ${ytdStartDate}`
        )
      )
      .orderBy(sql`${historicalPrices.date} ASC`)
      .limit(1);
    
    if (mtdPriceQuery.length > 0 && ytdPriceQuery.length > 0) {
      const mtdPrice = Number(mtdPriceQuery[0].close);
      const ytdPrice = Number(ytdPriceQuery[0].close);
      
      const mtdReturn = ((currentPrice - mtdPrice) / mtdPrice) * 100;
      const ytdReturn = ((currentPrice - ytdPrice) / ytdPrice) * 100;
      
      console.log(`\n📈 RESULTS:`);
      console.log(`MTD Price: $${mtdPrice.toFixed(2)} → Return: ${mtdReturn.toFixed(2)}%`);
      console.log(`YTD Price: $${ytdPrice.toFixed(2)} → Return: ${ytdReturn.toFixed(2)}%`);
      
      const different = Math.abs(mtdReturn - ytdReturn) > 0.01;
      console.log(`\n✅ MTD vs YTD different? ${different ? 'YES' : 'NO'}`);
      
      if (different) {
        console.log('🎉 PERFORMANCE METRICS CALCULATION WORKS!');
      } else {
        console.log('⚠️ MTD and YTD are identical - possible date issue');
      }
    } else {
      console.log('❌ Could not find historical prices for date ranges');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

testDirect();
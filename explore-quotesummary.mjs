import yahooFinance from 'yahoo-finance2';

async function exploreQuoteSummary() {
  try {
    console.log("Attempting to get earnings data for AAPL...");
    
    // Try different module combinations to see what's available
    const modules = [
      'earnings',
      'calendarEvents',
      'earningsHistory',
      'earningsTrend',
      'financialData',
      'defaultKeyStatistics',
      'summaryDetail',
      'price'
    ];
    
    console.log("Trying modules:", modules);
    
    const result = await yahooFinance.quoteSummary('AAPL', {
      modules: modules
    });
    
    console.log("Available data keys:", Object.keys(result));
    
    // Check if earnings data is available and what's in it
    if (result.earnings) {
      console.log("\nEarnings module structure:", Object.keys(result.earnings));
      
      if (result.earnings.earningsChart) {
        console.log("earningsChart keys:", Object.keys(result.earnings.earningsChart));
        if (result.earnings.earningsChart.quarterly) {
          console.log("\nSample quarterly earnings:", result.earnings.earningsChart.quarterly[0]);
        }
      }
      
      if (result.earnings.financialsChart) {
        console.log("\nfinancialsChart keys:", Object.keys(result.earnings.financialsChart));
        if (result.earnings.financialsChart.quarterly) {
          console.log("Sample quarterly financials:", result.earnings.financialsChart.quarterly[0]);
        }
      }
    }
    
    // Check calendarEvents if it exists
    if (result.calendarEvents) {
      console.log("\nCalendar Events structure:", Object.keys(result.calendarEvents));
      if (result.calendarEvents.earnings) {
        console.log("Calendar earnings data:", result.calendarEvents.earnings);
      }
    }
    
    // Check earningsHistory if it exists
    if (result.earningsHistory) {
      console.log("\nEarnings History structure:", Object.keys(result.earningsHistory));
      if (result.earningsHistory.history) {
        console.log("Sample earnings history:", result.earningsHistory.history[0]);
      }
    }
    
    // Check earningsTrend if it exists
    if (result.earningsTrend) {
      console.log("\nEarnings Trend structure:", Object.keys(result.earningsTrend));
      if (result.earningsTrend.trend) {
        console.log("Sample earnings trend:", result.earningsTrend.trend[0]);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

exploreQuoteSummary();

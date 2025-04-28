import yahooFinance from 'yahoo-finance2';

// Log available methods
console.log("Available methods:", Object.keys(yahooFinance).filter(k => typeof yahooFinance[k] === 'function'));

// Check if there are any documented modules
console.log("\nChecking for modules documentation:");
if (yahooFinance._opts && yahooFinance._opts.quoteSummaryModules) {
  console.log("Available quoteSummary modules:", yahooFinance._opts.quoteSummaryModules);
} else {
  console.log("No documented modules found directly");
}

// Try to get calendarEvents which includes earnings info
console.log("\nAttempting to examine calendar events API:");
try {
  console.log(yahooFinance.earningsHistory ? "earningsHistory exists" : "earningsHistory not found as direct method");
  console.log(yahooFinance.calendarEvents ? "calendarEvents exists" : "calendarEvents not found as direct method");
} catch (e) {
  console.log("Error checking calendar events:", e.message);
}

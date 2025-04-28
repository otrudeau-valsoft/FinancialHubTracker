const yahooFinance = require('yahoo-finance2');

// Log available methods
console.log("Available methods:", Object.keys(yahooFinance).filter(k => typeof yahooFinance[k] === 'function'));

// List available modules for quoteSummary
yahooFinance._opts.quoteSummaryModules && console.log("Available quoteSummary modules:", yahooFinance._opts.quoteSummaryModules);

// Try to get specific documentation for earnings
console.log("\nAttempting to examine earningsHistory options:");
try {
  console.log(yahooFinance.earningsHistory ? "earningsHistory exists" : "earningsHistory not found as direct method");
} catch (e) {
  console.log("Error checking earningsHistory:", e.message);
}

console.log("\nAttempting to examine earningsTrend options:");
try {
  console.log(yahooFinance.earningsTrend ? "earningsTrend exists" : "earningsTrend not found as direct method");
} catch (e) {
  console.log("Error checking earningsTrend:", e.message);
}

// Check quoteSummary modules
console.log("\nExploring quoteSummary modules structure:");
if (yahooFinance._moduleExist) {
  console.log("Module existence check function available");
}

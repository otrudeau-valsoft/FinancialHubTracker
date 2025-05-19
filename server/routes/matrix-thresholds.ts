// Matrix rule thresholds based on Matrices decisionnelles.csv
export const MATRIX_THRESHOLDS = {
  // POSITION INCREASE RULES
  "price-52wk": {
    Compounder: { 1: "10%", 2: "15%", 3: "20%", 4: "N/A" },
    Catalyst: { 1: "20%", 2: "N/A", 3: "N/A", 4: "N/A" },
    Cyclical: { 1: "15%", 2: "20%", 3: "N/A", 4: "N/A" }
  },
  "rsi-low": {
    Compounder: { 1: "40", 2: "40", 3: "40", 4: "N/A" },
    Catalyst: { 1: "30", 2: "30", 3: "30", 4: "N/A" },
    Cyclical: { 1: "35", 2: "35", 3: "35", 4: "N/A" }
  },
  "macd-below": {
    Compounder: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" },
    Catalyst: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" },
    Cyclical: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" }
  },
  "golden-cross-pos": {
    Compounder: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" },
    Catalyst: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" },
    Cyclical: { 1: "Δ POSITIVE", 2: "Δ POSITIVE", 3: "Δ POSITIVE", 4: "N/A" }
  },
  "sector-perf-neg": {
    Compounder: { 1: "-10%", 2: "-15%", 3: "-15%", 4: "N/A" },
    Catalyst: { 1: "-20%", 2: "-20%", 3: "-20%", 4: "N/A" },
    Cyclical: { 1: "-15%", 2: "-15%", 3: "-15%", 4: "N/A" }
  },
  "at-200ma": {
    Compounder: { 1: "+/- 2.5%", 2: "+/- 2.5%", 3: "+/- 2.5%", 4: "N/A" },
    Catalyst: { 1: "N/A", 2: "N/A", 3: "N/A", 4: "N/A" },
    Cyclical: { 1: "+/- 2.5%", 2: "+/- 2.5%", 3: "N/A", 4: "N/A" }
  },

  // POSITION DECREASE RULES
  "price-90day": {
    Compounder: { 1: "N/A", 2: "25%", 3: "25%", 4: "20%" },
    Catalyst: { 1: "25%", 2: "20%", 3: "15%", 4: "20%" },
    Cyclical: { 1: "25%", 2: "20%", 3: "15%", 4: "20%" }
  },
  "max-weight": {
    Compounder: { 1: "8%", 2: "8%", 3: "5%", 4: "4%" },
    Catalyst: { 1: "6%", 2: "4%", 3: "4%", 4: "4%" },
    Cyclical: { 1: "6%", 2: "6%", 3: "4%", 4: "4%" }
  },
  "max-weight-intl": {
    Compounder: { 1: "10%", 2: "10%", 3: "7%", 4: "6%" },
    Catalyst: { 1: "8%", 2: "6%", 3: "6%", 4: "6%" },
    Cyclical: { 1: "8%", 2: "8%", 3: "6%", 4: "6%" }
  },
  "active-risk": {
    Compounder: { 1: "N/A", 2: "N/A", 3: "N/A", 4: "N/A" },
    Catalyst: { 1: "4%", 2: "4%", 3: "4%", 4: "4%" },
    Cyclical: { 1: "5%", 2: "5%", 3: "5%", 4: "5%" }
  },
  "rsi-high": {
    Compounder: { 1: "N/A", 2: "70", 3: "70", 4: "70" },
    Catalyst: { 1: "60", 2: "60", 3: "60", 4: "60" },
    Cyclical: { 1: "70", 2: "70", 3: "70", 4: "70" }
  },
  "macd-above": {
    Compounder: { 1: "N/A", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" },
    Catalyst: { 1: "Δ NEGATIVE", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" },
    Cyclical: { 1: "Δ NEGATIVE", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" }
  },
  "golden-cross-neg": {
    Compounder: { 1: "N/A", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" },
    Catalyst: { 1: "Δ NEGATIVE", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" },
    Cyclical: { 1: "Δ NEGATIVE", 2: "Δ NEGATIVE", 3: "Δ NEGATIVE", 4: "Δ NEGATIVE" }
  },
  "sector-perf-pos": {
    Compounder: { 1: "N/A", 2: "10%", 3: "15%", 4: "15%" },
    Catalyst: { 1: "20%", 2: "20%", 3: "20%", 4: "20%" },
    Cyclical: { 1: "15%", 2: "15%", 3: "15%", 4: "15%" }
  },
  "under-200ma": {
    Compounder: { 1: "N/A", 2: "- 5%", 3: "- 5%", 4: "N/A" },
    Catalyst: { 1: "- 5%", 2: "- 5%", 3: "- 5%", 4: "- 5%" },
    Cyclical: { 1: "- 5%", 2: "- 5%", 3: "- 5%", 4: "- 5%" }
  },

  // RATING INCREASE RULES
  "earnings-quality": {
    Compounder: { 1: "N/A", 2: "5", 3: "5", 4: "5" },
    Catalyst: { 1: "N/A", 2: "5", 3: "5", 4: "5" },
    Cyclical: { 1: "N/A", 2: "5", 3: "5", 4: "5" }
  },
  "ebitda-margin": {
    Compounder: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Catalyst: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Cyclical: { 1: "N/A", 2: "4", 3: "3", 4: "2" }
  },
  "roic-increase": {
    Compounder: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Catalyst: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Cyclical: { 1: "N/A", 2: "4", 3: "3", 4: "2" }
  },
  "debt-reduction": {
    Compounder: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Catalyst: { 1: "N/A", 2: "4", 3: "3", 4: "2" },
    Cyclical: { 1: "N/A", 2: "4", 3: "3", 4: "2" }
  },

  // RATING DECREASE RULES
  "negative-quarters": {
    Compounder: { 1: "-4", 2: "-4", 3: "-4", 4: "N/A" },
    Catalyst: { 1: "-4", 2: "-4", 3: "-4", 4: "N/A" },
    Cyclical: { 1: "-4", 2: "-4", 3: "-4", 4: "N/A" }
  },
  "ebitda-margin-neg": {
    Compounder: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Catalyst: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Cyclical: { 1: "3", 2: "2", 3: "2", 4: "N/A" }
  },
  "roic-decrease": {
    Compounder: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Catalyst: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Cyclical: { 1: "3", 2: "2", 3: "2", 4: "N/A" }
  },
  "debt-increase": {
    Compounder: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Catalyst: { 1: "3", 2: "2", 3: "2", 4: "N/A" },
    Cyclical: { 1: "3", 2: "2", 3: "2", 4: "N/A" }
  }
};
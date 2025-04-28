import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  TrendingUp,
  BarChart,
  FileText,
  Sparkles,
  PieChart,
  Filter,
  ChevronLeft,
  ChevronRight,
  LineChart,
  ArrowLeft,
  Info
} from "lucide-react";
import { useEarnings, usePortfolioEarnings, useEarningsHeatmap, formatQuarter } from "@/hooks/useEarnings";
import { useFormattedHeatmap, useAvailableQuarters, getHeatmapCellColor } from "@/hooks/useHeatmap";

// Define a type for the earnings heatmap data structure
type EarningsHeatmapDataItem = {
  ticker: string;
  issuerName: string;
  consensusRecommendation: string;
  last: number;
  price: {
    earningsRate: number;
    ytd: number;
    pctOf52w: number;
  };
  eps: string;
  rev: string;
  guidance: string;
  earningsScore: string;
  mktReaction: number;
  mktReactionCommentary: string;
};

type EarningsStats = {
  eps: {
    beat: number;
    inLine: number;
    miss: number;
  };
  revenue: {
    beat: number;
    inLine: number;
    miss: number;
  };
  guidance: {
    increased: number;
    maintain: number;
    reduced: number;
  };
  earningScore: {
    greatGood: number;
    notSoBad: number;
    ugly: number;
  };
};

// These will be replaced by real data from API
// Only kept for reference or type checking
const legacyQuarterData: Record<string, {
  heatmapData: EarningsHeatmapDataItem[],
  stats: EarningsStats
}> = {
  // Q4 2024 Data (for reference)
  "Q4 2024": {
    heatmapData: [
      {
        ticker: "BCH",
        issuerName: "RICHFIELD HARDWARE CORP",
        consensusRecommendation: "Hold",
        last: 33.5,
        price: {
          earningsRate: 17.1,
          ytd: -41.1,
          pctOf52w: 44.3
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 5.1,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "JPM.us",
        issuerName: "JPMORGAN CHASE & CO",
        consensusRecommendation: "Buy",
        last: 252.4,
        price: {
          earningsRate: 12.7,
          ytd: -5.5,
          pctOf52w: 52.7
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 0.5,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "ASML.us",
        issuerName: "ASML HOLDING NV REG SHS",
        consensusRecommendation: "Strong Buy",
        last: 714.0,
        price: {
          earningsRate: 27.1,
          ytd: 0.4,
          pctOf52w: 74.8
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 0.9,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "UNH.us",
        issuerName: "UNITEDHEALTH GROUP INC (DEL)",
        consensusRecommendation: "Strong Buy",
        last: 488.7,
        price: {
          earningsRate: 16.4,
          ytd: -4.4,
          pctOf52w: 26.9
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: 6.0,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "MCJ.r",
        issuerName: "MCJ",
        consensusRecommendation: "Buy",
        last: 605.1,
        price: {
          earningsRate: 21.5,
          ytd: -4.8,
          pctOf52w: 12.4
        },
        eps: "Miss",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: -5.8,
        mktReactionCommentary: "Abnormal"
      }
    ],
    stats: {
      eps: {
        beat: 26,
        inLine: 8,
        miss: 11
      },
      revenue: {
        beat: 22,
        inLine: 16,
        miss: 6
      },
      guidance: {
        increased: 3,
        maintain: 40,
        reduced: 2
      },
      earningScore: {
        greatGood: 31,
        notSoBad: 13,
        ugly: 1
      }
    }
  },

  // Q3 2024 Data
  "Q3 2024": {
    heatmapData: [
      {
        ticker: "BCH",
        issuerName: "RICHFIELD HARDWARE CORP",
        consensusRecommendation: "Hold",
        last: 31.2,
        price: {
          earningsRate: 12.3,
          ytd: -15.8,
          pctOf52w: 38.6
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: 2.8,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "MSFT",
        issuerName: "MICROSOFT CORP",
        consensusRecommendation: "Strong Buy",
        last: 415.8,
        price: {
          earningsRate: 8.3,
          ytd: 14.7,
          pctOf52w: 93.4
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Increased",
        earningsScore: "Great",
        mktReaction: 4.2,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "AAPL",
        issuerName: "APPLE INC",
        consensusRecommendation: "Buy",
        last: 182.5,
        price: {
          earningsRate: 2.1,
          ytd: -6.7,
          pctOf52w: 71.8
        },
        eps: "In-Line",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: -3.4,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "AMZN",
        issuerName: "AMAZON.COM INC",
        consensusRecommendation: "Strong Buy",
        last: 178.2,
        price: {
          earningsRate: 11.6,
          ytd: 22.3,
          pctOf52w: 82.7
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 7.9,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "NVDA",
        issuerName: "NVIDIA CORP",
        consensusRecommendation: "Strong Buy",
        last: 879.5,
        price: {
          earningsRate: 37.2,
          ytd: 81.3,
          pctOf52w: 96.2
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Increased",
        earningsScore: "Great",
        mktReaction: 12.4,
        mktReactionCommentary: "Explosive"
      },
      {
        ticker: "META",
        issuerName: "META PLATFORMS INC",
        consensusRecommendation: "Buy",
        last: 511.2,
        price: {
          earningsRate: 14.3,
          ytd: 38.2,
          pctOf52w: 87.5
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 3.7,
        mktReactionCommentary: "Normal"
      }
    ],
    stats: {
      eps: {
        beat: 32,
        inLine: 5,
        miss: 8
      },
      revenue: {
        beat: 28,
        inLine: 12,
        miss: 5
      },
      guidance: {
        increased: 7,
        maintain: 33,
        reduced: 5
      },
      earningScore: {
        greatGood: 34,
        notSoBad: 10,
        ugly: 1
      }
    }
  },

  // Q2 2024 Data
  "Q2 2024": {
    heatmapData: [
      {
        ticker: "BCH",
        issuerName: "RICHFIELD HARDWARE CORP",
        consensusRecommendation: "Hold",
        last: 30.8,
        price: {
          earningsRate: -2.5,
          ytd: -22.7,
          pctOf52w: 35.2
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -7.9,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "CVX",
        issuerName: "CHEVRON CORP",
        consensusRecommendation: "Hold",
        last: 162.8,
        price: {
          earningsRate: -4.7,
          ytd: 2.1,
          pctOf52w: 65.3
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -7.3,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "JPM",
        issuerName: "JPMORGAN CHASE & CO",
        consensusRecommendation: "Buy",
        last: 214.7,
        price: {
          earningsRate: 5.3,
          ytd: 9.8,
          pctOf52w: 79.2
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 2.1,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "WMT",
        issuerName: "WALMART INC",
        consensusRecommendation: "Buy",
        last: 69.5,
        price: {
          earningsRate: 2.8,
          ytd: 11.2,
          pctOf52w: 83.7
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Increased",
        earningsScore: "Good",
        mktReaction: 5.4,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "PG",
        issuerName: "PROCTER & GAMBLE CO",
        consensusRecommendation: "Hold",
        last: 172.1,
        price: {
          earningsRate: 1.2,
          ytd: 8.5,
          pctOf52w: 76.4
        },
        eps: "In-Line",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: -0.8,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "TSLA",
        issuerName: "TESLA INC",
        consensusRecommendation: "Hold",
        last: 215.3,
        price: {
          earningsRate: -13.7,
          ytd: -22.4,
          pctOf52w: 43.6
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Maintain",
        earningsScore: "Ugly",
        mktReaction: -12.5,
        mktReactionCommentary: "Explosive"
      }
    ],
    stats: {
      eps: {
        beat: 18,
        inLine: 12,
        miss: 15
      },
      revenue: {
        beat: 17,
        inLine: 15,
        miss: 13
      },
      guidance: {
        increased: 5,
        maintain: 32,
        reduced: 8
      },
      earningScore: {
        greatGood: 24,
        notSoBad: 15,
        ugly: 6
      }
    }
  },

  // Q1 2024 Data
  "Q1 2024": {
    heatmapData: [
      {
        ticker: "BCH",
        issuerName: "RICHFIELD HARDWARE CORP",
        consensusRecommendation: "Hold",
        last: 32.1,
        price: {
          earningsRate: 5.3,
          ytd: -18.2,
          pctOf52w: 39.7
        },
        eps: "In-Line",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: 1.2,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "BAC",
        issuerName: "BANK OF AMERICA CORP",
        consensusRecommendation: "Hold",
        last: 37.8,
        price: {
          earningsRate: 1.2,
          ytd: 3.5,
          pctOf52w: 62.1
        },
        eps: "In-Line",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: 0.3,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "JNJ",
        issuerName: "JOHNSON & JOHNSON",
        consensusRecommendation: "Hold",
        last: 151.2,
        price: {
          earningsRate: -2.1,
          ytd: -5.7,
          pctOf52w: 55.3
        },
        eps: "In-Line",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Not So Bad",
        mktReaction: -3.8,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "PFE",
        issuerName: "PFIZER INC",
        consensusRecommendation: "Hold",
        last: 27.3,
        price: {
          earningsRate: -8.5,
          ytd: -12.3,
          pctOf52w: 41.7
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -9.2,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "KO",
        issuerName: "COCA-COLA CO",
        consensusRecommendation: "Buy",
        last: 62.7,
        price: {
          earningsRate: 3.4,
          ytd: 5.8,
          pctOf52w: 72.6
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 2.1,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "INTC",
        issuerName: "INTEL CORP",
        consensusRecommendation: "Hold",
        last: 33.8,
        price: {
          earningsRate: -12.1,
          ytd: -17.5,
          pctOf52w: 38.2
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -15.7,
        mktReactionCommentary: "Explosive"
      }
    ],
    stats: {
      eps: {
        beat: 15,
        inLine: 13,
        miss: 17
      },
      revenue: {
        beat: 13,
        inLine: 17,
        miss: 15
      },
      guidance: {
        increased: 2,
        maintain: 29,
        reduced: 14
      },
      earningScore: {
        greatGood: 22,
        notSoBad: 17,
        ugly: 6
      }
    }
  },

  // Q4 2023 Data
  "Q4 2023": {
    heatmapData: [
      {
        ticker: "BCH",
        issuerName: "RICHFIELD HARDWARE CORP",
        consensusRecommendation: "Hold",
        last: 29.7,
        price: {
          earningsRate: -2.3,
          ytd: -8.5,
          pctOf52w: 38.7
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -11.2,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "MSFT",
        issuerName: "MICROSOFT CORP",
        consensusRecommendation: "Strong Buy", 
        last: 378.5,
        price: {
          earningsRate: 11.2,
          ytd: 5.3,
          pctOf52w: 87.6
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Increased",
        earningsScore: "Great",
        mktReaction: 6.7,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "AAPL",
        issuerName: "APPLE INC",
        consensusRecommendation: "Buy",
        last: 168.3,
        price: {
          earningsRate: 4.1,
          ytd: 2.8,
          pctOf52w: 75.3
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 2.5,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "V",
        issuerName: "VISA INC",
        consensusRecommendation: "Strong Buy",
        last: 276.8,
        price: {
          earningsRate: 8.3,
          ytd: 4.2,
          pctOf52w: 82.4
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 3.8,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "MA",
        issuerName: "MASTERCARD INC",
        consensusRecommendation: "Strong Buy",
        last: 458.2,
        price: {
          earningsRate: 7.5,
          ytd: 3.9,
          pctOf52w: 79.8
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 2.7,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "AMZN",
        issuerName: "AMAZON.COM INC",
        consensusRecommendation: "Strong Buy",
        last: 152.7,
        price: {
          earningsRate: 13.8,
          ytd: 7.2,
          pctOf52w: 84.5
        },
        eps: "Beat",
        rev: "Beat",
        guidance: "Increased",
        earningsScore: "Great",
        mktReaction: 8.3,
        mktReactionCommentary: "Abnormal"
      }
    ],
    stats: {
      eps: {
        beat: 34,
        inLine: 10,
        miss: 6
      },
      revenue: {
        beat: 31,
        inLine: 12,
        miss: 7
      },
      guidance: {
        increased: 11,
        maintain: 35,
        reduced: 4
      },
      earningScore: {
        greatGood: 36,
        notSoBad: 12,
        ugly: 2
      }
    }
  },

  // Q3 2023 Data
  "Q3 2023": {
    heatmapData: [
      {
        ticker: "XOM",
        issuerName: "EXXON MOBIL CORP",
        consensusRecommendation: "Hold",
        last: 107.2,
        price: {
          earningsRate: -3.2,
          ytd: -1.8,
          pctOf52w: 65.1
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: -2.4,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "CVX",
        issuerName: "CHEVRON CORP",
        consensusRecommendation: "Hold",
        last: 150.3,
        price: {
          earningsRate: -2.7,
          ytd: -2.5,
          pctOf52w: 63.7
        },
        eps: "Miss",
        rev: "Miss",
        guidance: "Reduced",
        earningsScore: "Ugly",
        mktReaction: -5.3,
        mktReactionCommentary: "Abnormal"
      },
      {
        ticker: "PG",
        issuerName: "PROCTER & GAMBLE CO",
        consensusRecommendation: "Buy",
        last: 152.8,
        price: {
          earningsRate: 2.1,
          ytd: 3.5,
          pctOf52w: 72.4
        },
        eps: "Beat",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Good",
        mktReaction: 1.7,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "JNJ",
        issuerName: "JOHNSON & JOHNSON",
        consensusRecommendation: "Hold",
        last: 157.5,
        price: {
          earningsRate: 0.8,
          ytd: 1.2,
          pctOf52w: 68.3
        },
        eps: "In-Line",
        rev: "In-Line",
        guidance: "Maintain",
        earningsScore: "Not So Bad",
        mktReaction: 0.5,
        mktReactionCommentary: "Normal"
      },
      {
        ticker: "VZ",
        issuerName: "VERIZON COMMUNICATIONS INC",
        consensusRecommendation: "Hold",
        last: 38.7,
        price: {
          earningsRate: -4.3,
          ytd: -8.7,
          pctOf52w: 54.1
        },
        eps: "Miss",
        rev: "In-Line",
        guidance: "Reduced",
        earningsScore: "Not So Bad",
        mktReaction: -3.8,
        mktReactionCommentary: "Normal"
      }
    ],
    stats: {
      eps: {
        beat: 21,
        inLine: 16,
        miss: 13
      },
      revenue: {
        beat: 18,
        inLine: 20,
        miss: 12
      },
      guidance: {
        increased: 4,
        maintain: 38,
        reduced: 8
      },
      earningScore: {
        greatGood: 26,
        notSoBad: 19,
        ugly: 5
      }
    }
  }
};

// Mock data for upcoming earnings
const mockUpcomingEarnings = [
  { ticker: "MSFT", company: "Microsoft Corporation", date: "2025-04-26", time: "AMC", eps: 2.86 },
  { ticker: "AAPL", company: "Apple Inc", date: "2025-04-30", time: "AMC", eps: 1.54 },
  { ticker: "AMZN", company: "Amazon.com Inc", date: "2025-04-28", time: "AMC", eps: 0.98 },
  { ticker: "GOOGL", company: "Alphabet Inc", date: "2025-04-29", time: "AMC", eps: 1.65 },
  { ticker: "META", company: "Meta Platforms Inc", date: "2025-05-01", time: "AMC", eps: 4.32 }
];

// Using portfolio-matching button styles with the right font and rounded appearance
const getEpsColor = (value: string) => {
  switch (value) {
    case "Beat": return "bg-[#4CAF50] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "In-Line": return "bg-[#FFD700] text-black px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Miss": return "bg-[#FF5252] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    default: return "bg-[#1A304A] text-[#7A8999] px-3 py-0.5 rounded-full text-[11px] font-medium";
  }
};

const getGuidanceColor = (value: string) => {
  switch (value) {
    case "Increased": return "bg-[#4CAF50] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Maintain": return "bg-[#FFD700] text-black px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Reduced": return "bg-[#FF5252] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    default: return "bg-[#1A304A] text-[#7A8999] px-3 py-0.5 rounded-full text-[11px] font-medium";
  }
};

const getScoreColor = (value: string) => {
  switch (value) {
    case "Good":
    case "Great": return "bg-[#4CAF50] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Not So Bad": return "bg-[#FFD700] text-black px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Ugly": return "bg-[#FF5252] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    default: return "bg-[#1A304A] text-[#7A8999] px-3 py-0.5 rounded-full text-[11px] font-medium";
  }
};

const getReactionCommentaryColor = (value: string) => {
  switch (value) {
    case "Normal": return "text-[#FFD700]"; // Gold color for normal
    case "Abnormal": return "text-[#38AAFD]"; // Blue color for abnormal
    case "Explosive": return "text-[#FF5252]"; // Red color for explosive
    default: return "text-[#7A8999]";
  }
};

// Helper function to get subtle highlight for heatmap row
const getHeatmapRowColor = (item: EarningsHeatmapDataItem) => {
  // Simplify to use only very subtle highlighting
  if (item.earningsScore === "Great" || item.earningsScore === "Good") {
    return "0, 100, 0, 0.04"; // Very subtle green
  } else if (item.earningsScore === "Ugly") {
    return "100, 0, 0, 0.04"; // Very subtle red
  } else {
    return "0, 0, 0, 0"; // No highlight
  }
};

// Helper function to get color for consensus recommendation with matching button-style
const getConsensusColor = (value: string) => {
  switch (value) {
    case "Strong Buy": return "bg-[#00C853] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Buy": return "bg-[#4CAF50] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Hold": return "bg-[#FFD700] text-black px-3 py-0.5 rounded-full text-[11px] font-medium";
    case "Underperform": 
    case "Sell": return "bg-[#FF5252] text-white px-3 py-0.5 rounded-full text-[11px] font-medium";
    default: return "bg-[#1A304A] text-[#7A8999] px-3 py-0.5 rounded-full text-[11px] font-medium";
  }
};

// Define quarter data for navigation
export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [currentQuarterIndex, setCurrentQuarterIndex] = useState(0); // Start with most recent quarter
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  
  // Fetch real data from API using our hooks
  const { data: formattedHeatmapData, isLoading: isHeatmapLoading } = useFormattedHeatmap();
  const { quarters = [], isLoading: isQuartersLoading } = useAvailableQuarters();
  
  // Fetch earnings data from all three portfolios
  const { data: usdEarningsData, isLoading: isUsdEarningsLoading } = usePortfolioEarnings('USD');
  const { data: cadEarningsData, isLoading: isCadEarningsLoading } = usePortfolioEarnings('CAD');
  const { data: intlEarningsData, isLoading: isIntlEarningsLoading } = usePortfolioEarnings('INTL');
  
  // Fetch all earnings data without filtering by portfolio (for complete view)
  const { data: allEarningsData, isLoading: isAllEarningsLoading } = useEarnings({ enabled: true });
  
  // Get the current quarter data with proper error handling
  const currentQuarter = quarters && quarters.length > 0 && currentQuarterIndex < quarters.length 
    ? quarters[currentQuarterIndex]?.quarter : "";
  const currentQuarterData = formattedHeatmapData && formattedHeatmapData.length > 0 && currentQuarterIndex < formattedHeatmapData.length
    ? formattedHeatmapData[currentQuarterIndex]
    : null;
    
  // Create placeholder stats if real data is not yet available
  const placeholderStats = {
    eps: { beat: 0, inLine: 0, miss: 0 },
    revenue: { beat: 0, inLine: 0, miss: 0 },
    guidance: { increased: 0, maintain: 0, reduced: 0 },
    earningScore: { greatGood: 0, notSoBad: 0, ugly: 0 }
  };
  
  // Function to navigate to previous quarter
  const previousQuarter = () => {
    if (currentQuarterIndex < quarters.length - 1) {
      const newIndex = currentQuarterIndex + 1;
      console.log(`Navigating to previous quarter: ${quarters[newIndex].quarter}`);
      setCurrentQuarterIndex(newIndex);
    }
  };
  
  // Function to navigate to next quarter
  const nextQuarter = () => {
    if (currentQuarterIndex > 0) {
      const newIndex = currentQuarterIndex - 1;
      console.log(`Navigating to next quarter: ${quarters[newIndex].quarter}`);
      setCurrentQuarterIndex(newIndex);
    }
  };
  
  // Function to select a stock for detailed view
  const handleSelectStock = (ticker: string) => {
    console.log(`Selected stock: ${ticker}`);
    setSelectedStock(ticker);
    setActiveTab("stock-detail");
  };
  
  // Function to clear selected stock and go back
  const handleBackToHeatmap = () => {
    setSelectedStock(null);
    setActiveTab("heatmap");
  };
  
  // Find stock data across all quarters using real data from API
  const getStockAcrossQuarters = (ticker: string) => {
    // Use the data we've fetched from API
    if (!formattedHeatmapData || formattedHeatmapData.length === 0) {
      return [];
    }
    
    const stockData: Array<{
      quarter: string;
      data: any; // Using any temporarily until we settle on a proper type
    }> = [];
    
    // Go through the actual quarter data we have
    formattedHeatmapData.forEach(quarterData => {
      // Try to find earnings data for this stock in any portfolio
      // First check allEarningsData (unfiltered data)
      let earningsData = allEarningsData?.find(e => 
        e.ticker === ticker || 
        e.ticker.startsWith(ticker + '.') ||
        (e.ticker.includes('.') && e.ticker.split('.')[0] === ticker)
      );
      
      // If not found in general search, check USD portfolio
      if (!earningsData) {
        earningsData = usdEarningsData?.find(e => 
          e.ticker === ticker || 
          e.ticker.startsWith(ticker + '.') ||
          (e.ticker.includes('.') && e.ticker.split('.')[0] === ticker)
        );
      }
      
      // If still not found, check CAD portfolio
      if (!earningsData) {
        earningsData = cadEarningsData?.find(e => 
          e.ticker === ticker || 
          e.ticker.startsWith(ticker + '.') ||
          (e.ticker.includes('.') && e.ticker.split('.')[0] === ticker)
        );
      }
      
      // If still not found, check INTL portfolio
      if (!earningsData) {
        earningsData = intlEarningsData?.find(e => 
          e.ticker === ticker || 
          e.ticker.startsWith(ticker + '.') ||
          (e.ticker.includes('.') && e.ticker.split('.')[0] === ticker)
        );
      }
      
      if (earningsData) {
        stockData.push({
          quarter: formatQuarter(quarterData.fiscal_year, quarterData.fiscal_q),
          data: {
            ticker: earningsData.ticker,
            issuerName: "Company Data", // We'd need to fetch this from portfolio data
            last: earningsData.current_price || 0,
            eps: earningsData.eps_actual > earningsData.eps_estimate ? "Beat" : 
                 (earningsData.eps_actual < earningsData.eps_estimate ? "Miss" : "In-Line"),
            rev: earningsData.rev_actual > earningsData.rev_estimate ? "Beat" : 
                 (earningsData.rev_actual < earningsData.rev_estimate ? "Miss" : "In-Line"),
            guidance: earningsData.guidance || "Maintain",
            mktReaction: earningsData.mkt_reaction || 0,
            earningsScore: typeof earningsData.score === 'string' ? 
                          (earningsData.score === 'Good' ? 'Good' : 
                           earningsData.score === 'Okay' ? 'Not So Bad' : 'Ugly') : 
                          (earningsData.score && earningsData.score > 7 ? "Good" : 
                           earningsData.score && earningsData.score > 4 ? "Not So Bad" : "Ugly"),
          }
        });
      }
    });
    
    return stockData;
  };
  
  // Get data for selected stock if any
  const selectedStockData = selectedStock ? getStockAcrossQuarters(selectedStock) : [];
  const selectedStockInfo = selectedStock && selectedStockData.length > 0 
    ? selectedStockData[0].data 
    : null;
  
  // This useEffect logs when the quarter changes and could be
  // used to fetch additional data if needed
  React.useEffect(() => {
    if (quarters.length > 0 && quarters[currentQuarterIndex]) {
      console.log(`Loading data for: ${quarters[currentQuarterIndex].quarter}`);
    }
  }, [currentQuarterIndex, quarters]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">EARNINGS CENTER</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#E91E63]"></div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] bg-[#0B1728]/80 px-2.5 py-1 rounded-md border border-[#1A304A]">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full mr-1"></div>
              <span className="text-[#7A8999] font-mono">LATEST Q:</span>
              <span className="ml-1 text-[#EFEFEF] font-mono">Q4 2024</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className={`grid ${selectedStock ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} mb-3 sm:mb-4 bg-[#0A1929]`}>
          <TabsTrigger value="calendar" className="font-mono text-[10px] sm:text-xs">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">EARNINGS</span> CALENDAR
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="font-mono text-[10px] sm:text-xs">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">EARNINGS</span> HEATMAP
          </TabsTrigger>
          <TabsTrigger value="intakes" className="font-mono text-[10px] sm:text-xs">
            <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">EARNINGS</span> INTAKES
          </TabsTrigger>
          {selectedStock && (
            <TabsTrigger value="stock-detail" className="font-mono text-[10px] sm:text-xs col-span-2 sm:col-span-1">
              <LineChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              STOCK DETAIL
            </TabsTrigger>
          )}
        </TabsList>

        {/* EARNINGS CALENDAR */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="border-0 shadow bg-[#0A1929] rounded-none border border-[#1A304A]">
            <CardHeader className="card-header px-3 py-2 sm:px-4 sm:py-3 bg-[#0D1C30] border-b border-[#1A304A] flex justify-between items-center">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-[#E91E63]" />
                <h3 className="text-left font-mono text-[#EFEFEF] text-xs sm:text-sm">UPCOMING EARNINGS CALENDAR - Q2 2025</h3>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                      <th className="px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">DATE</th>
                      <th className="px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TICKER</th>
                      <th className="px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">COMPANY</th>
                      <th className="px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TIME</th>
                      <th className="px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">EST. EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUpcomingEarnings.map((item, index) => (
                      <tr key={index} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                        <td className="px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{item.date}</td>
                        <td className="px-3 py-0 text-left font-mono text-[#38AAFD] text-xs font-medium whitespace-nowrap">{item.ticker}</td>
                        <td className="px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap overflow-hidden" style={{ maxWidth: '200px', textOverflow: 'ellipsis' }}>{item.company}</td>
                        <td className="px-3 py-0 text-left font-mono text-[#EFEFEF] text-xs whitespace-nowrap">{item.time}</td>
                        <td className="px-3 py-0 text-right font-mono text-[#EFEFEF] text-xs whitespace-nowrap">${item.eps.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EARNINGS HEATMAP */}
        <TabsContent value="heatmap" className="space-y-4">
          {/* Main Earnings Season Header with Quarter Navigation */}
          <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
            <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Previous Quarter Arrow */}
                  <button 
                    onClick={previousQuarter}
                    className={`p-1 rounded-full ${currentQuarterIndex < quarters.length - 1 ? 'hover:bg-[#1A304A] text-[#E91E63]' : 'text-[#384b62] cursor-not-allowed'}`}
                    disabled={currentQuarterIndex >= quarters.length - 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  
                  {/* Current Quarter Title */}
                  <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide whitespace-nowrap">
                    EARNINGS SEASON - {quarters && quarters.length > 0 && currentQuarterIndex < quarters.length 
                      ? quarters[currentQuarterIndex].quarter 
                      : "Loading..."}
                  </h3>
                  
                  {/* Next Quarter Arrow */}
                  <button 
                    onClick={nextQuarter}
                    className={`p-1 rounded-full ${currentQuarterIndex > 0 ? 'hover:bg-[#1A304A] text-[#E91E63]' : 'text-[#384b62] cursor-not-allowed'}`}
                    disabled={currentQuarterIndex <= 0}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 flex items-center">
                    <Filter className="h-3 w-3 mr-1" />
                    FILTER
                  </span>
                  <div className="h-1 w-8 bg-[#E91E63]"></div>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          {/* Earnings Statistics Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {/* EPS Stats */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">EPS</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#4CAF50]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-1 sm:p-2">
                <div className="grid grid-cols-2 gap-1 text-[10px] sm:text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Beat <span className="font-bold">{currentQuarterData?.eps?.Beat || placeholderStats.eps.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{currentQuarterData?.eps?.['In-Line'] || placeholderStats.eps.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{currentQuarterData?.eps?.Miss || placeholderStats.eps.miss}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Stats */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">REVENUE</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#2196F3]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-1 sm:p-2">
                <div className="grid grid-cols-2 gap-1 text-[10px] sm:text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Beat <span className="font-bold">{currentQuarterData?.revenue?.Up || placeholderStats.revenue.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{currentQuarterData?.revenue?.Flat || placeholderStats.revenue.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{currentQuarterData?.revenue?.Down || placeholderStats.revenue.miss}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidance Stats */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">GUIDANCE</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#FFCA28]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-1 sm:p-2">
                <div className="grid grid-cols-2 gap-1 text-[10px] sm:text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Up <span className="font-bold">{currentQuarterData?.guidance?.Increased || placeholderStats.guidance.increased}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Flat <span className="font-bold">{currentQuarterData?.guidance?.Maintain || placeholderStats.guidance.maintain}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Down <span className="font-bold">{currentQuarterData?.guidance?.Decreased || placeholderStats.guidance.reduced}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Score Stats */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">SCORE</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#E91E63]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-1 sm:p-2">
                <div className="grid grid-cols-2 gap-1 text-[10px] sm:text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Good <span className="font-bold">{currentQuarterData?.score?.Good || placeholderStats.earningScore.greatGood}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Okay <span className="font-bold">{currentQuarterData?.score?.Okay || placeholderStats.earningScore.notSoBad}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Bad <span className="font-bold">{currentQuarterData?.score?.Bad || placeholderStats.earningScore.ugly}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Earnings Heatmap Table - Simplified Version */}
          <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
            <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide whitespace-nowrap">
                    <span className="hidden xs:inline">EARNINGS DETAILS -</span> {quarters && quarters.length > 0 && currentQuarterIndex < quarters.length ? quarters[currentQuarterIndex].quarter : "Loading..."}
                  </h3>
                </div>
                <div className="h-1 w-8 bg-[#38AAFD]"></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-[10px] sm:text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                      <th className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">TICKER</th>
                      <th className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">ISSUER NAME</th>
                      <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">CONS</th>
                      <th className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">LAST</th>
                      <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">EPS</th>
                      <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">REV</th>
                      <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">GUIDE</th>
                      <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SCORE</th>
                      <th className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MKT</th>
                      <th className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NOTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuarterData && currentQuarterData.stocks && currentQuarterData.stocks.length > 0 ? (
                      currentQuarterData.stocks.map((item: any, index: number) => (
                        <tr 
                          key={index} 
                          onClick={() => handleSelectStock(item.ticker)}
                          className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542] cursor-pointer"
                          style={{
                            background: `linear-gradient(90deg, rgba(10, 25, 41, 0.95) 0%, rgba(${getHeatmapRowColor(item)}) 100%)`
                          }}
                          title="Click to view historical earnings performance"
                        >
                          <td className="px-2 sm:px-3 py-0 text-left whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="font-mono text-[#38AAFD] font-medium text-[10px] sm:text-xs tracking-wide">{item.ticker}</span>
                              <Info className="ml-1 h-2 w-2 sm:h-3 sm:w-3 text-[#E91E63] opacity-50" />
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#EFEFEF] text-[10px] sm:text-xs whitespace-nowrap overflow-hidden" style={{ maxWidth: '100px', textOverflow: 'ellipsis' }}>
                            {item.issuerName}
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs ${getConsensusColor(item.consensusRecommendation)}`}>{item.consensusRecommendation}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-[10px] sm:text-xs whitespace-nowrap">${item.last.toFixed(1)}</td>
                          <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs ${getEpsColor(item.eps)}`}>{item.eps}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs ${getEpsColor(item.rev)}`}>{item.rev}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs ${getGuidanceColor(item.guidance)}`}>{item.guidance}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs ${getScoreColor(item.earningsScore)}`}>{item.earningsScore}</span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-right whitespace-nowrap">
                            <span className={`inline-block font-mono ${item.mktReaction >= 0 ? 'bg-[#4CAF50] text-white' : 'bg-[#FF5252] text-white'} px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium`}>
                              {item.mktReaction >= 0 ? '+' : ''}{item.mktReaction.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-0 text-left font-mono text-[10px] sm:text-xs whitespace-nowrap overflow-hidden" style={{ maxWidth: '80px', textOverflow: 'ellipsis' }}>
                            <span className={`${getReactionCommentaryColor(item.mktReactionCommentary)}`}>{item.mktReactionCommentary}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-3 py-4 text-center text-[#EFEFEF] text-xs">
                          No earnings data available for this quarter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Simple Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-[#7A8999]">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#4CAF50] rounded-sm"></div>
              <span>Beat/Up/Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#FFD700] rounded-sm"></div>
              <span>In-Line/Flat/Okay</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#FF5252] rounded-sm"></div>
              <span>Miss/Down/Bad</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#38AAFD] rounded-sm"></div>
              <span>Abnormal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 sm:h-3 sm:w-3 bg-[#FF5252] rounded-sm"></div>
              <span>Explosive</span>
            </div>
          </div>
        </TabsContent>

        {/* EARNINGS INTAKES */}
        <TabsContent value="intakes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings Setup */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">EARNINGS SETUP</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#2196F3]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-[#EFEFEF] text-sm font-mono">Enter company information and expectations before earnings release.</p>
                  
                  {/* This would be a form in the real implementation */}
                  <div className="bg-[#0F2542] p-4 rounded text-center">
                    <span className="text-[#7A8999] text-sm font-mono">EARNINGS SETUP FORM</span>
                    <p className="text-[#EFEFEF] text-xs mt-2">
                      Form will include ticker, expected EPS, revenue projection, guidance expectations and key metrics to watch.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Recap */}
            <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
              <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center">
                    <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">EARNINGS RECAP</h3>
                  </div>
                  <div className="h-1 w-8 bg-[#FFCA28]"></div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-[#EFEFEF] text-sm font-mono">Document actual results and compare against expectations.</p>
                  
                  {/* This would be a form in the real implementation */}
                  <div className="bg-[#0F2542] p-4 rounded text-center">
                    <span className="text-[#7A8999] text-sm font-mono">EARNINGS RECAP FORM</span>
                    <p className="text-[#EFEFEF] text-xs mt-2">
                      Form will include actual results, beats/misses, guidance updates, management commentary and market reaction.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STOCK DETAIL VIEW */}
        <TabsContent value="stock-detail" className="space-y-4">
          {selectedStockInfo && (
            <>
              {/* Stock Header with Back Button */}
              <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
                <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9 flex justify-between items-center">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <button 
                      onClick={handleBackToHeatmap}
                      className="p-1 rounded-full hover:bg-[#1A304A] text-[#E91E63]"
                    >
                      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                    
                    <div className="flex items-center">
                      <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide whitespace-nowrap">
                        <span className="hidden xs:inline">EARNINGS HISTORY -</span> {selectedStock}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-mono text-[#38AAFD] truncate max-w-[120px] sm:max-w-none">{selectedStockInfo?.issuerName}</span>
                    <div className="h-1 w-6 bg-[#E91E63]"></div>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Stock Summary Card */}
              <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
                <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">LATEST QUARTER SUMMARY</h3>
                    </div>
                    <div className="h-1 w-8 bg-[#38AAFD]"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-[#0D2237] p-2 sm:p-3 rounded">
                      <div className="text-[#7A8999] text-[10px] sm:text-xs font-mono">LAST PRICE</div>
                      <div className="text-[#EFEFEF] text-base sm:text-lg font-mono mt-1">${selectedStockInfo?.last.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#0D2237] p-2 sm:p-3 rounded">
                      <div className="text-[#7A8999] text-[10px] sm:text-xs font-mono">CONSENSUS</div>
                      <div className="text-[#EFEFEF] text-base sm:text-lg font-mono mt-1">{selectedStockInfo?.consensusRecommendation}</div>
                    </div>
                    <div className="bg-[#0D2237] p-2 sm:p-3 rounded">
                      <div className="text-[#7A8999] text-[10px] sm:text-xs font-mono">YTD CHANGE</div>
                      <div className={`text-base sm:text-lg font-mono mt-1 ${selectedStockInfo?.price.ytd >= 0 ? 'text-[#4CAF50]' : 'text-[#FF5252]'}`}>
                        {selectedStockInfo?.price.ytd >= 0 ? '+' : ''}{selectedStockInfo?.price.ytd.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-[#0D2237] p-2 sm:p-3 rounded">
                      <div className="text-[#7A8999] text-[10px] sm:text-xs font-mono">52-WEEK LEVEL</div>
                      <div className="text-[#EFEFEF] text-base sm:text-lg font-mono mt-1">{selectedStockInfo?.price.pctOf52w.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Historical Earnings Detail Table */}
              <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
                <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center">
                      <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">QUARTERLY EARNINGS</h3>
                    </div>
                    <div className="h-1 w-8 bg-[#E91E63]"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-[10px] sm:text-xs h-8 border-b border-[#0F1A2A] bg-[#0D1F32]">
                          <th className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">QTR</th>
                          <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">CONS</th>
                          <th className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">LAST</th>
                          <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">EPS</th>
                          <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">REV</th>
                          <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">GUIDE</th>
                          <th className="px-2 sm:px-3 py-0 text-center font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">SCORE</th>
                          <th className="px-2 sm:px-3 py-0 text-right font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">MKT</th>
                          <th className="px-2 sm:px-3 py-0 text-left font-mono text-[#7A8999] font-medium tracking-wide whitespace-nowrap">NOTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStockData.map((item, index) => (
                          item.data && (
                            <tr key={index} className="border-b border-[#0F1A2A] h-8 hover:bg-[#0F2542]">
                              <td className="px-2 sm:px-3 py-0 text-left font-mono text-[#38AAFD] text-[10px] sm:text-xs font-medium whitespace-nowrap">{item.quarter}</td>
                              <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                                <span className={`text-[10px] sm:text-xs ${getConsensusColor(item.data.consensusRecommendation)}`}>{item.data.consensusRecommendation}</span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-right font-mono text-[#EFEFEF] text-[10px] sm:text-xs whitespace-nowrap">${item.data.last.toFixed(1)}</td>
                              <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                                <span className={`text-[10px] sm:text-xs ${getEpsColor(item.data.eps)}`}>{item.data.eps}</span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                                <span className={`text-[10px] sm:text-xs ${getEpsColor(item.data.rev)}`}>{item.data.rev}</span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                                <span className={`text-[10px] sm:text-xs ${getGuidanceColor(item.data.guidance)}`}>{item.data.guidance}</span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-center whitespace-nowrap">
                                <span className={`text-[10px] sm:text-xs ${getScoreColor(item.data.earningsScore)}`}>{item.data.earningsScore}</span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-right whitespace-nowrap">
                                <span className={`inline-block font-mono ${item.data.mktReaction >= 0 ? 'bg-[#4CAF50] text-white' : 'bg-[#FF5252] text-white'} px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium`}>
                                  {item.data.mktReaction >= 0 ? '+' : ''}{item.data.mktReaction.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 py-0 text-left whitespace-nowrap overflow-hidden" style={{ maxWidth: '80px', textOverflow: 'ellipsis' }}>
                                <span className={`font-mono text-[10px] sm:text-xs ${getReactionCommentaryColor(item.data.mktReactionCommentary)}`}>{item.data.mktReactionCommentary}</span>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Visual Charts Section - Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
                  <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">EARNINGS TREND</h3>
                      </div>
                      <div className="h-1 w-8 bg-[#4CAF50]"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 flex justify-center items-center bg-[#0D2237] h-[150px] sm:h-[200px]">
                    <span className="text-[#7A8999] text-[10px] sm:text-sm font-mono">EARNINGS GROWTH CHART</span>
                  </CardContent>
                </Card>
                
                <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden rounded-md">
                  <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center">
                        <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">PRICE REACTION</h3>
                      </div>
                      <div className="h-1 w-8 bg-[#38AAFD]"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4 flex justify-center items-center bg-[#0D2237] h-[150px] sm:h-[200px]">
                    <span className="text-[#7A8999] text-[10px] sm:text-sm font-mono">PRICE REACTION CHART</span>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Floating status bubble (similar to other pages) */}
      <div className="fixed bottom-4 right-4 z-50 bg-[#0A1929] border border-[#1A304A] rounded-md shadow-lg p-2 text-[0.65rem] max-w-[220px]">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#4CAF50] rounded-full mr-1"></div>
          <span className="text-[#7A8999] font-mono">LAST UPDATE:</span>
          <span className="ml-1 text-[#EFEFEF] font-mono truncate">
            {new Date().toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
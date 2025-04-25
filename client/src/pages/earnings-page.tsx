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

// Quarter-specific mock data
const quarterData: Record<string, {
  heatmapData: EarningsHeatmapDataItem[],
  stats: EarningsStats
}> = {
  // Q4 2024 Data
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

// Using the same color scheme as other pages
const getEpsColor = (value: string) => {
  switch (value) {
    case "Beat": return "bg-[#4CAF50] text-white";
    case "In-Line": return "bg-[#FFD700] text-black";
    case "Miss": return "bg-[#FF5252] text-white";
    default: return "bg-[#1A304A] text-[#EFEFEF]";
  }
};

const getGuidanceColor = (value: string) => {
  switch (value) {
    case "Increased": return "bg-[#4CAF50] text-white";
    case "Maintain": return "bg-[#FFD700] text-black";
    case "Reduced": return "bg-[#FF5252] text-white";
    default: return "bg-[#1A304A] text-[#EFEFEF]";
  }
};

const getScoreColor = (value: string) => {
  switch (value) {
    case "Good":
    case "Great": return "bg-[#4CAF50] text-white";
    case "Not So Bad": return "bg-[#FFD700] text-black";
    case "Ugly": return "bg-[#FF5252] text-white";
    default: return "bg-[#1A304A] text-[#EFEFEF]";
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

// Define quarter data for navigation
const quarters = [
  { quarter: "Q4 2024", year: 2024, quarterNum: 4 },
  { quarter: "Q3 2024", year: 2024, quarterNum: 3 },
  { quarter: "Q2 2024", year: 2024, quarterNum: 2 },
  { quarter: "Q1 2024", year: 2024, quarterNum: 1 },
  { quarter: "Q4 2023", year: 2023, quarterNum: 4 },
  { quarter: "Q3 2023", year: 2023, quarterNum: 3 },
];

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [currentQuarterIndex, setCurrentQuarterIndex] = useState(0); // Start with Q4 2024
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  
  // Get the current quarter and its data
  const currentQuarter = quarters[currentQuarterIndex].quarter;
  const currentQuarterData = quarterData[currentQuarter];
  
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
  
  // Find stock data across all quarters
  const getStockAcrossQuarters = (ticker: string) => {
    const stockData: Array<{
      quarter: string;
      data: EarningsHeatmapDataItem | undefined;
    }> = [];
    
    quarters.forEach(q => {
      const quarterDataObj = quarterData[q.quarter];
      const stockInQuarter = quarterDataObj.heatmapData.find(
        (item: EarningsHeatmapDataItem) => item.ticker === ticker
      );
      
      stockData.push({
        quarter: q.quarter,
        data: stockInQuarter
      });
    });
    
    return stockData.filter(item => item.data);
  };
  
  // Get data for selected stock if any
  const selectedStockData = selectedStock ? getStockAcrossQuarters(selectedStock) : [];
  const selectedStockInfo = selectedStock && selectedStockData.length > 0 
    ? selectedStockData[0].data 
    : null;
  
  // This useEffect would typically fetch data for the selected quarter
  React.useEffect(() => {
    console.log(`Loading data for: ${quarters[currentQuarterIndex].quarter}`);
    // In a real application, this would fetch data from the API for the selected quarter
    // For now, we're just using the mock data from quarterData
  }, [currentQuarterIndex]);

  return (
    <div className="container mx-auto p-4 bg-[#061220]">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#EFEFEF] font-mono tracking-tight">EARNINGS CENTER</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className="h-1 w-12 bg-[#E91E63]"></div>
            <p className="text-[#C0C0C0] text-sm font-mono tracking-tighter">EARNINGS CALENDAR • HEATMAP • INTAKES • ANALYSIS</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className={`grid ${selectedStock ? 'grid-cols-4' : 'grid-cols-3'} mb-4 bg-[#0A1929]`}>
          <TabsTrigger value="calendar" className="font-mono text-xs">
            <Calendar className="h-4 w-4 mr-2" />
            EARNINGS CALENDAR
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="font-mono text-xs">
            <BarChart3 className="h-4 w-4 mr-2" />
            EARNINGS HEATMAP
          </TabsTrigger>
          <TabsTrigger value="intakes" className="font-mono text-xs">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            EARNINGS INTAKES
          </TabsTrigger>
          {selectedStock && (
            <TabsTrigger value="stock-detail" className="font-mono text-xs">
              <LineChart className="h-4 w-4 mr-2" />
              STOCK DETAIL
            </TabsTrigger>
          )}
        </TabsList>

        {/* EARNINGS CALENDAR */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="border-0 shadow bg-[#0A1929]">
            <CardHeader className="card-header px-4 py-3 bg-[#111E2E] flex justify-between items-center">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-[#E91E63]" />
                <h3 className="text-left font-mono text-[#EFEFEF] text-sm">UPCOMING EARNINGS CALENDAR - Q2 2025</h3>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs border-b border-[#1A304A] bg-[#0D2237]">
                      <th className="p-2 text-left font-mono text-[#7A8999]">DATE</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">TICKER</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">COMPANY</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">TIME</th>
                      <th className="p-2 text-right font-mono text-[#7A8999]">EST. EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUpcomingEarnings.map((item, index) => (
                      <tr key={index} className="border-b border-[#1A304A] hover:bg-[#0F2542]">
                        <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.date}</td>
                        <td className="p-2 text-left font-mono text-[#38AAFD] text-xs">{item.ticker}</td>
                        <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.company}</td>
                        <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.time}</td>
                        <td className="p-2 text-right font-mono text-[#EFEFEF] text-xs">${item.eps.toFixed(2)}</td>
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
          <Card className="border-0 shadow bg-[#0A1929]">
            <CardHeader className="card-header px-4 py-3 bg-[#111E2E] flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {/* Previous Quarter Arrow */}
                <button 
                  onClick={previousQuarter}
                  className={`p-1 rounded-full ${currentQuarterIndex < quarters.length - 1 ? 'hover:bg-[#1A304A] text-[#E91E63]' : 'text-[#384b62] cursor-not-allowed'}`}
                  disabled={currentQuarterIndex >= quarters.length - 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Current Quarter Title */}
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#E91E63]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                    EARNINGS SEASON - {quarters[currentQuarterIndex].quarter}
                  </h3>
                </div>
                
                {/* Next Quarter Arrow */}
                <button 
                  onClick={nextQuarter}
                  className={`p-1 rounded-full ${currentQuarterIndex > 0 ? 'hover:bg-[#1A304A] text-[#E91E63]' : 'text-[#384b62] cursor-not-allowed'}`}
                  disabled={currentQuarterIndex <= 0}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-1 text-[#7A8999]" />
                <span className="text-xs font-mono text-[#7A8999]">FILTER</span>
              </div>
            </CardHeader>
          </Card>
          
          {/* Earnings Statistics Section */}
          <div className="grid grid-cols-4 gap-4">
            {/* EPS Stats */}
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-3 py-2 bg-[#111E2E]">
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 mr-1 text-[#4CAF50]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-xs">EPS</h3>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Beat <span className="font-bold">{currentQuarterData.stats.eps.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{currentQuarterData.stats.eps.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{currentQuarterData.stats.eps.miss}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Stats */}
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-3 py-2 bg-[#111E2E]">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-[#2196F3]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-xs">REVENUE</h3>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Beat <span className="font-bold">{currentQuarterData.stats.revenue.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{currentQuarterData.stats.revenue.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{currentQuarterData.stats.revenue.miss}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guidance Stats */}
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-3 py-2 bg-[#111E2E]">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1 text-[#FFCA28]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-xs">GUIDANCE</h3>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Increased <span className="font-bold">{currentQuarterData.stats.guidance.increased}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Maintain <span className="font-bold">{currentQuarterData.stats.guidance.maintain}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Reduced <span className="font-bold">{currentQuarterData.stats.guidance.reduced}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Score Stats */}
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-3 py-2 bg-[#111E2E]">
                <div className="flex items-center">
                  <Sparkles className="h-4 w-4 mr-1 text-[#E91E63]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-xs">EARNING SCORE</h3>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                  <div className="bg-[#4CAF50] text-white p-1 rounded text-center">
                    Great/Good <span className="font-bold">{currentQuarterData.stats.earningScore.greatGood}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Not So Bad <span className="font-bold">{currentQuarterData.stats.earningScore.notSoBad}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Ugly <span className="font-bold">{currentQuarterData.stats.earningScore.ugly}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Earnings Heatmap Table */}
          <Card className="border-0 shadow bg-[#0A1929]">
            <CardHeader className="card-header px-4 py-3 bg-[#111E2E] flex justify-between items-center">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-[#38AAFD]" />
                <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                  EARNINGS DETAILS - {quarters[currentQuarterIndex].quarter}
                </h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs border-b border-[#1A304A] bg-[#0D2237]">
                      <th className="p-2 text-left font-mono text-[#7A8999]">TICKER</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">ISSUER NAME</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">CONSENSUS</th>
                      <th className="p-2 text-right font-mono text-[#7A8999]">LAST</th>
                      <th className="p-2 text-center font-mono text-[#7A8999]">EPS</th>
                      <th className="p-2 text-center font-mono text-[#7A8999]">REV</th>
                      <th className="p-2 text-center font-mono text-[#7A8999]">GUIDANCE</th>
                      <th className="p-2 text-center font-mono text-[#7A8999]">SCORE</th>
                      <th className="p-2 text-right font-mono text-[#7A8999]">MKT REACTION</th>
                      <th className="p-2 text-left font-mono text-[#7A8999]">COMMENTARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuarterData.heatmapData.map((item: EarningsHeatmapDataItem, index: number) => (
                      <tr 
                        key={index} 
                        className="border-b border-[#1A304A] hover:bg-[#0F2542] cursor-pointer"
                        onClick={() => handleSelectStock(item.ticker)}
                        title="Click to view historical earnings performance"
                      >
                        <td className="p-2 text-left font-mono text-[#38AAFD] text-xs">
                          <div className="flex items-center">
                            <span>{item.ticker}</span>
                            <Info className="ml-1 h-3 w-3 text-[#E91E63] opacity-50" />
                          </div>
                        </td>
                        <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.issuerName}</td>
                        <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.consensusRecommendation}</td>
                        <td className="p-2 text-right font-mono text-[#EFEFEF] text-xs">{item.last.toFixed(1)}</td>
                        <td className={`p-2 text-center font-mono text-xs ${getEpsColor(item.eps)}`}>{item.eps}</td>
                        <td className={`p-2 text-center font-mono text-xs ${getEpsColor(item.rev)}`}>{item.rev}</td>
                        <td className={`p-2 text-center font-mono text-xs ${getGuidanceColor(item.guidance)}`}>{item.guidance}</td>
                        <td className={`p-2 text-center font-mono text-xs ${getScoreColor(item.earningsScore)}`}>{item.earningsScore}</td>
                        <td className={`p-2 text-right font-mono text-xs ${item.mktReaction >= 0 ? 'text-[#4CAF50]' : 'text-[#FF5252]'}`}>
                          {item.mktReaction >= 0 ? '+' : ''}{item.mktReaction.toFixed(1)}%
                        </td>
                        <td className={`p-2 text-left font-mono text-xs ${getReactionCommentaryColor(item.mktReactionCommentary)}`}>
                          {item.mktReactionCommentary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs font-mono text-[#7A8999]">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-[#4CAF50] rounded-sm"></div>
              <span>Beat / Increased / Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-[#FFD700] rounded-sm"></div>
              <span>In-Line / Maintain / Not So Bad</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-[#FF5252] rounded-sm"></div>
              <span>Miss / Reduced / Ugly</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-[#38AAFD] rounded-sm"></div>
              <span>Abnormal Reaction</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 bg-[#FF5252] rounded-sm"></div>
              <span>Explosive Reaction</span>
            </div>
          </div>
        </TabsContent>

        {/* EARNINGS INTAKES */}
        <TabsContent value="intakes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings Setup */}
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                <div className="flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-[#2196F3]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-sm">EARNINGS SETUP</h3>
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
            <Card className="border-0 shadow bg-[#0A1929]">
              <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#FFCA28]" />
                  <h3 className="text-left font-mono text-[#EFEFEF] text-sm">EARNINGS RECAP</h3>
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
              <Card className="border-0 shadow bg-[#0A1929]">
                <CardHeader className="card-header px-4 py-3 bg-[#111E2E] flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={handleBackToHeatmap}
                      className="p-1 rounded-full hover:bg-[#1A304A] text-[#E91E63]"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    
                    <div className="flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-[#E91E63]" />
                      <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                        EARNINGS HISTORY - {selectedStock}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-[#38AAFD]">{selectedStockInfo?.issuerName}</span>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Stock Summary Card */}
              <Card className="border-0 shadow bg-[#0A1929]">
                <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                  <div className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-[#38AAFD]" />
                    <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                      LATEST QUARTER SUMMARY
                    </h3>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#0D2237] p-3 rounded">
                      <div className="text-[#7A8999] text-xs font-mono">LAST PRICE</div>
                      <div className="text-[#EFEFEF] text-lg font-mono mt-1">${selectedStockInfo?.last.toFixed(2)}</div>
                    </div>
                    <div className="bg-[#0D2237] p-3 rounded">
                      <div className="text-[#7A8999] text-xs font-mono">CONSENSUS</div>
                      <div className="text-[#EFEFEF] text-lg font-mono mt-1">{selectedStockInfo?.consensusRecommendation}</div>
                    </div>
                    <div className="bg-[#0D2237] p-3 rounded">
                      <div className="text-[#7A8999] text-xs font-mono">YTD CHANGE</div>
                      <div className={`text-lg font-mono mt-1 ${selectedStockInfo?.price.ytd >= 0 ? 'text-[#4CAF50]' : 'text-[#FF5252]'}`}>
                        {selectedStockInfo?.price.ytd >= 0 ? '+' : ''}{selectedStockInfo?.price.ytd.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-[#0D2237] p-3 rounded">
                      <div className="text-[#7A8999] text-xs font-mono">52-WEEK LEVEL</div>
                      <div className="text-[#EFEFEF] text-lg font-mono mt-1">{selectedStockInfo?.price.pctOf52w.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Historical Earnings Detail Table */}
              <Card className="border-0 shadow bg-[#0A1929]">
                <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                  <div className="flex items-center">
                    <LineChart className="h-5 w-5 mr-2 text-[#38AAFD]" />
                    <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                      QUARTERLY EARNINGS PERFORMANCE
                    </h3>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-xs border-b border-[#1A304A] bg-[#0D2237]">
                          <th className="p-2 text-left font-mono text-[#7A8999]">QUARTER</th>
                          <th className="p-2 text-center font-mono text-[#7A8999]">EPS</th>
                          <th className="p-2 text-center font-mono text-[#7A8999]">REVENUE</th>
                          <th className="p-2 text-center font-mono text-[#7A8999]">GUIDANCE</th>
                          <th className="p-2 text-center font-mono text-[#7A8999]">SCORE</th>
                          <th className="p-2 text-right font-mono text-[#7A8999]">MKT REACTION</th>
                          <th className="p-2 text-left font-mono text-[#7A8999]">COMMENTARY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStockData.map((item, index) => (
                          item.data && (
                            <tr key={index} className="border-b border-[#1A304A] hover:bg-[#0F2542]">
                              <td className="p-2 text-left font-mono text-[#EFEFEF] text-xs">{item.quarter}</td>
                              <td className={`p-2 text-center font-mono text-xs ${getEpsColor(item.data.eps)}`}>{item.data.eps}</td>
                              <td className={`p-2 text-center font-mono text-xs ${getEpsColor(item.data.rev)}`}>{item.data.rev}</td>
                              <td className={`p-2 text-center font-mono text-xs ${getGuidanceColor(item.data.guidance)}`}>{item.data.guidance}</td>
                              <td className={`p-2 text-center font-mono text-xs ${getScoreColor(item.data.earningsScore)}`}>{item.data.earningsScore}</td>
                              <td className={`p-2 text-right font-mono text-xs ${item.data.mktReaction >= 0 ? 'text-[#4CAF50]' : 'text-[#FF5252]'}`}>
                                {item.data.mktReaction >= 0 ? '+' : ''}{item.data.mktReaction.toFixed(1)}%
                              </td>
                              <td className={`p-2 text-left font-mono text-xs ${getReactionCommentaryColor(item.data.mktReactionCommentary)}`}>
                                {item.data.mktReactionCommentary}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow bg-[#0A1929]">
                  <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                    <div className="flex items-center">
                      <BarChart className="h-5 w-5 mr-2 text-[#4CAF50]" />
                      <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                        EARNINGS TREND
                      </h3>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center items-center bg-[#0D2237] h-[200px]">
                    <span className="text-[#7A8999] text-sm font-mono">EARNINGS GROWTH CHART</span>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow bg-[#0A1929]">
                  <CardHeader className="card-header px-4 py-3 bg-[#111E2E]">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-[#38AAFD]" />
                      <h3 className="text-left font-mono text-[#EFEFEF] text-sm">
                        PRICE REACTION HISTORY
                      </h3>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center items-center bg-[#0D2237] h-[200px]">
                    <span className="text-[#7A8999] text-sm font-mono">PRICE REACTION CHART</span>
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
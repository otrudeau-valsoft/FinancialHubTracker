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
  Filter
} from "lucide-react";

// Mock data for earnings heatmap based on screenshot
const mockEarningsHeatmapData = [
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
];

// Mock data for the earnings stats
const mockEarningsStats = {
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

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState("heatmap");

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

      <Tabs defaultValue="heatmap" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4 bg-[#0A1929]">
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
          {/* Main Earnings Season Header */}
          <Card className="border-0 shadow bg-[#0A1929]">
            <CardHeader className="card-header px-4 py-3 bg-[#111E2E] flex justify-between items-center">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-[#E91E63]" />
                <h3 className="text-left font-mono text-[#EFEFEF] text-sm">EARNINGS SEASON - Q4 2024</h3>
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
                    Beat <span className="font-bold">{mockEarningsStats.eps.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{mockEarningsStats.eps.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{mockEarningsStats.eps.miss}</span>
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
                    Beat <span className="font-bold">{mockEarningsStats.revenue.beat}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    In-Line <span className="font-bold">{mockEarningsStats.revenue.inLine}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Miss <span className="font-bold">{mockEarningsStats.revenue.miss}</span>
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
                    Increased <span className="font-bold">{mockEarningsStats.guidance.increased}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Maintain <span className="font-bold">{mockEarningsStats.guidance.maintain}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Reduced <span className="font-bold">{mockEarningsStats.guidance.reduced}</span>
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
                    Great/Good <span className="font-bold">{mockEarningsStats.earningScore.greatGood}</span>
                  </div>
                  <div className="bg-[#FFD700] text-black p-1 rounded text-center">
                    Not So Bad <span className="font-bold">{mockEarningsStats.earningScore.notSoBad}</span>
                  </div>
                  <div className="bg-[#FF5252] text-white p-1 rounded text-center col-span-2">
                    Ugly <span className="font-bold">{mockEarningsStats.earningScore.ugly}</span>
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
                <h3 className="text-left font-mono text-[#EFEFEF] text-sm">EARNINGS DETAILS</h3>
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
                    {mockEarningsHeatmapData.map((item, index) => (
                      <tr key={index} className="border-b border-[#1A304A] hover:bg-[#0F2542]">
                        <td className="p-2 text-left font-mono text-[#38AAFD] text-xs">{item.ticker}</td>
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
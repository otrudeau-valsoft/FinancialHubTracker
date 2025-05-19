import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, BarChart3, Zap, TrendingUp, TrendingDown, Filter, AlertTriangle, Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PortfolioTable } from "@/components/dashboard/portfolio-table";
import { MatrixEngineControls } from "@/components/matrix/matrix-engine-controls";

// Rule categories and types
const RULE_CATEGORIES = {
  POSITION: {
    INCREASE: [
      { id: "price-52wk", name: "Price % vs 52-wk Hi", description: "Current price compared to 52-week high" },
      { id: "rsi-low", name: "RSI (Low)", description: "Relative Strength Index below threshold" },
      { id: "macd-below", name: "MACD Below Zero", description: "MACD line below zero with positive delta" },
      { id: "golden-cross-pos", name: "Golden Cross (Positive)", description: "Short-term MA crosses above long-term MA" },
      { id: "sector-perf-neg", name: "Sector Underperformance", description: "Stock underperforming its sector" },
      { id: "at-200ma", name: "On 200 MA", description: "Price close to 200-day moving average" }
    ],
    DECREASE: [
      { id: "price-90day", name: "Price Performance % (90d)", description: "90-day performance exceeds threshold" },
      { id: "max-weight", name: "Max Portfolio Weight %", description: "Position exceeds maximum portfolio weight" },
      { id: "max-weight-intl", name: "Max PTF Weight % (INTL)", description: "International position exceeds maximum weight" },
      { id: "active-risk", name: "Active Risk %", description: "Position contributes excess risk to portfolio" },
      { id: "rsi-high", name: "RSI (High)", description: "Relative Strength Index above threshold" },
      { id: "macd-above", name: "MACD Above Zero", description: "MACD line above zero with negative delta" },
      { id: "golden-cross-neg", name: "Golden Cross (Negative)", description: "Short-term MA crosses below long-term MA" },
      { id: "sector-perf-pos", name: "Sector Outperformance", description: "Stock outperforming its sector" },
      { id: "under-200ma", name: "Under 200 MA", description: "Price below 200-day moving average" }
    ]
  },
  RATING: {
    INCREASE: [
      { id: "earnings-quality", name: "Earnings Quality", description: "Beat/raise performance metrics" },
      { id: "analyst-upgrades", name: "Analyst Upgrades", description: "Recent analyst upgrades or positive comments" },
      { id: "ebitda-margin", name: "EBITDA Margin Evolution", description: "Positive EBITDA margin trends" },
      { id: "roic-increase", name: "ROIC Evolution", description: "Positive ROIC trends" },
      { id: "debt-reduction", name: "Net Debt Evolution", description: "Positive debt reduction trends" }
    ],
    DECREASE: [
      { id: "negative-quarters", name: "Negative Quarters", description: "Consecutive quarters of missed expectations" },
      { id: "ebitda-margin-neg", name: "EBITDA Margin Decline", description: "Negative EBITDA margin trends" },
      { id: "roic-decrease", name: "ROIC Decline", description: "Negative ROIC trends" },
      { id: "debt-increase", name: "Net Debt Increase", description: "Negative debt trends" }
    ]
  }
};

// Actual thresholds based on Matrices decisionnelles.csv
const MATRIX_THRESHOLDS = {
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

// Sample triggered rules for demonstration
const SAMPLE_TRIGGERED_RULES = [
  { 
    symbol: "MSFT", 
    company: "Microsoft Corp",
    rules: [
      { category: "POSITION", action: "INCREASE", rule: "rsi-low", value: "38", threshold: "40" },
      { category: "RATING", action: "INCREASE", rule: "analyst-upgrades", value: "3 upgrades", threshold: "2 upgrades" }
    ] 
  },
  { 
    symbol: "AAPL", 
    company: "Apple Inc",
    rules: [
      { category: "POSITION", action: "DECREASE", rule: "rsi-high", value: "72", threshold: "70" },
    ] 
  },
  { 
    symbol: "AVGO", 
    company: "Broadcom Inc",
    rules: [
      { category: "POSITION", action: "DECREASE", rule: "max-weight", value: "8.5%", threshold: "8%" },
      { category: "RATING", action: "INCREASE", rule: "earnings-quality", value: "Beat and raise", threshold: "2 points" }
    ] 
  },
  { 
    symbol: "CAT", 
    company: "Caterpillar Inc",
    rules: [
      { category: "POSITION", action: "INCREASE", rule: "sector-perf-neg", value: "-12%", threshold: "-10%" },
    ] 
  },
];

// Rule Flow Diagram Component
const RuleFlowDiagram = () => {
  return (
    <Card className="bg-[#0A1524] border-[#1A304A]">
      <CardHeader>
        <CardTitle className="text-[#EFEFEF] font-mono text-lg">MATRIX RULE FLOW</CardTitle>
        <CardDescription className="text-[#7A8999]">Visualization of rule processing sequence</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="h-36 w-full relative mb-8">
            {/* Input node */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-[#061220] border border-[#1A304A] rounded-md p-2 w-48 flex justify-center">
              <div className="text-center">
                <div className="text-[#38AAFD] font-mono text-xs mb-1">STOCK INPUT</div>
                <div className="text-[#EFEFEF] text-xs">Classification + Rating</div>
              </div>
            </div>
            
            {/* Arrow down */}
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 h-8 w-0.5 bg-[#1A304A]">
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-[#1A304A] rotate-45"></div>
            </div>
            
            {/* Processing node */}
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-[#061220] border border-[#1A304A] rounded-md p-2 w-48 flex justify-center">
              <div className="text-center">
                <div className="text-[#FF9800] font-mono text-xs mb-1">MATRIX ENGINE</div>
                <div className="text-[#EFEFEF] text-xs">Rule Evaluation</div>
              </div>
            </div>
          </div>
          
          {/* Output branches */}
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="flex flex-col items-center">
              <div className="h-16 w-0.5 bg-[#1A304A] mb-3">
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-[#1A304A] rotate-45 mb-3"></div>
              </div>
              <div className="bg-[#061220] border border-[#1A304A] rounded-md p-2 w-full">
                <div className="text-center">
                  <div className="text-[#4CAF50] font-mono text-xs mb-1">POSITION CHANGE</div>
                  <div className="text-[#EFEFEF] text-xs">Increase/Decrease</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-16 w-0.5 bg-[#1A304A] mb-3">
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 border-b-2 border-r-2 border-[#1A304A] rotate-45 mb-3"></div>
              </div>
              <div className="bg-[#061220] border border-[#1A304A] rounded-md p-2 w-full">
                <div className="text-center">
                  <div className="text-[#805AD5] font-mono text-xs mb-1">RATING CHANGE</div>
                  <div className="text-[#EFEFEF] text-xs">Upgrade/Downgrade</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Rule Threshold Card Component
const RuleThresholdCard = ({ ruleType, ruleId, ruleName, description }: { ruleType: string, ruleId: string, ruleName: string, description: string }) => {
  // Get thresholds for this rule (would come from API in real implementation)
  const thresholds = MATRIX_THRESHOLDS[ruleId as keyof typeof MATRIX_THRESHOLDS] || {
    Compounder: { 1: "N/A", 2: "N/A", 3: "N/A", 4: "N/A" },
    Catalyst: { 1: "N/A", 2: "N/A", 3: "N/A", 4: "N/A" },
    Cyclical: { 1: "N/A", 2: "N/A", 3: "N/A", 4: "N/A" }
  } as {
    Compounder: { [key: number]: string },
    Catalyst: { [key: number]: string },
    Cyclical: { [key: number]: string }
  };
  
  return (
    <Card className="bg-[#0A1524] border-[#1A304A] h-full">
      <CardHeader className={`pb-3 ${ruleType === 'INCREASE' ? 'border-b-[#4CAF50]/30' : 'border-b-[#FF3D00]/30'} border-b`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#EFEFEF] font-mono text-sm">{ruleName}</CardTitle>
          <Badge variant={ruleType === 'INCREASE' ? 'outline' : 'destructive'} className="font-mono text-[10px]">
            {ruleType === 'INCREASE' ? 'INCREASE' : 'DECREASE'}
          </Badge>
        </div>
        <CardDescription className="text-[#7A8999] text-xs mt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-4 gap-2 text-[10px] mb-1.5 font-mono text-[#7A8999]">
          <div>RATING</div>
          <div className="text-center">1</div>
          <div className="text-center">2</div>
          <div className="text-center">3</div>
        </div>
        <div className="space-y-2">
          {Object.entries(thresholds).map(([stockType, ratingValues]) => (
            <div key={stockType} className="grid grid-cols-4 gap-2 text-[11px]">
              <div className="font-mono text-[#EFEFEF]">{stockType}</div>
              <div className={`text-center ${ratingValues[1] === 'N/A' ? 'text-[#7A8999]' : 'text-[#EFEFEF]'}`}>
                {ratingValues[1]}
              </div>
              <div className={`text-center ${ratingValues[2] === 'N/A' ? 'text-[#7A8999]' : 'text-[#EFEFEF]'}`}>
                {ratingValues[2]}
              </div>
              <div className={`text-center ${ratingValues[3] === 'N/A' ? 'text-[#7A8999]' : 'text-[#EFEFEF]'}`}>
                {ratingValues[3]}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Triggered Rules Component
const TriggeredRules = () => {
  // Would fetch this from API in real implementation
  const triggeredRules = SAMPLE_TRIGGERED_RULES;
  
  return (
    <Card className="bg-[#0A1524] border-[#1A304A]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-[#EFEFEF] font-mono text-lg">TRIGGERED RULES</CardTitle>
            <CardDescription className="text-[#7A8999]">
              Stocks with active rule alerts
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-[#FF3D00]">
            {triggeredRules.length} Alerts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {triggeredRules.map((stock) => (
            <Card key={stock.symbol} className="bg-[#061220] border-[#1A304A]">
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[#EFEFEF] font-medium">{stock.symbol}</div>
                    <div className="text-[#7A8999] text-sm">{stock.company}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="space-y-2">
                  {stock.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0A1524] p-2 rounded-sm text-xs">
                      <div className="flex items-center gap-2">
                        {rule.action === 'INCREASE' ? (
                          <ArrowUp className="h-4 w-4 text-[#4CAF50]" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-[#FF3D00]" />
                        )}
                        <span className="text-[#EFEFEF]">{RULE_CATEGORIES[rule.category as keyof typeof RULE_CATEGORIES][rule.action as keyof typeof RULE_CATEGORIES.POSITION].find(r => r.id === rule.rule)?.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`font-mono ${rule.action === 'INCREASE' ? 'text-[#4CAF50]' : 'text-[#FF3D00]'}`}>
                          {rule.value}
                        </span>
                        <span className="mx-1 text-[#7A8999]">|</span>
                        <span className="text-[#7A8999]">Threshold: {rule.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function MatrixEngine() {
  const [activeRegion, setActiveRegion] = useState<string>("USD");
  const [activeTab, setActiveTab] = useState<string>("position");
  const [activeAction, setActiveAction] = useState<string>("INCREASE");
  
  // Would fetch these from API in real implementation
  const { data: usdStocks, isLoading: usdLoading } = useQuery({
    queryKey: ['/api/portfolios/USD/stocks'],
    staleTime: 30000,
  });
  
  const { data: currentPrices } = useQuery({
    queryKey: [`/api/current-prices/${activeRegion}`],
    staleTime: 30000,
  });
  
  return (
    <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#061220]">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-xl font-medium text-[#EFEFEF] font-mono tracking-tight">MATRIX RULE ENGINE</h1>
            <div className="flex mt-1">
              <div className="h-0.5 w-8 bg-[#FF9800]"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeRegion} onValueChange={setActiveRegion}>
              <SelectTrigger className="w-[100px] h-8 bg-[#0A1524] border-[#1A304A] text-[#EFEFEF]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A1524] border-[#1A304A]">
                <SelectItem value="USD" className="text-[#EFEFEF]">USD</SelectItem>
                <SelectItem value="CAD" className="text-[#EFEFEF]">CAD</SelectItem>
                <SelectItem value="INTL" className="text-[#EFEFEF]">INTL</SelectItem>
              </SelectContent>
            </Select>
            {/* Button removed since we're using the MatrixEngineControls component */}
          </div>
        </div>
      </div>
      
      {/* Matrix Engine with streamlined controls */}
      <div className="mb-6">
        <MatrixEngineControls />
      </div>
      
      <Tabs defaultValue="position" className="mb-6" onValueChange={(value) => setActiveTab(value)}>
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-[#0A1524] border border-[#1A304A]">
            <TabsTrigger value="position" className="data-[state=active]:bg-[#0D1F35] data-[state=active]:text-[#EFEFEF]">
              <BarChart3 className="h-4 w-4 mr-2" />
              Position Rules
            </TabsTrigger>
            <TabsTrigger value="rating" className="data-[state=active]:bg-[#0D1F35] data-[state=active]:text-[#EFEFEF]">
              <Filter className="h-4 w-4 mr-2" />
              Rating Rules
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center">
            <Button 
              variant={activeAction === "INCREASE" ? "default" : "outline"} 
              size="sm"
              className={`mr-2 ${activeAction === "INCREASE" ? "bg-[#4CAF50] hover:bg-[#4CAF50]/90" : "border-[#1A304A] text-[#EFEFEF]"}`}
              onClick={() => setActiveAction("INCREASE")}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Increase
            </Button>
            <Button 
              variant={activeAction === "DECREASE" ? "default" : "outline"} 
              size="sm"
              className={`${activeAction === "DECREASE" ? "bg-[#FF3D00] hover:bg-[#FF3D00]/90" : "border-[#1A304A] text-[#EFEFEF]"}`}
              onClick={() => setActiveAction("DECREASE")}
            >
              <TrendingDown className="h-3.5 w-3.5 mr-1" />
              Decrease
            </Button>
          </div>
        </div>
        
        <TabsContent value="position" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RULE_CATEGORIES.POSITION[activeAction as keyof typeof RULE_CATEGORIES.POSITION].map(rule => (
              <RuleThresholdCard
                key={rule.id}
                ruleType={activeAction}
                ruleId={rule.id}
                ruleName={rule.name}
                description={rule.description}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="rating" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RULE_CATEGORIES.RATING[activeAction as keyof typeof RULE_CATEGORIES.RATING].map(rule => (
              <RuleThresholdCard
                key={rule.id}
                ruleType={activeAction}
                ruleId={rule.id}
                ruleName={rule.name}
                description={rule.description}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-[#EFEFEF] font-mono tracking-tight">PORTFOLIO STOCKS</h2>
          <Button variant="outline" size="sm" className="h-8 bg-[#0A1524] border-[#1A304A] text-[#EFEFEF]">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            View All Alerts
          </Button>
        </div>
        
        {usdLoading ? (
          <div className="text-center p-8">Loading portfolio data...</div>
        ) : (
          <PortfolioTable
            stocks={Array.isArray(usdStocks) ? usdStocks : []}
            region={activeRegion as "USD" | "CAD" | "INTL"}
            currentPrices={Array.isArray(currentPrices) ? currentPrices : []}
          />
        )}
      </div>
    </div>
  );
}
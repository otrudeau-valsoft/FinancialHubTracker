import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, DownloadCloud, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { parseCSV, convertMatrixRulesData } from "@/lib/parse-csv";

interface StockTypeValue {
  Comp: string;
  Cat: string;
  Cycl: string;
}

interface MatrixRule {
  id: number;
  ruleType: string;
  actionType: string;
  stockTypeValue: StockTypeValue;
  orderNumber: number;
}

export default function MatrixRulesPage() {
  const [activeTab, setActiveTab] = useState("increase");
  const fileInputRef = React.createRef<HTMLInputElement>();

  // Fetch matrix rules
  const { data: increaseRules, isLoading: increaseRulesLoading, refetch: refetchIncreaseRules } = useQuery({
    queryKey: ['/api/matrix-rules/Increase'],
    staleTime: 3600000, // 1 hour
  });

  const { data: decreaseRules, isLoading: decreaseRulesLoading, refetch: refetchDecreaseRules } = useQuery({
    queryKey: ['/api/matrix-rules/Decrease'],
    staleTime: 3600000, // 1 hour
  });

  // Organize rules by order number
  const organizeRulesByOrder = (rules: MatrixRule[] | undefined) => {
    if (!rules || rules.length === 0) return [];
    
    const orderGroups: { [key: number]: MatrixRule[] } = {};
    
    rules.forEach(rule => {
      if (!orderGroups[rule.orderNumber]) {
        orderGroups[rule.orderNumber] = [];
      }
      orderGroups[rule.orderNumber].push(rule);
    });
    
    return Object.keys(orderGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(order => ({
        orderNumber: order,
        rules: orderGroups[order]
      }));
  };

  const increaseRulesByOrder = organizeRulesByOrder(increaseRules);
  const decreaseRulesByOrder = organizeRulesByOrder(decreaseRules);

  // Import matrix rules from CSV
  const handleImportData = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        const parsed = parseCSV(csvData);
        
        if (parsed.data.length > 0) {
          const formattedData = convertMatrixRulesData(parsed.data);
          
          // Send the formatted data to the server
          await apiRequest('POST', '/api/matrix-rules/bulk', {
            rules: formattedData
          });
          
          // Refetch data
          refetchIncreaseRules();
          refetchDecreaseRules();
          
          alert(`Successfully imported ${formattedData.length} matrix rules`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing data:", error);
      alert("Failed to import data. Please check the file format.");
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Matrix Rules Engine</h1>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import Rules
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={(e) => e.target.files && handleImportData(e.target.files[0])} 
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            The Matrix Rule Engine automatically identifies investment opportunities based on predefined criteria. 
            These rules are applied to stocks based on their classification (Compounder, Catalyst, Cyclical) and rating (1-4).
          </p>
        </div>
        
        <Tabs defaultValue="increase" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="increase">Increase Position Rules</TabsTrigger>
            <TabsTrigger value="decrease">Decrease Position Rules</TabsTrigger>
          </TabsList>
          
          <TabsContent value="increase">
            {increaseRulesLoading ? (
              <div className="text-center p-8">Loading increase position rules...</div>
            ) : (
              <>
                <Card className="bg-card mb-6">
                  <CardHeader className="card-header flex justify-between items-center">
                    <h3>Increase Position Rules</h3>
                    <p className="text-xs text-gray-400">Rules to identify buy opportunities</p>
                  </CardHeader>
                  <CardContent>
                    {increaseRulesByOrder.length > 0 ? (
                      increaseRulesByOrder.map(orderGroup => (
                        <div key={`increase-order-${orderGroup.orderNumber}`} className="mb-6">
                          <h4 className="text-sm font-semibold mb-2">Priority {orderGroup.orderNumber} Rules</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-800 data-table">
                              <thead>
                                <tr>
                                  <th scope="col" className="text-left">Rule Type</th>
                                  <th scope="col">Compounder</th>
                                  <th scope="col">Catalyst</th>
                                  <th scope="col">Cyclical</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800 text-xs mono">
                                {orderGroup.rules.map(rule => (
                                  <tr key={rule.id}>
                                    <td className="text-left">{rule.ruleType}</td>
                                    <td>{rule.stockTypeValue.Comp || 'N/A'}</td>
                                    <td>{rule.stockTypeValue.Cat || 'N/A'}</td>
                                    <td>{rule.stockTypeValue.Cycl || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 text-gray-400">
                        No increase position rules defined. Upload rules to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="decrease">
            {decreaseRulesLoading ? (
              <div className="text-center p-8">Loading decrease position rules...</div>
            ) : (
              <>
                <Card className="bg-card mb-6">
                  <CardHeader className="card-header flex justify-between items-center">
                    <h3>Decrease Position Rules</h3>
                    <p className="text-xs text-gray-400">Rules to identify sell opportunities</p>
                  </CardHeader>
                  <CardContent>
                    {decreaseRulesByOrder.length > 0 ? (
                      decreaseRulesByOrder.map(orderGroup => (
                        <div key={`decrease-order-${orderGroup.orderNumber}`} className="mb-6">
                          <h4 className="text-sm font-semibold mb-2">Priority {orderGroup.orderNumber} Rules</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-800 data-table">
                              <thead>
                                <tr>
                                  <th scope="col" className="text-left">Rule Type</th>
                                  <th scope="col">Compounder</th>
                                  <th scope="col">Catalyst</th>
                                  <th scope="col">Cyclical</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800 text-xs mono">
                                {orderGroup.rules.map(rule => (
                                  <tr key={rule.id}>
                                    <td className="text-left">{rule.ruleType}</td>
                                    <td>{rule.stockTypeValue.Comp || 'N/A'}</td>
                                    <td>{rule.stockTypeValue.Cat || 'N/A'}</td>
                                    <td>{rule.stockTypeValue.Cycl || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 text-gray-400">
                        No decrease position rules defined. Upload rules to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Card className="bg-card mb-6">
          <CardHeader className="card-header">
            <h3>How to Use Matrix Rules</h3>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <div className="text-sm">
              <p>
                The Matrix Rule Engine helps you make more consistent investment decisions based on quantitative factors.
                Rules are prioritized from Order #1 (highest priority) to Order #4 (lowest priority).
              </p>
              
              <h4 className="text-base font-semibold mt-4">Rule Types</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Price % vs 52-wk Hi:</strong> Percentage below 52-week high price</li>
                <li><strong>RSI:</strong> Relative Strength Index threshold for identifying oversold/overbought</li>
                <li><strong>MACD:</strong> Moving Average Convergence Divergence signal direction</li>
                <li><strong>Golden Cross:</strong> 50-day MA crossing above/below 200-day MA</li>
                <li><strong>Performance vs Sector:</strong> Stock performance relative to its sector</li>
                <li><strong>Max Portfolio Weight:</strong> Maximum allowed portfolio allocation</li>
              </ul>
              
              <h4 className="text-base font-semibold mt-4">Stock Classifications</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Compounder (Comp):</strong> Stable businesses with consistent growth</li>
                <li><strong>Catalyst (Cat):</strong> Companies with specific events that could drive price changes</li>
                <li><strong>Cyclical (Cycl):</strong> Businesses that follow economic cycles</li>
              </ul>
              
              <h4 className="text-base font-semibold mt-4">Ratings (1-4)</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>1:</strong> Highest conviction - core holdings</li>
                <li><strong>2:</strong> Strong conviction - significant positions</li>
                <li><strong>3:</strong> Moderate conviction - smaller positions</li>
                <li><strong>4:</strong> Weakest conviction - smallest positions or candidates for removal</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardHeader, CardContent } from "@/components/ui/card";

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

interface MatrixRulesProps {
  increaseRules: MatrixRule[];
  decreaseRules: MatrixRule[];
}

export const MatrixRules = ({ increaseRules, decreaseRules }: MatrixRulesProps) => {
  // Process rules to get unique rule types
  const increaseRuleTypes = [...new Set(increaseRules.map(rule => rule.ruleType))];
  const decreaseRuleTypes = [...new Set(decreaseRules.map(rule => rule.ruleType))];

  // Filter for first order rules (most important)
  const firstOrderIncreaseRules = increaseRules.filter(rule => rule.orderNumber === 1);
  const firstOrderDecreaseRules = decreaseRules.filter(rule => rule.orderNumber === 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Increase Position Rules */}
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">INCREASE RULES</h3>
            <div className="h-1 w-8 bg-[#4CAF50]"></div>
          </div>
        </CardHeader>
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
              {firstOrderIncreaseRules.map((rule) => (
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
      </Card>
      
      {/* Decrease Position Rules */}
      <Card className="border border-[#1A304A] bg-gradient-to-b from-[#0B1728] to-[#061220] shadow-md overflow-hidden">
        <CardHeader className="card-header p-2 bg-[#111E2E] border-b border-[#193049] h-9">
          <div className="w-full flex items-center justify-between">
            <h3 className="font-mono text-[#B8C4D9] text-[10px] sm:text-xs tracking-wide">DECREASE RULES</h3>
            <div className="h-1 w-8 bg-[#F44336]"></div>
          </div>
        </CardHeader>
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
              {firstOrderDecreaseRules.map((rule) => (
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
      </Card>
    </div>
  );
};

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

interface MatrixRulesTableProps {
  rules: MatrixRule[];
  title: string;
  description?: string;
  isLoading?: boolean;
}

export const MatrixRulesTable = ({
  rules,
  title,
  description,
  isLoading = false
}: MatrixRulesTableProps) => {
  // Organize rules by order number
  const organizeRulesByOrder = (rules: MatrixRule[]) => {
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

  const rulesByOrder = organizeRulesByOrder(rules);

  return (
    <Card className="bg-card">
      <CardHeader className="card-header flex justify-between items-center">
        <h3>{title}</h3>
        {description && <div className="text-xs text-gray-400">{description}</div>}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center p-8">Loading rules data...</div>
        ) : rulesByOrder.length > 0 ? (
          rulesByOrder.map(orderGroup => (
            <div key={`order-${orderGroup.orderNumber}`} className="mb-6">
              <h4 className="text-sm font-semibold ml-4 mt-4 mb-2">Priority {orderGroup.orderNumber} Rules</h4>
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
          <div className="text-center p-8 text-gray-400">
            No rules defined. Import rules to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

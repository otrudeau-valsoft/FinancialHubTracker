import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStockTypeColor } from "@/lib/utils";

interface AllocationChartProps {
  typeAllocation: {
    Comp: number;
    Cat: number;
    Cycl: number;
    [key: string]: number;
  };
  ratingAllocation: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    [key: string]: number;
  };
}

export const AllocationChart = ({ typeAllocation, ratingAllocation }: AllocationChartProps) => {
  const typeColors = {
    Comp: getStockTypeColor('comp'),
    Cat: getStockTypeColor('cat'),
    Cycl: getStockTypeColor('cycl')
  };
  
  const ratingColors = {
    "1": "#00C853", // Green
    "2": "#66BB6A", // Light Green
    "3": "#FFC107", // Yellow/Warning
    "4": "#FF3D00"  // Red
  };
  
  return (
    <Card className="bg-card">
      <CardHeader className="card-header flex justify-between items-center">
        <h3>Portfolio Allocation</h3>
        <div className="text-xs text-gray-400">By classification</div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col h-full justify-center items-center space-y-3">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: typeColors.Comp }}></div>
              <span className="text-xs">Compounder <span className="mono">{typeAllocation.Comp || 0}%</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: typeColors.Cat }}></div>
              <span className="text-xs">Catalyst <span className="mono">{typeAllocation.Cat || 0}%</span></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: typeColors.Cycl }}></div>
              <span className="text-xs">Cyclical <span className="mono">{typeAllocation.Cycl || 0}%</span></span>
            </div>
          </div>
          
          <div className="w-full bg-gray-800 h-6 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div style={{ 
                width: `${typeAllocation.Comp || 0}%`, 
                backgroundColor: typeColors.Comp 
              }} className="h-full"></div>
              <div style={{ 
                width: `${typeAllocation.Cat || 0}%`, 
                backgroundColor: typeColors.Cat 
              }} className="h-full"></div>
              <div style={{ 
                width: `${typeAllocation.Cycl || 0}%`, 
                backgroundColor: typeColors.Cycl 
              }} className="h-full"></div>
            </div>
          </div>
          
          <div className="flex justify-between w-full px-2">
            <div className="text-xs text-gray-400">By rating:</div>
            <div className="flex space-x-4 text-xs mono">
              <div>1: <span className="text-profit">{ratingAllocation["1"] || 0}%</span></div>
              <div>2: <span style={{ color: ratingColors["2"] }}>{ratingAllocation["2"] || 0}%</span></div>
              <div>3: <span style={{ color: ratingColors["3"] }}>{ratingAllocation["3"] || 0}%</span></div>
              <div>4: <span className="text-loss">{ratingAllocation["4"] || 0}%</span></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

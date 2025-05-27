import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStockTypeColor } from "@/lib/utils";
import { PieChart } from "lucide-react";

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
    Cycl: getStockTypeColor('cycl'),
    Cash: '#FFD700' // Yellow/Gold for cash
  };
  
  const ratingColors = {
    "1": "#00C853", // Green
    "2": "#66BB6A", // Light Green
    "3": "#FFC107", // Yellow/Warning
    "4": "#FF3D00"  // Red
  };
  
  return (
    <div className="bg-[#0A1524] border border-[#1A304A] overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-[#1A304A]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-[#EFEFEF] text-sm tracking-wide">ALLOCATION</h3>
            <div className="flex items-center mt-1">
              <div className="h-0.5 w-6 bg-[#FFD700]"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex flex-col h-full justify-center space-y-6">
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="flex flex-col items-center">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1.5" style={{ backgroundColor: typeColors.Comp }}></div>
                <span className="text-[10px] sm:text-xs font-mono text-[#EFEFEF]">COMPOUNDER</span>
              </div>
              <span className="text-[12px] sm:text-sm font-mono font-medium" style={{ color: typeColors.Comp }}>{typeAllocation.Comp || 0}%</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1.5" style={{ backgroundColor: typeColors.Cat }}></div>
                <span className="text-[10px] sm:text-xs font-mono text-[#EFEFEF]">CATALYST</span>
              </div>
              <span className="text-[12px] sm:text-sm font-mono font-medium" style={{ color: typeColors.Cat }}>{typeAllocation.Cat || 0}%</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1.5" style={{ backgroundColor: typeColors.Cycl }}></div>
                <span className="text-[10px] sm:text-xs font-mono text-[#EFEFEF]">CYCLICAL</span>
              </div>
              <span className="text-[12px] sm:text-sm font-mono font-medium" style={{ color: typeColors.Cycl }}>{typeAllocation.Cycl || 0}%</span>
            </div>
          </div>
          
          <div className="w-full bg-[#0D1C30] h-4 sm:h-5 rounded-sm overflow-hidden border border-[#1A304A]">
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
          
          <div className="flex flex-col space-y-4 border-t border-[#1A304A] pt-6">
            <div className="text-xs font-mono text-[#7A8999] mb-2 uppercase tracking-wide">RATING DISTRIBUTION</div>
            <div className="grid grid-cols-4 gap-3 text-xs font-mono">
              <div className="text-center">
                <div className="text-[#7A8999] mb-2">RATING 1</div>
                <span className="font-medium text-[#00C853] text-lg">{ratingAllocation["1"] || 0}%</span>
              </div>
              <div className="text-center">
                <div className="text-[#7A8999] mb-2">RATING 2</div>
                <span className="font-medium text-[#66BB6A] text-lg">{ratingAllocation["2"] || 0}%</span>
              </div>
              <div className="text-center">
                <div className="text-[#7A8999] mb-2">RATING 3</div>
                <span className="font-medium text-[#FFC107] text-lg">{ratingAllocation["3"] || 0}%</span>
              </div>
              <div className="text-center">
                <div className="text-[#7A8999] mb-2">RATING 4</div>
                <span className="font-medium text-[#FF3D00] text-lg">{ratingAllocation["4"] || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

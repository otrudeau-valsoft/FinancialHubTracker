import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string | React.ReactNode;
  change?: string | number | React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const DataCard = ({ 
  title,
  value,
  subtitle,
  change,
  className,
  icon
}: DataCardProps) => {
  return (
    <Card className={cn("bg-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-gray-400 text-xs">{title}</div>
            <div className="flex items-baseline mt-1">
              <span className="text-2xl font-semibold mono">{value}</span>
              {change && <span className="ml-2 text-xs mono">{change}</span>}
            </div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
          </div>
          {icon && (
            <div className="text-gray-400">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

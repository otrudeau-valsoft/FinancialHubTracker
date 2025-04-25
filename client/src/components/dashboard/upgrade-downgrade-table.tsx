import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Circle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

// Enum for action types
const ACTION_TYPES = {
  up: "Upgrade",
  down: "Downgrade",
  init: "Initiate",
  main: "Maintain",
  reit: "Reiterate"
};

type UpgradeDowngradeItem = {
  id: number;
  symbol: string;
  region: string;
  firm: string;
  toGrade: string;
  fromGrade: string | null;
  action: string;
  epochGradeDate: string | null;
  gradeDate: string;
  createdAt: string;
};

interface UpgradeDowngradeTableProps {
  region: 'USD' | 'CAD' | 'INTL';
  symbol?: string;
  showHeader?: boolean;
  limit?: number;
}

export function UpgradeDowngradeTable({ 
  region, 
  symbol, 
  showHeader = true, 
  limit = 20 
}: UpgradeDowngradeTableProps) {
  const [viewType, setViewType] = useState<'all' | 'upgrades' | 'downgrades'>('all');
  
  // Fetch data based on whether we're looking at a specific stock or all stocks in the region
  const queryEndpoint = symbol 
    ? `/api/upgrade-downgrade/stock/${symbol}/${region}`
    : `/api/upgrade-downgrade/region/${region}`;
    
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['upgradeDowngrade', region, symbol],
    queryFn: async () => {
      const response = await fetch(queryEndpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch upgrade/downgrade data');
      }
      return response.json() as Promise<UpgradeDowngradeItem[]>;
    }
  });
  
  // Filter data based on selected view type
  const filteredData = React.useMemo(() => {
    if (!data) return [];
    
    if (viewType === 'all') return data.slice(0, limit);
    
    return data
      .filter(item => {
        if (viewType === 'upgrades') return item.action === 'up';
        if (viewType === 'downgrades') return item.action === 'down';
        return true;
      })
      .slice(0, limit);
  }, [data, viewType, limit]);
  
  // Trigger an update to fetch the latest data
  const handleRefreshData = async () => {
    try {
      const endpoint = symbol 
        ? `/api/upgrade-downgrade/fetch/stock/${symbol}/${region}`
        : `/api/upgrade-downgrade/fetch/region/${region}`;
        
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (!response.ok) {
        throw new Error('Failed to refresh data');
      }
      
      toast({
        title: 'Update initiated',
        description: 'Analyst ratings data update has been started. This may take a few minutes.',
      });
      
      // After a few seconds, refetch to see new data
      setTimeout(() => {
        refetch();
      }, 5000);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Get the action icon
  const getActionIcon = (action: string) => {
    switch(action) {
      case 'up':
        return <ArrowUpCircle size={16} className="text-green-500" />;
      case 'down':
        return <ArrowDownCircle size={16} className="text-red-500" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
    }
  };
  
  // Format the date properly
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString || 'N/A';
    }
  };
  
  return (
    <Card className="shadow-md">
      {showHeader && (
        <CardHeader className="border-b border-border relative overflow-hidden pb-2">
          <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-semibold">
                {symbol ? `${symbol} Analyst Ratings` : `${region} Analyst Ratings`}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Latest upgrades, downgrades and rating changes
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={handleRefreshData}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Refresh
            </Button>
          </div>
          
          <Tabs defaultValue="all" className="mt-2" onValueChange={(value) => setViewType(value as any)}>
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="all">All Changes</TabsTrigger>
              <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
              <TabsTrigger value="downgrades">Downgrades</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center p-8 text-muted-foreground">
            Failed to load analyst ratings data. Please try refreshing.
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No analyst ratings data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!symbol && <TableHead className="w-20">Symbol</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="h-10 text-xs">
                    {!symbol && (
                      <TableCell className="py-2 font-medium">
                        {item.symbol}
                      </TableCell>
                    )}
                    <TableCell className="py-2 whitespace-nowrap">
                      {formatDate(item.gradeDate)}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      {item.firm}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        {getActionIcon(item.action)}
                        <span className={cn(
                          "text-xs",
                          item.action === 'up' && "text-green-500",
                          item.action === 'down' && "text-red-500"
                        )}>
                          {ACTION_TYPES[item.action as keyof typeof ACTION_TYPES] || item.action}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {item.fromGrade || '-'}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={cn(
                        "text-xs font-normal",
                        item.action === 'up' && "bg-green-50 text-green-700 border-green-200",
                        item.action === 'down' && "bg-red-50 text-red-700 border-red-200",
                      )}>
                        {item.toGrade}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {data && data.length > filteredData.length && (
        <CardFooter className="border-t border-border p-2 flex justify-center">
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => window.location.href = `/stock/${symbol}?region=${region}&tab=analyst-ratings`}
          >
            View all {data.length} analyst ratings
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
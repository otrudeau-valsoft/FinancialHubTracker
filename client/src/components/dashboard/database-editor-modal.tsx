import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Database } from "lucide-react";

interface DatabaseRow {
  id: number;
  symbol: string;
  company: string;
  stock_type: string;
  rating: string;
  quantity: string;
  purchase_price: string;
  sector: string;
}

interface DatabaseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: any[];
  region: string;
}

const STOCK_TYPES = ['Comp', 'Cat', 'Cycl'];
const RATINGS = ['1', '2', '3', '4'];
const SECTORS = [
  'Technology',
  'Financial Services', 
  'Healthcare',
  'Consumer Defensive',
  'Consumer Cyclical',
  'Industrials',
  'Energy',
  'Utilities',
  'Materials',
  'Real Estate',
  'Communication Services',
  'Commodities'
];

export function DatabaseEditorModal({ isOpen, onClose, stocks, region }: DatabaseEditorModalProps) {
  const [databaseRows, setDatabaseRows] = useState<DatabaseRow[]>([]);
  const [changes, setChanges] = useState<Map<number, Partial<DatabaseRow>>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && stocks.length > 0) {
      // Convert incoming stocks to database format
      const dbRows: DatabaseRow[] = stocks.map(stock => ({
        id: stock.id,
        symbol: stock.symbol,
        company: stock.company,
        stock_type: stock.stockType,
        rating: stock.rating.toString(),
        quantity: stock.quantity.toString(),
        purchase_price: stock.purchasePrice.toString(),
        sector: stock.sector || ''
      }));
      setDatabaseRows(dbRows);
      setChanges(new Map());
    }
  }, [isOpen, stocks]);

  const updateCell = (id: number, field: keyof DatabaseRow, value: string) => {
    // Update the display data
    setDatabaseRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    
    // Track changes
    setChanges(prev => {
      const newChanges = new Map(prev);
      const rowChanges = newChanges.get(id) || {};
      rowChanges[field] = value;
      newChanges.set(id, rowChanges);
      return newChanges;
    });
  };

  const handleSave = async () => {
    if (changes.size === 0) {
      toast({
        title: "No Changes",
        description: "No changes detected to save.",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare only changed rows for update
      const updatesArray = Array.from(changes.entries()).map(([id, changes]) => ({
        id,
        ...changes
      }));

      console.log(`🔄 DATABASE SCRIPT: Updating ${updatesArray.length} rows in portfolio_${region}`);
      console.log('Changes:', updatesArray);

      await apiRequest({
        endpoint: `/api/portfolios/${region}/database-update`,
        method: 'POST',
        body: { updates: updatesArray }
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/portfolios', region, 'stocks'] });
      
      toast({
        title: "Database Updated",
        description: `Successfully updated ${updatesArray.length} rows in portfolio_${region}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Database update failed:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            <DialogTitle className="text-white text-xl">
              Database Editor: portfolio_{region}
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="text-sm text-slate-400 mb-4">
          Edit cells directly. Changes are tracked and only modified rows will be updated.
          {changes.size > 0 && (
            <span className="text-orange-400 ml-2">
              {changes.size} row(s) modified
            </span>
          )}
        </div>

        <div className="overflow-auto flex-1 border border-slate-700 rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 sticky top-0">
              <tr>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">symbol</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">company</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">stock_type</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">rating</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">sector</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">quantity</th>
                <th className="text-left p-2 text-slate-300 border-b border-slate-700">purchase_price</th>
              </tr>
            </thead>
            <tbody>
              {databaseRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-1">
                    <Input
                      value={row.symbol}
                      onChange={(e) => updateCell(row.id, 'symbol', e.target.value)}
                      className="bg-transparent border-0 text-white text-sm p-1 h-auto font-mono"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      value={row.company}
                      onChange={(e) => updateCell(row.id, 'company', e.target.value)}
                      className="bg-transparent border-0 text-white text-sm p-1 h-auto"
                    />
                  </td>
                  <td className="p-1">
                    <Select 
                      value={row.stock_type} 
                      onValueChange={(value) => updateCell(row.id, 'stock_type', value)}
                    >
                      <SelectTrigger className="bg-transparent border-0 text-white text-sm p-1 h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {STOCK_TYPES.map(type => (
                          <SelectItem key={type} value={type} className="text-white">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <Select 
                      value={row.rating} 
                      onValueChange={(value) => updateCell(row.id, 'rating', value)}
                    >
                      <SelectTrigger className="bg-transparent border-0 text-white text-sm p-1 h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {RATINGS.map(rating => (
                          <SelectItem key={rating} value={rating} className="text-white">
                            {rating}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <Select 
                      value={row.sector} 
                      onValueChange={(value) => updateCell(row.id, 'sector', value)}
                    >
                      <SelectTrigger className="bg-transparent border-0 text-white text-sm p-1 h-auto">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {SECTORS.map(sector => (
                          <SelectItem key={sector} value={sector} className="text-white">
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <Input
                      value={row.quantity}
                      onChange={(e) => updateCell(row.id, 'quantity', e.target.value)}
                      className="bg-transparent border-0 text-white text-sm p-1 h-auto font-mono text-right"
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      value={row.purchase_price}
                      onChange={(e) => updateCell(row.id, 'purchase_price', e.target.value)}
                      className="bg-transparent border-0 text-white text-sm p-1 h-auto font-mono text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {databaseRows.length} rows • {changes.size} modified
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || changes.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Executing...' : `Execute Update (${changes.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
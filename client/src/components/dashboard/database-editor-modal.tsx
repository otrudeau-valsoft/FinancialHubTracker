import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Database, Plus, Trash2, Minus, Edit } from "lucide-react";

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

type RebalancerMode = 'portfolio' | 'position';

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
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [nextNewId, setNextNewId] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<RebalancerMode>('portfolio');
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
      setDeletedRows(new Set());
      setNextNewId(-1);
    }
  }, [isOpen, stocks]);

  const addNewRow = () => {
    const newRow: DatabaseRow = {
      id: nextNewId,
      symbol: '',
      company: '',
      stock_type: 'Comp',
      rating: '1',
      quantity: '0',
      purchase_price: '0.00',
      sector: 'Technology'
    };
    setDatabaseRows(prev => [...prev, newRow]);
    setNextNewId(prev => prev - 1);
  };

  const deleteRow = (id: number) => {
    if (id > 0) {
      // Existing row - mark for deletion
      setDeletedRows(prev => new Set([...prev, id]));
    }
    // Remove from display (both new and existing rows)
    setDatabaseRows(prev => prev.filter(row => row.id !== id));
    // Remove from changes if it exists
    setChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.delete(id);
      return newChanges;
    });
  };

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
    const hasChanges = changes.size > 0;
    const hasNewRows = databaseRows.some(row => row.id < 0);
    const hasDeletedRows = deletedRows.size > 0;
    
    if (!hasChanges && !hasNewRows && !hasDeletedRows) {
      toast({
        title: "No Changes",
        description: "No changes detected to save.",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Prepare updates for existing rows
      const updatesArray = Array.from(changes.entries()).map(([id, changes]) => ({
        id,
        ...changes
      }));

      // Prepare new rows for creation
      const newRowsArray = databaseRows.filter(row => row.id < 0).map(row => ({
        symbol: row.symbol,
        company: row.company,
        stock_type: row.stock_type,
        rating: row.rating,
        quantity: row.quantity,
        purchase_price: row.purchase_price,
        sector: row.sector
      }));

      // Prepare deletions
      const deletionsArray = [...deletedRows];

      console.log(`🔄 DATABASE SCRIPT: Processing ${updatesArray.length} updates, ${newRowsArray.length} new rows, ${deletionsArray.length} deletions for portfolio_${region}`);
      console.log('Updates:', updatesArray);
      console.log('New rows:', newRowsArray);
      console.log('Deletions:', deletionsArray);

      // Get current cash balance for impact calculation
      let currentCash = 0;
      let totalCashImpact = 0;
      
      try {
        const cashResponse = await apiRequest('GET', `/api/cash/${region}`) as any;
        currentCash = parseFloat(cashResponse.amount || '0');
      } catch (error) {
        console.log('Could not fetch current cash balance');
      }

      // Process deletions (selling stocks - adds cash)
      for (const stockId of deletionsArray) {
        // Find the original stock data
        const originalStock = stocks.find(s => s.id === stockId);
        if (originalStock) {
          const saleValue = originalStock.quantity * originalStock.price;
          totalCashImpact += saleValue;
          console.log(`💰 Selling ${originalStock.symbol}: ${originalStock.quantity} shares × $${originalStock.price} = +$${saleValue.toFixed(2)}`);
        }
        await apiRequest('DELETE', `/api/portfolios/${region}/stocks/${stockId}`);
      }
      
      // Process new stocks (buying stocks - subtracts cash)
      for (const newStock of newRowsArray) {
        const purchaseCost = parseFloat(newStock.quantity) * parseFloat(newStock.purchase_price);
        totalCashImpact -= purchaseCost;
        console.log(`💸 Buying ${newStock.symbol}: ${newStock.quantity} shares × $${newStock.purchase_price} = -$${purchaseCost.toFixed(2)}`);
        
        await apiRequest('POST', `/api/portfolios/${region}/stocks`, {
          symbol: newStock.symbol,
          company: newStock.company,
          stockType: newStock.stock_type,
          rating: newStock.rating,
          quantity: newStock.quantity,
          purchasePrice: newStock.purchase_price,
          sector: newStock.sector
        });
      }
      
      // Process updates with intelligent transaction detection
      for (const update of updatesArray) {
        if (update.id > 0) {
          const updateData: any = {};
          const originalStock = stocks.find(s => s.id === update.id);
          
          // Detect transaction type based on what changed
          if (update.quantity !== undefined && originalStock) {
            const oldQuantity = originalStock.quantity;
            const newQuantity = parseFloat(update.quantity);
            const quantityDiff = newQuantity - oldQuantity;
            
            if (quantityDiff !== 0) {
              if (quantityDiff > 0) {
                // BUY: Adding shares - calculate weighted average cost
                const currentAvgCost = originalStock.purchasePrice;
                const newSharePrice = originalStock.price;
                const newAvgCost = (oldQuantity * currentAvgCost + quantityDiff * newSharePrice) / newQuantity;
                
                updateData.purchasePrice = newAvgCost.toFixed(2);
                
                const addCost = quantityDiff * newSharePrice;
                totalCashImpact -= addCost;
                console.log(`🟢 BUY: +${quantityDiff} ${originalStock.symbol} @ $${newSharePrice} = -$${addCost.toFixed(2)}`);
                console.log(`💰 New avg cost: $${currentAvgCost.toFixed(2)} → $${newAvgCost.toFixed(2)}`);
              } else {
                // SELL: Trimming shares - sell at market price
                const sellValue = Math.abs(quantityDiff) * originalStock.price;
                totalCashImpact += sellValue;
                console.log(`🔴 SELL: ${Math.abs(quantityDiff)} ${originalStock.symbol} @ $${originalStock.price} = +$${sellValue.toFixed(2)}`);
                console.log(`💰 Avg cost unchanged: $${originalStock.purchasePrice}`);
              }
            }
          }
          
          // ADJUST: Direct field updates (no cash impact)
          if (update.purchase_price !== undefined && !update.quantity) {
            console.log(`🔵 ADJUST: ${originalStock?.symbol} avg cost → $${update.purchase_price}`);
          }
          
          // Apply all updates
          if (update.purchase_price !== undefined) updateData.purchasePrice = update.purchase_price;
          if (update.stock_type !== undefined) updateData.stockType = update.stock_type;
          if (update.symbol !== undefined) updateData.symbol = update.symbol;
          if (update.company !== undefined) updateData.company = update.company;
          if (update.rating !== undefined) updateData.rating = update.rating;
          if (update.quantity !== undefined) updateData.quantity = update.quantity;
          if (update.sector !== undefined) updateData.sector = update.sector;
          
          await apiRequest('PATCH', `/api/portfolios/${region}/stocks/${update.id}`, updateData);
        }
      }

      // Update cash balance if there's any impact
      if (Math.abs(totalCashImpact) > 0.01) {
        try {
          const newCashBalance = currentCash + totalCashImpact;
          await apiRequest('POST', `/api/cash/${region}`, { amount: newCashBalance.toString() });
          console.log(`💰 Cash balance updated: $${currentCash.toFixed(2)} → $${newCashBalance.toFixed(2)} (${totalCashImpact > 0 ? '+' : ''}$${totalCashImpact.toFixed(2)})`);
        } catch (error) {
          console.log('Could not update cash balance');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/portfolios', region, 'stocks'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/cash'] });
      
      // Create success message with transaction summary
      const totalOperations = updatesArray.length + newRowsArray.length + deletionsArray.length;
      let message = `${totalOperations} transactions executed in ${region} portfolio.`;
      
      if (Math.abs(totalCashImpact) > 0.01) {
        const cashChange = totalCashImpact > 0 ? '+' : '';
        message += ` Cash impact: ${cashChange}$${totalCashImpact.toFixed(2)}`;
      }
      
      toast({
        title: "Transactions Complete",
        description: message,
      });
      
      onClose();
      
      // Auto-refresh the page after a brief delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col bg-slate-900 border-slate-700 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-400" />
            <DialogTitle className="text-white text-xl">
              Transaction Panel - {region} Portfolio
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="bg-slate-800 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Buy Transaction */}
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
              <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                BUY
              </h3>
              <div className="space-y-2 text-xs">
                <div>• Enter symbol + quantity + price</div>
                <div>• Creates new position or adds to existing</div>
                <div>• Auto-calculates weighted average cost</div>
                <div className="text-green-400">• Reduces cash balance</div>
              </div>
            </div>
            
            {/* Sell Transaction */}
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <Minus className="h-4 w-4" />
                SELL
              </h3>
              <div className="space-y-2 text-xs">
                <div>• Reduce quantity or delete row entirely</div>
                <div>• Sells at current market price</div>
                <div>• Keeps same average cost for remaining shares</div>
                <div className="text-red-400">• Increases cash balance</div>
              </div>
            </div>
            
            {/* Adjust Transaction */}
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                ADJUST
              </h3>
              <div className="space-y-2 text-xs">
                <div>• Edit any field directly</div>
                <div>• Update ratings, sectors, etc.</div>
                <div>• Direct average cost edits (no cash impact)</div>
                <div className="text-blue-400">• Portfolio maintenance</div>
              </div>
            </div>
            
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">
              Make transactions below. Changes are automatically detected and processed intelligently.
              {changes.size > 0 && (
                <span className="text-orange-400 ml-2">
                  {changes.size} pending transaction(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addNewRow}
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs bg-green-600 border-green-500 text-white hover:bg-green-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Position
              </Button>
              <Button
                onClick={handleSave}
                disabled={changes.size === 0 || isLoading}
                size="sm"
                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Execute Transactions"}
              </Button>
            </div>
          </div>
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
                <th className="text-center p-2 text-slate-300 border-b border-slate-700 w-12">Delete</th>
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
                  <td className="p-1 text-center">
                    <Button
                      onClick={() => deleteRow(row.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {databaseRows.length} rows • {changes.size} modified • {deletedRows.size} deleted
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
              disabled={isLoading || (changes.size === 0 && deletedRows.size === 0 && databaseRows.filter(row => row.id < 0).length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Executing...' : `Execute Update (${changes.size + deletedRows.size + databaseRows.filter(row => row.id < 0).length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
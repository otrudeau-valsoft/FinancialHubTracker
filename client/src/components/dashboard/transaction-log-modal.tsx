import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Database, Plus, Trash2, DollarSign, AlertCircle } from "lucide-react";

interface Transaction {
  id: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  notes?: string;
}

interface Stock {
  id: number;
  symbol: string;
  quantity: number;
  currentPrice?: number;
}

interface TransactionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  region: string;
}

export function TransactionLogModal({ isOpen, onClose, stocks, region }: TransactionLogModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextId, setNextId] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTransactions([]);
      setNextId(-1);
      
      // Fetch current cash balance
      const fetchCashBalance = async () => {
        try {
          const response = await apiRequest('GET', `/api/cash/${region}`) as any;
          setCashBalance(parseFloat(response.amount || '0'));
        } catch (error) {
          setCashBalance(0);
        }
      };
      
      fetchCashBalance();
    }
  }, [isOpen, region]);

  const addTransaction = () => {
    const newTransaction: Transaction = {
      id: nextId,
      symbol: '',
      action: 'BUY',
      quantity: '',
      price: '',
      notes: ''
    };
    setTransactions(prev => [...prev, newTransaction]);
    setNextId(prev => prev - 1);
  };

  const removeTransaction = (id: number) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: number, field: keyof Transaction, value: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const getValidationErrors = (transaction: Transaction) => {
    const errors: string[] = [];
    const stock = stocks.find(s => s.symbol === transaction.symbol);
    const quantity = parseInt(transaction.quantity) || 0;
    const price = parseFloat(transaction.price) || 0;
    
    if (!transaction.symbol) {
      errors.push("Symbol required");
    }
    
    if (quantity <= 0) {
      errors.push("Quantity must be > 0");
    }
    
    if (price <= 0) {
      errors.push("Price must be > 0");
    }
    
    if (transaction.action === 'SELL') {
      if (!stock) {
        errors.push("Cannot sell - stock not in portfolio");
      } else if (quantity > stock.quantity) {
        errors.push(`Only ${stock.quantity} shares available`);
      }
    }
    
    if (transaction.action === 'BUY') {
      const totalCost = quantity * price;
      if (totalCost > cashBalance) {
        errors.push(`Insufficient cash (need $${totalCost.toLocaleString()}, have $${cashBalance.toLocaleString()})`);
      }
    }
    
    return errors;
  };

  const getTotalCashImpact = () => {
    return transactions.reduce((total, transaction) => {
      const quantity = parseInt(transaction.quantity) || 0;
      const price = parseFloat(transaction.price) || 0;
      const amount = quantity * price;
      
      if (transaction.action === 'BUY') {
        return total - amount; // Buying reduces cash
      } else if (transaction.action === 'SELL') {
        return total + amount; // Selling increases cash
      }
      return total;
    }, 0);
  };

  const executeTransactions = async () => {
    if (transactions.length === 0) return;
    
    // Validate all transactions
    const hasErrors = transactions.some(t => getValidationErrors(t).length > 0);
    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before executing transactions",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Process each transaction
      for (const transaction of transactions) {
        const stock = stocks.find(s => s.symbol === transaction.symbol);
        const quantity = parseInt(transaction.quantity);
        const price = parseFloat(transaction.price);
        
        if (transaction.action === 'BUY') {
          if (stock) {
            // Add to existing position
            await apiRequest('PATCH', `/api/portfolios/${region}/stocks/${stock.id}`, {
              quantity: stock.quantity + quantity,
              purchasePrice: price // Will be weighted averaged on backend
            });
          } else {
            // Create new position
            await apiRequest('POST', `/api/portfolios/${region}/stocks`, {
              symbol: transaction.symbol,
              quantity: quantity,
              purchasePrice: price,
              stockType: 'Stock', // Default
              rating: 'Hold', // Default
              sector: 'Unknown' // Default
            });
          }
          
          // Update cash balance
          await apiRequest('PATCH', `/api/cash/${region}`, {
            amount: cashBalance + getTotalCashImpact()
          });
          
        } else if (transaction.action === 'SELL' && stock) {
          if (quantity >= stock.quantity) {
            // Sell entire position
            await apiRequest('DELETE', `/api/portfolios/${region}/stocks/${stock.id}`);
          } else {
            // Partial sell
            await apiRequest('PATCH', `/api/portfolios/${region}/stocks/${stock.id}`, {
              quantity: stock.quantity - quantity
              // Keep same purchase price for remaining shares
            });
          }
          
          // Update cash balance
          await apiRequest('PATCH', `/api/cash/${region}`, {
            amount: cashBalance + getTotalCashImpact()
          });
        }
      }
      
      // Refresh portfolio data
      queryClient.invalidateQueries({ queryKey: [`/api/portfolios/${region}/stocks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cash/${region}`] });
      
      toast({
        title: "Transactions Executed",
        description: `Successfully processed ${transactions.length} transaction(s). Cash impact: ${getTotalCashImpact() > 0 ? '+' : ''}$${getTotalCashImpact().toLocaleString()}`,
        variant: "default"
      });
      
      setTransactions([]);
      onClose();
      
    } catch (error) {
      toast({
        title: "Transaction Error",
        description: "Failed to execute transactions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cashImpact = getTotalCashImpact();
  const newCashBalance = cashBalance + cashImpact;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col bg-slate-900 border-slate-700 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-400" />
            <DialogTitle className="text-white text-xl">
              Transaction Log - {region} Portfolio
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Cash Balance Display */}
        <div className="bg-slate-800 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 font-semibold">Current Cash</span>
              </div>
              <div className="text-xl text-white font-mono">
                ${cashBalance.toLocaleString()}
              </div>
            </div>
            
            <div className={`border rounded-lg p-3 ${
              cashImpact === 0 ? 'bg-slate-700/20 border-slate-600/30' :
              cashImpact > 0 ? 'bg-green-900/20 border-green-600/30' :
              'bg-red-900/20 border-red-600/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-semibold ${
                  cashImpact === 0 ? 'text-slate-400' :
                  cashImpact > 0 ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  Cash Impact
                </span>
              </div>
              <div className={`text-xl font-mono ${
                cashImpact === 0 ? 'text-slate-400' :
                cashImpact > 0 ? 'text-green-400' :
                'text-red-400'
              }`}>
                {cashImpact > 0 ? '+' : ''}${cashImpact.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-400 font-semibold">New Balance</span>
              </div>
              <div className={`text-xl font-mono ${
                newCashBalance < 0 ? 'text-red-400' : 'text-white'
              }`}>
                ${newCashBalance.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">
              BUY: Reduces cash, adds to positions with weighted avg cost<br/>
              SELL: Increases cash, reduces positions (validates available shares)
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addTransaction}
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs bg-green-600 border-green-500 text-white hover:bg-green-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Transaction
              </Button>
              <Button
                onClick={executeTransactions}
                disabled={transactions.length === 0 || isLoading}
                size="sm"
                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Execute All"}
              </Button>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="overflow-auto flex-1 border border-slate-700 rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 sticky top-0">
              <tr className="border-b border-slate-600">
                <th className="text-left p-3 text-slate-300 font-medium">Symbol</th>
                <th className="text-left p-3 text-slate-300 font-medium">Action</th>
                <th className="text-left p-3 text-slate-300 font-medium">Quantity</th>
                <th className="text-left p-3 text-slate-300 font-medium">Price</th>
                <th className="text-left p-3 text-slate-300 font-medium">Total</th>
                <th className="text-left p-3 text-slate-300 font-medium">Validation</th>
                <th className="text-left p-3 text-slate-300 font-medium">Notes</th>
                <th className="text-center p-3 text-slate-300 font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const errors = getValidationErrors(transaction);
                const quantity = parseInt(transaction.quantity) || 0;
                const price = parseFloat(transaction.price) || 0;
                const total = quantity * price;
                
                return (
                  <tr key={transaction.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                    <td className="p-3">
                      <Input
                        value={transaction.symbol}
                        onChange={(e) => updateTransaction(transaction.id, 'symbol', e.target.value.toUpperCase())}
                        placeholder="AAPL"
                        className="w-24 h-8 text-xs bg-slate-800 border-slate-600 text-white"
                      />
                    </td>
                    <td className="p-3">
                      <Select 
                        value={transaction.action} 
                        onValueChange={(value: 'BUY' | 'SELL') => updateTransaction(transaction.id, 'action', value)}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="BUY" className="text-green-400">BUY</SelectItem>
                          <SelectItem value="SELL" className="text-red-400">SELL</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        value={transaction.quantity}
                        onChange={(e) => updateTransaction(transaction.id, 'quantity', e.target.value)}
                        placeholder="100"
                        className="w-20 h-8 text-xs bg-slate-800 border-slate-600 text-white"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="0.01"
                        value={transaction.price}
                        onChange={(e) => updateTransaction(transaction.id, 'price', e.target.value)}
                        placeholder="150.00"
                        className="w-24 h-8 text-xs bg-slate-800 border-slate-600 text-white"
                      />
                    </td>
                    <td className="p-3">
                      <span className={`font-mono ${
                        transaction.action === 'BUY' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {transaction.action === 'BUY' ? '-' : '+'}${total.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3">
                      {errors.length > 0 ? (
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">{errors[0]}</span>
                        </div>
                      ) : (
                        <span className="text-green-400 text-xs">✓ Valid</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Input
                        value={transaction.notes || ''}
                        onChange={(e) => updateTransaction(transaction.id, 'notes', e.target.value)}
                        placeholder="Optional notes"
                        className="w-32 h-8 text-xs bg-slate-800 border-slate-600 text-white"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        onClick={() => removeTransaction(transaction.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No transactions added yet. Click "Add Transaction" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
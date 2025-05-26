import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Stock {
  id?: number;
  symbol: string;
  company: string;
  stockType: string;
  rating: string;
  sector?: string;
  quantity: number;
  price?: number;
  purchasePrice?: number; // Purchase Price
}

interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: 'USD' | 'CAD' | 'INTL';
  existingStocks?: Stock[];
}

// Stock Type Options
const stockTypeOptions = ['Compounder', 'Catalyst', 'Cyclical', 'Cash', 'ETF'];

// Rating Options
const ratingOptions = ['1', '2', '3', '4', 'Cash', 'ETF'];

// Sector Options 
const sectorOptions = [
  'Technology',
  'Consumer Discretionary',
  'Healthcare',
  'Financials',
  'Communications',
  'Industrials',
  'Energy',
  'Utilities',
  'Consumer Staples',
  'Materials',
  'Real Estate',
  'Cash',
  'ETF',
  'Other'
];

export function RebalanceModal({ isOpen, onClose, region, existingStocks = [] }: RebalanceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newType, setNewType] = useState(stockTypeOptions[0]);
  const [newRating, setNewRating] = useState(ratingOptions[0]);
  const [newSector, setNewSector] = useState(sectorOptions[0]);
  const [newQuantity, setNewQuantity] = useState(0);
  const [newPurchasePrice, setNewPurchasePrice] = useState<number | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);

  // Initialize stocks from existing stocks when the modal opens
  useEffect(() => {
    if (isOpen && existingStocks) {
      console.log('Initializing rebalance modal with stocks:', existingStocks);
      setStocks(existingStocks.map(stock => ({ 
        ...stock,
        // Ensure purchase price is properly preserved
        purchasePrice: stock.purchasePrice !== undefined ? Number(stock.purchasePrice) : undefined
      })));
    }
  }, [isOpen, existingStocks]);

  // Handle adding a new stock
  const handleAddStock = () => {
    if (!newSymbol || !newCompany || !newType || !newRating) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }
    
    // Special validation for quantity
    if (newQuantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be greater than 0.',
        variant: 'destructive'
      });
      return;
    }

    const newStock: Stock = {
      symbol: newSymbol.toUpperCase(),
      company: newCompany,
      stockType: newType,
      rating: newRating,
      sector: newSector,
      quantity: newQuantity,
      purchasePrice: newPurchasePrice
    };

    setStocks([...stocks, newStock]);
    
    // Reset form
    setNewSymbol('');
    setNewCompany('');
    setNewType(stockTypeOptions[0]);
    setNewRating(ratingOptions[0]);
    setNewSector(sectorOptions[0]);
    setNewQuantity(0);
    setNewPurchasePrice(undefined);
    setIsAdding(false);
  };

  // Handle removing a stock
  const handleRemoveStock = (index: number) => {
    const updatedStocks = [...stocks];
    updatedStocks.splice(index, 1);
    setStocks(updatedStocks);
  };

  // Handle updating a stock in the list
  const handleUpdateStock = (index: number, field: keyof Stock, value: any) => {
    const updatedStocks = [...stocks];
    
    // Properly handle numeric fields
    if (field === 'quantity' || field === 'purchasePrice') {
      updatedStocks[index] = {
        ...updatedStocks[index],
        [field]: value === '' ? undefined : Number(value)
      };
    } else {
      updatedStocks[index] = {
        ...updatedStocks[index],
        [field]: value
      };
    }
    
    setStocks(updatedStocks);
  };

  // Save the rebalanced portfolio
  const savePortfolioMutation = useMutation({
    mutationFn: async () => {
      console.log('=== REBALANCE SAVE DEBUG ===');
      console.log('Current stocks in modal:', stocks);
      console.log('Original existingStocks:', existingStocks);
      
      // Process stocks - only preserve prices if they're truly missing, not if user made changes
      const processedStocks = stocks.map((stock, index) => {
        const processed = { ...stock };
        
        // Only preserve existing purchase price if it's completely undefined AND there was an original value
        // This prevents overriding user changes while still preserving data for stocks without price changes
        if (processed.purchasePrice === undefined && 
            existingStocks && existingStocks[index] && 
            existingStocks[index].purchasePrice !== undefined) {
          console.log(`Preserving original purchase price for ${stock.symbol}: ${existingStocks[index].purchasePrice}`);
          processed.purchasePrice = existingStocks[index].purchasePrice;
        } else if (processed.purchasePrice !== undefined) {
          console.log(`Using updated purchase price for ${stock.symbol}: ${processed.purchasePrice}`);
        }
        
        console.log(`Final processed stock ${stock.symbol}:`, processed);
        return processed;
      });
      
      console.log('Final processedStocks being sent:', processedStocks);
      
      // Delete all existing stocks and add new ones
      return await apiRequest(
        'POST',
        `/api/portfolios/${region}/rebalance`,
        { stocks: processedStocks }
      );
    },
    onSuccess: () => {
      toast({
        title: 'Portfolio Rebalanced',
        description: 'The portfolio has been successfully updated.'
      });
      queryClient.invalidateQueries({ queryKey: [`/api/portfolios/${region}/stocks`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to rebalance portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    if (stocks.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Portfolio must have at least one stock.',
        variant: 'destructive'
      });
      return;
    }

    savePortfolioMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#0A1929] border-[#1A304A] text-[#E2E8F0]">
        <DialogHeader>
          <DialogTitle className="font-mono text-[#E2E8F0]">REBALANCE {region} PORTFOLIO</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh]">
          <Table className="border-collapse">
            <TableHeader className="bg-[#0D1F32]">
              <TableRow>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">SYMBOL</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">COMPANY</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">TYPE</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">RATING</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">SECTOR</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">QUANTITY</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">PURCHASE PRICE</TableHead>
                <TableHead className="font-mono text-[#7A8999] font-medium whitespace-nowrap">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock, index) => (
                <TableRow key={index} className="border-b border-[#1A304A]">
                  <TableCell className="p-2 text-[#E2E8F0] font-mono">
                    <Input 
                      value={stock.symbol}
                      onChange={(e) => handleUpdateStock(index, 'symbol', e.target.value.toUpperCase())}
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      value={stock.company}
                      onChange={(e) => handleUpdateStock(index, 'company', e.target.value)}
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Select 
                      value={stock.stockType} 
                      onValueChange={(value) => handleUpdateStock(index, 'stockType', value)}
                    >
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {stockTypeOptions.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Select 
                      value={stock.rating} 
                      onValueChange={(value) => handleUpdateStock(index, 'rating', value)}
                    >
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {ratingOptions.map(rating => (
                          <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Select 
                      value={stock.sector || sectorOptions[0]} 
                      onValueChange={(value) => handleUpdateStock(index, 'sector', value)}
                    >
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {sectorOptions.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      type="number"
                      value={stock.quantity}
                      onChange={(e) => handleUpdateStock(index, 'quantity', parseFloat(e.target.value))}
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      type="number"
                      step="0.01"
                      value={stock.purchasePrice !== undefined ? stock.purchasePrice.toString() : ''}
                      onChange={(e) => handleUpdateStock(index, 'purchasePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder={stock.purchasePrice !== undefined ? stock.purchasePrice.toString() : "0.00"}
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleRemoveStock(index)}
                      className="h-8 px-2"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {isAdding && (
                <TableRow className="border-b border-[#1A304A] bg-[#0A1524]/50">
                  <TableCell className="p-2">
                    <Input 
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="Apple Inc."
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {stockTypeOptions.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Select value={newRating} onValueChange={setNewRating}>
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {ratingOptions.map(rating => (
                          <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Select value={newSector} onValueChange={setNewSector}>
                      <SelectTrigger className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono">
                        {sectorOptions.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      type="number"
                      value={newQuantity === 0 ? '' : newQuantity}
                      onChange={(e) => setNewQuantity(parseFloat(e.target.value || '0'))}
                      placeholder="100"
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input 
                      type="text"
                      value={newPurchasePrice !== undefined ? newPurchasePrice : ''}
                      onChange={(e) => setNewPurchasePrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="150.00"
                      className="h-8 bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
                    />
                  </TableCell>
                  <TableCell className="p-2 space-x-1">
                    <Button 
                      size="sm" 
                      onClick={handleAddStock}
                      className="h-8 px-2 bg-green-600 hover:bg-green-700"
                    >
                      <Save size={16} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => setIsAdding(false)}
                      className="h-8 px-2"
                    >
                      <X size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {!isAdding && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAdding(true)}
                className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] hover:bg-[#162638]"
              >
                <Plus size={16} className="mr-2" /> Add Stock
              </Button>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={savePortfolioMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savePortfolioMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
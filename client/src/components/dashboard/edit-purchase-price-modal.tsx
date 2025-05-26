import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EditPurchasePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    id: number;
    symbol: string;
    company: string;
    purchasePrice?: number;
  } | null;
  region: string;
}

export function EditPurchasePriceModal({ isOpen, onClose, stock, region }: EditPurchasePriceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [purchasePrice, setPurchasePrice] = useState<string>('');

  // Initialize purchase price when modal opens
  useState(() => {
    if (isOpen && stock) {
      setPurchasePrice(stock.purchasePrice ? stock.purchasePrice.toString() : '');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!stock) throw new Error('No stock selected');
      
      const priceValue = purchasePrice ? parseFloat(purchasePrice) : undefined;
      
      return await apiRequest(
        'PATCH',
        `/api/portfolios/${region}/stocks/${stock.id}`,
        { purchasePrice: priceValue }
      );
    },
    onSuccess: () => {
      toast({
        title: 'Purchase Price Updated',
        description: `Updated purchase price for ${stock?.symbol}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/portfolios/${region}/stocks`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update purchase price',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  if (!stock) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0A1929] border-[#1A304A] text-[#E2E8F0]">
        <DialogHeader>
          <DialogTitle className="font-mono text-[#E2E8F0]">
            EDIT PURCHASE PRICE
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-[#7A8999] font-mono text-sm">SYMBOL</Label>
            <div className="font-mono text-[#E2E8F0] font-bold">{stock.symbol}</div>
          </div>
          
          <div>
            <Label className="text-[#7A8999] font-mono text-sm">COMPANY</Label>
            <div className="font-mono text-[#E2E8F0] text-sm">{stock.company}</div>
          </div>
          
          <div>
            <Label htmlFor="purchase-price" className="text-[#7A8999] font-mono text-sm">
              PURCHASE PRICE
            </Label>
            <Input
              id="purchase-price"
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0.00"
              className="bg-[#0F1A2A] border-[#1A304A] text-[#E2E8F0] font-mono"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#1A304A] text-[#7A8999] hover:bg-[#0F1A2A]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-[#0A7AFF] hover:bg-[#0A7AFF]/80 text-white"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
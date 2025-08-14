import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CancelOrderButtonProps {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  canCancel: boolean;
  onCancelClick: () => void;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showConfirmDialog?: boolean;
}

const CancelOrderButton: React.FC<CancelOrderButtonProps> = ({
  orderId,
  orderNumber,
  orderStatus,
  canCancel,
  onCancelClick,
  isLoading = false,
  className,
  variant = 'destructive',
  size = 'sm',
  showConfirmDialog = true
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Don't render if order cannot be cancelled
  if (!canCancel) {
    return null;
  }

  // Don't show for orders that are not in valid cancellation states
  const validCancellationStates = ['out_for_delivery', 'picked_up'];
  if (!validCancellationStates.includes(orderStatus)) {
    return null;
  }

  const handleCancelClick = () => {
    if (showConfirmDialog) {
      setIsConfirmOpen(true);
    } else {
      onCancelClick();
    }
  };

  const handleConfirmCancel = () => {
    setIsConfirmOpen(false);
    onCancelClick();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'picked_up':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'picked_up':
        return 'Picked Up';
      default:
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (showConfirmDialog) {
    return (
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCancelClick}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2',
              isLoading && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Cancel Order
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancel Order Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                Are you sure you want to cancel this order? This action cannot be undone.
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Order Number:</span>
                  <span className="text-sm font-mono">{orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Current Status:</span>
                  <Badge className={getStatusBadgeColor(orderStatus)}>
                    {getStatusLabel(orderStatus)}
                  </Badge>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>What happens when you cancel:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>The order will be marked as cancelled</li>
                  <li>Customer and vendor will be notified</li>
                  <li>Items will be returned to vendor inventory</li>
                  <li>You'll need to provide a cancellation reason</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Simple button without confirmation dialog
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onCancelClick}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <X className="h-4 w-4" />
      )}
      Cancel Order
    </Button>
  );
};

export default CancelOrderButton;
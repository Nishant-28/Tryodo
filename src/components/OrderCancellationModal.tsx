import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CancellationReason, CancellationResponse } from '@/types/orderCancellation';

interface OrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  orderStatus: string;
  onCancel: (reason: CancellationReason, additionalDetails?: string) => Promise<CancellationResponse>;
}

const OrderCancellationModal: React.FC<OrderCancellationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  customerName,
  totalAmount,
  orderStatus,
  onCancel
}) => {
  const [selectedReason, setSelectedReason] = useState<CancellationReason | ''>('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CancellationResponse | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setAdditionalDetails('');
      setSubmitResult(null);
      setShowResult(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const cancellationReasons = [
    {
      value: CancellationReason.CUSTOMER_UNAVAILABLE,
      label: 'Customer Unavailable',
      description: 'Customer not available at delivery address'
    },
    {
      value: CancellationReason.INCORRECT_ADDRESS,
      label: 'Incorrect Address',
      description: 'Delivery address is incorrect or incomplete'
    },
    {
      value: CancellationReason.DAMAGED_PRODUCT,
      label: 'Damaged Product',
      description: 'Product was damaged during transit'
    },
    {
      value: CancellationReason.CUSTOMER_REFUSED,
      label: 'Customer Refused Delivery',
      description: 'Customer refused to accept the delivery'
    },
    {
      value: CancellationReason.PAYMENT_ISSUES,
      label: 'Payment Issues',
      description: 'Issues with payment collection (COD)'
    },
    {
      value: CancellationReason.DELIVERY_ISSUES,
      label: 'Delivery Issues',
      description: 'Unable to complete delivery due to other issues'
    },
    {
      value: CancellationReason.WEATHER_CONDITIONS,
      label: 'Weather Conditions',
      description: 'Severe weather preventing safe delivery'
    },
    {
      value: CancellationReason.VEHICLE_BREAKDOWN,
      label: 'Vehicle Breakdown',
      description: 'Vehicle breakdown preventing delivery completion'
    },
    {
      value: CancellationReason.OTHER,
      label: 'Other',
      description: 'Other reason (please specify in details)'
    }
  ];

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

  const handleSubmit = async () => {
    if (!selectedReason) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await onCancel(selectedReason, additionalDetails || undefined);
      setSubmitResult(result);
      setShowResult(true);
      
      if (result.success) {
        // Auto-close after 2 seconds on success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const isFormValid = selectedReason !== '';
  const requiresDetails = selectedReason === CancellationReason.OTHER;

  if (showResult && submitResult) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {submitResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {submitResult.success ? 'Order Cancelled' : 'Cancellation Failed'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className={submitResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                {submitResult.success 
                  ? submitResult.message || 'Order has been successfully cancelled. Customer and vendor have been notified.'
                  : submitResult.error || 'Failed to cancel order. Please try again.'
                }
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button onClick={handleClose} variant={submitResult.success ? 'default' : 'outline'}>
              {submitResult.success ? 'Close' : 'Try Again'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            Please select a reason for cancelling this order. This information will be shared with the customer and vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">Order Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Order Number:</span>
                <div className="font-mono font-medium">{orderNumber}</div>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <div className="font-medium">{customerName}</div>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <div className="font-medium">₹{totalAmount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <Badge className={getStatusBadgeColor(orderStatus)}>
                  {getStatusLabel(orderStatus)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="cancellation-reason" className="text-base font-medium">
              Cancellation Reason *
            </Label>
            <Select value={selectedReason} onValueChange={(value) => setSelectedReason(value as CancellationReason)}>
              <SelectTrigger id="cancellation-reason">
                <SelectValue placeholder="Select a reason for cancellation" />
              </SelectTrigger>
              <SelectContent>
                {cancellationReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{reason.label}</span>
                      <span className="text-xs text-gray-500">{reason.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-3">
            <Label htmlFor="additional-details" className="text-base font-medium">
              Additional Details {requiresDetails && '*'}
            </Label>
            <Textarea
              id="additional-details"
              placeholder={
                requiresDetails 
                  ? "Please provide specific details about the cancellation reason..."
                  : "Optional: Provide any additional context or details..."
              }
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {requiresDetails && !additionalDetails.trim() && (
              <p className="text-sm text-red-600">
                Additional details are required when selecting "Other" as the reason.
              </p>
            )}
          </div>

          {/* Warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Cancelling this order will:
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>Notify the customer and vendor immediately</li>
                <li>Return items to vendor inventory</li>
                <li>Update your delivery statistics</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isFormValid || (requiresDetails && !additionalDetails.trim()) || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cancelling...
              </>
            ) : (
              'Cancel Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderCancellationModal;
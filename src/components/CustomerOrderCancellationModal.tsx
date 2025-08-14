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

interface CustomerOrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  orderStatus: string;
  onCancel: (reason: string, additionalDetails?: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
}

const CustomerOrderCancellationModal: React.FC<CustomerOrderCancellationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  orderStatus,
  onCancel
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
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

  const customerCancellationReasons = [
    {
      value: 'Changed my mind',
      label: 'Changed my mind',
      description: 'No longer need the items in this order'
    },
    {
      value: 'Found a better price elsewhere',
      label: 'Found a better price elsewhere',
      description: 'Found the same items at a lower price'
    },
    {
      value: 'Ordered by mistake',
      label: 'Ordered by mistake',
      description: 'Accidentally placed this order'
    },
    {
      value: 'Delivery taking too long',
      label: 'Delivery taking too long',
      description: 'Need the items sooner than expected delivery'
    },
    {
      value: 'Wrong items ordered',
      label: 'Wrong items ordered',
      description: 'Ordered the wrong products or quantities'
    },
    {
      value: 'Address change required',
      label: 'Address change required',
      description: 'Need to change delivery address'
    },
    {
      value: 'Financial reasons',
      label: 'Financial reasons',
      description: 'Can no longer afford this purchase'
    },
    {
      value: 'Quality concerns',
      label: 'Quality concerns',
      description: 'Concerned about product quality after ordering'
    },
    {
      value: 'Other',
      label: 'Other',
      description: 'Different reason (please specify below)'
    }
  ];

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
      case 'assigned_to_delivery': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'packed':
      case 'picked_up': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped':
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          onClose();
        }, 3000);
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
  const requiresDetails = selectedReason === 'Other';

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
              {submitResult.success ? 'Order Cancelled Successfully' : 'Cancellation Failed'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className={submitResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                {submitResult.success 
                  ? submitResult.message || 'Your order has been successfully cancelled. A refund will be processed within 3-5 business days.'
                  : submitResult.error || 'Failed to cancel order. Please try again or contact support.'
                }
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button onClick={handleClose} variant={submitResult.success ? 'default' : 'outline'}>
              Close
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
            We're sorry to see you go! Please let us know why you're cancelling this order so we can improve our service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border space-y-3">
            <h4 className="font-medium text-gray-900">Order Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Order Number:</span>
                <div className="font-mono font-medium">{orderNumber}</div>
              </div>
              <div>
                <span className="text-gray-600">Order Amount:</span>
                <div className="font-bold text-blue-600">₹{totalAmount.toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Current Status:</span>
                <div className="mt-1">
                  <Badge className={getStatusBadgeColor(orderStatus)}>
                    {getStatusLabel(orderStatus)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="cancellation-reason" className="text-base font-medium">
              Why are you cancelling this order? *
            </Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="cancellation-reason">
                <SelectValue placeholder="Please select a reason" />
              </SelectTrigger>
              <SelectContent>
                {customerCancellationReasons.map((reason) => (
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
                  ? "Please provide specific details about your cancellation reason..."
                  : "Optional: Help us improve by providing additional feedback..."
              }
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {requiresDetails && !additionalDetails.trim() && (
              <p className="text-sm text-red-600">
                Please provide additional details when selecting "Other" as the reason.
              </p>
            )}
          </div>

          {/* Important Information */}
          {/* <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens next:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>Your order will be cancelled immediately</li>
                <li>If you've already paid, refund will be processed within 3-5 business days</li>
                <li>You'll receive a confirmation email about the cancellation</li>
                <li>Items will be returned to vendor inventory</li>
              </ul>
            </AlertDescription>
          </Alert> */}
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
            className="min-w-[140px]"
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

export default CustomerOrderCancellationModal; 
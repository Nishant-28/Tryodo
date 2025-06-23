import React, { useState } from 'react';
import { 
  Package, Clock, CheckCircle, Truck, MapPin, User, Phone, Copy, 
  ChevronDown, ChevronUp, Calendar, CreditCard, ShoppingBag, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    payment_method: string;
    estimated_delivery_date: string;
    created_at: string;
    updated_at?: string;
    picked_up_date?: string;
    out_for_delivery_date?: string;
    delivery_address: any;
    order_items: any[];
    delivery_partner_id?: string;
    delivery_partner_name?: string;
    delivery_partner_phone?: string;
    pickup_otp?: string;
    delivery_otp?: string;
    delivered_at?: string;
    delivery_assigned_at?: string;
    current_delivery_status?: string;
    tracking_updates?: any[];
    cancellation_reason?: string;
    cancelled_date?: string;
    actual_delivery_date?: string;
  };
  onTrackOrder?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onTrackOrder }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': 
      case 'assigned_to_delivery': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'packed': 
      case 'picked_up': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped': 
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'returned': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryProgress = () => {
    const statusOrder = ['pending', 'confirmed', 'assigned_to_delivery', 'picked_up', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.order_status.toLowerCase());
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const getProgressSteps = () => {
    const steps = [
      {
        key: 'confirmed',
        title: 'Order Confirmed',
        timestamp: order.order_status !== 'pending' ? order.created_at : null,
        icon: CheckCircle,
        completed: order.order_status !== 'pending'
      },
      {
        key: 'assigned_to_delivery',
        title: 'Assigned to Delivery Partner',
        timestamp: order.delivery_assigned_at,
        icon: User,
        completed: !!order.delivery_partner_id
      },
      {
        key: 'picked_up',
        title: 'Picked Up',
        timestamp: order.picked_up_date,
        icon: Package,
        completed: !!order.picked_up_date || ['picked_up', 'out_for_delivery', 'delivered'].includes(order.order_status.toLowerCase())
      },
      {
        key: 'out_for_delivery',
        title: 'Out for Delivery',
        timestamp: order.out_for_delivery_date,
        icon: Truck,
        completed: ['out_for_delivery', 'delivered'].includes(order.order_status.toLowerCase())
      },
      {
        key: 'delivered',
        title: 'Delivered',
        timestamp: order.delivered_at || order.actual_delivery_date,
        icon: CheckCircle,
        completed: order.order_status.toLowerCase() === 'delivered'
      }
    ];

    return steps;
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Pending';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatEstimatedDelivery = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  const copyOTP = async (otp: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      toast({
        title: "OTP Copied",
        description: "OTP has been copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy OTP",
        variant: "destructive",
      });
    }
  };

  const progress = getDeliveryProgress();
  const progressSteps = getProgressSteps();
  const itemCount = order.order_items?.length || 0;
  const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <Card className="w-full mb-4 shadow-sm border-gray-200">
      <CardHeader className="pb-3">
        {/* Order Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{order.order_number}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn("text-xs font-medium", getStatusColor(order.order_status))}>
                {order.order_status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={cn("text-xs font-medium", getPaymentStatusColor(order.payment_status))}>
                {order.payment_status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">₹{order.total_amount}</p>
            <p className="text-sm text-gray-500">{formatTimeAgo(order.created_at)}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
          <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
          {onTrackOrder && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onTrackOrder(order.id)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Track Order
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Order Items Preview */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
            {order.order_items.slice(0, isExpanded ? undefined : 2).map((item, index) => (
              <div key={item.id || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-sm text-gray-500">
                    by {item.vendor?.business_name || 'Vendor Info Missing'}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-sm font-medium">₹{item.unit_price} each</p>
                  <p className="text-sm font-bold">₹{item.line_total} total</p>
                </div>
              </div>
            ))}
            {order.order_items.length > 2 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full mt-2 text-blue-600"
              >
                Show {order.order_items.length - 2} more items
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Delivery Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">Delivery Progress</h4>
            <span className="text-sm font-medium text-blue-600">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2 mb-3" />
          
          <div className="space-y-3">
            {progressSteps.map((step, index) => {
              const IconComponent = step.icon;
              const isCompleted = step.completed;
              const isNext = !isCompleted && index === progressSteps.findIndex(s => !s.completed);
              
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                    isCompleted 
                      ? "bg-green-100 text-green-600" 
                      : isNext 
                        ? "bg-blue-100 text-blue-600" 
                        : "bg-gray-100 text-gray-400"
                  )}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      isCompleted ? "text-gray-900" : "text-gray-500"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(step.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-center text-gray-600"
        >
          {isExpanded ? (
            <>
              Show Less
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              View Details
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            <Separator />
            
            {/* Order Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Order Details</h4>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={cn("text-xs", getStatusColor(order.order_status))}>
                    {order.order_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold">₹{order.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <Badge className={cn("text-xs", getPaymentStatusColor(order.payment_status))}>
                    {order.payment_status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Delivery:</span>
                  <span className="font-medium">{formatEstimatedDelivery(order.estimated_delivery_date)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium">{order.delivery_address.recipient_name}</p>
                  <p className="text-gray-600">{order.delivery_address.phone}</p>
                  <p className="text-gray-600 mt-1">
                    {order.delivery_address.address_line_1}
                    {order.delivery_address.address_line_2 && `, ${order.delivery_address.address_line_2}`}
                  </p>
                  <p className="text-gray-600">
                    {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery OTP */}
            {order.delivery_otp && order.order_status !== 'delivered' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Delivery OTP</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{order.delivery_otp}</p>
                      <p className="text-sm text-blue-700">Share this OTP with delivery partner</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOTP(order.delivery_otp!)}
                      className="text-blue-600 border-blue-200"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Partner Info */}
            {order.delivery_partner_name && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Delivery Partner
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium">{order.delivery_partner_name}</p>
                  {order.delivery_partner_phone && (
                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {order.delivery_partner_phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCard; 
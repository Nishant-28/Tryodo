import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, CheckCircle, Clock, MapPin, User, AlertCircle, 
  Shield, Phone, Copy, Navigation, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface OrderTrackingProps {
  orderId: string;
}

interface TrackingData {
  order: any;
  deliveryPartnerOrder: any;
  deliveryPartner: any;
}

const OrderTracking = ({ orderId }: OrderTrackingProps) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTracking();
  }, [orderId]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 OrderTracking: Loading tracking for order:', orderId);

      // Fetch order details - this should always work for customers
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('❌ OrderTracking: Order fetch error:', orderError);
        throw orderError;
      }

      console.log('✅ OrderTracking: Order fetched:', order);

      // Try to fetch order items (non-critical)
      let orderItems = [];
      try {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            *,
            vendor:vendors (
              id,
              business_name,
              contact_phone
            )
          `)
          .eq('order_id', orderId);

        if (itemsError) {
          console.warn('⚠️ OrderTracking: Order items fetch error:', itemsError);
        } else {
          orderItems = items || [];
          console.log('✅ OrderTracking: Order items fetched:', orderItems);
        }
      } catch (err) {
        console.warn('⚠️ OrderTracking: Order items query failed, continuing without items');
      }

      // Try to fetch delivery partner order details (non-critical due to RLS)
      let deliveryPartnerOrder = null;
      let deliveryPartner = null;
      
      try {
        const { data: dpOrder, error: deliveryError } = await supabase
          .from('delivery_partner_orders')
          .select(`
            *,
            delivery_partner:delivery_partners (
              id,
              profile:profiles (
                full_name,
                phone
              )
            )
          `)
          .eq('order_id', orderId)
          .maybeSingle();

        if (deliveryError) {
          console.warn('⚠️ OrderTracking: Delivery partner fetch error (might be RLS):', deliveryError);
        } else {
          deliveryPartnerOrder = dpOrder;
          deliveryPartner = dpOrder?.delivery_partner || null;
          console.log('✅ OrderTracking: Delivery partner order fetched:', deliveryPartnerOrder);
        }
      } catch (err) {
        console.warn('⚠️ OrderTracking: Delivery partner query failed (likely RLS), continuing without delivery info');
      }

      // Always set tracking data, even if some parts failed
      setTracking({
        order: { ...order, order_items: orderItems },
        deliveryPartnerOrder,
        deliveryPartner
      });
    } catch (error: any) {
      console.error('❌ OrderTracking: Failed to load tracking:', error);
      setError(`Failed to load tracking information: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    if (!tracking) return [];
    
    const { order, deliveryPartnerOrder } = tracking;
    
    const steps = [
      {
        key: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been confirmed',
        timestamp: order.order_status !== 'pending' ? order.created_at : null,
        icon: CheckCircle,
        completed: order.order_status !== 'pending'
      },
      {
        key: 'assigned_to_delivery',
        title: 'Assigned to Delivery Partner',
        description: deliveryPartnerOrder?.delivery_partner?.profile?.full_name 
          ? `Assigned to ${deliveryPartnerOrder.delivery_partner.profile.full_name}` 
          : 'Waiting for delivery partner assignment',
        timestamp: deliveryPartnerOrder?.assigned_at,
        icon: User,
        completed: !!deliveryPartnerOrder
      },
      {
        key: 'picked_up',
        title: 'Picked Up',
        description: 'Order picked up from vendor',
        timestamp: deliveryPartnerOrder?.picked_up_at,
        icon: Package,
        completed: !!deliveryPartnerOrder?.picked_up_at
      },
      {
        key: 'out_for_delivery',
        title: 'Out for Delivery',
        description: 'Your order is on the way to your location',
        timestamp: order.order_status === 'out_for_delivery' ? order.updated_at : null,
        icon: Truck,
        completed: ['out_for_delivery', 'delivered'].includes(order.order_status)
      },
      {
        key: 'delivered',
        title: 'Delivered',
        description: 'Order delivered successfully',
        timestamp: deliveryPartnerOrder?.delivered_at || order.actual_delivery_date,
        icon: CheckCircle,
        completed: order.order_status === 'delivered'
      }
    ];

    return steps;
  };

  const getDeliveryProgress = () => {
    if (!tracking) return 0;
    
    const steps = getStatusSteps();
    const completedSteps = steps.filter(step => step.completed).length;
    return (completedSteps / steps.length) * 100;
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

  const copyOTP = (otp: string, type: string) => {
    navigator.clipboard.writeText(otp);
    toast({ title: `${type} OTP copied to clipboard` });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{error || 'No tracking information available'}</p>
        <Button onClick={loadTracking} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const { order, deliveryPartnerOrder, deliveryPartner } = tracking;
  const steps = getStatusSteps();
  const progress = getDeliveryProgress();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Delivery Progress</span>
            <Badge variant="outline">{Math.round(progress)}% Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {steps.map((step, index) => (
              <div 
                key={step.key}
                className={`text-center p-3 rounded-lg text-xs ${
                  step.completed 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <step.icon className="h-5 w-5 mx-auto mb-1" />
                <div className="font-medium">{step.title}</div>
                <div className="text-xs opacity-75 mt-1">
                  {step.timestamp ? formatTimeAgo(step.timestamp) : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Order Number:</span> #{order.order_number}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge className="ml-2" variant="outline">
                {order.order_status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Total Amount:</span> ₹{order.total_amount}
            </div>
            <div>
              <span className="font-medium">Payment Status:</span>
              <Badge className="ml-2" variant="outline">
                {order.payment_status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          {order.estimated_delivery_date && (
            <div>
              <span className="font-medium">Estimated Delivery:</span> {' '}
              {new Date(order.estimated_delivery_date).toLocaleDateString('en-IN')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Partner Info */}
      {deliveryPartner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Delivery Partner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>{deliveryPartner.profile?.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>{deliveryPartner.profile?.phone || 'N/A'}</span>
              </div>
            </div>

            {/* OTP Information */}
            {deliveryPartnerOrder && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {deliveryPartnerOrder.pickup_otp && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-900">Pickup OTP</div>
                        <div className="text-lg font-bold text-blue-600">{deliveryPartnerOrder.pickup_otp}</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyOTP(deliveryPartnerOrder.pickup_otp, 'Pickup')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {deliveryPartnerOrder.delivery_otp && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-900">Delivery OTP</div>
                        <div className="text-lg font-bold text-green-600">{deliveryPartnerOrder.delivery_otp}</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyOTP(deliveryPartnerOrder.delivery_otp, 'Delivery')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            {order.delivery_address?.address_line1}
            {order.delivery_address?.address_line2 && `, ${order.delivery_address.address_line2}`}
            <br />
            {order.delivery_address?.city}, {order.delivery_address?.state} - {order.delivery_address?.pincode}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTracking; 
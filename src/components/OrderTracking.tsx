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
  order_id: string;
  order_number: string;
  current_status: string;
  customer_name: string;
  customer_phone: string;
  vendor_name: string;
  vendor_phone: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  pickup_otp?: string;
  delivery_otp?: string;
  created_at: string;
  confirmed_at?: string;
  assigned_at?: string;
  picked_up_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  estimated_delivery: string;
  delivery_address: any;
  tracking_updates: TrackingUpdate[];
  live_location?: {
    latitude: number;
    longitude: number;
    address: string;
    updated_at: string;
  };
}

interface TrackingUpdate {
  id: string;
  status: string;
  message: string;
  timestamp: string;
  location?: string;
}

const OrderTracking = ({ orderId }: OrderTrackingProps) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadTracking, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive tracking data
      const { data, error } = await supabase
        .from('order_tracking_view')
        .select(`
          *,
          order_tracking_updates (
            id,
            status,
            message,
            timestamp,
            location
          ),
          delivery_partner_location (
            latitude,
            longitude,
            address,
            updated_at
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (error) throw error;

      setTracking({
        ...data,
        tracking_updates: data.order_tracking_updates || [],
        live_location: data.delivery_partner_location?.[0]
      });
    } catch (error: any) {
      console.error('Failed to load tracking:', error);
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    if (!tracking) return [];
    
    const steps = [
      {
        key: 'confirmed',
        title: 'Order Confirmed',
        description: 'Your order has been confirmed by the vendor',
        timestamp: tracking.confirmed_at,
        icon: CheckCircle,
        completed: true
      },
      {
        key: 'assigned_to_delivery',
        title: 'Assigned to Delivery Partner',
        description: tracking.delivery_partner_name 
          ? `Assigned to ${tracking.delivery_partner_name}` 
          : 'Waiting for delivery partner assignment',
        timestamp: tracking.assigned_at,
        icon: User,
        completed: !!tracking.assigned_at
      },
      {
        key: 'picked_up',
        title: 'Picked Up',
        description: 'Order picked up from vendor using OTP verification',
        timestamp: tracking.picked_up_at,
        icon: Package,
        completed: !!tracking.picked_up_at
      },
      {
        key: 'out_for_delivery',
        title: 'Out for Delivery',
        description: 'Your order is on the way to your location',
        timestamp: tracking.out_for_delivery_at,
        icon: Truck,
        completed: !!tracking.out_for_delivery_at
      },
      {
        key: 'delivered',
        title: 'Delivered',
        description: 'Order delivered successfully with OTP verification',
        timestamp: tracking.delivered_at,
        icon: CheckCircle,
        completed: !!tracking.delivered_at
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
                className={`text-center p-2 rounded-lg text-xs border ${
                  step.completed 
                    ? 'bg-green-50 text-green-800 border-green-200' 
                    : index === steps.findIndex(s => !s.completed)
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                <step.icon className="h-4 w-4 mx-auto mb-1" />
                <div className="font-medium">{step.title}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OTP Information */}
      {(tracking.pickup_otp || tracking.delivery_otp) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              OTP Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tracking.pickup_otp && !tracking.picked_up_at && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Pickup OTP</h4>
                    <p className="text-sm text-blue-700">For delivery partner to collect from vendor</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{tracking.pickup_otp}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyOTP(tracking.pickup_otp!, 'Pickup')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {tracking.delivery_otp && tracking.out_for_delivery_at && !tracking.delivered_at && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">Delivery OTP</h4>
                    <p className="text-sm text-green-700">Share with delivery partner upon arrival</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">{tracking.delivery_otp}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyOTP(tracking.delivery_otp!, 'Delivery')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Partner Information */}
      {tracking.delivery_partner_name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Delivery Partner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{tracking.delivery_partner_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{tracking.delivery_partner_phone}</span>
                </div>
              </div>
              
              {tracking.live_location && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Live Location</span>
                  </div>
                  <p className="text-sm text-gray-600">{tracking.live_location.address}</p>
                  <p className="text-xs text-gray-500">
                    Updated {formatTimeAgo(tracking.live_location.updated_at)}
                  </p>
                </div>
          )}
        </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-100 text-green-600' 
                    : index === steps.findIndex(s => !s.completed)
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <span className="text-sm text-gray-500">{formatTimeAgo(step.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Additional tracking updates */}
          {tracking.tracking_updates.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-4">Additional Updates</h4>
              <div className="space-y-3">
                {tracking.tracking_updates.map((update) => (
                  <div key={update.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{update.status}</span>
                        <span className="text-xs text-gray-500">{formatTimeAgo(update.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{update.message}</p>
                      {update.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {update.location}</p>
                      )}
                    </div>
          </div>
        ))}
      </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="font-medium">{tracking.customer_name}</p>
            <p className="text-gray-600">{tracking.customer_phone}</p>
            <div className="mt-2">
              <p>{tracking.delivery_address?.address_line1}</p>
              {tracking.delivery_address?.address_line2 && (
                <p>{tracking.delivery_address.address_line2}</p>
              )}
              <p>
                {tracking.delivery_address?.city}, {tracking.delivery_address?.state} - {tracking.delivery_address?.pincode}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTracking; 
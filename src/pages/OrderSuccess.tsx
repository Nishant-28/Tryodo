import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Truck, Clock, ArrowRight, Download, Share2, AlertTriangle, Timer, User, Store, Phone, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface OrderDetails {
  id: string;
  order_number: string;
  total_amount: number;
  estimated_delivery_date: string;
  order_status: string;
  payment_method: string;
  delivery_address: any;
  created_at: string;
  customer_id: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  vendor_id: string;
  product_name: string;
  product_description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  vendor_business_name: string;
  vendor_contact_person: string;
  vendor_phone: string;
  vendor_rating: number;
  vendor_total_reviews: number;
  vendor_is_verified: boolean;
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount: number | null;
  business_hours_start: string;
  business_hours_end: string;
  created_at: string;
  estimated_approval_time?: string;
  time_remaining_minutes?: number;
}

interface VendorOrderStatus {
  vendor_id: string;
  vendor_name: string;
  items: OrderItem[];
  overall_status: 'pending' | 'confirmed' | 'cancelled' | 'processing';
  total_amount: number;
  estimated_approval: string;
  is_urgent: boolean;
}

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [vendorStatuses, setVendorStatuses] = useState<VendorOrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  useEffect(() => {
    const { orderId, orderDetails: details } = location.state || {};
    
    if (!orderId || !details) {
      navigate('/order');
      return;
    }
    
    setOrderDetails(details);
    loadOrderItems(orderId);
  }, [location.state, navigate]);

  // Real-time updates every 10 seconds
  useEffect(() => {
    if (!orderDetails) return;

    const interval = setInterval(() => {
      refreshOrderStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [orderDetails]);

  const loadOrderItems = async (orderId: string) => {
    try {
      setLoading(true);
      
      // Try the full query first
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          vendors!vendor_id (
            business_name,
            contact_person,
            phone,
            rating,
            total_reviews,
            is_verified,
            auto_approve_orders,
            order_confirmation_timeout_minutes,
            auto_approve_under_amount,
            business_hours_start,
            business_hours_end
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Full query failed, trying fallback:', error);
        // Fallback to basic query if vendor columns don't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('order_items')
          .select(`
            *,
            vendors!vendor_id (
              business_name,
              contact_person,
              phone,
              rating,
              total_reviews,
              is_verified
            )
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });
          
        if (fallbackError) throw fallbackError;
        
        const itemsWithVendorInfo = fallbackData?.map(item => ({
          ...item,
          vendor_business_name: item.vendors?.business_name || 'Unknown Vendor',
          vendor_contact_person: item.vendors?.contact_person || '',
          vendor_phone: item.vendors?.phone || '',
          vendor_rating: item.vendors?.rating || 0,
          vendor_total_reviews: item.vendors?.total_reviews || 0,
          vendor_is_verified: item.vendors?.is_verified || false,
          auto_approve_orders: false,
          order_confirmation_timeout_minutes: 15,
          auto_approve_under_amount: null,
          business_hours_start: '09:00',
          business_hours_end: '18:00',
          time_remaining_minutes: calculateTimeRemaining(item.created_at, 15)
        })) || [];

        setOrderItems(itemsWithVendorInfo);
        processVendorStatuses(itemsWithVendorInfo);
        toast.info('Database setup incomplete. Please run the vendor setup SQL scripts.');
        return;
      }

      const itemsWithVendorInfo = data?.map(item => ({
        ...item,
        vendor_business_name: item.vendors?.business_name || 'Unknown Vendor',
        vendor_contact_person: item.vendors?.contact_person || '',
        vendor_phone: item.vendors?.phone || '',
        vendor_rating: item.vendors?.rating || 0,
        vendor_total_reviews: item.vendors?.total_reviews || 0,
        vendor_is_verified: item.vendors?.is_verified || false,
        auto_approve_orders: item.vendors?.auto_approve_orders || false,
        order_confirmation_timeout_minutes: item.vendors?.order_confirmation_timeout_minutes || 15,
        auto_approve_under_amount: item.vendors?.auto_approve_under_amount,
        business_hours_start: item.vendors?.business_hours_start || '09:00',
        business_hours_end: item.vendors?.business_hours_end || '18:00',
        time_remaining_minutes: calculateTimeRemaining(item.created_at, item.vendors?.order_confirmation_timeout_minutes || 15)
      })) || [];

      setOrderItems(itemsWithVendorInfo);
      processVendorStatuses(itemsWithVendorInfo);
      
    } catch (error) {
      console.error('Error loading order items:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (createdAt: string, timeoutMinutes: number) => {
    const orderTime = new Date(createdAt);
    const expiryTime = new Date(orderTime.getTime() + timeoutMinutes * 60000);
    const now = new Date();
    const diff = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 60000));
    return diff;
  };

  const processVendorStatuses = (items: OrderItem[]) => {
    const vendorGroups = items.reduce((acc, item) => {
      if (!acc[item.vendor_id]) {
        acc[item.vendor_id] = {
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_business_name,
          items: [],
          overall_status: 'pending' as const,
          total_amount: 0,
          estimated_approval: getEstimatedApprovalTime(item),
          is_urgent: false
        };
      }
      
      acc[item.vendor_id].items.push(item);
      acc[item.vendor_id].total_amount += item.line_total;
      
      // Determine overall status
      const statuses = acc[item.vendor_id].items.map(i => i.item_status);
      if (statuses.every(s => s === 'confirmed')) {
        acc[item.vendor_id].overall_status = 'confirmed';
      } else if (statuses.some(s => s === 'cancelled')) {
        acc[item.vendor_id].overall_status = 'cancelled';
      } else if (statuses.some(s => s === 'processing')) {
        acc[item.vendor_id].overall_status = 'processing';
      }
      
      // Check urgency
      acc[item.vendor_id].is_urgent = acc[item.vendor_id].items.some(i => 
        (i.time_remaining_minutes || 0) <= 5 && i.item_status === 'pending'
      );
      
      return acc;
    }, {} as Record<string, VendorOrderStatus>);

    setVendorStatuses(Object.values(vendorGroups));
  };

  const getEstimatedApprovalTime = (item: OrderItem) => {
    if (item.auto_approve_orders) {
      return "Auto-approval enabled";
    }
    
    const now = new Date();
    const businessStart = new Date();
    const [startHour, startMin] = item.business_hours_start.split(':');
    businessStart.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    
    const businessEnd = new Date();
    const [endHour, endMin] = item.business_hours_end.split(':');
    businessEnd.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
    
    if (now >= businessStart && now <= businessEnd) {
      return "Within business hours";
    } else {
      return `Next business day (${item.business_hours_start} - ${item.business_hours_end})`;
    }
  };

  const refreshOrderStatus = async () => {
    if (!orderDetails) return;
    
    setRefreshing(true);
    try {
      await loadOrderItems(orderDetails.id);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing order status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'processing': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getTimeDisplayColor = (minutes: number) => {
    if (minutes <= 0) return 'text-red-600';
    if (minutes <= 5) return 'text-red-500';
    if (minutes <= 10) return 'text-yellow-500';
    return 'text-green-600';
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 0) return 'Expired';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const handleContinueShopping = () => {
    navigate('/order');
  };

  const handleViewOrders = () => {
    navigate('/my-orders');
  };

  const handleDownloadInvoice = () => {
    if (orderDetails) {
      // Generate and download invoice
      toast.info('Invoice download will be available soon');
    }
  };

  const handleShareOrder = () => {
    if (orderDetails) {
      const shareText = `I just placed an order on Tryodo! Order #${orderDetails.order_number}`;
      if (navigator.share) {
        navigator.share({
          title: 'Tryodo Order',
          text: shareText,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
        toast.success('Order details copied to clipboard!');
      }
    }
  };

  if (loading || !orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {loading ? 'Loading order details...' : 'Order not found'}
            </h2>
            {!loading && (
              <Button onClick={() => navigate('/order')}>
                Continue Shopping
              </Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const deliveryAddress = orderDetails.delivery_address;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-lg text-gray-600 mb-4">
            Thank you for your purchase. Your order is being processed by our vendors.
          </p>
          
          {/* Real-time status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live updates enabled</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={refreshOrderStatus}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-xs">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vendor Dashboard - Real-time Order Status */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Vendor Status Dashboard
                </CardTitle>
                <CardDescription>
                  Real-time updates from your vendors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {vendorStatuses.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading vendor information...</p>
                  </div>
                ) : (
                  vendorStatuses.map((vendor) => (
                    <div key={vendor.vendor_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{vendor.vendor_name}</h3>
                            <Badge 
                              variant={getStatusBadgeVariant(vendor.overall_status)}
                              className={getStatusColor(vendor.overall_status)}
                            >
                              {vendor.overall_status.charAt(0).toUpperCase() + vendor.overall_status.slice(1)}
                            </Badge>
                            {vendor.is_urgent && (
                              <Badge variant="destructive" className="animate-pulse">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Total: ₹{vendor.total_amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {vendor.estimated_approval}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {vendor.items.map((item) => (
                          <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.product_name}</h4>
                                <p className="text-sm text-gray-600">
                                  Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()} = ₹{item.line_total.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={getStatusBadgeVariant(item.item_status)}>
                                  {item.item_status.charAt(0).toUpperCase() + item.item_status.slice(1)}
                                </Badge>
                                {item.item_status === 'pending' && item.time_remaining_minutes !== undefined && (
                                  <div className={`text-xs mt-1 font-medium ${getTimeDisplayColor(item.time_remaining_minutes)}`}>
                                    <Timer className="h-3 w-3 inline mr-1" />
                                    {formatTimeRemaining(item.time_remaining_minutes)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {item.item_status === 'pending' && (
                              <div className="mt-2 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Waiting for vendor confirmation...
                                {item.auto_approve_orders && (
                                  <span className="ml-2 text-green-600 font-medium">
                                    Auto-approval enabled
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {item.item_status === 'confirmed' && (
                              <div className="mt-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2">
                                <CheckCircle className="h-3 w-3 inline mr-1" />
                                Confirmed by vendor - Preparing for shipment
                              </div>
                            )}
                            
                            {item.item_status === 'cancelled' && (
                              <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                Cancelled by vendor - Refund will be processed
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Order Number</p>
                    <p className="font-semibold text-lg">{orderDetails.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-semibold text-lg">₹{orderDetails.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">{orderDetails.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Status</p>
                    <Badge variant="secondary">{orderDetails.order_status}</Badge>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Estimated Delivery</p>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span className="font-medium">
                      {new Date(orderDetails.estimated_delivery_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="font-medium">{deliveryAddress.contact_name}</p>
                  <p className="text-gray-600">
                    {deliveryAddress.address_line1}
                    {deliveryAddress.address_line2 && `, ${deliveryAddress.address_line2}`}
                  </p>
                  <p className="text-gray-600">
                    {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" />
                    {deliveryAddress.contact_phone}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              <Button onClick={handleViewOrders} variant="outline" className="w-full">
                View All Orders
              </Button>
              <Button onClick={handleContinueShopping} className="w-full">
                Continue Shopping
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDownloadInvoice}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleShareOrder}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default OrderSuccess; 
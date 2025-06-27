import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Package, Truck, Clock, ArrowRight, Download, Share2, 
  AlertTriangle, Timer, User, Store, Phone, MapPin, RefreshCw,
  Star, Verified, Copy, Facebook, Twitter, MessageCircle, Mail,
  Calendar, CreditCard, Shield, Headphones, RotateCcw, ExternalLink,
  Gift, Zap, Heart, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  subtotal?: number;
  shipping_charges?: number;
  tax_amount?: number;
  payment_status?: string;
  special_instructions?: string;
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
  vendor_confirmed_at: string | null;
  vendor_notes: string | null;
  created_at: string;
  updated_at: string;
  // Vendor information
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
  vendor_business_city?: string;
  vendor_business_state?: string;
  warranty_months?: number;
  delivery_time_days?: number;
  time_remaining_minutes?: number;
}

interface VendorOrderStatus {
  vendor_id: string;
  vendor_name: string;
  items: OrderItem[];
  overall_status: 'pending' | 'confirmed' | 'cancelled' | 'processing' | 'packed' | 'picked_up' | 'shipped' | 'delivered';
  total_amount: number;
  estimated_approval: string;
  is_urgent: boolean;
  vendor_rating: number;
  vendor_reviews: number;
  is_verified: boolean;
  vendor_phone: string;
  vendor_location: string;
  confirmed_at: string | null;
  all_items_confirmed: boolean;
}

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [vendorStatuses, setVendorStatuses] = useState<VendorOrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [shareUrl, setShareUrl] = useState('');
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);
  
  // Initialize with real order data only - NO MORE DUMMY DATA
  useEffect(() => {
    console.log('OrderSuccess component mounted');
    
    const { orderId, orderDetails: details } = location.state || {};
    console.log('Navigation state:', { orderId, details });
    
    if (orderId && details) {
      console.log('✅ Loading REAL order data');
      setOrderDetails(details);
      setShareUrl(window.location.origin + `/order-tracking/${orderId}`);
      loadRealOrderItems(details.id);
    } else {
      // Check URL params as fallback
      const urlParams = new URLSearchParams(location.search);
      const orderIdFromUrl = urlParams.get('orderId');
      
      if (orderIdFromUrl) {
        console.log('🔄 Loading order from URL parameter:', orderIdFromUrl);
        loadOrderByNumber(orderIdFromUrl);
      } else {
        console.log('❌ No order data available - redirecting to orders page');
        toast({
          title: "No Order Found",
          description: "Please access this page after placing an order"
        });
        navigate('/my-orders');
      }
    }

    // Cleanup function
    return () => {
      if (realtimeSubscription) {
        console.log('Cleaning up realtime subscription');
        realtimeSubscription.unsubscribe();
      }
    };
  }, [location.state, location.search, navigate]);

  const loadOrderByNumber = async (orderNumber: string) => {
    try {
      setLoading(true);
      console.log('Loading order by number:', orderNumber);
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (orderError) {
        console.error('Error loading order:', orderError);
        throw orderError;
      }

      console.log('Order data loaded:', orderData);
      setOrderDetails(orderData);
      setShareUrl(window.location.origin + `/order-tracking/${orderNumber}`);
      
      await loadRealOrderItems(orderData.id);
      
    } catch (error) {
      console.error('Error loading order by number:', error);
      toast({
        title: "Error",
        description: "Failed to load order details"
      });
      navigate('/my-orders');
    }
  };

  const loadRealOrderItems = async (orderId: string) => {
    try {
      setLoading(true);
      console.log('🔄 Loading REAL order items for order ID:', orderId);
      
      // Query with comprehensive vendor information
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
            business_hours_end,
            business_city,
            business_state
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading order items:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ No order items found for this order');
        setOrderItems([]);
        setVendorStatuses([]);
        setLoading(false);
        return;
      }

      console.log('✅ Real order items loaded:', data);

      // Process the real data
      const processedItems: OrderItem[] = data.map(item => ({
        ...item,
        vendor_business_name: item.vendors?.business_name || 'Unknown Vendor',
        vendor_contact_person: item.vendors?.contact_person || '',
        vendor_phone: item.vendors?.phone || '',
        vendor_rating: item.vendors?.rating || 0,
        vendor_total_reviews: item.vendors?.total_reviews || 0,
        vendor_is_verified: item.vendors?.is_verified || false,
        auto_approve_orders: item.vendors?.auto_approve_orders || false,
        order_confirmation_timeout_minutes: item.vendors?.order_confirmation_timeout_minutes || 30,
        auto_approve_under_amount: item.vendors?.auto_approve_under_amount,
        business_hours_start: item.vendors?.business_hours_start || '09:00',
        business_hours_end: item.vendors?.business_hours_end || '18:00',
        vendor_business_city: item.vendors?.business_city || '',
        vendor_business_state: item.vendors?.business_state || '',
        warranty_months: item.warranty_months || 12,
        delivery_time_days: item.estimated_delivery_days || 3,
        time_remaining_minutes: calculateTimeRemaining(item.created_at, item.vendors?.order_confirmation_timeout_minutes || 30)
      }));

      console.log('✅ Processed real order items:', processedItems);
      setOrderItems(processedItems);
      processVendorStatuses(processedItems);
      
      // Set up real-time subscription for this order
      setupRealtimeSubscription(orderId);
      
    } catch (error) {
      console.error('❌ Error loading real order items:', error);
      toast({
        title: "Error",
        description: "Failed to load order items"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = (orderId: string) => {
    console.log('🔴 Setting up real-time subscription for order:', orderId);
    
    // Clean up existing subscription
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
    }

    // Subscribe to order_items changes for this specific order
    const subscription = supabase
      .channel(`order_items_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔴 Real-time update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            console.log('📝 Order item updated:', payload.new);
            // Reload the order items to get fresh data with vendor info
            loadRealOrderItems(orderId);
            setLastUpdated(new Date());
            
            // Show notification for status changes
            if (payload.old?.item_status !== payload.new?.item_status) {
              const newStatus = payload.new.item_status;
              const productName = payload.new.product_name;
              
              if (newStatus === 'confirmed') {
                toast({
                  title: "Order Confirmed! 🎉",
                  description: `${productName} has been confirmed by the vendor`
                });
              } else if (newStatus === 'processing') {
                toast({
                  title: "Order Processing 📦",
                  description: `${productName} is now being prepared`
                });
              } else if (newStatus === 'cancelled') {
                toast({
                  title: "Order Cancelled ❌",
                  description: `${productName} has been cancelled by the vendor`
                });
              }
            }
          }
        }
      )
      .subscribe();

    setRealtimeSubscription(subscription);
  };

  const calculateTimeRemaining = (createdAt: string, timeoutMinutes: number) => {
    const orderTime = new Date(createdAt);
    const expiryTime = new Date(orderTime.getTime() + timeoutMinutes * 60000);
    const now = new Date();
    return Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 60000));
  };

  const processVendorStatuses = (items: OrderItem[]) => {
    console.log('Processing vendor statuses for items:', items);
    
    if (!items || items.length === 0) {
      console.log('No items to process');
      setVendorStatuses([]);
      return;
    }

    const vendorGroups = items.reduce((acc, item) => {
      console.log('Processing item:', item);
      
      if (!acc[item.vendor_id]) {
        const vendorLocation = `${item.vendor_business_city || ''}, ${item.vendor_business_state || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
        
        acc[item.vendor_id] = {
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_business_name,
          items: [],
          overall_status: 'pending' as const,
          total_amount: 0,
          estimated_approval: getEstimatedApprovalTime(item),
          is_urgent: false,
          vendor_rating: item.vendor_rating,
          vendor_reviews: item.vendor_total_reviews,
          is_verified: item.vendor_is_verified,
          vendor_phone: item.vendor_phone || 'Not available',
          vendor_location: vendorLocation || 'Location not available',
          confirmed_at: null,
          all_items_confirmed: false
        };
        
        console.log('Created vendor group:', acc[item.vendor_id]);
      }
      
      acc[item.vendor_id].items.push(item);
      acc[item.vendor_id].total_amount += item.line_total;
      
      // Track confirmation times
      if (item.item_status === 'confirmed' && item.vendor_confirmed_at) {
        if (!acc[item.vendor_id].confirmed_at || new Date(item.vendor_confirmed_at) < new Date(acc[item.vendor_id].confirmed_at!)) {
          acc[item.vendor_id].confirmed_at = item.vendor_confirmed_at;
        }
      }
      
      // Determine overall status based on all items for this vendor
      const statuses = acc[item.vendor_id].items.map(i => i.item_status);
      console.log('Item statuses for vendor', item.vendor_id, ':', statuses);
      
      // Check if all items are confirmed
      acc[item.vendor_id].all_items_confirmed = statuses.every(s => ['confirmed', 'processing', 'packed', 'picked_up', 'shipped', 'delivered'].includes(s));
      
      if (statuses.every(s => ['delivered'].includes(s))) {
        acc[item.vendor_id].overall_status = 'delivered';
      } else if (statuses.some(s => ['picked_up', 'shipped'].includes(s))) {
        acc[item.vendor_id].overall_status = 'shipped';
      } else if (statuses.some(s => s === 'packed')) {
        acc[item.vendor_id].overall_status = 'packed';
      } else if (statuses.some(s => s === 'processing')) {
        acc[item.vendor_id].overall_status = 'processing';
      } else if (statuses.every(s => ['confirmed', 'processing', 'packed', 'picked_up', 'shipped', 'delivered'].includes(s))) {
        acc[item.vendor_id].overall_status = 'confirmed';
      } else if (statuses.some(s => s === 'cancelled')) {
        acc[item.vendor_id].overall_status = 'cancelled';
      } else {
        acc[item.vendor_id].overall_status = 'pending';
      }
      
      // Update estimated approval for confirmed items
      if (acc[item.vendor_id].overall_status === 'confirmed') {
        acc[item.vendor_id].estimated_approval = `Confirmed at ${new Date(acc[item.vendor_id].confirmed_at || item.updated_at).toLocaleTimeString()}`;
      }
      
      // Check for urgency (only for pending items)
      acc[item.vendor_id].is_urgent = acc[item.vendor_id].items.some(i => 
        (i.time_remaining_minutes || 0) <= 5 && i.item_status === 'pending'
      );
      
      return acc;
    }, {} as Record<string, VendorOrderStatus>);

    const vendorStatusArray = Object.values(vendorGroups);
    console.log('Final vendor statuses:', vendorStatusArray);
    setVendorStatuses(vendorStatusArray);
  };

  const getEstimatedApprovalTime = (item: OrderItem) => {
    if (item.auto_approve_orders) return 'Auto-approval enabled';
    const orderTime = new Date(item.created_at);
    const timeoutMinutes = item.order_confirmation_timeout_minutes || 15;
    const expiryTime = new Date(orderTime.getTime() + timeoutMinutes * 60000);
    const now = new Date();
    
    if (expiryTime > now) {
      return `Response expected by ${expiryTime.toLocaleTimeString()}`;
    }
    return 'Response overdue';
  };

  const refreshOrderStatus = async () => {
    if (!orderDetails) return;
    setRefreshing(true);
    try {
      await loadRealOrderItems(orderDetails.id);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing order status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Utility functions
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'processing': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTimeDisplayColor = (minutes: number) => {
    if (minutes <= 5) return 'text-red-600';
    if (minutes <= 15) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  const getOverallProgress = () => {
    if (vendorStatuses.length === 0) return 0;
    const confirmedVendors = vendorStatuses.filter(v => v.overall_status === 'confirmed').length;
    return (confirmedVendors / vendorStatuses.length) * 100;
  };

  // Share functionality
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Success",
        description: "Copied to clipboard!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy"
      });
    }
  };

  const shareOnWhatsApp = () => {
    const text = `🎉 Just placed an order on Tryodo! Order #${orderDetails?.order_number} for ₹${orderDetails?.total_amount.toLocaleString()}. Track it here: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnTwitter = () => {
    const text = `Just ordered from Tryodo! Order #${orderDetails?.order_number} 🛒✨`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Tryodo Order Confirmation - ${orderDetails?.order_number}`;
    const body = `Hi!\n\nI just placed an order on Tryodo:\n\nOrder Number: ${orderDetails?.order_number}\nTotal Amount: ₹${orderDetails?.total_amount.toLocaleString()}\n\nYou can track the order here: ${shareUrl}\n\nBest regards!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // Navigation handlers
  const handleContinueShopping = () => navigate('/order');
  const handleViewOrders = () => navigate('/my-orders');
  const handleContactSupport = () => window.open('https://wa.me/1234567890?text=Hi, I need help with my order ' + orderDetails?.order_number, '_blank');
  const handleDownloadInvoice = () => toast({
    title: "Invoice Download", 
    description: "Invoice download will be available once the order is confirmed by all vendors"
  });
  const handleReorder = () => { 
    toast({
      title: "Success",
      description: "Items added to cart!"
    }); 
    navigate('/cart'); 
  };
  const handleTrackOrder = () => navigate('/my-orders');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-4">Unable to load order details</p>
            <Button onClick={() => navigate('/order')}>Continue Shopping</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const deliveryAddress = orderDetails.delivery_address || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          {orderDetails.id === 'demo-order-001' && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Demo Mode Active</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                This is sample data for demonstration. To see real order status, place an actual order through the checkout process.
              </p>
            </div>
          )}
          
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Order Placed Successfully! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Thank you for choosing Tryodo. Your order <span className="font-semibold text-blue-600">#{orderDetails.order_number}</span> has been received.
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Order Progress</span>
              <span>{Math.round(getOverallProgress())}% Complete</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>
        </div>

        {/* Quick Actions Bar */}
        <Card className="mb-8 border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={handleTrackOrder} variant="default" size="sm" className="gap-2">
                <MapPin className="h-4 w-4" />
                Track Order
              </Button>
              <Button onClick={handleContactSupport} variant="outline" size="sm" className="gap-2">
                <Headphones className="h-4 w-4" />
                Support
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Vendor Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sections removed as requested */}
          </div>

          {/* Sidebar - Order Summary & Actions */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Order Number</span>
                    <span className="font-bold text-blue-600">{orderDetails.order_number}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Order Date</span>
                    <span className="font-medium">
                      {new Date(orderDetails.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Payment Method</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="font-medium capitalize">{orderDetails.payment_method}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <Badge variant={orderDetails.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {orderDetails.payment_status || 'Pending'}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₹{(orderDetails.subtotal || orderDetails.total_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">₹{(orderDetails.shipping_charges || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>₹{(orderDetails.tax_amount || 0).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-bold text-2xl text-green-600">₹{orderDetails.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card className="border-2 border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">
                      {deliveryAddress.contact_name || deliveryAddress.name || 'Customer'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      {deliveryAddress.address_line1 || deliveryAddress.street_address || 'Address not available'}
                    </p>
                    {(deliveryAddress.address_line2 || deliveryAddress.address_line_2) && (
                      <p className="text-gray-700">
                        {deliveryAddress.address_line2 || deliveryAddress.address_line_2}
                      </p>
                    )}
                    <p className="text-gray-700">
                      {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode || deliveryAddress.postal_code}
                    </p>
                    {(deliveryAddress.contact_phone || deliveryAddress.phone) && (
                      <div className="flex items-center gap-2 mt-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">{deliveryAddress.contact_phone || deliveryAddress.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Expected Delivery</p>
                    <p className="text-sm text-blue-600">
                      {new Date(orderDetails.estimated_delivery_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

{/* Share section removed as requested */}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleTrackOrder} className="w-full gap-2" size="lg">
                  <MapPin className="h-5 w-5" />
                  Track Your Order
                </Button>
                
                <Button onClick={handleViewOrders} variant="outline" className="w-full gap-2">
                  <Package className="h-4 w-4" />
                  View All Orders
                </Button>
                
                <Button onClick={handleContinueShopping} variant="outline" className="w-full gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Continue Shopping
                </Button>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleDownloadInvoice} variant="ghost" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Invoice
                  </Button>
                  <Button onClick={handleReorder} variant="ghost" size="sm" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reorder
                  </Button>
                </div>
                
                <Button onClick={handleContactSupport} variant="ghost" size="sm" className="w-full gap-2 text-orange-600 hover:bg-orange-50">
                  <Headphones className="h-4 w-4" />
                  Need Help? Contact Support
                </Button>
              </CardContent>
            </Card>

            {/* Special Note */}
            {orderDetails.special_instructions && (
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="text-lg">Special Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                    {orderDetails.special_instructions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Last Updated */}
            <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-6">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Secure Payment</h3>
            <p className="text-sm text-gray-600">Your payment is processed securely with industry-standard encryption</p>
          </Card>
          
          <Card className="text-center p-6">
            <Truck className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Fast Delivery</h3>
            <p className="text-sm text-gray-600">We ensure quick and reliable delivery to your doorstep</p>
          </Card>
          
          <Card className="text-center p-6">
            <Headphones className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
            <p className="text-sm text-gray-600">Our customer support team is always here to help you</p>
          </Card>
        </div>

        {/* Thank You Message */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-pink-200" />
            <h2 className="text-2xl font-bold mb-4">Thank You for Choosing Tryodo!</h2>
            <p className="text-blue-100 mb-6">
              We appreciate your trust in us. Your order is our priority, and we'll keep you updated every step of the way.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="secondary" onClick={handleContinueShopping} className="gap-2">
                <Package className="h-4 w-4" />
                Shop More
              </Button>
              <Button variant="outline" onClick={() => window.open('https://tryodo.com/about', '_blank')} className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ExternalLink className="h-4 w-4" />
                About Tryodo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default OrderSuccess; 
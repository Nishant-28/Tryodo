import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Eye, Filter, Search, Truck, Clock, CheckCircle, X, AlertCircle, 
  User, Phone, MapPin, Copy, Navigation, Timer, RefreshCw, XCircle, 
  RotateCcw, ChevronRight, Calendar, CreditCard, ShoppingBag, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import CustomerOrderCancellationModal from '@/components/CustomerOrderCancellationModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { OrderAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Order {
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
  order_items: OrderItem[];
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  pickup_otp?: string;
  delivery_otp?: string;
  delivered_at?: string;
  delivery_assigned_at?: string;
  current_delivery_status?: string;
  tracking_updates?: TrackingUpdate[];
  cancellation_reason?: string;
  cancelled_date?: string;
  actual_delivery_date?: string;
  slot_info?: {
    slot_id: string;
    slot_name: string;
    delivery_window: string;
    start_time: string;
    end_time: string;
    cutoff_time: string;
    pickup_delay_minutes: number;
  } | null;
  sector_info?: {
    sector_id: string;
    sector_name: string;
  } | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  picked_up_at?: string;
  pickup_confirmed_by?: string;
  vendor_notes?: string;
  updated_at: string;
  product_type?: 'existing' | 'marketplace';
  // Marketplace-specific fields
  market_product_name?: string;
  market_product_images?: string[];
  market_product_category?: string;
  market_product_brand?: string;
  market_delivery_time_hours?: number;
  market_vendor?: {
    id: string;
    business_name: string;
  };
  vendor: {
    id: string;
    business_name: string;
    contact_phone?: string;
    business_city?: string;
    business_state?: string;
  } | null;
}

interface TrackingUpdate {
  id: string;
  order_id: string;
  status: string;
  message: string;
  timestamp: string;
  location?: string;
}

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  
  // Customer cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);

  // Check authentication state
  useEffect(() => {
    if (!authLoading && (!user || !profile)) {
      navigate('/login');
      return;
    }
  }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    if (user && profile) {
      loadOrders();
    }
  }, [user, profile]);

  useEffect(() => {
    filterOrders();
  }, [activeTab, orders]);

  const loadOrders = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!customer) {
        setOrders([]);
        return;
      }

      const result = await OrderAPI.getCustomerOrders(customer.id);
      
      if (result.success && result.data) {
        setOrders(result.data);
      } else {
        console.error('Failed to load orders:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to load orders",
          variant: "destructive",
        });
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => {
        const status = (order.order_status || '').toLowerCase();
        return status === activeTab;
      });
    }
    setFilteredOrders(filtered);
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': 
      case 'assigned_to_delivery': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'packed': 
      case 'picked_up': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped': 
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'returned': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': 
      case 'assigned_to_delivery': return <Timer className="h-4 w-4" />;
      case 'packed': 
      case 'picked_up': return <Package className="h-4 w-4" />;
      case 'shipped': 
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'returned': return <RotateCcw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getDeliveryProgress = (order: Order) => {
    const statusOrder = ['pending', 'confirmed', 'assigned_to_delivery', 'picked_up', 'out_for_delivery', 'delivered'];
    const currentStatus = order.current_delivery_status || order.order_status;
    const currentIndex = statusOrder.indexOf(currentStatus.toLowerCase());
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const getProgressSteps = (order: Order) => {
    const currentStatus = order.current_delivery_status || order.order_status;
    
    const steps = [
      {
        key: 'confirmed',
        title: 'Order Confirmed',
        time: order.order_status !== 'pending' ? formatTimeAgo(order.created_at) : null,
        completed: order.order_status !== 'pending',
        current: order.order_status === 'confirmed'
      },
      {
        key: 'assigned_to_delivery',
        title: 'Assigned to Delivery',
        time: order.delivery_assigned_at ? formatTimeAgo(order.delivery_assigned_at) : null,
        completed: !!order.delivery_partner_id || ['assigned_to_delivery', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus.toLowerCase()),
        current: currentStatus.toLowerCase() === 'assigned_to_delivery'
      },
      {
        key: 'picked_up',
        title: 'Picked Up',
        time: order.picked_up_date ? formatTimeAgo(order.picked_up_date) : null,
        completed: !!order.picked_up_date || ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus.toLowerCase()),
        current: currentStatus.toLowerCase() === 'picked_up'
      },
      {
        key: 'out_for_delivery',
        title: 'Out for Delivery',
        time: order.out_for_delivery_date ? formatTimeAgo(order.out_for_delivery_date) : null,
        completed: ['out_for_delivery', 'delivered'].includes(currentStatus.toLowerCase()),
        current: currentStatus.toLowerCase() === 'out_for_delivery'
      },
      {
        key: 'delivered',
        title: 'Delivered',
        time: order.delivered_at ? formatTimeAgo(order.delivered_at) : null,
        completed: currentStatus.toLowerCase() === 'delivered',
        current: false
      }
    ];

    return steps;
  };

  const formatTimeAgo = (dateString: string) => {
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
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate estimated delivery time for marketplace products
  const getMarketplaceDeliveryEstimate = (order: Order) => {
    const marketplaceItems = order.order_items?.filter(item => item.product_type === 'marketplace') || [];
    if (marketplaceItems.length === 0) return null;

    const maxDeliveryTime = Math.max(...marketplaceItems.map(item => item.market_delivery_time_hours || 0));
    if (maxDeliveryTime === 0) return null;

    const orderDate = new Date(order.created_at);
    const estimatedDelivery = new Date(orderDate.getTime() + (maxDeliveryTime * 60 * 60 * 1000));
    
    return {
      maxHours: maxDeliveryTime,
      estimatedDate: estimatedDelivery,
      formattedDate: estimatedDelivery.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const copyOTP = async (otp: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      toast({
        title: "✅ OTP Copied",
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

  // Check if order can be cancelled by customer
  const canCancelOrder = (order: Order) => {
    const cancellableStatuses = [
      'pending', 
      'confirmed', 
      'processing', 
      'assigned_to_delivery', 
      'packed', 
      'picked_up', 
      'out_for_delivery'
    ];
    return cancellableStatuses.includes(order.order_status.toLowerCase()) && 
           order.order_status.toLowerCase() !== 'cancelled';
  };

  // Handle opening cancel modal
  const handleCancelOrderClick = (order: Order) => {
    setSelectedOrderForCancel(order);
    setCancelModalOpen(true);
  };

  // Handle order cancellation
  const handleOrderCancellation = async (reason: string, additionalDetails?: string) => {
    if (!selectedOrderForCancel || !user || !profile) {
      return { success: false, error: 'Missing required information' };
    }

    try {
      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      // Construct full cancellation reason
      const fullReason = additionalDetails 
        ? `${reason} - ${additionalDetails}` 
        : reason;

      // Call the customer cancellation API
      const result = await OrderAPI.cancelOrderByCustomer(
        selectedOrderForCancel.id,
        customer.id,
        fullReason
      );

      if (result.success) {
        // Refresh orders list
        await loadOrders();
        
        toast({
          title: "✅ Order Cancelled",
          description: result.message || "Your order has been cancelled successfully",
        });

        return { success: true, message: result.message };
      } else {
        toast({
          title: "❌ Cancellation Failed",
          description: result.error || "Failed to cancel order",
          variant: "destructive",
        });

        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      const errorMessage = error.message || 'An unexpected error occurred';
      
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      });

      return { success: false, error: errorMessage };
    }
  };

  // Handle modal close
  const handleCancelModalClose = () => {
    setCancelModalOpen(false);
    setSelectedOrderForCancel(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const orderTabs = [
    { key: 'pending', label: 'Pending', count: orders.filter(o => (o.order_status || '').toLowerCase() === 'pending').length },
    { key: 'confirmed', label: 'Confirmed', count: orders.filter(o => (o.order_status || '').toLowerCase() === 'confirmed').length },
    { key: 'out_for_delivery', label: 'Out for Delivery', count: orders.filter(o => (o.order_status || '').toLowerCase() === 'out_for_delivery').length },
    { key: 'delivered', label: 'Delivered', count: orders.filter(o => (o.order_status || '').toLowerCase() === 'delivered').length },
    { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => (o.order_status || '').toLowerCase() === 'cancelled').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 no-text-select">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Page Header */}
        {/* <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div> */}

        {/* Order Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border md:space-x-1 md:flex-nowrap md:p-1 md:gap-0">
            {orderTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 md:flex-initial px-3 py-2 text-xs md:text-sm font-medium rounded-md whitespace-nowrap flex items-center justify-center gap-1 md:gap-2 transition-all",
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.key === 'pending' ? 'Pend' :
                   tab.key === 'confirmed' ? 'Conf' :
                   tab.key === 'out_for_delivery' ? 'OFD' :
                   tab.key === 'delivered' ? 'Del' :
                   tab.key === 'cancelled' ? 'Can' :
                   ''}
                </span>
                {tab.count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-medium",
                    activeTab === tab.key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2 text-gray-600">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading your orders...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
              Start Shopping
            </Button>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const currentStatus = order.current_delivery_status || order.order_status;
              const progress = getDeliveryProgress(order);
              const progressSteps = getProgressSteps(order);
              const itemCount = order.order_items?.length || 0;
              const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

              return (
                <Card key={order.id} className="bg-white shadow-lg border-0 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Order Header with Prominent Price and OTP */}
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{order.order_number}</h3>
                          <Badge className={cn("px-3 py-1 text-sm font-semibold", getStatusColor(currentStatus))}>
                            {getStatusIcon(currentStatus)}
                            <span className="ml-1">{currentStatus.replace('_', ' ').toUpperCase()}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatTimeAgo(order.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4" />
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      {/* Prominent Total Price */}
                      <div className="text-right">
                        <div className="bg-white rounded-lg px-4 py-3 shadow-md border-2 border-blue-200">
                          <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                          <p className="text-3xl font-black text-blue-600">₹{order.total_amount}</p>
                          <Badge className={cn("mt-1 text-xs font-semibold", 
                            order.payment_status === 'paid' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            <CreditCard className="h-3 w-3 mr-1" />
                            {order.payment_status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Prominent OTP Display */}
                    {order.delivery_otp && currentStatus !== 'delivered' && (
                      <div className="mt-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-4 border-2 border-amber-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-amber-800 mb-1">🔐 Delivery OTP</p>
                            <p className="text-4xl font-black text-orange-600 tracking-wider">{order.delivery_otp}</p>
                            <p className="text-xs text-amber-700 mt-1">Share this with your delivery partner</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyOTP(order.delivery_otp!)}
                            className="bg-white text-orange-600 border-orange-300 hover:bg-orange-50 h-12 w-12 p-0"
                          >
                            <Copy className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Cancellation Information for Cancelled Orders */}
                    {currentStatus.toLowerCase() === 'cancelled' && (
                      <div className="mb-6">
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border-2 border-red-200">
                          <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-full">
                              <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-red-800 mb-2">Order Cancelled</h4>
                              {order.cancellation_reason && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-red-700 mb-1">Reason:</p>
                                  <p className="text-red-800 bg-white rounded-lg p-3 border border-red-200">
                                    {order.cancellation_reason}
                                  </p>
                                </div>
                              )}
                              {order.cancelled_date && (
                                <div className="flex items-center gap-2 text-sm text-red-700">
                                  <Calendar className="h-4 w-4" />
                                  <span>Cancelled on {new Date(order.cancelled_date).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}</span>
                                </div>
                              )}
                              <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                <p className="text-sm text-red-800">
                                  <strong>Note:</strong> If you were charged for this order, the refund will be processed within 3-5 business days.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Progress - Only show for non-cancelled orders */}
                    {currentStatus.toLowerCase() !== 'cancelled' && (
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-blue-600" />
                            Delivery Progress
                          </h4>
                          <div className="flex items-center gap-2">
                            {/* Show estimated delivery time for marketplace products */}
                            {(() => {
                              const marketplaceItems = order.order_items?.filter(item => item.product_type === 'marketplace') || [];
                              const maxDeliveryTime = Math.max(...marketplaceItems.map(item => item.market_delivery_time_hours || 0));
                              
                              if (maxDeliveryTime > 0) {
                                return (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                                    🏪 Max {maxDeliveryTime}h delivery
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            <span className="text-sm font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                              {Math.round(progress)}% Complete
                            </span>
                          </div>
                        </div>
                        
                        <Progress value={progress} className="h-3 mb-4 bg-gray-200" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          {progressSteps.map((step, idx) => {
                            const isCompleted = step.completed;
                            const isCurrent = step.current;
                            
                            return (
                              <div key={idx} className={cn(
                                "flex flex-col items-center text-center p-3 rounded-lg transition-all",
                                isCompleted 
                                  ? "bg-emerald-100 border-2 border-emerald-200" 
                                  : isCurrent 
                                    ? "bg-blue-100 border-2 border-blue-200" 
                                    : "bg-gray-50 border-2 border-gray-200"
                              )}>
                                <div className={cn(
                                  "flex items-center justify-center w-10 h-10 rounded-full mb-2",
                                  isCompleted 
                                    ? "bg-emerald-600 text-white" 
                                    : isCurrent 
                                      ? "bg-blue-600 text-white" 
                                      : "bg-gray-400 text-white"
                                )}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : isCurrent ? (
                                    <Timer className="w-5 h-5" />
                                  ) : (
                                    <Clock className="w-5 h-5" />
                                  )}
                                </div>
                                <p className={cn(
                                  "text-sm font-medium mb-1",
                                  isCompleted || isCurrent ? "text-gray-900" : "text-gray-500"
                                )}>
                                  {step.title}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {step.time || 'Pending'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Vendor-specific delivery information for marketplace products */}
                        {(() => {
                          const marketplaceItems = order.order_items?.filter(item => item.product_type === 'marketplace') || [];
                          const vendorDeliveryInfo = new Map();
                          
                          marketplaceItems.forEach(item => {
                            if (item.market_vendor && item.market_delivery_time_hours) {
                              const vendorId = item.market_vendor.id;
                              if (!vendorDeliveryInfo.has(vendorId)) {
                                vendorDeliveryInfo.set(vendorId, {
                                  vendorName: item.market_vendor.business_name,
                                  deliveryTime: item.market_delivery_time_hours,
                                  items: []
                                });
                              }
                              vendorDeliveryInfo.get(vendorId).items.push(item.market_product_name || item.product_name);
                            }
                          });
                          
                          if (vendorDeliveryInfo.size > 0) {
                            return (
                              <div className="mt-4 bg-purple-50 rounded-lg p-4 border border-purple-200">
                                <h5 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Marketplace Vendor Delivery Times
                                </h5>
                                <div className="space-y-2">
                                  {Array.from(vendorDeliveryInfo.entries()).map(([vendorId, info]) => (
                                    <div key={vendorId} className="flex justify-between items-center text-sm">
                                      <span className="font-medium text-purple-800">{info.vendorName}</span>
                                      <span className="text-purple-700">{info.deliveryTime}h delivery</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Marketplace Delivery Tracking - Show detailed tracking for marketplace products */}
                    {(() => {
                      const marketplaceItems = order.order_items?.filter(item => item.product_type === 'marketplace') || [];
                      const deliveryEstimate = getMarketplaceDeliveryEstimate(order);
                      
                      if (marketplaceItems.length > 0 && currentStatus.toLowerCase() !== 'cancelled') {
                        return (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Clock className="h-5 w-5 text-purple-600" />
                              Marketplace Product Tracking
                            </h4>
                            
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                              {/* Delivery Estimate */}
                              {deliveryEstimate && (
                                <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      {/* <p className="text-sm font-semibold text-purple-900">Estimated Delivery</p> */}
                                      <p className="text-lg font-bold text-purple-700">{deliveryEstimate.formattedDate}</p>
                                      <p className="text-xs text-purple-600">Within {deliveryEstimate.maxHours} hours from order</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="bg-purple-100 p-2 rounded-full">
                                        <Timer className="h-6 w-6 text-purple-600" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Vendor Breakdown */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-purple-900">Vendor Delivery Details</h5>
                                {(() => {
                                  const vendorGroups = new Map();
                                  
                                  marketplaceItems.forEach(item => {
                                    if (item.market_vendor) {
                                      const vendorId = item.market_vendor.id;
                                      if (!vendorGroups.has(vendorId)) {
                                        vendorGroups.set(vendorId, {
                                          vendor: item.market_vendor,
                                          deliveryTime: item.market_delivery_time_hours || 0,
                                          items: [],
                                          totalValue: 0
                                        });
                                      }
                                      const group = vendorGroups.get(vendorId);
                                      group.items.push({
                                        name: item.market_product_name || item.product_name,
                                        quantity: item.quantity,
                                        price: item.line_total
                                      });
                                      group.totalValue += item.line_total;
                                    }
                                  });
                                  
                                  return Array.from(vendorGroups.values()).map((group, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-semibold text-purple-900">{group.vendor.business_name}</p>
                                          <p className="text-xs text-purple-700 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {group.deliveryTime}h delivery time
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-purple-800">₹{group.totalValue}</p>
                                          <p className="text-xs text-purple-600">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        {group.items.map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between items-center text-xs text-purple-700">
                                            <span>{item.name} (×{item.quantity})</span>
                                            <span>₹{item.price}</span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {/* Status indicator for this vendor */}
                                      <div className="mt-2 pt-2 border-t border-purple-200">
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            currentStatus.toLowerCase() === 'delivered' ? "bg-green-500" :
                                            ['out_for_delivery', 'picked_up'].includes(currentStatus.toLowerCase()) ? "bg-blue-500" :
                                            "bg-amber-500"
                                          )}></div>
                                          <span className="text-xs font-medium text-purple-800">
                                            {currentStatus.toLowerCase() === 'delivered' ? 'Delivered' :
                                             ['out_for_delivery', 'picked_up'].includes(currentStatus.toLowerCase()) ? 'In Transit' :
                                             'Processing'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const marketplaceItems = order.order_items?.filter(item => item.product_type === 'marketplace') || [];
                      const deliveryEstimate = getMarketplaceDeliveryEstimate(order);
                      
                      if (marketplaceItems.length > 0 && currentStatus.toLowerCase() !== 'cancelled') {
                        return (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Clock className="h-5 w-5 text-purple-600" />
                              Marketplace Product Tracking
                            </h4>
                            
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                              {/* Delivery Estimate */}
                              {deliveryEstimate && (
                                <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-purple-900">Estimated Delivery</p>
                                      <p className="text-lg font-bold text-purple-700">{deliveryEstimate.formattedDate}</p>
                                      <p className="text-xs text-purple-600">Within {deliveryEstimate.maxHours} hours from order</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="bg-purple-100 p-2 rounded-full">
                                        <Timer className="h-6 w-6 text-purple-600" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Vendor Breakdown */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-purple-900">Vendor Delivery Details</h5>
                                {(() => {
                                  const vendorGroups = new Map();
                                  
                                  marketplaceItems.forEach(item => {
                                    if (item.market_vendor) {
                                      const vendorId = item.market_vendor.id;
                                      if (!vendorGroups.has(vendorId)) {
                                        vendorGroups.set(vendorId, {
                                          vendor: item.market_vendor,
                                          deliveryTime: item.market_delivery_time_hours || 0,
                                          items: [],
                                          totalValue: 0
                                        });
                                      }
                                      const group = vendorGroups.get(vendorId);
                                      group.items.push({
                                        name: item.market_product_name || item.product_name,
                                        quantity: item.quantity,
                                        price: item.line_total
                                      });
                                      group.totalValue += item.line_total;
                                    }
                                  });
                                  
                                  return Array.from(vendorGroups.values()).map((group, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-semibold text-purple-900">{group.vendor.business_name}</p>
                                          <p className="text-xs text-purple-700 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {group.deliveryTime}h delivery time
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-purple-800">₹{group.totalValue}</p>
                                          <p className="text-xs text-purple-600">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        {group.items.map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between items-center text-xs text-purple-700">
                                            <span>{item.name} (×{item.quantity})</span>
                                            <span>₹{item.price}</span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      {/* Status indicator for this vendor */}
                                      <div className="mt-2 pt-2 border-t border-purple-200">
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            currentStatus.toLowerCase() === 'delivered' ? "bg-green-500" :
                                            ['out_for_delivery', 'picked_up'].includes(currentStatus.toLowerCase()) ? "bg-blue-500" :
                                            "bg-amber-500"
                                          )}></div>
                                          <span className="text-xs font-medium text-purple-800">
                                            {currentStatus.toLowerCase() === 'delivered' ? 'Delivered' :
                                             ['out_for_delivery', 'picked_up'].includes(currentStatus.toLowerCase()) ? 'In Transit' :
                                             'Processing'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Order Items */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          Order Items ({totalItems} items)
                        </h4>
                        {/* Product Type Summary */}
                        <div className="flex gap-2 text-xs">
                          {(() => {
                            const existingCount = order.order_items?.filter(item => item.product_type !== 'marketplace').length || 0;
                            const marketplaceCount = order.order_items?.filter(item => item.product_type === 'marketplace').length || 0;
                            return (
                              <>
                                {existingCount > 0 && (
                                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                    🏬 {existingCount} Store
                                  </Badge>
                                )}
                                {marketplaceCount > 0 && (
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                    🏪 {marketplaceCount} Marketplace
                                  </Badge>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {order.order_items?.slice(0, isExpanded ? order.order_items.length : 2).map((item, index) => {
                          const isMarketplace = item.product_type === 'marketplace';
                          const productName = isMarketplace ? item.market_product_name : item.product_name;
                          const vendorName = isMarketplace ? item.market_vendor?.business_name : item.vendor?.business_name;
                          const productImage = isMarketplace && item.market_product_images?.length ? item.market_product_images[0] : null;
                          
                          return (
                            <div key={item.id || index} className={cn(
                              "rounded-lg p-4 border",
                              isMarketplace 
                                ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200" 
                                : "bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200"
                            )}>
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex gap-3 flex-1 min-w-0">
                                  {/* Product Image for Marketplace Products */}
                                  {isMarketplace && productImage && (
                                    <div className="flex-shrink-0">
                                      <img 
                                        src={productImage} 
                                        alt={productName || 'Product'} 
                                        className="w-16 h-16 object-cover rounded-lg border"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-1">
                                      <p className="font-semibold text-gray-900 text-lg flex-1">
                                        {productName || 'Product Name Missing'}
                                      </p>
                                      {/* Product Type Indicator */}
                                      <Badge className={cn(
                                        "text-xs font-medium shrink-0",
                                        isMarketplace 
                                          ? "bg-purple-100 text-purple-800 border-purple-200" 
                                          : "bg-gray-100 text-gray-800 border-gray-200"
                                      )}>
                                        {isMarketplace ? '🏪 Marketplace' : '🏬 Store'}
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 mt-1">
                                      by <span className="font-medium">{vendorName || 'Vendor Info Missing'}</span>
                                    </p>
                                    
                                    {/* Marketplace-specific information */}
                                    {isMarketplace && (
                                      <div className="mt-2 space-y-1">
                                        {item.market_product_brand && (
                                          <p className="text-xs text-purple-700">
                                            <span className="font-medium">Brand:</span> {item.market_product_brand}
                                          </p>
                                        )}
                                        {item.market_product_category && (
                                          <p className="text-xs text-purple-700">
                                            <span className="font-medium">Category:</span> {item.market_product_category}
                                          </p>
                                        )}
                                        {item.market_delivery_time_hours && (
                                          <p className="text-xs text-purple-700 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span className="font-medium">Delivery:</span> {item.market_delivery_time_hours}h
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className={cn("text-xs font-medium", getStatusColor(item.item_status || currentStatus))}>
                                        {(item.item_status || currentStatus).replace('_', ' ').toUpperCase()}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right shrink-0">
                                  <p className="text-sm text-gray-600">Qty: <span className="font-bold">{item.quantity}</span></p>
                                  <p className="text-sm text-gray-600">₹{item.unit_price} each</p>
                                  <p className="text-lg font-bold text-blue-600">₹{item.line_total}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {order.order_items && order.order_items.length > 2 && !isExpanded && (
                          <div className="text-center">
                            <Button
                              variant="outline"
                              onClick={() => toggleOrderExpansion(order.id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              View {order.order_items.length - 2} more items
                              <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Partner Info */}
                    {order.delivery_partner_name && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-600" />
                          Delivery Partner
                        </h4>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold text-gray-900">{order.delivery_partner_name}</p>
                              {order.delivery_partner_phone && (
                                <p className="text-gray-700 flex items-center gap-2 mt-1">
                                  <Phone className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">{order.delivery_partner_phone}</span>
                                </p>
                              )}
                              {order.delivery_assigned_at && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Assigned {formatTimeAgo(order.delivery_assigned_at)}
                                </p>
                              )}
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                              <User className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Slot Information */}
                    {order.slot_info && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600" />
                          Delivery Slot
                        </h4>
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-semibold text-lg text-purple-700 mb-1">{order.slot_info.slot_name}</h5>
                              <p className="text-gray-700 text-lg">
                                <span className="font-bold">📅 {order.slot_info.delivery_window}</span>
                              </p>
                              {order.sector_info && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <MapPin className="h-4 w-4 inline mr-1" />
                                  Sector: {order.sector_info.sector_name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="text-sm text-gray-600">Delivery Window</p>
                                <p className="text-xl font-bold text-purple-600">{order.slot_info.delivery_window}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Cut-off: {order.slot_info.cutoff_time}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Order Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Order ID</span>
                            <span className="font-bold text-gray-900">{order.order_number}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Payment Method</span>
                            <span className="font-bold text-gray-900">COD</span>
                            {/* {order.payment_method} */}
                          </div>
                        </div>
                        <div className="space-y-3"> 
                          {/* <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Estimated Delivery</span>
                            <span className="font-bold text-gray-900">2-3 hours</span>
                          </div> */}
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Order Date</span>
                            <span className="font-bold text-gray-900">{formatEstimatedDelivery(order.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.delivery_address && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          Delivery Address
                        </h4>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          {typeof order.delivery_address === 'string' ? (
                            <p className="text-gray-700">{order.delivery_address}</p>
                          ) : (
                            <>
                              <p className="font-bold text-gray-900 text-lg">{order.delivery_address.recipient_name}</p>
                              <p className="text-gray-700 font-medium">{order.delivery_address.phone}</p>
                              <p className="text-gray-700 mt-2">
                                {order.delivery_address.address_line_1}
                                {order.delivery_address.address_line_2 && `, ${order.delivery_address.address_line_2}`}
                              </p>
                              <p className="text-gray-700">
                                {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      {/* Cancel Order Button */}
                      {canCancelOrder(order) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelOrderClick(order)}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel Order
                        </Button>
                      )}
                      
                      {/* Expand/Collapse Button */}
                      {order.order_items && order.order_items.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOrderExpansion(order.id)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          {isExpanded ? (
                            <>
                              Show Less
                              <ChevronUp className="ml-1 h-4 w-4" />
                            </>
                          ) : (
                            <>
                              View All Details
                              <ChevronDown className="ml-1 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Customer Order Cancellation Modal */}
      {selectedOrderForCancel && (
        <CustomerOrderCancellationModal
          isOpen={cancelModalOpen}
          onClose={handleCancelModalClose}
          orderId={selectedOrderForCancel.id}
          orderNumber={selectedOrderForCancel.order_number}
          totalAmount={selectedOrderForCancel.total_amount}
          orderStatus={selectedOrderForCancel.order_status}
          onCancel={handleOrderCancellation}
        />
      )}
    </div>
  );
};

export default MyOrders;

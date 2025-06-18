import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Eye, Filter, Search, Truck, Clock, CheckCircle, X, AlertCircle, 
  User, Phone, MapPin, Copy, Shield, Navigation, Timer, RefreshCw, XCircle, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderTracking from '@/components/customer/OrderTracking';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { OrderAPI } from '@/lib/api';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  estimated_delivery_date: string;
  created_at: string;
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
  vendor: {
    id: string;
    business_name: string;
    contact_phone?: string;
    business_city?: string;
    business_state?: string;
  };
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
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState<Order | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  // Real-time order updates subscription
  useEffect(() => {
    if (!user || !profile) return;

    let unsubscribe: (() => void) | null = null;

    const setupRealTimeUpdates = async () => {
      try {
        // Get customer ID
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (customer) {
          // Subscribe to real-time updates
          unsubscribe = OrderAPI.subscribeToOrderUpdates(customer.id, (payload) => {
            console.log('Real-time order update:', payload);
            // Refresh orders when any update is received
            loadOrders();
            
            // Show toast notification for status changes
            if (payload.eventType === 'UPDATE' && payload.new?.order_status !== payload.old?.order_status) {
              toast({
                title: "Order Status Updated",
                description: `Order #${payload.new?.order_number} status changed to ${payload.new?.order_status}`,
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to setup real-time updates:', error);
      }
    };

    setupRealTimeUpdates();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, profile]);

  const loadOrders = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!customer) {
        setOrders([]);
        return;
      }

      // Use the new OrderAPI to get customer orders with proper tracking
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

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items.some(item =>
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': 
      case 'assigned_to_delivery': return 'bg-purple-100 text-purple-800';
      case 'packed': 
      case 'picked_up': return 'bg-orange-100 text-orange-800';
      case 'shipped': 
      case 'out_for_delivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'returned': return 'bg-gray-100 text-gray-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getDeliveryProgress = (order: Order) => {
    return OrderAPI.getDeliveryProgress(order);
  };

  const getDeliveryStatusSteps = (order: Order) => {
    const steps = [
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'assigned_to_delivery', label: 'Assigned', icon: Navigation },
      { key: 'picked_up', label: 'Picked Up', icon: Package },
      { key: 'out_for_delivery', label: 'In Transit', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const currentStatus = order.current_delivery_status || order.order_status;
    const currentIndex = steps.findIndex(step => step.key === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    setShowTrackingModal(true);
  };

  const showOtpDetails = (order: Order) => {
    setSelectedOrderForOtp(order);
    setShowOtpDialog(true);
  };

  const handleCancelOrder = (order: Order) => {
    setSelectedOrderForAction(order);
    setShowCancelDialog(true);
    setActionReason('');
  };

  const handleRequestReturn = (order: Order) => {
    setSelectedOrderForAction(order);
    setShowReturnDialog(true);
    setActionReason('');
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrderForAction || !actionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a cancellation reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const result = await OrderAPI.cancelOrder(selectedOrderForAction.id, actionReason);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Order cancelled successfully",
        });
        setShowCancelDialog(false);
        setSelectedOrderForAction(null);
        setActionReason('');
        loadOrders(); // Refresh orders
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRequestReturn = async () => {
    if (!selectedOrderForAction || !actionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a return reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      const result = await OrderAPI.requestReturn(selectedOrderForAction.id, actionReason);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Return request submitted successfully",
        });
        setShowReturnDialog(false);
        setSelectedOrderForAction(null);
        setActionReason('');
        loadOrders(); // Refresh orders
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to request return",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request return",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const canCancelOrder = (order: Order) => {
    return order.order_status === 'pending' || order.order_status === 'confirmed';
  };

  const canRequestReturn = (order: Order) => {
    return order.order_status === 'delivered';
  };

  // Real-time refresh for order status
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && orders.length > 0) {
        loadOrders();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loading, orders.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track your orders and delivery status</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">You haven't placed any orders yet</p>
              <Button onClick={() => navigate('/')}>
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-semibold">#{order.order_number}</h3>
                        <Badge className={getStatusColor(order.current_delivery_status || order.order_status)}>
                          {getStatusIcon(order.current_delivery_status || order.order_status)}
                          <span className="ml-1">{(order.current_delivery_status || order.order_status).replace('_', ' ').toUpperCase()}</span>
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(order.payment_status)}>
                          {order.payment_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>₹{order.total_amount.toLocaleString()}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(order.created_at)}</span>
                        <span>•</span>
                        <span>{order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 lg:mt-0 flex-wrap">
                      <Button variant="outline" onClick={() => handleViewOrder(order)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                      {(order.pickup_otp || order.delivery_otp) && (
                        <Button variant="outline" onClick={() => showOtpDetails(order)}>
                          <Shield className="h-4 w-4 mr-2" />
                          View OTP
                        </Button>
                      )}
                      {canCancelOrder(order) && (
                        <Button variant="outline" onClick={() => handleCancelOrder(order)} className="text-red-600 hover:text-red-700">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                      {canRequestReturn(order) && (
                        <Button variant="outline" onClick={() => handleRequestReturn(order)} className="text-orange-600 hover:text-orange-700">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Return
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Progress */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Delivery Progress</span>
                      <span className="text-sm text-gray-600">{getDeliveryProgress(order)}%</span>
                    </div>
                    <Progress value={getDeliveryProgress(order)} className="h-2 mb-4" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {getDeliveryStatusSteps(order).map((step, index) => (
                        <div 
                          key={step.key}
                          className={`text-center p-2 rounded-lg text-xs ${
                            step.completed 
                              ? step.active 
                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                                : 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <step.icon className="h-4 w-4 mx-auto mb-1" />
                          <div className="font-medium">{step.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Partner Info */}
                  {order.delivery_partner_name && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <Truck className="h-4 w-4 mr-2" />
                        Delivery Partner
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>{order.delivery_partner_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span>{order.delivery_partner_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>Assigned {formatTimeAgo(order.delivery_assigned_at || '')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Order Items</h4>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h5 className="font-medium">{item.product_name}</h5>
                          <p className="text-sm text-gray-600">by {item.vendor.business_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span>Qty: {item.quantity}</span>
                            <span>₹{item.unit_price.toLocaleString()} each</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{item.line_total.toLocaleString()}</div>
                          <Badge variant="outline" className={getStatusColor(item.item_status)}>
                            {item.item_status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Address */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium flex items-center mb-2">
                      <MapPin className="h-4 w-4 mr-2" />
                      Delivery Address
                    </h4>
                    <p className="text-sm text-gray-600">
                      {order.delivery_address?.address_line1}
                      {order.delivery_address?.address_line2 && `, ${order.delivery_address.address_line2}`}
                      <br />
                      {order.delivery_address?.city}, {order.delivery_address?.state} - {order.delivery_address?.pincode}
                    </p>
                  </div>

                  {/* Cancellation Info */}
                  {order.cancellation_reason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <h4 className="font-medium flex items-center mb-2 text-red-800">
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancellation Details
                      </h4>
                      <p className="text-sm text-red-700">
                        <strong>Reason:</strong> {order.cancellation_reason}
                      </p>
                      {order.cancelled_date && (
                        <p className="text-sm text-red-700">
                          <strong>Cancelled on:</strong> {new Date(order.cancelled_date).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Tracking Modal */}
        <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Order Tracking - #{selectedOrder?.order_number}
              </DialogTitle>
              <DialogDescription>
                Track your order's journey from confirmation to delivery
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <OrderTracking 
                orderId={selectedOrder.id}
                orderNumber={selectedOrder.order_number}
                currentStatus={selectedOrder.current_delivery_status || selectedOrder.order_status}
                itemStatus={selectedOrder.order_items[0]?.item_status || selectedOrder.order_status}
                estimatedDelivery={new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('en-IN')}
                vendor={selectedOrder.order_items[0]?.vendor.business_name || 'Unknown'}
                vendorId={selectedOrder.order_items[0]?.vendor.id}
                createdAt={selectedOrder.created_at}
                confirmedAt={selectedOrder.order_status !== 'pending' ? selectedOrder.created_at : undefined}
                pickedUpAt={selectedOrder.picked_up_date}
                shippedAt={selectedOrder.out_for_delivery_date}
                deliveredAt={selectedOrder.actual_delivery_date}
                pickupConfirmedBy={selectedOrder.delivery_partner_name}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* OTP Display Dialog */}
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Order OTP Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedOrderForOtp && (
                <>
                  <div className="text-center">
                    <h3 className="font-semibold mb-4">#{selectedOrderForOtp.order_number}</h3>
                    
                    {selectedOrderForOtp.pickup_otp && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Pickup OTP</h4>
                        <div className="text-2xl font-bold text-blue-600 bg-blue-50 rounded-lg p-3 mb-2">
                          {selectedOrderForOtp.pickup_otp}
                        </div>
                        <p className="text-xs text-gray-500">
                          This OTP will be used by the delivery partner to confirm pickup from vendor
                        </p>
                      </div>
                    )}
                    
                    {selectedOrderForOtp.delivery_otp && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">🚚 Delivery Verification OTP</h4>
                        <div className="text-3xl font-bold text-green-600 bg-green-50 rounded-lg p-4 mb-3 border-2 border-green-200">
                          {selectedOrderForOtp.delivery_otp}
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                          <p className="text-sm text-yellow-800 font-medium mb-1">
                            📝 Important: Give this OTP to the delivery boy
                          </p>
                          <p className="text-xs text-yellow-700">
                            • The delivery partner will enter this OTP to mark your order as delivered
                          </p>
                          <p className="text-xs text-yellow-700">
                            • Only share this OTP when you receive your order
                          </p>
                          <p className="text-xs text-yellow-700">
                            • Keep this OTP safe until delivery is complete
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedOrderForOtp.delivery_partner_name && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm space-y-1">
                        <div><strong>Delivery Partner:</strong> {selectedOrderForOtp.delivery_partner_name}</div>
                        <div><strong>Phone:</strong> {selectedOrderForOtp.delivery_partner_phone}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {selectedOrderForOtp.pickup_otp && (
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrderForOtp.pickup_otp || '');
                          toast({ title: "Pickup OTP copied to clipboard" });
                        }}
                        className="flex-1"
                        variant="outline"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Pickup OTP
                      </Button>
                    )}
                    {selectedOrderForOtp.delivery_otp && (
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrderForOtp.delivery_otp || '');
                          toast({ title: "Delivery OTP copied to clipboard" });
                        }}
                        className="flex-1"
                        variant="outline"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Delivery OTP
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Order Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Please provide a reason for cancelling this order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter cancellation reason..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmCancelOrder}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex-1"
                  variant="destructive"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Return Request Dialog */}
        <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Return</DialogTitle>
              <DialogDescription>
                Please provide a reason for returning this order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter return reason..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReturnDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmRequestReturn}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex-1"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      
      <Footer />
    </div>
  );
};

export default MyOrders; 
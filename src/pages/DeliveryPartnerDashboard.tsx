import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, CheckCircle, Clock, Settings, Bell, Timer, 
  Check, X, RefreshCw, MapPin, Phone, User, Navigation, 
  Truck, Activity, Target, AlertCircle, Eye, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import MobileBottomNav from '@/components/MobileBottomNav';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { useLocationTracking } from '@/hooks/useLocationTracking';

interface AvailableOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  delivery_address: any;
  total_amount: number;
  item_count: number;
  created_at: string;
  pickup_otp?: string;
  delivery_otp?: string;
  distance_km?: number;
  estimated_time_mins?: number;
  order_age_hours: number;
  priority: 'OLD' | 'NORMAL';
}

interface MyOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  delivery_address: any;
  total_amount: number;
  item_count: number;
  status: 'accepted' | 'picked_up' | 'delivered';
  accepted_at: string;
  pickup_otp: string;
  delivery_otp: string;
  picked_up_at?: string;
  delivered_at?: string;
}

interface DeliveryStats {
  todayDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  totalDeliveries: number;
  status: 'available' | 'busy';
  activeOrders: number;
}

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    todayDeliveries: 0,
    totalEarnings: 0,
    averageRating: 4.8,
    totalDeliveries: 0,
    status: 'available',
    activeOrders: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | MyOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpAction, setOtpAction] = useState<'pickup' | 'delivery' | null>(null);

  // Real-time refresh every 15 seconds for available orders
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loading]);

  // Initial data load
  useEffect(() => {
    if (profile?.role === 'delivery_boy') {
      loadInitialData();
    }
  }, [profile]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAvailableOrders(),
        loadMyOrders(),
        loadDeliveryStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadAvailableOrders(),
        loadMyOrders(),
        loadDeliveryStats()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAvailableOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_available_orders_view')
        .select(`
          order_id,
          order_number,
          customer_id,
          customer_name,
          customer_phone,
          vendor_id,
          vendor_name,
          vendor_phone,
          vendor_address,
          delivery_address,
          total_amount,
          item_count,
          created_at,
          pickup_otp,
          delivery_otp,
          distance_km,
          estimated_time_mins
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate order age and priority
      const ordersWithPriority = (data || []).map(order => {
        const createdAt = new Date(order.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        return {
          ...order,
          order_age_hours: Math.round(hoursDiff * 10) / 10,
          priority: hoursDiff > 1 ? 'OLD' as const : 'NORMAL' as const
        };
      });

      setAvailableOrders(ordersWithPriority);
    } catch (error) {
      console.error('Error loading available orders:', error);
    }
  };

  const loadMyOrders = async () => {
    try {
      // First get the delivery partner record using profile_id
      const { data: deliveryPartner, error: dpError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (dpError) {
        console.error('Error finding delivery partner:', dpError);
        return;
      }

      if (!deliveryPartner) {
        console.error('No delivery partner found for profile:', profile?.id);
        return;
      }

      const { data, error } = await supabase
        .from('delivery_partner_orders_view')
        .select(`
          order_id,
          order_number,
          customer_name,
          customer_phone,
          vendor_name,
          vendor_phone,
          vendor_address,
          delivery_address,
          total_amount,
          item_count,
          status,
          accepted_at,
          pickup_otp,
          delivery_otp,
          picked_up_at,
          delivered_at
        `)
        .eq('delivery_partner_id', deliveryPartner.id)
        .in('status', ['accepted', 'picked_up'])
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      setMyOrders(data || []);
    } catch (error) {
      console.error('Error loading my orders:', error);
    }
  };

  const loadDeliveryStats = async () => {
    try {
      // First get the delivery partner record using profile_id
      const { data: deliveryPartner, error: dpError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (dpError) {
        console.error('Error finding delivery partner:', dpError);
        return;
      }

      if (!deliveryPartner) {
        console.error('No delivery partner found for profile:', profile?.id);
        return;
      }

      // Now get the stats using delivery_partner_id
      const { data, error } = await supabase
        .from('delivery_partner_stats')
        .select('*')
        .eq('delivery_partner_id', deliveryPartner.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStats(prevStats => ({
          ...prevStats,
          ...data,
          status: data.active_orders > 0 ? 'busy' : 'available'
        }));
      }
    } catch (error) {
      console.error('Error loading delivery stats:', error);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      // First get the delivery partner record using profile_id
      const { data: deliveryPartner, error: dpError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (dpError) {
        console.error('Error finding delivery partner:', dpError);
        toast.error('Error finding delivery partner profile');
        return;
      }

      if (!deliveryPartner) {
        console.error('No delivery partner found for profile:', profile?.id);
        toast.error('Delivery partner profile not found');
        return;
      }

      const { error } = await supabase.rpc('accept_delivery_order', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartner.id
      });

      if (error) throw error;

      toast.success('Order accepted successfully!');
      await refreshData();
      
      // Switch to My Orders tab
      setActiveTab('my-orders');
    } catch (error: any) {
      console.error('Error accepting order:', error);
      toast.error(error.message || 'Failed to accept order');
    }
  };

  const handleMarkPickedUp = async (orderId: string, otp?: string) => {
    try {
      // First get the delivery partner record using profile_id
      const { data: deliveryPartner, error: dpError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (dpError || !deliveryPartner) {
        toast.error('Error finding delivery partner profile');
        return;
      }

      const { error } = await supabase.rpc('mark_order_picked_up', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartner.id,
        p_pickup_otp: otp
      });

      if (error) throw error;

      toast.success('Order marked as picked up!');
      setOtpInput('');
      setOtpAction(null);
      await refreshData();
    } catch (error: any) {
      console.error('Error marking picked up:', error);
      toast.error(error.message || 'Failed to mark as picked up');
    }
  };

  const handleMarkDelivered = async (orderId: string, otp?: string) => {
    try {
      // First get the delivery partner record using profile_id
      const { data: deliveryPartner, error: dpError } = await supabase
        .from('delivery_partners')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (dpError || !deliveryPartner) {
        toast.error('Error finding delivery partner profile');
        return;
      }

      const { error } = await supabase.rpc('mark_order_delivered', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartner.id,
        p_delivery_otp: otp
      });

      if (error) throw error;

      toast.success('Order delivered successfully!');
      setOtpInput('');
      setOtpAction(null);
      await refreshData();
    } catch (error: any) {
      console.error('Error marking delivered:', error);
      toast.error(error.message || 'Failed to mark as delivered');
    }
  };

  const handleOTPSubmit = () => {
    if (!selectedOrder || !otpAction) return;

    if (otpAction === 'pickup') {
      handleMarkPickedUp(selectedOrder.order_id, otpInput);
    } else if (otpAction === 'delivery') {
      handleMarkDelivered(selectedOrder.order_id, otpInput);
    }
  };

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address;
    if (!address) return 'Address not available';
    
    const { address_line1, address_line2, city, state, pincode } = address;
    return `${address_line1}${address_line2 ? ', ' + address_line2 : ''}, ${city}, ${state} - ${pincode}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'OLD' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (profile?.role !== 'delivery_boy') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You need delivery partner access to view this page.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <div className="container mx-auto px-4 py-6 pb-20">
        {/* Status Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delivery Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {profile?.full_name || 'Delivery Partner'}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stats.status === 'available' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                <Activity className="w-4 h-4 mr-1" />
                {stats.status === 'available' ? 'Available' : 'Busy'}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {stats.activeOrders} active orders
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayDeliveries}</p>
                    <p className="text-sm text-gray-600">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
                    <p className="text-sm text-gray-600">Earnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalDeliveries}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                    <p className="text-sm text-gray-600">Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available" className="flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Available ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my-orders" className="flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              My Orders ({myOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Available Orders Tab */}
          <TabsContent value="available" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Available Orders</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {availableOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Available</h3>
                  <p className="text-gray-600">
                    Check back later for new delivery opportunities
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <Card key={order.order_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center mb-2">
                            <h3 className="font-semibold text-gray-900 mr-2">
                              #{order.order_number}
                            </h3>
                            <Badge className={getPriorityColor(order.priority)}>
                              {order.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.order_age_hours}h ago • {order.item_count} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                          {order.distance_km && (
                            <p className="text-sm text-gray-600">
                              {order.distance_km}km • {order.estimated_time_mins}min
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">{order.vendor_name}</p>
                            <p className="text-sm text-gray-600">{order.vendor_address}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Delivery</p>
                            <p className="text-sm text-gray-600">{order.customer_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatAddress(order.delivery_address)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptOrder(order.order_id)}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept Order
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="my-orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Orders</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {myOrders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
                  <p className="text-gray-600">
                    Accept orders from the Available tab to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <Card key={order.order_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center mb-2">
                            <h3 className="font-semibold text-gray-900 mr-2">
                              #{order.order_number}
                            </h3>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.item_count} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">{order.vendor_name}</p>
                            <p className="text-sm text-gray-600">{order.vendor_address}</p>
                            <p className="text-sm text-gray-600">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {order.vendor_phone}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Delivery</p>
                            <p className="text-sm text-gray-600">{order.customer_name}</p>
                            <p className="text-sm text-gray-600">
                              {formatAddress(order.delivery_address)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <Phone className="w-3 h-3 inline mr-1" />
                              {order.customer_phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'accepted' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setOtpAction('pickup');
                              setShowOrderDetails(true);
                            }}
                            className="flex-1"
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Picked Up
                          </Button>
                        )}
                        
                        {order.status === 'picked_up' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setOtpAction('delivery');
                              setShowOrderDetails(true);
                            }}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Delivered
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Order Details - #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Customer</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {selectedOrder.customer_phone}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatAddress(selectedOrder.delivery_address)}
                  </p>
                </div>
              </div>

              {/* Vendor Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Pickup From</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{selectedOrder.vendor_name}</p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {selectedOrder.vendor_phone}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedOrder.vendor_address}
                  </p>
                </div>
              </div>

              {/* OTP Section */}
              {otpAction && 'pickup_otp' in selectedOrder && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {otpAction === 'pickup' ? 'Pickup OTP' : 'Delivery OTP'}
                  </h4>
                  <div className="bg-blue-50 p-3 rounded-lg mb-3">
                    <p className="text-sm text-blue-600 mb-2">
                      {otpAction === 'pickup' 
                        ? 'Enter the OTP provided by the vendor'
                        : 'Enter the OTP provided by the customer'
                      }
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        maxLength={6}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const otp = otpAction === 'pickup' 
                            ? selectedOrder.pickup_otp 
                            : selectedOrder.delivery_otp;
                          navigator.clipboard.writeText(otp);
                          toast.success('OTP copied to clipboard');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleOTPSubmit}
                    disabled={!otpInput || otpInput.length < 4}
                    className="w-full"
                  >
                    {otpAction === 'pickup' ? 'Confirm Pickup' : 'Confirm Delivery'}
                  </Button>
                </div>
              )}

              {/* Order Summary */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span>Items: {selectedOrder.item_count}</span>
                    <span className="font-medium">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default DeliveryPartnerDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, MapPin, Star, Clock, Check, X, 
  RefreshCw, Phone, Navigation, AlertTriangle, CheckCircle,
  Key, DollarSign, Target, Truck, User, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DeliveryAPI, AvailableOrder, MyOrder, DeliveryStats } from '@/lib/deliveryApi';


interface DeliveryPartner {
  id: string;
  profile_id: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  current_latitude: number | null;
  current_longitude: number | null;
  assigned_pincodes: string[];
}

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MyOrder | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpType, setOtpType] = useState<'pickup' | 'delivery'>('pickup');
  const [error, setError] = useState<string | null>(null);

  // Initialize delivery partner dashboard
  useEffect(() => {
    if (user && profile?.role === 'delivery_partner') {
      initializeDeliveryPartnerDashboard();
    }
  }, [user, profile]);

  // Real-time refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && deliveryPartner) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, deliveryPartner]);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Update location in database if delivery partner exists
          if (deliveryPartner) {
            updateLocationInDatabase(location);
          }
        },
        (error) => {
          console.warn('Location access denied:', error);
        }
      );
    }
  }, [deliveryPartner]);

  const initializeDeliveryPartnerDashboard = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch delivery partner data
      const deliveryPartnerData = await fetchDeliveryPartnerByProfileId(profile!.id);
      
      if (!deliveryPartnerData) {
        setError('Delivery partner account not found. Please contact support.');
        return;
      }

      setDeliveryPartner(deliveryPartnerData);
      setIsAvailable(deliveryPartnerData.is_available);

      // Load dashboard data
      await Promise.allSettled([
        loadAvailableOrders(),
        loadMyOrders(deliveryPartnerData.id),
        loadStats(deliveryPartnerData.id)
      ]);

    } catch (error) {
      console.error('Error initializing delivery partner dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartnerByProfileId = async (profileId: string): Promise<DeliveryPartner | null> => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No delivery partner record found
          console.log('🚚 No delivery partner record found for profile:', profileId);
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching delivery partner:', error);
      return null;
    }
  };

  const loadAvailableOrders = async () => {
    try {
      if (!deliveryPartner) return;
      console.log('🎯 Loading available orders for delivery partner:', deliveryPartner.id);
      const result = await DeliveryAPI.getAvailableOrdersForDeliveryPartner(deliveryPartner.id);
      console.log('🎯 Available orders result:', result);
      if (result.success) {
        setAvailableOrders(result.data || []);
      }
    } catch (error) {
      console.error('Error loading available orders:', error);
    }
  };

  const loadMyOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('🎯 DeliveryPartnerDashboard.loadMyOrders called with deliveryPartnerId:', deliveryPartnerId);
      const result = await DeliveryAPI.getMyOrders(deliveryPartnerId);
      console.log('🎯 DeliveryAPI.getMyOrders result:', result);
      if (result.success) {
        console.log('🎯 Setting myOrders state to:', result.data);
        setMyOrders(result.data || []);
      } else {
        console.error('🎯 DeliveryAPI.getMyOrders failed:', result.error);
      }
    } catch (error) {
      console.error('🎯 Error loading my orders:', error);
    }
  };

  const loadStats = async (deliveryPartnerId: string) => {
    try {
      const result = await DeliveryAPI.getDeliveryStats(deliveryPartnerId);
      if (result.success) {
        setStats(result.data || null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshData = useCallback(async () => {
    if (!deliveryPartner) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadAvailableOrders(),
        loadMyOrders(deliveryPartner.id),
        loadStats(deliveryPartner.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [deliveryPartner]);

  const handleAutoAssignOrders = async () => {
    try {
      setRefreshing(true);
      const result = await DeliveryAPI.autoAssignAvailableOrders();
      
      if (result.success) {
        toast.success(result.message || 'Orders assigned successfully');
        await refreshData(); // Refresh data to show newly assigned orders
      } else {
        toast.error(result.error || 'Failed to assign orders');
      }
    } catch (error) {
      console.error('Error auto-assigning orders:', error);
      toast.error('Failed to assign orders');
    } finally {
      setRefreshing(false);
    }
  };

  const updateLocationInDatabase = async (location: { lat: number; lng: number }) => {
    if (!deliveryPartner) return;
    
    try {
      await DeliveryAPI.updateLocation(deliveryPartner.id, location.lat, location.lng);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!deliveryPartner) return;

    try {
      console.log('🎯 Attempting to accept order:', { orderId, deliveryPartnerId: deliveryPartner.id });
      const result = await DeliveryAPI.acceptOrder(orderId, deliveryPartner.id);
      console.log('🎯 Accept order result:', result);
      
      if (result.success) {
        toast.success('Order accepted successfully!');
        console.log('🎯 Refreshing data after successful accept');
        await refreshData();
      } else {
        console.error('🎯 Accept order failed:', result.error);
        toast.error(result.error || 'Failed to accept order');
      }
    } catch (error: any) {
      console.error('🎯 Accept order error:', error);
      toast.error(`Error accepting order: ${error.message}`);
    }
  };

  const handleUpdateAvailability = async (available: boolean) => {
    if (!deliveryPartner) return;

    try {
      const result = await DeliveryAPI.updateAvailabilityStatus(deliveryPartner.profile_id, available);
      
      if (result.success) {
        setIsAvailable(available);
        setDeliveryPartner({ ...deliveryPartner, is_available: available });
        toast.success(`Status updated to ${available ? 'available' : 'unavailable'}`);
      } else {
        toast.error(result.error || 'Failed to update availability');
      }
    } catch (error: any) {
      toast.error(`Error updating availability: ${error.message}`);
    }
  };

  const handleOtpVerification = async () => {
    if (!selectedOrder || !otpInput.trim()) return;

    try {
      let result;
      
      if (otpType === 'pickup') {
        result = await DeliveryAPI.markPickedUp(
          selectedOrder.order_id,
          deliveryPartner!.id,
          otpInput.trim()
        );
      } else {
        result = await DeliveryAPI.markDelivered(
          selectedOrder.order_id,
          deliveryPartner!.id,
          otpInput.trim()
        );
      }

      if (result.success) {
        toast.success(result.message || `Order ${otpType === 'pickup' ? 'picked up' : 'delivered'} successfully!`);
        setShowOtpDialog(false);
        setOtpInput('');
        setSelectedOrder(null);
        await refreshData();
      } else {
        toast.error(result.error || 'Invalid OTP');
      }
    } catch (error: any) {
      toast.error(`Error verifying OTP: ${error.message}`);
    }
  };

  const openOtpDialog = (order: MyOrder, type: 'pickup' | 'delivery') => {
    setSelectedOrder(order);
    setOtpType(type);
    setOtpInput('');
    setShowOtpDialog(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => {
              setError(null);
              if (profile?.role === 'delivery_partner') {
                initializeDeliveryPartnerDashboard();
              }
            }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Organic background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 left-20 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>
      
      <Header cartItems={0} onCartClick={() => {}} />
      
      <main className="relative container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-First Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                Delivery Partner
              </h1>
              <p className="text-gray-600 font-medium">Manage your deliveries and track earnings</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Auto-assign button for testing */}
              <Button 
                variant="secondary" 
                onClick={handleAutoAssignOrders}
                className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                disabled={refreshing}
              >
                <Target className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Auto-Assign Orders</span>
              </Button>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between sm:justify-start space-x-3 bg-white p-3 rounded-xl shadow-soft border border-gray-200">
                <Label htmlFor="availability" className="font-medium text-gray-700">Available for Orders</Label>
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={handleUpdateAvailability}
                />
              </div>

              <Button 
                variant="outline" 
                onClick={refreshData}
                className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-800">Today's Deliveries</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-blue-700">{stats?.today_deliveries || 0}</div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Active orders: {stats?.active_orders || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-800">Today's Earnings</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-green-700">₹{stats?.today_earnings || 0}</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                Total: ₹{stats?.total_earnings || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-800">Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-yellow-700">{deliveryPartner?.rating || 0.0}</div>
              <p className="text-xs text-yellow-600 font-medium mt-1">
                {deliveryPartner?.total_deliveries || 0} total deliveries
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800">Success Rate</CardTitle>
              <Target className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                {deliveryPartner?.total_deliveries ? 
                  Math.round((deliveryPartner.successful_deliveries / deliveryPartner.total_deliveries) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-purple-600 font-medium mt-1">
                {deliveryPartner?.successful_deliveries || 0} successful
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
            <TabsTrigger value="available" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              <span className="hidden sm:inline">Available</span> ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              <span className="hidden sm:inline">My Orders</span> ({myOrders.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Available Orders
                </CardTitle>
                <CardDescription className="font-medium">
                  Orders ready for pickup in your area
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAvailable && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-soft">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-800">
                        You're currently unavailable. Toggle your availability to see and accept orders.
                      </span>
                    </div>
                  </div>
                )}

                {availableOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No available orders</h3>
                    <p className="text-gray-600">
                      {!isAvailable 
                        ? "Set yourself as available to see orders in your area." 
                        : "New orders will appear here when they become available."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableOrders.map((order) => (
                      <Card key={order.order_id} className="overflow-hidden border border-gray-200 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">Order #{order.order_number}</h4>
                                <Badge variant="secondary">
                                  {order.item_count} items
                                </Badge>
                                <Badge className="bg-green-100 text-green-800">
                                  ₹{order.total_amount}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-900 mb-1">Customer</p>
                                  <p className="text-gray-600">{order.customer_name}</p>
                                  <p className="text-gray-600">{order.customer_phone}</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-gray-900 mb-1">Pickup Location</p>
                                  <p className="text-gray-600">{order.vendor_name}</p>
                                  <p className="text-gray-600">{order.vendor_address}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex items-center text-sm text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                Placed {formatTimeAgo(order.created_at)}
                                {order.distance_km && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {order.distance_km.toFixed(1)} km away
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4 sm:mt-0 sm:ml-4">
                              <Button 
                                onClick={() => handleAcceptOrder(order.order_id)}
                                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 min-h-12 px-6 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                                disabled={!isAvailable}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Accept Order
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  My Active Orders
                </CardTitle>
                <CardDescription>
                  Orders you've accepted and are currently handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active orders</h3>
                    <p className="text-gray-600">
                      Accept orders from the available orders tab to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((order) => (
                      <Card key={order.order_id} className="overflow-hidden">
                        <div className={`p-4 ${order.status === 'delivered' ? 'bg-green-50' : 'bg-blue-50'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg">Order #{order.order_number}</h4>
                              <p className="text-sm text-gray-500">
                                Accepted: {formatTimeAgo(order.accepted_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusBadgeColor(order.status)}>
                                {order.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <p className="font-bold text-xl mt-1">₹{order.total_amount}</p>
                            </div>
                          </div>
                        </div>
                        
                        <CardContent className="p-4 space-y-4">
                          {/* Progress Indicator */}
                          <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                              <Navigation className="w-4 h-4 mr-2" /> Delivery Progress
                            </h5>
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center ${order.status === 'accepted' ? 'text-blue-600 font-semibold' : order.status === 'picked_up' || order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-3 h-3 rounded-full mr-2 ${order.status === 'accepted' ? 'bg-blue-500 animate-pulse' : order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-sm">Accepted</span>
                              </div>
                              <div className={`flex-1 h-1 mx-2 rounded ${order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'picked_up' ? 'text-blue-600 font-semibold' : order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-3 h-3 rounded-full mr-2 ${order.status === 'picked_up' ? 'bg-blue-500 animate-pulse' : order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-sm">Picked Up</span>
                              </div>
                              <div className={`flex-1 h-1 mx-2 rounded ${order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'delivered' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                                <div className={`w-3 h-3 rounded-full mr-2 ${order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-sm">Delivered</span>
                              </div>
                            </div>
                          </div>

                          <Separator />
                          
                          {/* Action Buttons */}
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => window.open(`tel:${order.customer_phone}`)}
                                className="rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium min-h-10"
                              >
                                <Phone className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Call Customer</span>
                                <span className="sm:hidden">Customer</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => window.open(`tel:${order.vendor_phone}`)}
                                className="rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium min-h-10"
                              >
                                <Phone className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Call Vendor</span>
                                <span className="sm:hidden">Vendor</span>
                              </Button>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              {order.status === 'assigned' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleAcceptOrder(order.order_id)}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200 min-h-10"
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Accept Order
                                </Button>
                              )}
                              
                              {order.status === 'accepted' && (
                                <Button 
                                  size="sm"
                                  onClick={() => openOtpDialog(order, 'pickup')}
                                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200 min-h-10"
                                >
                                  <Package className="mr-2 h-4 w-4" />
                                  Verify & Pickup
                                </Button>
                              )}
                              
                              {order.status === 'picked_up' && (
                                <Button 
                                  size="sm"
                                  onClick={() => openOtpDialog(order, 'delivery')}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200 min-h-10"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Verify & Deliver
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Partner Profile</CardTitle>
                <CardDescription>Your account information and vehicle details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryPartner && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">License Number:</span> {deliveryPartner.license_number}</p>
                        <p><span className="font-medium">Verification Status:</span> 
                          <Badge className={deliveryPartner.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {deliveryPartner.is_verified ? 'Verified' : 'Pending Verification'}
                          </Badge>
                        </p>
                        <p><span className="font-medium">Assigned Pincodes:</span> {deliveryPartner.assigned_pincodes.join(', ') || 'None assigned'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Vehicle Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Vehicle Type:</span> {deliveryPartner.vehicle_type}</p>
                        <p><span className="font-medium">Vehicle Number:</span> {deliveryPartner.vehicle_number}</p>
                        <p><span className="font-medium">Current Location:</span> 
                          {deliveryPartner.current_latitude && deliveryPartner.current_longitude 
                            ? `${deliveryPartner.current_latitude.toFixed(4)}, ${deliveryPartner.current_longitude.toFixed(4)}`
                            : 'Location not available'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* OTP Verification Dialog */}
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {otpType === 'pickup' ? 'Verify Pickup OTP' : 'Verify Delivery OTP'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  {otpType === 'pickup' 
                    ? 'Enter the pickup OTP provided by the vendor to confirm item collection.'
                    : 'Enter the delivery OTP provided by the customer to confirm delivery.'
                  }
                </p>
                
                {selectedOrder && (
                  <div className={`inline-block p-3 rounded-lg mb-4 ${
                    otpType === 'pickup' 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <p className="text-xs font-medium mb-1">Expected OTP:</p>
                    <p className={`text-2xl font-bold ${
                      otpType === 'pickup' ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {otpType === 'pickup' ? selectedOrder.pickup_otp : selectedOrder.delivery_otp}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp-input">Enter OTP</Label>
                <Input
                  id="otp-input"
                  type="text"
                  placeholder="Enter 4-6 digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleOtpVerification}
                  disabled={otpInput.length < 4 || otpInput.length > 6}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Verify & {otpType === 'pickup' ? 'Pickup' : 'Deliver'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowOtpDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* 🛠️ Auth Debug Tools */}
      
    </div>
  );
};

export default DeliveryPartnerDashboard;

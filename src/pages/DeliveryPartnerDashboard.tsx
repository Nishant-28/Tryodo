import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, MapPin, Star, Clock, Check, X, 
  RefreshCw, Phone, Navigation, AlertTriangle, CheckCircle,
  DollarSign, Target, Truck, User, Banknote, Shield, 
  Users, Store, ExternalLink, Calculator, CreditCard, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  average_delivery_time_minutes: number;
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
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string>('');

  // Payment collection state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<MyOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Day-end summary state
  const [dayEndDialogOpen, setDayEndDialogOpen] = useState(false);
  const [dayEndCashAmount, setDayEndCashAmount] = useState('');
  const [dayEndDigitalAmount, setDayEndDigitalAmount] = useState('');
  const [dayEndNotes, setDayEndNotes] = useState('');
  const [dayEndLoading, setDayEndLoading] = useState(false);

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
      
      if (result.success && result.data) {
        setAvailableOrders(result.data);
        console.log('✅ Available orders loaded:', result.data.length);
      } else {
        console.error('❌ Failed to load available orders:', result.error);
        setAvailableOrders([]);
      }
    } catch (error) {
      console.error('💥 Error loading available orders:', error);
      setAvailableOrders([]);
    }
  };

  const loadMyOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('🚚 Loading my orders for delivery partner:', deliveryPartnerId);
      const result = await DeliveryAPI.getMyOrders(deliveryPartnerId);
      
      if (result.success && result.data) {
        setMyOrders(result.data);
        console.log('✅ My orders loaded:', result.data.length);
      } else {
        console.error('❌ Failed to load my orders:', result.error);
        setMyOrders([]);
      }
    } catch (error) {
      console.error('💥 Error loading my orders:', error);
      setMyOrders([]);
    }
  };

  const loadStats = async (deliveryPartnerId: string) => {
    try {
      console.log('📊 Loading stats for delivery partner:', deliveryPartnerId);
      const result = await DeliveryAPI.getDeliveryStats(deliveryPartnerId);
      
      if (result.success && result.data) {
        setStats(result.data);
        console.log('✅ Stats loaded:', result.data);
      } else {
        console.error('❌ Failed to load stats:', result.error);
      }
    } catch (error) {
      console.error('💥 Error loading stats:', error);
    }
  };

  const refreshData = async () => {
    if (!deliveryPartner || refreshing) return;
    
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadAvailableOrders(),
        loadMyOrders(deliveryPartner.id),
        loadStats(deliveryPartner.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAutoAssignOrders = async () => {
    if (!deliveryPartner) return;
    
    try {
      setRefreshing(true);
      const result = await DeliveryAPI.autoAssignAvailableOrders();
      
      if (result.success) {
        toast.success('Auto-assignment completed!');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to auto-assign orders');
      }
    } catch (error) {
      console.error('Error auto-assigning orders:', error);
      toast.error('Failed to auto-assign orders');
    } finally {
      setRefreshing(false);
    }
  };

  const updateLocationInDatabase = async (location: { lat: number; lng: number }) => {
    if (!deliveryPartner) return;
    
    await DeliveryAPI.updateLocation(deliveryPartner.id, location.lat, location.lng);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.acceptOrder(orderId, deliveryPartner.id);
      
      if (result.success) {
        toast.success('Order accepted successfully!');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order');
    }
  };

  const handleUpdateAvailability = async (available: boolean) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.updateAvailabilityStatus(deliveryPartner.id, available);
      
      if (result.success) {
        setIsAvailable(available);
        toast.success(`You are now ${available ? 'available' : 'unavailable'} for orders`);
      } else {
        toast.error(result.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  // Simple pickup confirmation without OTP
  const handleConfirmPickup = async (orderId: string) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.markPickedUp(orderId, deliveryPartner.id);
      
      if (result.success) {
        toast.success('✅ Pickup confirmed! You can now deliver to customer.');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to confirm pickup');
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
      toast.error('Failed to confirm pickup');
    }
  };

  // Simple delivery confirmation without OTP
  const handleConfirmDelivery = async (orderId: string) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.markDelivered(orderId, deliveryPartner.id);
      
      if (result.success) {
        toast.success('🎉 Delivery completed successfully!');
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to confirm delivery');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Failed to confirm delivery');
    }
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
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handlePaymentCollection = (order: MyOrder) => {
    setSelectedOrderForPayment(order);
    setPaymentAmount(order.total_amount.toString());
    setPaymentDialogOpen(true);
  };

  const submitPaymentCollection = async () => {
    if (!deliveryPartner || !selectedOrderForPayment) return;
    
    try {
      setPaymentLoading(true);
      const result = await DeliveryAPI.recordPaymentCollection(
        deliveryPartner.id,
        selectedOrderForPayment.order_id,
        parseFloat(paymentAmount),
        paymentMethod,
        paymentNotes
      );
      
      if (result.success) {
        toast.success('Payment collection recorded successfully!');
        setPaymentDialogOpen(false);
        resetPaymentForm();
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to record payment collection');
      }
    } catch (error) {
      console.error('Error recording payment collection:', error);
      toast.error('Failed to record payment collection');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetPaymentForm = () => {
    setSelectedOrderForPayment(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  const handleOpenDayEndSummary = async () => {
    if (!deliveryPartner) return;
    
    try {
      setDayEndLoading(true);
      const result = await DeliveryAPI.getDailyCollectionSummary(deliveryPartner.id);
      
      if (result.success && result.data) {
        setDayEndCashAmount(result.data.total_cash_collected?.toString() || '0');
        setDayEndDigitalAmount(result.data.total_digital_collected?.toString() || '0');
      }
      
      setDayEndDialogOpen(true);
    } catch (error) {
      console.error('Error loading day-end summary:', error);
      toast.error('Failed to load day-end summary');
    } finally {
      setDayEndLoading(false);
    }
  };

  const submitDayEndSummary = async () => {
    if (!deliveryPartner) return;
    
    try {
      setDayEndLoading(true);
      const result = await DeliveryAPI.submitDayEndSummary(
        deliveryPartner.id,
        parseFloat(dayEndCashAmount),
        parseFloat(dayEndDigitalAmount),
        dayEndNotes
      );
      
      if (result.success) {
        toast.success('Day-end summary submitted successfully!');
        setDayEndDialogOpen(false);
        resetDayEndForm();
        await refreshData();
      } else {
        toast.error(result.error || 'Failed to submit day-end summary');
      }
    } catch (error) {
      console.error('Error submitting day-end summary:', error);
      toast.error('Failed to submit day-end summary');
    } finally {
      setDayEndLoading(false);
    }
  };

  const resetDayEndForm = () => {
    setDayEndCashAmount('');
    setDayEndDigitalAmount('');
    setDayEndNotes('');
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
            {/* Mobile-optimized action buttons */}
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {/* Mobile: Grid layout for better touch */}
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {/* Auto-assign button for testing */}
                <Button 
                  variant="secondary" 
                  onClick={handleAutoAssignOrders}
                  className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  disabled={refreshing}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Target className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">Auto-Assign</span>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  disabled={refreshing}
                >
                  <div className="flex flex-col items-center gap-1">
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">{refreshing ? 'Updating' : 'Refresh'}</span>
                  </div>
                </Button>
              </div>

              {/* Availability Toggle - Full width on mobile */}
              <div className="flex items-center justify-between space-x-3 bg-white p-3 rounded-xl shadow-soft border border-gray-200 w-full sm:w-auto">
                <Label htmlFor="availability" className="font-medium text-gray-700">Available for Orders</Label>
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={handleUpdateAvailability}
                />
              </div>

              {/* Desktop: Original layout */}
              <div className="hidden sm:flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={handleAutoAssignOrders}
                  className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                  disabled={refreshing}
                >
                  <Target className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Auto-Assign Orders</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 sm:mb-8">
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
        </div> */}

        <Tabs defaultValue="my-orders" className="w-full">
          {/* Mobile-first tabs with improved layout */}
          <div className="block sm:hidden mb-4">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-soft h-auto">
              <TabsTrigger 
                value="available" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Available ({availableOrders.length})</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="my-orders" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>My Orders ({myOrders.length})</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="available" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Available ({availableOrders.length})
              </TabsTrigger>
              <TabsTrigger value="my-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                My Orders ({myOrders.length})
              </TabsTrigger>
            </TabsList>
          </div>

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
                                {/* Payment Method Badge */}
                                {(order.payment_method === 'cod' || order.payment_method === 'cash_on_delivery') ? (
                                  <Badge className="bg-orange-100 text-orange-800 font-medium">
                                    💰 COD
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 font-medium">
                                    💳 PAID
                                  </Badge>
                                )}
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
                                variant="success-mobile"
                                size="mobile-md"
                                className="w-full sm:w-auto"
                                disabled={!isAvailable}
                                enableHaptics={true}
                                hapticIntensity="medium"
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
              <CardContent className="p-2 sm:p-4">
                {myOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
                    <p className="text-gray-500 mb-4">Your accepted orders will appear here</p>
                    <Button
                      onClick={handleAutoAssignOrders}
                      variant="outline"
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Auto-Assign Orders
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myOrders.map((order) => (
                      <Card key={order.order_id} className="border-gray-200 shadow-soft hover:shadow-medium transition-all duration-200 overflow-hidden">
                        {/* Order Header - Always Visible */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-gray-900 truncate">
                                  #{order.order_number}
                                </h3>
                                <Badge className={`${getStatusBadgeColor(order.status)} font-medium text-xs`}>
                                  {order.status === 'assigned' && '📋 Assigned'}
                                  {order.status === 'accepted' && '✅ Accepted'}
                                  {order.status === 'picked_up' && '📦 Picked Up'}
                                  {order.status === 'delivered' && '🎉 Delivered'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {order.customer_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(order.accepted_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">₹{order.total_amount}</div>
                                <div className="text-xs text-gray-500">{order.item_count} items</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedOrderId(expandedOrderId === order.order_id ? '' : order.order_id)}
                                className="p-2"
                              >
                                {expandedOrderId === order.order_id ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Navigation className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Progress Timeline - Always Visible */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center ${order.status === 'accepted' ? 'text-blue-600 font-semibold' : order.status === 'picked_up' || order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'accepted' ? 'bg-blue-500 animate-pulse' : order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Accepted</span>
                              </div>
                              <div className={`flex-1 h-0.5 mx-2 rounded ${order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'picked_up' ? 'text-blue-600 font-semibold' : order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'picked_up' ? 'bg-blue-500 animate-pulse' : order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Picked Up</span>
                              </div>
                              <div className={`flex-1 h-0.5 mx-2 rounded ${order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'delivered' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Delivered</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details - Conditionally Visible */}
                        {expandedOrderId === order.order_id && (
                          <div className="p-4 space-y-4 bg-white">
                            {/* Information Flow: Show Vendor first, Customer only after pickup */}
                            
                            {/* Vendor Information - Always visible when order is accepted */}
                            {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'delivered') && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Store className="h-4 w-4 text-orange-500" />
                                  🏪 Pickup from Vendor
                                  {order.status === 'picked_up' || order.status === 'delivered' ? (
                                    <Badge className="bg-green-100 text-green-800 ml-2">✅ Completed</Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800 ml-2">📦 Pending</Badge>
                                  )}
                                </h4>
                                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="font-bold text-orange-900 text-lg">{order.vendor_name}</div>
                                      <div className="text-sm text-orange-700 mt-1">{order.vendor_address}</div>
                                      <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                                        <Clock className="h-3 w-3" />
                                        <span>Contact vendor before pickup</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-orange-900">₹{order.total_amount}</div>
                                      <div className="text-xs text-orange-600">{order.item_count} items</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => window.open(`tel:${order.vendor_phone}`)}
                                      className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call Vendor
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.vendor_address)}`)}
                                      className="border-orange-300 hover:bg-orange-100 text-orange-700"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Navigate
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://wa.me/${order.vendor_phone.replace(/[^0-9]/g, '')}`)}
                                      className="border-orange-300 hover:bg-orange-100 text-orange-700"
                                    >
                                      💬 WhatsApp
                                    </Button>
                                  </div>
                                  {order.status === 'accepted' && (
                                    <div className="mt-3 p-2 bg-orange-200 rounded text-center">
                                      <p className="text-xs text-orange-800 font-medium">
                                        📱 Contact vendor to confirm order is ready for pickup
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Customer Information - Only show after pickup */}
                            {(order.status === 'picked_up' || order.status === 'delivered') && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-blue-500" />
                                  🏠 Deliver to Customer
                                  {order.status === 'delivered' ? (
                                    <Badge className="bg-green-100 text-green-800 ml-2">🎉 Completed</Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-800 ml-2">🚚 In Transit</Badge>
                                  )}
                                </h4>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="font-bold text-blue-900 text-lg">{order.customer_name}</div>
                                      <div className="text-sm text-blue-700 mt-1">
                                        {typeof order.delivery_address === 'string' 
                                          ? order.delivery_address 
                                          : JSON.stringify(order.delivery_address)
                                        }
                                      </div>
                                      <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                        <Clock className="h-3 w-3" />
                                        <span>Picked up • Ready for delivery</span>
                                      </div>
                                    </div>
                                    {order.collection_required && (
                                      <div className="text-right bg-orange-100 rounded p-2">
                                        <div className="text-xs text-orange-600 mb-1">Collect Cash</div>
                                        <div className="text-lg font-bold text-orange-900">₹{order.total_amount}</div>
                                        <div className="text-xs text-orange-600">COD</div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => window.open(`tel:${order.customer_phone}`)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call Customer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(
                                        typeof order.delivery_address === 'string' 
                                          ? order.delivery_address 
                                          : JSON.stringify(order.delivery_address)
                                      )}`)}
                                      className="border-blue-300 hover:bg-blue-100 text-blue-700"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Navigate
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`)}
                                      className="border-blue-300 hover:bg-blue-100 text-blue-700"
                                    >
                                      💬 WhatsApp
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Payment Information */}
                            {order.status === 'picked_up' && (
                              <div className="mt-4">
                                {order.collection_required ? (
                                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-orange-500 p-2 rounded-full">
                                        <Banknote className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-orange-800 uppercase tracking-wide">
                                          💰 Collect Cash from Customer
                                        </p>
                                        <p className="text-2xl font-black text-orange-900">₹{order.total_amount}</p>
                                      </div>
                                    </div>
                                    <div className="bg-orange-100 p-2 rounded border border-orange-200">
                                      <p className="text-xs text-orange-800 text-center font-medium">
                                        🚨 Cash on Delivery • Payment Required • Exact Amount
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-green-500 p-2 rounded-full">
                                        <CheckCircle className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                                          ✅ Payment Completed
                                        </p>
                                        <p className="text-2xl font-black text-green-900">PAID</p>
                                      </div>
                                    </div>
                                    <div className="bg-green-100 p-2 rounded border border-green-200">
                                      <p className="text-xs text-green-800 text-center font-medium">
                                        💳 Payment already processed • No collection required
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {order.status === 'delivered' && (
                              <div className="space-y-3">
                                <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Order Completed
                                    </span>
                                    <span className="text-xl font-bold text-green-900">
                                      ₹{order.total_amount}
                                    </span>
                                  </div>
                                  <p className="text-xs text-green-700 text-center mt-1">
                                    ✅ Order completed successfully
                                  </p>
                                </div>
                                
                                {/* Payment Collection Button for COD orders */}
                                {order.collection_required && (
                                  <Button 
                                    onClick={() => handlePaymentCollection(order)}
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg"
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Record Payment Collection
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons - Always Visible */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <div className="flex flex-col gap-3">
                            {order.status === 'assigned' && (
                              <Button 
                                onClick={() => handleAcceptOrder(order.order_id)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                              >
                                <Check className="mr-2 h-5 w-5" />
                                Accept Order
                              </Button>
                            )}
                            
                            {order.status === 'accepted' && (
                              <Button 
                                onClick={() => handleConfirmPickup(order.order_id)}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-4 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                              >
                                <Package className="mr-2 h-5 w-5" />
                                ✅ Confirm Pickup from Vendor
                              </Button>
                            )}
                            
                            {order.status === 'picked_up' && (
                              <div className="space-y-3">
                                {/* Show COD collection reminder if needed */}
                                {order.collection_required && (
                                  <div className="p-3 bg-gradient-to-r from-orange-100 to-orange-200 border border-orange-300 rounded-lg">
                                    <div className="flex items-center gap-2 text-orange-800">
                                      <Banknote className="h-4 w-4" />
                                      <span className="text-sm font-medium">Remember to collect ₹{order.total_amount} cash from customer</span>
                                    </div>
                                  </div>
                                )}
                                
                                <Button 
                                  onClick={() => handleConfirmDelivery(order.order_id)}
                                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                                >
                                  <CheckCircle className="mr-2 h-5 w-5" />
                                  🎉 Confirm Delivery to Customer
                                </Button>
                              </div>
                            )}
                            
                            {order.status === 'delivered' && order.collection_required && (
                              <Button 
                                onClick={() => handlePaymentCollection(order)}
                                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment Collection
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Earnings Breakdown
                </CardTitle>
                <CardDescription className="font-medium">
                  Detailed view of your earnings and wallet balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Collection Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Button 
                    onClick={handleOpenDayEndSummary}
                    disabled={dayEndLoading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3"
                  >
                    {dayEndLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Day-End Summary
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={refreshData}
                    disabled={refreshing}
                    variant="outline"
                    className="flex-1 border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold py-3"
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Earnings
                      </>
                    )}
                  </Button>
                </div>

                {/* Wallet Balance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-green-800">Available Balance</h3>
                        <p className="text-2xl font-bold text-green-700">₹{stats?.available_balance || 0}</p>
                        <p className="text-xs text-green-600 mt-1">Ready for payout</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-yellow-800">Pending Balance</h3>
                        <p className="text-2xl font-bold text-yellow-700">₹{stats?.pending_balance || 0}</p>
                        <p className="text-xs text-yellow-600 mt-1">Processing earnings</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-blue-800">Total Paid Out</h3>
                        <p className="text-2xl font-bold text-blue-700">₹{stats?.total_paid_out || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">All-time payments</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Earnings Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">Daily Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Today</span>
                          <span className="font-semibold">₹{stats?.today_earnings || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.today_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg per delivery</span>
                          <span className="font-semibold">
                            ₹{stats?.today_deliveries ? Math.round((stats?.today_earnings || 0) / stats.today_deliveries) : 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">All-Time Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Earned</span>
                          <span className="font-semibold">₹{stats?.total_earnings || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Deliveries</span>
                          <span className="font-semibold">{stats?.total_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg per delivery</span>
                          <span className="font-semibold">
                            ₹{stats?.total_deliveries ? Math.round((stats?.total_earnings || 0) / stats.total_deliveries) : 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payout Information */}
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base">Payout Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Minimum payout amount: <span className="font-semibold">₹500</span></p>
                        <p className="text-sm text-gray-600 mb-2">Payout frequency: <span className="font-semibold">Weekly</span></p>
                        <p className="text-sm text-gray-600">Next payout: <span className="font-semibold">Monday</span></p>
                      </div>
                      <div className="flex items-center justify-center md:justify-end">
                        <Button 
                          disabled={(stats?.available_balance || 0) < 500}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                          Request Payout
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Performance Analytics
                </CardTitle>
                <CardDescription className="font-medium">
                  Track your delivery performance and growth trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-blue-800">Success Rate</h3>
                      <p className="text-xl font-bold text-blue-700">
                        {deliveryPartner?.total_deliveries ? 
                          Math.round((deliveryPartner.successful_deliveries / deliveryPartner.total_deliveries) * 100) 
                          : 0}%
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-green-800">Rating</h3>
                      <p className="text-xl font-bold text-green-700">{deliveryPartner?.rating || 0.0} ⭐</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-purple-800">Active Orders</h3>
                      <p className="text-xl font-bold text-purple-700">{stats?.active_orders || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-orange-800">Avg Time</h3>
                      <p className="text-xl font-bold text-orange-700">{deliveryPartner?.average_delivery_time_minutes || 0}m</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Time Period Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">Today vs Yesterday</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.today_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.today_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          {/* This would need historical data to calculate */}
                          📈 Growth metrics coming soon
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.week_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.week_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {stats?.week_deliveries ? `₹${Math.round((stats?.week_earnings || 0) / stats.week_deliveries)} per delivery` : 'No deliveries yet'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.month_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.month_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {stats?.month_deliveries ? `₹${Math.round((stats?.month_earnings || 0) / stats.month_deliveries)} per delivery` : 'No deliveries yet'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Goals and Achievements */}
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base">Goals & Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Daily Goal (10 deliveries)</span>
                          <span className="text-sm font-semibold">{stats?.today_deliveries || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((stats?.today_deliveries || 0) / 10) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Weekly Goal (50 deliveries)</span>
                          <span className="text-sm font-semibold">{stats?.week_deliveries || 0}/50</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((stats?.week_deliveries || 0) / 50) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Achievement Badges */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold mb-3">Recent Achievements</h4>
                        <div className="flex flex-wrap gap-2">
                          {deliveryPartner?.successful_deliveries && deliveryPartner.successful_deliveries >= 1 && (
                            <Badge className="bg-green-100 text-green-800">🎯 First Delivery</Badge>
                          )}
                          {deliveryPartner?.successful_deliveries && deliveryPartner.successful_deliveries >= 10 && (
                            <Badge className="bg-blue-100 text-blue-800">🏆 10 Deliveries</Badge>
                          )}
                          {deliveryPartner?.rating && deliveryPartner.rating >= 4.0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">⭐ High Rating</Badge>
                          )}
                          {deliveryPartner?.is_verified && (
                            <Badge className="bg-purple-100 text-purple-800">✅ Verified Partner</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
      </main>

      {/* Payment Collection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Record Payment Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                Order #{selectedOrderForPayment?.order_number || 'Unknown'}
              </h4>
              <p className="text-xs text-gray-600">
                Record payment collected from this order
              </p>
            </div>

            {/* Payment Amount */}
            <div className="space-y-3">
              <Label htmlFor="payment-amount" className="text-sm font-medium">
                Payment Amount
              </Label>
              <Input
                id="payment-amount"
                type="text"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total amount collected from this order
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label htmlFor="payment-method" className="text-sm font-medium">
                Payment Method
              </Label>
                             <Select
                 value={paymentMethod}
                 onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'upi')}
               >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the method used to collect payment
              </p>
            </div>

            {/* Payment Notes */}
            <div className="space-y-3">
              <Label htmlFor="payment-notes" className="text-sm font-medium">
                Payment Notes
              </Label>
              <Textarea
                id="payment-notes"
                placeholder="Enter any additional notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Add any notes about the payment collection process
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(false)}
                className="flex-1"
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitPaymentCollection}
                disabled={paymentLoading || !paymentAmount || !paymentMethod}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {paymentLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day-end Summary Dialog */}
      <Dialog open={dayEndDialogOpen} onOpenChange={setDayEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Day-end Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Daily Collection Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                Daily Collection Summary
              </h4>
              <p className="text-xs text-gray-600">
                Enter the cash and digital collected today
              </p>
            </div>

            {/* Cash Collection */}
            <div className="space-y-3">
              <Label htmlFor="day-end-cash" className="text-sm font-medium">
                Cash Collected
              </Label>
              <Input
                id="day-end-cash"
                type="text"
                placeholder="Enter cash collected"
                value={dayEndCashAmount}
                onChange={(e) => setDayEndCashAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total cash collected today
              </p>
            </div>

            {/* Digital Collection */}
            <div className="space-y-3">
              <Label htmlFor="day-end-digital" className="text-sm font-medium">
                Digital Collected
              </Label>
              <Input
                id="day-end-digital"
                type="text"
                placeholder="Enter digital collected"
                value={dayEndDigitalAmount}
                onChange={(e) => setDayEndDigitalAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total digital collected today
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label htmlFor="day-end-notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="day-end-notes"
                placeholder="Enter any notes"
                value={dayEndNotes}
                onChange={(e) => setDayEndNotes(e.target.value)}
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Add any notes about the day-end summary
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDayEndDialogOpen(false)}
                className="flex-1"
                disabled={dayEndLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitDayEndSummary}
                disabled={dayEndLoading || !dayEndCashAmount || !dayEndDigitalAmount}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                {dayEndLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🛠️ Auth Debug Tools */}
      
    </div>
  );
};

export default DeliveryPartnerDashboard;

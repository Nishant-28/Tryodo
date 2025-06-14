import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, ShoppingCart, Users, Plus, Eye, Edit, Trash2, 
  Search, Filter, BarChart3, DollarSign, AlertTriangle, CheckCircle, 
  Clock, Settings, Bell, Timer, Check, X, RefreshCw, Calendar,
  PlayCircle, PauseCircle, Target, Truck, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface VendorProduct {
  id: string;
  price: number;
  original_price: number | null;
  warranty_months: number;
  stock_quantity: number;
  is_in_stock: boolean;
  delivery_time_days: number;
  product_images: string[] | null;
  specifications: any | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: {
    id: string;
    name: string;
    icon: string;
  };
  quality_type: {
    id: string;
    name: string;
  };
  model?: {
    id: string;
    model_name: string;
    model_number?: string;
    brand: {
      name: string;
    };
  };
  generic_product?: {
    id: string;
    name: string;
    description: string;
  };
}

interface PendingOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  delivery_address: any;
  order_item_id: string;
  vendor_id: string;
  product_name: string;
  product_description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  vendor_business_name: string;
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount: number | null;
  business_hours_start: string;
  business_hours_end: string;
  auto_approve_during_business_hours_only: boolean;
  customer_profile_id: string;
  minutes_remaining: number;
  should_auto_approve: boolean;
}

interface ConfirmedOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  delivery_address: any;
  order_item_id: string;
  vendor_id: string;
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
}

interface VendorSettings {
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount: number | null;
  business_hours_start: string;
  business_hours_end: string;
  auto_approve_during_business_hours_only: boolean;
}

interface Analytics {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  responseRate: number;
  autoApprovalRate: number;
}

interface Vendor {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount: number | null;
  business_hours_start: string;
  business_hours_end: string;
  auto_approve_during_business_hours_only: boolean;
}

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    responseRate: 0,
    autoApprovalRate: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [selectedOrderItem, setSelectedOrderItem] = useState<string | null>(null);
  const [vendorSettings, setVendorSettings] = useState<VendorSettings>({
    auto_approve_orders: false,
    order_confirmation_timeout_minutes: 15,
    auto_approve_under_amount: null,
    business_hours_start: '09:00',
    business_hours_end: '18:00',
    auto_approve_during_business_hours_only: true
  });

  // Real-time refresh interval (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (user && profile?.role === 'vendor') {
      loadVendorData();
    }
  }, [user, profile]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      
      // Get vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      if (vendorError || !vendorData) {
        toast.error('Vendor profile not found');
        return;
      }

      setVendor(vendorData);
      setVendorSettings({
        auto_approve_orders: vendorData.auto_approve_orders || false,
        order_confirmation_timeout_minutes: vendorData.order_confirmation_timeout_minutes || 15,
        auto_approve_under_amount: vendorData.auto_approve_under_amount,
        business_hours_start: vendorData.business_hours_start || '09:00',
        business_hours_end: vendorData.business_hours_end || '18:00',
        auto_approve_during_business_hours_only: vendorData.auto_approve_during_business_hours_only || true
      });

      // Load orders and analytics
      await Promise.all([
        loadPendingOrders(vendorData.id),
        loadConfirmedOrders(vendorData.id),
        loadAnalytics(vendorData.id)
      ]);

    } catch (error) {
      console.error('Error loading vendor data:', error);
      toast.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingOrders = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_pending_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  };

  const loadConfirmedOrders = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_order_tracking')
        .select('*')
        .eq('vendor_id', vendorId)
        .in('item_status', ['confirmed', 'processing', 'packed', 'picked_up', 'shipped'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfirmedOrders(data || []);
    } catch (error) {
      console.error('Error loading confirmed orders:', error);
    }
  };

  const loadAnalytics = async (vendorId: string) => {
    try {
      // Get product count
      const { count: productCount } = await supabase
        .from('vendor_products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      const { count: genericProductCount } = await supabase
        .from('vendor_generic_products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      // Get order statistics
      const { data: orderStats } = await supabase
        .from('order_items')
        .select('item_status, line_total, created_at')
        .eq('vendor_id', vendorId);

      const totalProducts = (productCount || 0) + (genericProductCount || 0);
      const totalOrders = orderStats?.length || 0;
      const pendingOrdersCount = orderStats?.filter(o => o.item_status === 'pending').length || 0;
      const confirmedOrders = orderStats?.filter(o => o.item_status === 'confirmed').length || 0;
      const totalRevenue = orderStats?.reduce((sum, order) => sum + (order.line_total || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate response and auto-approval rates
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      
      const recentOrders = orderStats?.filter(o => 
        new Date(o.created_at) >= last30Days
      ) || [];
      
      const responseRate = recentOrders.length > 0 
        ? ((recentOrders.filter(o => o.item_status !== 'pending').length / recentOrders.length) * 100)
        : 0;

      setAnalytics({
        totalProducts,
        totalOrders,
        pendingOrders: pendingOrdersCount,
        confirmedOrders,
        totalRevenue,
        averageOrderValue,
        responseRate,
        autoApprovalRate: vendor?.auto_approve_orders ? 85 : 0 // Placeholder calculation
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const refreshData = useCallback(async () => {
    if (!vendor) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadPendingOrders(vendor.id),
        loadConfirmedOrders(vendor.id),
        loadAnalytics(vendor.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [vendor]);

  const handleOrderAction = async (orderItemId: string, action: 'accept' | 'reject') => {
    try {
      const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';
      
      const { error } = await supabase
        .from('order_items')
        .update({ 
          item_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderItemId);

      if (error) throw error;

      toast.success(`Order ${action === 'accept' ? 'confirmed' : 'rejected'} successfully`);
      await refreshData();
      
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(`Failed to ${action} order`);
    }
  };

  const handleOrderStatusUpdate = async (orderItemId: string, newStatus: string, pickupBy?: string, notes?: string) => {
    try {
      const updateData: any = { 
        item_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'picked_up' && pickupBy) {
        updateData.picked_up_at = new Date().toISOString();
        updateData.pickup_confirmed_by = pickupBy;
      }

      if (notes) {
        updateData.vendor_notes = notes;
      }
      
      const { error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', orderItemId);

      if (error) throw error;

      let message = '';
      switch (newStatus) {
        case 'processing': message = 'Order marked as processing'; break;
        case 'packed': message = 'Order marked as packed'; break;
        case 'picked_up': message = 'Order marked as picked up'; break;
        case 'shipped': message = 'Order marked as out for delivery'; break;
        default: message = 'Order status updated';
      }

      toast.success(message);
      await refreshData();
      setSelectedOrderItem(null);
      setPickupPersonName('');
      setVendorNotes('');
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const updateVendorSettings = async () => {
    if (!vendor) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          auto_approve_orders: vendorSettings.auto_approve_orders,
          order_confirmation_timeout_minutes: vendorSettings.order_confirmation_timeout_minutes,
          auto_approve_under_amount: vendorSettings.auto_approve_under_amount,
          business_hours_start: vendorSettings.business_hours_start,
          business_hours_end: vendorSettings.business_hours_end,
          auto_approve_during_business_hours_only: vendorSettings.auto_approve_during_business_hours_only,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor.id);

      if (error) throw error;

      setVendor({
        ...vendor,
        ...vendorSettings
      });

      setShowSettingsDialog(false);
      toast.success('Settings updated successfully');
      
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getTimeRemainingDisplay = (minutesRemaining: number) => {
    if (minutesRemaining <= 0) return 'Expired';
    
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = Math.floor(minutesRemaining % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getUrgencyColor = (minutesRemaining: number) => {
    if (minutesRemaining <= 0) return 'bg-red-100 text-red-800';
    if (minutesRemaining <= 5) return 'bg-red-100 text-red-800';
    if (minutesRemaining <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'packed': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'urgent') return matchesSearch && order.minutes_remaining <= 5;
    if (statusFilter === 'auto_approve') return matchesSearch && order.should_auto_approve;
    
    return matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartItems={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {vendor?.business_name} Dashboard
              </h1>
              <p className="text-gray-600">Manage your orders and business settings</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={refreshData}
                className="flex items-center gap-2"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Refresh'}
              </Button>
              
              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Order Management Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-approve orders</Label>
                        <p className="text-sm text-gray-500">Automatically approve eligible orders</p>
                      </div>
                      <Switch
                        checked={vendorSettings.auto_approve_orders}
                        onCheckedChange={(checked) => 
                          setVendorSettings(prev => ({ ...prev, auto_approve_orders: checked }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Confirmation timeout (minutes)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="60"
                        value={vendorSettings.order_confirmation_timeout_minutes}
                        onChange={(e) => 
                          setVendorSettings(prev => ({ 
                            ...prev, 
                            order_confirmation_timeout_minutes: parseInt(e.target.value) || 15 
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Auto-approve under amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Leave empty for no limit"
                        value={vendorSettings.auto_approve_under_amount || ''}
                        onChange={(e) => 
                          setVendorSettings(prev => ({ 
                            ...prev, 
                            auto_approve_under_amount: e.target.value ? parseFloat(e.target.value) : null 
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Business Hours</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Start</Label>
                          <Input
                            type="time"
                            value={vendorSettings.business_hours_start}
                            onChange={(e) => 
                              setVendorSettings(prev => ({ ...prev, business_hours_start: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-sm">End</Label>
                          <Input
                            type="time"
                            value={vendorSettings.business_hours_end}
                            onChange={(e) => 
                              setVendorSettings(prev => ({ ...prev, business_hours_end: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Auto-approve only during business hours</Label>
                          <p className="text-xs text-gray-500">Restrict auto-approval to business hours</p>
                        </div>
                        <Switch
                          checked={vendorSettings.auto_approve_during_business_hours_only}
                          onCheckedChange={(checked) => 
                            setVendorSettings(prev => ({ ...prev, auto_approve_during_business_hours_only: checked }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={updateVendorSettings} className="flex-1">
                        Save Settings
                      </Button>
                      <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                onClick={() => navigate('/vendor/add-product')}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending Orders ({analytics.pendingOrders})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed Orders ({confirmedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{analytics.pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                  <Target className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{analytics.responseRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Auto-Approval</CardTitle>
                  {vendor?.auto_approve_orders ? (
                    <PlayCircle className="h-4 w-4 text-blue-500" />
                  ) : (
                    <PauseCircle className="h-4 w-4 text-gray-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {vendor?.auto_approve_orders ? 'ON' : 'OFF'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vendor?.auto_approve_orders ? 'Auto-approving orders' : 'Manual approval required'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <p className="text-xs text-muted-foreground">
                    Per order item
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Order Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Filter by</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Orders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Orders</SelectItem>
                        <SelectItem value="urgent">Urgent (≤5 min left)</SelectItem>
                        <SelectItem value="auto_approve">Auto-Approve Eligible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quick Actions</Label>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setStatusFilter('urgent')}
                        className="flex-1"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Urgent
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={refreshData}
                        disabled={refreshing}
                        className="flex-1"
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders ({filteredOrders.length})</CardTitle>
                <CardDescription>Orders requiring your confirmation</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-600">
                      {pendingOrders.length === 0 
                        ? "No pending orders at the moment." 
                        : "No orders match your current filters."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div key={order.order_item_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{order.product_name}</h3>
                              <Badge className={getUrgencyColor(order.minutes_remaining)}>
                                <Timer className="h-3 w-3 mr-1" />
                                {getTimeRemainingDisplay(order.minutes_remaining)}
                              </Badge>
                              {order.should_auto_approve && (
                                <Badge variant="secondary">
                                  Auto-Approve Eligible
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Order:</span> {order.order_number}
                              </div>
                              <div>
                                <span className="font-medium">Quantity:</span> {order.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span> ₹{order.line_total.toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">Placed:</span> {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {order.product_description && (
                              <p className="text-sm text-gray-500 mb-3">{order.product_description}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleOrderAction(order.order_item_id, 'accept')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOrderAction(order.order_item_id, 'reject')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Confirmed Orders - Order Fulfillment
                </CardTitle>
                <CardDescription>
                  Manage order processing, packaging, and delivery handoff
                </CardDescription>
              </CardHeader>
              <CardContent>
                {confirmedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No confirmed orders</h3>
                    <p className="text-gray-600">Confirmed orders will appear here for processing and fulfillment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {confirmedOrders.map((order) => (
                      <div key={order.order_item_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{order.product_name}</h3>
                              <Badge className={getStatusBadgeColor(order.item_status)}>
                                {order.item_status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Order:</span> {order.order_number}
                              </div>
                              <div>
                                <span className="font-medium">Customer:</span> {order.customer_name}
                              </div>
                              <div>
                                <span className="font-medium">Quantity:</span> {order.quantity}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span> ₹{order.line_total.toLocaleString()}
                              </div>
                            </div>

                            {order.picked_up_at && (
                              <div className="text-sm text-green-600 mb-2">
                                <MapPin className="h-4 w-4 inline mr-1" />
                                Picked up on {new Date(order.picked_up_at).toLocaleDateString('en-IN')} 
                                {order.pickup_confirmed_by && ` by ${order.pickup_confirmed_by}`}
                              </div>
                            )}

                            {order.vendor_notes && (
                              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                                <strong>Notes:</strong> {order.vendor_notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            {order.item_status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => handleOrderStatusUpdate(order.order_item_id, 'processing')}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Start Processing
                              </Button>
                            )}
                            
                            {order.item_status === 'processing' && (
                              <Button
                                size="sm"
                                onClick={() => handleOrderStatusUpdate(order.order_item_id, 'packed')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Mark as Packed
                              </Button>
                            )}
                            
                            {order.item_status === 'packed' && (
                              <div className="space-y-2">
                                {selectedOrderItem === order.order_item_id ? (
                                  <div className="space-y-2 min-w-48">
                                    <Input
                                      placeholder="Delivery person name"
                                      value={pickupPersonName}
                                      onChange={(e) => setPickupPersonName(e.target.value)}
                                      className="h-8"
                                    />
                                    <Input
                                      placeholder="Additional notes (optional)"
                                      value={vendorNotes}
                                      onChange={(e) => setVendorNotes(e.target.value)}
                                      className="h-8"
                                    />
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleOrderStatusUpdate(
                                          order.order_item_id, 
                                          'picked_up', 
                                          pickupPersonName,
                                          vendorNotes
                                        )}
                                        disabled={!pickupPersonName.trim()}
                                        className="bg-purple-600 hover:bg-purple-700"
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Confirm Pickup
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedOrderItem(null);
                                          setPickupPersonName('');
                                          setVendorNotes('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedOrderItem(order.order_item_id)}
                                    className="bg-purple-600 hover:bg-purple-700"
                                  >
                                    <Truck className="h-4 w-4 mr-1" />
                                    Mark as Picked Up
                                  </Button>
                                )}
                              </div>
                            )}
                            
                            {order.item_status === 'picked_up' && (
                              <Button
                                size="sm"
                                onClick={() => handleOrderStatusUpdate(order.order_item_id, 'shipped')}
                                className="bg-indigo-600 hover:bg-indigo-700"
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Out for Delivery
                              </Button>
                            )}

                            {order.item_status === 'shipped' && (
                              <Badge className="bg-green-100 text-green-800">
                                <Truck className="h-4 w-4 mr-1" />
                                Out for Delivery
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Customer delivery info */}
                        <div className="border-t pt-3 mt-3">
                          <h4 className="font-medium text-sm mb-2">Delivery Information</h4>
                          <div className="text-sm text-gray-600">
                            <p><strong>Customer:</strong> {order.customer_name} - {order.customer_phone}</p>
                            <p><strong>Address:</strong> {order.delivery_address?.address_line1}, {order.delivery_address?.city} - {order.delivery_address?.pincode}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    Active listings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{analytics.confirmedOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString('en-IN')}</div>
                  <p className="text-xs text-muted-foreground">
                    From confirmed orders
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Your business performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Order Response Rate</span>
                      <span className="font-medium">{analytics.responseRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${analytics.responseRate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {vendor?.auto_approve_orders && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Auto-Approval Rate</span>
                        <span className="font-medium">{analytics.autoApprovalRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analytics.autoApprovalRate}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vendor/add-product')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Add New Product
                  </CardTitle>
                  <CardDescription>List a new product for your customers</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    View All Products
                  </CardTitle>
                  <CardDescription>{analytics.totalProducts} products listed</CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Product Analytics
                  </CardTitle>
                  <CardDescription>View detailed product performance</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VendorDashboard;

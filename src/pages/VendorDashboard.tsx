import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, ShoppingCart, Users, Plus, Eye, Edit, Trash2, 
  Search, Filter, BarChart3, DollarSign, AlertTriangle, CheckCircle, 
  Clock, Settings, Bell, Timer, Check, X, RefreshCw, Calendar,
  PlayCircle, PauseCircle, Target, Truck, MapPin, User, Phone, Copy, KeyRound
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
import { TryodoAPI } from '@/lib/api';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { Textarea } from '@/components/ui/textarea';

type SupabaseOrderData = {
  id: string;
  vendor_id: string;
  product_name: string | null;
  product_description: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  picked_up_at: string | null;
  pickup_confirmed_by: string | null;
  vendor_notes: string | null;
  created_at: string;
  updated_at: string;
  orders: {
    id: string;
    order_number: string;
    customer_id: string;
    total_amount: number;
    order_status: string;
    payment_status: string;
    delivery_address: any;
    customers: {
      id: string;
      profile_id: string;
      profiles: {
        full_name: string | null;
        phone: string | null;
      } | null;
    } | null;
    delivery_partner_orders: {
      delivery_partner_id: string;
      status: string;
      pickup_otp: string | null;
      delivery_otp: string | null;
      accepted_at: string | null;
      picked_up_at: string | null;
      delivered_at: string | null;
      delivery_partners: {
        id: string;
        profile_id: string;
        profiles: {
          full_name: string | null;
          phone: string | null;
        } | null;
      } | null;
    }[];
  } | null;
};

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
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  delivery_address: any;
  order_item_id: string;
  vendor_id: string;
  product_name: string | null;
  product_description: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  picked_up_at: string | null | undefined;
  pickup_confirmed_by: string | null | undefined;
  vendor_notes: string | null;
  updated_at: string;
  delivery_partner_id: string | null | undefined;
  delivery_partner_name: string | null | undefined;
  delivery_partner_phone: string | null | undefined;
  pickup_otp: string | null | undefined;
  delivery_otp: string | null | undefined;
  delivered_at: string | null | undefined;
  delivery_assigned_at: string | null | undefined;
  out_for_delivery_at: string | null | undefined;
  current_status: 'confirmed' | 'assigned_to_delivery' | 'out_for_delivery' | 'delivered';
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
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState<ConfirmedOrder | null>(null);
  const [otpType, setOtpType] = useState<'pickup' | 'delivery'>('pickup');
  const [error, setError] = useState<string | null>(null);

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

  const loadVendorData = async (vendorId: string) => {
    try {
      if (!vendorId) {
        setError('Vendor ID not found');
        return;
      }

      setError(null);
      setLoading(true);

      // Load vendor data, pending orders, confirmed orders, and analytics in parallel
      const [vendorResult, pendingResult, confirmedResult, analyticsResult] = await Promise.allSettled([
        loadVendorData(vendorId),
        loadPendingOrders(vendorId),
        loadConfirmedOrders(vendorId),
        loadAnalyticsData(vendorId)
      ]);

      if (vendorResult.status === 'rejected') {
        console.error('Error loading vendor data:', vendorResult.reason);
      }

      if (pendingResult.status === 'rejected') {
        console.error('Error loading pending orders:', pendingResult.reason);
      }

      if (confirmedResult.status === 'rejected') {
        // Error already handled in loadConfirmedOrders
      }

      if (analyticsResult.status === 'rejected') {
        console.error('Error loading analytics:', analyticsResult.reason);
      }

    } catch (error) {
      setError('Failed to load dashboard data');
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

  const debugConfirmedOrders = async (vendorId: string) => {
    console.log('🔧 Starting debug for vendor:', vendorId);
    
    // Step 1: Check if vendor has any order items at all
    const { data: allItems } = await supabase
      .from('order_items')
      .select('id, item_status, vendor_id, product_name')
      .eq('vendor_id', vendorId);
    console.log('Step 1 - All order items:', allItems);
    
    // Step 2: Check confirmed order items
    const { data: confirmedItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('item_status', 'confirmed');
    console.log('Step 2 - Confirmed items:', confirmedItems);
    
    // Step 3: Check delivery_partner_orders table
    const { data: deliveryOrders } = await supabase
      .from('delivery_partner_orders')
      .select('*');
    console.log('Step 3 - All delivery orders:', deliveryOrders);
    
    // Step 4: Try simple join
    if (confirmedItems && confirmedItems.length > 0) {
      const { data: withOrders } = await supabase
        .from('order_items')
        .select(`
          *,
          orders(id, order_number, customer_id, delivery_address)
        `)
        .eq('vendor_id', vendorId)
        .eq('item_status', 'confirmed');
      console.log('Step 4 - With orders join:', withOrders);
    }
  };

  const loadConfirmedOrders = async (vendorId: string) => {
    try {
      setConfirmedOrdersLoading(true);
      
      // Try to load from vendor_confirmed_orders view first
      const { data: viewData, error: viewError } = await supabase
        .from('vendor_confirmed_orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('order_date', { ascending: false });

      if (!viewError && viewData) {
        const processedOrders = viewData.map((order: any) => ({
          id: order.order_id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          order_date: order.order_date,
          delivery_date: order.delivery_date,
          total_amount: order.total_amount,
          delivery_address: order.delivery_address,
          order_status: order.order_status,
          item_id: order.item_id,
          item_status: order.item_status,
          quantity: order.quantity,
          unit_price: order.unit_price,
          phone_model: order.phone_model,
          quality_category: order.quality_category,
          delivery_partner_id: order.delivery_partner_id,
          delivery_status: order.delivery_status,
          pickup_otp: order.pickup_otp,
          delivery_otp: order.delivery_otp
        }));

        setConfirmedOrders(processedOrders);
        return;
      }

      // Fallback to manual query if view fails
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner(
            id,
            order_number,
            customer_id,
            order_date,
            delivery_date,
            delivery_address,
            total_amount,
            status,
            customers!inner(
              profiles!inner(full_name, phone)
            )
          ),
          smartphone_models(model_name),
          quality_categories(name),
          delivery_partner_orders(
            delivery_partner_id,
            status,
            pickup_otp,
            delivery_otp
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('❌ Manual query also failed:', itemsError);
        throw itemsError;
      }

      const processedOrders = orderItems?.map((item: any) => ({
        id: item.orders.id,
        order_number: item.orders.order_number,
        customer_name: item.orders.customers?.profiles?.full_name || 'Unknown Customer',
        order_date: item.orders.order_date,
        delivery_date: item.orders.delivery_date,
        total_amount: item.orders.total_amount,
        delivery_address: item.orders.delivery_address,
        order_status: item.orders.status,
        item_id: item.id,
        item_status: item.status,
        quantity: item.quantity,
        unit_price: item.unit_price,
        phone_model: item.smartphone_models?.model_name || 'Unknown Model',
        quality_category: item.quality_categories?.name || 'Unknown Quality',
        delivery_partner_id: item.delivery_partner_orders?.[0]?.delivery_partner_id || null,
        delivery_status: item.delivery_partner_orders?.[0]?.status || 'pending',
        pickup_otp: item.delivery_partner_orders?.[0]?.pickup_otp || null,
        delivery_otp: item.delivery_partner_orders?.[0]?.delivery_otp || null
      })) || [];

      setConfirmedOrders(processedOrders);

    } catch (error) {
      console.error('💥 Error loading confirmed orders:', error);
      setConfirmedOrders([]);
    } finally {
      setConfirmedOrdersLoading(false);
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

  // Real-time delivery status monitoring
  useEffect(() => {
    if (!vendor?.id) return;

    const handleDeliveryStatusChange = (payload: any) => {
      console.log('Delivery status change:', payload);
      
      const { new: newRecord } = payload;
      if (newRecord.status) {
        // Show notification for status changes
        const statusMessages = {
          'accepted': 'Delivery partner accepted the order',
          'picked_up': 'Order has been picked up',
          'out_for_delivery': 'Order is out for delivery',
          'delivered': 'Order has been delivered successfully!'
        };
        
        const message = statusMessages[newRecord.status as keyof typeof statusMessages];
        if (message) {
          toast.success(message);
          // Refresh data to get latest status
          refreshData();
        }
      }
    };

    // Subscribe to delivery assignment changes
    const deliverySubscription = supabase
      .channel('delivery_partner_orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_partner_orders',
          filter: `vendor_id=eq.${vendor.id}`
        },
        handleDeliveryStatusChange
      )
      .subscribe();

    return () => {
      deliverySubscription.unsubscribe();
    };
  }, [vendor?.id, refreshData]);

  const handleOrderAction = async (orderItemId: string, action: 'accept' | 'reject') => {
    try {
      const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';
      
      const { success, error } = await TryodoAPI.Order.updateOrderItemStatus(
        orderItemId,
        newStatus
      );

      if (!success) throw new Error(error || 'Failed to update order item status');

      // If order is confirmed, create delivery assignment
      if (action === 'accept' && vendor) {
        try {
          const orderToConfirm = pendingOrders.find(order => order.order_item_id === orderItemId);
          if (orderToConfirm) {
            const customerPincode = orderToConfirm.delivery_address?.pincode;
            if (customerPincode) {
              const deliveryResult = await DeliveryAPI.Assignment.createAssignmentFromOrder(
                orderItemId,
                orderToConfirm.order_id,
                vendor.id,
                customerPincode,
                'normal'
              );

              if (deliveryResult.success) {
                const data = deliveryResult.data;
                toast.success(`Order confirmed! Delivery assignment created successfully.`);
                
                // Show OTPs if they were generated
                if (data?.pickupOtp && data?.deliveryOtp) {
                  toast.success(`Pickup OTP: ${data.pickupOtp} | Delivery OTP: ${data.deliveryOtp}`, {
                    duration: 10000, // Show for 10 seconds
                  });
                }
              } else {
                toast.warning(`Order confirmed, but failed to create delivery assignment: ${deliveryResult.error}`);
              }
            } else {
              toast.warning('Order confirmed! Unable to assign delivery partner automatically - missing customer pincode.');
            }
          }
        } catch (deliveryError: any) {
          console.error('Error creating delivery assignment:', deliveryError);
          toast.warning(`Order confirmed! Could not create delivery assignment automatically: ${deliveryError.message}`);
        }
      } else {
        toast.success(`Order ${action === 'accept' ? 'confirmed' : 'rejected'} successfully`);
      }

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
      
      // const { error } = await supabase
      //   .from('order_items')
      //   .update({ 
      //     item_status: newStatus,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('id', orderItemId);

      // if (error) throw error;

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

  const handleAssignToDelivery = async (order: ConfirmedOrder) => {
    if (!vendor) {
      toast.error("Vendor information is not available.");
      return;
    }
    try {
      const customerPincode = order.delivery_address?.pincode;
      if (!customerPincode) {
        toast.error("Cannot assign delivery: Customer pincode is missing.");
        return;
      }

      const deliveryResult = await DeliveryAPI.Assignment.createAssignmentFromOrder(
        order.order_item_id,
        order.order_id,
        vendor.id,
        customerPincode,
        'normal'
      );

      if (deliveryResult.success) {
        toast.success('Order assigned to delivery partner successfully.');
        await refreshData();
      } else {
        toast.error(`Failed to assign order to delivery: ${deliveryResult.error}`);
      }
    } catch (error: any) {
      toast.error(`Failed to assign order to delivery: ${error.message}`);
    }
  };

  const showOtpDetails = (order: ConfirmedOrder, type: 'pickup' | 'delivery') => {
    setSelectedOrderForOtp(order);
    setOtpType(type);
    setShowOtpDialog(true);
  };

  const generateMissingOTP = async (orderId: string, type: 'pickup' | 'delivery') => {
    try {
      // First try the API generateOTP function
      const result = await DeliveryAPI.generateOTP(orderId, type);
      
      if (result.success) {
        toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} OTP generated successfully`);
        await refreshData(); // Refresh to get the new OTP
      } else {
        // If the API function fails, try direct database update
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { error } = await supabase
          .from('delivery_partner_orders')
          .update({
            [type === 'pickup' ? 'pickup_otp' : 'delivery_otp']: newOtp,
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (error) throw error;
        
        toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} OTP generated: ${newOtp}`);
        await refreshData();
      }
    } catch (error: any) {
      toast.error(`Error generating ${type} OTP: ${error.message}`);
    }
  };

  const getDeliveryStatusBadge = (order: ConfirmedOrder) => {
    const status = order.current_status || order.item_status;
    
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Order Confirmed
          </Badge>
        );
      case 'assigned_to_delivery':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <Truck className="mr-1 h-3 w-3" />
            Assigned to Delivery
          </Badge>
        );
      case 'picked_up':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            <Package className="mr-1 h-3 w-3" />
            Out for Delivery
          </Badge>
        );
      case 'out_for_delivery':
         return (
          <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
            <Package className="mr-1 h-3 w-3" />
            Out for Delivery
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Delivered Successfully
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getDeliveryFlowStep = (order: ConfirmedOrder) => {
    const status = order.current_status || order.item_status;
    
    const steps = [
      { key: 'confirmed', label: 'Order Confirmed', completed: true },
      { key: 'assigned_to_delivery', label: 'Assigned to Delivery', completed: !!order.delivery_partner_id },
      { key: 'picked_up', label: 'Picked Up', completed: !!order.picked_up_at },
      { key: 'out_for_delivery', label: 'Out for Delivery', completed: !!order.out_for_delivery_at },
      { key: 'delivered', label: 'Delivered', completed: !!order.delivered_at }
    ];

    const currentStepIndex = steps.findIndex(step => step.key === status);
    
    return {
      steps: steps.map((step, index) => ({
        ...step,
        active: index === currentStepIndex,
        completed: step.completed || index < currentStepIndex
      })),
      currentStep: currentStepIndex + 1,
      totalSteps: steps.length
    };
  };

  const renderDeliveryProgress = (order: ConfirmedOrder) => {
    const { steps } = getDeliveryFlowStep(order);
    
    return (
      <div className="space-y-3">
        <h6 className="font-medium text-gray-800 flex items-center">
          <Target className="w-4 h-4 mr-2" />
          Delivery Progress
        </h6>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.active 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
              }`}>
                {step.completed ? (
                  <Check className="w-3 h-3" />
                ) : step.active ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                )}
              </div>
              <span className={`text-sm ${
                step.completed 
                  ? 'text-green-700 font-medium' 
                  : step.active 
                    ? 'text-blue-700 font-medium' 
                    : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {step.active && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'N/A';
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
              {/* Delivery Status Notifications */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {confirmedOrders.filter(o => ['assigned_to_delivery', 'picked_up', 'out_for_delivery'].includes(o.current_status)).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </Button>
              </div>

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
            {/* Delivery Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Awaiting Delivery</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {confirmedOrders.filter(o => o.current_status === 'confirmed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need assignment</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                  <Truck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {confirmedOrders.filter(o => o.current_status === 'assigned_to_delivery').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Ready for pickup</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
                  <Package className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {confirmedOrders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.current_status)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">In transit</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {confirmedOrders.filter(o => o.current_status === 'delivered').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Successfully completed</p>
                </CardContent>
              </Card>
            </div>

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
                      <Card key={order.order_item_id} className="overflow-hidden">
                        <div className={`p-4 ${!order.delivery_partner_id ? 'bg-yellow-50' : 'bg-green-50'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg">{order.product_name}</h4>
                              <p className="text-sm text-gray-500">Order #{order.order_number}</p>
                              <p className="text-sm text-gray-500">
                                Confirmed: {formatTimeAgo(order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              {getDeliveryStatusBadge(order)}
                              <p className="font-bold text-xl mt-1">₹{order.line_total.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="border-t p-4 space-y-4">
                          {/* Delivery Progress Bar */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            {renderDeliveryProgress(order)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <h5 className="font-semibold text-gray-800 mb-2 flex items-center"><User className="w-4 h-4 mr-2" /> Customer Details</h5>
                              <div className="space-y-1 text-sm">
                                <p><span className="font-medium">Name:</span> {order.customer_name || 'N/A'}</p>
                                <p><span className="font-medium">Phone:</span> {order.customer_phone || 'N/A'}</p>
                                <p><span className="font-medium">Address:</span> {order.delivery_address.street_address}, {order.delivery_address.city}, {order.delivery_address.state} - {order.delivery_address.pincode}</p>
                              </div>
                            </div>

                            {order.delivery_partner_id ? (
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-2 flex items-center"><Truck className="w-4 h-4 mr-2" /> Delivery Partner</h5>
                                <div className="space-y-2">
                                  <div className="text-sm space-y-1">
                                    <p><span className="font-medium">Name:</span> {order.delivery_partner_name || 'N/A'}</p>
                                    <p><span className="font-medium">Phone:</span> {order.delivery_partner_phone || 'N/A'}</p>
                                    {order.delivery_assigned_at && (
                                      <p><span className="font-medium">Assigned:</span> {formatTimeAgo(order.delivery_assigned_at)}</p>
                                    )}
                                  </div>
                                  
                                                                     {/* OTP Section */}
                                   <div className="space-y-2">
                                     {/* Debug info */}
                                     {process.env.NODE_ENV === 'development' && (
                                       <div className="text-xs text-gray-400 bg-gray-100 p-1 rounded">
                                         Debug: pickup_otp={order.pickup_otp}, delivery_otp={order.delivery_otp}
                                       </div>
                                     )}
                                     
                                     {order.pickup_otp ? (
                                       <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded p-2">
                                         <div>
                                           <p className="text-xs font-medium text-yellow-800">Pickup OTP</p>
                                           <p className="text-lg font-bold text-yellow-900">{order.pickup_otp}</p>
                                         </div>
                                         <Button size="sm" variant="outline" onClick={() => showOtpDetails(order, 'pickup')}>
                                           <KeyRound className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     ) : order.delivery_partner_id ? (
                                       <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-2">
                                         <div>
                                           <p className="text-xs font-medium text-red-800">Pickup OTP Missing</p>
                                           <p className="text-sm text-red-600">OTP not generated</p>
                                         </div>
                                         <Button size="sm" variant="outline" onClick={() => generateMissingOTP(order.order_id, 'pickup')}>
                                           <RefreshCw className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     ) : null}
                                     
                                     {order.delivery_otp ? (
                                       <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
                                         <div>
                                           <p className="text-xs font-medium text-green-800">Delivery OTP</p>
                                           <p className="text-lg font-bold text-green-900">{order.delivery_otp}</p>
                                         </div>
                                         <Button size="sm" variant="outline" onClick={() => showOtpDetails(order, 'delivery')}>
                                           <KeyRound className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     ) : order.delivery_partner_id ? (
                                       <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-2">
                                         <div>
                                           <p className="text-xs font-medium text-red-800">Delivery OTP Missing</p>
                                           <p className="text-sm text-red-600">OTP not generated</p>
                                         </div>
                                         <Button size="sm" variant="outline" onClick={() => generateMissingOTP(order.order_id, 'delivery')}>
                                           <RefreshCw className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     ) : null}
                                   </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start justify-center p-4 bg-gray-50 rounded-lg">
                                 <h5 className="font-semibold text-gray-800 mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" /> No Delivery Partner Assigned</h5>
                                 <p className="text-sm text-gray-600 mb-3">This order is waiting for a delivery partner to be assigned.</p>
                                 <Button size="sm" onClick={() => handleAssignToDelivery(order)}>
                                   <RefreshCw className="mr-2 h-4 w-4" /> Try to Assign Now
                                 </Button>
                              </div>
                            )}

                            {/* Order Timeline */}
                            <div>
                              <h5 className="font-semibold text-gray-800 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-2" /> Timeline</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Order Confirmed:</span>
                                  <span className="font-medium">{formatTimeAgo(order.created_at)}</span>
                                </div>
                                {order.delivery_assigned_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Assigned for Delivery:</span>
                                    <span className="font-medium">{formatTimeAgo(order.delivery_assigned_at)}</span>
                                  </div>
                                )}
                                {order.picked_up_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Picked Up:</span>
                                    <span className="font-medium">{formatTimeAgo(order.picked_up_at)}</span>
                                  </div>
                                )}
                                {order.out_for_delivery_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Out for Delivery:</span>
                                    <span className="font-medium">{formatTimeAgo(order.out_for_delivery_at)}</span>
                                  </div>
                                )}
                                {order.delivered_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Delivered:</span>
                                    <span className="font-medium text-green-600">{formatTimeAgo(order.delivered_at)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <Separator />
                          
                          <div className="flex justify-between items-center">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedOrderItem(order.order_item_id); setVendorNotes(order.vendor_notes || ''); }}>
                                <Edit className="mr-2 h-4"/> Add/Edit Notes
                              </Button>
                              {order.delivery_partner_id && order.delivery_partner_phone && (
                                <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.delivery_partner_phone}`)}>
                                  <Phone className="mr-2 h-4 w-4"/> Call Delivery Partner
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">Last updated: {formatTimeAgo(order.updated_at)}</p>
                          </div>

                        </div>

                        {selectedOrderItem === order.order_item_id && (
                           <div className="p-4 border-t bg-gray-50">
                              <Label htmlFor="vendor-notes">Vendor Notes</Label>
                              <Textarea
                                id="vendor-notes"
                                value={vendorNotes}
                                onChange={(e) => setVendorNotes(e.target.value)}
                                placeholder="Add internal notes for this order..."
                                className="mb-2"
                              />
                              <Button size="sm" onClick={() => handleOrderStatusUpdate(order.order_item_id, order.item_status, undefined, vendorNotes)}>
                                Save Notes
                              </Button>
                           </div>
                        )}

                      </Card>
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

        {/* Enhanced OTP Display Dialog */}
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                {otpType === 'pickup' ? 'Pickup Verification OTP' : 'Delivery Verification OTP'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {selectedOrderForOtp && (
                <>
                  {/* OTP Display */}
                  <div className="text-center">
                    <div className={`text-4xl font-bold rounded-lg p-6 mb-4 ${
                      otpType === 'pickup' 
                        ? 'text-yellow-700 bg-yellow-50 border-2 border-yellow-200' 
                        : 'text-green-700 bg-green-50 border-2 border-green-200'
                    }`}>
                      {otpType === 'pickup' ? selectedOrderForOtp.pickup_otp : selectedOrderForOtp.delivery_otp}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      otpType === 'pickup' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {otpType === 'pickup' ? '📦 For Pickup' : '🚚 For Delivery'}
                    </div>
                  </div>

                  {/* Order Information */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-800 border-b pb-2">Order Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Order Number:</span>
                        <p className="font-medium">#{selectedOrderForOtp.order_number}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium">₹{selectedOrderForOtp.line_total.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <p className="font-medium">{selectedOrderForOtp.customer_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-medium">{selectedOrderForOtp.customer_phone || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {selectedOrderForOtp.delivery_partner_name && (
                      <div className="border-t pt-3 mt-3">
                        <span className="text-gray-600">Delivery Partner:</span>
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <p className="font-medium">{selectedOrderForOtp.delivery_partner_name}</p>
                            <p className="text-sm text-gray-600">{selectedOrderForOtp.delivery_partner_phone}</p>
                          </div>
                          {selectedOrderForOtp.delivery_partner_phone && (
                            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${selectedOrderForOtp.delivery_partner_phone}`)}>
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Usage Instructions */}
                  <div className={`rounded-lg p-4 ${
                    otpType === 'pickup' 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Usage Instructions
                    </h4>
                    <div className="text-sm space-y-1">
                      {otpType === 'pickup' ? (
                        <>
                          <p>• Share this OTP with the delivery partner when they arrive for pickup</p>
                          <p>• Verify the delivery partner's identity before sharing the OTP</p>
                          <p>• Only provide the OTP after confirming the order items</p>
                        </>
                      ) : (
                        <>
                          <p>• This OTP will be used by the delivery partner for customer delivery</p>
                          <p>• Customer will provide this OTP to confirm delivery receipt</p>
                          <p>• Order will be marked as delivered once OTP is verified</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        const otp = otpType === 'pickup' ? selectedOrderForOtp.pickup_otp : selectedOrderForOtp.delivery_otp;
                        navigator.clipboard.writeText(otp || '');
                        toast.success('OTP copied to clipboard');
                      }}
                      className="flex-1"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy OTP
                    </Button>
                    
                    {selectedOrderForOtp.delivery_partner_phone && (
                      <Button 
                        onClick={() => {
                          const message = `Order #${selectedOrderForOtp.order_number} - ${otpType === 'pickup' ? 'Pickup' : 'Delivery'} OTP: ${otpType === 'pickup' ? selectedOrderForOtp.pickup_otp : selectedOrderForOtp.delivery_otp}`;
                          window.open(`sms:${selectedOrderForOtp.delivery_partner_phone}?body=${encodeURIComponent(message)}`);
                        }}
                        className="flex-1"
                        variant="outline"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Send SMS
                      </Button>
                    )}
                  </div>

                  <Button 
                    onClick={() => setShowOtpDialog(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VendorDashboard;

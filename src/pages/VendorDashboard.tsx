import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, ShoppingCart, Users, Plus, Eye, Edit, Trash2, 
  Search, Filter, BarChart3, DollarSign, AlertTriangle, CheckCircle, 
  Clock, Settings, Bell, Timer, Check, X, RefreshCw, Calendar,
  PlayCircle, PauseCircle, Target, Truck, MapPin, User, Phone, Copy,
  XCircle, AlertCircle, Star
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
import { Progress } from '@/components/ui/progress';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
  _debug?: {
    hasOrderData: boolean;
    hasCustomerData: boolean;
    isOrphaned: boolean;
    rlsIssue: boolean;
  };
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const RADIAN = Math.PI / 180;

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
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrdersLoading, setConfirmedOrdersLoading] = useState(false);

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
      initializeVendorDashboard();
    }
  }, [user, profile]);

  // Initialize the vendor dashboard by fetching vendor info and then loading all data
  const initializeVendorDashboard = async () => {
    try {
      console.log('VendorDashboard: Initializing with profile:', profile);
      setError(null);
      setLoading(true);

      // First, get the vendor record using the profile ID
      const vendorData = await fetchVendorByProfileId(profile!.id);
      console.log('VendorDashboard: Vendor data received:', vendorData);
      
      if (!vendorData) {
        console.error('VendorDashboard: No vendor data found for profile ID:', profile!.id);
        setError('Vendor account not found. Please contact support.');
        return;
      }

      console.log('VendorDashboard: Setting vendor data:', vendorData);
      setVendor(vendorData);
      setVendorSettings({
        auto_approve_orders: vendorData.auto_approve_orders,
        order_confirmation_timeout_minutes: vendorData.order_confirmation_timeout_minutes,
        auto_approve_under_amount: vendorData.auto_approve_under_amount,
        business_hours_start: vendorData.business_hours_start,
        business_hours_end: vendorData.business_hours_end,
        auto_approve_during_business_hours_only: vendorData.auto_approve_during_business_hours_only
      });

      console.log('VendorDashboard: Loading dashboard data for vendor ID:', vendorData.id);
      // Load all dashboard data in parallel
      const results = await Promise.allSettled([
        loadPendingOrders(vendorData.id),
        loadConfirmedOrders(vendorData.id),
        loadAnalytics(vendorData.id)
      ]);

      console.log('VendorDashboard: Data loading results:', results);

    } catch (error) {
      console.error('Error initializing vendor dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendor information by profile ID
  const fetchVendorByProfileId = async (profileId: string): Promise<Vendor | null> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          contact_person,
          business_email,
          contact_phone,
          business_address,
          business_city,
          business_state,
          business_pincode,
          rating,
          total_reviews,
          is_verified,
          auto_approve_orders,
          order_confirmation_timeout_minutes,
          auto_approve_under_amount,
          business_hours_start,
          business_hours_end,
          auto_approve_during_business_hours_only
        `)
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .single();

      if (error && error.code === 'PGRST116') {
        // No vendor record found, let's create one for existing vendor users
        console.log('🏪 No vendor record found, creating one for profile:', profileId);
        
        // Get profile information to use for vendor creation
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', profileId)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile for vendor creation:', profileError);
          return null;
        }

        // Create vendor record with default values
        const vendorData = {
          profile_id: profileId,
          business_name: profileData.full_name === 'Rohan' ? 'Rohan Communication' : (profileData.full_name || 'Business') + "'s Business",
          contact_person: profileData.full_name || 'Business Owner',
          business_email: profileData.email,
          contact_phone: null,
          business_address: null,
          business_city: null,
          business_state: null,
          business_pincode: null,
          rating: 0,
          total_reviews: 0,
          total_sales: 0,

          shipping_policy: null,
          return_policy: null,
          is_verified: false,
          is_active: true,
          joined_at: new Date().toISOString(),
          auto_approve_orders: false,
          order_confirmation_timeout_minutes: 15,
          auto_approve_under_amount: null,
          business_hours_start: '09:00:00',
          business_hours_end: '18:00:00',
          auto_approve_during_business_hours_only: true
        };

        const { data: newVendor, error: createError } = await supabase
          .from('vendors')
          .insert(vendorData)
          .select(`
            id,
            business_name,
            contact_person,
            business_email,
            contact_phone,
            business_address,
            business_city,
            business_state,
            business_pincode,
            rating,
            total_reviews,
            is_verified,
            auto_approve_orders,
            order_confirmation_timeout_minutes,
            auto_approve_under_amount,
            business_hours_start,
            business_hours_end,
            auto_approve_during_business_hours_only
          `)
          .single();

        if (createError) {
          console.error('Error creating vendor record:', createError);
          return null;
        }

        console.log('✅ Vendor record created successfully:', newVendor);
        
        // Map the database fields to the Vendor interface
        return {
          id: newVendor.id,
          business_name: newVendor.business_name || '',
          contact_person: newVendor.contact_person || '',
          email: newVendor.business_email || '',
          phone: newVendor.contact_phone || '',
          address: newVendor.business_address || '',
          city: newVendor.business_city || '',
          state: newVendor.business_state || '',
          pincode: newVendor.business_pincode || '',
          rating: newVendor.rating || 0,
          total_reviews: newVendor.total_reviews || 0,
          is_verified: newVendor.is_verified || false,
          auto_approve_orders: newVendor.auto_approve_orders || false,
          order_confirmation_timeout_minutes: newVendor.order_confirmation_timeout_minutes || 15,
          auto_approve_under_amount: newVendor.auto_approve_under_amount,
          business_hours_start: newVendor.business_hours_start || '09:00',
          business_hours_end: newVendor.business_hours_end || '18:00',
          auto_approve_during_business_hours_only: newVendor.auto_approve_during_business_hours_only || true
        };
      } else if (error) {
        console.error('Error fetching vendor:', error);
        return null;
      }

      // Map the database fields to the Vendor interface
      return {
        id: data.id,
        business_name: data.business_name || '',
        contact_person: data.contact_person || '',
        email: data.business_email || '',
        phone: data.contact_phone || '',
        address: data.business_address || '',
        city: data.business_city || '',
        state: data.business_state || '',
        pincode: data.business_pincode || '',
        rating: data.rating || 0,
        total_reviews: data.total_reviews || 0,
        is_verified: data.is_verified || false,
        auto_approve_orders: data.auto_approve_orders || false,
        order_confirmation_timeout_minutes: data.order_confirmation_timeout_minutes || 15,
        auto_approve_under_amount: data.auto_approve_under_amount,
        business_hours_start: data.business_hours_start || '09:00',
        business_hours_end: data.business_hours_end || '18:00',
        auto_approve_during_business_hours_only: data.auto_approve_during_business_hours_only || true
      };
    } catch (error) {
      console.error('Error in fetchVendorByProfileId:', error);
      return null;
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

      // ---------------------------------------------
      // 1) Try optimized view: vendor_confirmed_orders
      // ---------------------------------------------
      try {
        const { data: viewData, error: viewErr } = await supabase
          .from('vendor_confirmed_orders')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('order_date', { ascending: false });

        if (!viewErr && viewData && viewData.length > 0) {
          const processedView = viewData.map((o: any) => ({
            order_id: o.order_id,
            order_number: o.order_number,
            customer_id: o.customer_id || 'unknown',
            customer_name: o.customer_name || null,
            customer_phone: o.customer_phone || null,
            total_amount: o.total_amount ?? o.line_total,
            order_status: o.order_status || 'confirmed',
            payment_status: o.payment_status || 'paid',
            created_at: o.order_date || o.created_at,
            delivery_address: o.delivery_address || {},
            order_item_id: o.item_id,
            vendor_id: vendorId,
            product_name: o.product_name || null,
            product_description: o.product_description || null,
            unit_price: o.unit_price || 0,
            quantity: o.quantity || 1,
            line_total: o.line_total || o.total_amount,
            item_status: o.item_status || 'confirmed',
            picked_up_at: o.picked_up_at || null,
            pickup_confirmed_by: o.pickup_confirmed_by || null,
            vendor_notes: o.vendor_notes || null,
            updated_at: o.updated_at || o.order_date,
            delivery_partner_id: o.delivery_partner_id || null,
            delivery_partner_name: o.delivery_partner_name || null,
            delivery_partner_phone: o.delivery_partner_phone || null,
            pickup_otp: o.pickup_otp || null,
            delivery_otp: o.delivery_otp || null,
            delivered_at: o.delivered_at || null,
            delivery_assigned_at: o.delivery_assigned_at || null,
            out_for_delivery_at: o.out_for_delivery_at || null,
            current_status: (o.delivery_status as any) || 'confirmed',
          })) as ConfirmedOrder[];

          setConfirmedOrders(processedView);
          return; // ✅ Done – skip the fallback query
        }
      } catch (viewCatchErr) {
        console.warn('VendorDashboard: View vendor_confirmed_orders not available or failed – falling back to manual query', viewCatchErr);
      }

      // ---------------------------------------------
      // 2) Fallback – original deep join query
      // ---------------------------------------------
      // 1) fetch confirmed order items with nested order and customers (without profiles)
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          vendor_id,
          product_name,
          product_description,
          unit_price,
          quantity,
          line_total,
          item_status,
          picked_up_at,
          pickup_confirmed_by,
          vendor_notes,
          created_at,
          updated_at,
          orders (
            id,
            order_number,
            customer_id,
            total_amount,
            order_status,
            payment_status,
            delivery_address,
            created_at,
            customers ( id, profile_id ),
            delivery_partner_orders (
              delivery_partner_id,
              status,
              pickup_otp,
              delivery_otp,
              accepted_at,
              picked_up_at,
              delivered_at,
              delivery_partners ( profiles ( full_name, phone ) )
            )
          )
        `)
        .eq('vendor_id', vendorId)
        .in('item_status', ['confirmed', 'processing', 'packed', 'picked_up', 'shipped', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setConfirmedOrders([]);
        return;
      }

      // 2) collect unique customer profile_ids to fetch names/phones
      const profileIds: string[] = [];
      data.forEach((item: any) => {
        const pId = item.orders?.customers?.profile_id;
        if (pId) profileIds.push(pId);
      });
      const uniqueProfileIds = Array.from(new Set(profileIds));
      let profilesMap: Record<string, { full_name: string | null; phone: string | null }> = {};
      if (uniqueProfileIds.length) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', uniqueProfileIds);
        if (!profilesErr && profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = { full_name: p.full_name, phone: p.phone };
          });
        }
      }

      const processed: ConfirmedOrder[] = data.map((item: any) => {
        const order = item.orders;
        const customer = order?.customers || null;
        const profileInfo = customer?.profile_id ? profilesMap[customer.profile_id] : undefined;

        const deliveryRecord = order?.delivery_partner_orders?.[0] || null;
        const deliveryPartnerProfile = Array.isArray(deliveryRecord?.delivery_partners?.profiles)
          ? deliveryRecord.delivery_partners.profiles[0]
          : deliveryRecord?.delivery_partners?.profiles || null;

        let currentStatus: ConfirmedOrder['current_status'] = 'confirmed';
        if (deliveryRecord) {
          switch (deliveryRecord.status) {
            case 'accepted':
              currentStatus = 'assigned_to_delivery';
              break;
            case 'picked_up':
              currentStatus = 'out_for_delivery';
              break;
            case 'delivered':
              currentStatus = 'delivered';
              break;
            default:
              currentStatus = 'assigned_to_delivery';
          }
        }

        return {
          order_id: order?.id || item.order_id,
          order_number: order?.order_number || `ORD-${item.order_id.slice(0, 8).toUpperCase()}`,
          customer_id: customer?.id || order?.customer_id || 'unknown',
          customer_name: profileInfo?.full_name || null,
          customer_phone: profileInfo?.phone || null,
          total_amount: order?.total_amount ?? item.line_total,
          order_status: order?.order_status || 'confirmed',
          payment_status: order?.payment_status || 'paid',
          created_at: order?.created_at || item.created_at,
          delivery_address: order?.delivery_address || {},
          order_item_id: item.id,
          vendor_id: item.vendor_id,
          product_name: item.product_name,
          product_description: item.product_description,
          unit_price: item.unit_price,
          quantity: item.quantity,
          line_total: item.line_total,
          item_status: item.item_status,
          picked_up_at: item.picked_up_at,
          pickup_confirmed_by: item.pickup_confirmed_by,
          vendor_notes: item.vendor_notes,
          updated_at: item.updated_at,
          delivery_partner_id: deliveryRecord?.delivery_partner_id || null,
          delivery_partner_name: deliveryPartnerProfile?.full_name || null,
          delivery_partner_phone: deliveryPartnerProfile?.phone || null,
          pickup_otp: deliveryRecord?.pickup_otp || null,
          delivery_otp: deliveryRecord?.delivery_otp || null,
          delivered_at: deliveryRecord?.delivered_at || null,
          delivery_assigned_at: deliveryRecord?.accepted_at || null,
          out_for_delivery_at: deliveryRecord?.picked_up_at || null,
          current_status: currentStatus,
        } as ConfirmedOrder;
      });

      setConfirmedOrders(processed);
    } catch (err) {
      console.error('Error loading confirmed orders:', err);
      toast.error('Failed to load confirmed orders');
      setConfirmedOrders([]);
    } finally {
      setConfirmedOrdersLoading(false);
    }
  };

  const loadAnalytics = async (vendorId: string) => {
    try {
      console.log('VendorDashboard: Loading analytics for vendor ID:', vendorId);
      
      // Get product count
      const { count: productCount } = await supabase
        .from('vendor_products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      console.log('VendorDashboard: vendor_products count:', productCount);

      const { count: genericProductCount } = await supabase
        .from('vendor_generic_products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      console.log('VendorDashboard: vendor_generic_products count:', genericProductCount);

      // Get order statistics
      const { data: orderStats } = await supabase
        .from('order_items')
        .select('item_status, line_total, created_at')
        .eq('vendor_id', vendorId);

      console.log('VendorDashboard: order_items data:', orderStats);

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

      const analyticsData = {
        totalProducts,
        totalOrders,
        pendingOrders: pendingOrdersCount,
        confirmedOrders,
        totalRevenue,
        averageOrderValue,
        responseRate,
        autoApprovalRate: vendor?.auto_approve_orders ? 85 : 0 // Placeholder calculation
      };

      console.log('VendorDashboard: Setting analytics data:', analyticsData);
      setAnalytics(analyticsData);

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

      // If order is confirmed, try to create delivery assignment
      if (action === 'accept' && vendor) {
        const orderToConfirm = pendingOrders.find(order => order.order_item_id === orderItemId);
        if (orderToConfirm) {
          console.log('VendorDashboard: Attempting to create delivery assignment for order:', orderToConfirm);
          
          try {
            const customerPincode = orderToConfirm.delivery_address?.pincode || 
                                   orderToConfirm.delivery_address?.postal_code ||
                                   orderToConfirm.delivery_address?.zip_code;
            
            if (customerPincode) {
              const deliveryResult = await DeliveryAPI.Assignment.createAssignmentFromOrder(
                orderItemId,
                orderToConfirm.order_id,
                vendor.id,
                customerPincode,
                'normal'
              );

              console.log('VendorDashboard: Delivery assignment result:', deliveryResult);

              if (deliveryResult.success) {
                toast.success(`Order confirmed! Delivery assignment created successfully.`);
              } else {
                console.warn('VendorDashboard: Delivery assignment failed:', deliveryResult.error);
                // Don't fail the order confirmation if delivery assignment fails
                toast.success('Order confirmed successfully!');
                toast.info('Delivery assignment will be created when a delivery partner becomes available.');
              }
            } else {
              console.warn('VendorDashboard: Missing customer pincode for delivery assignment');
              console.log('VendorDashboard: Delivery address:', orderToConfirm.delivery_address);
              toast.success('Order confirmed successfully!');
              toast.warning('Delivery assignment pending - customer pincode is missing. Please ask customer to update their address.');
            }
          } catch (deliveryError: any) {
            console.error('VendorDashboard: Error creating delivery assignment:', deliveryError);
            // Don't fail the order confirmation if delivery assignment fails
            toast.success('Order confirmed successfully!');
            toast.info('Delivery assignment will be created shortly.');
          }
        } else {
          toast.success('Order confirmed successfully!');
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
      toast.success('Settings updated successfully!');
      refreshData();
      setShowSettingsDialog(false);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getTimeRemainingDisplay = (minutesRemaining: number) => {
    if (minutesRemaining <= 0) return 'Overdue';
    if (minutesRemaining < 60) return `${minutesRemaining} min left`;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    return `${hours}h ${minutes}m left`;
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

  const handleAssignToDelivery = async (order: ConfirmedOrder) => {
    if (!vendor) {
      toast.error("Vendor information is not available.");
      return;
    }
    try {
      console.log('🔍 VendorDashboard: Attempting manual delivery assignment for order:', order);
      console.log('🔍 VendorDashboard: Delivery address structure:', order.delivery_address);
      
      const customerPincode = order.delivery_address?.pincode || 
                             order.delivery_address?.postal_code ||
                             order.delivery_address?.zip_code ||
                             order.delivery_address?.pin_code;
                             
      console.log('🔍 VendorDashboard: Extracted pincode:', customerPincode);
      
      if (!customerPincode) {
        console.error('VendorDashboard: No pincode found in delivery address');
        toast.error("Cannot assign delivery: Customer pincode is missing. Please ask the customer to update their delivery address with a valid pincode.");
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

  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = (order.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'urgent') return matchesSearch && order.minutes_remaining <= 5;
    if (statusFilter === 'auto_approve') return matchesSearch && order.should_auto_approve;
    
    return matchesSearch;
  });

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
              if (profile?.role === 'vendor') {
                initializeVendorDashboard();
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
                {vendor?.business_name}
              </h1>
              <p className="text-gray-600 font-medium">Manage your orders and business settings</p>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Delivery Status Notifications */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="relative min-h-12 min-w-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <Bell className="h-4 w-4" />
                  {confirmedOrders.filter(o => ['assigned_to_delivery', 'picked_up', 'out_for_delivery'].includes(o.current_status)).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-pulse shadow-soft"></span>
                  )}
                </Button>
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
              
              <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4 rounded-xl shadow-strong">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">Order Management Settings</DialogTitle>
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
                        className="rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 min-h-12"
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
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center gap-2 min-h-12 px-6 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                onClick={() => navigate('/vendor/add-product')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Product</span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
            <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              <span className="hidden sm:inline">Pending</span> ({analytics.pendingOrders})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              <span className="hidden sm:inline">Confirmed</span> ({confirmedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-800">Pending Orders</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-orange-700">{analytics.pendingOrders}</div>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-800">Response Rate</CardTitle>
                  <Target className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-green-700">{analytics.responseRate.toFixed(1)}%</div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-800">Auto-Approval</CardTitle>
                  {vendor?.auto_approve_orders ? (
                    <PlayCircle className="h-5 w-5 text-blue-600" />
                  ) : (
                    <PauseCircle className="h-5 w-5 text-gray-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-blue-700">
                    {vendor?.auto_approve_orders ? 'ON' : 'OFF'}
                  </div>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    {vendor?.auto_approve_orders ? 'Auto-approving orders' : 'Manual approval required'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-800">Avg Order Value</CardTitle>
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-purple-700">₹{analytics.averageOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <p className="text-xs text-purple-600 font-medium mt-1">
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
                {/* Data Consistency Diagnostic Notice */}
                {confirmedOrders.length > 0 && (
                  (() => {
                    const orphanedCount = confirmedOrders.filter(o => o._debug?.isOrphaned).length;
                    const withCustomerData = confirmedOrders.filter(o => o._debug?.hasCustomerData).length;
                    
                    if (orphanedCount > 0) {
                      return (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-800">
                              Data Inconsistency Detected
                            </span>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            {orphanedCount} of {confirmedOrders.length} order items reference missing order records. 
                            {withCustomerData} orders have complete customer information.
                            Check console for orphaned order IDs that need database cleanup.
                          </p>
                        </div>
                      );
                    } else if (withCustomerData < confirmedOrders.length) {
                      return (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-800">
                              Partial Customer Data
                            </span>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            {withCustomerData} of {confirmedOrders.length} orders have complete customer information.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
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
                                <p><span className="font-medium">Address:</span> {
                                  order.delivery_address 
                                    ? `${order.delivery_address.street_address || ''}, ${order.delivery_address.city || ''}, ${order.delivery_address.state || ''} - ${order.delivery_address.pincode || ''}`
                                    : 'Address not available'
                                }</p>
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
                                  {order.pickup_otp && !order.picked_up_at && (
                                    <div className="mt-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="flex items-center gap-2 text-xs"
                                        onClick={() => {
                                          navigator.clipboard.writeText(order.pickup_otp!);
                                          toast.success('Pickup OTP copied to clipboard!');
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                        Pickup OTP: {order.pickup_otp}
                                      </Button>
                                    </div>
                                  )}
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
                    <Progress value={analytics.responseRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Auto-Approval Rate</span>
                      <span className="font-medium">{analytics.autoApprovalRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={analytics.autoApprovalRate} className="h-2" />
                  </div>
                  
                  {/* Monthly sales chart - Placeholder */}
                  {/*
                  <div className="mt-8">
                    <h3 className="font-semibold text-gray-800 mb-4">Monthly Sales Overview</h3>
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                      Sales chart placeholder
                    </div>
                  </div>
                  */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Products</CardTitle>
                <CardDescription>Manage your listed products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 mr-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      className="pl-10"
                      // value={productSearchTerm}
                      // onChange={(e) => setProductSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                    onClick={() => navigate('/vendor/add-product')}
                  >
                    <Plus className="h-4 w-4" />
                    Add New Product
                  </Button>
                </div>
                {/* Product List - Placeholder */}
                <div className="min-h-[200px] bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 border border-dashed">
                  Product listing coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VendorDashboard;

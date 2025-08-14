import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, TrendingUp, ShoppingCart, Users, Plus, Eye, Edit, Trash2,
  Search, Filter, BarChart3, DollarSign, AlertTriangle, CheckCircle,
  Clock, Settings, Bell, Timer, Check, X, RefreshCw, Calendar,
  PlayCircle, PauseCircle, Target, Truck, MapPin, User, Phone, Copy,
  XCircle, AlertCircle, Star, ChefHat
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
import { TryodoAPI, TransactionAPI, CommissionAPI, AnalyticsAPI, WalletAPI } from '@/lib/api';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import CancelledOrdersSection from '@/components/CancelledOrdersSection';

// Silence console.log in production build for this file
if (import.meta.env && import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.log = () => { };
}

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
  quality_type_name: string | null;
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
  quality_type_name: string | null;
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
  delivered_at: string | null | undefined;
  delivery_assigned_at: string | null | undefined;
  out_for_delivery_at: string | null | undefined;
  current_status: 'confirmed' | 'assigned_to_delivery' | 'out_for_delivery' | 'delivered';
  // Slot-related fields for slot-wise management
  slot_id: string | null;
  slot_name: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  slot_cutoff_time: string | null;
  delivery_date: string | null;
  sector_name: string | null;
  _debug?: {
    hasOrderData: boolean;
    hasCustomerData: boolean;
    isOrphaned: boolean;
    rlsIssue: boolean;
  };
}

interface DeliveredOrder {
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
  quality_type_name: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  picked_up_at: string | null;
  pickup_confirmed_by: string | null;
  vendor_notes: string | null;
  updated_at: string;
  delivery_partner_id: string | null;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
  delivered_at: string | null;
  delivery_assigned_at: string | null;
  out_for_delivery_at: string | null;
  rating?: number;
  customer_feedback?: string;
}

interface VendorSettings {
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount: number | null;
  business_hours_start: string;
  business_hours_end: string;
  auto_approve_during_business_hours_only: boolean;
}

interface FinancialSummary {
  total_sales: number;
  total_commission: number;
  net_earnings: number;
  pending_payouts: number;
  total_orders: number;
  total_products: number;
}

interface Analytics {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
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
  const { profile, loading: authLoading } = useAuth();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<ConfirmedOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    deliveredOrders: 0,
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'delivered' | 'cancelled'>('pending');
  const [loadedTabs, setLoadedTabs] = useState<{ [key: string]: boolean }>({ pending: true });

  // Financial data state
  // Wallet functionality removed
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [dailyEarnings, setDailyEarnings] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0); // New state for Today's Sales
  const [loadingDailyEarnings, setLoadingDailyEarnings] = useState(false);

  // Add new state for products
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Add state for enhanced analytics
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [loadingChartData, setLoadingChartData] = useState(false);



  useEffect(() => {
    if (profile?.id) {
      initializeVendorDashboard();
    }
  }, [profile, authLoading]);

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
      const results = await Promise.all([
        loadFinancialSummary(vendorData.id),
        loadPendingOrders(vendorData.id),
        loadConfirmedOrders(vendorData.id),
        loadVendorProducts(vendorData.id),
        loadFinancialData(vendorData.id),
        loadEnhancedAnalytics(vendorData.id),
        loadDailyEarnings(vendorData.id)
      ]);

      console.log('VendorDashboard: Data loading results:', results);

    } catch (error) {
      console.error('Error initializing vendor dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialSummary = async (vendorId: string) => {
    try {
      const response = await AnalyticsAPI.getVendorFinancialSummary(vendorId);

      if (response.success && response.data) {
        setFinancialSummary(response.data);

      } else {
        // Set default values to prevent showing zeros
        setFinancialSummary({
          total_sales: 0,
          total_commission: 0,
          net_earnings: 0,
          pending_payouts: 0,
          total_orders: 0,
          total_products: 0
        });
      }
    } catch (error: any) {
      toast.error("Failed to load financial summary: " + error.message);
      // Set default values to prevent showing zeros
      setFinancialSummary({
        total_sales: 0,
        total_commission: 0,
        net_earnings: 0,
        pending_payouts: 0,
        total_orders: 0,
        total_products: 0
      });
    }
  };

  // Fetch vendor information by profile ID
  const fetchVendorByProfileId = async (profileId: string): Promise<Vendor | null> => {
    try {
      // Ensure we have a valid session before making the API call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No valid session found:', sessionError);
        return null;
      }

      console.log('Making vendor query with session for profile:', profileId);

      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          business_registration,
          gstin,
          business_email,
          rating,
          total_reviews,
          total_sales,
          is_verified,
          auto_approve_orders,
          order_confirmation_timeout_minutes,
          auto_approve_under_amount,
          business_hours_start,
          business_hours_end,
          auto_approve_during_business_hours_only,
          joined_at,
          created_at,
          updated_at
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

        // Create vendor record with default values using only existing columns
        const vendorData = {
          profile_id: profileId,
          business_name: profileData.full_name === 'Rohan' ? 'Rohan Communication' : (profileData.full_name || 'Business') + "'s Business",
          business_registration: null,
          gstin: null,
          business_email: profileData.email,
          rating: 0,
          total_reviews: 0,
          total_sales: 0,
          is_verified: false,
          is_active: true,
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
            business_registration,
            gstin,
            business_email,
            rating,
            total_reviews,
            total_sales,
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
          contact_person: '', // Not available in database
          email: newVendor.business_email || '',
          phone: '', // Not available in database
          address: '', // Not available in database
          city: '', // Not available in database
          state: '', // Not available in database
          pincode: '', // Not available in database
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

        // If we get an RLS error, try with service role as fallback
        if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('permission')) {
          console.log('🔄 RLS error detected, trying with service role...');

          try {
            const { supabaseServiceRole } = await import('../lib/supabase');
            const { data: serviceData, error: serviceError } = await supabaseServiceRole
              .from('vendors')
              .select(`
                id,
                business_name,
                business_registration,
                gstin,
                business_email,
                rating,
                total_reviews,
                total_sales,
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

            if (!serviceError && serviceData) {
              // Continue with the normal flow using serviceData instead of data
              return {
                id: serviceData.id,
                business_name: serviceData.business_name || '',
                contact_person: '', // Not available in database
                email: serviceData.business_email || '',
                phone: '', // Not available in database
                address: '', // Not available in database
                city: '', // Not available in database
                state: '', // Not available in database
                pincode: '', // Not available in database
                rating: serviceData.rating || 0,
                total_reviews: serviceData.total_reviews || 0,
                is_verified: serviceData.is_verified || false,
                auto_approve_orders: serviceData.auto_approve_orders || false,
                order_confirmation_timeout_minutes: serviceData.order_confirmation_timeout_minutes || 15,
                auto_approve_under_amount: serviceData.auto_approve_under_amount,
                business_hours_start: serviceData.business_hours_start || '09:00',
                business_hours_end: serviceData.business_hours_end || '18:00',
                auto_approve_during_business_hours_only: serviceData.auto_approve_during_business_hours_only || true
              };
            }
          } catch (serviceRoleError) {
            console.error('Service role fallback also failed:', serviceRoleError);
          }
        }

        return null;
      }

      // Map the database fields to the Vendor interface
      return {
        id: data.id,
        business_name: data.business_name || '',
        contact_person: '', // Not available in database
        email: data.business_email || '',
        phone: '', // Not available in database
        address: '', // Not available in database
        city: '', // Not available in database
        state: '', // Not available in database
        pincode: '', // Not available in database
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

  // Auto-approval logic
  const checkAndAutoApproveOrders = async (vendorId: string, pendingOrdersData: PendingOrder[]) => {
    if (!vendor?.auto_approve_orders) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Check if we're within business hours (if required)
    if (vendor.auto_approve_during_business_hours_only) {
      const isWithinBusinessHours = currentTime >= vendor.business_hours_start &&
        currentTime <= vendor.business_hours_end;
      if (!isWithinBusinessHours) {
        console.log('Auto-approval skipped: Outside business hours');
        return;
      }
    }

    const ordersToAutoApprove = pendingOrdersData.filter(order => {
      // Check amount threshold if set
      if (vendor.auto_approve_under_amount !== null &&
        order.line_total > vendor.auto_approve_under_amount) {
        return false;
      }
      return true;
    });

    if (ordersToAutoApprove.length === 0) return;

    console.log(`Auto-approving ${ordersToAutoApprove.length} orders`);

    // Auto-approve orders
    for (const order of ordersToAutoApprove) {
      try {
        const { success, error } = await TryodoAPI.Order.updateOrderItemStatus(
          order.order_item_id,
          'confirmed'
        );

        if (success) {
          console.log(`Auto-approved order: ${order.order_number}`);

          // Try to create delivery assignment
          try {
            const customerPincode = order.delivery_address?.pincode ||
              order.delivery_address?.postal_code ||
              order.delivery_address?.zip_code;

            if (customerPincode) {
              const deliveryResult = await DeliveryAPI.Assignment.createAssignmentFromOrder(
                order.order_item_id,
                order.order_id,
                vendorId,
                customerPincode,
                'normal'
              );

              if (deliveryResult.success) {
                console.log(`Auto-assigned delivery for order: ${order.order_number}`);
              }
            }
          } catch (deliveryError) {
            console.error('Auto-delivery assignment failed:', deliveryError);
          }
        } else {
          console.error(`Failed to auto-approve order ${order.order_number}:`, error);
        }
      } catch (error) {
        console.error(`Error auto-approving order ${order.order_number}:`, error);
      }
    }

    if (ordersToAutoApprove.length > 0) {
      toast.success(`Auto-approved ${ordersToAutoApprove.length} order${ordersToAutoApprove.length > 1 ? 's' : ''}`);
      // Refresh data to show updated orders
      setTimeout(() => refreshData(), 1000);
    }
  };

  const loadPendingOrders = async (vendorId: string) => {
    try {
      // Query order_items directly instead of using vendor_pending_orders view
      // to ensure we get quality information properly
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          vendor_id,
          product_name,
          product_description,
          quality_type_name,
          unit_price,
          quantity,
          line_total,
          item_status,
          created_at,
          updated_at,
          orders!inner(
            id,
            order_number,
            customer_id,
            total_amount,
            order_status,
            payment_status,
            created_at
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('item_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match PendingOrder interface
      const transformedData: PendingOrder[] = (data || []).map((item: any) => {
        const order = item.orders;
        const createdAt = new Date(order?.created_at || item.created_at);
        const now = new Date();
        const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        const minutesRemaining = Math.max(0, 15 - minutesElapsed); // Assuming 15 min timeout

        return {
          order_id: order?.id || item.order_id,
          order_number: order?.order_number || `ORD-${item.order_id.slice(0, 8).toUpperCase()}`,
          customer_id: order?.customer_id || 'unknown',
          total_amount: order?.total_amount || item.line_total,
          order_status: order?.order_status || 'pending',
          payment_status: order?.payment_status || 'paid',
          created_at: order?.created_at || item.created_at,
          delivery_address: null, // Could be fetched separately if needed
          order_item_id: item.id,
          vendor_id: item.vendor_id,
          product_name: item.product_name,
          product_description: item.product_description,
          quality_type_name: item.quality_type_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          line_total: item.line_total,
          item_status: item.item_status,
          vendor_business_name: 'Unknown', // Could be fetched separately if needed
          auto_approve_orders: false,
          order_confirmation_timeout_minutes: 15,
          auto_approve_under_amount: null,
          business_hours_start: '09:00',
          business_hours_end: '18:00',
          auto_approve_during_business_hours_only: true,
          customer_profile_id: order?.customer_id || 'unknown',
          minutes_remaining: minutesRemaining,
          should_auto_approve: false
        };
      });

      setPendingOrders(transformedData);

      // Check for auto-approval after setting pending orders
      if (transformedData.length > 0 && vendor?.auto_approve_orders) {
        setTimeout(() => checkAndAutoApproveOrders(vendorId, transformedData), 500);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
      setPendingOrders([]);
    }
  };

  const loadConfirmedOrders = async (vendorId: string) => {
    try {
      setConfirmedOrdersLoading(true);

      // ---------------------------------------------
      // Skip the view-based query since vendor_confirmed_orders view 
      // doesn't include slot information. Use the full query instead.
      // ---------------------------------------------

      // 1) fetch confirmed order items with basic order information
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          vendor_id,
          product_name,
          product_description,
          quality_type_name,
          unit_price,
          quantity,
          line_total,
          item_status,
          picked_up_at,
          pickup_confirmed_by,
          vendor_notes,
          created_at,
          updated_at,
          orders!inner(
            id,
            order_number,
            customer_id,
            total_amount,
            order_status,
            payment_status,
            delivery_address_id,
            delivery_date,
            slot_id,
            sector_id,
            created_at,
            customers(
              id,
              profile_id
            ),
            delivery_partner_orders(
              delivery_partner_id,
              status,
              accepted_at,
              picked_up_at,
              delivered_at,
              delivery_partners(
                profiles(
                  full_name,
                  phone
                )
              )
            )
          )
        `)
        .eq('vendor_id', vendorId)
        .in('item_status', ['confirmed', 'processing', 'packed'])  // Only include orders ready for pickup
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        setConfirmedOrders([]);
        return;
      }

      // 2) collect unique IDs for batch fetching
      const profileIds: string[] = [];
      const deliveryAddressIds: string[] = [];
      const slotIds: string[] = [];
      const sectorIds: string[] = [];

      data.forEach((item: any) => {
        const pId = item.orders?.customers?.profile_id;
        if (pId) profileIds.push(pId);

        const daId = item.orders?.delivery_address_id;
        if (daId) deliveryAddressIds.push(daId);

        const slotId = item.orders?.slot_id;
        if (slotId) slotIds.push(slotId);

        const sectorId = item.orders?.sector_id;
        if (sectorId) sectorIds.push(sectorId);
      });

      const uniqueProfileIds = Array.from(new Set(profileIds));
      const uniqueDeliveryAddressIds = Array.from(new Set(deliveryAddressIds));
      const uniqueSlotIds = Array.from(new Set(slotIds));
      const uniqueSectorIds = Array.from(new Set(sectorIds));

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

      let customerAddressesMap: Record<string, any> = {};
      if (uniqueDeliveryAddressIds.length) {
        const { data: addressesData, error: addressesErr } = await supabase
          .from('customer_addresses')
          .select('id, address_box, area, city, pincode, postal_code, zip_code') // Select all relevant address fields
          .in('id', uniqueDeliveryAddressIds);

        if (!addressesErr && addressesData) {
          addressesData.forEach((addr: any) => {
            customerAddressesMap[addr.id] = addr;
          });
        }
      }

      let slotsMap: Record<string, any> = {};
      if (uniqueSlotIds.length) {
        const { data: slotsData, error: slotsErr } = await supabase
          .from('delivery_slots')
          .select('id, slot_name, start_time, end_time, cutoff_time, sector_id')
          .in('id', uniqueSlotIds);

        if (!slotsErr && slotsData) {
          slotsData.forEach((slot: any) => {
            slotsMap[slot.id] = slot;
          });
        }
      }

      let sectorsMap: Record<string, any> = {};
      if (uniqueSectorIds.length) {
        const { data: sectorsData, error: sectorsErr } = await supabase
          .from('sectors')
          .select('id, name, city_name')
          .in('id', uniqueSectorIds);

        if (!sectorsErr && sectorsData) {
          sectorsData.forEach((sector: any) => {
            sectorsMap[sector.id] = sector;
          });
        }
      }

      const processed: ConfirmedOrder[] = data.map((item: any) => {
        const order = item.orders;
        const customer = order?.customers || null;
        const profileInfo = customer?.profile_id ? profilesMap[customer.profile_id] : undefined;
        const customerAddress = order?.delivery_address_id ? customerAddressesMap[order.delivery_address_id] : null;
        const slot = order?.slot_id ? slotsMap[order.slot_id] : null;
        const sector = order?.sector_id ? sectorsMap[order.sector_id] : null;

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
          delivery_address: customerAddress ? {
            id: customerAddress.id,
            address_box: customerAddress.address_box,
            area: customerAddress.area,
            city: customerAddress.city,
            pincode: customerAddress.pincode
          } : { delivery_address_id: order?.delivery_address_id },
          order_item_id: item.id,
          vendor_id: item.vendor_id,
          product_name: item.product_name,
          product_description: item.product_description,
          quality_type_name: item.quality_type_name,
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
          delivered_at: deliveryRecord?.delivered_at || null,
          delivery_assigned_at: deliveryRecord?.accepted_at || null,
          out_for_delivery_at: deliveryRecord?.picked_up_at || null,
          current_status: currentStatus,
          // Slot-related fields for slot-wise management
          slot_id: order?.slot_id || null,
          slot_name: slot?.slot_name || null,
          slot_start_time: slot?.start_time || null,
          slot_end_time: slot?.end_time || null,
          slot_cutoff_time: slot?.cutoff_time || null,
          delivery_date: order?.delivery_date || null,
          sector_name: sector?.name || null,
        } as ConfirmedOrder;
      });

      // Filter out orders that have been picked up or delivered by delivery partners
      const filteredProcessed = processed.filter((order: ConfirmedOrder) => {
        // Exclude orders that have been picked up or delivered
        if (order.current_status === 'out_for_delivery' || order.current_status === 'delivered') {
          return false;
        }
        // Exclude orders with pickup or delivery timestamps
        if (order.picked_up_at || order.delivered_at) {
          return false;
        }
        return true;
      });

      setConfirmedOrders(filteredProcessed);
    } catch (err: any) {
      console.error('Error loading confirmed orders:', err);

      // Provide more specific error messages
      let errorMessage = 'Failed to load confirmed orders';
      if (err?.message) {
        errorMessage += `: ${err.message}`;
      } else if (err?.code) {
        errorMessage += `: Error code ${err.code}`;
      } else if (typeof err === 'string') {
        errorMessage += `: ${err}`;
      }

      toast.error(errorMessage);
      setConfirmedOrders([]);
    } finally {
      setConfirmedOrdersLoading(false);
    }
  };

  const loadDeliveredOrders = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_name,
          product_description,
          quality_type_name,
          unit_price,
          quantity,
          line_total,
          item_status,
          picked_up_at,
          pickup_confirmed_by,
          vendor_notes,
          created_at,
          updated_at,
          orders!inner(
            id,
            order_number,
            customer_id,
            total_amount,
            order_status,
            payment_status,
            delivery_address_id,
            created_at,
            customers(
              id,
              profile_id
            ),
            delivery_address:customer_addresses(
              id,
              shop_name,
              owner_name,
              pincode,
              address_box,
              phone_number
            ),
            delivery_partner_orders(
              delivery_partner_id,
              status,
              delivered_at,
              delivery_partners(
                profiles(
                  full_name,
                  phone
                )
              )
            )
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('item_status', 'delivered')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const processed: DeliveredOrder[] = (data || []).map((item: any) => {
        const order = item.orders;
        const customer = order?.customers?.[0] || null;
        const customerProfile = customer?.profile_id ? { full_name: customer.profiles?.full_name, phone: customer.profiles?.phone } : null; // Added customerProfile
        const deliveryAddress = order?.delivery_address || null;
        const deliveryRecord = order?.delivery_partner_orders?.[0] || null;
        const deliveryPartnerProfile = deliveryRecord?.delivery_partners?.profiles?.[0] || null;

        return {
          order_id: order.id || '',
          order_number: order.order_number || '',
          customer_id: customer?.id || '',
          customer_name: customerProfile?.full_name || null,
          customer_phone: customerProfile?.phone || null,
          total_amount: order.total_amount || 0,
          order_status: order.order_status || 'completed',
          payment_status: order.payment_status || 'paid',
          created_at: item.created_at,
          delivery_address: deliveryAddress,
          order_item_id: item.id,
          vendor_id: vendorId,
          product_name: item.product_name,
          product_description: item.product_description,
          quality_type_name: item.quality_type_name,
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
          delivered_at: deliveryRecord?.delivered_at || null,
          delivery_assigned_at: null,
          out_for_delivery_at: null,
        } as DeliveredOrder;
      });

      setDeliveredOrders(processed);
    } catch (error: any) {
      console.error('Error loading delivered orders:', error);
      toast.error(`Failed to load delivered orders: ${error.message || error}`);
      setDeliveredOrders([]);
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



      // Get order statistics
      const { data: orderStats } = await supabase
        .from('order_items')
        .select('item_status, line_total, created_at')
        .eq('vendor_id', vendorId);

      console.log('VendorDashboard: order_items data:', orderStats);

      const totalProducts = productCount || 0;
      const totalOrders = orderStats?.length || 0;
      const pendingOrdersCount = orderStats?.filter(o => o.item_status === 'pending').length || 0;
      const confirmedOrders = orderStats?.filter(o => o.item_status === 'confirmed').length || 0;
      const deliveredOrders = orderStats?.filter(o => o.item_status === 'delivered').length || 0;
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
        deliveredOrders,
        totalRevenue,
        averageOrderValue,
        responseRate,
        autoApprovalRate: vendor?.auto_approve_orders ? 85 : 0 // Placeholder calculation
      };

      console.log('VendorDashboard: Setting analytics data:', analyticsData);
      setAnalytics(analyticsData);

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error("Failed to load analytics data: " + (error.message || error));
      // Set default analytics values to prevent undefined errors
      setAnalytics({
        totalProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        deliveredOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        responseRate: 0,
        autoApprovalRate: 0
      });
    }
  };

  // Load financial data
  const loadFinancialData = async (vendorId: string) => {
    try {
      setLoadingFinancials(true);

      // Wallet functionality removed

      // Load recent transactions
      const transactionsResponse = await TransactionAPI.getTransactions({
        vendorId: vendorId,
        limit: 10,
        offset: 0
      });
      if (transactionsResponse.success && transactionsResponse.data) {
        setTransactions(transactionsResponse.data);
      }

    } catch (error: any) {
      console.error('Error loading financial data:', error);
      toast.error("Failed to load financial data: " + (error.message || error));
      // Set default values to prevent undefined errors
      // Wallet functionality removed
      setTransactions([]);
    } finally {
      setLoadingFinancials(false);
    }
  };

  // Load daily earnings
  const loadDailyEarnings = async (vendorId: string) => {
    try {
      setLoadingDailyEarnings(true);
      const today = new Date().toISOString().split('T')[0];

      const dailyAnalyticsResponse = await AnalyticsAPI.getVendorDayWiseAnalytics(vendorId, 1); // Get data for the last 1 day (today)

      if (dailyAnalyticsResponse.success && dailyAnalyticsResponse.data && dailyAnalyticsResponse.data.length > 0) {
        const todayData = dailyAnalyticsResponse.data.find(day => day.date === today);
        setDailyEarnings(todayData?.net_earnings || 0);
        setTodaySales(todayData?.net_sales || 0); // Set today's gross sales
      } else {
        console.error('Failed to load daily earnings:', dailyAnalyticsResponse.error);
        setDailyEarnings(0);
        setTodaySales(0); // Set default value on error
      }
    } catch (error: any) {
      console.error('Error loading daily earnings:', error);
      setDailyEarnings(0);
      setTodaySales(0); // Set default value on error
    } finally {
      setLoadingDailyEarnings(false);
    }
  };

  // Add new function to load vendor products
  const loadVendorProducts = async (vendorId: string) => {
    try {
      setLoadingProducts(true);
      console.log('Loading vendor products for vendor ID:', vendorId);

      const response = await TryodoAPI.Vendor.getVendorProducts(vendorId, {}, { limit: 100 });

      if (response.success && response.data) {
        console.log('Vendor products loaded:', response.data);
        setVendorProducts(response.data);
      } else {
        console.error('Failed to load vendor products:', response.error);
      }
    } catch (error) {
      console.error('Error loading vendor products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Add function to load enhanced analytics data
  const loadEnhancedAnalytics = async (vendorId: string) => {
    try {
      setLoadingChartData(true);

      // Load monthly earnings data
      const transactionsResponse = await TransactionAPI.getTransactions({
        vendorId: vendorId,
        limit: 100,
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (transactionsResponse.success && transactionsResponse.data) {
        // Process monthly earnings
        const monthlyData = processMonthlyEarnings(transactionsResponse.data);
        setMonthlyEarnings(monthlyData);
      }

      // Load category breakdown
      const { data: categoryData } = await supabase
        .from('order_items')
        .select(`
          line_total,
          vendor_products (
            categories (
              name
            )
          ),

        `)
        .eq('vendor_id', vendorId)
        .eq('item_status', 'confirmed');

      if (categoryData) {
        const categoryBreakdown = processCategoryBreakdown(categoryData);
        setCategoryBreakdown(categoryBreakdown);
      }

    } catch (error: any) {
      console.error('Error loading enhanced analytics:', error);
      toast.error("Failed to load enhanced analytics: " + (error.message || error));
      // Set default values to prevent undefined errors
      setMonthlyEarnings([]);
      setCategoryBreakdown([]);
    } finally {
      setLoadingChartData(false);
    }
  };

  // Helper function to process monthly earnings
  const processMonthlyEarnings = (transactions: any[]) => {
    const monthlyMap = new Map();

    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'vendor_earning') {
        const date = new Date(transaction.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            earnings: 0,
            orders: 0
          });
        }

        const existing = monthlyMap.get(monthKey);
        existing.earnings += transaction.net_amount || 0;
        existing.orders += 1;
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Helper function to process category breakdown
  const processCategoryBreakdown = (data: any[]) => {
    const categoryMap = new Map();

    data.forEach(item => {
      const categoryName = item.vendor_products?.categories?.name ||

        'Other';

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          value: 0,
          count: 0
        });
      }

      const existing = categoryMap.get(categoryName);
      existing.value += item.line_total || 0;
      existing.count += 1;
    });

    return Array.from(categoryMap.values());
  };

  // Add function to handle product actions
  const handleProductAction = async (productId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('vendor_products')
          .delete()
          .eq('id', productId);

        if (error) throw error;
        toast.success('Product deleted successfully');
      } else {
        const { error } = await supabase
          .from('vendor_products')
          .update({
            is_active: action === 'activate',
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);

        if (error) throw error;
        toast.success(`Product ${action}d successfully`);
      }

      if (vendor) {
        await loadVendorProducts(vendor.id);
      }
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      toast.error(`Failed to ${action} product`);
    }
  };

  // Add function to update stock
  const handleStockUpdate = async (productId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('vendor_products')
        .update({
          stock_quantity: newStock,
          is_in_stock: newStock > 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;
      toast.success('Stock updated successfully');

      if (vendor) {
        await loadVendorProducts(vendor.id);
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  const refreshData = useCallback(async (opts?: { includeHeavy?: boolean; includeDelivered?: boolean }) => {
    if (!vendor) return;

    const includeHeavy = opts?.includeHeavy ?? false;
    const includeDelivered = opts?.includeDelivered ?? (activeTab === 'delivered');

    setRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        loadPendingOrders(vendor.id),
        loadConfirmedOrders(vendor.id),
      ];

      if (includeDelivered) {
        promises.push(loadDeliveredOrders(vendor.id));
      }

      if (includeHeavy) {
        promises.push(
          loadAnalytics(vendor.id),
          loadFinancialData(vendor.id),
          loadVendorProducts(vendor.id),
          loadEnhancedAnalytics(vendor.id),
          loadDailyEarnings(vendor.id)
        );
      }

      await Promise.all(promises);
    } finally {
      setRefreshing(false);
    }
  }, [vendor, activeTab]);

  const handleTabChange = (value: string) => {
    const tab = value as 'pending' | 'confirmed' | 'delivered' | 'cancelled';
    setActiveTab(tab);
    setLoadedTabs(prev => (prev[tab] ? prev : { ...prev, [tab]: true }));

    if (tab === 'delivered' && vendor?.id && !deliveredOrders.length) {
      loadDeliveredOrders(vendor.id);
    }
    if (tab === 'confirmed' && vendor?.id && !confirmedOrders.length) {
      loadConfirmedOrders(vendor.id);
    }
  };

  // Real-time refresh interval (every 30 seconds), light refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshData({ includeHeavy: false });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, refreshData]);

  // Real-time delivery status monitoring
  useEffect(() => {
    if (!vendor?.id) return;

    const handleDeliveryStatusChange = async (payload: any) => {
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
          // No need to manually update order_items here - DeliveryAPI.markDelivered handles all updates
          await refreshData();
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
          table: 'delivery_partner_orders'
        },
        handleDeliveryStatusChange
      )
      .subscribe();

    // Subscribe to order_items updates to catch delivered statuses
    const orderItemsSubscription = supabase
      .channel('order_items')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_items' },
        (payload: any) => {
          if (payload.new.item_status === 'delivered' && payload.new.vendor_id === vendor.id) {
            refreshData();
          }
        }
      )
      .subscribe();

    return () => {
      deliverySubscription.unsubscribe();
      orderItemsSubscription.unsubscribe();
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

      // Update vendor state to reflect the changes
      setVendor(prev => prev ? {
        ...prev,
        auto_approve_orders: vendorSettings.auto_approve_orders,
        order_confirmation_timeout_minutes: vendorSettings.order_confirmation_timeout_minutes,
        auto_approve_under_amount: vendorSettings.auto_approve_under_amount,
        business_hours_start: vendorSettings.business_hours_start,
        business_hours_end: vendorSettings.business_hours_end,
        auto_approve_during_business_hours_only: vendorSettings.auto_approve_during_business_hours_only
      } : null);

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
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.completed
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
              <span className={`text-sm ${step.completed
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

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Formats a date-time string into a readable form like "10 Aug 2025, 3:05 PM"
  const formatDateTime = (dateString?: string | null) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString as string;
    }
  };

  // Slot-based utility functions for vendor dashboard
  const formatSlotTime = (timeString: string | null) => {
    if (!timeString) return 'N/A';
    try {
      const time = new Date(`2000-01-01T${timeString}`);
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const getSlotPriorityMessage = (slotStartTime: string | null, deliveryDate: string | null) => {
    if (!slotStartTime || !deliveryDate) return null;

    const slotHour = parseInt(slotStartTime.split(':')[0]);
    const isToday = deliveryDate === new Date().toISOString().split('T')[0];

    if (slotHour <= 10) {
      return isToday ? '🌅 Morning slot - Prepare immediately for early pickup!' : '🌅 Morning slot - High priority for tomorrow';
    } else if (slotHour <= 14) {
      return isToday ? '☀️ Afternoon slot - Standard preparation timing' : '☀️ Afternoon slot - Prepare by morning';
    } else {
      return isToday ? '🌆 Evening slot - Can prepare later today' : '🌆 Evening slot - Standard priority';
    }
  };

  const getSlotStatusBadge = (order: ConfirmedOrder) => {
    if (!order.slot_id) {
      return <Badge variant="outline" className="text-gray-600">No Slot</Badge>;
    }

    const slotHour = order.slot_start_time ? parseInt(order.slot_start_time.split(':')[0]) : 0;
    const isToday = order.delivery_date === new Date().toISOString().split('T')[0];

    if (slotHour <= 10) {
      return (
        <Badge className="bg-orange-500 text-white">
          🌅 Morning • {formatSlotTime(order.slot_start_time)}
        </Badge>
      );
    } else if (slotHour <= 14) {
      return (
        <Badge className="bg-blue-500 text-white">
          ☀️ Afternoon • {formatSlotTime(order.slot_start_time)}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-purple-500 text-white">
          🌆 Evening • {formatSlotTime(order.slot_start_time)}
        </Badge>
      );
    }
  };

  const filteredOrders = useMemo(() => pendingOrders.filter(order => {
    const matchesSearch = (order.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'urgent') return matchesSearch && order.minutes_remaining <= 5;
    if (statusFilter === 'auto_approve') return matchesSearch && order.should_auto_approve;

    return matchesSearch;
  }), [pendingOrders, searchTerm, statusFilter]);

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

      <Header cartItems={0} onCartClick={() => { }} />

      <main className="relative container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-First Header with Enhanced Slot Integration */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                {vendor?.business_name || 'Vendor Dashboard'}
              </h1>
              <p className="text-gray-600 font-medium">Manage orders, track deliveries, and monitor performance</p>
            </div>

            {/* Mobile: Grid layout for better touch */}
            <div className="grid grid-cols-2 sm:hidden gap-2">
              <Button
                variant="outline"
                onClick={() => refreshData({ includeHeavy: true })}
                className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                disabled={refreshing}
              >
                <div className="flex flex-col items-center gap-1">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{refreshing ? 'Updating' : 'Refresh'}</span>
                </div>
              </Button>

              <Button
                onClick={() => setShowSettingsDialog(true)}
                variant="outline"
                className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    <div className={`w-2 h-2 rounded-full ${vendor?.auto_approve_orders ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <span className="text-xs">Auto Accept</span>
                </div>
              </Button>

              <Button
                onClick={() => navigate('/vendor/product-management')}
                className="flex-1 min-h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 transition-all duration-200 col-span-2"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">Products</span>
                </div>
              </Button>
            </div>

            {/* Desktop: Original layout */}
            <div className="hidden sm:flex gap-3">
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

              {/* Auto Accept Toggle Button */}
              <Button
                variant="outline"
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <Settings className="h-4 w-4" />
                <span>Auto Accept</span>
                <div className={`w-2 h-2 rounded-full ${vendor?.auto_approve_orders ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </Button>

              <Button
                variant="outline"
                onClick={() => refreshData({ includeHeavy: true })}
                className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
              </Button>

              <Button
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 flex items-center gap-2 min-h-12 px-6 rounded-xl font-semibold shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                onClick={() => navigate('/vendor/product-management')}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Product Management</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards - Add this section */}
        <div className="mb-6">
          <Card className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Financial Overview
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your earnings and financial performance summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Daily Earnings */}
                <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-800">Today's Sales</CardTitle>
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-700">
                      {loadingDailyEarnings ? (
                        <div className="animate-pulse bg-emerald-200 h-6 w-16 rounded"></div>
                      ) : (
                        `₹${todaySales.toLocaleString('en-IN')}`
                      )}
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">Gross sales today</p>
                  </CardContent>
                </Card>

                {/* Total Sales */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700">
                      ₹{(financialSummary?.total_sales || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-green-600 mt-1">Gross revenue</p>
                  </CardContent>
                </Card>

                {/* Net Earnings */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Daily Earnings</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700">
                      {loadingDailyEarnings ? (
                        <div className="animate-pulse bg-blue-200 h-6 w-16 rounded"></div>
                      ) : (
                        `₹${dailyEarnings.toLocaleString('en-IN')}`
                      )}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">After Commissions</p>
                  </CardContent>
                </Card>

                {/* Commission Paid */}
                {/* <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple-800">Commission</CardTitle>
                    <Users className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-700">
                      ₹{(financialSummary?.total_commission || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-purple-600 mt-1">Platform fee</p>
                  </CardContent>
                </Card> */}

                {/* Pending Payouts */}
                {/* <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-800">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-700">
                      ₹{(financialSummary?.pending_payouts || 0).toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-orange-600 mt-1">Awaiting delivery</p>
                  </CardContent>
                </Card> */}

                {/* Total Orders */}
                {/* <Card className="bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-800">Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-700">
                      {financialSummary?.total_orders || 0}
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">Total completed</p>
                  </CardContent>
                </Card> */}

                {/* Products */}
                <Card className="bg-gradient-to-br from-pink-50 to-rose-100 border-pink-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-pink-800">Products</CardTitle>
                    <Package className="h-4 w-4 text-pink-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pink-700">
                      {financialSummary?.total_products || 0}
                    </div>
                    <p className="text-xs text-pink-600 mt-1">Active listings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate('/vendor/analytics')}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  onClick={() => navigate('/vendor/market-products')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
                <Button
                  onClick={() => navigate('/vendor/market-products/my-products')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage My Products
                </Button>
                {/* <Button
                  variant="outline"
                  onClick={() => window.open('/vendor/analytics', '_blank')}
                  className="border-gray-300 hover:border-blue-300"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financial Details
                </Button> */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-first tabs with improved layout */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Mobile-first tabs with improved layout */}
          <div className="block sm:hidden mb-4">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-soft h-auto">
              <TabsTrigger
                value="pending"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Pending ({pendingOrders.length})</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="confirmed"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Confirmed</span>
                  {/* ({confirmedOrders.length}) */}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="delivered"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Delivered </span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  <span>Cancelled</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Confirmed ({confirmedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Delivered ({deliveredOrders.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-800">Pending Products</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-orange-700">{pendingOrders.length}</div>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`shadow-soft hover:shadow-medium transition-all duration-200 cursor-pointer ${vendor?.auto_approve_orders
                    ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                  }`}
                onClick={() => setShowSettingsDialog(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-sm font-semibold ${vendor?.auto_approve_orders ? 'text-green-800' : 'text-gray-800'
                    }`}>
                    Auto Accept
                  </CardTitle>
                  {vendor?.auto_approve_orders ? (
                    <PlayCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <PauseCircle className="h-5 w-5 text-gray-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl lg:text-3xl font-bold ${vendor?.auto_approve_orders ? 'text-green-700' : 'text-gray-700'
                    }`}>
                    {vendor?.auto_approve_orders ? 'ON' : 'OFF'}
                  </div>
                  <p className={`text-xs font-medium mt-1 ${vendor?.auto_approve_orders ? 'text-green-600' : 'text-gray-600'
                    }`}>
                    {vendor?.auto_approve_orders ? 'Auto-accepting orders' : 'Manual approval required'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 opacity-75">Click to configure</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-800">Delivered Orders</CardTitle>
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl lg:text-3xl font-bold text-purple-700">{deliveredOrders.length}</div>
                  <p className="text-xs text-purple-600 font-medium mt-1">
                    Successfully completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            {/*
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
                        onClick={() => refreshData({ includeHeavy: true })}
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
            */}

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
                  <div className="space-y-6">
                    {(() => {
                      // Group orders by order_id
                      const groupedOrders = filteredOrders.reduce((acc, order) => {
                        if (!acc[order.order_id]) {
                          acc[order.order_id] = {
                            order_id: order.order_id,
                            order_number: order.order_number,
                            created_at: order.created_at,
                            items: []
                          };
                        }
                        acc[order.order_id].items.push(order);
                        return acc;
                      }, {} as Record<string, { order_id: string; order_number: string; created_at: string; items: PendingOrder[] }>);

                      return Object.values(groupedOrders).map((groupedOrder) => {
                        const urgentItems = groupedOrder.items.filter(item => item.minutes_remaining <= 5);
                        const totalAmount = groupedOrder.items.reduce((sum, item) => sum + item.line_total, 0);
                        const mostUrgentTime = Math.min(...groupedOrder.items.map(item => item.minutes_remaining));
                        const hasAutoApprove = groupedOrder.items.some(item => item.should_auto_approve);

                        return (
                          <div key={groupedOrder.order_id} className="border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                            {/* Order Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200 rounded-t-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Order {groupedOrder.order_number}</h3>
                                    <p className="text-sm text-gray-600">Placed {formatTimeAgo(groupedOrder.created_at)}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge className={getUrgencyColor(mostUrgentTime)}>
                                      <Timer className="h-3 w-3 mr-1" />
                                      {getTimeRemainingDisplay(mostUrgentTime)} left
                                    </Badge>
                                    {urgentItems.length > 0 && (
                                      <Badge variant="destructive" className="animate-pulse">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {urgentItems.length} Urgent
                                      </Badge>
                                    )}
                                    {hasAutoApprove && (
                                      <Badge variant="secondary">
                                        Auto-Approve Eligible
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</p>
                                  <p className="text-sm text-gray-600">{groupedOrder.items.length} items</p>
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-4 space-y-4">
                              {groupedOrder.items.map((item, index) => (
                                <div key={item.order_item_id} className={`rounded-lg border-2 p-4 transition-all duration-200 ${item.minutes_remaining <= 5
                                  ? 'border-red-200 bg-red-50'
                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                  }`}>
                                  {/* Product Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 text-lg truncate">{item.product_name}</h4>
                                      {item.product_description && (
                                        <p className="text-sm text-gray-600 mt-1 font-medium">{item.product_description}</p>
                                      )}
                                      {item.quality_type_name && (
                                        <div className="mt-2">
                                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold text-xs px-2 py-1 rounded-full border border-blue-200">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            Quality: {item.quality_type_name}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <span className="font-medium">Qty:</span>
                                          <span className="bg-white px-2 py-1 rounded font-bold">{item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <span className="font-medium">Unit Price:</span>
                                          <span>₹{item.unit_price.toLocaleString()}</span>
                                        </div>
                                        <Badge className={getUrgencyColor(item.minutes_remaining)} variant="outline">
                                          <Timer className="h-3 w-3 mr-1" />
                                          {getTimeRemainingDisplay(item.minutes_remaining)}
                                        </Badge>
                                      </div>
                                      {item.product_description && (
                                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.product_description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xl font-bold text-blue-600">₹{item.line_total.toLocaleString()}</p>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                      size="sm"
                                      onClick={() => handleOrderAction(item.order_item_id, 'accept')}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Accept Item
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleOrderAction(item.order_item_id, 'reject')}
                                      className="flex-1 font-medium py-2.5"
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Reject Item
                                    </Button>
                                  </div>

                                  {/* Separator for multiple items */}
                                  {index < groupedOrder.items.length - 1 && (
                                    <div className="mt-4 border-b border-gray-300"></div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Quick Actions Footer */}
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-xl">
                              <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    groupedOrder.items.forEach(item => {
                                      handleOrderAction(item.order_item_id, 'accept');
                                    });
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accept All Items
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    groupedOrder.items.forEach(item => {
                                      handleOrderAction(item.order_item_id, 'reject');
                                    });
                                  }}
                                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 font-medium"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject All Items
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-6">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Confirmed Orders - In Progress
                </CardTitle>
                <CardDescription>
                  Orders being processed and awaiting delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {confirmedOrders.filter(o => o.current_status !== 'delivered').length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No confirmed orders</h3>
                    <p className="text-gray-600">Confirmed orders will appear here for processing and fulfillment.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Slot-wise Summary Dashboard */}
                    {(() => {
                      const activeOrders = confirmedOrders.filter(o => o.current_status !== 'delivered');
                      const slotSummary = activeOrders.reduce((acc, order) => {
                        const slotType = order.slot_start_time
                          ? (parseInt(order.slot_start_time.split(':')[0]) <= 10 ? 'morning' :
                            parseInt(order.slot_start_time.split(':')[0]) <= 14 ? 'afternoon' : 'evening')
                          : 'no-slot';

                        acc[slotType] = (acc[slotType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const totalItems = activeOrders.reduce((sum, order) => sum + order.quantity, 0);
                      const totalRevenue = activeOrders.reduce((sum, order) => sum + order.line_total, 0);

                      return (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            📊 Today's Slot Overview
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-orange-100 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-orange-800">{slotSummary.morning || 0}</div>
                              <div className="text-xs text-orange-600">🌅 Morning Slots</div>
                              <div className="text-xs text-orange-500">High Priority</div>
                            </div>
                            <div className="bg-blue-100 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-blue-800">{slotSummary.afternoon || 0}</div>
                              <div className="text-xs text-blue-600">☀️ Afternoon Slots</div>
                              <div className="text-xs text-blue-500">Standard Priority</div>
                            </div>
                            <div className="bg-purple-100 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-purple-800">{slotSummary.evening || 0}</div>
                              <div className="text-xs text-purple-600">🌆 Evening Slots</div>
                              <div className="text-xs text-purple-500">Lower Priority</div>
                            </div>
                            <div className="bg-green-100 rounded-lg p-3 text-center">
                              <div className="text-2xl font-bold text-green-800">{totalItems}</div>
                              <div className="text-xs text-green-600">📦 Total Items</div>
                              <div className="text-xs text-green-500">₹{totalRevenue.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Slot-based Orders Display */}
                    <div className="space-y-4">
                      {(() => {
                        // Group confirmed orders by delivery slot (slot-wise management)
                        const groupedOrders = confirmedOrders
                          .filter(order => order.current_status !== 'delivered')
                          .reduce((acc, order) => {
                            // Create slot key - prioritize slot info, fallback to date for orders without slots
                            const slotKey = order.slot_id
                              ? `slot_${order.slot_id}_${order.delivery_date || new Date(order.created_at).toISOString().split('T')[0]}`
                              : `no-slot_${new Date(order.created_at).toISOString().split('T')[0]}`;

                            if (!acc[slotKey]) {
                              // Determine slot priority based on timing
                              let priorityLevel: 'high' | 'medium' | 'low' = 'medium';
                              if (order.slot_start_time) {
                                const slotHour = parseInt(order.slot_start_time.split(':')[0]);
                                if (slotHour <= 10) priorityLevel = 'high'; // Morning slots are high priority
                                else if (slotHour <= 14) priorityLevel = 'medium'; // Afternoon slots
                                else priorityLevel = 'low'; // Evening slots
                              }

                              acc[slotKey] = {
                                slot_id: order.slot_id,
                                slot_name: order.slot_name || 'No Slot Assigned',
                                slot_start_time: order.slot_start_time,
                                slot_end_time: order.slot_end_time,
                                slot_cutoff_time: order.slot_cutoff_time,
                                delivery_date: order.delivery_date || new Date(order.created_at).toISOString().split('T')[0],
                                sector_name: order.sector_name,
                                orders: [],
                                total_revenue: 0,
                                total_items: 0,
                                status: order.current_status === 'confirmed' ? 'preparation' :
                                  order.current_status === 'assigned_to_delivery' ? 'ready' :
                                    'out_for_delivery',
                                priority_level: priorityLevel
                              };
                            }
                            acc[slotKey].orders.push(order);
                            acc[slotKey].total_revenue += order.line_total;
                            acc[slotKey].total_items += order.quantity;
                            return acc;
                          }, {} as Record<string, {
                            slot_id: string | null;
                            slot_name: string;
                            slot_start_time: string | null;
                            slot_end_time: string | null;
                            slot_cutoff_time: string | null;
                            delivery_date: string;
                            sector_name: string | null;
                            orders: ConfirmedOrder[];
                            total_revenue: number;
                            total_items: number;
                            status: string;
                            priority_level: 'high' | 'medium' | 'low';
                          }>);

                        // Sort slots by priority: morning slots first (by start_time), then by delivery_date
                        const groupedOrdersArray = Object.values(groupedOrders).sort((a, b) => {
                          // First, sort by delivery date
                          const dateCompare = a.delivery_date.localeCompare(b.delivery_date);
                          if (dateCompare !== 0) return dateCompare;

                          // Then by slot start time (morning slots first)
                          if (a.slot_start_time && b.slot_start_time) {
                            return a.slot_start_time.localeCompare(b.slot_start_time);
                          }
                          // Orders without slots go to the end
                          if (!a.slot_start_time && b.slot_start_time) return 1;
                          if (a.slot_start_time && !b.slot_start_time) return -1;
                          return 0;
                        });

                        return groupedOrdersArray.map((group) => (
                          <Card
                            key={`${group.slot_id}_${group.delivery_date}`}
                            className={`border-2 transition-all duration-200 hover:shadow-lg ${group.priority_level === 'high'
                              ? 'border-orange-300 bg-orange-50'
                              : group.priority_level === 'medium'
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-300 bg-gray-50'
                              }`}
                          >
                            {/* Slot-Based Header */}
                            <CardHeader className="pb-4">
                              <div className="space-y-3">
                                {/* Slot Information and Priority */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <Clock className="h-5 w-5 text-blue-600" />
                                      {group.slot_name}
                                      {group.priority_level === 'high' && (
                                        <Badge className="bg-orange-500 text-white animate-pulse">
                                          🌅 Priority - Morning Slot
                                        </Badge>
                                      )}
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        📅 {new Date(group.delivery_date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                      {group.slot_start_time && (
                                        <span className="flex items-center gap-1">
                                          ⏰ {group.slot_start_time} - {group.slot_end_time}
                                        </span>
                                      )}
                                      {group.sector_name && (
                                        <span className="flex items-center gap-1">
                                          📍 {group.sector_name}
                                        </span>
                                      )}
                                      <span>• {group.orders.length} orders • {group.total_items} items</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={
                                      group.status === 'preparation' ? 'bg-orange-500 text-white' :
                                        group.status === 'ready' ? 'bg-green-500 text-white' :
                                          'bg-blue-500 text-white'
                                    }>
                                      {group.status === 'preparation' && '👨‍🍳 To Prepare'}
                                      {group.status === 'ready' && '✅ Ready'}
                                      {group.status === 'out_for_delivery' && '🚚 Out for Delivery'}
                                    </Badge>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-green-600">₹{group.total_revenue.toLocaleString()}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Slot Timing Priority Indicator */}
                                {group.slot_start_time && group.slot_cutoff_time && (
                                  <div className={`rounded-lg p-3 border ${group.priority_level === 'high'
                                    ? 'bg-orange-100 border-orange-300'
                                    : 'bg-blue-100 border-blue-300'
                                    }`}>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="font-medium">
                                        {group.priority_level === 'high' ? '🚨 Morning Priority Slot' : '📋 Standard Slot'}
                                      </span>
                                      <span className="text-gray-600">
                                        Cutoff: {group.slot_cutoff_time}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardHeader>

                            {/* Products to Prepare Summary - Prominent Display */}
                            <CardContent className="pt-0 space-y-4">
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="text-base font-semibold text-orange-800 mb-3 flex items-center">
                                  <ChefHat className="h-5 w-5 mr-2" />
                                  Items to Prepare
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                  {Object.entries(group.orders.reduce((acc: Record<string, { qty: number; quality: string | null; description: string | null }>, item) => {
                                    const key = item.product_name || 'Unknown';
                                    if (!acc[key]) {
                                      acc[key] = { qty: 0, quality: item.quality_type_name, description: item.product_description };
                                    }
                                    acc[key].qty += item.quantity;
                                    return acc;
                                  }, {} as Record<string, { qty: number; quality: string | null; description: string | null }>)).map(([name, data]) => (
                                    <div key={name} className="bg-white rounded-lg p-4 shadow-sm border border-orange-100 hover:border-orange-200 transition-colors">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                          <span className="font-bold text-gray-900 text-sm block">{name}</span>
                                          {data.description && (
                                            <div className="text-xs text-gray-600 mt-1 font-medium">{data.description}</div>
                                          )}
                                          {data.quality && (
                                            <div className="mt-2">
                                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold text-xs px-2 py-1 rounded-full border border-blue-200">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                Quality: {data.quality}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-3">
                                          <span className="text-xs text-gray-600">Qty:</span>
                                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-bold">
                                            {data.qty}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Order Details - Simplified Mobile View */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-gray-700 flex items-center">
                                  <Package className="h-4 w-4 mr-2" />
                                  Order Details
                                </h5>
                                {group.orders.map((order) => (
                                  <div
                                    key={order.order_item_id}
                                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                                  >
                                    <div className="space-y-2">
                                      {/* Order Header */}
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">#{order.order_number}</span>
                                            {getSlotStatusBadge(order)}
                                            {getDeliveryStatusBadge(order)}
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            <div className="font-semibold text-gray-800">{order.product_name} × {order.quantity}</div>
                                            {order.product_description && (
                                              <div className="text-xs text-gray-600 mt-1 font-medium">{order.product_description}</div>
                                            )}
                                            {order.quality_type_name && (
                                              <div className="mt-1.5">
                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold text-xs px-2 py-1 rounded-full border border-blue-200">
                                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                  Quality: {order.quality_type_name}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          {/* Slot Priority Message */}
                                          {getSlotPriorityMessage(order.slot_start_time, order.delivery_date) && (
                                            <div className="mt-1">
                                              <p className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                                {getSlotPriorityMessage(order.slot_start_time, order.delivery_date)}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="font-bold text-green-600">₹{order.line_total.toLocaleString()}</div>
                                          <div className="text-xs text-gray-500">
                                            {formatTimeAgo(order.created_at)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Customer Info - Compact */}
                                      <div className="flex items-center gap-4 text-xs text-gray-600 bg-white rounded p-2">
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span>{order.customer_name || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <span>{order.customer_phone || 'N/A'}</span>
                                        </div>
                                      </div>

                                      {/* Action Buttons - Simplified */}
                                      <div className="flex gap-2 pt-2">
                                        {order.delivery_partner_id && (
                                          <div className="flex-1 bg-green-100 text-green-800 rounded px-3 py-2 text-xs font-medium flex items-center justify-center">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Delivery Assigned
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivered" className="space-y-6">
            {/* Delivered Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Delivered Orders</CardTitle>
                <CardDescription>Orders that have been successfully delivered</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No delivered orders yet</h3>
                    <p className="text-gray-600">Delivered orders will appear here for review.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveredOrders.map((order) => (
                      <Card key={order.order_item_id} className="overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg text-gray-900">{order.product_name}</h4>
                              {order.product_description && (
                                <p className="text-sm text-gray-600 mt-1 font-medium">{order.product_description}</p>
                              )}
                              {order.quality_type_name && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold text-sm px-3 py-1 rounded-full border border-blue-200">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    Quality: {order.quality_type_name}
                                  </span>
                                </div>
                              )}
                              <p className="text-sm text-gray-500 mt-2">Order #{order.order_number}</p>
                              <p className="text-sm text-gray-500">
                                Delivered on: {formatDateTime(order.delivered_at || order.updated_at || order.created_at)} • {formatTimeAgo(order.delivered_at || order.updated_at || order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xl mt-1">₹{order.line_total.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-6">
            <CancelledOrdersSection
              vendorId={vendor?.id || ''}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Vendor Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Auto Accept Orders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Auto Accept Orders</Label>
                  <p className="text-sm text-gray-600">
                    Automatically accept all incoming orders when this is enabled
                  </p>
                </div>
                <Switch
                  checked={vendorSettings.auto_approve_orders}
                  onCheckedChange={(checked) =>
                    setVendorSettings(prev => ({ ...prev, auto_approve_orders: checked }))
                  }
                />
              </div>

              {/* Status indicator */}
              <div className={`rounded-lg p-3 border ${vendorSettings.auto_approve_orders
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${vendorSettings.auto_approve_orders ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium">
                    {vendorSettings.auto_approve_orders ? 'Auto Accept is ON' : 'Auto Accept is OFF'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {vendorSettings.auto_approve_orders
                    ? 'All new orders will be automatically accepted and moved to processing.'
                    : 'You will need to manually accept each order.'
                  }
                </p>
              </div>
            </div>

            <Separator />

            {/* Order Confirmation Timeout */}
            <div className="space-y-2">
              <Label htmlFor="timeout">Order Confirmation Timeout (minutes)</Label>
              <Input
                id="timeout"
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
              <p className="text-xs text-gray-600">
                Time limit for manually confirming orders (5-60 minutes)
              </p>
            </div>

            {/* Business Hours */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Business Start</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={vendorSettings.business_hours_start}
                    onChange={(e) =>
                      setVendorSettings(prev => ({ ...prev, business_hours_start: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">Business End</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={vendorSettings.business_hours_end}
                    onChange={(e) =>
                      setVendorSettings(prev => ({ ...prev, business_hours_end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto Accept During Business Hours Only</Label>
                  <p className="text-xs text-gray-600">
                    Only auto-accept orders during your business hours
                  </p>
                </div>
                <Switch
                  checked={vendorSettings.auto_approve_during_business_hours_only}
                  onCheckedChange={(checked) =>
                    setVendorSettings(prev => ({ ...prev, auto_approve_during_business_hours_only: checked }))
                  }
                />
              </div>
            </div>

            {/* Auto Approve Under Amount */}
            <div className="space-y-2">
              <Label htmlFor="auto-amount">Auto Accept for Orders Under Amount (₹)</Label>
              <Input
                id="auto-amount"
                type="number"
                min="0"
                placeholder="Leave empty for all amounts"
                value={vendorSettings.auto_approve_under_amount || ''}
                onChange={(e) =>
                  setVendorSettings(prev => ({
                    ...prev,
                    auto_approve_under_amount: e.target.value ? parseFloat(e.target.value) : null
                  }))
                }
              />
              <p className="text-xs text-gray-600">
                Only auto-accept orders below this amount. Leave empty to auto-accept all orders.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSettingsDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={updateVendorSettings}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDashboard;

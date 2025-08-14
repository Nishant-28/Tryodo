import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, ShoppingBag, TrendingUp, DollarSign, Package,
  Smartphone, Settings, ArrowRight, AlertTriangle, Database,
  CheckCircle, Eye, RefreshCw, RefreshCcw, Bell, Activity, Clock,
  Target, Zap, BarChart3, PieChart, Calendar, Filter,
  ChevronUp, ChevronDown, AlertCircle, Star, Truck,
  HeadphonesIcon, ShoppingCart, CreditCard, Timer,
  Plus, Edit3, XCircle, MapPin, Save, X, Check, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import TryodoAPI, { TransactionAPI, PayoutAPI, VendorAPI, CategoryAPI, WalletAPI, CommissionAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import VendorSalesSection from '@/components/VendorSalesSection';
import CancellationAnalytics from '@/components/CancellationAnalytics';
import PnLDashboard from '@/components/PnLDashboard';
import SlotSectorAnalytics from '@/components/SlotSectorAnalytics';
import HistoricalTrendsAnalytics from '@/components/HistoricalTrendsAnalytics';
import OperationalControls from '@/components/OperationalControls';
import FourLayerSummary from '@/components/FourLayerSummary';

interface VendorSales {
  vendor_id: string;
  business_name: string;
  orders: number;
  gmv: number;
  commission: number;
}

interface DashboardStats {
  // Core Business Metrics
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  orderGrowth: number;
  pendingOrders: number;

  // User Metrics
  totalCustomers: number;
  customerGrowth: number;
  totalVendors: number;
  activeVendors: number;

  // Product & Inventory
  totalProducts: number;
  lowStockAlerts: number;

  // Performance Metrics
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;

  // System Health
  systemUptime: number;
  responseTime: number;
}

interface TransactionRecord {
  id: string;
  transaction_number: string;
  order_id: string;
  transaction_type: string;
  transaction_status: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  from_party_type: string;
  to_party_type: string;
  transaction_date: string;
  description: string;
  order?: {
    order_number: string;
  };
}

interface CommissionRule {
  id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number | null;
  is_active: boolean;
  category?: {
    name: string;
  };
}

// Wallet functionality removed - no longer needed

interface PayoutRecord {
  id: string;
  payout_number: string;
  recipient_type: string;
  recipient_id: string;
  payout_amount: number;
  payout_status: string;
  payout_method: string;
  created_at: string;
  scheduled_date: string | null;
}

interface PlatformStats {
  total_commission_earned: number;
  today_commission: number;
  week_commission: number;
  month_commission: number;
  year_commission: number;
  total_transactions_processed: number;
  today_transactions: number;
  week_transactions: number;
  month_transactions: number;
}

interface DetailedOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: {
    address_box: string;
    area: string;
    city: string;
    pincode: string;
  } | null;
  total_amount: number;
  subtotal: number;
  shipping_charges: number;
  tax_amount: number;
  discount_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  delivery_partner?: {
    id: string;
    name: string;
    phone: string;
  };
  slot_info?: {
    slot_name: string;
    start_time: string;
    end_time: string;
  };
  sector_info?: {
    sector_name: string;
  };
  order_items: DetailedOrderItem[];
  tracking_status: string;
  commission_earned: number;
  notes?: string;
  cancellation_reason?: string;
}

interface DetailedOrderItem {
  id: string;
  product_name: string;
  product_description: string;
  category_name?: string;
  quality_type_name?: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  vendor: {
    id: string;
    business_name: string;
    contact_person?: string;
    phone: string;
    email?: string;
    business_city?: string;
    business_state?: string;
    rating?: number;
    total_reviews?: number;
  };
  vendor_confirmed_at?: string;
  vendor_notes?: string;
  picked_up_at?: string;
  warranty_months?: number;
  delivery_time_days?: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  urgent?: boolean;
  count?: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Management
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Commission and pricing states to satisfy handlers in this file
  const [commissionForm, setCommissionForm] = useState({
    categoryId: '',
    commissionPercentage: '',
    minimumCommission: '',
    maximumCommission: '',
    notes: ''
  });
  const [showCommissionForm, setShowCommissionForm] = useState(false);

  const [calculatorForm, setCalculatorForm] = useState({
    vendorId: '',
    qualityId: '',
    basePrice: 0,
    commissionRate: 0,
    upsideRate: 0,
    effectiveFrom: '',
    notes: ''
  });
  const [showVendorCommissionForm, setShowVendorCommissionForm] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState<any>(null);

  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [vendorCommissions, setVendorCommissions] = useState<any[]>([]);
  const [allQualities, setAllQualities] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [qualityPerformance, setQualityPerformance] = useState<any[]>([]);
  const [vendorCommissionSummary, setVendorCommissionSummary] = useState<any[]>([]);

  // Data State
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    orderGrowth: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    customerGrowth: 0,
    totalVendors: 0,
    activeVendors: 0,
    totalProducts: 0,
    lowStockAlerts: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    customerSatisfaction: 4.2,
    systemUptime: 99.8,
    responseTime: 245
  });

  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  // Database Setup Status
  const [dbSetupStatus, setDbSetupStatus] = useState<{
    categoriesExists: boolean;
    categoryQualitiesExists: boolean;
    isChecking: boolean;
  }>({
    categoriesExists: false,
    categoryQualitiesExists: false,
    isChecking: true
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  const [vendorSales, setVendorSales] = useState<VendorSales[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [detailedOrders, setDetailedOrders] = useState<DetailedOrder[]>([]);
  const [detailedOrdersLoading, setDetailedOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DetailedOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [vendorSalesSummary, setVendorSalesSummary] = useState<VendorSales[]>([]);

  // Activity feed for live events
  const [activityFeed, setActivityFeed] = useState<Array<{ time: string; type: string; message: string }>>([]);

  // Filter states
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: '',
    status: ''
  });

  const [orderFilters, setOrderFilters] = useState({
    startDate: '',
    endDate: '',
    orderStatus: '',
    paymentStatus: '',
    searchTerm: '',
    vendorFilter: '',
    limit: 50
  });

  // Add vendor analytics states
  const [allVendorAnalytics, setAllVendorAnalytics] = useState<any[]>([]);
  const [loadingVendorAnalytics, setLoadingVendorAnalytics] = useState(false);
  const [vendorAnalyticsError, setVendorAnalyticsError] = useState<string | null>(null);

  const { toast } = useToast();

  // Refs for debounce and SLA change tracking
  const ordersDebounceRef = useRef<number | null>(null);
  const itemsDebounceRef = useRef<number | null>(null);
  const prevDelayedRef = useRef<number>(0);

  // Real-time Data Fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      // Fetch data in parallel for better performance
      const [
        ordersData,
        customersData,
        vendorsData,
        productsData,
        revenueData
      ] = await Promise.all([
        fetchOrdersData(),
        fetchCustomersData(),
        fetchVendorsData(),
        fetchProductsData(),
        fetchRevenueData()
      ]);

      // Calculate derived metrics
      const averageOrderValue = ordersData.totalOrders > 0
        ? revenueData.totalRevenue / ordersData.totalOrders
        : 0;

      setStats({
        ...revenueData,
        ...ordersData,
        ...customersData,
        ...vendorsData,
        ...productsData,
        averageOrderValue,
        conversionRate: 3.2, // Placeholder - would calculate from real data
        customerSatisfaction: 4.2,
        systemUptime: 99.8,
        responseTime: 245
      });

      // Fetch detailed orders for recent activity tab
      await fetchDetailedOrders();

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [timeRange]);

  // Individual data fetchers
  const fetchOrdersData = async () => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_status, total_amount, created_at');

    if (error) throw error;

    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter(o => o.order_status === 'pending').length || 0;

    // Calculate growth (placeholder logic)
    const orderGrowth = 12.5; // Would calculate from historical data

    return { totalOrders, pendingOrders, orderGrowth };
  };

  const fetchRevenueData = async () => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at, order_status')
      .in('order_status', ['confirmed', 'shipped', 'delivered']);

    if (error) throw error;

    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const revenueGrowth = 8.3; // Would calculate from historical data

    return { totalRevenue, revenueGrowth };
  };

  const fetchCustomersData = async () => {
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const customerGrowth = 15.2; // Would calculate from historical data

    return { totalCustomers: totalCustomers || 0, customerGrowth };
  };

  const fetchVendorsData = async () => {
    const [
      { count: totalVendors },
      { count: activeVendors }
    ] = await Promise.all([
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    return {
      totalVendors: totalVendors || 0,
      activeVendors: activeVendors || 0
    };
  };

  const fetchProductsData = async () => {
    const [
      { count: vendorProducts },
      { data: lowStockProducts }
    ] = await Promise.all([
      supabase.from('vendor_products').select('*', { count: 'exact', head: true }),
      supabase.from('vendor_products').select('*').lt('stock_quantity', 10)
    ]);

    return {
      totalProducts: vendorProducts || 0,
      lowStockAlerts: lowStockProducts?.length || 0
    };
  };

  const fetchDetailedOrders = async () => {
    try {
      setDetailedOrdersLoading(true);

      // Build query based on filters - simplified to avoid complex join issues
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          total_amount,
          subtotal,
          shipping_charges,
          tax_amount,
          discount_amount,
          order_status,
          payment_status,
          payment_method,
          created_at,
          updated_at,
          estimated_delivery_date,
          actual_delivery_date,
          notes,
          cancellation_reason,
          delivery_address_id,
          slot_id,
          sector_id
        `)
        .order('created_at', { ascending: false })
        .limit(orderFilters.limit);

      // Apply filters
      if (orderFilters.startDate) {
        query = query.gte('created_at', orderFilters.startDate);
      }
      if (orderFilters.endDate) {
        query = query.lte('created_at', orderFilters.endDate + 'T23:59:59');
      }
      if (orderFilters.orderStatus) {
        query = query.eq('order_status', orderFilters.orderStatus);
      }
      if (orderFilters.paymentStatus) {
        query = query.eq('payment_status', orderFilters.paymentStatus);
      }
      if (orderFilters.searchTerm) {
        query = query.ilike('order_number', `%${orderFilters.searchTerm}%`);
      }

      const { data: ordersData, error: ordersError } = await query;
      console.log("Fetched orders data:", ordersData);
      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setDetailedOrders([]);
        return;
      }

      // Fetch related data in parallel
      const orderIds = ordersData.map(order => order.id);
      const customerIds = [...new Set(ordersData.map(order => order.customer_id).filter(Boolean))];
      const addressIds = [...new Set(ordersData.map(order => order.delivery_address_id).filter(Boolean))];
      const slotIds = [...new Set(ordersData.map(order => order.slot_id).filter(Boolean))];
      const sectorIds = [...new Set(ordersData.map(order => order.sector_id).filter(Boolean))];

      const [
        orderItemsResult,
        customersResult,
        addressesResult,
        slotsResult,
        sectorsResult
      ] = await Promise.all([
        // Fetch order items
        supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            vendor_id,
            product_name,
            product_description,
            category_name,
            quality_type_name,
            unit_price,
            quantity,
            line_total,
            item_status,
            vendor_confirmed_at,
            vendor_notes,
            picked_up_at,
            warranty_months,
            estimated_delivery_days,
            vendors(
              id,
              business_name,
              contact_person,
              phone,
              email,
              business_city,
              business_state,
              rating,
              total_reviews
            )
          `)
          .in('order_id', orderIds),

        // Fetch customers with profiles
        customerIds.length > 0 ? supabase
          .from('customers')
          .select(`
            id,
            profile_id,
            profiles(
              full_name,
              phone,
              email
            )
          `)
          .in('id', customerIds) : Promise.resolve({ data: [], error: null }),

        // Fetch addresses
        addressIds.length > 0 ? supabase
          .from('customer_addresses')
          .select('id, address_box, area, city, pincode')
          .in('id', addressIds) : Promise.resolve({ data: [], error: null }),

        // Fetch delivery slots
        slotIds.length > 0 ? supabase
          .from('delivery_slots')
          .select('id, slot_name, start_time, end_time')
          .in('id', slotIds) : Promise.resolve({ data: [], error: null }),

        // Fetch sectors
        sectorIds.length > 0 ? supabase
          .from('sectors')
          .select('id, name')
          .in('id', sectorIds) : Promise.resolve({ data: [], error: null })
      ]);

      // Check for errors
      if (orderItemsResult.error) {
        console.error("Error fetching order items:", orderItemsResult.error);
        throw orderItemsResult.error;
      }
      if (customersResult.error) {
        console.error("Error fetching customers:", customersResult.error);
      }
      if (addressesResult.error) {
        console.error("Error fetching addresses:", addressesResult.error);
      }

      console.log("Fetched data:", {
        orders: ordersData.length,
        orderItems: orderItemsResult.data?.length || 0,
        customers: customersResult.data?.length || 0,
        addresses: addressesResult.data?.length || 0,
        slots: slotsResult.data?.length || 0,
        sectors: sectorsResult.data?.length || 0
      });

      // Create lookup maps for related data
      const itemsByOrder = (orderItemsResult.data || []).reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      const customersMap = new Map((customersResult.data || []).map(c => [c.id, c]));
      const addressesMap = new Map((addressesResult.data || []).map(a => [a.id, a]));
      const slotsMap = new Map((slotsResult.data || []).map(s => [s.id, s]));
      const sectorsMap = new Map((sectorsResult.data || []).map(s => [s.id, s]));

      // Calculate commission for each order (simplified calculation)
      const processedOrders: DetailedOrder[] = ordersData.map((order: any) => {
        const customer = customersMap.get(order.customer_id);
        const customerProfile = customer?.profiles?.[0];
        const deliveryAddress = addressesMap.get(order.delivery_address_id);
        const slotInfo = slotsMap.get(order.slot_id);
        const sectorInfo = sectorsMap.get(order.sector_id);
        const deliveryPartner = null; // Will implement delivery partner lookup later

        const orderItems: DetailedOrderItem[] = (itemsByOrder[order.id] || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          product_description: item.product_description,
          category_name: item.category_name,
          quality_type_name: item.quality_type_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          line_total: item.line_total,
          item_status: item.item_status,
          vendor: {
            id: item.vendors.id,
            business_name: item.vendors.business_name,
            contact_person: item.vendors.contact_person,
            phone: item.vendors.phone,
            email: item.vendors.email,
            business_city: item.vendors.business_city,
            business_state: item.vendors.business_state,
            rating: item.vendors.rating,
            total_reviews: item.vendors.total_reviews
          },
          vendor_confirmed_at: item.vendor_confirmed_at,
          vendor_notes: item.vendor_notes,
          picked_up_at: item.picked_up_at,
          warranty_months: item.warranty_months,
          delivery_time_days: item.estimated_delivery_days
        }));

        // Calculate commission per order item (not just total amount)
        let commissionEarned = 0;
        orderItems.forEach(item => {
          // This is a simplified calculation - in production, you'd want to
          // look up the actual commission rate for each product's category/quality
          commissionEarned += item.line_total * 0.1; // Default 10% per item
        });

        // Determine tracking status
        let trackingStatus = 'Order Placed';
        if (order.order_status === 'confirmed') trackingStatus = 'Confirmed';
        if (order.order_status === 'processing') trackingStatus = 'Processing';
        if (order.order_status === 'packed') trackingStatus = 'Packed';
        if (order.order_status === 'picked_up') trackingStatus = 'Picked Up';
        if (order.order_status === 'out_for_delivery') trackingStatus = 'Out for Delivery';
        if (order.order_status === 'delivered') trackingStatus = 'Delivered';
        if (order.order_status === 'cancelled') trackingStatus = 'Cancelled';

        return {
          id: order.id,
          order_number: order.order_number,
          customer_id: order.customer_id,
          customer_name: customerProfile?.full_name || 'Unknown Customer',
          customer_phone: customerProfile?.phone || '',
          customer_email: customerProfile?.email,
          delivery_address: deliveryAddress ? {
            address_box: deliveryAddress.address_box,
            area: deliveryAddress.area,
            city: deliveryAddress.city,
            pincode: deliveryAddress.pincode
          } : null,
          total_amount: order.total_amount,
          subtotal: order.subtotal,
          shipping_charges: order.shipping_charges || 0,
          tax_amount: order.tax_amount || 0,
          discount_amount: order.discount_amount || 0,
          order_status: order.order_status,
          payment_status: order.payment_status,
          payment_method: order.payment_method,
          created_at: order.created_at,
          updated_at: order.updated_at,
          estimated_delivery_date: order.estimated_delivery_date,
          actual_delivery_date: order.actual_delivery_date,
          delivery_partner: deliveryPartner ? {
            id: order.delivery_partner_orders[0].delivery_partner_id,
            name: deliveryPartner.full_name,
            phone: deliveryPartner.phone
          } : undefined,
          slot_info: slotInfo ? {
            slot_name: slotInfo.slot_name,
            start_time: slotInfo.start_time,
            end_time: slotInfo.end_time
          } : undefined,
          sector_info: sectorInfo ? {
            sector_name: sectorInfo.name
          } : undefined,
          order_items: orderItems,
          tracking_status: trackingStatus,
          commission_earned: commissionEarned,
          notes: order.notes,
          cancellation_reason: order.cancellation_reason
        };
      });

      setDetailedOrders(processedOrders);

      // Calculate vendor sales summary
      const salesByVendor: { [key: string]: VendorSales } = {};
      processedOrders.forEach(order => {
        order.order_items.forEach(item => {
          if (!salesByVendor[item.vendor.id]) {
            salesByVendor[item.vendor.id] = {
              vendor_id: item.vendor.id,
              business_name: item.vendor.business_name,
              orders: 0,
              gmv: 0,
              commission: 0,
            };
          }
          salesByVendor[item.vendor.id].orders += 1;
          salesByVendor[item.vendor.id].gmv += item.line_total;
          // Calculate commission per item - this should ideally use the actual commission rules
          // For now, using a simplified calculation that considers the item individually
          salesByVendor[item.vendor.id].commission += item.line_total * 0.1; // Simplified 10% per item
        });
      });
      setVendorSalesSummary(Object.values(salesByVendor));

    } catch (error) {
      console.error('Error fetching detailed orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
    } finally {
      setDetailedOrdersLoading(false);
    }
  };

  // Database Setup Check
  const checkDatabaseSetup = useCallback(async () => {
    try {
      const [categoriesResult, qualitiesResult] = await Promise.all([
        supabase.from('categories').select('id').limit(1),
        supabase.from('category_qualities').select('id').limit(1)
      ]);

      setDbSetupStatus({
        categoriesExists: !categoriesResult.error && categoriesResult.data !== null,
        categoryQualitiesExists: !qualitiesResult.error && qualitiesResult.data !== null,
        isChecking: false
      });
    } catch (error) {
      console.error('Error checking database setup:', error);
      setDbSetupStatus(prev => ({ ...prev, isChecking: false }));
    }
  }, []);

  // Quick Actions Setup
  useEffect(() => {
    setQuickActions([
      {
        id: 'vendors',
        title: 'Vendor Management',
        description: 'Manage vendors, applications and approvals',
        icon: <Store className="h-6 w-6" />,
        action: () => navigate('/admin/vendor-management'),
        count: stats.totalVendors
      },
      {
        id: 'delivery',
        title: 'Delivery Partners',
        description: 'Manage delivery partners and zones',
        icon: <Truck className="h-6 w-6" />,
        action: () => navigate('/admin/delivery-partners'),
        count: 0
      },
      {
        id: 'customers',
        title: 'Customer Management',
        description: 'Manage customers, orders and analytics',
        icon: <Users className="h-6 w-6" />,
        action: () => navigate('/admin/customer-management'),
        count: stats.totalCustomers
      },
      {
        id: 'commission',
        title: 'Commission Rules',
        description: 'Configure commission rates and rules',
        icon: <DollarSign className="h-6 w-6" />,
        action: () => navigate('/admin/commission-rules')
      },
      // {
      //   id: 'payouts',
      //   title: 'Payout Management',
      //   description: 'Process and manage payouts',
      //   icon: <DollarSign className="h-6 w-6" />,
      //   action: () => navigate('/admin/payouts')
      // }
    ]);
  }, [navigate, stats.totalVendors, stats.totalCustomers]);

  // Initialize and setup intervals
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        checkDatabaseSetup(),
        fetchDashboardData(),
        loadFinancialData(),
        loadAllVendorAnalytics()
      ]);
    };

    initialize();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      loadFinancialData();
      loadAllVendorAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkDatabaseSetup, fetchDashboardData]);

  // Utility functions
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const getGrowthColor = (growth: number) => growth >= 0 ? 'text-green-600' : 'text-red-600';
  const getGrowthIcon = (growth: number) => growth >= 0
    ? <ChevronUp className="h-4 w-4" />
    : <ChevronDown className="h-4 w-4" />;

  // SLA badge helper
  const getSlaBadge = (o: DetailedOrder) => {
    const eta = o.estimated_delivery_date ? new Date(o.estimated_delivery_date).getTime() : null;
    if (!eta) return null;
    const diffMs = eta - Date.now();
    const mins = Math.ceil(diffMs / 60000);
    if (mins >= 30) return <Badge variant="outline">ETA {mins}m</Badge>;
    if (mins > 0) return <Badge variant="secondary">ETA {mins}m</Badge>;
    return <Badge variant="destructive">SLA Breach {Math.abs(mins)}m</Badge>;
  };

  // Derived live counters
  const liveOnlyOrders = detailedOrders.filter(o => ['pending', 'confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery'].includes(o.order_status));
  const nowTs = Date.now();
  const newIn5mCount = detailedOrders.filter(o => nowTs - new Date(o.created_at).getTime() <= 5 * 60 * 1000).length;
  const delayedCount = detailedOrders.filter(o => {
    const eta = o.estimated_delivery_date ? new Date(o.estimated_delivery_date).getTime() : null;
    return eta && o.order_status !== 'delivered' && nowTs > eta;
  }).length;
  const unassignedCount = detailedOrders.filter(o => !o.delivery_partner && o.order_status !== 'cancelled' && o.order_status !== 'delivered').length;

  // Notify when delayed orders increase
  useEffect(() => {
    if (delayedCount > prevDelayedRef.current) {
      toast({ title: 'SLA At Risk', description: `${delayedCount} orders delayed`, variant: 'destructive' });
    }
    prevDelayedRef.current = delayedCount;
  }, [delayedCount]);

  // Realtime subscription for live orders
  useEffect(() => {
    const channel = supabase
      .channel('live-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        // toast on new orders
        const evt = (payload as any).eventType;
        if (evt === 'INSERT') {
          const orderNo = (payload as any).new?.order_number;
          toast({ title: 'New Order', description: orderNo ? `Order ${orderNo} received` : 'New order received' });
        }
        if (ordersDebounceRef.current) window.clearTimeout(ordersDebounceRef.current);
        ordersDebounceRef.current = window.setTimeout(() => {
          fetchDetailedOrders();
          setLastUpdated(new Date());
        }, 300);
        setActivityFeed(prev => ([{ time: new Date().toLocaleTimeString(), type: 'orders', message: `${evt} on orders` }, ...prev]).slice(0, 20));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        if (itemsDebounceRef.current) window.clearTimeout(itemsDebounceRef.current);
        itemsDebounceRef.current = window.setTimeout(() => {
          fetchDetailedOrders();
          setLastUpdated(new Date());
        }, 300);
        const evt = (payload as any).eventType;
        setActivityFeed(prev => ([{ time: new Date().toLocaleTimeString(), type: 'order_items', message: `${evt} on order_items` }, ...prev]).slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDetailedOrders]);

  // Quick status update action
  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Order Updated', description: `Status changed to ${nextStatus}` });
      await fetchDetailedOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update order', variant: 'destructive' });
    }
  };

  // Database Setup Notification Component
  const DatabaseSetupNotification = () => {
    const { categoriesExists, categoryQualitiesExists, isChecking } = dbSetupStatus;

    if (isChecking) {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <RefreshCw className="animate-spin h-4 w-4" />
              Checking database setup...
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (!categoriesExists || !categoryQualitiesExists) {
      return (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-3">
              <div className="font-medium text-orange-800">Database Setup Required</div>
              <div className="text-sm text-orange-700">
                Some required database tables are missing. Please run the setup script to enable full functionality.
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => navigate('/admin/database-setup')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Setup Database
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  const loadFinancialData = async () => {
    try {
      const [platformStatsRes, transactionsRes, payoutsRes, dailySummaryRes] = await Promise.all([
        TransactionAPI.getDailyTransactionSummary(), // Changed from TryodoAPI.Analytics.getPlatformFinancialSummary
        TransactionAPI.getTransactions(),
        PayoutAPI.getPayouts({}), // Changed from PayoutAPI.getPayouts(user!.id)
        TransactionAPI.getDailyTransactionSummary() // Changed from TryodoAPI.Analytics.getDailyOrderSummary
      ]);

      if (platformStatsRes.success) {
        // Assuming platformStatsRes.data is an array of daily summaries, aggregate them
        const totalCommissionEarned = platformStatsRes.data?.reduce((sum, day) => sum + (day.total_commission || 0), 0) || 0;
        const totalTransactionsProcessed = platformStatsRes.data?.reduce((sum, day) => sum + (day.total_transactions || 0), 0) || 0;

        // For simplicity, setting today/week/month/year based on last entry or aggregation
        const latestSummary = platformStatsRes.data?.[0];
        setPlatformStats({
          total_commission_earned: totalCommissionEarned,
          today_commission: latestSummary?.total_commission || 0,
          week_commission: totalCommissionEarned, // More complex logic needed for real week/month/year
          month_commission: totalCommissionEarned,
          year_commission: totalCommissionEarned,
          total_transactions_processed: totalTransactionsProcessed,
          today_transactions: latestSummary?.total_transactions || 0,
          week_transactions: totalTransactionsProcessed,
          month_transactions: totalTransactionsProcessed,
        });

      } else {
        console.error('Error loading platform financial summary:', platformStatsRes.error); // Keep error logging if error property exists for the ApiResponse type
      }
      if (transactionsRes.success) {
        setTransactions(transactionsRes.data);
      }
      if (payoutsRes.success) {
        setPayouts(payoutsRes.data);
      }
      if (dailySummaryRes.success && dailySummaryRes.data) { // Add null check for dailySummaryRes.data
        setDailySummary(dailySummaryRes.data);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive"
      });
    }
  };

  const handleCreateCommissionRule = async () => {
    console.log('🚀 Commission Rule creation started', { commissionForm, user: user?.id });

    if (!commissionForm.categoryId || !commissionForm.commissionPercentage) {
      console.log('❌ Form validation failed', commissionForm);
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use user ID directly instead of profile lookup to avoid 406 error
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Unable to identify current user. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      // Since commission_rules table doesn't exist, we'll simulate the functionality
      // In a real implementation, you would need to create the commission_rules table first

      const newRule = {
        id: crypto.randomUUID(),
        category_id: commissionForm.categoryId,
        commission_percentage: parseFloat(commissionForm.commissionPercentage),
        minimum_commission: parseFloat(commissionForm.minimumCommission) || 0,
        maximum_commission: commissionForm.maximumCommission ? parseFloat(commissionForm.maximumCommission) : null,
        notes: commissionForm.notes || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        is_active: true
      };

      // Store in localStorage temporarily (in production, this would go to the database)
      const existingRules = JSON.parse(localStorage.getItem('commission_rules') || '[]');
      existingRules.push(newRule);
      localStorage.setItem('commission_rules', JSON.stringify(existingRules));

      console.log('✅ Commission rule created (simulated):', newRule);

      toast({
        title: "Success",
        description: "Commission rule created successfully! (Note: This is currently simulated - the commission_rules table needs to be created in the database)"
      });

      // Reset form
      setCommissionForm({
        categoryId: '',
        commissionPercentage: '',
        minimumCommission: '',
        maximumCommission: '',
        notes: ''
      });

      setShowCommissionForm(false);
      loadCommissionData();
    } catch (error: any) {
      console.error('Error creating commission rule:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create commission rule",
        variant: "destructive"
      });
    }
  };

  const handleProcessPayout = async (payoutId: string, status: string) => {
    try {
      const result = await PayoutAPI.updatePayoutStatus(payoutId, status as any, undefined, user!.id);

      if (result.success) {
        toast({
          title: "Success",
          description: `Payout ${status} successfully`
        });
        loadFinancialData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${status} payout`,
        variant: "destructive"
      });
    }
  };

  // Add function to load all vendor analytics
  const loadAllVendorAnalytics = async () => {
    try {
      setLoadingVendorAnalytics(true);
      setVendorAnalyticsError(null);

      // Get all vendors first
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_name, is_verified, rating, total_reviews')
        .eq('is_active', true)
        .order('business_name');

      if (vendorsError) throw vendorsError;

      if (!vendors || vendors.length === 0) {
        setAllVendorAnalytics([]);
        return;
      }

      // Get analytics for each vendor
      const vendorAnalytics = await Promise.all(
        vendors.map(async (vendor) => {
          try {
            const response = await TryodoAPI.Analytics.getVendorFinancialSummary(vendor.id);
            const walletResponse = await WalletAPI.getVendorWallet(vendor.id); // Corrected WalletAPI call

            const analytics = response.success ? response.data : {
              total_sales: 0,
              total_commission: 0,
              net_earnings: 0,
              pending_payouts: 0,
              total_orders: 0,
              total_products: 0
            };

            const wallet = walletResponse.success ? walletResponse.data : {
              available_balance: 0,
              pending_balance: 0,
              total_earned: 0,
              total_paid_out: 0
            };

            return {
              ...vendor,
              analytics,
              wallet,
              performance_score: calculateVendorPerformanceScore(analytics, vendor)
            };
          } catch (error) {
            console.error(`Error loading analytics for vendor ${vendor.id}:`, error);
            return {
              ...vendor,
              analytics: {
                total_sales: 0,
                total_commission: 0,
                net_earnings: 0,
                pending_payouts: 0,
                total_orders: 0,
                total_products: 0
              },
              wallet: {
                available_balance: 0,
                pending_balance: 0,
                total_earned: 0,
                total_paid_out: 0
              },
              performance_score: 0,
              error: true
            };
          }
        })
      );

      // Sort by total sales descending
      vendorAnalytics.sort((a, b) => (b.analytics?.total_sales || 0) - (a.analytics?.total_sales || 0));
      setAllVendorAnalytics(vendorAnalytics);

    } catch (error: any) {
      console.error('Error loading vendor analytics:', error);
      setVendorAnalyticsError(error.message || 'Failed to load vendor analytics');
      toast({
        title: "Error",
        description: "Failed to load vendor analytics: " + (error.message || 'Unknown error'),
        variant: "destructive"
      });
    } finally {
      setLoadingVendorAnalytics(false);
    }
  };

  // Helper function to calculate vendor performance score
  const calculateVendorPerformanceScore = (analytics: any, vendor: any): number => {
    if (!analytics || !vendor) return 0;

    let score = 0;

    // Sales volume (40% weight)
    const salesScore = Math.min((analytics.total_sales || 0) / 100000 * 40, 40);
    score += salesScore;

    // Order count (20% weight)
    const orderScore = Math.min((analytics.total_orders || 0) / 100 * 20, 20);
    score += orderScore;

    // Product count (15% weight)
    const productScore = Math.min((analytics.total_products || 0) / 50 * 15, 15);
    score += productScore;

    // Rating (15% weight)
    const ratingScore = ((vendor?.rating || 0) / 5) * 15;
    score += ratingScore;

    // Verification status (10% weight)
    const verificationScore = vendor?.is_verified ? 10 : 0;
    score += verificationScore;

    return Math.round(score);
  };

  // Add auto-assignment handler
  const handleAutoAssignDeliveryPartners = async () => {
    try {
      setRefreshing(true);
      toast({
        title: "Starting Auto-Assignment",
        description: "Assigning delivery partners to slots with orders...",
      });

      const result = await DeliveryAPI.autoAssignDeliveryPartners();

      if (result.success) {
        toast({
          title: "Auto-Assignment Complete",
          description: `Successfully assigned ${result.assignments} delivery partners to slots.`,
        });
      } else {
        toast({
          title: "Auto-Assignment Failed",
          description: result.error?.message || "Failed to auto-assign delivery partners", // Access message property safely
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      toast({
        title: "Error",
        description: "Failed to run auto-assignment",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Add function to remove existing assignments for testing
  const handleRemoveAssignments = async () => {
    try {
      setRefreshing(true);
      toast({
        title: "Removing Assignments",
        description: "Removing existing assignments for testing...",
      });

      // Remove assignment for Evening Express slot
      const result = await DeliveryAPI.removeSlotAssignment('ac0f3026-1d09-4224-b3e1-b5a14017b3b8');

      if (result.success) {
        toast({
          title: "Assignments Removed",
          description: result.message,
        });
      } else {
        toast({
          title: "Failed to Remove Assignments",
          description: result.error?.message || "An error occurred", // Access message property safely
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing assignments:', error);
      toast({
        title: "Error",
        description: "Failed to remove assignments",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Commission management handlers
  const handleEditVendorCommission = (commission: any) => {
    setCalculatorForm({
      vendorId: commission.vendor_id,
      qualityId: commission.quality_id,
      basePrice: 1000,
      commissionRate: commission.commission_rate,
      upsideRate: commission.upside_rate,
      effectiveFrom: commission.effective_from || '',
      notes: commission.notes || ''
    });
    setShowVendorCommissionForm(true);
  };

  const handleCalculateCommission = async () => {
    try {
      const response = await CommissionAPI.calculatePricingBreakdown(
        calculatorForm.vendorId,
        calculatorForm.qualityId,
        calculatorForm.basePrice
      );

      if (response.success) {
        setCalculatorResult(response.data);
      } else {
        toast({
          title: "Calculation Error",
          description: response.error || "Failed to calculate commission breakdown",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      toast({
        title: "Error",
        description: "Failed to calculate commission. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateVendorCommission = async () => {
    if (!calculatorForm.vendorId || !calculatorForm.qualityId || !calculatorForm.commissionRate) {
      toast({
        title: "Error",
        description: "Please fill in vendor, quality, and commission rate",
        variant: "destructive"
      });
      return;
    }

    try {
      // Use user ID directly instead of profile lookup to avoid 406 error
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Unable to identify current user. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      // Since vendor_commissions table doesn't exist, we'll simulate the functionality
      // In a real implementation, you would need to create the vendor_commissions table first

      const newCommission = {
        id: crypto.randomUUID(),
        vendor_id: calculatorForm.vendorId,
        quality_id: calculatorForm.qualityId,
        commission_rate: calculatorForm.commissionRate,
        upside_rate: calculatorForm.upsideRate || 0,
        effective_from: calculatorForm.effectiveFrom || new Date().toISOString(),
        notes: calculatorForm.notes || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        is_active: true
      };

      // Store in localStorage temporarily (in production, this would go to the database)
      const existingCommissions = JSON.parse(localStorage.getItem('vendor_commissions') || '[]');
      existingCommissions.push(newCommission);
      localStorage.setItem('vendor_commissions', JSON.stringify(existingCommissions));

      console.log('✅ Vendor commission created (simulated):', newCommission);

      toast({
        title: "Success",
        description: "Vendor commission created successfully! (Note: This is currently simulated - the vendor_commissions table needs to be created in the database)"
      });

      // Reset form
      setCalculatorForm({
        vendorId: '',
        qualityId: '',
        basePrice: 0,
        commissionRate: 0,
        upsideRate: 0,
        effectiveFrom: '',
        notes: ''
      });

      setShowVendorCommissionForm(false);
      loadCommissionData();
    } catch (error: any) {
      console.error('Error creating vendor commission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor commission",
        variant: "destructive"
      });
    }
  };

  const loadCommissionData = async () => {
    try {
      console.log('🔄 Loading commission data...');

      // Load all vendors separately with better error handling
      const loadAllVendors = async () => {
        try {
          console.log('📋 Loading all vendors...');

          // Try to get all active vendors, not just verified ones
          const { data: allVendorData, error: allVendorError } = await supabase
            .from('vendors')
            .select('id, business_name, is_verified, is_active')
            .eq('is_active', true)
            .order('business_name');

          if (allVendorError) {
            console.error('❌ Error loading all vendors:', allVendorError);
            throw allVendorError;
          }

          console.log('✅ Loaded all vendors:', allVendorData?.length, allVendorData);
          return allVendorData || [];
        } catch (error) {
          console.error('💥 Failed to load vendors:', error);
          // Fallback to verified vendors API
          const vendorsRes = await VendorAPI.getVerifiedVendors({ limit: 100 });
          if (vendorsRes.success) {
            console.log('✅ Fallback: loaded verified vendors:', vendorsRes.data?.length);
            return vendorsRes.data || [];
          }
          throw error;
        }
      };

      // Load data with error handling for missing functions
      const [
        vendorCommissionsRes,
        allVendorData,
        qualitiesRes,
        categoriesRes
      ] = await Promise.all([
        CommissionAPI.getVendorCommissions(),
        loadAllVendors(),
        CategoryAPI.getQualityCategories(),
        CategoryAPI.getAllCategories()
      ]);

      // Skip missing database functions to avoid 404 errors
      console.log('⚠️ Skipping quality performance metrics and vendor summary API calls (functions not available)');
      let qualityPerformanceRes = { success: true, data: [], message: 'Skipped - function not available' };
      let vendorSummaryRes = { success: true, data: [], message: 'Skipped - function not available' };

      console.log('📊 Commission data results:', {
        vendorCommissions: vendorCommissionsRes.success ? vendorCommissionsRes.data?.length : vendorCommissionsRes.error,
        vendors: allVendorData?.length,
        qualities: qualitiesRes.success ? qualitiesRes.data?.length : qualitiesRes.error,
        categories: categoriesRes.success ? categoriesRes.data?.length : categoriesRes.error,
        qualityPerformance: qualityPerformanceRes.success,
        vendorSummary: vendorSummaryRes.success
      });

      // Set vendors first
      setAllVendors(allVendorData);
      console.log('✅ Set vendors in state:', allVendorData?.length);

      if (vendorCommissionsRes.success) {
        // Ensure vendor data is properly nested
        const commissions = vendorCommissionsRes.data || [];
        // Map vendor data if it's missing
        if (commissions.length > 0 && allVendorData.length > 0) {
          const vendorMap = new Map(allVendorData.map(v => [v.id, v]));
          commissions.forEach(commission => {
            if (!commission.vendor && vendorMap.has(commission.vendor_id)) {
              commission.vendor = vendorMap.get(commission.vendor_id);
            }
          });
        }
        setVendorCommissions(commissions);
      } else {
        console.error('❌ Failed to load vendor commissions:', vendorCommissionsRes.error);
      }

      if (qualitiesRes.success) {
        setAllQualities(qualitiesRes.data || []);
        console.log('✅ Loaded qualities:', qualitiesRes.data?.length);
      } else {
        console.error('❌ Failed to load qualities:', qualitiesRes.error);
      }

      if (categoriesRes.success) {
        setAllCategories(categoriesRes.data || []);
        console.log('✅ Loaded categories:', categoriesRes.data?.length);
      } else {
        console.error('❌ Failed to load categories:', categoriesRes.error);
      }

      if (qualityPerformanceRes.success) {
        setQualityPerformance(qualityPerformanceRes.data || []);
      } else {
        console.error('❌ Failed to load quality performance:', qualityPerformanceRes.message); // Changed from .error
      }

      if (vendorSummaryRes.success) {
        // Ensure vendor names are available in summary
        const summary = vendorSummaryRes.data || [];
        if (summary.length > 0 && allVendorData.length > 0) {
          const vendorMap = new Map(allVendorData.map(v => [v.id, v]));
          summary.forEach(item => {
            if (!item.business_name && vendorMap.has(item.vendor_id)) {
              item.business_name = vendorMap.get(item.vendor_id)?.business_name;
            }
          });
        }
        setVendorCommissionSummary(summary);
      } else {
        console.error('❌ Failed to load vendor summary:', vendorSummaryRes.message); // Changed from .error
      }
    } catch (error) {
      console.error('💥 Error loading commission data:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load commission data. Please check console for details.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => { }} />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Real-time business overview and management</p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Database Setup Notification */}
        <DatabaseSetupNotification />

        <Tabs defaultValue="overview" className="space-y-6">
          {/* Mobile-first tabs with improved layout */}
          <div className="block sm:hidden mb-4">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-soft h-auto">
              <TabsTrigger
                value="overview"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>Home</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="slot-analytics"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>4-Layer</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="operations"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Ops</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Trends</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>Trans</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="vendor-sales"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Store className="h-3 w-3" />
                  <span>V Sales</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="pnl-dashboard"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <PieChart className="h-3 w-3" />
                  <span>P&L</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="cancellations"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  <span>Cancel</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="management"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Settings className="h-3 w-3" />
                  <span>Manage</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="live"
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Live</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-10 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Overview
              </TabsTrigger>
              <TabsTrigger value="slot-analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                4-Layer Analytics
              </TabsTrigger>
              <TabsTrigger value="operations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Operations
              </TabsTrigger>
              <TabsTrigger value="trends" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Trends
              </TabsTrigger>
              <TabsTrigger value="pnl-dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                P&L Dashboard
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="vendor-sales" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Vendor Sales
              </TabsTrigger>
              <TabsTrigger value="cancellations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Cancellations
              </TabsTrigger>
              <TabsTrigger value="management" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Management
              </TabsTrigger>
              <TabsTrigger value="live" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Live Orders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue */}
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-5"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                      <div className={`flex items-center text-sm ${getGrowthColor(stats.revenueGrowth)} mt-1`}>
                        {getGrowthIcon(stats.revenueGrowth)}
                        <span>{formatPercentage(stats.revenueGrowth)} vs last period</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders */}
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-5"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
                      <div className={`flex items-center text-sm ${getGrowthColor(stats.orderGrowth)} mt-1`}>
                        {getGrowthIcon(stats.orderGrowth)}
                        <span>{formatPercentage(stats.orderGrowth)} vs last period</span>
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <ShoppingBag className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customers */}
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-5"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</p>
                      <div className={`flex items-center text-sm ${getGrowthColor(stats.customerGrowth)} mt-1`}>
                        {getGrowthIcon(stats.customerGrowth)}
                        <span>{formatPercentage(stats.customerGrowth)} vs last period</span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Orders (Critical) */}
              <Card className={`relative overflow-hidden ${stats.pendingOrders > 10 ? 'ring-2 ring-red-500' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-5"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Pending Orders</p>
                      <p className="text-2xl font-bold text-red-600">{stats.pendingOrders}</p>
                      {stats.pendingOrders > 10 && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Requires Attention
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <Clock className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">Avg Order Value</p>
                    <p className="text-lg font-bold">{formatCurrency(stats.averageOrderValue)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">Active Vendors</p>
                    <p className="text-lg font-bold">{stats.activeVendors}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">Total Products</p>
                    <p className="text-lg font-bold">{stats.totalProducts.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">Conversion Rate</p>
                    <p className="text-lg font-bold">{stats.conversionRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">Satisfaction</p>
                    <div className="flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <p className="text-lg font-bold">{stats.customerSatisfaction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-gray-600 text-xs">System Uptime</p>
                    <p className="text-lg font-bold text-green-600">{stats.systemUptime}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 4-Layer Analytics Summary */}
            <FourLayerSummary />


          </TabsContent>

          <TabsContent value="slot-analytics" className="space-y-6">
            <SlotSectorAnalytics />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <OperationalControls />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <HistoricalTrendsAnalytics />
          </TabsContent>

          <TabsContent value="pnl-dashboard" className="space-y-6">
            <PnLDashboard />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            {/* Platform Financial Overview */}
            {platformStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{platformStats.today_commission.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platformStats.today_transactions} transactions today
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Week</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{platformStats.week_commission.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platformStats.week_transactions} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      ₹{platformStats.month_commission.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platformStats.month_transactions} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{platformStats.total_commission_earned.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platformStats.total_transactions_processed} total transactions
                    </p>
                  </CardContent>Transaction
                </Card>
              </div>
            )}

            {/* Transaction Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={transactionFilters.startDate}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={transactionFilters.endDate}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <select
                      id="transactionType"
                      value={transactionFilters.transactionType}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Types</option>
                      <option value="order_payment">Order Payment</option>
                      <option value="commission_deduction">Commission Deduction</option>
                      <option value="vendor_payout">Vendor Payout</option>
                      <option value="delivery_payment">Delivery Payment</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={transactionFilters.status}
                      onChange={(e) => setTransactionFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions ({transactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${transaction.transaction_status === 'completed' ? 'bg-green-500' :
                          transaction.transaction_status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                        <div>
                          <p className="font-medium">{transaction.transaction_number}</p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.transaction_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{transaction.gross_amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">
                          Commission: ₹{transaction.commission_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No transactions found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendor-sales" className="space-y-6">
            {/* Vendor Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Overall Vendor Metrics */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600" />
                    Vendor Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Vendors</span>
                    <span className="font-semibold">{allVendorAnalytics.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Vendors</span>
                    <span className="font-semibold text-green-600">
                      {allVendorAnalytics.filter(v => v.analytics?.total_sales > 0).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Sales</span>
                    <span className="font-semibold text-blue-600">
                      ₹{allVendorAnalytics.reduce((sum, v) => sum + (v.analytics?.total_sales || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Commission</span>
                    <span className="font-semibold text-purple-600">
                      ₹{allVendorAnalytics.reduce((sum, v) => sum + (v.analytics?.total_commission || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Vendors */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top Performing Vendors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allVendorAnalytics
                      .filter(vendor => vendor.analytics?.total_sales > 0)
                      .sort((a, b) => (b.analytics?.total_sales || 0) - (a.analytics?.total_sales || 0))
                      .slice(0, 5)
                      .map((vendor, index) => (
                        <div key={vendor.id || vendor.vendor?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                              }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{vendor.business_name || vendor.vendor?.business_name || 'Unknown Vendor'}</p>
                              <p className="text-xs text-gray-600">
                                {vendor.analytics?.total_orders || 0} orders • {vendor.analytics?.total_products || 0} products
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₹{(vendor.analytics?.total_sales || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-600">
                              Commission: ₹{(vendor.analytics?.total_commission || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    {allVendorAnalytics.filter(v => v.analytics?.total_sales > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No vendor sales data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Vendor Analytics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Detailed Vendor Analytics
                  </div>
                  <Button
                    onClick={loadAllVendorAnalytics}
                    disabled={loadingVendorAnalytics}
                    size="sm"
                    variant="outline"
                  >
                    {loadingVendorAnalytics ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Complete analytics overview for all vendors in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVendorAnalytics ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading vendor analytics...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-4 font-semibold">Vendor</th>
                          <th className="text-right p-4 font-semibold">Total Sales</th>
                          <th className="text-right p-4 font-semibold">Orders</th>
                          <th className="text-right p-4 font-semibold">Products</th>
                          <th className="text-right p-4 font-semibold">Commission</th>
                          <th className="text-right p-4 font-semibold">Net Earnings</th>
                          <th className="text-right p-4 font-semibold">Avg Order</th>
                          <th className="text-center p-4 font-semibold">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allVendorAnalytics.map((vendorData) => {
                          const analytics = vendorData.analytics;
                          // Support both vendor.vendor and direct vendor properties
                          const vendor = vendorData.vendor || vendorData;
                          const performanceScore = calculateVendorPerformanceScore(analytics, vendor);

                          return (
                            <tr key={vendor?.id || vendorData.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="p-4">
                                <div>
                                  <p className="font-semibold">{vendor?.business_name || vendorData.business_name || 'Unknown Vendor'}</p>
                                  <p className="text-xs text-gray-600">{vendor?.email || vendorData.email || 'No email'}</p>
                                  <Badge variant={(vendor?.is_verified || vendorData.is_verified) ? "default" : "secondary"} className="text-xs mt-1">
                                    {(vendor?.is_verified || vendorData.is_verified) ? "Verified" : "Unverified"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-bold text-green-600">
                                  ₹{(analytics?.total_sales || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-semibold">{analytics?.total_orders || 0}</span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-semibold">{analytics?.total_products || 0}</span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-semibold text-purple-600">
                                  ₹{(analytics?.total_commission || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-semibold text-blue-600">
                                  ₹{(analytics?.net_earnings || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-semibold">
                                  ₹{(analytics?.average_order_value || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center">
                                  <div className={`w-16 h-2 rounded-full ${performanceScore >= 80 ? 'bg-green-500' :
                                    performanceScore >= 60 ? 'bg-yellow-500' :
                                      performanceScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}>
                                    <div
                                      className="h-full bg-white rounded-full transition-all duration-300"
                                      style={{ width: `${Math.max(0, 100 - performanceScore)}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 text-xs font-semibold">{performanceScore}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {allVendorAnalytics.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Store className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-semibold mb-2">No vendor analytics available</p>
                        <p className="text-sm">Vendor analytics will appear here once vendors have sales data.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancellations" className="space-y-6">
            <CancellationAnalytics />
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            {/* Management Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/models')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      Manage Models
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Add, edit, and manage phone models for all brands
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Control the phone models available in the marketplace
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/categories')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      Manage Categories
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Manage phone feature categories like Display, Battery, Camera
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Define categories for organizing phone specifications and features
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/qualities')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-indigo-600" />
                      Manage Qualities
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Define specific qualities for each phone model and category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Add qualities like "TFT" for Display, "Ckoza" for Battery, etc.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/vendor-management')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-green-600" />
                      Manage Vendors
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Approve and manage vendor accounts and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Review vendor applications and manage approvals
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/manage-commissions')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Manage Commissions
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Configure commission rates, analytics, and vendor-quality pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Set commission rules, calculate pricing breakdowns, and analyze performance
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/sectors')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Manage Sectors
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Create and manage delivery sectors by grouping pincodes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Define delivery zones and optimize routing for efficient deliveries
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/slots')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      Manage Delivery Slots
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Configure delivery time slots and availability for each sector
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Set up cutoff times, capacity limits, and delivery windows
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/payouts')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      Manage Payouts
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Process and manage vendor and delivery partner payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Review, approve, and track payment disbursements
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer " onClick={() => navigate('/admin/customer-management')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-orange-600" />
                      Manage Customers
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Manage customers and their orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Manage customers and their orders
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-75">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-pink-600" />
                      Marketing & Promotions
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Create and manage promotional campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Design marketing campaigns and promotional offers
                  </p>
                  <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/delivery-partners')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-600" />
                      Manage Delivery Partner
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Manage delivery partners and zones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Review, approve, and manage delivery partner accounts and areas.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/commission-rules')}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Manage Category Commissions
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Configure commission rates, analytics, and vendor-quality pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Set commission rules, calculate pricing breakdowns, and analyze performance
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Marketplace Management Section */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Marketplace Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/market/categories')}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Market Categories
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Manage marketplace product categories and hierarchies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Create and organize categories for marketplace products with SEO optimization
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/market/brands')}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-purple-600" />
                        Market Brands
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Manage marketplace brands and their guidelines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Add and manage brands for marketplace products with logos and guidelines
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/market/products')}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-600" />
                        Market Products
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Manage the master product catalog for marketplace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Create and manage products that vendors can request to sell with specifications and images
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/market/vendor-requests')}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-600" />
                        Vendor Requests
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      Review and approve vendor product requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Manage vendor applications to sell marketplace products with approval workflow
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-red-600" />
                        Market Analytics
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </CardTitle>
                    <CardDescription>
                      View marketplace performance and analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Monitor marketplace sales, vendor performance, and trends
                    </p>
                    <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            {/* Live Metrics Chips */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Live: {liveOnlyOrders.length}</Badge>
              <Badge variant="outline">New (5m): {newIn5mCount}</Badge>
              <Badge variant={delayedCount ? 'destructive' : 'secondary'}>Delayed: {delayedCount}</Badge>
              <Badge variant={unassignedCount ? 'secondary' : 'outline'}>Unassigned: {unassignedCount}</Badge>
              <Button size="sm" onClick={handleAutoAssignDeliveryPartners} className="ml-auto">
                <Zap className="h-4 w-4 mr-1" /> Auto-Assign
              </Button>
            </div>

            {/* Status Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { key: 'pending', label: 'Pending' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'processing', label: 'Processing' },
                { key: 'packed', label: 'Packed' },
                { key: 'picked_up', label: 'Picked Up' },
                { key: 'out_for_delivery', label: 'Out for Delivery' }
              ].map((col) => {
                const orders = liveOnlyOrders.filter(o => o.order_status === col.key);
                return (
                  <Card key={col.key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span>{col.label}</span>
                        <Badge variant="secondary">{orders.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {orders.slice(0, 10).map((o) => {
                        const itemVendors = new Set(o.order_items.map(i => i.vendor.id));
                        const isNew = Date.now() - new Date(o.created_at).getTime() < 60 * 1000;
                        const nextMap: Record<string, string> = {
                          pending: 'confirmed',
                          confirmed: 'processing',
                          processing: 'packed',
                          packed: 'picked_up',
                          picked_up: 'out_for_delivery',
                          out_for_delivery: 'delivered'
                        };
                        const next = nextMap[o.order_status];
                        return (
                          <div key={o.id} className={`p-3 border rounded-lg ${isNew ? 'bg-blue-50' : 'bg-white'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">{o.order_number}</div>
                                <div className="text-xs text-gray-600">{new Date(o.created_at).toLocaleString()}</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-sm font-medium">₹{o.total_amount.toLocaleString()}</span>
                                  {getSlaBadge(o)}
                                  <Badge variant="outline">{itemVendors.size} vendor(s)</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => { setSelectedOrder(o); setShowOrderDetails(true); }}>View</Button>
                                {next && (
                                  <Button size="sm" onClick={() => updateOrderStatus(o.id, next)}>Advance</Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {orders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">No orders</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Live Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityFeed.length === 0 && (
                    <div className="text-gray-500 text-sm">No recent activity</div>
                  )}
                  {activityFeed.map((e, idx) => (
                    <div key={idx} className="text-sm flex items-center justify-between border-b last:border-b-0 py-1">
                      <span className="text-gray-600">{e.message}</span>
                      <span className="text-gray-400">{e.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detailed Order Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Order ID:</span>
                        <span>{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Order Number:</span>
                        <span>{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Status:</span>
                        <Badge variant={selectedOrder.order_status === 'delivered' ? 'default' : 'secondary'}>
                          {selectedOrder.tracking_status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Created:</span>
                        <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Updated:</span>
                        <span>{new Date(selectedOrder.updated_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Subtotal:</span>
                        <span>₹{selectedOrder.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Shipping:</span>
                        <span>₹{selectedOrder.shipping_charges.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tax:</span>
                        <span>₹{selectedOrder.tax_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Discount:</span>
                        <span>-₹{selectedOrder.discount_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>₹{selectedOrder.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Name:</span>
                        <p>{selectedOrder.customer_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>
                        <p>{selectedOrder.customer_phone}</p>
                      </div>
                      {selectedOrder.customer_email && (
                        <div>
                          <span className="font-medium">Email:</span>
                          <p>{selectedOrder.customer_email}</p>
                        </div>
                      )}
                    </div>

                    {selectedOrder.delivery_address && (
                      <div>
                        <span className="font-medium">Delivery Address:</span>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <p>{selectedOrder.delivery_address.address_box}</p>
                          <p>{selectedOrder.delivery_address.area}</p>
                          <p>{selectedOrder.delivery_address.city} - {selectedOrder.delivery_address.pincode}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Items ({selectedOrder.order_items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedOrder.order_items.map((item) => (
                      <Card key={item.id} className="border">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <h4 className="font-semibold">{item.product_name}</h4>
                              {item.product_description && (
                                <p className="text-sm text-gray-600 mt-1">{item.product_description}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                {item.category_name && (
                                  <Badge variant="outline">{item.category_name}</Badge>
                                )}
                                {item.quality_type_name && (
                                  <Badge variant="outline">{item.quality_type_name}</Badge>
                                )}
                                <Badge variant={
                                  item.item_status === 'delivered' ? 'default' :
                                    item.item_status === 'confirmed' ? 'secondary' : 'outline'
                                }>
                                  {item.item_status}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-semibold">₹{item.line_total.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{item.quantity} × ₹{item.unit_price.toLocaleString()}</p>
                              {item.warranty_months && (
                                <p className="text-xs text-green-600 mt-1">
                                  {item.warranty_months} months warranty
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Vendor Details */}
                          <div className="border-t mt-4 pt-4">
                            <h5 className="font-medium text-sm text-blue-600 mb-2">Vendor Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-xs text-gray-600">Business Name:</span>
                                  <p className="font-medium">{item.vendor.business_name}</p>
                                </div>
                                {item.vendor.contact_person && (
                                  <div>
                                    <span className="text-xs text-gray-600">Contact Person:</span>
                                    <p>{item.vendor.contact_person}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-xs text-gray-600">Phone:</span>
                                  <p>{item.vendor.phone}</p>
                                </div>
                                {item.vendor.email && (
                                  <div>
                                    <span className="text-xs text-gray-600">Email:</span>
                                    <p>{item.vendor.email}</p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                {item.vendor.business_city && (
                                  <div>
                                    <span className="text-xs text-gray-600">Location:</span>
                                    <p>{item.vendor.business_city}, {item.vendor.business_state}</p>
                                  </div>
                                )}
                                {item.vendor.rating && (
                                  <div>
                                    <span className="text-xs text-gray-600">Rating:</span>
                                    <div className="flex items-center">
                                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                      <span>{item.vendor.rating}</span>
                                      {item.vendor.total_reviews && (
                                        <span className="text-xs text-gray-600 ml-1">({item.vendor.total_reviews} reviews)</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {item.vendor_confirmed_at && (
                                  <div>
                                    <span className="text-xs text-gray-600">Confirmed At:</span>
                                    <p className="text-xs text-green-600">{new Date(item.vendor_confirmed_at).toLocaleString()}</p>
                                  </div>
                                )}
                                {item.picked_up_at && (
                                  <div>
                                    <span className="text-xs text-gray-600">Picked Up At:</span>
                                    <p className="text-xs text-blue-600">{new Date(item.picked_up_at).toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.vendor_notes && (
                              <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                <span className="text-xs font-medium text-yellow-800">Vendor Notes:</span>
                                <p className="text-sm text-yellow-700">{item.vendor_notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              {(selectedOrder.delivery_partner || selectedOrder.slot_info || selectedOrder.sector_info) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Delivery Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedOrder.delivery_partner && (
                        <div>
                          <span className="font-medium">Delivery Partner:</span>
                          <div className="mt-2">
                            <p className="font-medium">{selectedOrder.delivery_partner.name}</p>
                            <p className="text-sm text-gray-600">{selectedOrder.delivery_partner.phone}</p>
                          </div>
                        </div>
                      )}

                      {selectedOrder.slot_info && (
                        <div>
                          <span className="font-medium">Delivery Slot:</span>
                          <div className="mt-2">
                            <p className="font-medium">{selectedOrder.slot_info.slot_name}</p>
                            <p className="text-sm text-gray-600">
                              {selectedOrder.slot_info.start_time} - {selectedOrder.slot_info.end_time}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedOrder.sector_info && (
                        <div>
                          <span className="font-medium">Delivery Sector:</span>
                          <p className="mt-2">{selectedOrder.sector_info.sector_name}</p>
                        </div>
                      )}

                      {selectedOrder.estimated_delivery_date && (
                        <div>
                          <span className="font-medium">Estimated Delivery:</span>
                          <p className="mt-2">{new Date(selectedOrder.estimated_delivery_date).toLocaleDateString()}</p>
                        </div>
                      )}

                      {selectedOrder.actual_delivery_date && (
                        <div>
                          <span className="font-medium">Actual Delivery:</span>
                          <p className="mt-2 text-green-600">{new Date(selectedOrder.actual_delivery_date).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(selectedOrder.notes || selectedOrder.cancellation_reason) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.notes && (
                      <div className="mb-4">
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 p-3 bg-blue-50 rounded-lg">{selectedOrder.notes}</p>
                      </div>
                    )}

                    {selectedOrder.cancellation_reason && (
                      <div>
                        <span className="font-medium">Cancellation Reason:</span>
                        <p className="mt-1 p-3 bg-red-50 rounded-lg text-red-700">{selectedOrder.cancellation_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect, useCallback } from 'react';
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
import TryodoAPI, { TransactionAPI, CommissionAPI, PayoutAPI, VendorAPI, CategoryAPI, WalletAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import VendorSalesSection from '@/components/VendorSalesSection';

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

interface RecentActivity {
  id: string;
  type: 'order' | 'vendor' | 'product' | 'customer' | 'system';
  title: string;
  description: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
  amount?: number;
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State Management
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
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
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
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
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [vendorSales, setVendorSales] = useState<VendorSales[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [detailedOrders, setDetailedOrders] = useState<DetailedOrder[]>([]);
  const [detailedOrdersLoading, setDetailedOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DetailedOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [vendorSalesSummary, setVendorSalesSummary] = useState<VendorSales[]>([]);

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

  // Commission rule form state
  const [commissionForm, setCommissionForm] = useState({
    categoryId: '',
    commissionPercentage: '',
    minimumCommission: '',
    maximumCommission: '',
    notes: ''
  });

  // Add vendor analytics states
  const [allVendorAnalytics, setAllVendorAnalytics] = useState<any[]>([]);
  const [loadingVendorAnalytics, setLoadingVendorAnalytics] = useState(false);
  const [vendorAnalyticsError, setVendorAnalyticsError] = useState<string | null>(null);

  // Commission management states
  const [vendorCommissions, setVendorCommissions] = useState<any[]>([]);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [allQualities, setAllQualities] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [qualityPerformance, setQualityPerformance] = useState<any[]>([]);
  const [vendorCommissionSummary, setVendorCommissionSummary] = useState<any[]>([]);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showVendorCommissionForm, setShowVendorCommissionForm] = useState(false);
  const [commissionFilters, setCommissionFilters] = useState({
    vendorId: '',
    qualityId: ''
  });
  const [calculatorForm, setCalculatorForm] = useState({
    vendorId: '',
    qualityId: '',
    basePrice: 0,
    commissionRate: 0,
    upsideRate: 0,
    effectiveFrom: '',
    notes: ''
  });
  const [calculatorResult, setCalculatorResult] = useState<any>(null);

  const { toast } = useToast();

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

      // Fetch recent activities
      await fetchRecentActivities();
      
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

  const fetchRecentActivities = async () => {
    // Fetch recent orders, vendor registrations, etc.
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, order_status, created_at,
        customers!inner(profiles!inner(full_name))
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    const activities: RecentActivity[] = recentOrders?.map(order => ({
      id: order.id,
      type: 'order' as const,
      title: `New Order ${order.order_number}`,
      description: `₹${order.total_amount?.toLocaleString()} from ${order.customers?.profiles?.[0]?.full_name || 'Customer'}`,
      timestamp: order.created_at,
      priority: order.order_status === 'pending' ? 'high' : 'medium',
      status: order.order_status,
      amount: order.total_amount
    })) || [];

    setRecentActivities(activities);
  };

  const fetchDetailedOrders = async () => {
    try {
      setDetailedOrdersLoading(true);
      
      // Build query based on filters
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
          sector_id,
          customers!inner(
            id,
            profile_id,
            profiles!inner(
              full_name,
              phone,
              email
            )
          ),
          customer_addresses(
            address_box,
            area,
            city,
            pincode
          ),
          delivery_slots(
            slot_name,
            start_time,
            end_time
          ),
          sectors(
            name
          ),
          delivery_partner_orders(
            delivery_partner_id,
            status,
            delivery_partners(
              profiles(
                full_name,
                phone
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(orderFilters.limit);

      // Apply filters
      // if (orderFilters.startDate) {
      //   query = query.gte('created_at', orderFilters.startDate);
      // }
      // if (orderFilters.endDate) {
      //   query = query.lte('created_at', orderFilters.endDate + 'T23:59:59');
      // }
      // if (orderFilters.orderStatus) {
      //   query = query.eq('order_status', orderFilters.orderStatus);
      // }
      // if (orderFilters.paymentStatus) {
      //   query = query.eq('payment_status', orderFilters.paymentStatus);
      // }
      // if (orderFilters.searchTerm) {
      //   query = query.or(`order_number.ilike.%${orderFilters.searchTerm}%,customers.profiles.full_name.ilike.%${orderFilters.searchTerm}%`);
      // }

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

      // Fetch order items for all orders
      const orderIds = ordersData.map(order => order.id);
      const { data: orderItemsData, error: itemsError } = await supabase
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
          vendors!inner(
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
        .in('order_id', orderIds);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        throw itemsError;
      }
      console.log("Fetched order items data:", orderItemsData);

      // Group order items by order_id
      const itemsByOrder = (orderItemsData || []).reduce((acc: any, item: any) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      // Calculate commission for each order (simplified calculation)
      const processedOrders: DetailedOrder[] = ordersData.map((order: any) => {
        const customer = order.customers?.[0];
        const customerProfile = customer?.profiles?.[0];
        const deliveryAddress = order.customer_addresses?.[0];
        const slotInfo = order.delivery_slots?.[0];
        const sectorInfo = order.sectors?.[0];
        const deliveryPartner = order.delivery_partner_orders?.[0]?.delivery_partners?.profiles?.[0];
        
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

        // Calculate commission (assuming 10% commission rate)
        const commissionEarned = order.total_amount * 0.1;

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
          // Assuming commission is calculated per order, distribute proportionally to item or recalculate
          // For simplicity, let's say commission is a fixed percentage of line_total for now
          salesByVendor[item.vendor.id].commission += item.line_total * 0.1; // Example: 10% commission
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
        id: 'auto-assign',
        title: 'Auto-Assign Delivery',
        description: 'Automatically assign delivery partners to slots',
        icon: <Target className="h-6 w-6" />,
        action: handleAutoAssignDeliveryPartners,
        urgent: true
      },
      {
        id: 'remove-assignments',
        title: 'Reset Assignments',
        description: 'Remove existing assignments for testing',
        icon: <RefreshCcw className="h-6 w-6" />,
        action: handleRemoveAssignments
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Manage product categories and qualities',
        icon: <Package className="h-6 w-6" />,
        action: () => navigate('/admin/categories')
      },
      {
        id: 'commission',
        title: 'Commission Rules',
        description: 'Configure commission rates and rules',
        icon: <DollarSign className="h-6 w-6" />,
        action: () => navigate('/admin/commission-rules')
      },

      {
        id: 'payouts',
        title: 'Payout Management',
        description: 'Process and manage payouts',
        icon: <DollarSign className="h-6 w-6" />,
        action: () => navigate('/admin/payouts')
      }
    ]);
  }, [navigate, stats.totalVendors]);

  // Initialize and setup intervals
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        checkDatabaseSetup(),
        fetchDashboardData(),
        loadFinancialData(),
        loadAllVendorAnalytics(),
        loadCommissionData()
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
        TryodoAPI.Analytics.getPlatformFinancialSummary(),
        TransactionAPI.getTransactions(),
        PayoutAPI.getPayouts(user!.id),
        TryodoAPI.Analytics.getDailyOrderSummary()
      ]);

      if (platformStatsRes.success) {
        setPlatformStats(platformStatsRes.data);
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
        console.error('❌ Failed to load quality performance:', qualityPerformanceRes.error);
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
        console.error('❌ Failed to load vendor summary:', vendorSummaryRes.error);
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
      <Header onCartClick={() => {}} />
      
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
            
            {/* <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select> */}
            
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

        {/* Critical Alerts */}
        {/* {(stats.pendingOrders > 10 || stats.lowStockAlerts > 0) && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-red-800">Attention Required:</span>
                  <span className="text-red-700 ml-2">
                    {stats.pendingOrders > 10 && `${stats.pendingOrders} pending orders`}
                    {stats.pendingOrders > 10 && stats.lowStockAlerts > 0 && ', '}
                    {stats.lowStockAlerts > 0 && `${stats.lowStockAlerts} low stock alerts`}
                  </span>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Take Action
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )} */}

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
                  <span>Overview</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="recent-activity" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Activity</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>Transactions</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="commissions" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Commissions</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="payouts" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>Payouts</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="vendor-sales" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Store className="h-3 w-3" />
                  <span>Vendor Sales</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="management" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Settings className="h-3 w-3" />
                  <span>Management</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-7 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Overview
              </TabsTrigger>
              <TabsTrigger value="recent-activity" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Recent Activity
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="commissions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Commissions
              </TabsTrigger>
              <TabsTrigger value="payouts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Payouts
              </TabsTrigger>
              <TabsTrigger value="vendor-sales" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Vendor Sales
              </TabsTrigger>
              <TabsTrigger value="management" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Management
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

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Urgent tasks requiring your attention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickActions.map((action) => (
                    <div
                      key={action.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                        action.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                      onClick={action.action}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${action.urgent ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {action.icon}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{action.title}</p>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.count !== undefined && (
                          <Badge variant={action.urgent ? 'destructive' : 'secondary'}>
                            {action.count}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest platform activities and updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.priority === 'critical' ? 'bg-red-500' :
                        activity.priority === 'high' ? 'bg-orange-500' :
                        activity.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
                        <p className="text-gray-600 text-xs">{activity.description}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {activity.status && (
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {recentActivities.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No recent activities</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recent-activity" className="space-y-6">
            {/* Filters and Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Order Activity
                </CardTitle>
                <CardDescription>
                  Comprehensive view of all orders with detailed vendor, customer, and product information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label htmlFor="orderStartDate">Start Date</Label>
                    <Input
                      id="orderStartDate"
                      type="date"
                      value={orderFilters.startDate}
                      onChange={(e) => setOrderFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderEndDate">End Date</Label>
                    <Input
                      id="orderEndDate"
                      type="date"
                      value={orderFilters.endDate}
                      onChange={(e) => setOrderFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="orderStatus">Order Status</Label>
                    <Select value={orderFilters.orderStatus || "all"} onValueChange={(value) => setOrderFilters(prev => ({ ...prev, orderStatus: value === "all" ? "" : value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="packed">Packed</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="searchOrders">Search</Label>
                    <Input
                      id="searchOrders"
                      placeholder="Order number or customer name"
                      value={orderFilters.searchTerm}
                      onChange={(e) => setOrderFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={fetchDetailedOrders} disabled={detailedOrdersLoading}>
                    {detailedOrdersLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh Orders
                  </Button>
                  <Button variant="outline" onClick={() => setOrderFilters({
                    startDate: '',
                    endDate: '',
                    orderStatus: '',
                    paymentStatus: '',
                    searchTerm: '',
                    vendorFilter: '',
                    limit: 50
                  })}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Orders ({detailedOrders.length})</span>
                  <Badge variant="secondary">
                    Total Revenue: ₹{detailedOrders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedOrdersLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading orders...</span>
                  </div>
                ) : detailedOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {detailedOrders.map((order) => (
                      <Card key={order.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Order Info */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{order.order_number}</h3>
                                <Badge variant={
                                  order.order_status === 'delivered' ? 'default' :
                                  order.order_status === 'cancelled' ? 'destructive' :
                                  order.order_status === 'pending' ? 'secondary' : 'outline'
                                }>
                                  {order.tracking_status}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Amount:</span>
                                  <span className="font-semibold">₹{order.total_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Payment:</span>
                                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                                    {order.payment_status} • {order.payment_method}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Commission:</span>
                                  <span className="font-semibold text-green-600">₹{order.commission_earned.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Created:</span>
                                  <span>{new Date(order.created_at).toLocaleString()}</span>
                                </div>
                                {order.slot_info && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Delivery Slot:</span>
                                    <span className="text-xs">{order.slot_info.slot_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Customer Info */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-md flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                Customer Details
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Name:</span>
                                  <p className="font-medium">{order.customer_name}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Phone:</span>
                                  <p className="font-medium">{order.customer_phone}</p>
                                </div>
                                {order.customer_email && (
                                  <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium">{order.customer_email}</p>
                                  </div>
                                )}
                                {order.delivery_address && (
                                  <div>
                                    <span className="text-gray-600">Address:</span>
                                    <p className="text-xs leading-relaxed">
                                      {order.delivery_address.address_box}, {order.delivery_address.area}<br />
                                      {order.delivery_address.city} - {order.delivery_address.pincode}
                                    </p>
                                  </div>
                                )}
                                {order.delivery_partner && (
                                  <div>
                                    <span className="text-gray-600">Delivery Partner:</span>
                                    <p className="font-medium">{order.delivery_partner.name}</p>
                                    <p className="text-xs">{order.delivery_partner.phone}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Products & Vendors */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-md flex items-center gap-2">
                                <Store className="h-4 w-4 text-green-600" />
                                Products & Vendors ({order.order_items.length})
                              </h4>
                              <div className="space-y-3 max-h-48 overflow-y-auto">
                                {order.order_items.map((item) => (
                                  <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{item.product_name}</p>
                                          {item.product_description && (
                                            <p className="text-xs text-gray-600 line-clamp-2">{item.product_description}</p>
                                          )}
                                          {item.quality_type_name && (
                                            <Badge variant="outline" className="text-xs mt-1">
                                              {item.quality_type_name}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold text-sm">₹{item.line_total.toLocaleString()}</p>
                                          <p className="text-xs text-gray-600">{item.quantity}x ₹{item.unit_price}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="border-t pt-2">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-medium text-xs text-blue-600">{item.vendor.business_name}</p>
                                            <p className="text-xs text-gray-600">{item.vendor.phone}</p>
                                            {item.vendor.business_city && (
                                              <p className="text-xs text-gray-500">{item.vendor.business_city}, {item.vendor.business_state}</p>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <Badge variant={
                                              item.item_status === 'delivered' ? 'default' :
                                              item.item_status === 'confirmed' ? 'secondary' :
                                              item.item_status === 'pending' ? 'outline' : 'secondary'
                                            } className="text-xs">
                                              {item.item_status}
                                            </Badge>
                                            {item.vendor.rating && (
                                              <div className="flex items-center mt-1">
                                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                                <span className="text-xs">{item.vendor.rating}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {item.vendor_confirmed_at && (
                                          <p className="text-xs text-green-600 mt-1">
                                            ✓ Confirmed: {new Date(item.vendor_confirmed_at).toLocaleString()}
                                          </p>
                                        )}
                                        {item.vendor_notes && (
                                          <p className="text-xs text-gray-600 mt-1 italic">
                                            Note: {item.vendor_notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetails(true);
                                }}
                                className="w-full"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
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
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.transaction_status === 'completed' ? 'bg-green-500' :
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
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
                                  <div className={`w-16 h-2 rounded-full ${
                                    performanceScore >= 80 ? 'bg-green-500' :
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

          <TabsContent value="commissions" className="space-y-6">
            {/* Commission Management Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Commission Management</h2>
                <p className="text-gray-600">Manage vendor-quality based commission rates and analytics</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCommissionForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Commission Rule
                </Button>
              </div>
            </div>

            {/* Commission Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Commission Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{(platformStats?.total_commission_earned || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{(platformStats?.month_commission || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{platformStats?.month_transactions || 0} transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Vendors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {vendorCommissions.filter(vc => vc.is_active).length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">With custom rates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {vendorCommissions.length > 0 
                      ? (vendorCommissions.reduce((sum, vc) => sum + vc.commission_rate, 0) / vendorCommissions.length).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Across all qualities</p>
                </CardContent>
              </Card>
            </div>

            {/* Commission Management Tabs */}
            <Tabs defaultValue="vendor-commissions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="vendor-commissions">Vendor Commissions</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="calculator">Calculator</TabsTrigger>
                <TabsTrigger value="rules">General Rules</TabsTrigger>
              </TabsList>

              {/* Vendor-Quality Commission Management */}
              <TabsContent value="vendor-commissions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      Vendor-Quality Commission Rates
                    </CardTitle>
                    <CardDescription>
                      Set specific commission and upside rates for each vendor-quality combination
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-4 mb-6">
                      <select
                        value={commissionFilters.vendorId}
                        onChange={(e) => setCommissionFilters(prev => ({ ...prev, vendorId: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">All Vendors ({allVendors.length})</option>
                        {allVendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.business_name || vendor.name || `Vendor ${vendor.id.slice(0, 8)}` || 'Unknown Vendor'}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={commissionFilters.qualityId}
                        onChange={(e) => setCommissionFilters(prev => ({ ...prev, qualityId: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">All Qualities</option>
                        {allQualities.map((quality) => (
                          <option key={quality.id} value={quality.id}>{quality.quality_name}</option>
                        ))}
                      </select>

                      <Button
                        onClick={() => setShowVendorCommissionForm(true)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vendor Commission
                      </Button>
                    </div>

                    {/* Vendor Commission Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-3 font-semibold">Vendor</th>
                            <th className="text-left p-3 font-semibold">Quality</th>
                            <th className="text-right p-3 font-semibold">Commission %</th>
                            <th className="text-right p-3 font-semibold">Upside %</th>
                            <th className="text-center p-3 font-semibold">Status</th>
                            <th className="text-right p-3 font-semibold">Example (₹1000)</th>
                            <th className="text-center p-3 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorCommissions
                            .filter(vc => !commissionFilters.vendorId || vc.vendor_id === commissionFilters.vendorId)
                            .filter(vc => !commissionFilters.qualityId || vc.quality_id === commissionFilters.qualityId)
                            .map((commission) => {
                              const commissionAmount = 1000 * (commission.commission_rate / 100);
                              const upsideAmount = 1000 * (commission.upside_rate / 100);
                              const platformEarning = commissionAmount + upsideAmount;
                              
                              return (
                                <tr key={commission.id} className="border-b hover:bg-gray-50">
                                  <td className="p-3">
                                    <div>
                                      <p className="font-semibold">{commission.vendor?.business_name || 'Unknown Vendor'}</p>
                                      <p className="text-xs text-gray-500">{commission.vendor?.id || commission.vendor_id}</p>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div>
                                      <p className="font-medium">{commission.quality?.quality_name}</p>
                                      <p className="text-xs text-gray-500">{commission.quality?.quality_description}</p>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className="font-semibold text-red-600">{commission.commission_rate}%</span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className="font-semibold text-blue-600">{commission.upside_rate}%</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge variant={commission.is_active ? "default" : "secondary"}>
                                      {commission.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="text-xs">
                                      <p>Platform: <span className="font-semibold text-green-600">₹{platformEarning}</span></p>
                                      <p>Vendor: <span className="font-semibold text-blue-600">₹{1000 - commissionAmount}</span></p>
                                      <p>Customer: <span className="font-semibold">₹{1000 + upsideAmount}</span></p>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditVendorCommission(commission)}
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      
                      {vendorCommissions.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-semibold mb-2">No vendor commissions configured</p>
                          <p className="text-sm">Add commission rates for vendor-quality combinations to get started.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Commission Analytics */}
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Performing Qualities */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Top Performing Qualities
                      </CardTitle>
                      <CardDescription>Revenue and commission by quality type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {qualityPerformance.slice(0, 5).map((quality, index) => (
                          <div key={quality.quality_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{quality.quality_name}</p>
                                <p className="text-xs text-gray-600">{quality.vendor_count} vendors</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">₹{quality.total_sales?.toLocaleString()}</p>
                              <p className="text-xs text-gray-600">Commission: ₹{quality.total_commission?.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vendor Commission Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-blue-600" />
                        Vendor Commission Summary
                      </CardTitle>
                      <CardDescription>Commission breakdown by vendor</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {vendorCommissionSummary.slice(0, 5).map((vendor) => (
                          <div key={vendor.vendor_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-semibold">{vendor.business_name || 'Unknown Vendor'}</p>
                              <p className="text-xs text-gray-600">{vendor.quality_count || 0} quality rates</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-600">₹{(vendor.total_commission || 0)?.toLocaleString()}</p>
                              <p className="text-xs text-gray-600">Avg: {vendor.avg_commission_rate || 0}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Commission Calculator */}
              <TabsContent value="calculator" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      Commission Calculator
                    </CardTitle>
                    <CardDescription>
                      Calculate pricing breakdown for any vendor-quality combination
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Calculator Form */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="calc-vendor">Select Vendor</Label>
                          <select
                            id="calc-vendor"
                            value={calculatorForm.vendorId}
                            onChange={(e) => setCalculatorForm(prev => ({ ...prev, vendorId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Choose vendor...</option>
                            {allVendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.business_name || vendor.name || `Vendor ${vendor.id.slice(0, 8)}` || 'Unknown Vendor'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="calc-quality">Select Quality</Label>
                          <select
                            id="calc-quality"
                            value={calculatorForm.qualityId}
                            onChange={(e) => setCalculatorForm(prev => ({ ...prev, qualityId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">Choose quality...</option>
                            {allQualities.map((quality) => (
                              <option key={quality.id} value={quality.id}>{quality.quality_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="calc-price">Base Price (₹)</Label>
                          <Input
                            id="calc-price"
                            type="number"
                            value={calculatorForm.basePrice}
                            onChange={(e) => setCalculatorForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                            placeholder="Enter base price"
                          />
                        </div>

                        <Button 
                          onClick={handleCalculateCommission}
                          disabled={!calculatorForm.vendorId || !calculatorForm.qualityId || !calculatorForm.basePrice}
                          className="w-full"
                        >
                          Calculate Breakdown
                        </Button>
                      </div>

                      {/* Calculator Results */}
                      <div className="space-y-4">
                        {calculatorResult && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-4 text-gray-900">Pricing Breakdown</h4>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base Price:</span>
                                <span className="font-semibold">₹{calculatorResult.basePrice.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-red-600">
                                <span>Commission ({calculatorResult.commissionRate}%):</span>
                                <span className="font-semibold">-₹{calculatorResult.commissionAmount.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-blue-600">
                                <span>Upside ({calculatorResult.upsideRate}%):</span>
                                <span className="font-semibold">+₹{calculatorResult.upsideAmount.toLocaleString()}</span>
                              </div>
                              
                              <hr className="my-2" />
                              
                              <div className="flex justify-between text-lg font-bold">
                                <span>Customer Pays:</span>
                                <span className="text-green-600">₹{calculatorResult.finalSellingPrice.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-lg font-bold">
                                <span>Vendor Earns:</span>
                                <span className="text-blue-600">₹{calculatorResult.vendorNetEarning.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-lg font-bold">
                                <span>Platform Earns:</span>
                                <span className="text-purple-600">₹{calculatorResult.platformEarning.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Platform Margin:</span>
                                <span>{calculatorResult.platformMarginPercentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {!calculatorResult && (
                          <div className="p-8 text-center text-gray-500">
                            <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Select vendor, quality, and enter price to see breakdown</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* General Commission Rules */}
              <TabsContent value="rules" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Commission Rules</CardTitle>
                    <CardDescription>
                      Default commission rates for categories (fallback when no vendor-specific rate exists)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {commissionRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-semibold">{rule.category?.name || 'Unknown Category'}</h4>
                            <p className="text-sm text-gray-600">
                              {rule.commission_percentage}% commission
                            </p>
                            <p className="text-xs text-gray-500">
                              Min: ₹{rule.minimum_commission}
                              {rule.maximum_commission && ` | Max: ₹${rule.maximum_commission}`}
                            </p>
                          </div>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                      {commissionRules.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No commission rules configured
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* <TabsContent value="wallets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Management Removed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Wallet functionality has been removed from the system.
                  </p>
                  <p className="text-sm text-gray-400">
                    Financial tracking is now handled through direct transactions and payouts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          <TabsContent value="payouts" className="space-y-6">
            {/* Payout Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{payouts.filter(p => p.payout_status === 'pending').length}</div>
                  <p className="text-xs text-muted-foreground">
                    ₹{payouts.filter(p => p.payout_status === 'pending').reduce((sum, p) => sum + p.payout_amount, 0).toLocaleString()} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payouts.filter(p => 
                      p.payout_status === 'completed' && 
                      new Date(p.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ₹{payouts.filter(p => 
                      p.payout_status === 'completed' && 
                      new Date(p.created_at).toDateString() === new Date().toDateString()
                    ).reduce((sum, p) => sum + p.payout_amount, 0).toLocaleString()} paid out
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payouts.length > 0 ? 
                      ((payouts.filter(p => p.payout_status === 'completed').length / payouts.length) * 100).toFixed(1) : 0
                    }%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payouts.filter(p => p.payout_status === 'completed').length} of {payouts.length} completed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payout Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Payouts</CardTitle>
                    <CardDescription>
                      Latest payout requests requiring attention
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate('/admin/payouts')} variant="outline">
                    View All Payouts
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {payout.payout_status === 'pending' && <Clock className="h-5 w-5 text-blue-600" />}
                          {payout.payout_status === 'processing' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                          {payout.payout_status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {payout.payout_status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{payout.payout_number}</h4>
                          <p className="text-sm text-gray-600">
                            {payout.recipient_type === 'vendor' ? 'Vendor' : 'Delivery Partner'} • {payout.payout_method.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(payout.created_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">₹{payout.payout_amount.toLocaleString()}</p>
                          <Badge variant={
                            payout.payout_status === 'completed' ? 'default' :
                            payout.payout_status === 'pending' ? 'secondary' :
                            payout.payout_status === 'processing' ? 'outline' : 'destructive'
                          }>
                            {payout.payout_status}
                          </Badge>
                        </div>
                        {payout.payout_status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleProcessPayout(payout.id, 'processing')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleProcessPayout(payout.id, 'cancelled')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {payouts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No payouts found</h3>
                      <p className="text-gray-500">Payouts will appear here when vendors and delivery partners request them.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
                    Approve and manage vendor accounts, commissions, and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Review vendor applications, manage approvals, and set commission rates
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

              <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-75">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-orange-600" />
                      Delivery Management
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                  <CardDescription>
                    Manage delivery partners and logistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Monitor delivery performance and partner management
                  </p>
                  <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
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
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Commission Rule Form Modal */}
      <Dialog open={showCommissionForm} onOpenChange={setShowCommissionForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Commission Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={commissionForm.categoryId} 
                onValueChange={(value) => setCommissionForm(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="commissionPercentage">Commission Percentage</Label>
              <Input
                id="commissionPercentage"
                type="number"
                placeholder="e.g., 15"
                value={commissionForm.commissionPercentage}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, commissionPercentage: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minimumCommission">Minimum Commission (₹)</Label>
              <Input
                id="minimumCommission"
                type="number"
                placeholder="e.g., 50"
                value={commissionForm.minimumCommission}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, minimumCommission: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maximumCommission">Maximum Commission (₹)</Label>
              <Input
                id="maximumCommission"
                type="number"
                placeholder="e.g., 500"
                value={commissionForm.maximumCommission}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, maximumCommission: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this rule"
                value={commissionForm.notes}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCommissionForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCommissionRule}>
                <Save className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendor Commission Form Modal */}
      <Dialog open={showVendorCommissionForm} onOpenChange={setShowVendorCommissionForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Vendor Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select 
                value={calculatorForm.vendorId} 
                onValueChange={(value) => setCalculatorForm(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {allVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.business_name || vendor.name || `Vendor ${vendor.id.slice(0, 8)}` || 'Unknown Vendor'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select 
                value={calculatorForm.qualityId} 
                onValueChange={(value) => setCalculatorForm(prev => ({ ...prev, qualityId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  {allQualities.map((quality) => (
                    <SelectItem key={quality.id} value={quality.id}>
                      {quality.quality_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                placeholder="e.g., 12"
                value={calculatorForm.commissionRate || ''}
                onChange={(e) => setCalculatorForm(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upsideRate">Upside Rate (%)</Label>
              <Input
                id="upsideRate"
                type="number"
                placeholder="e.g., 5"
                value={calculatorForm.upsideRate || ''}
                onChange={(e) => setCalculatorForm(prev => ({ ...prev, upsideRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={calculatorForm.effectiveFrom || ''}
                onChange={(e) => setCalculatorForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this commission"
                value={calculatorForm.notes || ''}
                onChange={(e) => setCalculatorForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowVendorCommissionForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVendorCommission}>
                <Save className="h-4 w-4 mr-2" />
                Create Commission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
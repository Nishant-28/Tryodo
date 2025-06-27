import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Store, ShoppingBag, TrendingUp, DollarSign, Package, 
  Smartphone, Settings, ArrowRight, AlertTriangle, Database, 
  CheckCircle, Eye, RefreshCw, Bell, Activity, Clock, 
  Target, Zap, BarChart3, PieChart, Calendar, Filter,
  ChevronUp, ChevronDown, AlertCircle, Star, Truck,
  HeadphonesIcon, ShoppingCart, CreditCard, Timer,
  Plus, Edit3, XCircle
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
import TryodoAPI, { TransactionAPI, CommissionAPI, WalletAPI, PayoutAPI } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface WalletSummary {
  vendor_id?: string;
  delivery_partner_id?: string;
  business_name?: string;
  delivery_partner_name?: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid_out: number;
}

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

const AdminDashboard = () => {
  const navigate = useNavigate();
  
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
  const [vendorWallets, setVendorWallets] = useState<WalletSummary[]>([]);
  const [deliveryWallets, setDeliveryWallets] = useState<WalletSummary[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [dailySummary, setDailySummary] = useState<any[]>([]);

  // Filter states
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: '',
    status: ''
  });

  // Commission rule form state
  const [commissionForm, setCommissionForm] = useState({
    categoryId: '',
    commissionPercentage: '',
    minimumCommission: '',
    maximumCommission: '',
    notes: ''
  });

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
      { count: genericProducts },
      { data: lowStockProducts }
    ] = await Promise.all([
      supabase.from('vendor_products').select('*', { count: 'exact', head: true }),
      supabase.from('vendor_generic_products').select('*', { count: 'exact', head: true }),
      supabase.from('vendor_products').select('*').lt('stock_quantity', 10)
    ]);

    return {
      totalProducts: (vendorProducts || 0) + (genericProducts || 0),
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
      description: `₹${order.total_amount?.toLocaleString()} from ${order.customers?.profiles?.full_name}`,
      timestamp: order.created_at,
      priority: order.order_status === 'pending' ? 'high' : 'medium',
      status: order.order_status,
      amount: order.total_amount
    })) || [];

    setRecentActivities(activities);
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
    const actions: QuickAction[] = [
      {
        id: 'pending-orders',
        title: 'Pending Orders',
        description: 'Review and process pending orders',
        icon: <Clock className="h-5 w-5" />,
        action: () => navigate('/admin/orders?status=pending'),
        urgent: stats.pendingOrders > 10,
        count: stats.pendingOrders
      },
      {
        id: 'vendor-approvals',
        title: 'Vendor Approvals',
        description: 'Approve new vendor registrations',
        icon: <Store className="h-5 w-5" />,
        action: () => navigate('/admin/vendors?status=pending'),
        count: 3 // Would fetch real count
      },
      {
        id: 'low-stock',
        title: 'Low Stock Alerts',
        description: 'Products running low on inventory',
        icon: <AlertTriangle className="h-5 w-5" />,
        action: () => navigate('/admin/inventory?status=low'),
        urgent: stats.lowStockAlerts > 0,
        count: stats.lowStockAlerts
      },
      {
        id: 'customer-support',
        title: 'Support Tickets',
        description: 'Resolve customer support issues',
        icon: <HeadphonesIcon className="h-5 w-5" />,
        action: () => navigate('/admin/support'),
        count: 7 // Would fetch real count
      }
    ];

    setQuickActions(actions);
  }, [stats, navigate]);

  // Initialize and setup intervals
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        checkDatabaseSetup(),
        fetchDashboardData()
      ]);
    };

    initialize();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
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
      setLoading(true);
      
      // Load all financial data in parallel
      const [
        transactionsRes,
        commissionRulesRes,
        vendorWalletsRes,
        deliveryWalletsRes,
        payoutsRes,
        platformStatsRes,
        dailySummaryRes
      ] = await Promise.all([
        TransactionAPI.getTransactions({ limit: 100 }),
        CommissionAPI.getCommissionRules(),
        WalletAPI.getAllVendorWallets(),
        WalletAPI.getAllDeliveryPartnerWallets(),
        PayoutAPI.getPayouts({ limit: 50 }),
        WalletAPI.getPlatformWallet(),
        TransactionAPI.getDailyTransactionSummary()
      ]);

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data);
      }

      if (commissionRulesRes.success) {
        setCommissionRules(commissionRulesRes.data);
      }

      if (vendorWalletsRes.success) {
        setVendorWallets(vendorWalletsRes.data);
      }

      if (deliveryWalletsRes.success) {
        setDeliveryWallets(deliveryWalletsRes.data);
      }

      if (payoutsRes.success) {
        setPayouts(payoutsRes.data);
      }

      if (platformStatsRes.success) {
        setPlatformStats(platformStatsRes.data);
      }

      if (dailySummaryRes.success) {
        setDailySummary(dailySummaryRes.data.slice(0, 7)); // Last 7 days
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommissionRule = async () => {
    if (!commissionForm.categoryId || !commissionForm.commissionPercentage) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const result = await CommissionAPI.upsertCommissionRule({
        categoryId: commissionForm.categoryId,
        commissionPercentage: parseFloat(commissionForm.commissionPercentage),
        minimumCommission: commissionForm.minimumCommission ? parseFloat(commissionForm.minimumCommission) : 0,
        maximumCommission: commissionForm.maximumCommission ? parseFloat(commissionForm.maximumCommission) : undefined,
        notes: commissionForm.notes,
        createdBy: user!.id
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Commission rule created successfully"
        });
        setCommissionForm({
          categoryId: '',
          commissionPercentage: '',
          minimumCommission: '',
          maximumCommission: '',
          notes: ''
        });
        loadFinancialData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create commission rule",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
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
        {(stats.pendingOrders > 10 || stats.lowStockAlerts > 0) && (
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
        )}

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
                value="wallets" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Wallets</span>
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
            <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="commissions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Commissions
              </TabsTrigger>
              <TabsTrigger value="wallets" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Wallets
              </TabsTrigger>
              <TabsTrigger value="payouts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Payouts
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
                  </CardContent>
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

          <TabsContent value="commissions" className="space-y-6">
            {/* Commission Rules Management */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Rules</CardTitle>
                <CardDescription>
                  Manage commission rates for different categories
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

          <TabsContent value="wallets" className="space-y-6">
            {/* Vendor Wallets */}
            <Card>
              <CardHeader>
                <CardTitle>Vendor Wallets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendorWallets.map((wallet, index) => (
                    <div key={wallet.vendor_id || index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{wallet.business_name}</h4>
                        <p className="text-sm text-gray-600">Total Earned: ₹{wallet.total_earned.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-semibold">
                          Available: ₹{wallet.available_balance.toLocaleString()}
                        </p>
                        <p className="text-orange-600 text-sm">
                          Pending: ₹{wallet.pending_balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {vendorWallets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No vendor wallets found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Partner Wallets */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Partner Wallets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deliveryWallets.map((wallet, index) => (
                    <div key={wallet.delivery_partner_id || index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{wallet.delivery_partner_name}</h4>
                        <p className="text-sm text-gray-600">Total Earned: ₹{wallet.total_earned.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-semibold">
                          Available: ₹{wallet.available_balance.toLocaleString()}
                        </p>
                        <p className="text-orange-600 text-sm">
                          Pending: ₹{wallet.pending_balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {deliveryWallets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No delivery partner wallets found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            {/* Payout Management */}
            <Card>
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>
                  Approve and process payouts to vendors and delivery partners
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{payout.payout_number}</h4>
                        <p className="text-sm text-gray-600">
                          {payout.recipient_type} • {payout.payout_method}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">₹{payout.payout_amount.toLocaleString()}</p>
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
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleProcessPayout(payout.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {payouts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No payouts found
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
    </div>
  );
};

export default AdminDashboard; 
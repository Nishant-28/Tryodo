import React, { useState, useEffect } from 'react';
import { 
  Package, TrendingUp, ShoppingCart, DollarSign, AlertTriangle, CheckCircle, 
  Clock, RefreshCw, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TryodoAPI, TransactionAPI, WalletAPI, AnalyticsAPI } from '@/lib/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Analytics {
  total_sales: number;
  total_commission: number;
  net_earnings: number;
  pending_payouts: number;
  total_orders: number;
  total_products: number;
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const VendorAnalytics = () => {
  const { profile } = useAuth();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [loadingChartData, setLoadingChartData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVendorByProfileId = async (profileId: string): Promise<Vendor | null> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (error) {
        console.error('Error fetching vendor:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching vendor:', error);
      return null;
    }
  };

  const loadAnalytics = async (vendorId: string) => {
    try {
      const response = await AnalyticsAPI.getVendorFinancialSummary(vendorId);
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        console.error('Failed to load analytics:', response.error);
        toast.error('Failed to load analytics data.');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('An error occurred while loading analytics data.');
    }
  };

  const loadFinancialData = async (vendorId: string) => {
    setLoadingFinancials(true);
    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        WalletAPI.getVendorWallet(vendorId),
        TransactionAPI.getTransactions({ vendorId })
      ]);

      if (walletResponse.success) {
        setWallet(walletResponse.data);
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoadingFinancials(false);
    }
  };

  const loadEnhancedAnalytics = async (vendorId: string) => {
    setLoadingChartData(true);
    try {
      const [transactionsResponse] = await Promise.all([
        TransactionAPI.getTransactions({ vendorId })
      ]);

      if (transactionsResponse.success) {
        const transactions = transactionsResponse.data || [];
        const monthlyData = processMonthlyEarnings(transactions);
        setMonthlyEarnings(monthlyData);
      }

      // Load order items with category information for breakdown
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          vendor_products (
            categories (
              name
            )
          )
        `)
        .eq('vendor_id', vendorId);

      if (orderItems) {
        const categoryData = processCategoryBreakdown(orderItems);
        setCategoryBreakdown(categoryData);
      }
    } catch (error) {
      console.error('Error loading enhanced analytics:', error);
    } finally {
      setLoadingChartData(false);
    }
  };

  const processMonthlyEarnings = (transactions: any[]) => {
    const monthlyMap = new Map();
    
    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'vendor_earning') {
        const date = new Date(transaction.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, 0);
        }
        monthlyMap.set(monthKey, monthlyMap.get(monthKey) + (transaction.net_amount || 0));
      }
    });

    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: monthKey,
        earnings: monthlyMap.get(monthKey) || 0
      });
    }

    return result;
  };

  const processCategoryBreakdown = (data: any[]) => {
    const categoryMap = new Map();
    
    data.forEach(item => {
      const category = item.vendor_products?.categories?.name || item.category_name || 'Other';
      const revenue = item.line_total || 0;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, 0);
      }
      categoryMap.set(category, categoryMap.get(category) + revenue);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  const initializeVendorAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.id) {
        throw new Error('No profile found');
      }

      const vendorData = await fetchVendorByProfileId(profile.id);
      if (vendorData) {
        setVendor(vendorData);
        await Promise.all([
          loadAnalytics(vendorData.id),
          loadFinancialData(vendorData.id),
          loadEnhancedAnalytics(vendorData.id),
        ]);
      } else {
        throw new Error('Vendor not found for this profile.');
      }

    } catch (error: any) {
      console.error('VendorAnalytics initialization error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!vendor) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadAnalytics(vendor.id),
        loadFinancialData(vendor.id),
        loadEnhancedAnalytics(vendor.id)
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'vendor') {
      initializeVendorAnalytics();
    }
  }, [profile]);

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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => {
              setError(null);
              if (profile?.role === 'vendor') {
                initializeVendorAnalytics();
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 left-20 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>
      
      <Header cartItems={0} onCartClick={() => {}} />
      
      <main className="relative container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                Analytics & Earnings
              </h1>
              <p className="text-gray-600 font-medium">Comprehensive business insights for {vendor?.business_name}</p>
            </div>
            <div className="flex gap-3">
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

        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
            <TabsTrigger value="earnings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              ₹ Earnings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">Available Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    ₹{wallet?.available_balance?.toLocaleString('en-IN') || '0'}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Ready for payout</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">Pending Balance</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{wallet?.pending_balance?.toLocaleString('en-IN') || '0'}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Processing orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">Total Earned</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700">
                    ₹{wallet?.total_earned?.toLocaleString('en-IN') || '0'}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">All time earnings</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800">Commission Paid</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    ₹{wallet?.total_commission_paid?.toLocaleString('en-IN') || '0'}
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    Avg: {wallet?.average_commission_rate?.toFixed(1) || '0'}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Breakdown</CardTitle>
                  <CardDescription>Today's financial summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Today's Earnings</span>
                      <span className="font-bold text-green-600">
                        ₹{wallet?.today_earnings?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">This Week</span>
                      <span className="font-bold text-blue-600">
                        ₹{wallet?.week_earnings?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">This Month</span>
                      <span className="font-bold text-purple-600">
                        ₹{wallet?.month_earnings?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Earnings</span>
                      <span className="text-lg font-bold text-green-700">
                        ₹{((wallet?.total_earned || 0) - (wallet?.total_commission_paid || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFinancials ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((transaction: any) => (
                        <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.transaction_type === 'vendor_earning' ? 'text-green-600' : 
                              transaction.transaction_type === 'commission_deduction' ? 'text-red-600' : 
                              'text-gray-600'
                            }`}>
                              {transaction.transaction_type === 'commission_deduction' ? '-' : '+'}
                              ₹{transaction.net_amount?.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {transaction.transaction_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No transactions yet</p>
                      <p className="text-xs">Transactions will appear when you complete orders</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
                <CardDescription>Manage your payout preferences and history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Payout Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Minimum Payout:</span>
                        <span className="font-medium">₹{wallet?.minimum_payout_amount?.toLocaleString('en-IN') || '1,000'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payout Frequency:</span>
                        <span className="font-medium capitalize">{wallet?.payout_frequency || 'Weekly'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto Payout:</span>
                        <Badge variant={wallet?.auto_payout_enabled ? "default" : "secondary"}>
                          {wallet?.auto_payout_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Next Payout</h4>
                    <div className="text-sm text-gray-600">
                      <p>Available balance will be processed in the next payout cycle.</p>
                      <p className="mt-2 text-xs">
                        Last payout: {wallet?.last_payout_date ? 
                          new Date(wallet.last_payout_date).toLocaleDateString() : 
                          'No payouts yet'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics?.total_sales.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">From {analytics?.total_orders} completed orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics?.net_earnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">After {analytics?.total_commission.toLocaleString()} commission</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.total_products}</div>
                  <p className="text-xs text-muted-foreground">Live products in store</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{analytics?.pending_payouts.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Current wallet balance</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings Trend</CardTitle>
                <CardDescription>Your earnings over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingChartData ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : monthlyEarnings.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyEarnings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return `${month}/${year.slice(2)}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Earnings']}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No earnings data available</p>
                      <p className="text-xs">Complete some orders to see your earnings trend</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Breakdown of sales by product categories</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingChartData ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Sales']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No category data available</p>
                      <p className="text-xs">Add products and complete orders to see category breakdown</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VendorAnalytics; 
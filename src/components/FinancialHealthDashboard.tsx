import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, 
  RefreshCw, AlertCircle, CheckCircle, Clock,
  BarChart3, PieChart, Target, Wallet
} from 'lucide-react';
import { TransactionAPI, CommissionAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface DailyRevenue {
  date: string;
  total_revenue: number;
  commission_earned: number;
  orders_count: number;
  average_order_value: number;
}

interface VendorDailyData {
  vendor_id: string;
  business_name: string;
  date: string;
  daily_revenue: number;
  daily_commission: number;
  orders_count: number;
  growth_percentage: number;
}

interface CommissionStatus {
  total_pending: number;
  total_collected: number;
  collection_rate: number;
  overdue_amount: number;
  today_collected: number;
  week_collected: number;
  month_collected: number;
}

interface CashFlowIndicator {
  incoming_revenue: number;
  outgoing_payouts: number;
  net_cash_flow: number;
  projected_weekly: number;
  projected_monthly: number;
  liquidity_ratio: number;
}

const FinancialHealthDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data states
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [vendorDailyData, setVendorDailyData] = useState<VendorDailyData[]>([]);
  const [commissionStatus, setCommissionStatus] = useState<CommissionStatus>({
    total_pending: 0,
    total_collected: 0,
    collection_rate: 0,
    overdue_amount: 0,
    today_collected: 0,
    week_collected: 0,
    month_collected: 0
  });
  const [cashFlowIndicators, setCashFlowIndicators] = useState<CashFlowIndicator>({
    incoming_revenue: 0,
    outgoing_payouts: 0,
    net_cash_flow: 0,
    projected_weekly: 0,
    projected_monthly: 0,
    liquidity_ratio: 0
  });

  const { toast } = useToast();

  const fetchFinancialData = async () => {
    try {
      setRefreshing(true);
      
      // Calculate date range based on selection
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const [
        dailyRevenueRes,
        vendorDataRes,
        commissionRes,
        cashFlowRes
      ] = await Promise.all([
        fetchDailyRevenue(startDate, endDate),
        fetchVendorDailyData(startDate, endDate),
        fetchCommissionStatus(),
        fetchCashFlowIndicators()
      ]);

      setDailyRevenue(dailyRevenueRes);
      setVendorDailyData(vendorDataRes);
      setCommissionStatus(commissionRes);
      setCashFlowIndicators(cashFlowRes);

    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financial data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchDailyRevenue = async (startDate: Date, endDate: Date): Promise<DailyRevenue[]> => {
    try {
      // Fetch orders data directly from orders table
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .in('order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      // Group by date and calculate daily metrics
      const dailyData: { [key: string]: DailyRevenue } = {};
      
      ordersData?.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            total_revenue: 0,
            commission_earned: 0,
            orders_count: 0,
            average_order_value: 0
          };
        }
        
        dailyData[date].total_revenue += order.total_amount || 0;
        dailyData[date].commission_earned += (order.total_amount || 0) * 0.1; // 10% commission assumption
        dailyData[date].orders_count += 1;
      });

      // Calculate average order value
      Object.values(dailyData).forEach(day => {
        day.average_order_value = day.orders_count > 0 ? day.total_revenue / day.orders_count : 0;
      });

      return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      return [];
    }
  };

  const fetchVendorDailyData = async (startDate: Date, endDate: Date): Promise<VendorDailyData[]> => {
    try {
      // Fetch order items with vendor information
      const { data: orderItemsData, error } = await supabase
        .from('order_items')
        .select(`
          vendor_id,
          line_total,
          quantity,
          created_at,
          vendors!inner(
            business_name
          ),
          orders!inner(
            created_at,
            order_status
          )
        `)
        .gte('orders.created_at', startDate.toISOString())
        .lte('orders.created_at', endDate.toISOString())
        .in('orders.order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      // Group by vendor and date
      const vendorDailyMap: { [key: string]: VendorDailyData } = {};
      
      orderItemsData?.forEach(item => {
        const date = new Date(item.orders.created_at).toISOString().split('T')[0];
        const key = `${item.vendor_id}-${date}`;
        
        if (!vendorDailyMap[key]) {
          vendorDailyMap[key] = {
            vendor_id: item.vendor_id,
            business_name: item.vendors.business_name,
            date,
            daily_revenue: 0,
            daily_commission: 0,
            orders_count: 0,
            growth_percentage: 0 // Would need historical data to calculate
          };
        }
        
        vendorDailyMap[key].daily_revenue += item.line_total || 0;
        vendorDailyMap[key].daily_commission += (item.line_total || 0) * 0.1; // 10% commission assumption
        vendorDailyMap[key].orders_count += 1;
      });

      return Object.values(vendorDailyMap).sort((a, b) => b.daily_revenue - a.daily_revenue);
    } catch (error) {
      console.error('Error fetching vendor daily data:', error);
      return [];
    }
  };

  const fetchCommissionStatus = async (): Promise<CommissionStatus> => {
    try {
      // Get transactions data directly from transactions table
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('commission_amount, transaction_status, transaction_date')
        .eq('transaction_type', 'commission_deduction');

      if (error) {
        console.warn('Transactions table not available, using order-based commission calculation');
        // Fallback to calculating from orders
        return await calculateCommissionFromOrders();
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalCollected = 0;
      let totalPending = 0;
      let todayCollected = 0;
      let weekCollected = 0;
      let monthCollected = 0;

      transactionsData?.forEach(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        const amount = transaction.commission_amount || 0;

        if (transaction.transaction_status === 'completed') {
          totalCollected += amount;
          
          if (transaction.transaction_date.startsWith(today)) {
            todayCollected += amount;
          }
          if (transactionDate >= weekAgo) {
            weekCollected += amount;
          }
          if (transactionDate >= monthAgo) {
            monthCollected += amount;
          }
        } else if (transaction.transaction_status === 'pending') {
          totalPending += amount;
        }
      });

      const collectionRate = totalCollected + totalPending > 0 
        ? (totalCollected / (totalCollected + totalPending)) * 100 
        : 0;

      return {
        total_pending: totalPending,
        total_collected: totalCollected,
        collection_rate: collectionRate,
        overdue_amount: 0, // Would need additional logic to determine overdue
        today_collected: todayCollected,
        week_collected: weekCollected,
        month_collected: monthCollected
      };
    } catch (error) {
      console.error('Error fetching commission status:', error);
      return await calculateCommissionFromOrders();
    }
  };

  const calculateCommissionFromOrders = async (): Promise<CommissionStatus> => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_status')
        .in('order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalCollected = 0;
      let todayCollected = 0;
      let weekCollected = 0;
      let monthCollected = 0;

      ordersData?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const commission = (order.total_amount || 0) * 0.1; // 10% commission assumption

        totalCollected += commission;
        
        if (order.created_at.startsWith(today)) {
          todayCollected += commission;
        }
        if (orderDate >= weekAgo) {
          weekCollected += commission;
        }
        if (orderDate >= monthAgo) {
          monthCollected += commission;
        }
      });

      return {
        total_pending: 0,
        total_collected: totalCollected,
        collection_rate: 100, // Assuming all completed orders have commission collected
        overdue_amount: 0,
        today_collected: todayCollected,
        week_collected: weekCollected,
        month_collected: monthCollected
      };
    } catch (error) {
      console.error('Error calculating commission from orders:', error);
      return {
        total_pending: 0,
        total_collected: 0,
        collection_rate: 0,
        overdue_amount: 0,
        today_collected: 0,
        week_collected: 0,
        month_collected: 0
      };
    }
  };

  const fetchCashFlowIndicators = async (): Promise<CashFlowIndicator> => {
    try {
      // Calculate cash flow from orders and payouts
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch incoming revenue from orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_status')
        .gte('created_at', monthAgo.toISOString())
        .in('order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

      if (ordersError) throw ordersError;

      // Fetch outgoing payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('payout_amount, created_at, payout_status')
        .gte('created_at', monthAgo.toISOString())
        .in('payout_status', ['completed', 'processing']);

      // Calculate incoming revenue
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const weeklyRevenue = ordersData?.filter(order => 
        new Date(order.created_at) >= weekAgo
      ).reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Calculate outgoing payouts
      const totalPayouts = payoutsData?.reduce((sum, payout) => sum + (payout.payout_amount || 0), 0) || 0;

      // Calculate projections based on recent trends
      const dailyAverage = totalRevenue / 30; // Average over last 30 days
      const projectedWeekly = dailyAverage * 7;
      const projectedMonthly = dailyAverage * 30;

      // Calculate net cash flow
      const netCashFlow = totalRevenue - totalPayouts;

      // Calculate liquidity ratio (simplified)
      const liquidity = totalPayouts > 0 ? totalRevenue / totalPayouts : totalRevenue > 0 ? 2.0 : 0;

      return {
        incoming_revenue: totalRevenue,
        outgoing_payouts: totalPayouts,
        net_cash_flow: netCashFlow,
        projected_weekly: projectedWeekly,
        projected_monthly: projectedMonthly,
        liquidity_ratio: Math.min(liquidity, 5.0) // Cap at 5.0 for display purposes
      };
    } catch (error) {
      console.error('Error fetching cash flow indicators:', error);
      
      // Fallback: try to get basic revenue data from orders only
      try {
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .in('order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

        if (!error && ordersData) {
          const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          const estimatedPayouts = totalRevenue * 0.8; // Estimate 80% goes to vendors/delivery partners
          
          return {
            incoming_revenue: totalRevenue,
            outgoing_payouts: estimatedPayouts,
            net_cash_flow: totalRevenue * 0.2,
            projected_weekly: totalRevenue / 4,
            projected_monthly: totalRevenue,
            liquidity_ratio: 1.25
          };
        }
      } catch (fallbackError) {
        console.error('Fallback cash flow calculation failed:', fallbackError);
      }
      
      // Return default values if all else fails
      return {
        incoming_revenue: 0,
        outgoing_payouts: 0,
        net_cash_flow: 0,
        projected_weekly: 0,
        projected_monthly: 0,
        liquidity_ratio: 0
      };
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getTodayRevenue = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = dailyRevenue.find(item => item.date === today);
    return todayData?.total_revenue || 0;
  };

  const getRevenueGrowth = () => {
    if (dailyRevenue.length < 2) return 0;
    const latest = dailyRevenue[dailyRevenue.length - 1]?.total_revenue || 0;
    const previous = dailyRevenue[dailyRevenue.length - 2]?.total_revenue || 0;
    if (previous === 0) return 0;
    return ((latest - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading financial data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Health Dashboard</h2>
          <p className="text-gray-600">Monitor daily revenue, commissions, and cash flow</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchFinancialData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTodayRevenue())}</div>
            <div className={`text-xs flex items-center ${getRevenueGrowth() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {getRevenueGrowth() >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {formatPercentage(getRevenueGrowth())} from yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Collected</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionStatus.today_collected)}</div>
            <div className="text-xs text-muted-foreground">
              {commissionStatus.collection_rate.toFixed(1)}% collection rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashFlowIndicators.net_cash_flow)}</div>
            <div className="text-xs text-muted-foreground">
              Liquidity ratio: {cashFlowIndicators.liquidity_ratio.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionStatus.total_pending)}</div>
            <div className="text-xs text-red-600">
              {formatCurrency(commissionStatus.overdue_amount)} overdue
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="daily-revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily-revenue">Daily Revenue</TabsTrigger>
          <TabsTrigger value="vendor-performance">Vendor Performance</TabsTrigger>
          <TabsTrigger value="commission-tracking">Commission Tracking</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Breakdown</CardTitle>
              <CardDescription>Revenue trends and order metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyRevenue.length > 0 ? (
                  <div className="grid gap-4">
                    {dailyRevenue.slice(-7).map((day, index) => (
                      <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-600">{day.orders_count} orders</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(day.total_revenue)}</div>
                          <div className="text-sm text-gray-600">
                            Avg: {formatCurrency(day.average_order_value)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(day.commission_earned)}
                          </div>
                          <div className="text-xs text-gray-500">Commission</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No revenue data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Daily Performance</CardTitle>
              <CardDescription>Revenue contribution by vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorDailyData.length > 0 ? (
                  <div className="grid gap-4">
                    {vendorDailyData.map((vendor, index) => (
                      <div key={`${vendor.vendor_id}-${vendor.date}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{vendor.business_name}</div>
                          <div className="text-sm text-gray-600">{vendor.orders_count} orders</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(vendor.daily_revenue)}</div>
                          <div className="text-sm text-green-600">
                            {formatCurrency(vendor.daily_commission)} commission
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={vendor.growth_percentage >= 0 ? "default" : "destructive"}>
                            {formatPercentage(vendor.growth_percentage)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No vendor performance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission-tracking" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(commissionStatus.today_collected)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Today's commission</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(commissionStatus.month_collected)}
                </div>
                <div className="text-sm text-gray-600 mt-1">This month</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Overall Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Collection Rate</span>
                    <span className="text-sm font-medium">{commissionStatus.collection_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={commissionStatus.collection_rate} className="h-2" />
                  <div className="text-xs text-gray-600">
                    {formatCurrency(commissionStatus.total_collected)} collected of total
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
                <CardDescription>Current financial position</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Incoming Revenue</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(cashFlowIndicators.incoming_revenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Outgoing Payouts</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(cashFlowIndicators.outgoing_payouts)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Cash Flow</span>
                  <span className={`font-bold ${cashFlowIndicators.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowIndicators.net_cash_flow)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projections</CardTitle>
                <CardDescription>Estimated future cash flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Weekly Projection</span>
                  <span className="font-medium">
                    {formatCurrency(cashFlowIndicators.projected_weekly)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Projection</span>
                  <span className="font-medium">
                    {formatCurrency(cashFlowIndicators.projected_monthly)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Liquidity Ratio</span>
                  <Badge variant={cashFlowIndicators.liquidity_ratio >= 1.2 ? "default" : "destructive"}>
                    {cashFlowIndicators.liquidity_ratio.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialHealthDashboard;
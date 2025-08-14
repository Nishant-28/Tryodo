import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar,
  RefreshCw, BarChart3, PieChart, Target, Wallet,
  CreditCard, ArrowUpRight, ArrowDownRight, Activity,
  Users, ShoppingCart, Percent, Clock, CheckCircle,
  AlertTriangle, Eye, Download
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, ReferenceLine
} from 'recharts';
import { AnalyticsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import SankeyDiagram from './SankeyDiagram';

interface DashboardMetrics {
  // Revenue Metrics
  todayRevenue: number;
  revenueGrowth: number;
  totalRevenue: number;
  monthlyRevenue: number;

  // Sales Metrics
  todaySales: number;
  totalSales: number;
  dailySalesGrowth: number;
  avgOrderValue: number;

  // Commission Metrics
  todayCommission: number;
  totalCommission: number;
  commissionGrowth: number;
  commissionRate: number;

  // Operational Metrics
  totalOrders: number;
  pendingPayouts: number;
  cashFlowRatio: number;
  profitMargin: number;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  commission: number;
  orders: number;
  avgOrderValue: number;
  profit: number;
  expenses: number;
}

interface VendorPerformance {
  vendorName: string;
  revenue: number;
  commission: number;
  orders: number;
  growth: number;
}

interface CommissionBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

interface SankeyData {
  nodes: Array<{
    id: string;
    name: string;
    value: number;
    color: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    color: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PnLDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Data states
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayRevenue: 0,
    revenueGrowth: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    todaySales: 0,
    totalSales: 0,
    dailySalesGrowth: 0,
    avgOrderValue: 0,
    todayCommission: 0,
    totalCommission: 0,
    commissionGrowth: 0,
    commissionRate: 0,
    totalOrders: 0,
    pendingPayouts: 0,
    cashFlowRatio: 0,
    profitMargin: 0
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState<CommissionBreakdown[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [sankeyData, setSankeyData] = useState<SankeyData>({ nodes: [], links: [] });

  const { toast } = useToast();

  const generateSankeyData = (metrics: DashboardMetrics, vendors: VendorPerformance[]): SankeyData => {
    const totalRevenue = metrics.totalRevenue || 1000000; // Fallback for demo
    const totalCommission = metrics.totalCommission || totalRevenue * 0.12;
    const deliveryCosts = totalRevenue * 0.08; // 8% for delivery
    const operationalCosts = totalRevenue * 0.05; // 5% for operations
    const vendorPayouts = totalRevenue - totalCommission - deliveryCosts - operationalCosts;

    // Create nodes with better categorization
    const nodes = [
      { id: 'customer-source', name: 'Customer Revenue', value: totalRevenue, color: '#10b981' },
      { id: 'platform-middle', name: 'Platform Hub', value: totalRevenue, color: '#3b82f6' },
      { id: 'commission-target', name: 'Platform Earnings', value: totalCommission, color: '#f59e0b' },
      { id: 'vendor-target', name: 'Vendor Payments', value: vendorPayouts, color: '#ef4444' },
      { id: 'delivery-target', name: 'Delivery Partners', value: deliveryCosts, color: '#8b5cf6' },
      { id: 'operations-target', name: 'Operations', value: operationalCosts, color: '#6b7280' }
    ];

    // Create links with proper flow
    const links = [
      { source: 'customer-source', target: 'platform-middle', value: totalRevenue, color: '#10b981' },
      { source: 'platform-middle', target: 'commission-target', value: totalCommission, color: '#f59e0b' },
      { source: 'platform-middle', target: 'vendor-target', value: vendorPayouts, color: '#ef4444' },
      { source: 'platform-middle', target: 'delivery-target', value: deliveryCosts, color: '#8b5cf6' },
      { source: 'platform-middle', target: 'operations-target', value: operationalCosts, color: '#6b7280' }
    ];

    return { nodes, links };
  };

  const fetchPnLData = async () => {
    try {
      setRefreshing(true);

      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [
        summaryRes,
        dailyRes,
        vendorRes,
        categoryRes,
        cashFlowResult
      ] = await Promise.all([
        AnalyticsAPI.getPlatformPnLSummary(startDate, endDate),
        AnalyticsAPI.getPlatformPnLDaily(startDate, endDate),
        AnalyticsAPI.getPlatformVendorPerformance(startDate, endDate),
        AnalyticsAPI.getPlatformCommissionByCategory(startDate, endDate),
        fetchCashFlowData()
      ]);

      // Metrics
      const summary = summaryRes.success && summaryRes.data ? summaryRes.data : { total_revenue: 0, total_commission: 0, total_orders: 0, avg_order_value: 0 };

      // Today and yesterday from daily
      const daily = dailyRes.success ? (dailyRes.data || []) : [];
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0];
      const todayRow = daily.find((d:any) => d.date_day === todayStr);
      const yesterdayRow = daily.find((d:any) => d.date_day === yesterdayStr);

      const computedMetrics: DashboardMetrics = {
        todayRevenue: todayRow?.daily_revenue || 0,
        revenueGrowth: (yesterdayRow && yesterdayRow.daily_revenue > 0) ? (( (todayRow?.daily_revenue||0) - yesterdayRow.daily_revenue) / yesterdayRow.daily_revenue) * 100 : 0,
        totalRevenue: summary.total_revenue || 0,
        monthlyRevenue: daily.reduce((s:any, r:any) => s + (r.daily_revenue || 0), 0),
        todaySales: todayRow?.orders_count || 0,
        totalSales: daily.reduce((s:any, r:any) => s + (r.orders_count || 0), 0),
        dailySalesGrowth: 0,
        avgOrderValue: summary.avg_order_value || 0,
        todayCommission: todayRow?.daily_commission || 0,
        totalCommission: summary.total_commission || 0,
        commissionGrowth: 0,
        commissionRate: (summary.total_revenue > 0) ? (summary.total_commission / summary.total_revenue) * 100 : 0,
        totalOrders: summary.total_orders || 0,
        pendingPayouts: cashFlowResult.reduce ? cashFlowResult.reduce((sum:any, item:any) => sum + (item.outflow||0), 0) : 0,
        cashFlowRatio: (summary.total_revenue > 0) ? ((summary.total_revenue - (cashFlowResult.reduce ? cashFlowResult.reduce((sum:any, item:any) => sum + (item.outflow||0), 0):0)) / summary.total_revenue) : 0,
        profitMargin: (summary.total_revenue > 0) ? (summary.total_commission / summary.total_revenue) * 100 : 0
      };

      setMetrics(computedMetrics);

      // Time series data for charts
      const ts: TimeSeriesData[] = (daily || []).map((r:any) => ({
        date: r.date_day,
        revenue: r.daily_revenue || 0,
        commission: r.daily_commission || 0,
        orders: r.orders_count || 0,
        avgOrderValue: r.avg_order_value || 0,
        profit: r.daily_commission || 0,
        expenses: 0
      }));
      setTimeSeriesData(ts);

      // Vendor performance
      const vp: VendorPerformance[] = (vendorRes.success ? vendorRes.data : []).map((v:any) => ({
        vendorName: v.vendor_name,
        revenue: v.total_revenue || 0,
        commission: v.total_commission || 0,
        orders: v.total_orders || 0,
        growth: 0
      }));
      setVendorPerformance(vp);

      // Commission breakdown by category
      const cb: CommissionBreakdown[] = (categoryRes.success ? categoryRes.data : []).map((c:any, idx:number) => ({
        category: c.category_name || 'Other',
        amount: c.commission_amount || 0,
        percentage: 0, // will be calculated below
        color: COLORS[idx % COLORS.length]
      }));
      const totalCb = cb.reduce((s, x) => s + x.amount, 0);
      const cbWithPct = cb.map(x => ({ ...x, percentage: totalCb > 0 ? (x.amount / totalCb) * 100 : 0 })).sort((a,b) => b.amount - a.amount);
      setCommissionBreakdown(cbWithPct);

      setCashFlowData(cashFlowResult);
      setSankeyData(generateSankeyData(computedMetrics, vp));

    } catch (error) {
      console.error('Error fetching P&L data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch P&L data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchCashFlowData = async (): Promise<CashFlowData[]> => {
    try {
      // Generate last 12 months data
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push(date);
      }

      const cashFlowData = await Promise.all(months.map(async (month) => {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

        const { data: ordersData } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())
          .in('order_status', ['confirmed', 'processing', 'packed', 'picked_up', 'out_for_delivery', 'delivered']);

        const { data: payoutsData } = await supabase
          .from('payouts')
          .select('payout_amount')
          .gte('processed_date', startOfMonth.toISOString())
          .lte('processed_date', endOfMonth.toISOString())
          .eq('payout_status', 'completed');

        const inflow = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        const outflow = payoutsData?.reduce((sum, payout) => sum + (payout.payout_amount || 0), 0) || 0;

        return {
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          inflow,
          outflow,
          netFlow: inflow - outflow
        };
      }));

      return cashFlowData;
    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchPnLData();
  }, [timeRange]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  const formatPercentage = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const getGrowthColor = (growth: number) => growth >= 0 ? 'text-green-600' : 'text-red-600';
  const getGrowthIcon = (growth: number) => growth >= 0 ? ArrowUpRight : ArrowDownRight;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading P&L data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Financial Command Center</h2>
          <p className="text-gray-600">P&L, Cash Flow, Commission Tracking & Performance Analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPnLData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.todayRevenue)}</div>
            <div className={`text-xs flex items-center ${getGrowthColor(metrics.revenueGrowth)}`}>
              {React.createElement(getGrowthIcon(metrics.revenueGrowth), { className: "h-3 w-3 mr-1" })}
              {formatPercentage(metrics.revenueGrowth)} vs yesterday
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Commission</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.todayCommission)}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.commissionRate.toFixed(1)}% commission rate
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue)}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.todaySales} sales today
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow Ratio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.cashFlowRatio * 100).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              ₹{metrics.pendingPayouts.toLocaleString()} pending payouts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="commission">Commission Analytics</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue & Commission Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daily Revenue & Commission Trends
                <Badge variant="secondary">{timeRange.toUpperCase()}</Badge>
              </CardTitle>
              <CardDescription>
                Track daily revenue and commission earnings over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        formatCurrency(value),
                        name === 'revenue' ? 'Revenue' : 'Commission'
                      ]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      fill="#8884d8"
                      stroke="#8884d8"
                      fillOpacity={0.6}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="commission"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Commission"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {metrics.totalOrders} total orders
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(metrics.totalCommission)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {metrics.profitMargin.toFixed(1)}% profit margin
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cash Flow</span>
                    <Badge variant={metrics.cashFlowRatio > 0.8 ? "default" : "destructive"}>
                      {(metrics.cashFlowRatio * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Commission Rate</span>
                    <span className="text-sm font-medium">{metrics.commissionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Breakdown</CardTitle>
                <CardDescription>Revenue and order volume trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Average Order Value Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Average Order Value Trend</CardTitle>
                <CardDescription>Track AOV changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Line
                        type="monotone"
                        dataKey="avgOrderValue"
                        stroke="#82ca9d"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commission" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commission by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Commission by Category</CardTitle>
                <CardDescription>Breakdown of commission sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={commissionBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {commissionBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Commission Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Commission Collection Trends</CardTitle>
                <CardDescription>Daily commission earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />

                      <Area
                        type="monotone"
                        dataKey="commission"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Breakdown Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(item.amount)}</div>
                      <div className="text-sm text-gray-600">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          {/* Cash Flow KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Total Inflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.inflow, 0))}
                </div>
                <div className="text-sm text-gray-600">Last 12 months</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                  Total Outflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.outflow, 0))}
                </div>
                <div className="text-sm text-gray-600">Last 12 months</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-blue-600" />
                  Net Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.netFlow, 0))}
                </div>
                <div className="text-sm text-gray-600">Last 12 months</div>
              </CardContent>
            </Card>
          </div>

          {/* Sankey Diagram */}
          <SankeyDiagram
            data={sankeyData}
            title="Platform Cash Flow Diagram"
            description="Visual representation of money flow through the platform"
          />

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cash Flow Analysis</CardTitle>
              <CardDescription>Track inflow, outflow, and net cash flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="inflow" fill="#82ca9d" name="Inflow" />
                    <Bar dataKey="outflow" fill="#ff7c7c" name="Outflow" />
                    <Line
                      type="monotone"
                      dataKey="netFlow"
                      stroke="#8884d8"
                      strokeWidth={3}
                      name="Net Flow"
                    />
                    <ReferenceLine y={0} stroke="#000" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Vendor Performance</CardTitle>
              <CardDescription>Revenue and commission by vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorPerformance.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{vendor.vendorName}</div>
                        <div className="text-sm text-gray-600">{vendor.orders} orders</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(vendor.revenue)}</div>
                      <div className="text-sm text-green-600">
                        {formatCurrency(vendor.commission)} commission
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PnLDashboard; 
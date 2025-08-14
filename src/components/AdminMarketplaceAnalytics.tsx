import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Package, Users, ShoppingCart, 
  AlertTriangle, BarChart3, PieChart, Calendar, RefreshCw,
  DollarSign, Target, Activity, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { AdminAnalyticsAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  total_market_products: number;
  active_market_products: number;
  total_vendor_products: number;
  active_vendor_products: number;
  products_in_stock: number;
  products_out_of_stock: number;
  products_low_stock: number;
  total_vendors: number;
  active_vendors: number;
  vendors_with_marketplace_products: number;
  avg_products_per_vendor: number;
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  approval_rate: number;
  total_marketplace_orders: number;
  total_marketplace_revenue: number;
  avg_order_value: number;
  total_stock_units: number;
  total_stock_value: number;
  avg_stock_per_product: number;
  total_categories: number;
  categories_with_products: number;
  total_brands: number;
  brands_with_products: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  category_name: string;
  brand_name: string;
  total_orders: number;
  total_revenue: number;
  total_quantity_sold: number;
  avg_price: number;
  vendor_count: number;
}

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  total_products: number;
  active_products: number;
  products_in_stock: number;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  approval_rate: number;
  stock_health_percentage: number;
}

interface DailyTrend {
  date_day: string;
  total_orders: number;
  total_revenue: number;
  new_vendor_requests: number;
  approved_requests: number;
  new_products: number;
}

interface CategoryPerformance {
  category_id: string;
  category_name: string;
  total_products: number;
  active_vendor_products: number;
  total_orders: number;
  total_revenue: number;
  avg_price: number;
  vendor_count: number;
}

interface StockAlert {
  vendor_id: string;
  vendor_name: string;
  product_id: string;
  product_name: string;
  current_stock: number;
  threshold: number;
  is_out_of_stock: boolean;
  days_since_last_update: number;
  category_name: string;
  brand_name: string;
}

const AdminMarketplaceAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const [
        analyticsResponse,
        topProductsResponse,
        vendorPerformanceResponse,
        dailyTrendsResponse,
        categoryPerformanceResponse,
        stockAlertsResponse
      ] = await Promise.all([
        AdminAnalyticsAPI.getMarketplaceAnalytics(startDate, endDate),
        AdminAnalyticsAPI.getTopProducts(10, startDate, endDate),
        AdminAnalyticsAPI.getVendorPerformance(10, startDate, endDate),
        AdminAnalyticsAPI.getDailyTrends(parseInt(dateRange)),
        AdminAnalyticsAPI.getCategoryPerformance(startDate, endDate),
        AdminAnalyticsAPI.getStockAlerts()
      ]);

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }

      if (topProductsResponse.success) {
        setTopProducts(topProductsResponse.data || []);
      }

      if (vendorPerformanceResponse.success) {
        setVendorPerformance(vendorPerformanceResponse.data || []);
      }

      if (dailyTrendsResponse.success) {
        setDailyTrends(dailyTrendsResponse.data || []);
      }

      if (categoryPerformanceResponse.success) {
        setCategoryPerformance(categoryPerformanceResponse.data || []);
      }

      if (stockAlertsResponse.success) {
        setStockAlerts(stockAlertsResponse.data || []);
      }

    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Marketplace Analytics</h2>
          <p className="text-gray-600 mt-1">Monitor marketplace performance and vendor activity</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalyticsData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(analytics.total_marketplace_revenue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatNumber(analytics.total_marketplace_orders)} orders
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Products</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(analytics.active_vendor_products)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatNumber(analytics.products_in_stock)} in stock
                  </p>
                </div>
                <Package className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Vendors</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatNumber(analytics.vendors_with_marketplace_products)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    of {formatNumber(analytics.active_vendors)} total
                  </p>
                </div>
                <Users className="h-12 w-12 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {analytics.approval_rate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatNumber(analytics.pending_requests)} pending
                  </p>
                </div>
                <Target className="h-12 w-12 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Health Alert */}
      {stockAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Stock Alerts ({stockAlerts.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              Products requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockAlerts.slice(0, 6).map((alert) => (
                <div key={alert.product_id} className="bg-white rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{alert.product_name}</p>
                      <p className="text-sm text-gray-600">{alert.vendor_name}</p>
                    </div>
                    <Badge variant={alert.is_out_of_stock ? "destructive" : "secondary"} className="ml-2">
                      {alert.is_out_of_stock ? 'Out of Stock' : 'Low Stock'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Current: {alert.current_stock} units</p>
                    <p>Threshold: {alert.threshold} units</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {alert.days_since_last_update} days ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {stockAlerts.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All {stockAlerts.length} Alerts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Market Products</span>
                    <span className="font-semibold">{formatNumber(analytics.total_market_products)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Vendor Listings</span>
                    <span className="font-semibold">{formatNumber(analytics.total_vendor_products)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Stock</span>
                    <span className="font-semibold text-green-600">{formatNumber(analytics.products_in_stock)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Out of Stock</span>
                    <span className="font-semibold text-red-600">{formatNumber(analytics.products_out_of_stock)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low Stock</span>
                    <span className="font-semibold text-amber-600">{formatNumber(analytics.products_low_stock)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Vendor Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Vendor Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Vendors</span>
                    <span className="font-semibold">{formatNumber(analytics.total_vendors)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Vendors</span>
                    <span className="font-semibold">{formatNumber(analytics.active_vendors)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">With Marketplace Products</span>
                    <span className="font-semibold text-blue-600">{formatNumber(analytics.vendors_with_marketplace_products)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Products/Vendor</span>
                    <span className="font-semibold">{analytics.avg_products_per_vendor.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Request Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Request Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Requests</span>
                    <span className="font-semibold">{formatNumber(analytics.total_requests)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-amber-600">{formatNumber(analytics.pending_requests)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="font-semibold text-green-600">{formatNumber(analytics.approved_requests)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rejected</span>
                    <span className="font-semibold text-red-600">{formatNumber(analytics.rejected_requests)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Approval Rate</span>
                      <span className={cn("font-bold", getPercentageColor(analytics.approval_rate))}>
                        {analytics.approval_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analytics.approval_rate} className="mt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Best selling products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{product.product_name}</p>
                        <p className="text-sm text-gray-600">{product.category_name} • {product.brand_name}</p>
                        <p className="text-xs text-gray-500">{product.vendor_count} vendors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(product.total_revenue)}</p>
                      <p className="text-sm text-gray-600">{formatNumber(product.total_orders)} orders</p>
                      <p className="text-xs text-gray-500">{formatNumber(product.total_quantity_sold)} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance</CardTitle>
              <CardDescription>Top performing vendors by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorPerformance.map((vendor, index) => (
                  <div key={vendor.vendor_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{vendor.vendor_name}</p>
                        <p className="text-sm text-gray-600">
                          {vendor.active_products} products • {vendor.products_in_stock} in stock
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Approval: {vendor.approval_rate.toFixed(1)}%
                          </span>
                          <span className="text-xs text-gray-500">
                            Stock Health: {vendor.stock_health_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(vendor.total_revenue)}</p>
                      <p className="text-sm text-gray-600">{formatNumber(vendor.total_orders)} orders</p>
                      <p className="text-xs text-gray-500">Avg: {formatCurrency(vendor.avg_order_value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Performance metrics by product category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryPerformance.map((category) => (
                  <div key={category.category_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{category.category_name}</p>
                      <p className="text-sm text-gray-600">
                        {formatNumber(category.total_products)} products • {formatNumber(category.vendor_count)} vendors
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatNumber(category.active_vendor_products)} active listings
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(category.total_revenue)}</p>
                      <p className="text-sm text-gray-600">{formatNumber(category.total_orders)} orders</p>
                      <p className="text-xs text-gray-500">Avg: {formatCurrency(category.avg_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Trends</CardTitle>
              <CardDescription>Daily marketplace activity over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyTrends.slice(0, 10).map((trend) => (
                  <div key={trend.date_day} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{new Date(trend.date_day).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">
                        {formatNumber(trend.total_orders)} orders • {formatNumber(trend.new_vendor_requests)} requests
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(trend.total_revenue)}</p>
                      <p className="text-sm text-gray-600">{formatNumber(trend.approved_requests)} approved</p>
                      <p className="text-xs text-gray-500">{formatNumber(trend.new_products)} new products</p>
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

export default AdminMarketplaceAnalytics;
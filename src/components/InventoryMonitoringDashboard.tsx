import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Package, TrendingDown, Clock, RefreshCw,
  Eye, EyeOff, Bell, BellOff, Filter, Search, Download,
  CheckCircle, XCircle, AlertCircle, Activity, Users,
  ShoppingCart, Star, Truck, Calendar, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { AdminAnalyticsAPI, MarketplaceStockAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

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

interface InventoryMetrics {
  total_products: number;
  products_in_stock: number;
  products_out_of_stock: number;
  products_low_stock: number;
  avg_stock_per_product: number;
  total_stock_units: number;
  stock_health_percentage: number;
  critical_alerts: number;
  vendors_affected: number;
}

interface VendorStockSummary {
  vendor_id: string;
  vendor_name: string;
  total_products: number;
  in_stock_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  stock_health_percentage: number;
  last_update: string;
  alert_count: number;
}

interface CustomerSatisfactionMetric {
  metric_name: string;
  current_value: number;
  target_value: number;
  trend: 'up' | 'down' | 'stable';
  impact_level: 'high' | 'medium' | 'low';
}

const InventoryMonitoringDashboard: React.FC = () => {
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null);
  const [vendorSummaries, setVendorSummaries] = useState<VendorStockSummary[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerSatisfactionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadInventoryData();
    
    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadInventoryData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [alertsResponse, analyticsResponse] = await Promise.all([
        AdminAnalyticsAPI.getStockAlerts(),
        AdminAnalyticsAPI.getMarketplaceAnalytics()
      ]);

      if (alertsResponse.success) {
        setStockAlerts(alertsResponse.data || []);
      }

      if (analyticsResponse.success) {
        const analytics = analyticsResponse.data;
        setInventoryMetrics({
          total_products: analytics.active_vendor_products || 0,
          products_in_stock: analytics.products_in_stock || 0,
          products_out_of_stock: analytics.products_out_of_stock || 0,
          products_low_stock: analytics.products_low_stock || 0,
          avg_stock_per_product: analytics.avg_stock_per_product || 0,
          total_stock_units: analytics.total_stock_units || 0,
          stock_health_percentage: analytics.products_in_stock > 0 
            ? (analytics.products_in_stock / analytics.active_vendor_products) * 100 
            : 0,
          critical_alerts: (alertsResponse.data || []).filter((alert: StockAlert) => alert.is_out_of_stock).length,
          vendors_affected: new Set((alertsResponse.data || []).map((alert: StockAlert) => alert.vendor_id)).size
        });
      }

      // Generate vendor summaries from alerts
      generateVendorSummaries(alertsResponse.data || []);
      
      // Generate mock customer satisfaction metrics
      generateCustomerMetrics();

    } catch (error) {
      console.error('Error loading inventory data:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateVendorSummaries = (alerts: StockAlert[]) => {
    const vendorMap = new Map<string, VendorStockSummary>();
    
    alerts.forEach(alert => {
      if (!vendorMap.has(alert.vendor_id)) {
        vendorMap.set(alert.vendor_id, {
          vendor_id: alert.vendor_id,
          vendor_name: alert.vendor_name,
          total_products: 0,
          in_stock_products: 0,
          out_of_stock_products: 0,
          low_stock_products: 0,
          stock_health_percentage: 0,
          last_update: new Date().toISOString(),
          alert_count: 0
        });
      }
      
      const summary = vendorMap.get(alert.vendor_id)!;
      summary.alert_count++;
      
      if (alert.is_out_of_stock) {
        summary.out_of_stock_products++;
      } else {
        summary.low_stock_products++;
      }
    });

    setVendorSummaries(Array.from(vendorMap.values()));
  };

  const generateCustomerMetrics = () => {
    // Mock customer satisfaction metrics
    setCustomerMetrics([
      {
        metric_name: 'Product Availability Rate',
        current_value: 87.5,
        target_value: 95.0,
        trend: 'down',
        impact_level: 'high'
      },
      {
        metric_name: 'Order Fulfillment Rate',
        current_value: 92.3,
        target_value: 98.0,
        trend: 'stable',
        impact_level: 'medium'
      },
      {
        metric_name: 'Customer Satisfaction Score',
        current_value: 4.2,
        target_value: 4.5,
        trend: 'up',
        impact_level: 'medium'
      },
      {
        metric_name: 'Stock-out Incidents',
        current_value: 23,
        target_value: 10,
        trend: 'up',
        impact_level: 'high'
      }
    ]);
  };

  const filteredAlerts = stockAlerts.filter(alert => {
    const matchesFilter = alertFilter === 'all' || 
      (alertFilter === 'out_of_stock' && alert.is_out_of_stock) ||
      (alertFilter === 'low_stock' && !alert.is_out_of_stock);
    
    const matchesSearch = !searchTerm || 
      alert.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.category_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getAlertSeverity = (alert: StockAlert) => {
    if (alert.is_out_of_stock) return 'critical';
    if (alert.current_stock <= alert.threshold * 0.5) return 'high';
    return 'medium';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportAlerts = () => {
    const csvContent = [
      ['Vendor', 'Product', 'Category', 'Brand', 'Current Stock', 'Threshold', 'Status', 'Days Since Update'],
      ...filteredAlerts.map(alert => [
        alert.vendor_name,
        alert.product_name,
        alert.category_name,
        alert.brand_name,
        alert.current_stock.toString(),
        alert.threshold.toString(),
        alert.is_out_of_stock ? 'Out of Stock' : 'Low Stock',
        alert.days_since_last_update.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Inventory Monitoring</h2>
          <p className="text-gray-600 mt-1">Real-time inventory alerts and customer satisfaction tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
            Auto Refresh
          </Button>
          <Button onClick={loadInventoryData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {inventoryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock Health</p>
                  <p className="text-3xl font-bold text-green-600">
                    {inventoryMetrics.stock_health_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {inventoryMetrics.products_in_stock} of {inventoryMetrics.total_products} products
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical Alerts</p>
                  <p className="text-3xl font-bold text-red-600">
                    {inventoryMetrics.critical_alerts}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Out of stock products
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {inventoryMetrics.products_low_stock}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Below threshold
                  </p>
                </div>
                <Package className="h-12 w-12 text-amber-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vendors Affected</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {inventoryMetrics.vendors_affected}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Need attention
                  </p>
                </div>
                <Users className="h-12 w-12 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alerts Banner */}
      {inventoryMetrics && inventoryMetrics.critical_alerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Alert:</strong> {inventoryMetrics.critical_alerts} products are completely out of stock, 
            affecting {inventoryMetrics.vendors_affected} vendors. Immediate action required to prevent customer dissatisfaction.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Summary</TabsTrigger>
          <TabsTrigger value="satisfaction">Customer Impact</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products, vendors, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportAlerts}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts ({filteredAlerts.length})</CardTitle>
              <CardDescription>Products requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAlerts.map((alert) => {
                  const severity = getAlertSeverity(alert);
                  return (
                    <div key={alert.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                          {alert.is_out_of_stock ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{alert.product_name}</p>
                            <Badge className={cn("text-xs", getAlertColor(severity))}>
                              {severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{alert.vendor_name}</p>
                          <p className="text-xs text-gray-500">
                            {alert.category_name} • {alert.brand_name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Current: {alert.current_stock} units</span>
                            <span>Threshold: {alert.threshold} units</span>
                            <span>Last updated: {alert.days_since_last_update} days ago</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm">
                          Contact Vendor
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredAlerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No stock alerts found</p>
                    <p className="text-sm">All products are adequately stocked</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Stock Summary</CardTitle>
              <CardDescription>Overview of vendor inventory health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorSummaries.map((vendor) => (
                  <div key={vendor.vendor_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{vendor.vendor_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{vendor.alert_count} alerts</span>
                        <span>{vendor.out_of_stock_products} out of stock</span>
                        <span>{vendor.low_stock_products} low stock</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={vendor.alert_count > 5 ? "destructive" : vendor.alert_count > 0 ? "secondary" : "default"}>
                        {vendor.alert_count === 0 ? 'Healthy' : `${vendor.alert_count} Issues`}
                      </Badge>
                    </div>
                  </div>
                ))}

                {vendorSummaries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No vendor issues found</p>
                    <p className="text-sm">All vendors have healthy inventory levels</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Satisfaction Impact</CardTitle>
              <CardDescription>How inventory issues affect customer experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customerMetrics.map((metric) => (
                  <div key={metric.metric_name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{metric.metric_name}</p>
                      {getTrendIcon(metric.trend)}
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-2xl font-bold">
                        {metric.metric_name.includes('Score') ? metric.current_value.toFixed(1) : metric.current_value}
                        {metric.metric_name.includes('Rate') && '%'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Target: {metric.metric_name.includes('Score') ? metric.target_value.toFixed(1) : metric.target_value}
                        {metric.metric_name.includes('Rate') && '%'}
                      </span>
                    </div>
                    <Progress 
                      value={metric.metric_name.includes('Score') 
                        ? (metric.current_value / 5) * 100 
                        : Math.min((metric.current_value / metric.target_value) * 100, 100)
                      } 
                      className="mb-2" 
                    />
                    <Badge variant={metric.impact_level === 'high' ? "destructive" : metric.impact_level === 'medium' ? "secondary" : "default"}>
                      {metric.impact_level.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Trends</CardTitle>
              <CardDescription>Historical inventory performance and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Trend Analysis Coming Soon</p>
                <p className="text-sm">Historical data visualization and predictive analytics will be available here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryMonitoringDashboard;
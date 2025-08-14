import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, 
  Edit3, Save, X, RefreshCw, Eye, EyeOff, Settings,
  CheckCircle, XCircle, Clock, Minus, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { MarketplaceStockAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface StockItem {
  id: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_in_stock: boolean;
  is_active: boolean;
  last_stock_update: string;
  market_product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface StockAlert {
  id: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_in_stock: boolean;
  alert_type: 'out_of_stock' | 'low_stock';
  alert_message: string;
  market_product: {
    id: string;
    name: string;
    images: string[];
  };
}

interface StockSummary {
  total_products: number;
  active_products: number;
  in_stock_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  total_stock_units: number;
  stock_health_percentage: number;
}

interface MarketplaceStockManagerProps {
  vendorId: string;
  onStockUpdate?: () => void;
}

const MarketplaceStockManager: React.FC<MarketplaceStockManagerProps> = ({
  vendorId,
  onStockUpdate
}) => {
  const [products, setProducts] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});
  const [editingThreshold, setEditingThreshold] = useState<{ [key: string]: number }>({});
  const [showAlerts, setShowAlerts] = useState(true);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);

  useEffect(() => {
    loadStockData();
    loadProducts();
  }, [vendorId]);

  const loadProducts = async () => {
    try {
      // Fetch vendor's marketplace products
      const { data, error } = await supabase
        .from('market_vendor_products')
        .select(`
          id,
          stock_quantity,
          low_stock_threshold,
          is_in_stock,
          is_active,
          last_stock_update,
          market_product:market_products (
            id,
            name,
            images
          )
        `)
        .eq('vendor_id', vendorId)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const loadStockData = async () => {
    setLoading(true);
    try {
      const [alertsResponse, summaryResponse] = await Promise.all([
        MarketplaceStockAPI.getLowStockAlerts(vendorId),
        MarketplaceStockAPI.getVendorStockSummary(vendorId)
      ]);

      if (alertsResponse.success) {
        setAlerts(alertsResponse.data || []);
      }

      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId: string, newQuantity: number) => {
    try {
      const response = await MarketplaceStockAPI.updateStock(productId, newQuantity, vendorId);
      
      if (response.success) {
        // Update local state
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, stock_quantity: newQuantity, is_in_stock: newQuantity > 0 }
            : product
        ));

        // Clear editing state
        setEditingStock(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });

        toast({
          title: "✅ Stock Updated",
          description: response.message,
        });

        // Reload alerts and summary
        loadStockData();
        onStockUpdate?.();
      } else {
        toast({
          title: "❌ Update Failed",
          description: response.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  const handleThresholdUpdate = async (productId: string, newThreshold: number) => {
    try {
      const response = await MarketplaceStockAPI.setLowStockThreshold(productId, newThreshold, vendorId);
      
      if (response.success) {
        // Update local state
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, low_stock_threshold: newThreshold }
            : product
        ));

        // Clear editing state
        setEditingThreshold(prev => {
          const newState = { ...prev };
          delete newState[productId];
          return newState;
        });

        toast({
          title: "✅ Threshold Updated",
          description: response.message,
        });

        // Reload alerts
        loadStockData();
      } else {
        toast({
          title: "❌ Update Failed",
          description: response.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to update threshold",
        variant: "destructive",
      });
    }
  };

  const getStockStatusColor = (product: StockItem) => {
    if (!product.is_in_stock) return 'text-red-600 bg-red-100';
    if (product.stock_quantity <= product.low_stock_threshold) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  const getStockStatusIcon = (product: StockItem) => {
    if (!product.is_in_stock) return <XCircle className="h-4 w-4" />;
    if (product.stock_quantity <= product.low_stock_threshold) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const quickStockAdjust = (productId: string, currentStock: number, adjustment: number) => {
    const newStock = Math.max(0, currentStock + adjustment);
    handleStockUpdate(productId, newStock);
  };

  return (
    <div className="space-y-6">
      {/* Stock Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">{summary.total_products}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">{summary.in_stock_products}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.low_stock_products}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stock Health</p>
                  <p className="text-2xl font-bold">{summary.stock_health_percentage}%</p>
                </div>
                <TrendingUp className={cn(
                  "h-8 w-8",
                  summary.stock_health_percentage >= 80 ? "text-green-600" :
                  summary.stock_health_percentage >= 60 ? "text-amber-600" : "text-red-600"
                )} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Alerts */}
      {alerts.length > 0 && showAlerts && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Stock Alerts ({alerts.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAlerts(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} className={cn(
                  "border-l-4",
                  alert.alert_type === 'out_of_stock' ? "border-l-red-500" : "border-l-amber-500"
                )}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{alert.market_product.name}</p>
                        <p className="text-sm text-gray-600">{alert.alert_message}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingStock({ [alert.id]: alert.stock_quantity })}
                        >
                          Update Stock
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stock Management</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStockData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              {!showAlerts && alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAlerts(true)}
                >
                  <Eye className="h-4 w-4" />
                  Show Alerts ({alerts.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => {
              const isEditingStock = editingStock.hasOwnProperty(product.id);
              const isEditingThreshold = editingThreshold.hasOwnProperty(product.id);
              const productImage = product.market_product.images?.[0];

              return (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    {productImage && (
                      <img 
                        src={productImage} 
                        alt={product.market_product.name}
                        className="w-16 h-16 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{product.market_product.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-xs", getStockStatusColor(product))}>
                              {getStockStatusIcon(product)}
                              <span className="ml-1">
                                {!product.is_in_stock ? 'Out of Stock' :
                                 product.stock_quantity <= product.low_stock_threshold ? 'Low Stock' : 'In Stock'}
                              </span>
                            </Badge>
                            {!product.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current Stock */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Current Stock</label>
                          <div className="flex items-center gap-2 mt-1">
                            {isEditingStock ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={editingStock[product.id]}
                                  onChange={(e) => setEditingStock(prev => ({
                                    ...prev,
                                    [product.id]: parseInt(e.target.value) || 0
                                  }))}
                                  className="w-24"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleStockUpdate(product.id, editingStock[product.id])}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingStock(prev => {
                                    const newState = { ...prev };
                                    delete newState[product.id];
                                    return newState;
                                  })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{product.stock_quantity}</span>
                                <span className="text-sm text-gray-600">units</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingStock({ [product.id]: product.stock_quantity })}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                {/* Quick adjust buttons */}
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => quickStockAdjust(product.id, product.stock_quantity, -1)}
                                    disabled={product.stock_quantity <= 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => quickStockAdjust(product.id, product.stock_quantity, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Low Stock Threshold */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Low Stock Threshold</label>
                          <div className="flex items-center gap-2 mt-1">
                            {isEditingThreshold ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={editingThreshold[product.id]}
                                  onChange={(e) => setEditingThreshold(prev => ({
                                    ...prev,
                                    [product.id]: parseInt(e.target.value) || 0
                                  }))}
                                  className="w-24"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleThresholdUpdate(product.id, editingThreshold[product.id])}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingThreshold(prev => {
                                    const newState = { ...prev };
                                    delete newState[product.id];
                                    return newState;
                                  })}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{product.low_stock_threshold}</span>
                                <span className="text-sm text-gray-600">units</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingThreshold({ [product.id]: product.low_stock_threshold })}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Last Updated */}
                      {product.last_stock_update && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last updated: {new Date(product.last_stock_update).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No marketplace products found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceStockManager;
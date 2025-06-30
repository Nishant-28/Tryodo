import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, Filter, Download, Upload, BarChart3, 
  TrendingUp, Edit, Trash2, Eye, EyeOff, AlertCircle, CheckCircle,
  RefreshCw, FileText, Calendar, ShoppingCart, Users, Star,
  Activity, PieChart, LineChart, Archive, Settings, Grid3X3,
  List, MoreVertical, Copy, Heart, Share2, ImageIcon,
  DollarSign, TrendingDown, ArrowUp, ArrowDown, Clock,
  Filter as FilterIcon, SortAsc, SortDesc, X, ChevronDown,
  Zap, Target, Layers, Store, Package2, Globe, Truck,
  QrCode, Calculator, Save, Bookmark, Bell, Crown,
  Lightbulb, Percent, ImageOff, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import Header from '@/components/Header';
import FloatingActionButton from '@/components/ui/floating-action-button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface VendorProduct {
  id: string;
  price: number;
  original_price: number | null;
  warranty_months: number;
  stock_quantity: number;
  is_in_stock: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; };
  quality_type: { id: string; name: string; };
  model?: { 
    id: string; 
    model_name: string; 
    brand: { name: string; };
  };
  generic_product?: { 
    id: string; 
    name: string; 
    description: string; 
    image_url?: string;
  };
  _sales?: {
    total_sold: number;
    revenue: number;
    avg_rating: number;
    conversion_rate: number;
    profit_margin: number;
    last_sold: string;
  };
  _analytics?: {
    views: number;
    clicks: number;
    cart_adds: number;
    wishlist_adds: number;
  };
  reorder_point?: number;
  profit_margin?: number;
  tags?: string[];
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  totalValue: number;
  averagePrice: number;
  totalRevenue: number;
  bestSeller: string;
  totalProfit: number;
  averageMargin: number;
  criticalStock: number;
  topPerformer: string;
}

interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    product_name: string;
    total_sold: number;
    revenue: number;
    profit: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    orders: number;
    profit: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    count: number;
    growth: number;
  }>;
  lowStockAlerts: Array<{
    product_id: string;
    product_name: string;
    current_stock: number;
    reorder_point: number;
    days_until_empty: number;
  }>;
}

interface Category {
  id: string;
  name: string;
}

interface QualityType {
  id: string;
  name: string;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status: string;
    category: string;
    quality: string;
    priceRange: { min: string; max: string; };
    stockFilter: string;
    tags: string[];
  };
}

interface ProductTemplate {
  id: string;
  name: string;
  category_id: string;
  quality_type_id: string;
  warranty_months: number;
  tags: string[];
}

const VendorProductManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTypes, setQualityTypes] = useState<QualityType[]>([]);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);
  
  const [productStats, setProductStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalValue: 0,
    averagePrice: 0,
    totalRevenue: 0,
    bestSeller: '',
    totalProfit: 0,
    averageMargin: 0,
    criticalStock: 0,
    topPerformer: ''
  });
  
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topSellingProducts: [],
    monthlyTrends: [],
    categoryPerformance: [],
    lowStockAlerts: []
  });
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Enhanced Filtering and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [profitMarginRange, setProfitMarginRange] = useState([0, 100]);
  const [performanceFilter, setPerformanceFilter] = useState('all');
  
  // Quick Edit State
  const [editingProduct, setEditingProduct] = useState<VendorProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  
  // Quick actions state
  const [showQuickStockUpdate, setShowQuickStockUpdate] = useState(false);
  const [showQuickPriceUpdate, setShowQuickPriceUpdate] = useState(false);
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');
  const [showRestockSuggestions, setShowRestockSuggestions] = useState(false);
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [comparedProducts, setComparedProducts] = useState<string[]>([]);

  // Helper functions
  const getProductDisplayName = useCallback((product: VendorProduct) => {
    if (product.model) {
      return `${product.model.brand?.name} ${product.model.model_name}`;
    }
    // For non-smartphone products, use model name if available
    return product.model?.model_name || 'Product';
  }, []);

  const getStockStatus = useCallback((stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (stock <= 5) return { label: 'Low Stock', color: 'warning' };
    if (stock <= 10) return { label: 'Medium Stock', color: 'default' };
    return { label: 'Good Stock', color: 'success' };
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategory('all');
    setFilterQuality('all');
    setStockFilter('all');
    setPriceRange({ min: '', max: '' });
    setSortBy('updated_at');
    setSortOrder('desc');
  }, []);

  useEffect(() => {
    if (profile?.role === 'vendor') {
      initializeVendorManagement();
    }
  }, [profile]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, searchTerm, filterStatus, filterCategory, filterQuality, sortBy, sortOrder, priceRange, stockFilter]);

  const initializeVendorManagement = async () => {
    try {
      setLoading(true);
      
      console.log('Current profile:', profile); // Debug log
      
      // Get vendor ID
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('profile_id', profile!.id)
        .single();

      console.log('Vendor query result:', { vendorData, vendorError }); // Debug log

      if (vendorError || !vendorData) {
        console.error('Vendor lookup failed:', vendorError);
        throw new Error('Vendor not found');
      }

      console.log('Found vendor:', vendorData); // Debug log
      setVendorId(vendorData.id);
      
      await Promise.all([
        loadProducts(vendorData.id),
        loadCategories(),
        loadQualityTypes(),
        loadProductStats(vendorData.id),
        loadSalesAnalytics(vendorData.id)
      ]);
    } catch (error) {
      console.error('Error initializing vendor management:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor data. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_products')
        .select(`
          *,
          categories!category_id (id, name),
          category_qualities!quality_type_id (id, quality_name),
          smartphone_models!model_id (
            id, model_name,
            brands!brand_id (name)
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw products data:', data); // Debug log
      
      const formattedProducts = data.map(product => ({
        ...product,
        category: product.categories,
        quality_type: { 
          id: product.category_qualities?.id, 
          name: product.category_qualities?.quality_name 
        },
        model: product.smartphone_models ? {
          ...product.smartphone_models,
          brand: product.smartphone_models.brands
        } : undefined
      }));

      console.log('Formatted products:', formattedProducts); // Debug log
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadQualityTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('category_qualities')
        .select('id, quality_name')
        .eq('is_active', true)
        .order('quality_name');

      if (error) throw error;
      setQualityTypes(data?.map(qt => ({ id: qt.id, name: qt.quality_name })) || []);
    } catch (error) {
      console.error('Error loading quality types:', error);
    }
  };

  const loadProductStats = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_products')
        .select('price, stock_quantity, is_active, is_in_stock')
        .eq('vendor_id', vendorId);

      if (error) throw error;

      const stats = data.reduce((acc, product) => {
        acc.totalProducts++;
        if (product.is_active) acc.activeProducts++;
        if (product.stock_quantity === 0) acc.outOfStock++;
        if (product.stock_quantity > 0 && product.stock_quantity <= 5) acc.lowStock++;
        acc.totalValue += product.price * product.stock_quantity;
        return acc;
      }, {
        totalProducts: 0,
        activeProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        totalValue: 0,
        averagePrice: 0,
        totalRevenue: 0,
        bestSeller: '',
        totalProfit: 0,
        averageMargin: 0,
        criticalStock: 0,
        topPerformer: ''
      });

      stats.averagePrice = stats.totalProducts > 0 ? stats.totalValue / data.reduce((sum, p) => sum + p.stock_quantity, 0) : 0;
      setProductStats(stats);
    } catch (error) {
      console.error('Error loading product stats:', error);
    }
  };

  const loadSalesAnalytics = async (vendorId: string) => {
    // Mock analytics for now - in real implementation, this would fetch from order_items
    setSalesAnalytics({
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topSellingProducts: [],
      monthlyTrends: [],
      categoryPerformance: [],
      lowStockAlerts: []
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product => {
        const searchFields = [
          product.model?.model_name,
          product.model?.brand?.name,
          product.category?.name,
          product.quality_type?.name,
          product.generic_product?.name
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchFields.includes(searchTerm.toLowerCase());
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'active':
          filtered = filtered.filter(p => p.is_active);
          break;
        case 'inactive':
          filtered = filtered.filter(p => !p.is_active);
          break;
        case 'in_stock':
          filtered = filtered.filter(p => p.is_in_stock && p.stock_quantity > 0);
          break;
        case 'out_of_stock':
          filtered = filtered.filter(p => !p.is_in_stock || p.stock_quantity === 0);
          break;
        case 'low_stock':
          filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5);
          break;
      }
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.id === filterCategory);
    }

    // Quality filter
    if (filterQuality !== 'all') {
      filtered = filtered.filter(p => p.quality_type?.id === filterQuality);
    }

    // Stock filter
    if (stockFilter !== 'all') {
      switch (stockFilter) {
        case 'high':
          filtered = filtered.filter(p => p.stock_quantity > 10);
          break;
        case 'medium':
          filtered = filtered.filter(p => p.stock_quantity >= 6 && p.stock_quantity <= 10);
          break;
        case 'low':
          filtered = filtered.filter(p => p.stock_quantity >= 1 && p.stock_quantity <= 5);
          break;
        case 'zero':
          filtered = filtered.filter(p => p.stock_quantity === 0);
          break;
      }
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(p => {
        const price = p.price;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.model?.model_name || a.generic_product?.name || '';
          bValue = b.model?.model_name || b.generic_product?.name || '';
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        default:
          aValue = a.updated_at;
          bValue = b.updated_at;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1);
    });

    setFilteredProducts(filtered);
  };

  const handleProductAction = async (productId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('vendor_products')
          .delete()
          .eq('id', productId);
        
        if (error) throw error;
        
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
      } else {
        const { error } = await supabase
          .from('vendor_products')
          .update({ is_active: action === 'activate' })
          .eq('id', productId);
        
        if (error) throw error;
        
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, is_active: action === 'activate' } : p
        ));
        
        toast({
          title: "Success",
          description: `Product ${action}d successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${action} product: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedProducts.length === 0) return;

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('vendor_products')
          .delete()
          .in('id', selectedProducts);
        
        if (error) throw error;
        
        setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      } else {
        const { error } = await supabase
          .from('vendor_products')
          .update({ is_active: action === 'activate' })
          .in('id', selectedProducts);
        
        if (error) throw error;
        
        setProducts(prev => prev.map(p => 
          selectedProducts.includes(p.id) 
            ? { ...p, is_active: action === 'activate' }
            : p
        ));
      }
      
      setSelectedProducts([]);
      setShowBulkActions(false);
      
      toast({
        title: "Success",
        description: `${selectedProducts.length} products ${action}d successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${action} products: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleQuickEdit = async (productId: string, updates: Partial<VendorProduct>) => {
    try {
      const { error } = await supabase
        .from('vendor_products')
        .update(updates)
        .eq('id', productId);
      
      if (error) throw error;
      
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, ...updates } : p
      ));
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update product: ${error.message}`,
        variant: "destructive",
      });
    }
  };



  const exportProductsCSV = () => {
    const headers = [
      'Product Name', 'Brand', 'Category', 'Quality', 'Price', 'Original Price', 
      'Stock', 'Status', 'Warranty (months)', 'Created Date'
    ];
    
    const rows = filteredProducts.map(product => [
      product.model?.model_name || product.generic_product?.name || '',
      product.model?.brand?.name || '',
      product.category?.name || '',
      product.quality_type?.name || '',
      product.price,
      product.original_price || '',
      product.stock_quantity,
      product.is_active ? 'Active' : 'Inactive',
      product.warranty_months,
      new Date(product.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading your products...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
              <p className="text-gray-600 mt-1">Manage your product catalog with ease</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                                  onClick={() => navigate('/vendor/add-product')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
              <Button variant="outline" onClick={exportProductsCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{productStats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-green-600 font-medium">{productStats.activeProducts}</span>
                <span className="text-gray-600 ml-1">active</span>
              </div>
            </CardContent>
          </Card>

          {/* Removed Total Value Card as per request */}
          {/*
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{productStats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">Avg: ₹{Math.round(productStats.averagePrice)}</span>
              </div>
            </CardContent>
          </Card>
          */}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">{productStats.lowStock}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-red-600 font-medium">{productStats.outOfStock}</span>
                <span className="text-gray-600 ml-1">out of stock</span>
              </div>
            </CardContent>
          </Card>

          {/* Removed Performance Card as per request */}
          {/*
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Performance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {productStats.totalProducts > 0 ? Math.round((productStats.activeProducts / productStats.totalProducts) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-600">Active rate</span>
              </div>
            </CardContent>
          </Card>
          */}
        </div>

        {/* Smart Business Insights - NEW ENHANCEMENT */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Smart Business Insights
              <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                <img src="https://img.icons8.com/color/16/000000/chatgpt.png" alt="AI" className="w-4 h-4" />
                OpenAI
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time recommendations to optimize your product management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Critical Stock Alert */}
              {productStats.outOfStock > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical:</strong> {productStats.outOfStock} products out of stock. 
                    Immediate restocking needed to prevent revenue loss.
                  </AlertDescription>
                </Alert>
              )}

              {/* Low Stock Warning */}
              {productStats.lowStock > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> {productStats.lowStock} products running low. 
                    Plan restocking in next 2-3 days.
                  </AlertDescription>
                </Alert>
              )}

              {/* Performance Tip */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Profit Optimization</p>
                    <p className="text-sm text-blue-700">
                      Average inventory value: ₹{Math.round(productStats.totalValue / Math.max(productStats.totalProducts, 1)).toLocaleString()}
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      <Calculator className="h-3 w-3 mr-1" />
                      Analyze Margins
                    </Button>
                  </div>
                </div>
              </div>

              {/* Category Performance */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Portfolio Health</p>
                    <p className="text-sm text-green-700">
                      {Math.round((productStats.activeProducts / Math.max(productStats.totalProducts, 1)) * 100)}% active rate
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      View Trends
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">Quick Actions</p>
                    <p className="text-sm text-purple-700">
                      Bulk update pricing or restock items
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Pricing
                      </Button>
                      <Button size="sm" variant="outline">
                        <Package className="h-3 w-3 mr-1" />
                        Restock
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Score */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Business Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={Math.round((productStats.activeProducts / Math.max(productStats.totalProducts, 1)) * 100)} 
                        className="h-2 flex-1" 
                      />
                      <span className="text-sm font-bold text-yellow-700">
                        {Math.round((productStats.activeProducts / Math.max(productStats.totalProducts, 1)) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Based on active inventory ratio
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products by name, brand, category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="high">High (10+)</SelectItem>
                    <SelectItem value="medium">Medium (6-10)</SelectItem>
                    <SelectItem value="low">Low (1-5)</SelectItem>
                    <SelectItem value="zero">Zero</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated_at">Last Updated</SelectItem>
                    <SelectItem value="created_at">Date Added</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {(searchTerm || filterStatus !== 'all' || filterCategory !== 'all' || stockFilter !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center gap-4 mt-4">
              <Label className="text-sm text-gray-600">Price Range:</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-20"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedProducts.length === filteredProducts.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProducts(filteredProducts.map(p => p.id));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleBulkAction('activate')}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Deactivate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">
                {products.length === 0 
                  ? "You haven't added any products yet. Start by adding your first product!"
                  : "No products match your current filters. Try adjusting your search criteria."
                }
              </p>
              {products.length === 0 && (
                <Button onClick={() => navigate('/vendor/add-product')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results Summary */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-600">
                Showing {filteredProducts.length} of {products.length} products
              </p>
              <div className="text-sm text-gray-600">
                Total value: ₹{filteredProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0).toLocaleString()}
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    selected={selectedProducts.includes(product.id)}
                    onSelect={(selected) => {
                      if (selected) {
                        setSelectedProducts(prev => [...prev, product.id]);
                      } else {
                        setSelectedProducts(prev => prev.filter(id => id !== product.id));
                      }
                    }}
                    onEdit={() => {
                      setEditingProduct(product);
                      setShowEditDialog(true);
                    }}
                    onAction={handleProductAction}
                    onQuickUpdate={handleQuickEdit}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ProductTable 
                    products={filteredProducts}
                    selectedProducts={selectedProducts}
                    onSelectAll={(selected) => {
                      setSelectedProducts(selected ? filteredProducts.map(p => p.id) : []);
                    }}
                    onSelect={(productId, selected) => {
                      if (selected) {
                        setSelectedProducts(prev => [...prev, productId]);
                      } else {
                        setSelectedProducts(prev => prev.filter(id => id !== productId));
                      }
                    }}
                    onEdit={(product) => {
                      setEditingProduct(product);
                      setShowEditDialog(true);
                    }}
                    onAction={handleProductAction}
                    onQuickUpdate={handleQuickEdit}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Quick Edit Dialog */}
        {editingProduct && (
          <QuickEditDialog
            product={editingProduct}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSave={(updates) => {
              handleQuickEdit(editingProduct.id, updates);
              setShowEditDialog(false);
              setEditingProduct(null);
            }}
            categories={categories}
            qualityTypes={qualityTypes}
          />
        )}

        {/* Floating Action Button - NEW ENHANCEMENT */}
        <FloatingActionButton 
          onQuickAction={(action) => {
            switch (action) {
              case 'add-product':
                navigate('/vendor/add-product');
                break;
              case 'bulk-pricing':
                toast({
                  title: "Bulk Pricing",
                  description: "Bulk pricing tool opening soon!",
                });
                break;
              case 'restock-alert':
                toast({
                  title: "Restock Alert",
                  description: `${productStats.lowStock + productStats.outOfStock} products need attention`,
                });
                break;
              case 'profit-calc':
                toast({
                  title: "Profit Calculator",
                  description: "Advanced profit calculator coming soon!",
                });
                break;
              case 'analytics':
                toast({
                  title: "Quick Analytics",
                  description: `Total inventory value: ₹${productStats.totalValue.toLocaleString()}`,
                });
                break;
            }
          }}
        />
      </div>
    </div>
  );
};

// Product Card Component for Grid View
interface ProductCardProps {
  product: VendorProduct;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onAction: (id: string, action: 'activate' | 'deactivate' | 'delete') => void;
  onQuickUpdate: (id: string, updates: Partial<VendorProduct>) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, selected, onSelect, onEdit, onAction, onQuickUpdate 
}) => {
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (stock <= 5) return { label: 'Low Stock', color: 'warning' };
    if (stock <= 10) return { label: 'Medium Stock', color: 'default' };
    return { label: 'Good Stock', color: 'success' };
  };

  const getProductDisplayName = (product: VendorProduct) => {
    if (product.model) {
      return `${product.model.brand?.name} ${product.model.model_name}`;
    }
    return product.model?.model_name || 'Product';
  };

  const stockStatus = getStockStatus(product.stock_quantity);
  const productName = getProductDisplayName(product);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStockUpdate = async (newStock: number) => {
    setIsUpdating(true);
    await onQuickUpdate(product.id, { 
      stock_quantity: newStock,
      is_in_stock: newStock > 0 
    });
    setIsUpdating(false);
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <Checkbox 
            checked={selected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Quick Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(product.id, product.is_active ? 'deactivate' : 'activate')}>
                {product.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {product.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction(product.id, 'delete')} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900 line-clamp-2 text-sm">{productName}</h3>
            <p className="text-xs text-gray-600 mt-1">
              {product.category?.name} • {product.quality_type?.name}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">₹{product.price.toLocaleString()}</p>
              {product.original_price && product.original_price > product.price && (
                <p className="text-xs text-gray-500 line-through">₹{product.original_price.toLocaleString()}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-xs">
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Stock:</span>
              <Badge variant={stockStatus.color as any}>
                {product.stock_quantity}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 w-6 p-0" 
                onClick={() => handleStockUpdate(Math.max(0, product.stock_quantity - 1))}
                disabled={isUpdating || product.stock_quantity === 0}
              >
                -
              </Button>
              <span className="text-xs text-gray-600 flex-1 text-center">{product.stock_quantity}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 w-6 p-0" 
                onClick={() => handleStockUpdate(product.stock_quantity + 1)}
                disabled={isUpdating}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Warranty: {product.warranty_months}m</span>
            <span>{new Date(product.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Table Component for List View
interface ProductTableProps {
  products: VendorProduct[];
  selectedProducts: string[];
  onSelectAll: (selected: boolean) => void;
  onSelect: (productId: string, selected: boolean) => void;
  onEdit: (product: VendorProduct) => void;
  onAction: (id: string, action: 'activate' | 'deactivate' | 'delete') => void;
  onQuickUpdate: (id: string, updates: Partial<VendorProduct>) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ 
  products, selectedProducts, onSelectAll, onSelect, onEdit, onAction, onQuickUpdate 
}) => {
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (stock <= 5) return { label: 'Low Stock', color: 'warning' };
    if (stock <= 10) return { label: 'Medium Stock', color: 'default' };
    return { label: 'Good Stock', color: 'success' };
  };

  const getProductDisplayName = (product: VendorProduct) => {
    if (product.model) {
      return `${product.model.brand?.name} ${product.model.model_name}`;
    }
    return product.model?.model_name || 'Product';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox 
              checked={selectedProducts.length === products.length && products.length > 0}
              onCheckedChange={onSelectAll}
            />
          </TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Quality</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-16">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const stockStatus = getStockStatus(product.stock_quantity);
          const productName = getProductDisplayName(product);
          
          return (
            <TableRow key={product.id} className="hover:bg-gray-50">
              <TableCell>
                <Checkbox 
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">{productName}</p>
                  {product.model?.brand && (
                    <p className="text-sm text-gray-600">{product.model.brand.name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{product.category?.name}</TableCell>
              <TableCell>{product.quality_type?.name}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">₹{product.price.toLocaleString()}</p>
                  {product.original_price && product.original_price > product.price && (
                    <p className="text-sm text-gray-500 line-through">₹{product.original_price.toLocaleString()}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={stockStatus.color as any}>
                  {product.stock_quantity}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {new Date(product.updated_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction(product.id, product.is_active ? 'deactivate' : 'activate')}>
                      {product.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {product.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAction(product.id, 'delete')} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

// Quick Edit Dialog Component
interface QuickEditDialogProps {
  product: VendorProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<VendorProduct>) => void;
  categories: Category[];
  qualityTypes: QualityType[];
}

const QuickEditDialog: React.FC<QuickEditDialogProps> = ({ 
  product, open, onOpenChange, onSave, categories, qualityTypes 
}) => {
  const [formData, setFormData] = useState({
    price: product.price.toString(),
    original_price: product.original_price?.toString() || '',
    stock_quantity: product.stock_quantity.toString(),
    warranty_months: product.warranty_months.toString(),
    is_active: product.is_active,
    is_in_stock: product.is_in_stock
  });

  const handleSave = () => {
    const updates: Partial<VendorProduct> = {
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      stock_quantity: parseInt(formData.stock_quantity),
      warranty_months: parseInt(formData.warranty_months),
      is_active: formData.is_active,
      is_in_stock: formData.is_in_stock
    };
    onSave(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Edit Product</DialogTitle>
          <DialogDescription>
            {product.model ? `${product.model.brand?.name} ${product.model.model_name}` : 'Product'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="original_price">Original Price (₹)</Label>
              <Input
                id="original_price"
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="warranty">Warranty (months)</Label>
              <Input
                id="warranty"
                type="number"
                min="0"
                value={formData.warranty_months}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty_months: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="in_stock"
                checked={formData.is_in_stock}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_in_stock: checked }))}
              />
              <Label htmlFor="in_stock">In Stock</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorProductManagement;

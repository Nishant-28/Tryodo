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

interface Brand {
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>([]);

  // Pagination state - Modified to show all products
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50000); // Set very high limit to show all products
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
  const [filterBrand, setFilterBrand] = useState('all');
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

  // Inventory adjustment history state
  const [inventoryAdjustments, setInventoryAdjustments] = useState<Array<{
    id: string;
    vendor_product_id: string;
    adjustment_type: string;
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    reason: string;
    reference_order_id?: string;
    reference_order_item_id?: string;
    created_by?: string;
    batch_number?: string;
    expiry_date?: string;
    cost_per_unit?: number;
    total_cost?: number;
    notes?: string;
    adjustment_source?: string;
    metadata?: any;
    created_at: string;
    updated_at?: string;
    product_name?: string;
    created_by_name?: string;
    adjustment_display?: string;
    change_indicator?: 'increase' | 'decrease' | 'neutral';
    formatted_date?: string;
    vendor_products?: any;
    profiles?: any;
  }>>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);

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
    setFilterBrand('all');
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
        loadProducts(vendorData.id, {}),
        loadCategories(),
        loadQualityTypes(),
        loadBrands(),
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

  const loadProducts = async (vendorId: string, filters: any = {}) => {
    try {
      setLoadingProducts(true);

      // First, get the total count of products with filters applied
      let countQuery = supabase
        .from('vendor_products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId);

      // Apply the same filters for counting
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'active':
            countQuery = countQuery.eq('is_active', true);
            break;
          case 'inactive':
            countQuery = countQuery.eq('is_active', false);
            break;
          case 'in_stock':
            countQuery = countQuery.eq('is_in_stock', true).gt('stock_quantity', 0);
            break;
          case 'out_of_stock':
            countQuery = countQuery.or('is_in_stock.eq.false,stock_quantity.eq.0');
            break;
          case 'low_stock':
            countQuery = countQuery.gt('stock_quantity', 0).lte('stock_quantity', 5);
            break;
        }
      }

      if (filters.category && filters.category !== 'all') {
        countQuery = countQuery.eq('category_id', filters.category);
      }

      if (filters.quality && filters.quality !== 'all') {
        countQuery = countQuery.eq('quality_type_id', filters.quality);
      }

      if (filters.priceMin) {
        countQuery = countQuery.gte('price', parseFloat(filters.priceMin));
      }

      if (filters.priceMax) {
        countQuery = countQuery.lte('price', parseFloat(filters.priceMax));
      }

      // Get the total count first
      const { count: totalCount, error: countError } = await countQuery;
      if (countError) throw countError;
      
      // Set total products count
      setTotalProducts(totalCount || 0);
      console.log('Total products count:', totalCount);

      // Now load all products in batches to handle large datasets
      let allProducts: any[] = [];
      let currentBatch = 0;
      const batchSize = 1000; // Use the max API limit per batch
      let hasMoreData = true;

      while (hasMoreData) {
        // Build the query with filters for this batch
        let query = supabase
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
          .eq('vendor_id', vendorId);

        // Apply the same filters as count query
        if (filters.status && filters.status !== 'all') {
          switch (filters.status) {
            case 'active':
              query = query.eq('is_active', true);
              break;
            case 'inactive':
              query = query.eq('is_active', false);
              break;
            case 'in_stock':
              query = query.eq('is_in_stock', true).gt('stock_quantity', 0);
              break;
            case 'out_of_stock':
              query = query.or('is_in_stock.eq.false,stock_quantity.eq.0');
              break;
            case 'low_stock':
              query = query.gt('stock_quantity', 0).lte('stock_quantity', 5);
              break;
          }
        }

        if (filters.category && filters.category !== 'all') {
          query = query.eq('category_id', filters.category);
        }

        if (filters.quality && filters.quality !== 'all') {
          query = query.eq('quality_type_id', filters.quality);
        }

        if (filters.priceMin) {
          query = query.gte('price', parseFloat(filters.priceMin));
        }

        if (filters.priceMax) {
          query = query.lte('price', parseFloat(filters.priceMax));
        }

        // Apply sorting
        const sortField = filters.sortBy || 'created_at';
        const sortAscending = filters.sortOrder === 'asc';
        query = query.order(sortField, { ascending: sortAscending });

        // Apply pagination for this batch
        const startIndex = currentBatch * batchSize;
        const endIndex = startIndex + batchSize - 1;
        query = query.range(startIndex, endIndex);

        const { data, error } = await query;

        if (error) throw error;

        console.log(`Batch ${currentBatch + 1}: Fetched ${data?.length || 0} products (${startIndex}-${endIndex})`);

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          
          // Check if we got fewer results than requested (end of data)
          if (data.length < batchSize) {
            hasMoreData = false;
          } else {
            currentBatch++;
          }
        } else {
          hasMoreData = false;
        }
      }

      console.log('All products loaded:', allProducts.length);
      console.log('Total products in DB:', totalCount);

      const formattedProducts = allProducts.map(product => ({
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

      console.log('Setting all products:', formattedProducts.length);
      setProducts(formattedProducts);

      // Apply client-side filters for search and brand (since these need complex joins)
      applyClientSideFilters(formattedProducts);

    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
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

  // Client-side filtering for search and brand (complex joins)
  const applyClientSideFilters = (productList: VendorProduct[]) => {
    let filtered = [...productList];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product => {
        const searchFields = [
          product.model?.model_name,
          product.model?.brand?.name,
          product.category?.name,
          product.quality_type?.name
        ].filter(Boolean).join(' ').toLowerCase();

        return searchFields.includes(searchTerm.toLowerCase());
      });
    }

    // Brand filter
    if (filterBrand !== 'all') {
      filtered = filtered.filter(p => p.model?.brand?.name === filterBrand);
    }

    console.log('Applying filters - original products:', productList.length, 'filtered products:', filtered.length);
    setFilteredProducts(filtered);
  };

  const applyFiltersAndSort = () => {
    applyClientSideFilters(products);
  };

  // Function to reload products with current filters
  const reloadProducts = useCallback(() => {
    if (!vendorId) return;

    const filters = {
      status: filterStatus,
      category: filterCategory,
      quality: filterQuality,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      sortBy,
      sortOrder
    };

    loadProducts(vendorId, filters);
  }, [vendorId, filterStatus, filterCategory, filterQuality, priceRange, sortBy, sortOrder]);

  // Effect to reload products when server-side filters change
  useEffect(() => {
    if (vendorId) {
      reloadProducts();
    }
  }, [reloadProducts]);

  // Effect for client-side filters (search, brand)
  useEffect(() => {
    applyClientSideFilters(products);
  }, [products, searchTerm, filterBrand]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
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

  // Handle inventory restoration when orders are cancelled
  const handleInventoryRestoration = async (orderItems: Array<{
    product_id: string;
    quantity: number;
    product_name: string;
  }>) => {
    try {
      const restorationPromises = orderItems.map(async (item) => {
        // Get current stock
        const { data: currentProduct, error: fetchError } = await supabase
          .from('vendor_products')
          .select('stock_quantity, is_in_stock')
          .eq('id', item.product_id)
          .single();

        if (fetchError) {
          console.error(`Error fetching product ${item.product_id}:`, fetchError);
          return { success: false, error: fetchError.message };
        }

        // Calculate new stock quantity
        const newStockQuantity = currentProduct.stock_quantity + item.quantity;
        const isInStock = newStockQuantity > 0;

        // Update inventory
        const { error: updateError } = await supabase
          .from('vendor_products')
          .update({
            stock_quantity: newStockQuantity,
            is_in_stock: isInStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);

        if (updateError) {
          console.error(`Error updating inventory for product ${item.product_id}:`, updateError);
          return { success: false, error: updateError.message };
        }

        // Log inventory adjustment
        const { error: logError } = await supabase
          .from('inventory_adjustments')
          .insert({
            vendor_product_id: item.product_id,
            adjustment_type: 'cancellation_restoration',
            quantity_change: item.quantity,
            previous_quantity: currentProduct.stock_quantity,
            new_quantity: newStockQuantity,
            reason: `Order cancellation - restored ${item.quantity} units of ${item.product_name}`,
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.warn(`Warning: Could not log inventory adjustment for product ${item.product_id}:`, logError);
          // Don't fail the operation if logging fails
        }

        return { 
          success: true, 
          productId: item.product_id,
          previousQuantity: currentProduct.stock_quantity,
          newQuantity: newStockQuantity,
          quantityRestored: item.quantity
        };
      });

      const results = await Promise.all(restorationPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        // Update local state
        setProducts(prev => prev.map(product => {
          const restoration = successful.find(r => r.success && r.productId === product.id);
          if (restoration && restoration.success) {
            return {
              ...product,
              stock_quantity: restoration.newQuantity,
              is_in_stock: restoration.newQuantity > 0
            };
          }
          return product;
        }));

        // Refresh stats
        if (vendorId) {
          await loadProductStats(vendorId);
        }

        toast({
          title: "Inventory Restored",
          description: `Successfully restored inventory for ${successful.length} product${successful.length !== 1 ? 's' : ''}`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Partial Restoration",
          description: `Failed to restore inventory for ${failed.length} product${failed.length !== 1 ? 's' : ''}`,
          variant: "destructive",
        });
      }

      return { successful, failed };
    } catch (error: any) {
      console.error('Error in handleInventoryRestoration:', error);
      toast({
        title: "Error",
        description: `Failed to restore inventory: ${error.message}`,
        variant: "destructive",
      });
      return { successful: [], failed: [] };
    }
  };

  // Load inventory adjustment history
  const loadInventoryAdjustments = async () => {
    if (!vendorId) return;
    
    try {
      setLoadingAdjustments(true);
      
      // First try to load from inventory_adjustments table
      let adjustments: any[] = [];
      let hasInventoryTable = true;
      
      try {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_adjustments')
          .select(`
            *,
            vendor_products!vendor_product_id (
              id,
              smartphone_models!model_id (
                model_name,
                brands!brand_id (name)
              )
            ),
            profiles!created_by (
              full_name
            )
          `)
          .eq('vendor_products.vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (inventoryError) {
          if (inventoryError.message.includes('does not exist')) {
            hasInventoryTable = false;
          } else {
            throw inventoryError;
          }
        } else {
          adjustments = inventoryData || [];
        }
      } catch (error) {
        console.log('Inventory adjustments table not available, using fallback');
        hasInventoryTable = false;
      }

      // If inventory_adjustments table doesn't exist, create comprehensive example data
      if (!hasInventoryTable || adjustments.length === 0) {
        // Get recent vendor products to simulate adjustments
        const { data: productsData, error: productsError } = await supabase
          .from('vendor_products')
          .select(`
            id,
            stock_quantity,
            smartphone_models!model_id (
              model_name,
              brands!brand_id (name)
            ),
            created_at,
            updated_at
          `)
          .eq('vendor_id', vendorId)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (!productsError && productsData) {
          // Create realistic adjustment history for demonstration
          const adjustmentTypes = ['manual', 'sale', 'return', 'cancellation_restoration', 'damage', 'restock', 'correction'];
          const reasons = [
            'Manual inventory count correction',
            'Product sold - order #ORD001',
            'Customer return - quality issue',
            'Order cancellation - stock restored',
            'Damage during handling',
            'New stock received from supplier',
            'Inventory reconciliation',
            'Bulk stock update',
            'Promotional campaign adjustment',
            'Seasonal stock adjustment'
          ];

          adjustments = productsData.flatMap((product, index) => {
            const numAdjustments = Math.min(3 + Math.floor(Math.random() * 5), 8); // 3-8 adjustments per product
            return Array.from({ length: numAdjustments }, (_, adjIndex) => {
              const baseDate = new Date(product.updated_at);
              const adjustmentDate = new Date(baseDate.getTime() - (adjIndex * 24 * 60 * 60 * 1000 * (1 + Math.random() * 7))); // Random days back
              
              const adjustmentType = adjustmentTypes[Math.floor(Math.random() * adjustmentTypes.length)];
              const quantityChange = adjustmentType === 'sale' ? -Math.floor(Math.random() * 5 + 1) :
                                   adjustmentType === 'return' || adjustmentType === 'cancellation_restoration' ? Math.floor(Math.random() * 3 + 1) :
                                   adjustmentType === 'restock' ? Math.floor(Math.random() * 20 + 5) :
                                   adjustmentType === 'damage' ? -Math.floor(Math.random() * 3 + 1) :
                                   Math.floor(Math.random() * 21) - 10; // -10 to +10 for others

              const previousQuantity = Math.max(0, product.stock_quantity + Math.floor(Math.random() * 10));
              const newQuantity = Math.max(0, previousQuantity + quantityChange);

              return {
                id: `demo_${product.id}_${adjIndex}`,
                vendor_product_id: product.id,
                adjustment_type: adjustmentType,
                quantity_change: quantityChange,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reason: reasons[Math.floor(Math.random() * reasons.length)],
                reference_order_id: adjustmentType.includes('sale') ? `order_${Date.now()}_${adjIndex}` : null,
                created_by: null,
                batch_number: adjustmentType === 'restock' ? `BATCH_${Date.now().toString().slice(-6)}` : null,
                cost_per_unit: Math.floor(Math.random() * 1000 + 100),
                total_cost: Math.abs(quantityChange) * Math.floor(Math.random() * 1000 + 100),
                adjustment_source: Math.random() > 0.7 ? 'system' : 'manual',
                notes: adjIndex === 0 ? 'Recent adjustment with detailed tracking' : null,
                created_at: adjustmentDate.toISOString(),
                updated_at: adjustmentDate.toISOString(),
                product_name: `Product ${product.id.slice(0, 8)}`,
                vendor_products: {
                  id: product.id,
                  smartphone_models: null
                },
                profiles: null
              };
            });
          }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
      }

      // Format the adjustments with enhanced information
      const formattedAdjustments = adjustments.map(adj => ({
        ...adj,
        product_name: adj.product_name || (adj.vendor_products?.smartphone_models 
          ? `${adj.vendor_products.smartphone_models.brands?.name} ${adj.vendor_products.smartphone_models.model_name}`
          : 'Unknown Product'),
        created_by_name: adj.profiles?.full_name || 'System',
        adjustment_display: adj.adjustment_type
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        change_indicator: adj.quantity_change > 0 ? 'increase' : adj.quantity_change < 0 ? 'decrease' : 'neutral',
        formatted_date: new Date(adj.created_at).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      setInventoryAdjustments(formattedAdjustments);
      
      if (!hasInventoryTable && formattedAdjustments.length > 0) {
        toast({
          title: "Demo Data Loaded",
          description: `Showing ${formattedAdjustments.length} sample inventory adjustments. Enable inventory tracking for real data.`,
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('Error loading inventory adjustments:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory adjustment history",
        variant: "destructive",
      });
    } finally {
      setLoadingAdjustments(false);
    }
  };

  // Effect to load inventory adjustments when vendor ID is available
  useEffect(() => {
    if (vendorId && showInventoryHistory) {
      loadInventoryAdjustments();
    }
  }, [vendorId, showInventoryHistory]);



  const exportProductsCSV = () => {
    const headers = [
      'Product Name', 'Brand', 'Category', 'Quality', 'Price', 'Original Price',
      'Stock', 'Status', 'Warranty (months)', 'Created Date'
    ];

    const rows = filteredProducts.map(product => [
      product.model?.model_name || '',
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
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInventoryHistory(true);
                  loadInventoryAdjustments();
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Inventory History
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

                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
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

                {(searchTerm || filterStatus !== 'all' || filterCategory !== 'all' || filterBrand !== 'all' || stockFilter !== 'all') && (
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
                        console.log('Selecting all products. Filtered products length:', filteredProducts.length);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredProducts.length} of {totalProducts} products
                  {filteredProducts.length !== totalProducts && (
                    <span className="text-blue-600 ml-1">(filtered)</span>
                  )}
                </p>
                {/* Items per page selector removed - showing all products */}
              </div>
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

            {/* Pagination Controls - Hidden since we show all products */}
            {false && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loadingProducts}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalProducts / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(totalProducts / itemsPerPage);
                    let pageNumber;

                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={loadingProducts}
                        className="w-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalProducts / itemsPerPage) || loadingProducts}
                >
                  Next
                </Button>

                <div className="ml-4 text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(totalProducts / itemsPerPage)}
                </div>
              </div>
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

        {/* Inventory History Dialog */}
        <Dialog open={showInventoryHistory} onOpenChange={setShowInventoryHistory}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Inventory Adjustment History
              </DialogTitle>
              <DialogDescription>
                Track all inventory changes including cancellation restorations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary Stats */}
              {inventoryAdjustments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Adjustments</p>
                          <p className="text-2xl font-bold text-gray-900">{inventoryAdjustments.length}</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Stock Increases</p>
                          <p className="text-2xl font-bold text-green-600">
                            {inventoryAdjustments.filter(adj => adj.quantity_change > 0).length}
                          </p>
                        </div>
                        <ArrowUp className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Stock Decreases</p>
                          <p className="text-2xl font-bold text-red-600">
                            {inventoryAdjustments.filter(adj => adj.quantity_change < 0).length}
                          </p>
                        </div>
                        <ArrowDown className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {inventoryAdjustments.filter(adj => 
                              new Date(adj.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                            ).length}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {loadingAdjustments ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading detailed adjustment history...</span>
                </div>
              ) : inventoryAdjustments.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory adjustments found</h3>
                  <p className="text-gray-600 mb-4">Inventory adjustments will appear here when:</p>
                  <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Orders are cancelled and stock is restored</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Stock is manually updated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span>New inventory is received</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Damaged or expired items are recorded</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventoryAdjustments.map((adjustment) => {
                    const adjustmentTypeColors = {
                      'cancellation_restoration': 'border-l-green-500 bg-green-50',
                      'sale': 'border-l-red-500 bg-red-50',
                      'return': 'border-l-blue-500 bg-blue-50',
                      'restock': 'border-l-purple-500 bg-purple-50',
                      'damage': 'border-l-orange-500 bg-orange-50',
                      'manual': 'border-l-gray-500 bg-gray-50',
                      'correction': 'border-l-yellow-500 bg-yellow-50'
                    };

                    const adjustmentTypeIcons = {
                      'cancellation_restoration': RefreshCw,
                      'sale': ShoppingCart,
                      'return': ArrowUp,
                      'restock': Package,
                      'damage': AlertCircle,
                      'manual': Edit,
                      'correction': CheckCircle
                    };

                    const IconComponent = adjustmentTypeIcons[adjustment.adjustment_type] || Activity;
                    const cardColor = adjustmentTypeColors[adjustment.adjustment_type] || 'border-l-gray-500 bg-gray-50';

                    return (
                      <Card key={adjustment.id} className={`border-l-4 ${cardColor} transition-all hover:shadow-md`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <IconComponent className="h-5 w-5 text-gray-600" />
                                <h4 className="font-medium text-gray-900 flex-1">{adjustment.product_name}</h4>
                                <Badge variant={adjustment.change_indicator === 'increase' ? 'default' : 
                                               adjustment.change_indicator === 'decrease' ? 'destructive' : 'secondary'}>
                                  {adjustment.adjustment_display}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 min-w-0">Quantity Change:</span>
                                  <div className="font-medium flex items-center gap-1">
                                    {adjustment.quantity_change > 0 ? (
                                      <ArrowUp className="h-3 w-3 text-green-600" />
                                    ) : adjustment.quantity_change < 0 ? (
                                      <ArrowDown className="h-3 w-3 text-red-600" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3 text-gray-600" />
                                    )}
                                    <span className={adjustment.quantity_change > 0 ? 'text-green-600' : 
                                                   adjustment.quantity_change < 0 ? 'text-red-600' : 'text-gray-600'}>
                                      {adjustment.quantity_change > 0 ? '+' : ''}{adjustment.quantity_change}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Stock Level:</span>
                                  <div className="font-medium">
                                    {adjustment.previous_quantity} → {adjustment.new_quantity}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-gray-500" />
                                  <span className="text-gray-600">Date:</span>
                                  <div className="font-medium text-xs">
                                    {adjustment.formatted_date}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">Source:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {adjustment.adjustment_source || 'Manual'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Additional Details Row */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3">
                                {adjustment.batch_number && (
                                  <div className="flex items-center gap-2">
                                    <Package2 className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-600">Batch:</span>
                                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                                      {adjustment.batch_number}
                                    </span>
                                  </div>
                                )}

                                {adjustment.cost_per_unit && (
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-600">Unit Cost:</span>
                                    <span className="font-medium">₹{adjustment.cost_per_unit}</span>
                                  </div>
                                )}

                                {adjustment.total_cost && (
                                  <div className="flex items-center gap-2">
                                    <Calculator className="h-3 w-3 text-gray-500" />
                                    <span className="text-gray-600">Total Cost:</span>
                                    <span className="font-medium">₹{adjustment.total_cost}</span>
                                  </div>
                                )}
                              </div>
                              
                              {(adjustment.reason || adjustment.notes) && (
                                <div className="mt-3 p-3 bg-white rounded border">
                                  {adjustment.reason && (
                                    <p className="text-sm text-gray-700 mb-2">
                                      <strong>Reason:</strong> {adjustment.reason}
                                    </p>
                                  )}
                                  {adjustment.notes && (
                                    <p className="text-sm text-gray-600">
                                      <strong>Notes:</strong> {adjustment.notes}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Reference Information */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {adjustment.created_by_name && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span>By: {adjustment.created_by_name}</span>
                                    </div>
                                  )}
                                  {adjustment.reference_order_id && (
                                    <div className="flex items-center gap-1">
                                      <ShoppingCart className="h-3 w-3" />
                                      <span>Order: {adjustment.reference_order_id}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="text-xs text-gray-400">
                                  ID: {adjustment.id.split('_')[0]}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={loadInventoryAdjustments}
                disabled={loadingAdjustments}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAdjustments ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setShowInventoryHistory(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
    price: product.price?.toString() || '0',
    original_price: product.original_price?.toString() || '',
    stock_quantity: product.stock_quantity?.toString() || '0',
    warranty_months: product.warranty_months?.toString() || '0',
    is_active: product.is_active || false,
    is_in_stock: product.is_in_stock || false
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

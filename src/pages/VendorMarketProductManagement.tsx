import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, Edit, Eye, EyeOff, Plus, Minus, DollarSign, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface VendorMarketProduct {
  id: string;
  vendor_id: string;
  market_product_id: string;
  price: number;
  original_price?: number;
  discount_percentage: number;
  stock_quantity: number;
  is_in_stock: boolean;
  low_stock_threshold: number;
  delivery_time_hours: number;
  min_order_quantity: number;
  max_order_quantity?: number;
  vendor_notes?: string;
  is_active: boolean;
  featured: boolean;
  last_stock_update?: string;
  created_at: string;
  updated_at: string;
  market_product?: {
    name: string;
    slug: string;
    images: string[];
    category?: {
      name: string;
    };
    brand?: {
      name: string;
    };
  };
  sales_count?: number;
  revenue?: number;
}

interface EditForm {
  price: string;
  original_price: string;
  stock_quantity: string;
  delivery_time_hours: string;
  min_order_quantity: string;
  max_order_quantity: string;
  vendor_notes: string;
  low_stock_threshold: string;
}

const VendorMarketProductManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  // State management
  const [products, setProducts] = useState<VendorMarketProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<VendorMarketProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit modal state
  const [editingProduct, setEditingProduct] = useState<VendorMarketProduct | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    price: '',
    original_price: '',
    stock_quantity: '',
    delivery_time_hours: '',
    min_order_quantity: '',
    max_order_quantity: '',
    vendor_notes: '',
    low_stock_threshold: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Load data on component mount
  useEffect(() => {
    if (profile?.id) {
      loadProducts();
    }
  }, [profile?.id]);

  // Filter products when search term changes
  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]); 
 const loadProducts = async () => {
    if (!profile?.id) {
      console.log('VendorMarketProductManagement: Profile not loaded yet, skipping data load');
      return;
    }

    try {
      setLoading(true);
      setInitialLoading(true);

      console.log('VendorMarketProductManagement: Loading data for user:', profile?.id);

      // Get current vendor with better error handling
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      console.log('VendorMarketProductManagement: Vendor query result:', { vendorData, vendorError });

      if (vendorError) {
        console.error('VendorMarketProductManagement: Error fetching vendor:', vendorError);
        
        // Try to create a vendor record if it doesn't exist
        if (vendorError.code === 'PGRST116') {
          console.log('VendorMarketProductManagement: No vendor record found, attempting to create one...');
          
          // Get profile information
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', profile?.id)
            .single();

          if (profileError) {
            console.error('VendorMarketProductManagement: Error fetching profile:', profileError);
            toast({
              title: "Error",
              description: "Unable to load vendor profile. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          // Create vendor record
          const newVendorData = {
            profile_id: profile?.id,
            business_name: profileData.full_name ? `${profileData.full_name}'s Business` : 'Business',
            business_email: profileData.email,
            rating: 0,
            total_reviews: 0,
            total_sales: 0,
            is_verified: false,
            is_active: true,
            auto_approve_orders: false,
            order_confirmation_timeout_minutes: 15,
            auto_approve_under_amount: null,
            business_hours_start: '09:00:00',
            business_hours_end: '18:00:00',
            auto_approve_during_business_hours_only: true
          };

          const { data: newVendor, error: createError } = await supabase
            .from('vendors')
            .insert(newVendorData)
            .select('*')
            .single();

          if (createError) {
            console.error('VendorMarketProductManagement: Error creating vendor record:', createError);
            toast({
              title: "Error",
              description: "Unable to create vendor profile. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          console.log('VendorMarketProductManagement: Created new vendor record:', newVendor);
          // Use the new vendor for loading products
          await loadVendorProducts(newVendor.id);
          return;
        } else {
          toast({
            title: "Error",
            description: `Unable to load vendor data: ${vendorError.message}`,
            variant: "destructive",
          });
          return;
        }
      } else if (!vendorData) {
        console.error('VendorMarketProductManagement: No vendor data returned');
        toast({
          title: "Error",
          description: "Vendor profile not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Load vendor's marketplace products
      await loadVendorProducts(vendorData.id);
    } catch (error) {
      console.error('VendorMarketProductManagement: Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load your marketplace products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadVendorProducts = async (vendorId: string) => {
    try {
      const { data: productsData, error } = await supabase
        .from('market_vendor_products')
        .select(`
          *,
          market_product:market_products(
            name,
            slug,
            images,
            category:market_categories(name),
            brand:market_brands(name)
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Error",
          description: "Failed to load your marketplace products. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // TODO: Add sales data when order system is integrated
      const productsWithSales = (productsData || []).map(product => ({
        ...product,
        sales_count: 0, // Placeholder
        revenue: 0 // Placeholder
      }));

      setProducts(productsWithSales);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "Failed to load your marketplace products. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filterProducts = () => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.market_product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.market_product?.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.market_product?.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleToggleStatus = async (product: VendorMarketProduct) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('market_vendor_products')
        .update({ 
          is_active: !product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) {
        console.error('Error toggling product status:', error);
        toast({
          title: "Error",
          description: "Failed to update product status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Product ${!product.is_active ? 'activated' : 'deactivated'} successfully.`,
      });

      // Reload products
      loadProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: "Failed to update product status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async (product: VendorMarketProduct) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('market_vendor_products')
        .update({ 
          featured: !product.featured,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) {
        console.error('Error toggling featured status:', error);
        toast({
          title: "Error",
          description: "Failed to update featured status. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Product ${!product.featured ? 'marked as featured' : 'removed from featured'}.`,
      });

      // Reload products
      loadProducts();
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: "Error",
        description: "Failed to update featured status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product: VendorMarketProduct) => {
    setEditingProduct(product);
    setEditForm({
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      stock_quantity: product.stock_quantity.toString(),
      delivery_time_hours: product.delivery_time_hours.toString(),
      min_order_quantity: product.min_order_quantity.toString(),
      max_order_quantity: product.max_order_quantity?.toString() || '',
      vendor_notes: product.vendor_notes || '',
      low_stock_threshold: product.low_stock_threshold.toString()
    });
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    // Validation
    const price = parseFloat(editForm.price);
    const originalPrice = editForm.original_price ? parseFloat(editForm.original_price) : null;
    const stockQuantity = parseInt(editForm.stock_quantity);
    const deliveryTime = parseInt(editForm.delivery_time_hours);
    const minOrderQty = parseInt(editForm.min_order_quantity);
    const maxOrderQty = editForm.max_order_quantity ? parseInt(editForm.max_order_quantity) : null;
    const lowStockThreshold = parseInt(editForm.low_stock_threshold);

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (originalPrice && originalPrice < price) {
      toast({
        title: "Validation Error",
        description: "Original price must be greater than or equal to selling price.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(stockQuantity) || stockQuantity < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid stock quantity (0 or greater).",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(deliveryTime) || deliveryTime <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid delivery time greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(minOrderQty) || minOrderQty <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid minimum order quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (maxOrderQty && maxOrderQty < minOrderQty) {
      toast({
        title: "Validation Error",
        description: "Maximum order quantity must be greater than or equal to minimum order quantity.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingEdit(true);

      const discountPercentage = originalPrice && originalPrice > price 
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

      const updateData = {
        price,
        original_price: originalPrice,
        discount_percentage: discountPercentage,
        stock_quantity: stockQuantity,
        is_in_stock: stockQuantity > 0,
        delivery_time_hours: deliveryTime,
        min_order_quantity: minOrderQty,
        max_order_quantity: maxOrderQty,
        vendor_notes: editForm.vendor_notes.trim() || null,
        low_stock_threshold: lowStockThreshold,
        last_stock_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('market_vendor_products')
        .update(updateData)
        .eq('id', editingProduct.id);

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: "Failed to update product. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product updated successfully.",
      });

      // Reset modal and reload products
      setEditingProduct(null);
      loadProducts();

    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const quickStockUpdate = async (product: VendorMarketProduct, change: number) => {
    const newQuantity = Math.max(0, product.stock_quantity + change);
    
    try {
      setLoading(true);

      const { error } = await supabase
        .from('market_vendor_products')
        .update({ 
          stock_quantity: newQuantity,
          is_in_stock: newQuantity > 0,
          last_stock_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) {
        console.error('Error updating stock:', error);
        toast({
          title: "Error",
          description: "Failed to update stock. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Reload products
      loadProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }; 
 if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your marketplace products...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Button
              variant="ghost"
              onClick={() => navigate('/vendor-dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Marketplace Products</h1>
              <p className="text-gray-600 mt-1">Manage your approved marketplace product listings</p>
            </div>
          </div>

          <Button
            onClick={loadProducts}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search your products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {products.filter(p => p.is_active).length}
                  </p>
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
                  <p className="text-2xl font-bold text-orange-600">
                    {products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {products.filter(p => p.stock_quantity === 0).length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div className="space-y-6">
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No products found' : 'No marketplace products yet'}
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  {searchTerm 
                    ? 'No products match your search criteria.' 
                    : 'You don\'t have any approved marketplace products yet. Submit requests to start selling.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => navigate('/vendor/market-products')}>
                    Browse Marketplace Products
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {product.market_product?.images?.[0] && (
                        <img 
                          src={product.market_product.images[0]} 
                          alt={product.market_product.name}
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{product.market_product?.name}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant={product.is_active ? "default" : "secondary"}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {product.featured && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Featured
                              </Badge>
                            )}
                            {product.stock_quantity === 0 && (
                              <Badge variant="destructive">Out of Stock</Badge>
                            )}
                            {product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Category:</strong> {product.market_product?.category?.name}</p>
                          <p><strong>Brand:</strong> {product.market_product?.brand?.name}</p>
                          <p><strong>Price:</strong> ₹{product.price} 
                            {product.original_price && product.original_price > product.price && (
                              <span className="ml-2 text-gray-500 line-through">₹{product.original_price}</span>
                            )}
                            {product.discount_percentage > 0 && (
                              <span className="ml-2 text-green-600">({product.discount_percentage}% off)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => openEditModal(product)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        onClick={() => handleToggleStatus(product)}
                        size="sm"
                        variant="outline"
                        disabled={loading}
                      >
                        {product.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Stock</p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => quickStockUpdate(product, -1)}
                          disabled={loading || product.stock_quantity === 0}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium min-w-[3rem] text-center">{product.stock_quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => quickStockUpdate(product, 1)}
                          disabled={loading}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Time</p>
                      <p className="font-medium">{product.delivery_time_hours}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Min Order</p>
                      <p className="font-medium">{product.min_order_quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sales</p>
                      <p className="font-medium">{product.sales_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleFeatured(product)}
                        disabled={loading}
                      >
                        {product.featured ? 'Remove Featured' : 'Mark Featured'}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(product.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  {product.vendor_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-1">Your Notes:</p>
                      <p className="text-sm text-gray-600">{product.vendor_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>        {/*
 Edit Product Modal */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product Details</DialogTitle>
              <DialogDescription>
                Update pricing, inventory, and delivery information for {editingProduct?.market_product?.name}
              </DialogDescription>
            </DialogHeader>
            
            {editingProduct && (
              <div className="space-y-6">
                {/* Pricing Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-gray-900">Pricing</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_price">Selling Price (₹) *</Label>
                      <Input
                        id="edit_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="Enter selling price"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_original_price">Original Price (₹)</Label>
                      <Input
                        id="edit_original_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.original_price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, original_price: e.target.value }))}
                        placeholder="Enter original price (optional)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For showing discounts. Must be higher than selling price.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inventory Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Inventory</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_stock_quantity">Stock Quantity *</Label>
                      <Input
                        id="edit_stock_quantity"
                        type="number"
                        min="0"
                        value={editForm.stock_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        placeholder="Enter stock quantity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_low_stock_threshold">Low Stock Alert</Label>
                      <Input
                        id="edit_low_stock_threshold"
                        type="number"
                        min="0"
                        value={editForm.low_stock_threshold}
                        onChange={(e) => setEditForm(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                        placeholder="Alert when stock is below"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Order Settings</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit_delivery_time">Delivery Time (Hours) *</Label>
                      <Input
                        id="edit_delivery_time"
                        type="number"
                        min="1"
                        value={editForm.delivery_time_hours}
                        onChange={(e) => setEditForm(prev => ({ ...prev, delivery_time_hours: e.target.value }))}
                        placeholder="Hours"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_min_order">Min Order Qty *</Label>
                      <Input
                        id="edit_min_order"
                        type="number"
                        min="1"
                        value={editForm.min_order_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, min_order_quantity: e.target.value }))}
                        placeholder="Minimum"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_max_order">Max Order Qty</Label>
                      <Input
                        id="edit_max_order"
                        type="number"
                        min="1"
                        value={editForm.max_order_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, max_order_quantity: e.target.value }))}
                        placeholder="Maximum (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Additional Information</h4>
                  
                  <div>
                    <Label htmlFor="edit_vendor_notes">Vendor Notes</Label>
                    <Textarea
                      id="edit_vendor_notes"
                      value={editForm.vendor_notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, vendor_notes: e.target.value }))}
                      placeholder="Any special notes, terms, or conditions for this product"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Current vs New Comparison */}
                {editForm.price && parseFloat(editForm.price) !== editingProduct.price && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Price change: ₹{editingProduct.price} → ₹{editForm.price}
                      {parseFloat(editForm.price) > editingProduct.price ? ' (Increase)' : ' (Decrease)'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingProduct(null)}
                disabled={submittingEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditProduct}
                disabled={submittingEdit}
              >
                {submittingEdit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VendorMarketProductManagement;
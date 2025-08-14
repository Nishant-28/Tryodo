import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, Filter, Eye, ShoppingCart, Users, Clock, Star, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import MarketplaceStockManager from '@/components/MarketplaceStockManager';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface MarketProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  specifications: Record<string, any>;
  category_id: string;
  brand_id: string;
  base_unit?: string;
  weight?: number;
  dimensions?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  category?: {
    name: string;
  };
  brand?: {
    name: string;
  };
  vendor_count?: number;
  min_price?: number;
  max_price?: number;
  avg_delivery_hours?: number;
  has_my_request?: boolean;
  my_request_status?: string;
}

interface MarketCategory {
  id: string;
  name: string;
}

interface MarketBrand {
  id: string;
  name: string;
}

const VendorMarketProducts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  // State management
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<MarketProduct[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [brands, setBrands] = useState<MarketBrand[]>([]);
  const [vendor, setVendor] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Load data on component mount
  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  // Filter products when filters change
  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedBrand, sortBy]);

  const loadData = async () => {
    if (!profile?.id) {
      console.log('VendorMarketProducts: Profile not loaded yet, skipping data load');
      return;
    }

    console.log('VendorMarketProducts: Profile loaded:', profile);
    console.log('VendorMarketProducts: Profile role:', profile.role);

    if (profile.role !== 'vendor') {
      console.error('VendorMarketProducts: User is not a vendor, role:', profile.role);
      toast({
        title: "Access Denied",
        description: "You need vendor privileges to access this page.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setInitialLoading(true);

      console.log('VendorMarketProducts: Loading data for vendor profile:', profile?.id);

      // Get current vendor with better error handling
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      console.log('VendorMarketProducts: Vendor query result:', { vendorData, vendorError });

      if (vendorError) {
        console.error('VendorMarketProducts: Error fetching vendor:', vendorError);
        
        // Try to create a vendor record if it doesn't exist
        if (vendorError.code === 'PGRST116') {
          console.log('VendorMarketProducts: No vendor record found, attempting to create one...');
          
          // Get profile information
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', profile?.id)
            .single();

          if (profileError) {
            console.error('VendorMarketProducts: Error fetching profile:', profileError);
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
            console.error('VendorMarketProducts: Error creating vendor record:', createError);
            toast({
              title: "Error",
              description: "Unable to create vendor profile. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          console.log('VendorMarketProducts: Created new vendor record:', newVendor);
          setVendor(newVendor);
        } else {
          toast({
            title: "Error",
            description: `Unable to load vendor data: ${vendorError.message}`,
            variant: "destructive",
          });
          return;
        }
      } else if (!vendorData) {
        console.error('VendorMarketProducts: No vendor data returned');
        toast({
          title: "Error",
          description: "Vendor profile not found. Please contact support.",
          variant: "destructive",
        });
        return;
      } else {
        console.log('VendorMarketProducts: Setting vendor data:', vendorData);
        setVendor(vendorData);
      }

      // Load categories, brands, and products in parallel
      const [categoriesResult, brandsResult, productsResult] = await Promise.all([
        supabase
          .from('market_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('market_brands')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('market_products')
          .select(`
            *,
            category:market_categories(name),
            brand:market_brands(name)
          `)
          .eq('is_active', true)
          .order('name')
      ]);

      if (categoriesResult.error) {
        console.error('Error loading categories:', categoriesResult.error);
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (brandsResult.error) {
        console.error('Error loading brands:', brandsResult.error);
        toast({
          title: "Error",
          description: "Failed to load brands. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (productsResult.error) {
        console.error('Error loading products:', productsResult.error);
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCategories(categoriesResult.data || []);
      setBrands(brandsResult.data || []);

      // Get additional data for each product
      const productsWithData = await Promise.all(
        (productsResult.data || []).map(async (product) => {
          // Count active vendors
          const { count: vendorCount } = await supabase
            .from('market_vendor_products')
            .select('*', { count: 'exact', head: true })
            .eq('market_product_id', product.id)
            .eq('is_active', true);

          // Get price range
          const { data: priceData } = await supabase
            .from('market_vendor_products')
            .select('price')
            .eq('market_product_id', product.id)
            .eq('is_active', true);

          const prices = priceData?.map(p => p.price) || [];
          const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;

          // Get average delivery time
          const { data: deliveryData } = await supabase
            .from('market_vendor_products')
            .select('delivery_time_hours')
            .eq('market_product_id', product.id)
            .eq('is_active', true);

          const deliveryTimes = deliveryData?.map(d => d.delivery_time_hours) || [];
          const avgDeliveryHours = deliveryTimes.length > 0 
            ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
            : undefined;

          // Check if current vendor has a request for this product
          const { data: requestData } = await supabase
            .from('market_vendor_product_requests')
            .select('status')
            .eq('vendor_id', vendorData.id)
            .eq('market_product_id', product.id)
            .single();

          return {
            ...product,
            vendor_count: vendorCount || 0,
            min_price: minPrice,
            max_price: maxPrice,
            avg_delivery_hours: avgDeliveryHours,
            has_my_request: !!requestData,
            my_request_status: requestData?.status
          };
        })
      );

      setProducts(productsWithData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Brand filter
    if (selectedBrand && selectedBrand !== 'all') {
      filtered = filtered.filter(product => product.brand_id === selectedBrand);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'vendor_count':
          return (b.vendor_count || 0) - (a.vendor_count || 0);
        case 'min_price':
          return (a.min_price || 0) - (b.min_price || 0);
        case 'delivery_time':
          return (a.avg_delivery_hours || 0) - (b.avg_delivery_hours || 0);
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleRequestProduct = (productId: string) => {
    navigate(`/vendor/market-products/request/${productId}`);
  };

  const getRequestStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
      revision_requested: { variant: 'outline' as const, label: 'Revision Needed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading marketplace products...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Marketplace Products</h1>
              <p className="text-gray-600 mt-1">Browse products and manage your inventory</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse Products
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Stock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="vendor_count">Vendor Count</SelectItem>
                  <SelectItem value="min_price">Price (Low to High)</SelectItem>
                  <SelectItem value="delivery_time">Delivery Time</SelectItem>
                </SelectContent>
              </Select>
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
                  <p className="text-sm text-gray-600">My Requests</p>
                  <p className="text-2xl font-bold">{products.filter(p => p.has_my_request).length}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{products.filter(p => !p.has_my_request).length}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold">{products.filter(p => p.my_request_status === 'approved').length}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="grid gap-6">
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 text-center">
                  {searchTerm || selectedCategory || selectedBrand 
                    ? 'No products match your current filters.' 
                    : 'No products are currently available in the marketplace.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {product.images.length > 0 && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{product.name}</CardTitle>
                          {product.has_my_request && getRequestStatusBadge(product.my_request_status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <p><strong>Category:</strong> {product.category?.name}</p>
                          <p><strong>Brand:</strong> {product.brand?.name}</p>
                          {product.description && (
                            <p><strong>Description:</strong> {product.description.substring(0, 150)}...</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Vendors
                            </p>
                            <p className="font-medium">{product.vendor_count}</p>
                          </div>
                          {product.min_price && (
                            <div>
                              <p className="text-gray-600">Price Range</p>
                              <p className="font-medium">
                                ₹{product.min_price}
                                {product.max_price && product.max_price !== product.min_price && ` - ₹${product.max_price}`}
                              </p>
                            </div>
                          )}
                          {product.avg_delivery_hours && (
                            <div>
                              <p className="text-gray-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Avg Delivery
                              </p>
                              <p className="font-medium">{product.avg_delivery_hours}h</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-600">Competition</p>
                            <p className="font-medium">
                              {product.vendor_count === 0 ? 'None' : 
                               product.vendor_count === 1 ? 'Low' :
                               product.vendor_count <= 3 ? 'Medium' : 'High'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleRequestProduct(product.id)}
                        disabled={product.has_my_request}
                        size="sm"
                      >
                        {product.has_my_request ? 'Already Requested' : 'Request to Sell'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/vendor/market-products/view/${product.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {Object.keys(product.specifications).length > 0 && (
                  <CardContent>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Specifications:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <strong>{key}:</strong> {value}
                          </div>
                        ))}
                        {Object.keys(product.specifications).length > 4 && (
                          <div className="text-sm text-gray-500 col-span-full">
                            +{Object.keys(product.specifications).length - 4} more specifications
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-6">
            {vendor && (
              <MarketplaceStockManager 
                vendorId={vendor.id}
                onStockUpdate={loadData}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VendorMarketProducts;
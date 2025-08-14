import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Package, MapPin, Heart, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

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
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  brand?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    description?: string;
    website_url?: string;
  };
}

interface MarketVendorProduct {
  id: string;
  vendor_id: string;
  price: number;
  original_price?: number;
  discount_percentage: number;
  stock_quantity: number;
  is_in_stock: boolean;
  delivery_time_hours: number;
  min_order_quantity: number;
  max_order_quantity?: number;
  vendor_notes?: string;
  is_active: boolean;
  featured: boolean;
  vendor?: {
    id: string;
    business_name: string;
    rating?: number;
    total_orders?: number;
  };
}

// Similar Products Component
interface SimilarProductsSectionProps {
  currentProduct: MarketProduct | null;
  currentVendorProducts: MarketVendorProduct[];
}

const SimilarProductsSection: React.FC<SimilarProductsSectionProps> = ({ 
  currentProduct, 
  currentVendorProducts 
}) => {
  const [similarProducts, setSimilarProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentProduct) {
      loadSimilarProducts();
    }
  }, [currentProduct]);

  const loadSimilarProducts = async () => {
    if (!currentProduct) return;

    try {
      setLoading(true);

      // Strategy 1: Products from same category and brand (highest relevance)
      let query = supabase
        .from('market_products')
        .select(`
          *,
          category:market_categories(id, name, slug),
          brand:market_brands(id, name, slug, logo_url)
        `)
        .eq('category_id', currentProduct.category_id)
        .eq('brand_id', currentProduct.brand_id)
        .eq('is_active', true)
        .neq('id', currentProduct.id)
        .limit(6);

      let { data: categoryBrandProducts } = await query;

      // Strategy 2: If not enough from same brand, get from same category
      let allSimilarProducts = categoryBrandProducts || [];
      
      if (allSimilarProducts.length < 4) {
        const { data: categoryProducts } = await supabase
          .from('market_products')
          .select(`
            *,
            category:market_categories(id, name, slug),
            brand:market_brands(id, name, slug, logo_url)
          `)
          .eq('category_id', currentProduct.category_id)
          .eq('is_active', true)
          .neq('id', currentProduct.id)
          .neq('brand_id', currentProduct.brand_id)
          .limit(6);

        if (categoryProducts) {
          allSimilarProducts = [...allSimilarProducts, ...categoryProducts];
        }
      }

      // Strategy 3: If still not enough, get from related categories based on specifications
      if (allSimilarProducts.length < 4 && currentProduct.specifications) {
        const specKeys = Object.keys(currentProduct.specifications);
        
        if (specKeys.length > 0) {
          // Use JSONB operator to find products with similar specifications
          const { data: specBasedProducts } = await supabase
            .from('market_products')
            .select(`
              *,
              category:market_categories(id, name, slug),
              brand:market_brands(id, name, slug, logo_url)
            `)
            .eq('is_active', true)
            .neq('id', currentProduct.id)
            .neq('category_id', currentProduct.category_id)
            .limit(4);

          if (specBasedProducts) {
            // Filter products that have similar specifications
            const filteredSpecProducts = specBasedProducts.filter(product => {
              if (!product.specifications) return false;
              const matchingSpecs = specKeys.filter(key => 
                product.specifications[key] && 
                String(product.specifications[key]).toLowerCase() === 
                String(currentProduct.specifications[key]).toLowerCase()
              );
              return matchingSpecs.length >= Math.ceil(specKeys.length * 0.3); // 30% similarity
            });

            allSimilarProducts = [...allSimilarProducts, ...filteredSpecProducts];
          }
        }
      }

      // Remove duplicates and limit to 8 products
      const uniqueProducts = allSimilarProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      ).slice(0, 8);

      setSimilarProducts(uniqueProducts);

    } catch (error) {
      console.error('Error loading similar products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProduct || loading) {
    return (
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Similar Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (similarProducts.length === 0) {
    return null; // Don't show the section if no similar products
  }

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Similar Products
          </CardTitle>
          <CardDescription>
            You might also be interested in these products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {similarProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/market/product/${product.slug}`)}
                className="group cursor-pointer border rounded-lg p-3 hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-1">
                  <h4 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h4>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    {product.brand?.logo_url && (
                      <img
                        src={product.brand.logo_url}
                        alt={product.brand.name}
                        className="w-4 h-4 object-contain"
                      />
                    )}
                    <span>{product.brand?.name}</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {product.category?.name}
                  </div>

                  {/* Quick comparison with current product */}
                  {currentProduct.category_id === product.category_id && (
                    <Badge variant="secondary" className="text-xs">
                      Same Category
                    </Badge>
                  )}
                  {currentProduct.brand_id === product.brand_id && (
                    <Badge variant="outline" className="text-xs">
                      Same Brand
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {similarProducts.length >= 8 && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => navigate(`/market?category=${currentProduct.category?.slug}`)}
                className="text-sm"
              >
                View More in {currentProduct.category?.name}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MarketProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  
  // State management
  const [product, setProduct] = useState<MarketProduct | null>(null);
  const [vendorProducts, setVendorProducts] = useState<MarketVendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProductData();
    }
  }, [slug]);

  // Set SEO metadata when product loads
  useEffect(() => {
    if (product) {
      document.title = product.meta_title || `${product.name} - Marketplace`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', product.meta_description || product.description || '');
      }
      
      // Update meta keywords
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords && product.keywords) {
        metaKeywords.setAttribute('content', product.keywords);
      }
    }
  }, [product]);

  const loadProductData = async () => {
    try {
      setLoading(true);

      if (!slug) {
        toast({
          title: "Error",
          description: "Product identifier is missing.",
          variant: "destructive",
        });
        return;
      }

      // Load product details - try by slug first, then by ID if slug fails
      let productData = null;
      let productError = null;

      // First, try to find by slug
      const slugResult = await supabase
        .from('market_products')
        .select(`
          *,
          category:market_categories(id, name, slug),
          brand:market_brands(id, name, slug, logo_url, description, website_url)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (slugResult.data) {
        productData = slugResult.data;
      } else if (slugResult.error?.code === 'PGRST116') {
        // No data found by slug, try by ID (in case slug is actually an ID)
        const idResult = await supabase
          .from('market_products')
          .select(`
            *,
            category:market_categories(id, name, slug),
            brand:market_brands(id, name, slug, logo_url, description, website_url)
          `)
          .eq('id', slug)
          .eq('is_active', true)
          .single();

        productData = idResult.data;
        productError = idResult.error;
      } else {
        productError = slugResult.error;
      }

      if (productError) {
        console.error('Error loading product:', productError);
        toast({
          title: "Error",
          description: "Product not found.",
          variant: "destructive",
        });
        navigate('/market');
        return;
      }

      if (!productData) {
        toast({
          title: "Error",
          description: "Product not found.",
          variant: "destructive",
        });
        navigate('/market');
        return;
      }

      // Load vendor products for this market product
      const { data: vendorProductsData, error: vendorError } = await supabase
        .from('market_vendor_products')
        .select(`
          *,
          vendor:vendors(id, business_name)
        `)
        .eq('market_product_id', productData.id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (vendorError) {
        console.error('Error loading vendor products:', vendorError);
        toast({
          title: "Error",
          description: "Failed to load vendor information.",
          variant: "destructive",
        });
      }

      setProduct(productData);
      setVendorProducts(vendorProductsData || []);

      // Select the first available vendor by default
      const availableVendors = vendorProductsData?.filter(vp => vp.is_in_stock) || [];
      if (availableVendors.length > 0) {
        setSelectedVendor(availableVendors[0].id);
      }

    } catch (error) {
      console.error('Error loading product data:', error);
      toast({
        title: "Error",
        description: "Failed to load product information.",
        variant: "destructive",
      });
      navigate('/market');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVendor || !product) {
      toast({
        title: "Error",
        description: "Please select a vendor first.",
        variant: "destructive",
      });
      return;
    }

    const vendorProduct = vendorProducts.find(vp => vp.id === selectedVendor);
    if (!vendorProduct || !vendorProduct.is_in_stock) {
      toast({
        title: "Error",
        description: "Selected vendor is out of stock.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingToCart(true);
      
      await addToCart({
        market_vendor_product_id: selectedVendor,
        quantity: quantity,
        product_type: 'marketplace'
      });

      toast({
        title: "Success",
        description: `${product.name} added to cart!`,
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add product to cart.",
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const nextImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading product...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Product not found</h3>
            <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/market')} variant="outline">
              Back to Marketplace
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const selectedVendorProduct = vendorProducts.find(vp => vp.id === selectedVendor);
  const availableVendors = vendorProducts.filter(vp => vp.is_in_stock);
  const minPrice = Math.min(...vendorProducts.filter(vp => vp.is_in_stock).map(vp => vp.price));
  const maxPrice = Math.max(...vendorProducts.filter(vp => vp.is_in_stock).map(vp => vp.price));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/market')}
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Marketplace
          </Button>
          <span>/</span>
          <span>{product.category?.name}</span>
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={product.images[selectedImageIndex] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              
              {product.images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-blue-600' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            {/* Brand and Product Name */}
            <div>
              {product.brand && (
                <div className="flex items-center gap-2 mb-2">
                  {product.brand.logo_url && (
                    <img 
                      src={product.brand.logo_url} 
                      alt={product.brand.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <span className="text-sm text-gray-600">{product.brand.name}</span>
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                {minPrice === maxPrice ? (
                  <span className="text-3xl font-bold text-green-600">₹{minPrice}</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-green-600">₹{minPrice}</span>
                    <span className="text-lg text-gray-500">- ₹{maxPrice}</span>
                  </>
                )}
                {product.base_unit && (
                  <span className="text-sm text-gray-500">per {product.base_unit}</span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Available from {availableVendors.length} vendor{availableVendors.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Product Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Product Specifications */}
            {Object.keys(product.specifications).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.weight && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Weight: {product.weight}kg</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Category: {product.category?.name}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="mobile-sm"
                className="min-h-[44px] px-4 py-2 rounded-lg text-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-xs"
              >
                <Heart className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="outline" 
                size="mobile-sm"
                className="min-h-[44px] px-4 py-2 rounded-lg text-sm sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-xs"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Vendor Comparison Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available from {availableVendors.length} Vendor{availableVendors.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription>
                Compare prices, delivery times, and vendor ratings to make the best choice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableVendors.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Out of Stock</h3>
                  <p className="text-gray-600">This product is currently not available from any vendor.</p>
                </div>
              ) : (
                <VendorComparisonTable 
                  vendorProducts={availableVendors}
                  selectedVendor={selectedVendor}
                  onVendorSelect={setSelectedVendor}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  onAddToCart={handleAddToCart}
                  addingToCart={addingToCart}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Similar Products Section */}
        <SimilarProductsSection 
          currentProduct={product} 
          currentVendorProducts={vendorProducts}
        />
      </main>
    </div>
  );
};

// Vendor Comparison Table Component
interface VendorComparisonTableProps {
  vendorProducts: MarketVendorProduct[];
  selectedVendor: string | null;
  onVendorSelect: (vendorId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  addingToCart: boolean;
}

const VendorComparisonTable: React.FC<VendorComparisonTableProps> = ({
  vendorProducts,
  selectedVendor,
  onVendorSelect,
  quantity,
  onQuantityChange,
  onAddToCart,
  addingToCart
}) => {
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sort vendors based on selected criteria
  const sortedVendors = [...vendorProducts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'delivery':
        comparison = a.delivery_time_hours - b.delivery_time_hours;
        break;
      case 'rating':
        const ratingA = a.vendor?.rating || 0;
        const ratingB = b.vendor?.rating || 0;
        comparison = ratingB - ratingA; // Higher rating first by default
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (criteria: 'price' | 'delivery' | 'rating') => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortOrder(criteria === 'rating' ? 'desc' : 'asc'); // Rating defaults to desc
    }
  };

  const formatDeliveryTime = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.ceil(hours / 24);
      return `${days}d`;
    }
  };

  const selectedVendorProduct = vendorProducts.find(vp => vp.id === selectedVendor);

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">Sort by:</span>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'price' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('price')}
            className="text-xs"
          >
            Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'delivery' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('delivery')}
            className="text-xs"
          >
            Delivery {sortBy === 'delivery' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button
            variant={sortBy === 'rating' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('rating')}
            className="text-xs"
          >
            Rating {sortBy === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>
      </div>

      {/* Vendor Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Select</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Vendor</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Price</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Stock</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Delivery</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedVendors.map((vendorProduct) => (
              <tr 
                key={vendorProduct.id}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  selectedVendor === vendorProduct.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => onVendorSelect(vendorProduct.id)}
              >
                <td className="py-4 px-4">
                  <input
                    type="radio"
                    name="vendor"
                    checked={selectedVendor === vendorProduct.id}
                    onChange={() => onVendorSelect(vendorProduct.id)}
                    className="text-blue-600"
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {vendorProduct.vendor?.business_name || 'Unknown Vendor'}
                      </div>
                      {vendorProduct.vendor_notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          {vendorProduct.vendor_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-green-600">
                      ₹{vendorProduct.price}
                    </span>
                    {vendorProduct.original_price && vendorProduct.original_price > vendorProduct.price && (
                      <>
                        <span className="text-sm text-gray-500 line-through">
                          ₹{vendorProduct.original_price}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {vendorProduct.discount_percentage}% off
                        </Badge>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      vendorProduct.is_in_stock ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-sm ${
                      vendorProduct.is_in_stock ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {vendorProduct.is_in_stock 
                        ? `${vendorProduct.stock_quantity} available`
                        : 'Out of stock'
                      }
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDeliveryTime(vendorProduct.delivery_time_hours)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {vendorProduct.vendor?.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Vendor Actions */}
      {selectedVendorProduct && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">
                Selected: {selectedVendorProduct.vendor?.business_name}
              </h4>
              <p className="text-sm text-gray-600">
                ₹{selectedVendorProduct.price} • Delivery in {formatDeliveryTime(selectedVendorProduct.delivery_time_hours)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Qty:</label>
                <div className="flex items-center border rounded">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity <= selectedVendorProduct.min_order_quantity}
                    className="h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value) || 1;
                      const minQty = selectedVendorProduct.min_order_quantity;
                      const maxQty = selectedVendorProduct.max_order_quantity || selectedVendorProduct.stock_quantity;
                      onQuantityChange(Math.max(minQty, Math.min(maxQty, newQty)));
                    }}
                    min={selectedVendorProduct.min_order_quantity}
                    max={selectedVendorProduct.max_order_quantity || selectedVendorProduct.stock_quantity}
                    className="w-16 h-8 text-center border-0 focus:outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const maxQty = selectedVendorProduct.max_order_quantity || selectedVendorProduct.stock_quantity;
                      onQuantityChange(Math.min(maxQty, quantity + 1));
                    }}
                    disabled={quantity >= (selectedVendorProduct.max_order_quantity || selectedVendorProduct.stock_quantity)}
                    className="h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={onAddToCart}
                disabled={!selectedVendorProduct.is_in_stock || addingToCart}
                className="min-w-32"
              >
                {addingToCart ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </div>
                ) : (
                  `Add to Cart - ₹${(selectedVendorProduct.price * quantity).toFixed(2)}`
                )}
              </Button>
            </div>
          </div>

          {/* Order Constraints */}
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            {selectedVendorProduct.min_order_quantity > 1 && (
              <p>Minimum order: {selectedVendorProduct.min_order_quantity} units</p>
            )}
            {selectedVendorProduct.max_order_quantity && (
              <p>Maximum order: {selectedVendorProduct.max_order_quantity} units</p>
            )}
            {selectedVendorProduct.stock_quantity <= selectedVendorProduct.low_stock_threshold && (
              <p className="text-orange-600">⚠️ Low stock - only {selectedVendorProduct.stock_quantity} left</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketProductDetail;

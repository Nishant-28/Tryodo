import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid, List, Star, MapPin, Clock, Package, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface MarketProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  specifications: Record<string, any>;
  category_id: string;
  brand_id: string;
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
  };
  vendor_count?: number;
  min_price?: number;
  max_price?: number;
  avg_rating?: number;
  fastest_delivery_hours?: number;
  has_stock?: boolean;
}

interface MarketCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  subcategories?: MarketCategory[];
  product_count?: number;
}

interface MarketBrand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  is_active: boolean;
  product_count?: number;
}

const MarketPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // State management
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [brands, setBrands] = useState<MarketBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [priceRange, setPriceRange] = useState({
    min: searchParams.get('min_price') || '',
    max: searchParams.get('max_price') || ''
  });
  const [deliveryTimeFilter, setDeliveryTimeFilter] = useState(searchParams.get('delivery_time') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Amazon-like sections (memoized)
  const heroBanners = useMemo(() => [
    { id: 'b1', image: '/Tryodo-Full.png', headline: 'Big Savings on Top Picks', sub: 'Shop today’s deals' },
    { id: 'b2', image: '/Tryodo_Full_LOGO.png', headline: 'Fast delivery on popular items', sub: 'Get it today' },
    { id: 'b3', image: '/LOGO-main.png', headline: 'Discover new arrivals', sub: 'Fresh picks for you' },
  ], []);

  const categoryTiles = useMemo(() => {
    return categories.slice(0, 12).map((cat) => ({
      id: cat.id,
      name: cat.name,
      image: '/placeholder.svg'
    }));
  }, [categories]);

  const dealsProducts = useMemo(() => {
    return [...products]
      .filter(p => p.min_price && p.vendor_count)
      .sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
      .slice(0, 12);
  }, [products]);

  const bestSellers = useMemo(() => {
    return [...products]
      .filter(p => p.vendor_count)
      .sort((a, b) => (b.vendor_count || 0) - (a.vendor_count || 0))
      .slice(0, 12);
  }, [products]);

  const topRated = useMemo(() => {
    return [...products]
      .filter(p => p.avg_rating)
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, 12);
  }, [products]);

  const fastDelivery = useMemo(() => {
    return [...products]
      .filter(p => p.fastest_delivery_hours)
      .sort((a, b) => (a.fastest_delivery_hours || 999) - (b.fastest_delivery_hours || 999))
      .slice(0, 12);
  }, [products]);

  const ProductRail: React.FC<{ title: string; items: MarketProduct[] }> = ({ title, items }) => {
    if (!items || items.length === 0) return null;
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
          <Button
            variant="link"
            className="text-sm"
            onClick={() => document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View all
          </Button>
        </div>
        <Carousel opts={{ align: 'start' }}>
          <CarouselContent>
            {items.map((product) => (
              <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleProductClick(product)}>
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-md overflow-hidden mb-2 bg-gray-50">
                      <img
                        src={product.images[0] || '/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.src = '/placeholder.svg';
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-700 line-clamp-2 mb-1">{product.name}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-green-600">₹{product.min_price?.toFixed(0)}</div>
                      {product.avg_rating && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{product.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>
    );
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (priceRange.min) params.set('min_price', priceRange.min);
    if (priceRange.max) params.set('max_price', priceRange.max);
    if (deliveryTimeFilter) params.set('delivery_time', deliveryTimeFilter);
    if (sortBy !== 'popularity') params.set('sort', sortBy);
    
    setSearchParams(params);
    filterProducts();
  }, [searchTerm, selectedCategory, selectedBrand, priceRange, deliveryTimeFilter, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);

      console.log('🔍 MarketPage: Starting to load marketplace data...');

      // Load categories, brands, and products in parallel
      const [categoriesResult, brandsResult, productsResult] = await Promise.all([
        supabase
          .from('market_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')
          .order('name'),
        supabase
          .from('market_brands')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('market_products')
          .select(`
            *,
            category:market_categories(id, name, slug),
            brand:market_brands(id, name, slug, logo_url)
          `)
          .eq('is_active', true)
          .order('name')
      ]);

      console.log('📊 MarketPage: Data loading results:', {
        categories: categoriesResult.data?.length || 0,
        brands: brandsResult.data?.length || 0,
        products: productsResult.data?.length || 0,
        errors: {
          categories: categoriesResult.error,
          brands: brandsResult.error,
          products: productsResult.error
        }
      });

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

      // Process categories into hierarchical structure
      const categoriesData = categoriesResult.data || [];
      const rootCategories = categoriesData.filter(cat => !cat.parent_id);
      const processedCategories = rootCategories.map(rootCat => ({
        ...rootCat,
        subcategories: categoriesData.filter(cat => cat.parent_id === rootCat.id),
        product_count: 0 // Will be calculated below
      }));

      // Get enhanced product data
      console.log('🛍️ MarketPage: Processing', productsResult.data?.length || 0, 'products...');
      const productsWithData = await Promise.all(
        (productsResult.data || []).map(async (product) => {
          // Get vendor data for this product
          const { data: vendorData, error: vendorError } = await supabase
            .from('market_vendor_products')
            .select('price, delivery_time_hours, is_in_stock, is_active')
            .eq('market_product_id', product.id)
            .eq('is_active', true);

          if (vendorError) {
            console.error('Error loading vendor data for product', product.id, ':', vendorError);
          }

          const activeVendors = vendorData?.filter(v => v.is_in_stock) || [];
          const prices = activeVendors.map(v => v.price);
          const deliveryTimes = activeVendors.map(v => v.delivery_time_hours);

          const productWithData = {
            ...product,
            vendor_count: activeVendors.length,
            min_price: prices.length > 0 ? Math.min(...prices) : undefined,
            max_price: prices.length > 0 ? Math.max(...prices) : undefined,
            fastest_delivery_hours: deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : undefined,
            has_stock: activeVendors.length > 0,
            avg_rating: 4.2 // Placeholder - will be calculated from reviews later
          };

          console.log('📦 Product processed:', {
            name: product.name,
            vendorData: vendorData?.length || 0,
            activeVendors: activeVendors.length,
            has_stock: productWithData.has_stock
          });

          return productWithData;
        })
      );

      // Calculate product counts for categories and brands
      const categoriesWithCounts = processedCategories.map(category => ({
        ...category,
        product_count: productsWithData.filter(p => p.category_id === category.id).length,
        subcategories: category.subcategories?.map(subcat => ({
          ...subcat,
          product_count: productsWithData.filter(p => p.category_id === subcat.id).length
        }))
      }));

      const brandsWithCounts = (brandsResult.data || []).map(brand => ({
        ...brand,
        product_count: productsWithData.filter(p => p.brand_id === brand.id).length
      }));

      setCategories(categoriesWithCounts);
      setBrands(brandsWithCounts);
      
      const productsWithStock = productsWithData.filter(p => p.has_stock);
      
      console.log('🎯 MarketPage: Final filtering results:', {
        totalProducts: productsWithData.length,
        productsWithStock: productsWithStock.length,
        productsBeingSet: productsWithStock.length
      });
      
      setProducts(productsWithStock); // Only show products with stock

    } catch (error) {
      console.error('Error loading marketplace data:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter - Enhanced with better matching
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const searchTerms = searchLower.split(' ').filter(term => term.length > 0);
      
      filtered = filtered.filter(product => {
        const searchableText = [
          product.name,
          product.description || '',
          product.category?.name || '',
          product.brand?.name || '',
          ...Object.values(product.specifications || {}).map(spec => String(spec))
        ].join(' ').toLowerCase();

        // Check if all search terms are found in the searchable text
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand_id === selectedBrand);
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        if (!product.min_price) return false;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return product.min_price >= min && product.min_price <= max;
      });
    }

    // Delivery time filter
    if (deliveryTimeFilter) {
      const maxDeliveryHours = parseInt(deliveryTimeFilter);
      filtered = filtered.filter(product => {
        return product.fastest_delivery_hours && product.fastest_delivery_hours <= maxDeliveryHours;
      });
    }

    // Sort products - Enhanced sorting logic
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          const priceA = a.min_price || Infinity;
          const priceB = b.min_price || Infinity;
          return priceA - priceB;
        case 'price_high':
          const priceHighA = a.min_price || 0;
          const priceHighB = b.min_price || 0;
          return priceHighB - priceHighA;
        case 'rating':
          const ratingA = a.avg_rating || 0;
          const ratingB = b.avg_rating || 0;
          if (ratingA === ratingB) {
            // Secondary sort by vendor count for same ratings
            return (b.vendor_count || 0) - (a.vendor_count || 0);
          }
          return ratingB - ratingA;
        case 'delivery':
          const deliveryA = a.fastest_delivery_hours || 999;
          const deliveryB = b.fastest_delivery_hours || 999;
          if (deliveryA === deliveryB) {
            // Secondary sort by price for same delivery times
            return (a.min_price || 0) - (b.min_price || 0);
          }
          return deliveryA - deliveryB;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popularity':
        default:
          const popularityA = a.vendor_count || 0;
          const popularityB = b.vendor_count || 0;
          if (popularityA === popularityB) {
            // Secondary sort by rating for same vendor counts
            return (b.avg_rating || 0) - (a.avg_rating || 0);
          }
          return popularityB - popularityA;
      }
    });

    return filtered;
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleProductClick = (product: MarketProduct) => {
    // Use slug if available, otherwise use ID as fallback
    const identifier = product.slug?.trim() || product.id;
    navigate(`/market/product/${identifier}`);
  };

  const generateSearchSuggestions = (searchValue: string) => {
    if (!searchValue.trim() || searchValue.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const suggestions = new Set<string>();

    // Add product name suggestions
    products.forEach(product => {
      if (product.name.toLowerCase().includes(searchLower)) {
        suggestions.add(product.name);
      }
    });

    // Add brand name suggestions
    brands.forEach(brand => {
      if (brand.name.toLowerCase().includes(searchLower)) {
        suggestions.add(brand.name);
      }
    });

    // Add category name suggestions
    categories.forEach(category => {
      if (category.name.toLowerCase().includes(searchLower)) {
        suggestions.add(category.name);
      }
      category.subcategories?.forEach(subcat => {
        if (subcat.name.toLowerCase().includes(searchLower)) {
          suggestions.add(subcat.name);
        }
      });
    });

    // Add specification value suggestions
    products.forEach(product => {
      Object.values(product.specifications).forEach(spec => {
        const specStr = String(spec);
        if (specStr.toLowerCase().includes(searchLower)) {
          suggestions.add(specStr);
        }
      });
    });

    setSearchSuggestions(Array.from(suggestions).slice(0, 8)); // Limit to 8 suggestions
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    generateSearchSuggestions(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setPriceRange({ min: '', max: '' });
    setDeliveryTimeFilter('');
    setSortBy('popularity');
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  const filteredProducts = filterProducts();

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading marketplace...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {/* Hero Banner */}
        <section className="mb-6 sm:mb-8">
          <Carousel opts={{ loop: true }}>
            <CarouselContent>
              {heroBanners.map((b) => (
                <CarouselItem key={b.id}>
                  <div className="relative h-40 sm:h-56 md:h-64 lg:h-80 rounded-xl overflow-hidden">
                    <img src={b.image} alt={b.headline} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                      <h2 className="text-white font-bold text-lg sm:text-2xl">{b.headline}</h2>
                      <p className="text-white/90 text-xs sm:text-sm">{b.sub}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-3 sm:-left-6 bg-white/90" />
            <CarouselNext className="-right-3 sm:-right-6 bg-white/90" />
          </Carousel>
        </section>

        {/* Quick Categories */}
        {categoryTiles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Shop by category</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
              {categoryTiles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`group flex flex-col items-center gap-2 rounded-md p-2 sm:p-3 border hover:shadow ${selectedCategory === c.id ? 'border-blue-600' : 'border-gray-200'}`}
                >
                  <div className="w-full aspect-square rounded bg-gray-50 overflow-hidden">
                    <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-700 line-clamp-1">{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Rails */}
        <ProductRail title="Today’s Deals" items={dealsProducts} />
        <ProductRail title="Best Sellers" items={bestSellers} />
        <ProductRail title="Top Rated" items={topRated} />
        <ProductRail title="Fast Delivery" items={fastDelivery} />

        {/* Header */}
        <div id="all-products" className="mb-4 mt-6 sm:mt-10">
          <h1 className="text-xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">Discover products from verified vendors</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Search */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="pl-10"
                    />
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1">
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                  <div className="space-y-2">
                    <Button
                      variant={selectedCategory === '' ? 'default' : 'ghost'}
                      onClick={() => setSelectedCategory('')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      All Categories ({products.length})
                    </Button>
                    {categories.map((category) => (
                      <div key={category.id}>
                        <div className="flex items-center">
                          <Button
                            variant={selectedCategory === category.id ? 'default' : 'ghost'}
                            onClick={() => setSelectedCategory(category.id)}
                            className="flex-1 justify-start text-sm"
                            size="sm"
                          >
                            {category.name} ({category.product_count})
                          </Button>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCategoryExpansion(category.id)}
                              className="p-1 h-auto"
                            >
                              {expandedCategories.has(category.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                        {expandedCategories.has(category.id) && category.subcategories && (
                          <div className="ml-4 mt-1 space-y-1">
                            {category.subcategories.map((subcat) => (
                              <Button
                                key={subcat.id}
                                variant={selectedCategory === subcat.id ? 'default' : 'ghost'}
                                onClick={() => setSelectedCategory(subcat.id)}
                                className="w-full justify-start text-xs"
                                size="sm"
                              >
                                {subcat.name} ({subcat.product_count})
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Brands</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <Button
                      variant={selectedBrand === '' ? 'default' : 'ghost'}
                      onClick={() => setSelectedBrand('')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      All Brands
                    </Button>
                    {brands.filter(b => b.product_count! > 0).map((brand) => (
                      <Button
                        key={brand.id}
                        variant={selectedBrand === brand.id ? 'default' : 'ghost'}
                        onClick={() => setSelectedBrand(brand.id)}
                        className="w-full justify-start text-sm"
                        size="sm"
                      >
                        <div className="flex items-center gap-2">
                          {brand.logo_url && (
                            <img 
                              src={brand.logo_url} 
                              alt={brand.name}
                              className="w-4 h-4 object-contain"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          )}
                          {brand.name} ({brand.product_count})
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Price Range</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Delivery Time Filter */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Time</h3>
                  <div className="space-y-2">
                    <Button
                      variant={deliveryTimeFilter === '' ? 'default' : 'ghost'}
                      onClick={() => setDeliveryTimeFilter('')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      Any time
                    </Button>
                    <Button
                      variant={deliveryTimeFilter === '2' ? 'default' : 'ghost'}
                      onClick={() => setDeliveryTimeFilter('2')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      Within 2 hours
                    </Button>
                    <Button
                      variant={deliveryTimeFilter === '6' ? 'default' : 'ghost'}
                      onClick={() => setDeliveryTimeFilter('6')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      Within 6 hours
                    </Button>
                    <Button
                      variant={deliveryTimeFilter === '24' ? 'default' : 'ghost'}
                      onClick={() => setDeliveryTimeFilter('24')}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      Same day
                    </Button>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full text-sm"
                  size="sm"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  {filteredProducts.length} products found
                </p>
                {(searchTerm || selectedCategory || selectedBrand || priceRange.min || priceRange.max || deliveryTimeFilter) && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-sm"
                    size="sm"
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Most Popular</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="delivery">Fastest Delivery</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex border rounded-lg sm:rounded-lg rounded-xl">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('grid')}
                    size="mobile-sm"
                    className="rounded-r-none sm:rounded-r-none rounded-r-none min-h-[48px] min-w-[48px] px-4 py-3"
                  >
                    <Grid className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    size="mobile-sm"
                    className="rounded-l-none sm:rounded-l-none rounded-l-none min-h-[48px] min-w-[48px] px-4 py-3"
                  >
                    <List className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>    
        {/* Products Display */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <div className="text-gray-600 mb-4 space-y-2">
                  {searchTerm || selectedCategory || selectedBrand || priceRange.min || priceRange.max || deliveryTimeFilter ? (
                    <p>Try adjusting your filters to see more products.</p>
                  ) : (
                    <div className="space-y-2">
                      <p>No products are currently available in the marketplace.</p>
                      <p className="text-sm">
                        This could mean:
                      </p>
                      <ul className="text-sm text-left max-w-md mx-auto space-y-1">
                        <li>• No vendors are currently selling marketplace products</li>
                        <li>• All vendor products are out of stock</li>
                        <li>• The marketplace is still being set up</li>
                      </ul>
                      <p className="text-sm mt-3">
                        <strong>Debug info:</strong> Found {products.length} products total, {filteredProducts.length} after filtering
                      </p>
                    </div>
                  )}
                </div>
                {(searchTerm || selectedCategory || selectedBrand || priceRange.min || priceRange.max || deliveryTimeFilter) && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    {filteredProducts.map((product) => (
                      <Card 
                        key={product.id} 
                        className="group cursor-pointer hover:shadow-lg transition-shadow duration-200 border-0 sm:border shadow-sm hover:shadow-md sm:hover:shadow-lg rounded-xl sm:rounded-lg"
                        onClick={() => handleProductClick(product)}
                      >
                        <CardHeader className="p-0">
                          <div className="aspect-square relative overflow-hidden rounded-t-lg">
                            <img
                              src={product.images[0] || '/placeholder.svg'}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                            {product.vendor_count && product.vendor_count > 1 && (
                              <Badge className="absolute top-2 left-2 bg-blue-600">
                                {product.vendor_count} vendors
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {product.brand?.logo_url && (
                              <img 
                                src={product.brand.logo_url} 
                                alt={product.brand.name}
                                className="w-5 h-5 object-contain"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                              />
                            )}
                            <span className="text-xs text-gray-500 font-medium">{product.brand?.name}</span>
                          </div>
                          <CardTitle className="text-xs sm:text-sm font-medium line-clamp-2 mb-2 sm:mb-3 text-gray-900 leading-tight">
                            {product.name}
                          </CardTitle>
                          
                          {/* Price and Rating Row */}
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-bold text-green-600">
                                  ₹{product.min_price?.toFixed(2)}
                                </span>
                                {product.max_price && product.max_price !== product.min_price && (
                                  <span className="text-sm text-gray-500">
                                    - ₹{product.max_price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-green-700 font-medium">Best Price</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-600 font-medium">{product.avg_rating?.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Vendor and Delivery Info */}
                          <div className="flex items-center justify-between text-xs sm:text-xs">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-blue-600">
                                <Package className="h-3 w-3" />
                                <span className="font-medium">
                                  {product.vendor_count} vendor{product.vendor_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-orange-600">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">{product.fastest_delivery_hours}h delivery</span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                              In Stock
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <div className="space-y-4">
                    {filteredProducts.map((product) => (
                      <Card 
                        key={product.id} 
                        className="group cursor-pointer hover:shadow-md transition-shadow duration-200"
                        onClick={() => handleProductClick(product)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="w-24 h-24 flex-shrink-0 relative">
                              <img
                                src={product.images[0] || '/placeholder.svg'}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                              {product.vendor_count && product.vendor_count > 1 && (
                                <Badge className="absolute -top-1 -right-1 bg-blue-600 text-xs px-1 py-0">
                                  {product.vendor_count}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {product.brand?.logo_url && (
                                      <img 
                                        src={product.brand.logo_url} 
                                        alt={product.brand.name}
                                        className="w-4 h-4 object-contain"
                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                      />
                                    )}
                                    <span className="text-xs text-gray-500 font-medium">{product.brand?.name}</span>
                                  </div>
                                  <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                                    {product.name}
                                  </h3>
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                    {product.description}
                                  </p>
                                  
                                  {/* Vendor and Delivery Info */}
                                  <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <Package className="h-3 w-3" />
                                      <span className="font-medium">
                                        {product.vendor_count} vendor{product.vendor_count !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-orange-600">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-medium">{product.fastest_delivery_hours}h delivery</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-600">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="font-medium">{product.avg_rating?.toFixed(1)}</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                      In Stock
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="flex flex-col items-end mb-2">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-bold text-green-600">
                                        ₹{product.min_price?.toFixed(2)}
                                      </span>
                                      {product.max_price && product.max_price !== product.min_price && (
                                        <span className="text-sm text-gray-500">
                                          - ₹{product.max_price.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-green-700 font-medium">Best Price</span>
                                  </div>
                                  <Button 
                                    size="mobile-sm" 
                                    className="mt-2 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg sm:mt-1 sm:min-h-[36px] sm:px-3 sm:py-1 sm:text-xs"
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketPage;
import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Star, Verified, Clock, Package, ChevronRight, ArrowLeft, Filter, SortAsc, Shield, Truck, Tag, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Cart from '@/components/customer/Cart';
import { supabase } from '@/lib/supabase';

// Types
interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  gradient: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
}

interface Model {
  id: string;
  brand_id: string;
  model_name: string;
  model_number: string | null;
  release_year: number | null;
  is_active: boolean;
  base_price: number | null;
  specifications: any | null;
  official_images: string[] | null;
  description: string | null;
}

interface Vendor {
  id: string;
  business_name: string;
  rating: number;
  total_reviews: number;
  response_time_hours: number;
  is_verified: boolean;
  business_city: string | null;
  business_state: string | null;
}

interface QualityCategory {
  id: string;
  name: string;
  description: string | null;
}

interface VendorProduct {
  id: string;
  vendor_id: string;
  model_id: string;
  category_id: string;
  quality_type_id: string;
  price: number;
  original_price: number | null;
  warranty_months: number;
  stock_quantity: number;
  is_in_stock: boolean;
  delivery_time_days: number;
  product_images: string[] | null;
  vendor: Vendor;
  quality: QualityCategory;
}

interface CartItem {
  id: string;
  name: string;
  vendor: string;
  vendorId: string;
  price: number;
  quantity: number;
  image?: string;
  deliveryTime: number;
  warranty: number;
}

// Add mock data at the top of the file after imports
const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Smartphone Parts',
    description: 'Displays, batteries, cameras and other phone components',
    icon: '📱',
    gradient: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    is_active: true,
    sort_order: 1
  },
  {
    id: '2', 
    name: 'Accessories',
    description: 'Cases, chargers, headphones and mobile accessories',
    icon: '🎧',
    gradient: 'bg-gradient-to-br from-purple-50 to-pink-100',
    is_active: true,
    sort_order: 2
  },
  {
    id: '3',
    name: 'Repair Tools',
    description: 'Professional tools for smartphone repair and maintenance',
    icon: '🔧',
    gradient: 'bg-gradient-to-br from-green-50 to-emerald-100',
    is_active: true,
    sort_order: 3
  }
];

const MOCK_BRANDS: Brand[] = [
  {
    id: 'apple-1',
    name: 'Apple',
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    is_active: true
  },
  {
    id: 'samsung-1',
    name: 'Samsung', 
    logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg',
    is_active: true
  },
  {
    id: 'xiaomi-1',
    name: 'Xiaomi',
    logo_url: null,
    is_active: true
  },
  {
    id: 'oneplus-1',
    name: 'OnePlus',
    logo_url: null,
    is_active: true
  },
  {
    id: 'google-1',
    name: 'Google',
    logo_url: null,
    is_active: true
  }
];

const MOCK_MODELS: { [brandId: string]: Model[] } = {
  'apple-1': [
    {
      id: 'iphone-15-pro',
      brand_id: 'apple-1',
      model_name: 'iPhone 15 Pro',
      model_number: 'A3101',
      release_year: 2023,
      is_active: true,
      base_price: 134900,
      specifications: null,
      official_images: null,
      description: 'Latest iPhone with titanium design'
    },
    {
      id: 'iphone-15',
      brand_id: 'apple-1', 
      model_name: 'iPhone 15',
      model_number: 'A3089',
      release_year: 2023,
      is_active: true,
      base_price: 79900,
      specifications: null,
      official_images: null,
      description: 'iPhone 15 with USB-C'
    },
    {
      id: 'iphone-14',
      brand_id: 'apple-1',
      model_name: 'iPhone 14',
      model_number: 'A2649',
      release_year: 2022,
      is_active: true,
      base_price: 69900,
      specifications: null,
      official_images: null,
      description: 'iPhone 14 with improved cameras'
    }
  ],
  'samsung-1': [
    {
      id: 'galaxy-s24-ultra',
      brand_id: 'samsung-1',
      model_name: 'Galaxy S24 Ultra',
      model_number: 'SM-S928B',
      release_year: 2024,
      is_active: true,
      base_price: 129999,
      specifications: null,
      official_images: null,
      description: 'Premium Galaxy with S Pen'
    },
    {
      id: 'galaxy-s24',
      brand_id: 'samsung-1',
      model_name: 'Galaxy S24',
      model_number: 'SM-S921B',
      release_year: 2024,
      is_active: true,
      base_price: 79999,
      specifications: null,
      official_images: null,
      description: 'Flagship Galaxy smartphone'
    }
  ]
};

const MOCK_VENDOR_PRODUCTS: VendorProduct[] = [
  {
    id: 'prod-1',
    vendor_id: 'vendor-1',
    model_id: 'iphone-15-pro',
    category_id: '1',
    quality_type_id: 'quality-1',
    price: 5999,
    original_price: 7999,
    warranty_months: 12,
    stock_quantity: 15,
    is_in_stock: true,
    delivery_time_days: 2,
    product_images: null,
    vendor: {
      id: 'vendor-1',
      business_name: 'TechParts Pro',
      rating: 4.8,
      total_reviews: 1247,
      response_time_hours: 2,
      is_verified: true,
      business_city: 'Mumbai',
      business_state: 'Maharashtra'
    },
    quality: {
      id: 'quality-1',
      name: 'Original',
      description: 'Genuine OEM parts with warranty'
    }
  },
  {
    id: 'prod-2',
    vendor_id: 'vendor-2',
    model_id: 'iphone-15-pro',
    category_id: '1',
    quality_type_id: 'quality-2',
    price: 3999,
    original_price: 4999,
    warranty_months: 6,
    stock_quantity: 8,
    is_in_stock: true,
    delivery_time_days: 3,
    product_images: null,
    vendor: {
      id: 'vendor-2',
      business_name: 'Mobile Hub',
      rating: 4.5,
      total_reviews: 892,
      response_time_hours: 4,
      is_verified: true,
      business_city: 'Delhi',
      business_state: 'Delhi'
    },
    quality: {
      id: 'quality-2',
      name: 'Premium Copy',
      description: 'High-quality aftermarket parts'
    }
  },
  {
    id: 'prod-3',
    vendor_id: 'vendor-3',
    model_id: 'iphone-15-pro',
    category_id: '1',
    quality_type_id: 'quality-3',
    price: 2499,
    original_price: null,
    warranty_months: 3,
    stock_quantity: 25,
    is_in_stock: true,
    delivery_time_days: 5,
    product_images: null,
    vendor: {
      id: 'vendor-3',
      business_name: 'Budget Electronics',
      rating: 4.2,
      total_reviews: 456,
      response_time_hours: 6,
      is_verified: false,
      business_city: 'Bangalore',
      business_state: 'Karnataka'
    },
    quality: {
      id: 'quality-3',
      name: 'Standard',
      description: 'Good quality replacement parts'
    }
  }
];

// API Functions
const fetchCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data && data.length > 0 ? data : MOCK_CATEGORIES;
  } catch (error) {
    return MOCK_CATEGORIES;
  }
};

const fetchBrands = async (categoryId?: string): Promise<Brand[]> => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data && data.length > 0 ? data : MOCK_BRANDS;
  } catch (error) {
    return MOCK_BRANDS;
  }
};

const fetchModels = async (brandId: string): Promise<Model[]> => {
  try {
    const { data, error } = await supabase
      .from('smartphone_models')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('model_name', { ascending: true });
    
    if (error) throw error;
    return data && data.length > 0 ? data : (MOCK_MODELS[brandId] || []);
  } catch (error) {
    return MOCK_MODELS[brandId] || [];
  }
};

const fetchVendorProducts = async (modelId: string, categoryId: string): Promise<VendorProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('vendor_products')
      .select(`
        *,
        vendor:vendor_id!inner (
          id,
          business_name,
          rating,
          total_reviews,
          response_time_hours,
          is_verified,
          business_city,
          business_state
        ),
        quality:quality_type_id!inner (
          id,
          name,
          description
        )
      `)
      .eq('model_id', modelId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) throw error;
    return data && data.length > 0 ? data : MOCK_VENDOR_PRODUCTS.filter(p => p.model_id === modelId);
  } catch (error) {
    return MOCK_VENDOR_PRODUCTS.filter(p => p.model_id === modelId);
  }
};

const Order = () => {
  // State management
  const [step, setStep] = useState<'categories' | 'brands' | 'models' | 'products'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'reviews'>('price');
  const [filterStock, setFilterStock] = useState<'all' | 'in-stock'>('all');
  
  // Cart states
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories. Please try again.');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async (categoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrands(categoryId);
      setBrands(data);
      setStep('brands');
    } catch (err) {
      setError('Failed to load brands. Please try again.');
      console.error('Error loading brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async (brandId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModels(brandId);
      setModels(data);
      setStep('models');
    } catch (err) {
      setError('Failed to load models. Please try again.');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorProducts = async (modelId: string, categoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVendorProducts(modelId, categoryId);
      setVendorProducts(data);
      setStep('products');
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Error loading vendor products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort functions
  const getFilteredData = () => {
    let filtered = [];
    
    switch (step) {
      case 'categories':
        filtered = categories.filter(cat => 
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        break;
      case 'brands':
        filtered = brands.filter(brand => 
          brand.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        break;
      case 'models':
        filtered = models.filter(model => 
          model.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (model.model_number && model.model_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        break;
      case 'products':
        filtered = vendorProducts.filter(product => {
          const matchesSearch = product.vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.quality.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStock = filterStock === 'all' || (filterStock === 'in-stock' && product.is_in_stock);
          return matchesSearch && matchesStock;
        });
        
        // Sort products
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'price':
              return a.price - b.price;
            case 'rating':
              return b.vendor.rating - a.vendor.rating;
            case 'reviews':
              return b.vendor.total_reviews - a.vendor.total_reviews;
            default:
              return 0;
          }
        });
        break;
    }
    
    return filtered;
  };

  // Cart functions
  const addToCart = (product: VendorProduct) => {
    const cartItem: CartItem = {
      id: product.id,
      name: `${selectedModel?.model_name} - ${product.quality.name}`,
      vendor: product.vendor.business_name,
      vendorId: product.vendor_id,
      price: product.price,
      quantity: 1,
      image: product.product_images?.[0],
      deliveryTime: product.delivery_time_days,
      warranty: product.warranty_months
    };

    const existingItem = cartItems.find(item => item.id === cartItem.id);
    if (existingItem) {
      updateCartQuantity(cartItem.id, existingItem.quantity + 1);
    } else {
      setCartItems([...cartItems, cartItem]);
    }
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCartItems(items => items.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  // Navigation functions
  const goBack = () => {
    setSearchTerm('');
    switch (step) {
      case 'brands':
        setStep('categories');
        setSelectedCategory(null);
        break;
      case 'models':
        setStep('brands');
        setSelectedBrand(null);
        break;
      case 'products':
        setStep('models');
        setSelectedModel(null);
        break;
    }
  };

  const resetToCategories = () => {
    setStep('categories');
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedModel(null);
    setSearchTerm('');
  };

  // Get quality color coding
  const getQualityColor = (qualityName: string) => {
    const name = qualityName.toLowerCase();
    if (name.includes('premium') || name.includes('a+')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (name.includes('good') || name.includes('b+')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (name.includes('fair') || name.includes('c+')) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Render functions
  const renderBreadcrumb = () => (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink onClick={resetToCategories} className="cursor-pointer">
            Categories
          </BreadcrumbLink>
        </BreadcrumbItem>
        {selectedCategory && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {step === 'brands' ? (
                <BreadcrumbPage>{selectedCategory.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  onClick={() => {
                    setStep('brands');
                    setSelectedBrand(null);
                    setSelectedModel(null);
                  }}
                  className="cursor-pointer"
                >
                  {selectedCategory.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {selectedBrand && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {step === 'models' ? (
                <BreadcrumbPage>{selectedBrand.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  onClick={() => {
                    setStep('models');
                    setSelectedModel(null);
                  }}
                  className="cursor-pointer"
                >
                  {selectedBrand.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {selectedModel && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{selectedModel.model_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  const renderSearchAndFilters = () => (
    <div className="mb-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={`Search ${step}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {step === 'products' && (
        <div className="flex flex-wrap gap-4">
          <Select value={sortBy} onValueChange={(value: 'price' | 'rating' | 'reviews') => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Price (Low to High)</SelectItem>
              <SelectItem value="rating">Rating (High to Low)</SelectItem>
              <SelectItem value="reviews">Reviews (Most to Least)</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStock} onValueChange={(value: 'all' | 'in-stock') => setFilterStock(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="in-stock">In Stock Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderCategories = () => {
    const filteredCategories = getFilteredData() as Category[];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <Card 
            key={category.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
            onClick={() => {
              setSelectedCategory(category);
              loadBrands(category.id);
            }}
          >
            <CardHeader className={`${category.gradient || 'bg-gradient-to-br from-blue-50 to-purple-50'} rounded-t-lg`}>
              <CardTitle className="flex items-center space-x-3">
                {category.icon && (
                  <div className="text-2xl">{category.icon}</div>
                )}
                <span>{category.name}</span>
              </CardTitle>
              {category.description && (
                <CardDescription className="text-gray-600">
                  {category.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Explore products</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderBrands = () => {
    const filteredBrands = getFilteredData() as Brand[];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBrands.map((brand) => (
          <Card 
            key={brand.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
            onClick={() => {
              setSelectedBrand(brand);
              loadModels(brand.id);
            }}
          >
            <CardContent className="p-6 text-center">
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="w-16 h-16 mx-auto mb-4 object-contain"
                />
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">
                    {brand.name.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-gray-900">{brand.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderModels = () => {
    const filteredModels = getFilteredData() as Model[];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card 
            key={model.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
            onClick={() => {
              setSelectedModel(model);
              loadVendorProducts(model.id, selectedCategory!.id);
            }}
          >
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{model.model_name}</h3>
              <div className="space-y-1">
                {model.model_number && (
                  <p className="text-sm text-gray-600">Model: {model.model_number}</p>
                )}
                {model.release_year && (
                  <p className="text-sm text-gray-600">Year: {model.release_year}</p>
                )}
                {model.base_price && (
                  <p className="text-sm text-gray-600">Starting from: ₹{model.base_price.toLocaleString()}</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline">Available</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderVendorProducts = () => {
    const filteredProducts = getFilteredData() as VendorProduct[];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Vendor Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{product.vendor.business_name}</span>
                      {product.vendor.is_verified && (
                        <Verified className="h-4 w-4 text-blue-500" />
                      )}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {product.vendor.rating.toFixed(1)} ({product.vendor.total_reviews})
                        </span>
                      </div>
                    </div>
                    {product.vendor.business_city && (
                      <p className="text-sm text-gray-500">
                        {product.vendor.business_city}, {product.vendor.business_state}
                      </p>
                    )}
                  </div>
                  <Badge 
                    className={getQualityColor(product.quality.name)}
                    variant="outline"
                  >
                    {product.quality.name}
                  </Badge>
                </div>

                {/* Price and Discount */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{product.price.toLocaleString()}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <>
                        <span className="text-sm text-gray-500 line-through">
                          ₹{product.original_price.toLocaleString()}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {product.warranty_months}M Warranty
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {product.delivery_time_days}D Delivery
                    </span>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={product.is_in_stock ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {product.is_in_stock ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Responds in {product.vendor.response_time_hours}h
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  onClick={() => addToCart(product)}
                  disabled={!product.is_in_stock}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderLoadingSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStepContent = () => {
    if (loading) return renderLoadingSkeletons();
    
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {step === 'categories' && <Package className="h-12 w-12 mx-auto" />}
            {step === 'brands' && <Search className="h-12 w-12 mx-auto" />}
            {step === 'models' && <Search className="h-12 w-12 mx-auto" />}
            {step === 'products' && <ShoppingCart className="h-12 w-12 mx-auto" />}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {step} found
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : `No ${step} available at the moment.`}
          </p>
        </div>
      );
    }

    switch (step) {
      case 'categories':
        return renderCategories();
      case 'brands':
        return renderBrands();
      case 'models':
        return renderModels();
      case 'products':
        return renderVendorProducts();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        cartItems={cartItems.length} 
        onCartClick={() => setIsCartOpen(true)} 
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {step !== 'categories' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              )}
              <h1 className="text-3xl font-bold text-gray-900">
                {step === 'categories' && 'Choose a Category'}
                {step === 'brands' && `Brands in ${selectedCategory?.name}`}
                {step === 'models' && `${selectedBrand?.name} Models`}
                {step === 'products' && `${selectedModel?.model_name} Options`}
              </h1>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart ({cartItems.length})</span>
            </Button>
          </div>

          {renderBreadcrumb()}
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        {renderSearchAndFilters()}

        {/* Main Content */}
        {renderStepContent()}
      </main>

      <Footer />
      
      {/* Cart Sidebar */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
      />
    </div>
  );
};

export default Order; 
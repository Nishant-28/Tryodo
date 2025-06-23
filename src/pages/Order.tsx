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
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';

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

// Generate mock vendor products for all models
const generateMockVendorProducts = (): VendorProduct[] => {
  const vendors = [
    {
      id: 'vendor-1',
      business_name: 'Rohan Communication',
      rating: 4.9,
      total_reviews: 1523,
      is_verified: true,
      business_city: 'Mumbai',
      business_state: 'Maharashtra'
    },
    {
      id: 'vendor-2',
      business_name: 'TechParts Pro',
      rating: 4.8,
      total_reviews: 1247,
      is_verified: true,
      business_city: 'Delhi',
      business_state: 'Delhi'
    },
    {
      id: 'vendor-3',
      business_name: 'Mobile Hub',
      rating: 4.5,
      total_reviews: 892,
      is_verified: true,
      business_city: 'Bangalore',
      business_state: 'Karnataka'
    },
    {
      id: 'vendor-4',
      business_name: 'Budget Electronics',
      rating: 4.2,
      total_reviews: 456,
      is_verified: false,
      business_city: 'Chennai',
      business_state: 'Tamil Nadu'
    }
  ];

  const qualities = [
    {
      id: 'quality-1',
      name: 'Original',
      description: 'Genuine OEM parts with warranty'
    },
    {
      id: 'quality-2',
      name: 'Premium Copy',
      description: 'High-quality aftermarket parts'
    },
    {
      id: 'quality-3',
      name: 'Standard',
      description: 'Good quality replacement parts'
    }
  ];

  const products: VendorProduct[] = [];
  
  // Generate products for all models
  const allModelIds = [
    'iphone-15-pro', 'iphone-15', 'iphone-14',
    'galaxy-s24-ultra', 'galaxy-s24', 'galaxy-s23',
    'pixel-8-pro', 'pixel-8', 'pixel-7',
    'oneplus-12', 'oneplus-11', 'oneplus-10',
    'redmi-note-13', 'mi-14', 'mi-13'
  ];

  MOCK_CATEGORIES.forEach(category => {
    allModelIds.forEach(modelId => {
      vendors.forEach((vendor, vendorIndex) => {
        qualities.forEach((quality, qualityIndex) => {
          const basePrice = (category.id === '1' ? 2000 : category.id === '2' ? 500 : 1200) + (vendorIndex * 1000) + (qualityIndex * 500);
          products.push({
            id: `prod-${modelId}-${vendor.id}-${quality.id}-${category.id}`,
            vendor_id: vendor.id,
            model_id: modelId,
            category_id: category.id,
            quality_type_id: quality.id,
            price: basePrice,
            original_price: qualityIndex === 0 ? basePrice + (category.id === '1' ? 1000 : 200) : null,
            warranty_months: 12 - (qualityIndex * 3),
            stock_quantity: 10 + (vendorIndex * 5),
            is_in_stock: true,
            delivery_time_days: 2 + vendorIndex,
            product_images: null,
            vendor,
            quality
          });
        });
      });
    });
  });

  return products;
};

const MOCK_VENDOR_PRODUCTS: VendorProduct[] = generateMockVendorProducts();

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
    console.log('🔍 Fetching brands for category:', categoryId);
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('🚨 Error fetching brands:', error);
      throw error;
    }
    
    console.log('🏢 Brands from database:', data?.length, data);
    
    if (data && data.length > 0) {
      console.log('✅ Using database brands');
      return data;
    } else {
      console.log('🔄 No brands found in database, using mock data');
      return MOCK_BRANDS;
    }
  } catch (error) {
    console.log('❌ Error fetching brands, using mock data:', error);
    return MOCK_BRANDS;
  }
};

const fetchModels = async (brandId: string): Promise<Model[]> => {
  try {
    console.log('🔍 Fetching models for brand:', brandId);
    const { data, error } = await supabase
      .from('smartphone_models')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('model_name', { ascending: true });
    
    if (error) {
      console.error('🚨 Error fetching models:', error);
      throw error;
    }
    
    console.log('📱 Models from database:', data?.length, data);
    
    if (data && data.length > 0) {
      console.log('✅ Using database models');
      return data;
    } else {
      console.log('🔄 No models found in database, using mock data');
      return MOCK_MODELS[brandId] || [];
    }
  } catch (error) {
    console.log('❌ Error fetching models, using mock data:', error);
    return MOCK_MODELS[brandId] || [];
  }
};

const fetchVendorProducts = async (modelId: string, categoryId: string): Promise<VendorProduct[]> => {
  try {
    console.log('🔍 Fetching vendor products from database for:', { modelId, categoryId });
    
    // First attempt: strict match on model and category
    let { data: vendorProductsData, error } = await supabase
      .from('vendor_products')
      .select('*')
      .eq('model_id', modelId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    console.log('💾 Strict DB response:', { dataLength: vendorProductsData?.length, error, data: vendorProductsData });
    
    if (error) {
      console.error('🚨 Database error:', error);
    }

    // If nothing returned with strict filtering, relax the category filter
    if (!error && (vendorProductsData?.length ?? 0) === 0) {
      console.log('📝 No results with strict match, trying without category filter...');
      
      ({ data: vendorProductsData, error } = await supabase
        .from('vendor_products')
        .select('*')
        .eq('model_id', modelId)
        .eq('is_active', true)
        .order('price', { ascending: true }));

      console.log('💾 Relaxed DB response (model only):', { dataLength: vendorProductsData?.length, error, data: vendorProductsData });
    }

    if (error) throw error;

    if (!vendorProductsData || vendorProductsData.length === 0) {
      console.log('🔄 No database data found, falling back to mock data');
      const mockData = MOCK_VENDOR_PRODUCTS.filter(p => p.model_id === modelId && p.category_id === categoryId);
      console.log('🎭 Mock data:', mockData.length, 'products');
      return mockData;
    }

    // Get unique vendor IDs and quality IDs for separate lookups
    const vendorIds = [...new Set(vendorProductsData.map(p => p.vendor_id))];
    const qualityIds = [...new Set(vendorProductsData.map(p => p.quality_type_id))];

    console.log('🔍 Fetching related data for:', { vendorIds, qualityIds });

    // Fetch vendors separately with error handling
    let vendorsData: any[] = [];
    try {
      const { data, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_name, rating, total_reviews, is_verified, business_city, business_state')
        .in('id', vendorIds);

      if (vendorsError) {
        console.error('🚨 Error fetching vendors:', vendorsError);
      } else {
        vendorsData = data || [];
      }
    } catch (vendorErr) {
      console.error('🚨 Vendor fetch failed:', vendorErr);
    }

    // Fetch quality categories separately with error handling
    let qualitiesData: any[] = [];
    try {
      const { data, error: qualitiesError } = await supabase
        .from('quality_categories')
        .select('id, name, description')
        .in('id', qualityIds);

      if (qualitiesError) {
        console.error('🚨 Error fetching quality categories:', qualitiesError);
      } else {
        qualitiesData = data || [];
      }
    } catch (qualityErr) {
      console.error('🚨 Quality categories fetch failed:', qualityErr);
    }

    console.log('📊 Related data fetched:', { vendors: vendorsData?.length, qualities: qualitiesData?.length });
    console.log('📊 Vendors data:', vendorsData);
    console.log('📊 Qualities data:', qualitiesData);

    // Create lookup maps
    const vendorsMap = new Map((vendorsData || []).map(v => [v.id, v]));
    const qualitiesMap = new Map((qualitiesData || []).map(q => [q.id, q]));

    // Transform the data to match the expected interface with fallbacks
    const transformedData = vendorProductsData.map(item => {
      const vendor = vendorsMap.get(item.vendor_id) || {
        id: item.vendor_id,
        business_name: 'Rohan Communication', // Default fallback vendor name
        rating: 4.5,
        total_reviews: 100,
        is_verified: true,
        business_city: 'Mumbai',
        business_state: 'Maharashtra'
      };
      
      const quality = qualitiesMap.get(item.quality_type_id) || {
        id: item.quality_type_id,
        name: 'Standard',
        description: 'Good quality replacement parts'
      };
      
      console.log('🔍 Processing item:', item.id);
      console.log('🔍 Found/fallback vendor:', vendor);
      console.log('🔍 Found/fallback quality:', quality);
      
      const transformed = {
        ...item,
        vendor,
        quality
      };
      
      console.log('✅ Transformed item:', transformed);
      console.log('✅ Vendor business name:', transformed.vendor?.business_name);
      return transformed;
    });

    console.log('🎉 Using database data:', transformedData.length, 'products');
    console.log('🎉 First product vendor:', transformedData[0]?.vendor?.business_name);
    return transformedData;

  } catch (error) {
    console.log('❌ Error fetching vendor products, using mock data:', error);
    const mockData = MOCK_VENDOR_PRODUCTS.filter(p => p.model_id === modelId && p.category_id === categoryId);
    console.log('🎭 Fallback to mock data:', mockData.length, 'products');
    return mockData;
  }
};

const Order = () => {
  // Use cart context instead of local state
  const { cart, addToCart: addToCartContext, totalItems } = useCart();
  
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
  
  // Cart modal state
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Reset search term on step change to avoid filtering issues between steps
  useEffect(() => {
    setSearchTerm('');
  }, [step]);

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
      console.log('🔄 Loading vendor products for:', { modelId, categoryId });
      const data = await fetchVendorProducts(modelId, categoryId);
      console.log('📦 Vendor products loaded:', data.length, data);
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
          // Add null checks to prevent errors
          const vendorName = product.vendor?.business_name || '';
          const qualityName = product.quality?.name || '';
          const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              qualityName.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStock = filterStock === 'all' || (filterStock === 'in-stock' && product.is_in_stock);
          return matchesSearch && matchesStock;
        });
        
        // Sort products
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'price':
              return a.price - b.price;
            case 'rating':
              return (b.vendor?.rating || 0) - (a.vendor?.rating || 0);
            case 'reviews':
              return (b.vendor?.total_reviews || 0) - (a.vendor?.total_reviews || 0);
            default:
              return 0;
          }
        });
        break;
    }
    
    return filtered;
  };

  // Updated cart function to use context
  const handleAddToCart = async (product: VendorProduct) => {
    try {
      console.log('🎯 Adding product to cart:', product.id);
      await addToCartContext(product.id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
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
                      <span>{product.vendor?.business_name || 'Unknown Vendor'}</span>
                      {product.vendor?.is_verified && (
                        <Verified className="h-4 w-4 text-blue-500" />
                      )}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {(product.vendor?.rating || 0).toFixed(1)} ({product.vendor?.total_reviews || 0})
                        </span>
                      </div>
                    </div>
                    {product.vendor?.business_city && (
                      <p className="text-sm text-gray-500">
                        {product.vendor.business_city}, {product.vendor.business_state}
                      </p>
                    )}
                  </div>
                  <Badge 
                    className={getQualityColor(product.quality?.name || '')}
                    variant="outline"
                  >
                    {product.quality?.name || 'Unknown Quality'}
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
                    Verified: {product.vendor?.is_verified ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  onClick={() => handleAddToCart(product)}
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
        cartItems={totalItems} 
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
              <span>Cart ({totalItems})</span>
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
      />
    </div>
  );
};

export default Order; 
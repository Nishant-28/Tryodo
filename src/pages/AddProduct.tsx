import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Smartphone, Cable, Upload, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
}

interface Model {
  id: string;
  model_name: string;
  model_number?: string;
  brand_id: string;
  brand_name?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  gradient?: string;
}

interface QualityType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

interface GenericProduct {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  specifications?: any;
}

interface PhoneProductForm {
  model_id: string;
  category_id: string;
  quality_type_id: string;
  price: string;
  original_price: string;
  warranty_months: string;
  stock_quantity: string;
  delivery_time_days: string;
  product_images: string[];
  specifications: { [key: string]: string };
}

interface GenericProductForm {
  generic_product_id: string;
  quality_type_id: string;
  price: string;
  original_price: string;
  warranty_months: string;
  stock_quantity: string;
  delivery_time_days: string;
  product_images: string[];
  specifications: { [key: string]: string };
}

const AddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [vendorId, setVendorId] = useState<string | null>(null);
  // State for master data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTypes, setQualityTypes] = useState<QualityType[]>([]);
  const [genericProducts, setGenericProducts] = useState<GenericProduct[]>([]);
  
  // State for form data
  const [activeTab, setActiveTab] = useState('phone');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [phoneForm, setPhoneForm] = useState<PhoneProductForm>({
    model_id: '',
    category_id: '',
    quality_type_id: '',
    price: '',
    original_price: '',
    warranty_months: '6',
    stock_quantity: '',
    delivery_time_days: '3',
    product_images: [''],
    specifications: {}
  });
  
  const [genericForm, setGenericForm] = useState<GenericProductForm>({
    generic_product_id: '',
    quality_type_id: '',
    price: '',
    original_price: '',
    warranty_months: '6',
    stock_quantity: '',
    delivery_time_days: '3',
    product_images: [''],
    specifications: {}
  });

  useEffect(() => {
    if (profile) {
      console.log('AddProduct: Current profile:', profile);
      if (profile.role === 'vendor') {
        const fetchVendorId = async () => {
          try {
            console.log('AddProduct: Fetching vendor ID for profile:', profile);
            
            // The profile object already contains the profile ID from the database
            const profileId = profile.id;
            console.log('AddProduct: Using profile ID:', profileId);

            // Get vendor ID using the profile ID directly
            const { data: vendorData, error: vendorError } = await supabase
              .from('vendors')
              .select('id, business_name')
              .eq('profile_id', profileId)
              .single();

            console.log('AddProduct: Vendor query result:', { vendorData, vendorError });

            if (vendorError) {
              console.error('AddProduct: Vendor query error:', vendorError);
              toast({
                title: "Error",
                description: "Could not find vendor account. Please contact support.",
                variant: "destructive",
              });
              return;
            }

            if (!vendorData) {
              console.error('AddProduct: No vendor data found');
              toast({
                title: "Error", 
                description: "Vendor account not found. Please contact support.",
                variant: "destructive",
              });
              return;
            }

            console.log('AddProduct: Setting vendor ID:', vendorData.id);
            setVendorId(vendorData.id);
            
            toast({
              title: "Success",
              description: `Connected to vendor account: ${vendorData.business_name}`,
            });
          } catch (error) {
            console.error('AddProduct: Error fetching vendor ID:', error);
            toast({
              title: "Error",
              description: "Failed to load vendor information.",
              variant: "destructive",
            });
          }
        };

        fetchVendorId();
      } else {
        console.log('AddProduct: User is not a vendor, role:', profile.role);
        toast({
          title: "Access Denied",
          description: "Only vendors can add products.",
          variant: "destructive",
        });
      }
    } else {
      console.log('AddProduct: No profile available');
    }
  }, [profile, toast]);

  // Load master data on component mount
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('*')
          .order('name');

        if (brandsError) {
          throw brandsError;
        }
        setBrands(brandsData || []);
        console.log("Brands loaded:", brandsData);

        // Load models with brand names
        const { data: modelsData, error: modelsError } = await supabase
          .from('smartphone_models')
          .select(`
            *,
            brands!inner(name)
          `)
          .eq('is_active', true)
          .order('model_name');
        
        if (modelsError) {
          console.error('Error loading models:', modelsError);
          throw modelsError;
        }
        const modelsWithBrandNames = modelsData?.map(model => ({
          ...model,
          brand_name: model.brands?.name || ''
        })) || [];
        setModels(modelsWithBrandNames);
        console.log("Models loaded:", modelsWithBrandNames);

        // Load categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (categoriesError) {
          console.error('Error loading categories:', categoriesError);
          throw categoriesError;
        }
        setCategories(categoriesData || []);
        console.log("Categories loaded:", categoriesData);

        // Load quality types (corrected table name)
        const { data: qualityTypesData, error: qualityTypesError } = await supabase
          .from('quality_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (qualityTypesError) {
          console.error('Error loading quality types:', qualityTypesError);
          throw qualityTypesError;
        }
        setQualityTypes(qualityTypesData || []);
        console.log("Quality types loaded:", qualityTypesData);

        // Load generic products
        const { data: genericProductsData, error: genericProductsError } = await supabase
          .from('generic_products')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (genericProductsError) {
          console.error('Error loading generic products:', genericProductsError);
          throw genericProductsError;
        }
        setGenericProducts(genericProductsData || []);
        console.log("Generic products loaded:", genericProductsData);

      } catch (error) {
        console.error('Error loading master data:', error);
        toast({
          title: "Error",
          description: "Failed to load product data. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    loadMasterData();
  }, []);

  // Filter models when brand changes
  const filteredModels = models.filter(model => {
    return selectedBrand === '' || model.brand_id === selectedBrand;
  });

  // Quality types are global and apply to all categories, so no filtering needed
  const filteredQualityTypes = qualityTypes;

  // Filter generic products when category changes
  const filteredGenericProducts = genericProducts.filter(gp => 
    selectedCategory === '' || gp.category_id === selectedCategory
  );

  const handleImageAdd = (formType: 'phone' | 'generic') => {
    if (formType === 'phone') {
      setPhoneForm(prev => ({
        ...prev,
        product_images: [...prev.product_images, '']
      }));
    } else {
      setGenericForm(prev => ({
        ...prev,
        product_images: [...prev.product_images, '']
      }));
    }
  };

  const handleImageRemove = (index: number, formType: 'phone' | 'generic') => {
    if (formType === 'phone') {
      setPhoneForm(prev => ({
        ...prev,
        product_images: prev.product_images.filter((_, i) => i !== index)
      }));
    } else {
      setGenericForm(prev => ({
        ...prev,
        product_images: prev.product_images.filter((_, i) => i !== index)
      }));
    }
  };

  const handleImageChange = (index: number, value: string, formType: 'phone' | 'generic') => {
    if (formType === 'phone') {
      setPhoneForm(prev => ({
        ...prev,
        product_images: prev.product_images.map((img, i) => i === index ? value : img)
      }));
    } else {
      setGenericForm(prev => ({
        ...prev,
        product_images: prev.product_images.map((img, i) => i === index ? value : img)
      }));
    }
  };

  const handleSpecificationAdd = (formType: 'phone' | 'generic') => {
    const newKey = `spec_${Date.now()}`;
    if (formType === 'phone') {
      setPhoneForm(prev => ({
        ...prev,
        specifications: { ...prev.specifications, [newKey]: '' }
      }));
    } else {
      setGenericForm(prev => ({
        ...prev,
        specifications: { ...prev.specifications, [newKey]: '' }
      }));
    }
  };

  const handleSpecificationRemove = (key: string, formType: 'phone' | 'generic') => {
    if (formType === 'phone') {
      setPhoneForm(prev => {
        const newSpecs = { ...prev.specifications };
        delete newSpecs[key];
        return { ...prev, specifications: newSpecs };
      });
    } else {
      setGenericForm(prev => {
        const newSpecs = { ...prev.specifications };
        delete newSpecs[key];
        return { ...prev, specifications: newSpecs };
      });
    }
  };

  const handleSpecificationChange = (key: string, field: 'key' | 'value', value: string, formType: 'phone' | 'generic') => {
    if (formType === 'phone') {
      setPhoneForm(prev => {
        if (field === 'key') {
          const newSpecs = { ...prev.specifications };
          const oldValue = newSpecs[key];
          delete newSpecs[key];
          newSpecs[value] = oldValue;
          return { ...prev, specifications: newSpecs };
        } else {
          return {
            ...prev,
            specifications: { ...prev.specifications, [key]: value }
          };
        }
      });
    } else {
      setGenericForm(prev => {
        if (field === 'key') {
          const newSpecs = { ...prev.specifications };
          const oldValue = newSpecs[key];
          delete newSpecs[key];
          newSpecs[value] = oldValue;
          return { ...prev, specifications: newSpecs };
        } else {
          return {
            ...prev,
            specifications: { ...prev.specifications, [key]: value }
          };
        }
      });
    }
  };

  const validatePhoneForm = () => {
    const errors: string[] = [];
    
    if (!phoneForm.model_id) errors.push('Please select a phone model');
    if (!phoneForm.category_id) errors.push('Please select a category');
    if (!phoneForm.quality_type_id) errors.push('Please select a quality type');
    if (!phoneForm.price || parseFloat(phoneForm.price) <= 0) errors.push('Please enter a valid price');
    if (!phoneForm.stock_quantity || parseInt(phoneForm.stock_quantity) < 0) errors.push('Please enter a valid stock quantity');
    
    return errors;
  };

  const validateGenericForm = () => {
    const errors: string[] = [];
    
    if (!genericForm.generic_product_id) errors.push('Please select a generic product');
    if (!genericForm.quality_type_id) errors.push('Please select a quality type');
    if (!genericForm.price || parseFloat(genericForm.price) <= 0) errors.push('Please enter a valid price');
    if (!genericForm.stock_quantity || parseInt(genericForm.stock_quantity) < 0) errors.push('Please enter a valid stock quantity');
    
    return errors;
  };

  const submitPhoneProduct = async () => {
    console.log('=== Starting Phone Product Submission ===');
    console.log('Current form state:', phoneForm);
    console.log('Vendor ID:', vendorId);
    console.log('Selected brand:', selectedBrand);
    console.log('Selected category:', selectedCategory);
    
    const errors = validatePhoneForm();
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      toast({
        title: "Validation Error",
        description: errors.join('\n'),
        variant: "destructive",
      });
      return;
    }

    if (!vendorId) {
        console.log('No vendor ID found');
        toast({
            title: "Error",
            description: "Vendor ID is missing. Cannot add product.",
            variant: "destructive",
        });
        return;
    }

    try {
      setLoading(true);
      
      const productData = {
        vendor_id: vendorId,
        model_id: phoneForm.model_id,
        category_id: phoneForm.category_id,
        quality_type_id: phoneForm.quality_type_id,
        price: parseFloat(phoneForm.price),
        original_price: phoneForm.original_price ? parseFloat(phoneForm.original_price) : null,
        warranty_months: parseInt(phoneForm.warranty_months),
        stock_quantity: parseInt(phoneForm.stock_quantity),
        delivery_time_days: parseInt(phoneForm.delivery_time_days),
        product_images: phoneForm.product_images.filter(img => img.trim() !== ''),
        specifications: Object.keys(phoneForm.specifications).length > 0 ? phoneForm.specifications : null,
        is_active: true
      };

      console.log('Submitting product data:', productData);
      console.log('Product data types:', {
        vendor_id: typeof productData.vendor_id,
        model_id: typeof productData.model_id,
        category_id: typeof productData.category_id,
        quality_type_id: typeof productData.quality_type_id,
        price: typeof productData.price,
        warranty_months: typeof productData.warranty_months,
        stock_quantity: typeof productData.stock_quantity,
        delivery_time_days: typeof productData.delivery_time_days,
        product_images: typeof productData.product_images,
        specifications: typeof productData.specifications
      });

      // Check if auth user exists
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      console.log('Current auth user:', authUser?.user?.id);
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('vendor_products')
        .insert(productData)
        .select();

      if (error) {
        console.error('Database error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Product inserted successfully:', data);

      toast({
        title: "Success",
        description: "Phone product added successfully!",
      });

      // Reset form
      setPhoneForm({
        model_id: '',
        category_id: '',
        quality_type_id: '',
        price: '',
        original_price: '',
        warranty_months: '6',
        stock_quantity: '',
        delivery_time_days: '3',
        product_images: [''],
        specifications: {}
      });

      // Reset selections
      setSelectedBrand('');
      setSelectedCategory('');

    } catch (error: any) {
      console.error('Error adding phone product:', error);
      
      let errorMessage = "Failed to add product. Please try again.";
      
      if (error?.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = "This product already exists. Please check if you've already added this combination.";
        } else if (error.message.includes('violates foreign key')) {
          errorMessage = "Invalid selection. Please refresh the page and try again.";
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = "Invalid data entered. Please check your price and quantity values.";
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          errorMessage = "Permission denied. Please make sure you're logged in as a vendor.";
        } else if (error.message.includes('Authentication required')) {
          errorMessage = "Please log in and try again.";
        } else {
          errorMessage = `Database error: ${error.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitGenericProduct = async () => {
    const errors = validateGenericForm();
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join('\n'),
        variant: "destructive",
      });
      return;
    }

    if (!vendorId) {
        toast({
            title: "Error",
            description: "Vendor ID is missing. Cannot add product.",
            variant: "destructive",
        });
        return;
    }

    try {
      setLoading(true);
      
      const productData = {
        vendor_id: vendorId,
        generic_product_id: genericForm.generic_product_id,
        quality_type_id: genericForm.quality_type_id,
        price: parseFloat(genericForm.price),
        original_price: genericForm.original_price ? parseFloat(genericForm.original_price) : null,
        warranty_months: parseInt(genericForm.warranty_months),
        stock_quantity: parseInt(genericForm.stock_quantity),
        delivery_time_days: parseInt(genericForm.delivery_time_days),
        product_images: genericForm.product_images.filter(img => img.trim() !== ''),
        specifications: Object.keys(genericForm.specifications).length > 0 ? genericForm.specifications : null,
        is_active: true
      };

      console.log('Submitting generic product data:', productData);

      const { data, error } = await supabase
        .from('vendor_generic_products')
        .insert(productData)
        .select();

      if (error) {
        console.error('Database error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Generic product inserted successfully:', data);

      toast({
        title: "Success",
        description: "Generic product added successfully!",
      });

      // Reset form
      setGenericForm({
        generic_product_id: '',
        quality_type_id: '',
        price: '',
        original_price: '',
        warranty_months: '6',
        stock_quantity: '',
        delivery_time_days: '3',
        product_images: [''],
        specifications: {}
      });

      // Reset selections
      setSelectedCategory('');

    } catch (error: any) {
      console.error('Error adding generic product:', error);
      
      let errorMessage = "Failed to add product. Please try again.";
      
      if (error?.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = "This product already exists. Please check if you've already added this combination.";
        } else if (error.message.includes('violates foreign key')) {
          errorMessage = "Invalid selection. Please refresh the page and try again.";
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = "Invalid data entered. Please check your price and quantity values.";
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          errorMessage = "Permission denied. Please make sure you're logged in as a vendor.";
        } else {
          errorMessage = `Database error: ${error.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && brands.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading product data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/vendor-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Product</h1>
          <p className="text-gray-600">Add your products to the marketplace with competitive pricing and quality options.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Phone Products
            </TabsTrigger>
            <TabsTrigger value="generic" className="flex items-center gap-2">
              <Cable className="h-4 w-4" />
              Generic Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Add Phone-Specific Product
                </CardTitle>
                <CardDescription>
                  Add products that are specific to particular phone models (displays, batteries, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Brand and Model Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="model">Phone Model</Label>
                    <Select
                      value={phoneForm.model_id}
                      onValueChange={(value) => setPhoneForm(prev => ({ ...prev, model_id: value }))}
                      disabled={!selectedBrand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phone model" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.model_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Category and Quality Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={phoneForm.category_id}
                      onValueChange={(value) => {
                        setPhoneForm(prev => ({ ...prev, category_id: value }));
                        setSelectedCategory(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quality">Quality Type</Label>
                    <Select
                      value={phoneForm.quality_type_id}
                      onValueChange={(value) => setPhoneForm(prev => ({ ...prev, quality_type_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select quality type" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredQualityTypes.map(qt => (
                          <SelectItem key={qt.id} value={qt.id}>
                            <div className="flex flex-col">
                              <span>{qt.name}</span>
                              {qt.description && (
                                <span className="text-xs text-gray-500">{qt.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="Enter selling price"
                      value={phoneForm.price}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="originalPrice">Original Price (₹)</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      placeholder="Enter original price (for discounts)"
                      value={phoneForm.original_price}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, original_price: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Stock and Delivery */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="Available quantity"
                      value={phoneForm.stock_quantity}
                      onChange={(e) => setPhoneForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="warranty">Warranty (Months)</Label>
                    <Select
                      value={phoneForm.warranty_months}
                      onValueChange={(value) => setPhoneForm(prev => ({ ...prev, warranty_months: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Warranty</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                        <SelectItem value="24">24 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="delivery">Delivery Time (Days)</Label>
                    <Select
                      value={phoneForm.delivery_time_days}
                      onValueChange={(value) => setPhoneForm(prev => ({ ...prev, delivery_time_days: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Same Day</SelectItem>
                        <SelectItem value="2">2 Days</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="5">5 Days</SelectItem>
                        <SelectItem value="7">1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product Images */}
                <div>
                  <Label>Product Images *</Label>
                  <div className="space-y-3 mt-2">
                    {phoneForm.product_images.map((image, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Enter image URL"
                          value={image}
                          onChange={(e) => handleImageChange(index, e.target.value, 'phone')}
                        />
                        {phoneForm.product_images.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleImageRemove(index, 'phone')}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleImageAdd('phone')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Image
                    </Button>
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <Label>Product Specifications</Label>
                  <div className="space-y-3 mt-2">
                    {Object.entries(phoneForm.specifications).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          placeholder="Specification name"
                          value={key.startsWith('spec_') ? '' : key}
                          onChange={(e) => handleSpecificationChange(key, 'key', e.target.value, 'phone')}
                        />
                        <Input
                          placeholder="Specification value"
                          value={value}
                          onChange={(e) => handleSpecificationChange(key, 'value', e.target.value, 'phone')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleSpecificationRemove(key, 'phone')}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSpecificationAdd('phone')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Specification
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={submitPhoneProduct} disabled={loading} className="min-w-[120px]">
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Add Product
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cable className="h-5 w-5" />
                  Add Generic Product
                </CardTitle>
                <CardDescription>
                  Add products that are not specific to phone models (cables, chargers, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category and Generic Product Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genericCategory">Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setGenericForm(prev => ({ ...prev, generic_product_id: '', quality_type_id: '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="genericProduct">Generic Product</Label>
                    <Select
                      value={genericForm.generic_product_id}
                      onValueChange={(value) => setGenericForm(prev => ({ ...prev, generic_product_id: value }))}
                      disabled={!selectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select generic product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGenericProducts.map(gp => (
                          <SelectItem key={gp.id} value={gp.id}>
                            <div className="flex flex-col">
                              <span>{gp.name}</span>
                              {gp.description && (
                                <span className="text-xs text-gray-500">{gp.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quality Type */}
                <div>
                  <Label htmlFor="genericQuality">Quality Type</Label>
                  <Select
                    value={genericForm.quality_type_id}
                    onValueChange={(value) => setGenericForm(prev => ({ ...prev, quality_type_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality type" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredQualityTypes.map(qt => (
                        <SelectItem key={qt.id} value={qt.id}>
                          <div className="flex flex-col">
                            <span>{qt.name}</span>
                            {qt.description && (
                              <span className="text-xs text-gray-500">{qt.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genericPrice">Price (₹) *</Label>
                    <Input
                      id="genericPrice"
                      type="number"
                      placeholder="Enter selling price"
                      value={genericForm.price}
                      onChange={(e) => setGenericForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="genericOriginalPrice">Original Price (₹)</Label>
                    <Input
                      id="genericOriginalPrice"
                      type="number"
                      placeholder="Enter original price (for discounts)"
                      value={genericForm.original_price}
                      onChange={(e) => setGenericForm(prev => ({ ...prev, original_price: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Stock and Delivery */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="genericStock">Stock Quantity *</Label>
                    <Input
                      id="genericStock"
                      type="number"
                      placeholder="Available quantity"
                      value={genericForm.stock_quantity}
                      onChange={(e) => setGenericForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="genericWarranty">Warranty (Months)</Label>
                    <Select
                      value={genericForm.warranty_months}
                      onValueChange={(value) => setGenericForm(prev => ({ ...prev, warranty_months: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Warranty</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                        <SelectItem value="24">24 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="genericDelivery">Delivery Time (Days)</Label>
                    <Select
                      value={genericForm.delivery_time_days}
                      onValueChange={(value) => setGenericForm(prev => ({ ...prev, delivery_time_days: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Same Day</SelectItem>
                        <SelectItem value="2">2 Days</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="5">5 Days</SelectItem>
                        <SelectItem value="7">1 Week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product Images */}
                <div>
                  <Label>Product Images *</Label>
                  <div className="space-y-3 mt-2">
                    {genericForm.product_images.map((image, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Enter image URL"
                          value={image}
                          onChange={(e) => handleImageChange(index, e.target.value, 'generic')}
                        />
                        {genericForm.product_images.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleImageRemove(index, 'generic')}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleImageAdd('generic')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Image
                    </Button>
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <Label>Product Specifications</Label>
                  <div className="space-y-3 mt-2">
                    {Object.entries(genericForm.specifications).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <Input
                          placeholder="Specification name"
                          value={key.startsWith('spec_') ? '' : key}
                          onChange={(e) => handleSpecificationChange(key, 'key', e.target.value, 'generic')}
                        />
                        <Input
                          placeholder="Specification value"
                          value={value}
                          onChange={(e) => handleSpecificationChange(key, 'value', e.target.value, 'generic')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleSpecificationRemove(key, 'generic')}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSpecificationAdd('generic')}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Specification
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={submitGenericProduct} disabled={loading} className="min-w-[120px]">
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Add Product
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AddProduct; 
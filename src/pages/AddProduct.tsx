import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Upload, Plus, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  model_name: string;
  brand_id: string;
  brand_name?: string;
}

interface Category {
  id: string;
  name: string;
}

interface QualityType {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
}

// Category-specific quality type mapping
const CATEGORY_QUALITY_MAPPING: Record<string, string[]> = {
  'Batteries': ['Ckoza', 'ORG', 'NFIT', 'RC', 'OG', 'Tray', 'Care', 'Foxconn'],
  'Displays': ['Original', 'OEM', 'A+ Grade', 'TFT', 'Copy'],
  'Charging Connector': ['Original', 'OEM', 'Compatible'],
  'Speakers': ['Original', 'OEM', 'Compatible'],
  'Camera Lens': ['Original', 'OEM', 'Compatible'],
  'Back Camera': ['Original', 'OEM', 'Compatible'],
  'Charging Connector Flex (PCB Board)': ['Original', 'OEM', 'Compatible'],
  'Ear Speaker': ['Original', 'OEM', 'Compatible'],
  'LCD Flex Cable': ['Original', 'OEM', 'Compatible'],
  'Main Board Flex Cable': ['Original', 'OEM', 'Compatible'],
  'ON OFF Flex (PCB)': ['Original', 'OEM', 'Compatible'],
  'Volume Button Flex Cable': ['Original', 'OEM', 'Compatible'],
  'Ringer': ['Original', 'OEM', 'Compatible'],
  'Back Panel': ['Original', 'OEM', 'A+ Grade', 'B+ Grade'],
  'Battery Connector': ['Original', 'OEM', 'Compatible'],
  'Power Button Outer': ['Original', 'OEM', 'Compatible'],
  'Volume Button Outer': ['Original', 'OEM', 'Compatible'],
  'Sim Tray Holder': ['Original', 'OEM', 'Compatible'],
  'Glue Paste': ['3M', 'Tesa'],
}

interface PhoneProductForm {
  model_id: string;
  category_id: string;
  quality_type_id: string;
  price: string;
  original_price: string;
  warranty_months: string;
  stock_quantity: string;
}

interface BulkUploadRow {
  brand: string;
  model: string;
  category: string;
  quality: string;
  price: string;
  original_price?: string;
  warranty?: string;
  stock: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
  row_number: number;
}

const AddProduct = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityTypes, setQualityTypes] = useState<QualityType[]>([]);
  const [filteredQualityTypes, setFilteredQualityTypes] = useState<QualityType[]>([]);
  
  const [activeTab, setActiveTab] = useState('phone');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Form states - simplified without delivery_time_days, product_images, specifications
  const [phoneForm, setPhoneForm] = useState<PhoneProductForm>({
    model_id: '',
    category_id: '',
    quality_type_id: '',
    price: '',
    original_price: '',
    warranty_months: '6',
    stock_quantity: ''
  });

  // Bulk upload states
  const [bulkUploadData, setBulkUploadData] = useState<BulkUploadRow[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{success: number, failed: number, errors: string[]}>({
    success: 0,
    failed: 0,
    errors: []
  });

  useEffect(() => {
    if (profile?.role === 'vendor') {
      fetchVendorId();
    }
  }, [profile]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const fetchVendorId = async () => {
    try {
      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('profile_id', profile!.id)
        .single();

      if (error || !vendorData) {
        toast({
          title: "Error",
          description: "Could not find vendor account. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      setVendorId(vendorData.id);
      toast({
        title: "Success",
        description: `Connected to vendor account: ${vendorData.business_name}`,
      });
    } catch (error) {
      console.error('Error fetching vendor ID:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor information.",
        variant: "destructive",
      });
    }
  };

  const loadMasterData = async () => {
    try {
      // Load data sequentially to better identify which query fails
      const brandsResult = await supabase.from('brands').select('*').order('name');
      if (brandsResult.error) {
        console.error('Error loading brands:', brandsResult.error);
        throw brandsResult.error;
      }
      setBrands(brandsResult.data || []);

      const modelsResult = await supabase.from('smartphone_models').select('*, brands!inner(name)').eq('is_active', true).order('model_name');
      if (modelsResult.error) {
        console.error('Error loading models:', modelsResult.error);
        throw modelsResult.error;
      }
      setModels(modelsResult.data?.map(model => ({
        ...model,
        brand_name: model.brands?.name || ''
      })) || []);

      const categoriesResult = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      if (categoriesResult.error) {
        console.error('Error loading categories:', categoriesResult.error);
        throw categoriesResult.error;
      }
      setCategories(categoriesResult.data || []);

      const qualityTypesResult = await supabase.from('category_qualities').select('*').eq('is_active', true).order('sort_order');
      if (qualityTypesResult.error) {
        console.error('Error loading quality types:', qualityTypesResult.error);
        throw qualityTypesResult.error;
      }
      const qualityTypesData = qualityTypesResult.data?.map(qt => ({
        id: qt.id,
        name: qt.quality_name,
        description: qt.quality_description,
        category_id: qt.category_id,
        category_name: null
      })) || [];
      setQualityTypes(qualityTypesData);

    } catch (error) {
      console.error('Error loading master data:', error);
      toast({
        title: "Error",
        description: "Failed to load product data. Please check your network connection and try again.",
        variant: "destructive",
      });
    }
  };

  const filteredModels = models.filter(model => 
    selectedBrand === '' || model.brand_id === selectedBrand
  );

  // Function to get category-specific quality types
  const getCategoryQualityTypes = (categoryName: string): QualityType[] => {
    // Filter quality types by category
    const category = categories.find(c => c.name === categoryName);
    if (!category) return qualityTypes;
    
    return qualityTypes.filter(qt => qt.category_id === category.id);
  };

  // Update filtered quality types when category changes
  useEffect(() => {
    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category) {
        const categorySpecificQualityTypes = qualityTypes.filter(qt => qt.category_id === category.id);
        setFilteredQualityTypes(categorySpecificQualityTypes);
      } else {
        setFilteredQualityTypes([]);
      }
    } else {
      setFilteredQualityTypes([]);
    }
  }, [qualityTypes, selectedCategory, categories]);

  const validatePhoneForm = () => {
    const errors: string[] = [];
    if (!phoneForm.model_id) errors.push('Please select a phone model');
    if (!phoneForm.category_id) errors.push('Please select a category');
    if (!phoneForm.quality_type_id) errors.push('Please select a quality type');
    if (!phoneForm.price || parseFloat(phoneForm.price) <= 0) errors.push('Please enter a valid price');
    if (!phoneForm.stock_quantity || parseInt(phoneForm.stock_quantity) < 0) errors.push('Please enter a valid stock quantity');
    return errors;
  };

  const submitPhoneProduct = async () => {
    console.log('submitPhoneProduct called');
    console.log('Current phoneForm:', phoneForm);
    console.log('Current vendorId:', vendorId);
    
    const errors = validatePhoneForm();
    console.log('Validation errors:', errors);
    
    if (errors.length > 0) {
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
      console.log('Starting product creation...');
      
      const productData = {
        vendor_id: vendorId,
        model_id: phoneForm.model_id,
        category_id: phoneForm.category_id,
        quality_type_id: phoneForm.quality_type_id,
        price: parseFloat(phoneForm.price),
        original_price: phoneForm.original_price ? parseFloat(phoneForm.original_price) : null,
        warranty_months: parseInt(phoneForm.warranty_months),
        stock_quantity: parseInt(phoneForm.stock_quantity),
        is_active: true
      };

      console.log('Product data to insert:', productData);

      const { data, error } = await supabase
        .from('vendor_products')
        .insert(productData)
        .select();

      console.log('Supabase response:', { data, error });

      if (error) throw error;

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
        stock_quantity: ''
      });
      setSelectedBrand('');
      setSelectedCategory('');

    } catch (error: any) {
      console.error('Error adding phone product:', error);
      toast({
        title: "Error",
        description: `Failed to add product: ${error.message || error}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // CSV Upload functionality
  const downloadSampleCSV = () => {
    const sampleData = [
      ['Brand', 'Model', 'Category', 'Quality', 'Price', 'Original Price (Optional)', 'Warranty Months (Optional)', 'Stock'],
      ['Apple', 'iPhone 14', 'Displays', 'Original', '12000', '15000', '12', '10'],
      ['Samsung', 'Galaxy S23', 'Batteries', 'ORG', '8000', '10000', '6', '25'],
      ['OnePlus', 'OnePlus 11', 'Displays', 'TFT', '18000', '', '24', '5']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_products.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file must contain at least a header and one data row.",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const expectedHeaders = ['Brand', 'Model', 'Category', 'Quality', 'Price', 'Original Price (Optional)', 'Warranty Months (Optional)', 'Stock'];
      
      if (headers.length < 5) {
        toast({
          title: "Error",
          description: "CSV file must contain at least Brand, Model, Category, Quality, and Price columns.",
          variant: "destructive",
        });
        return;
      }

      const data: BulkUploadRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 5) {
          data.push({
            brand: values[0],
            model: values[1],
            category: values[2],
            quality: values[3],
            price: values[4],
            original_price: values[5] || '',
            warranty: values[6] || '6',
            stock: values[7] || '0',
            status: 'pending',
            row_number: i + 1
          });
        }
      }

      setBulkUploadData(data);
      toast({
        title: "Success",
        description: `Loaded ${data.length} products from CSV file.`,
      });
    };

    reader.readAsText(file);
  };

  const processBulkUpload = async () => {
    if (!vendorId) {
      toast({
        title: "Error",
        description: "Vendor ID is missing. Cannot upload products.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    for (let i = 0; i < bulkUploadData.length; i++) {
      const row = bulkUploadData[i];
      
      try {
        // Find brand
        const brand = brands.find(b => b.name.toLowerCase() === row.brand.toLowerCase());
        if (!brand) {
          throw new Error(`Brand "${row.brand}" not found`);
        }

        // Find model
        const model = models.find(m => 
          m.model_name.toLowerCase() === row.model.toLowerCase() && 
          m.brand_id === brand.id
        );
        if (!model) {
          throw new Error(`Model "${row.model}" not found for brand "${row.brand}"`);
        }

        // Find category
        const category = categories.find(c => c.name.toLowerCase() === row.category.toLowerCase());
        if (!category) {
          throw new Error(`Category "${row.category}" not found`);
        }

        // Find quality type
        const qualityType = qualityTypes.find(qt => 
          qt.name.toLowerCase() === row.quality.toLowerCase() && 
          qt.category_id === category.id
        );
        if (!qualityType) {
          throw new Error(`Quality type "${row.quality}" not found for category "${row.category}"`);
        }

        // Validate price
        const price = parseFloat(row.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price: ${row.price}`);
        }

        // Validate stock
        const stock = parseInt(row.stock);
        if (isNaN(stock) || stock < 0) {
          throw new Error(`Invalid stock quantity: ${row.stock}`);
        }

        // Prepare product data
        const productData = {
          vendor_id: vendorId,
          model_id: model.id,
          category_id: category.id,
          quality_type_id: qualityType.id,
          price: price,
          original_price: row.original_price ? parseFloat(row.original_price) : null,
          warranty_months: row.warranty ? parseInt(row.warranty) : 6,
          stock_quantity: stock,
          is_active: true
        };

        // Insert product
        const { error } = await supabase
          .from('vendor_products')
          .insert(productData);

        if (error) throw error;

        // Update row status
        setBulkUploadData(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'success' as const } : item
        ));
        
        results.success++;
        
      } catch (error: any) {
        console.error(`Error processing row ${i + 1}:`, error);
        
        // Update row status
        setBulkUploadData(prev => prev.map((item, index) => 
          index === i ? { ...item, status: 'error' as const, error: error.message } : item
        ));
        
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
      
      // Update progress
      setUploadProgress(((i + 1) / bulkUploadData.length) * 100);
    }

    setIsUploading(false);
    setUploadResults(results);
    
    toast({
      title: results.failed > 0 ? "Upload Completed with Errors" : "Upload Successful",
      description: `Successfully added ${results.success} products. ${results.failed} failed.`,
      variant: results.failed > 0 ? "destructive" : "default",
    });
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Products</h1>
          <p className="text-gray-600">Add your products individually or upload them in bulk for faster processing.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
            <TabsTrigger 
              value="phone" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
            >
              <Smartphone className="h-4 w-4 mr-2" /> Phone Products
            </TabsTrigger>
            <TabsTrigger 
              value="bulk" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200"
            >
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </TabsTrigger>
          </TabsList>

          {/* Phone Products Tab */}
          <TabsContent value="phone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">Add New Phone Product</CardTitle>
                <CardDescription className="text-gray-600">
                  List a specific smartphone model with its category and quality type.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger id="brand">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select
                      value={phoneForm.model_id}
                      onValueChange={(value) => setPhoneForm({ ...phoneForm, model_id: value })}
                      disabled={!selectedBrand}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>{model.model_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={phoneForm.category_id}
                      onValueChange={(value) => {
                        setPhoneForm(prev => ({ ...prev, category_id: value, quality_type_id: '' }));
                        const selectedCat = categories.find(cat => cat.id === value);
                        if (selectedCat) {
                          setFilteredQualityTypes(getCategoryQualityTypes(selectedCat.name));
                        }
                      }}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quality">Quality Type</Label>
                    <Select
                      value={phoneForm.quality_type_id}
                      onValueChange={(value) => setPhoneForm({ ...phoneForm, quality_type_id: value })}
                      disabled={!phoneForm.category_id}
                    >
                      <SelectTrigger id="quality">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredQualityTypes.map((quality) => (
                          <SelectItem key={quality.id} value={quality.id}>{quality.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="e.g., 1500"
                      value={phoneForm.price}
                      onChange={(e) => setPhoneForm({ ...phoneForm, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original-price">Original Price (Optional, ₹)</Label>
                    <Input
                      id="original-price"
                      type="number"
                      placeholder="e.g., 2000"
                      value={phoneForm.original_price}
                      onChange={(e) => setPhoneForm({ ...phoneForm, original_price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warranty">Warranty (Months)</Label>
                    <Input
                      id="warranty"
                      type="number"
                      placeholder="e.g., 6"
                      value={phoneForm.warranty_months}
                      onChange={(e) => setPhoneForm({ ...phoneForm, warranty_months: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="e.g., 100"
                      value={phoneForm.stock_quantity}
                      onChange={(e) => setPhoneForm({ ...phoneForm, stock_quantity: e.target.value })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    console.log('Button clicked!');
                    submitPhoneProduct();
                  }} 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Adding Product...' : 'Add Phone Product'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Upload Products
                </CardTitle>
                <CardDescription>
                  Upload multiple products at once using a CSV file. Download the sample template to get started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> For phone models, use exact model names as they appear in our system. 
                    Categories and Quality types must match exactly. Use the sample CSV as a reference.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={downloadSampleCSV} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                  
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {bulkUploadData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Preview ({bulkUploadData.length} products)</h3>
                      <Button 
                        onClick={processBulkUpload} 
                        disabled={isUploading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isUploading ? 'Uploading...' : 'Upload All Products'}
                      </Button>
                    </div>

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Upload Progress</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {uploadResults.success > 0 || uploadResults.failed > 0 ? (
                      <div className="space-y-2">
                        <div className="flex gap-4">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            ✓ Success: {uploadResults.success}
                          </Badge>
                          {uploadResults.failed > 0 && (
                            <Badge variant="destructive">
                              ✗ Failed: {uploadResults.failed}
                            </Badge>
                          )}
                        </div>
                        {uploadResults.errors.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                              {uploadResults.errors.slice(0, 10).map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                              {uploadResults.errors.length > 10 && (
                                <li className="text-red-600">... and {uploadResults.errors.length - 10} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 border-b">Status</th>
                            <th className="text-left p-2 border-b">Brand</th>
                            <th className="text-left p-2 border-b">Model</th>
                            <th className="text-left p-2 border-b">Category</th>
                            <th className="text-left p-2 border-b">Quality</th>
                            <th className="text-left p-2 border-b">Price</th>
                            <th className="text-left p-2 border-b">Stock</th>
                            <th className="text-left p-2 border-b">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkUploadData.map((row, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">
                                {row.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {row.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                                {row.status === 'pending' && <div className="h-4 w-4 bg-gray-300 rounded-full"></div>}
                              </td>
                              <td className="p-2">{row.brand}</td>
                              <td className="p-2">{row.model}</td>
                              <td className="p-2">{row.category}</td>
                              <td className="p-2">{row.quality}</td>
                              <td className="p-2">₹{row.price}</td>
                              <td className="p-2">{row.stock}</td>
                              <td className="p-2 text-red-600 text-xs">{row.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AddProduct; 
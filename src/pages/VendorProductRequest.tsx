import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, DollarSign, Clock, Truck, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
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
}

interface RequestForm {
  proposed_price: string;
  stock_quantity: string;
  delivery_time_hours: string;
  special_terms: string;
  business_justification: string;
}

const VendorProductRequest = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  // State management
  const [product, setProduct] = useState<MarketProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [form, setForm] = useState<RequestForm>({
    proposed_price: '',
    stock_quantity: '',
    delivery_time_hours: '',
    special_terms: '',
    business_justification: ''
  });

  // Validation errors
  const [errors, setErrors] = useState<Partial<RequestForm>>({});

  // Load data on component mount
  useEffect(() => {
    if (productId && profile?.id) {
      loadProductData();
    }
  }, [productId, profile?.id]);

  const loadProductData = async () => {
    if (!profile?.id) {
      console.log('VendorProductRequest: Profile not loaded yet, skipping data load');
      return;
    }

    console.log('VendorProductRequest: Profile loaded:', profile);
    console.log('VendorProductRequest: Profile role:', profile.role);

    if (profile.role !== 'vendor') {
      console.error('VendorProductRequest: User is not a vendor, role:', profile.role);
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

      if (!productId) {
        toast({
          title: "Error",
          description: "Product ID is required.",
          variant: "destructive",
        });
        navigate('/vendor/market-products');
        return;
      }

      console.log('VendorProductRequest: Loading data for vendor profile:', profile?.id);

      // Get current vendor with better error handling
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      console.log('VendorProductRequest: Vendor query result:', { vendorData, vendorError });

      if (vendorError) {
        console.error('VendorProductRequest: Error fetching vendor:', vendorError);
        
        // Try to create a vendor record if it doesn't exist
        if (vendorError.code === 'PGRST116') {
          console.log('VendorProductRequest: No vendor record found, attempting to create one...');
          
          // Get profile information
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', profile?.id)
            .single();

          if (profileError) {
            console.error('VendorProductRequest: Error fetching profile:', profileError);
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
            console.error('VendorProductRequest: Error creating vendor record:', createError);
            toast({
              title: "Error",
              description: "Unable to create vendor profile. Please contact support.",
              variant: "destructive",
            });
            return;
          }

          console.log('VendorProductRequest: Created new vendor record:', newVendor);
          // Continue with the new vendor
          await loadProductAndRequestData(newVendor.id);
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
        console.error('VendorProductRequest: No vendor data returned');
        toast({
          title: "Error",
          description: "Vendor profile not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Load product data and check existing requests
      await loadProductAndRequestData(vendorData.id);
    } catch (error) {
      console.error('VendorProductRequest: Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load product data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadProductAndRequestData = async (vendorId: string) => {
    try {
      // Check if vendor already has a request for this product
      const { data: existingRequest } = await supabase
        .from('market_vendor_product_requests')
        .select('status')
        .eq('vendor_id', vendorId)
        .eq('market_product_id', productId)
        .single();

      if (existingRequest) {
        toast({
          title: "Request Already Exists",
          description: `You already have a ${existingRequest.status} request for this product.`,
          variant: "destructive",
        });
        navigate('/vendor/market-products');
        return;
      }

      // Load product data
      const { data: productData, error: productError } = await supabase
        .from('market_products')
        .select(`
          *,
          category:market_categories(name),
          brand:market_brands(name)
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (productError || !productData) {
        console.error('Error loading product:', productError);
        toast({
          title: "Error",
          description: "Product not found or not available.",
          variant: "destructive",
        });
        navigate('/vendor/market-products');
        return;
      }

      // Get additional product data
      const { count: vendorCount } = await supabase
        .from('market_vendor_products')
        .select('*', { count: 'exact', head: true })
        .eq('market_product_id', productId)
        .eq('is_active', true);

      // Get price range
      const { data: priceData } = await supabase
        .from('market_vendor_products')
        .select('price')
        .eq('market_product_id', productId)
        .eq('is_active', true);

      const prices = priceData?.map(p => p.price) || [];
      const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;

      // Get average delivery time
      const { data: deliveryData } = await supabase
        .from('market_vendor_products')
        .select('delivery_time_hours')
        .eq('market_product_id', productId)
        .eq('is_active', true);

      const deliveryTimes = deliveryData?.map(d => d.delivery_time_hours) || [];
      const avgDeliveryHours = deliveryTimes.length > 0 
        ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
        : undefined;

      setProduct({
        ...productData,
        vendor_count: vendorCount || 0,
        min_price: minPrice,
        max_price: maxPrice,
        avg_delivery_hours: avgDeliveryHours
      });

    } catch (error) {
      console.error('Error loading product data:', error);
      toast({
        title: "Error",
        description: "Failed to load product data. Please try again.",
        variant: "destructive",
      });
      navigate('/vendor/market-products');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RequestForm> = {};

    // Proposed price validation
    if (!form.proposed_price.trim()) {
      newErrors.proposed_price = 'Proposed price is required';
    } else {
      const price = parseFloat(form.proposed_price);
      if (isNaN(price) || price <= 0) {
        newErrors.proposed_price = 'Please enter a valid price greater than 0';
      }
    }

    // Stock quantity validation
    if (!form.stock_quantity.trim()) {
      newErrors.stock_quantity = 'Stock quantity is required';
    } else {
      const quantity = parseInt(form.stock_quantity);
      if (isNaN(quantity) || quantity < 0) {
        newErrors.stock_quantity = 'Please enter a valid quantity (0 or greater)';
      }
    }

    // Delivery time validation
    if (!form.delivery_time_hours.trim()) {
      newErrors.delivery_time_hours = 'Delivery time is required';
    } else {
      const hours = parseInt(form.delivery_time_hours);
      if (isNaN(hours) || hours <= 0) {
        newErrors.delivery_time_hours = 'Please enter a valid delivery time greater than 0';
      }
    }

    // Business justification validation
    if (!form.business_justification.trim()) {
      newErrors.business_justification = 'Business justification is required';
    } else if (form.business_justification.trim().length < 50) {
      newErrors.business_justification = 'Please provide at least 50 characters explaining your business case';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Get current vendor
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();

      if (!vendorData) {
        toast({
          title: "Error",
          description: "Vendor profile not found.",
          variant: "destructive",
        });
        return;
      }

      // Create the request
      const requestData = {
        vendor_id: vendorData.id,
        market_product_id: productId,
        proposed_price: parseFloat(form.proposed_price),
        stock_quantity: parseInt(form.stock_quantity),
        delivery_time_hours: parseInt(form.delivery_time_hours),
        special_terms: form.special_terms.trim() || null,
        business_justification: form.business_justification.trim(),
        status: 'pending'
      };

      const { error } = await supabase
        .from('market_vendor_product_requests')
        .insert([requestData]);

      if (error) {
        console.error('Error submitting request:', error);
        
        if (error.code === '23505') {
          toast({
            title: "Request Already Exists",
            description: "You already have a request for this product.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to submit request. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Request Submitted Successfully",
        description: "Your product request has been submitted for admin review.",
      });

      // Navigate back to marketplace products
      navigate('/vendor/market-products');

    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RequestForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
              <p className="text-gray-600">Loading product details...</p>
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
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Product Not Found</h3>
              <p className="text-gray-600 mb-4">The requested product could not be found.</p>
              <Button onClick={() => navigate('/vendor/market-products')}>
                Back to Marketplace
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/vendor/market-products')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Request to Sell Product</h1>
            <p className="text-gray-600 mt-1">Submit your proposal to sell this marketplace product</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.images.length > 0 && (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                )}
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex gap-2 mb-3">
                    <Badge variant="outline">{product.category?.name}</Badge>
                    <Badge variant="outline">{product.brand?.name}</Badge>
                  </div>
                  {product.description && (
                    <p className="text-gray-600 mb-4">{product.description}</p>
                  )}
                </div>

                {/* Market Competition Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Current Vendors</p>
                    <p className="text-lg font-semibold">{product.vendor_count}</p>
                  </div>
                  {product.min_price && (
                    <div>
                      <p className="text-sm text-gray-600">Price Range</p>
                      <p className="text-lg font-semibold">
                        ₹{product.min_price}
                        {product.max_price && product.max_price !== product.min_price && ` - ₹${product.max_price}`}
                      </p>
                    </div>
                  )}
                  {product.avg_delivery_hours && (
                    <div>
                      <p className="text-sm text-gray-600">Avg Delivery</p>
                      <p className="text-lg font-semibold">{product.avg_delivery_hours}h</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Competition</p>
                    <p className="text-lg font-semibold">
                      {product.vendor_count === 0 ? 'None' : 
                       product.vendor_count === 1 ? 'Low' :
                       product.vendor_count <= 3 ? 'Medium' : 'High'}
                    </p>
                  </div>
                </div>

                {/* Specifications */}
                {Object.keys(product.specifications).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Specifications</h4>
                    <div className="space-y-1">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600">{key}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Request Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Proposal
                </CardTitle>
                <CardDescription>
                  Provide your pricing, inventory, and business details for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Pricing Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium text-gray-900">Pricing & Inventory</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="proposed_price">Proposed Price (₹) *</Label>
                      <Input
                        id="proposed_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.proposed_price}
                        onChange={(e) => handleInputChange('proposed_price', e.target.value)}
                        placeholder="Enter your selling price"
                        className={errors.proposed_price ? 'border-red-500' : ''}
                      />
                      {errors.proposed_price && (
                        <p className="text-sm text-red-600 mt-1">{errors.proposed_price}</p>
                      )}
                      {product.min_price && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current market range: ₹{product.min_price} - ₹{product.max_price || product.min_price}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="stock_quantity">Initial Stock Quantity *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={form.stock_quantity}
                        onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                        placeholder="Enter initial stock quantity"
                        className={errors.stock_quantity ? 'border-red-500' : ''}
                      />
                      {errors.stock_quantity && (
                        <p className="text-sm text-red-600 mt-1">{errors.stock_quantity}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Delivery & Service</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="delivery_time_hours">Delivery Time (Hours) *</Label>
                      <Input
                        id="delivery_time_hours"
                        type="number"
                        min="1"
                        value={form.delivery_time_hours}
                        onChange={(e) => handleInputChange('delivery_time_hours', e.target.value)}
                        placeholder="Enter delivery time in hours"
                        className={errors.delivery_time_hours ? 'border-red-500' : ''}
                      />
                      {errors.delivery_time_hours && (
                        <p className="text-sm text-red-600 mt-1">{errors.delivery_time_hours}</p>
                      )}
                      {product.avg_delivery_hours && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current market average: {product.avg_delivery_hours} hours
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="special_terms">Special Terms & Conditions</Label>
                      <Textarea
                        id="special_terms"
                        value={form.special_terms}
                        onChange={(e) => handleInputChange('special_terms', e.target.value)}
                        placeholder="Any special terms, warranties, or conditions you offer (optional)"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Business Justification */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium text-gray-900">Business Case</h4>
                    </div>
                    
                    <div>
                      <Label htmlFor="business_justification">Business Justification *</Label>
                      <Textarea
                        id="business_justification"
                        value={form.business_justification}
                        onChange={(e) => handleInputChange('business_justification', e.target.value)}
                        placeholder="Explain why you want to sell this product, your experience, target market, marketing strategy, etc. (minimum 50 characters)"
                        rows={4}
                        className={errors.business_justification ? 'border-red-500' : ''}
                      />
                      {errors.business_justification && (
                        <p className="text-sm text-red-600 mt-1">{errors.business_justification}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {form.business_justification.length}/50 characters minimum
                      </p>
                    </div>
                  </div>

                  {/* Important Notice */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your request will be reviewed by our admin team. You'll be notified once a decision is made. 
                      Approved requests will allow you to start selling this product on the marketplace.
                    </AlertDescription>
                  </Alert>

                  {/* Submit Button */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/vendor/market-products')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorProductRequest;
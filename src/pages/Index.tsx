import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Truck, Star, Monitor, Battery, Smartphone, Clock, Users, MapPin, Zap, Award, Leaf, Globe, CheckCircle, Camera, Speaker, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { TryodoAPI } from '@/lib/api';

interface Product {
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Upside pricing fields
  final_price?: number;
  price_markup?: number;
  has_upside?: boolean;
  
  // Joined data
  category?: {
    id: string;
    name: string;
  };
  quality_type?: {
    id: string;
    name: string;
  };
  model?: {
    id: string;
    model_name: string;
    brand?: {
      name: string;
    };
  };
  vendor?: {
    id: string;
    business_name: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [stats, setStats] = useState({ orders: 0, customers: 0, vendors: 0 });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { name: 'Display', icon: Monitor, color: 'blue' },
    { name: 'Battery', icon: Battery, color: 'green' },
    { name: 'Back Cover', icon: Smartphone, color: 'orange' },  
    { name: 'Buttons', icon: ToggleRight, color: 'green' },
  ];

  const testimonials = [
    {
      text: "Amazing quality parts and super fast delivery! Fixed my iPhone screen in no time.",
      name: "Priya Sharma",
      location: "Mumbai",
      rating: 5
    },
    {
      text: "Best prices in the market. Saved 40% compared to brand service centers.",
      name: "Rajesh Kumar",
      location: "Delhi",
      rating: 5
    },
    {
      text: "Genuine parts with warranty. Highly recommend for all mobile repairs!",
      name: "Anita Verma",
      location: "Bangalore",
      rating: 5
    }
  ];

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  // Initialize delivery auto-assignment system
  useEffect(() => {
    // Run auto-assignment for delivery partners on app initialization
    const initializeAutoAssignment = async () => {
      try {
        console.log('🚀 Initializing delivery auto-assignment system...');
        const result = await DeliveryAPI.scheduleAutoAssignment();
        
        if (result.success && result.assignments > 0) {
          console.log(`✅ Auto-assignment completed: ${result.assignments} delivery partners assigned`);
        }
      } catch (error) {
        console.error('❌ Error initializing auto-assignment:', error);
      }
    };

    // Run once on app load
    initializeAutoAssignment();

    // Set up periodic auto-assignment every 10 minutes
    const interval = setInterval(initializeAutoAssignment, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);

      // Fetch real products from database
      const { data: products, error } = await supabase
        .from('vendor_products')
        .select(`
          *,
          categories!category_id (
            id,
            name
          ),
          category_qualities!quality_type_id (
            id,
            quality_name
          ),
          smartphone_models!model_id (
            id,
            model_name,
            brands!brand_id (
              name
            )
          ),
          vendors!vendor_id (
            id,
            business_name,
            rating,
            total_reviews,
            is_verified
          )
        `)
        .eq('is_active', true)
        .eq('is_in_stock', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error fetching products:', error);
        // If there's an error or no products, show demo products with a note
        setFeaturedProducts([]);
        toast.error('No products available at the moment');
        return;
      }

      if (!products || products.length === 0) {
        console.log('No products found in database');
        setFeaturedProducts([]);
        return;
      }

      // Transform the data to match our interface
      const transformedProducts: Product[] = products.map(product => ({
        ...product,
        category: product.categories ? {
          id: product.categories.id,
          name: product.categories.name
        } : undefined,
        quality_type: product.category_qualities ? {
          id: product.category_qualities.id,
          name: product.category_qualities.quality_name
        } : undefined,
        model: product.smartphone_models ? {
          id: product.smartphone_models.id,
          model_name: product.smartphone_models.model_name,
          brand: product.smartphone_models.brands ? {
            name: product.smartphone_models.brands.name
          } : undefined
        } : undefined,
        vendor: product.vendors ? {
          id: product.vendors.id,
          business_name: product.vendors.business_name,
          rating: product.vendors.rating || 4.5,
          total_reviews: product.vendors.total_reviews || 0,
          is_verified: product.vendors.is_verified || false
        } : undefined
      }));

      // Add upside pricing to products
      const productsWithUpside = await TryodoAPI.enrichProductsWithFinalPrices(transformedProducts);

      console.log('✅ Loaded real products with upside pricing:', productsWithUpside.length);
      setFeaturedProducts(productsWithUpside);
    } catch (error) {
      console.error('Error loading featured products:', error);
      toast.error('Failed to load featured products');
      setFeaturedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Animate stats on page load
  useEffect(() => {
    const animateStats = () => {
      const targetStats = { orders: 12500, customers: 5280, vendors: 240 };
      const duration = 2000;
      const steps = 60;
      const stepTime = duration / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        setStats({
          orders: Math.floor((targetStats.orders * currentStep) / steps),
          customers: Math.floor((targetStats.customers * currentStep) / steps),
          vendors: Math.floor((targetStats.vendors * currentStep) / steps),
        });

        if (currentStep >= steps) {
          clearInterval(interval);
          setStats(targetStats);
        }
      }, stepTime);
    };

    animateStats();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = async (product: Product) => {
    console.log('🛒 Index: handleAddToCart called with product:', product);
    console.log('🛒 Index: Product ID:', product.id);
    console.log('🛒 Index: Product Name:', product.model?.model_name);
    console.log('🛒 Index: Product Stock:', product.stock_quantity);
    console.log('🛒 Index: Product Active:', product.is_active);
    console.log('🛒 Index: Product In Stock:', product.is_in_stock);
    
    try {
      console.log('🛒 Index: Calling addToCart function...');
      await addToCart(product.id, 1);
      console.log('✅ Index: addToCart completed successfully');
    } catch (error) {
      console.error('❌ Index: Error adding to cart:', error);
      toast.error('Failed to add product to cart. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white overscroll-contain no-text-select">
      <Header hideCartOnMobile={true} />

      {/* Hero Section - Modern Tech Design */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16 lg:py-24">
        {/* Organic background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 left-20 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 right-40 w-80 h-80 bg-cyan-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <div className="max-w-2xl lg:max-w-none">
              <div className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full px-4 py-2 mb-6 font-medium text-sm shadow-soft">
                <Zap className="h-4 w-4 mr-2" />
                <span>India's #1 Mobile Parts Marketplace</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
                Modern Electronics
                <span className="block bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  For Everyone
                </span>
              </h1>

              <p className="text-lg lg:text-xl mb-8 text-gray-700 leading-relaxed font-medium">
                Connect with verified vendors, compare prices in real-time, and get genuine mobile parts
                delivered to your doorstep with <span className="text-blue-600 font-semibold">guaranteed quality</span>.
              </p>

              <div className="flex justify-start mb-12">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-6 h-auto shadow-colored hover:shadow-strong transform hover:scale-105 transition-all duration-200 rounded-xl font-semibold"
                  onClick={() => navigate('/order')}
                >
                  Start Shopping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-3 gap-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-medium border border-gray-100">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1">
                    {stats.orders.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Orders Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1">
                    {stats.customers.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-cyan-600 mb-1">
                    {stats.vendors.toLocaleString()}+
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Verified Vendors</div>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative">
              {/* <div className="relative z-10">
                <img 
                  src="hero-section-image.png" 
                  alt="Modern Electronics and Tech Devices" 
                  className="w-full max-w-lg mx-auto rounded-3xl shadow-strong transform hover:scale-105 transition-all duration-300"
                />
              </div> */}

              {/* Floating elements for 3D effect */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-400 rounded-2xl shadow-medium transform rotate-45 animate-bounce"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-400 rounded-xl shadow-soft transform -rotate-12"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find the right parts for your device from our wide range of categories.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/order?category=${category.name}&scrollTo=brands`)}
              >
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-${category.color}-100 transition-transform duration-300 group-hover:scale-105`}>
                  <category.icon className={`h-8 w-8 text-${category.color}-600`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
                <div className="mt-2 text-sm text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center font-medium">
                  Shop Now <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Trending Products
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Most popular mobile parts and accessories this week
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-base sm:text-lg text-gray-600 font-medium">Loading products...</div>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Available Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Our marketplace is ready for amazing mobile parts! Vendors can add products, and customers can start shopping.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/order')} 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
                >
                  Browse Categories
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast.info('Check the browser console and run debugCart.runAllTests() to test cart functionality');
                  }}
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 px-6 py-2"
                >
                  Debug Cart 🔧
                </Button>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                <p className="mb-2">🔧 <strong>For Developers:</strong> Open browser console and run <code className="bg-gray-100 px-2 py-1 rounded">debugCart.runAllTests()</code></p>
                <p>🏪 <strong>For Vendors:</strong> Go to Vendor Dashboard → Add Products to populate the marketplace</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Horizontal Scroll Container */}
              <div className="overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6">
                <div className="flex space-x-4 sm:space-x-6 px-4 sm:px-6 pb-4">
                  {featuredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex-none w-64 sm:w-72 bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 group border border-gray-100 hover:border-orange-200 overflow-hidden"
                    >
                      {/* Product Image */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium z-10">
                            {product.category?.name || 'Mobile Part'}
                          </div>

                          {/* Stock Badge */}
                          {product.stock_quantity <= 5 && (
                            <div className="absolute top-3 right-3 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium z-10">
                              Only {product.stock_quantity} left
                            </div>
                          )}

                          {/* Product Icon/Image */}
                          <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                            {(() => {
                              const categoryIcons: { [key: string]: string } = {
                                'Display': '📱',
                                'Battery': '🔋',
                                'Back Cover': '📲',
                                'Camera': '📷',
                                'Charging Port': '🔌',
                                'Speaker': '🔊',
                                'Button': '⚫',
                                'Screen Protector': '🛡️'
                              };
                              return categoryIcons[product.category?.name || ''] || '📱';
                            })()}
                          </div>
                        </div>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                      </div>

                      {/* Product Info */}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors duration-200">
                          {product.model?.brand?.name && product.model?.model_name 
                            ? `${product.model.brand.name} ${product.model.model_name}` 
                            : product.model?.model_name || 'Mobile Part'}
                        </h3>

                        {/* Vendor name */}
                        <p className="text-sm text-gray-600 mb-3">
                          by {product.vendor?.business_name || 'Verified Vendor'}
                        </p>

                        {/* Rating and Reviews */}
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < Math.floor(product.vendor?.rating || 4.5) ? 'text-orange-400 fill-current' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500 font-medium">
                            {(product.vendor?.rating || 4.5).toFixed(1)} ({(product.vendor?.total_reviews || 0).toLocaleString()})
                          </span>
                        </div>

                        {/* Quality badge */}
                        {product.quality_type?.name && (
                          <div className="mb-3">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {product.quality_type.name}
                            </span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">
                              ₹{(product.final_price || product.price).toLocaleString()}
                            </span>
                            {product.has_upside && product.price_markup && product.price_markup > 0 && (
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-500 line-through">₹{product.price.toLocaleString()}</span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  +₹{product.price_markup.toFixed(0)} upside
                                </span>
                              </div>
                            )}
                            {product.original_price && product.original_price > product.price && !product.has_upside && (
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-500 line-through">₹{product.original_price.toLocaleString()}</span>
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                  {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                                </span>
                              </div>
                            )}
                            {index < 3 && !product.original_price && !product.has_upside && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                Hot
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Warranty info */}
                        {product.warranty_months > 0 && (
                          <div className="text-sm text-gray-600 mb-3">
                            ⚡ {product.warranty_months} months warranty
                          </div>
                        )}

                        {/* Add to Cart Button */}
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.is_in_stock || product.stock_quantity === 0}
                          className={`w-full font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 touch-manipulation ${
                            product.is_in_stock && product.stock_quantity > 0
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {product.is_in_stock && product.stock_quantity > 0 ? (
                            <span className="flex items-center justify-center space-x-2">
                              <span>Add to Cart</span>
                              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            </span>
                          ) : (
                            'Out of Stock'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scroll indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-3 py-1">
                  <ArrowRight className="h-4 w-4 text-gray-400 rotate-180" />
                  <span className="text-sm text-gray-600 font-medium">Swipe to explore</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Tryodo?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of mobile parts shopping with our innovative platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Quality Guaranteed",
                description: "100% genuine parts with warranty protection",
                color: "green"
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                description: "Same-day delivery in major cities",
                color: "blue"
              },
              {
                icon: Star,
                title: "Best Prices",
                description: "Compare prices from multiple vendors",
                color: "orange"
              },
              {
                icon: Users,
                title: "Verified Vendors",
                description: "All vendors are verified and trusted",
                color: "purple"
              },
              {
                icon: Clock,
                title: "24/7 Support",
                description: "Round-the-clock customer assistance",
                color: "indigo"
              },
              {
                icon: Award,
                title: "Expert Service",
                description: "Professional installation and repair",
                color: "green"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300 group border border-gray-100 hover:border-blue-200">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 bg-${feature.color}-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-soft`}>
                    <feature.icon className={`h-8 w-8 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container-mobile mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              What Our Customers Say
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Real feedback from thousands of satisfied customers
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="card-mobile bg-white shadow-lg">
              <div className="text-center">
                <div className="flex justify-center mb-3 sm:mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-base sm:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6 italic leading-relaxed">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>
                <div className="flex items-center justify-center space-x-2">
                  <div className="text-sm sm:text-base font-semibold text-gray-900">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {testimonials[currentTestimonial].location}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors touch-manipulation ${index === currentTestimonial ? 'bg-orange-600' : 'bg-gray-300'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-orange-500 to-orange-600 relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto font-medium">
            Join thousands of satisfied customers and find the perfect parts for your device today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-xl font-semibold"
              onClick={() => navigate('/order')}
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto transform hover:scale-105 transition-all duration-200 rounded-xl font-semibold"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index; 
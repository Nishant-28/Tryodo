import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Truck, Star, Monitor, Battery, Smartphone, Clock, Users, MapPin, Zap, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Cart from '@/components/Cart';
import { supabase } from '@/lib/supabase';

interface CartItem {
  id: string;
  name: string;
  vendor: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: string;
  image?: string;
}

const Index = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [stats, setStats] = useState({ orders: 0, customers: 0, vendors: 0 });
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*');

      if (error) {
        console.error('Error fetching products:', error);
        setError(error.message);
        setLoadingProducts(false);
        return;
      }

      setProducts(data || []);
      setLoadingProducts(false);
    };

    fetchProducts();
  }, []);

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

  const testimonials = [
    {
      name: "Rahul Sharma",
      location: "Delhi",
      text: "Got my iPhone display replaced at an amazing price. The quality is excellent and delivery was super fast!",
      rating: 5
    },
    {
      name: "Priya Patel",
      location: "Mumbai",
      text: "Tryodo helped me find the best battery for my Samsung. The vendor comparison feature is brilliant!",
      rating: 5
    },
    {
      name: "Amit Kumar",
      location: "Bangalore",
      text: "Professional service and genuine parts. Highly recommend for mobile repairs.",
      rating: 5
    }
  ];

  const trendingProducts = [ // This will be replaced by fetched products
    { id: "1", name: "iPhone 14 Display", price: 8500, discount: "15% off", image: "📱" },
    { id: "2", name: "Samsung Galaxy Battery", price: 2200, discount: "20% off", image: "🔋" },
    { id: "3", name: "OnePlus Camera Module", price: 3800, discount: "10% off", image: "📷" },
    { id: "4", name: "Xiaomi Charging Port", price: 1500, discount: "25% off", image: "⚡" }
  ];

  const handleAddToCart = (product: { id: string; name: string; price: number; image: string }) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1, vendor: "Various Vendors" }];
      }
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems.filter((item) => item.id !== id);
      }
      return prevItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      );
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header cartItems={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Zap className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">India's #1 Mobile Parts Marketplace</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Tryodo Electronics
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Marketplace
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Connect with verified vendors, compare prices in real-time, and get genuine mobile parts 
              delivered to your doorstep with guaranteed quality.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto"
                onClick={() => window.location.href = '/order'}
              >
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
              >
                Become a Vendor
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{stats.orders.toLocaleString()}+</div>
                <div className="text-blue-200 text-sm">Orders Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{stats.customers.toLocaleString()}+</div>
                <div className="text-blue-200 text-sm">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{stats.vendors}+</div>
                <div className="text-blue-200 text-sm">Verified Vendors</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-yellow-400/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-400/20 rounded-full animate-pulse delay-500"></div>
      </section>

      {/* Trending Products */}
      <section className="py-16 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                🔥 Trending This Week
              </h2>
              <p className="text-gray-600">Most popular products with best deals</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>

          {loadingProducts ? (
            <p>Loading products...</p>
          ) : error ? (
            <p>Error: {error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer"
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="text-4xl mb-4">{product.image}</div>
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">₹{product.price.toLocaleString()}</span>
                    {product.discount && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{product.discount}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Tryodo?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of mobile parts shopping with our advanced marketplace
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Verified Vendors</h3>
              <p className="text-gray-600 mb-4">
                All vendors go through strict verification process. 100% authentic parts guaranteed.
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                <Award className="h-4 w-4 mr-2" />
                <span>Quality Assured</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 mb-4">
                Same-day delivery in major cities. Express shipping available nationwide.
              </p>
              <div className="flex items-center text-green-600 font-medium">
                <Truck className="h-4 w-4 mr-2" />
                <span>2-Hour Delivery</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Best Prices</h3>
              <p className="text-gray-600 mb-4">
                AI-powered price comparison ensures you always get the best deal available.
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span>Save up to 40%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section with Enhanced Design */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find the perfect parts for your device from our extensive catalog
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group cursor-pointer" onClick={() => window.location.href = '/order'}>
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 transform group-hover:scale-105">
                <Monitor className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile Displays</h3>
                <p className="text-gray-600 mb-4">Premium LCD, OLED, and AMOLED screens</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-600 font-semibold group-hover:underline">Shop Now →</span>
                  <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">2000+ options</span>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer" onClick={() => window.location.href = '/order'}>
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-105">
                <Battery className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Batteries</h3>
                <p className="text-gray-600 mb-4">Long-lasting batteries with warranty</p>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-semibold group-hover:underline">Shop Now →</span>
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full">1500+ options</span>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer" onClick={() => window.location.href = '/order'}>
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-8 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300 transform group-hover:scale-105">
                <Smartphone className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile Parts</h3>
                <p className="text-gray-600 mb-4">Cameras, speakers, charging ports & more</p>
                <div className="flex items-center justify-between">
                  <span className="text-purple-600 font-semibold group-hover:underline">Shop Now →</span>
                  <span className="bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-full">3000+ options</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600">Real reviews from real customers</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-xl text-gray-700 mb-6 italic">
                "{testimonials[currentTestimonial].text}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="font-bold text-gray-900">{testimonials[currentTestimonial].name}</span>
                <span className="text-gray-500">•</span>
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{testimonials[currentTestimonial].location}</span>
              </div>

              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Fix Your Mobile?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Tryodo for their mobile repair needs
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto"
            onClick={() => window.location.href = '/order'}
          >
            Start Your Order Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold">Tryodo</span>
              </div>
              <p className="text-gray-400">
                India's leading electronics marketplace for mobile parts and accessories
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Display Repair</li>
                <li>Battery Replacement</li>
                <li>Part Installation</li>
                <li>Screen Protection</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Links</h3>
              <ul>
                <li><a href="/" className="hover:text-blue-600 transition-colors">Home</a></li>
                <li><a href="/order" className="hover:text-blue-600 transition-colors">Order</a></li>
                <li><a href="/about" className="hover:text-blue-600 transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-blue-600 transition-colors">Contact</a></li>
                <li><a href="/Login" className="hover:text-blue-600 transition-colors">Login</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Support</h3>
              <ul>
                <li><a href="/contact" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="/order" className="hover:text-blue-600 transition-colors">Track Order</a></li>
                <li><a href="/Login" className="hover:text-blue-600 transition-colors">Login</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Tryodo Electronics Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
};

export default Index;

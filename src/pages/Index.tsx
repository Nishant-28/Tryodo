import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Truck, Star, Monitor, Battery, Smartphone, Clock, Users, MapPin, Zap, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Cart from '@/components/customer/Cart';
import MobileBottomNav from '@/components/MobileBottomNav';
import { supabase } from '@/lib/supabase';

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

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: string;
  image?: string;
}

const Index = () => {
  const navigate = useNavigate();
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
        return [...prevItems, { 
          ...product, 
          quantity: 1, 
          vendor: "Various Vendors",
          vendorId: "default-vendor",
          deliveryTime: 3,
          warranty: 6
        }];
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
    <div className="min-h-screen bg-white overscroll-contain">
      <Header cartItems={cartItems.length} onCartClick={() => setIsCartOpen(true)} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 safe-area-pt">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container-mobile mx-auto px-4 py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-2 mb-4 sm:px-4 sm:mb-6 text-sm">
              <Zap className="h-4 w-4 mr-2" />
              <span className="font-medium">India's #1 Mobile Parts Marketplace</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              Tryodo Electronics
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Marketplace
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-blue-100 max-w-3xl mx-auto px-4">
              Connect with verified vendors, compare prices in real-time, and get genuine mobile parts 
              delivered to your doorstep with guaranteed quality.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto min-h-touch rounded-mobile touch-manipulation animate-press"
                onClick={() => navigate('/order')}
              >
                Start Shopping
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto min-h-touch rounded-mobile touch-manipulation animate-press"
              >
                Become a Vendor
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 bg-white/10 backdrop-blur-sm rounded-mobile-lg p-4 sm:p-6 lg:p-8 mx-4 sm:mx-0">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400">
                  {stats.orders.toLocaleString()}+
                </div>
                <div className="text-xs sm:text-sm text-blue-100 mt-1">Orders Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-400">
                  {stats.customers.toLocaleString()}+
                </div>
                <div className="text-xs sm:text-sm text-blue-100 mt-1">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-400">
                  {stats.vendors.toLocaleString()}+
                </div>
                <div className="text-xs sm:text-sm text-blue-100 mt-1">Verified Vendors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="container-mobile mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Why Choose Tryodo?
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of mobile parts shopping with our innovative platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                icon: Shield,
                title: "Quality Guaranteed",
                description: "100% genuine parts with warranty protection"
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                description: "Same-day delivery in major cities"
              },
              {
                icon: Star,
                title: "Best Prices",
                description: "Compare prices from multiple vendors"
              },
              {
                icon: Users,
                title: "Verified Vendors",
                description: "All vendors are verified and trusted"
              },
              {
                icon: Clock,
                title: "24/7 Support",
                description: "Round-the-clock customer assistance"
              },
              {
                icon: Award,
                title: "Expert Service",
                description: "Professional installation and repair"
              }
            ].map((feature, index) => (
              <div key={index} className="card-mobile bg-white hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-mobile flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container-mobile mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Trending Products
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the most popular mobile parts and accessories
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {trendingProducts.map((product) => (
              <div key={product.id} className="card-mobile bg-white hover:shadow-lg transition-all duration-300 group">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{product.image}</div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
                    <span className="text-lg sm:text-xl font-bold text-green-600">₹{product.price}</span>
                    <span className="text-xs sm:text-sm text-white bg-red-500 px-2 py-1 rounded-full">
                      {product.discount}
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    className="w-full min-h-touch touch-manipulation animate-press rounded-mobile"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="container-mobile mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Popular Categories
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Browse by device type and find exactly what you need
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {[
              { icon: Smartphone, name: "iPhone Parts", count: "2.5k+" },
              { icon: Monitor, name: "Samsung Parts", count: "1.8k+" },
              { icon: Battery, name: "Batteries", count: "3.2k+" },
              { icon: Smartphone, name: "OnePlus Parts", count: "950+" },
              { icon: Monitor, name: "Xiaomi Parts", count: "1.2k+" },
              { icon: Zap, name: "Chargers", count: "2.1k+" }
            ].map((category, index) => (
              <div key={index} className="card-mobile bg-white hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-mobile flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:bg-blue-200 transition-colors">
                    <category.icon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{category.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{category.count} items</p>
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
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
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
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors touch-manipulation ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container-mobile mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers and find the perfect parts for your device today
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto min-h-touch rounded-mobile touch-manipulation animate-press"
              onClick={() => navigate('/order')}
            >
              Shop Now
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto min-h-touch rounded-mobile touch-manipulation animate-press"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Cart */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        cartItems={cartItems.length} 
        onCartClick={() => setIsCartOpen(true)} 
      />

      {/* Mobile spacing for bottom navigation */}
      <div className="h-16 sm:h-0"></div>
    </div>
  );
};

export default Index;

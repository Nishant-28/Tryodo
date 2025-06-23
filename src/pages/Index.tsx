import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Truck, Star, Monitor, Battery, Smartphone, Clock, Users, MapPin, Zap, Award, Leaf, Globe, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [stats, setStats] = useState({ orders: 0, customers: 0, vendors: 0 });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      
      // Simulating featured products for now
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'iPhone 14 Pro',
          price: 89999,
          image: '/placeholder.svg',
          rating: 4.8,
          reviews: 1245,
          category: 'Smartphone'
        },
        {
          id: '2',
          name: 'Samsung Galaxy S23',
          price: 74999,
          image: '/placeholder.svg',
          rating: 4.6,
          reviews: 890,
          category: 'Smartphone'
        },
        {
          id: '3',
          name: 'OnePlus 11',
          price: 56999,
          image: '/placeholder.svg',
          rating: 4.5,
          reviews: 654,
          category: 'Smartphone'
        },
        {
          id: '4',
          name: 'Google Pixel 7',
          price: 41999,
          image: '/placeholder.svg',
          rating: 4.4,
          reviews: 432,
          category: 'Smartphone'
        }
      ];
      
      setFeaturedProducts(mockProducts);
    } catch (error) {
      console.error('Error loading featured products:', error);
      toast.error('Failed to load featured products');
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
    try {
      await addToCart(product.id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white overscroll-contain">
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
              <div className="relative z-10">
                <img 
                  src="hero-section-image.png" 
                  alt="Modern Electronics and Tech Devices" 
                  className="w-full max-w-lg mx-auto rounded-3xl shadow-strong transform hover:scale-105 transition-all duration-300"
                />
              </div>
              
              {/* Floating elements for 3D effect */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-400 rounded-2xl shadow-medium transform rotate-45 animate-bounce"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-400 rounded-xl shadow-soft transform -rotate-12"></div>
            </div>
          </div>
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

      {/* Trending Products Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Trending Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the most popular mobile parts and accessories
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg text-gray-600 font-medium">Loading products...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 group border border-gray-100 hover:border-blue-200">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl shadow-soft group-hover:scale-105 transition-transform duration-300">
                      {typeof product.image === 'string' && product.image.startsWith('http') ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-xl"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            const sibling = target.nextElementSibling as HTMLElement;
                            target.style.display = 'none';
                            if (sibling) sibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <div 
                        className="text-3xl" 
                        style={{ display: typeof product.image === 'string' && product.image.startsWith('http') ? 'none' : 'block' }}
                      >
                        {typeof product.image === 'string' && !product.image.startsWith('http') ? product.image : "📱"}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-snug">{product.name}</h3>
                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <span className="text-xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                    </div>
                    <Button 
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 rounded-xl font-semibold shadow-soft"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Popular Categories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse by device type and find exactly what you need
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Smartphone, name: "iPhone Parts", count: "2.5k+" },
              { icon: Monitor, name: "Samsung Parts", count: "1.8k+" },
              { icon: Battery, name: "Batteries", count: "3.2k+" },
              { icon: Smartphone, name: "OnePlus Parts", count: "950+" },
              { icon: Monitor, name: "Xiaomi Parts", count: "1.2k+" },
              { icon: Zap, name: "Chargers", count: "2.1k+" }
            ].map((category, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 group cursor-pointer border border-gray-100 hover:border-orange-200">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 group-hover:scale-110 transition-all duration-300 shadow-soft">
                    <category.icon className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 font-medium">{category.count} items</p>
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
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors touch-manipulation ${
                    index === currentTestimonial ? 'bg-orange-600' : 'bg-gray-300'
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
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
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
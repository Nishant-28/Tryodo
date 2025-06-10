
import React from 'react';
import { ArrowRight, Shield, Truck, Star, Monitor, Battery, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Mobile Repair
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Get genuine mobile parts from verified vendors. Compare prices, 
              read reviews, and order with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto"
                onClick={() => window.location.href = '/order'}
              >
                Start Ordering
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
              >
                Browse Parts
              </Button>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-yellow-400/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-400/20 rounded-full animate-pulse delay-500"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose MobileRepair?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We connect you with trusted vendors and provide the best mobile repair experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Verified Vendors</h3>
              <p className="text-gray-600">
                All our vendors are verified and trusted. We ensure quality parts and reliable service.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Fast Delivery</h3>
              <p className="text-gray-600">
                Quick delivery options available. Get your mobile parts delivered to your doorstep.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Best Prices</h3>
              <p className="text-gray-600">
                Compare prices from multiple vendors and choose the best deal that suits your budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find the right parts for your mobile device
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                <Monitor className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile Displays</h3>
                <p className="text-gray-600 mb-4">LCD, OLED, and AMOLED screens for all major brands</p>
                <span className="text-blue-600 font-semibold group-hover:underline">Shop Now →</span>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                <Battery className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Batteries</h3>
                <p className="text-gray-600 mb-4">Original and compatible batteries with warranty</p>
                <span className="text-green-600 font-semibold group-hover:underline">Shop Now →</span>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-8 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300">
                <Smartphone className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mobile Parts</h3>
                <p className="text-gray-600 mb-4">Speakers, cameras, charging ports, and more</p>
                <span className="text-purple-600 font-semibold group-hover:underline">Shop Now →</span>
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
            Join thousands of satisfied customers who trust us for their mobile repair needs
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
                  <span className="text-white font-bold text-sm">MR</span>
                </div>
                <span className="text-xl font-bold">MobileRepair</span>
              </div>
              <p className="text-gray-400">
                Your trusted partner for mobile repair solutions
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
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Track Order</li>
                <li>Returns</li>
                <li>Contact Us</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Careers</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MobileRepair. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

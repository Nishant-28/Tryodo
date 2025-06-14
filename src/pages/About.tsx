import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Target, Award, Smartphone, Shield, Zap, Globe } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} cartItems={0} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tryodo</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Your trusted marketplace for premium mobile parts and electronics. We connect customers with verified vendors 
            to provide authentic, high-quality mobile components at competitive prices.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Target className="h-8 w-8 text-blue-600" />
                <span>Our Mission</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                To revolutionize the mobile parts industry by creating a transparent, reliable marketplace 
                that connects customers with trusted vendors, ensuring quality products and exceptional service.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Award className="h-8 w-8 text-purple-600" />
                <span>Our Vision</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                To become the leading global platform for mobile electronics, fostering innovation and 
                empowering businesses while providing customers with unparalleled access to quality parts.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Why Choose Us */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Tryodo?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Verified Vendors</h3>
                <p className="text-sm text-gray-600">All our vendors are thoroughly verified and rated by customers</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Quality Parts</h3>
                <p className="text-sm text-gray-600">Premium mobile components with warranty and quality assurance</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Zap className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
                <p className="text-sm text-gray-600">Quick processing and delivery to get your devices fixed faster</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Globe className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Wide Network</h3>
                <p className="text-sm text-gray-600">Extensive network of vendors across multiple cities and regions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Our Story */}
        <div className="mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Our Story</h2>
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="prose prose-lg max-w-none text-gray-600">
                  <p className="mb-4">
                    Founded with a vision to transform the mobile parts industry, Tryodo emerged from the recognition 
                    that customers needed a reliable, transparent platform to source quality mobile components. Our 
                    founders, experienced in both technology and retail, identified the gap between customers seeking 
                    authentic parts and vendors struggling to reach their target audience.
                  </p>
                  <p className="mb-4">
                    What started as a small initiative has grown into a comprehensive marketplace that serves thousands 
                    of customers and hundreds of verified vendors. We've built our platform on the principles of trust, 
                    quality, and transparency - ensuring that every transaction benefits both parties.
                  </p>
                  <p>
                    Today, Tryodo stands as a testament to innovation in the electronics marketplace, continuously 
                    evolving to meet the changing needs of our community while maintaining our commitment to excellence.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Progressive Selection</h3>
                <p className="text-sm text-gray-600">Easy category → brand → model → vendor selection process</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Quality Ratings</h3>
                <p className="text-sm text-gray-600">Comprehensive quality categories and vendor ratings</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Real-time Search</h3>
                <p className="text-sm text-gray-600">Advanced search and filtering capabilities</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Vendor Verification</h3>
                <p className="text-sm text-gray-600">Thorough vendor verification and rating system</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Secure Transactions</h3>
                <p className="text-sm text-gray-600">Safe and secure payment processing</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Customer Support</h3>
                <p className="text-sm text-gray-600">24/7 customer support and assistance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Tryodo by Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Verified Vendors</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50K+</div>
              <div className="text-blue-100">Products Listed</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">25+</div>
              <div className="text-blue-100">Cities Covered</div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  Customer First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  We prioritize customer satisfaction and strive to exceed expectations in every interaction.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  Trust & Transparency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  We build trust through transparency, honest communication, and reliable service delivery.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center">
                  <Award className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  Quality Excellence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center">
                  We maintain the highest standards of quality in products, services, and customer experience.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;

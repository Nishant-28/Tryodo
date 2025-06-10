
import React, { useState } from 'react';
import { Monitor, Battery, Smartphone, Shield, Filter, Sort, Search, Star, Zap, Clock } from 'lucide-react';
import Header from '@/components/Header';
import CategoryCard from '@/components/CategoryCard';
import PhoneSearch from '@/components/PhoneSearch';
import VendorCard from '@/components/VendorCard';
import { Button } from '@/components/ui/button';

const categories = [
  {
    id: 'display',
    title: 'Mobile Display',
    description: 'LCD, OLED, and AMOLED screens',
    icon: Monitor,
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-800',
    count: '2000+ products'
  },
  {
    id: 'battery',
    title: 'Battery',
    description: 'Original and compatible batteries',
    icon: Battery,
    gradient: 'bg-gradient-to-br from-green-600 to-green-800',
    count: '1500+ products'
  },
  {
    id: 'parts',
    title: 'Mobile Parts',
    description: 'Speakers, cameras, and more',
    icon: Smartphone,
    gradient: 'bg-gradient-to-br from-purple-600 to-purple-800',
    count: '3000+ products'
  },
  {
    id: 'glass',
    title: 'Tempered Glass',
    description: 'Screen protectors and covers',
    icon: Shield,
    gradient: 'bg-gradient-to-br from-orange-600 to-orange-800',
    count: '800+ products'
  }
];

const mockVendors = [
  {
    id: '1',
    name: 'Rohan Communication',
    rating: 4.8,
    reviews: 324,
    location: 'Electronics Market, Delhi',
    responseTime: '2 mins',
    verified: true,
    options: [
      {
        id: '1a',
        name: 'Original Display',
        price: 8500,
        originalPrice: 10000,
        quality: 'Original',
        warranty: '6 months',
        deliveryTime: '2-3 days',
        inStock: true,
        fastDelivery: true
      },
      {
        id: '1b',
        name: 'OEM Display',
        price: 5500,
        quality: 'OEM',
        warranty: '3 months',
        deliveryTime: '1-2 days',
        inStock: true,
        fastDelivery: false
      }
    ]
  },
  {
    id: '2',
    name: 'Dhanesh Electronics',
    rating: 4.6,
    reviews: 187,
    location: 'Nehru Place, Delhi',
    responseTime: '5 mins',
    verified: true,
    options: [
      {
        id: '2a',
        name: 'Premium Display',
        price: 7800,
        quality: 'AAA+',
        warranty: '4 months',
        deliveryTime: '1-2 days',
        inStock: true,
        fastDelivery: true
      },
      {
        id: '2b',
        name: 'Standard Display',
        price: 4500,
        quality: 'AA',
        warranty: '2 months',
        deliveryTime: 'Same day',
        inStock: false,
        fastDelivery: true
      }
    ]
  },
  {
    id: '3',
    name: 'TechMart Solutions',
    rating: 4.9,
    reviews: 456,
    location: 'CP Market, Delhi',
    responseTime: '1 min',
    verified: true,
    options: [
      {
        id: '3a',
        name: 'Flagship Display',
        price: 9200,
        originalPrice: 11000,
        quality: 'Original+',
        warranty: '12 months',
        deliveryTime: '3-4 days',
        inStock: true,
        fastDelivery: false
      }
    ]
  }
];

const Order = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<{brand: string, model: string} | null>(null);
  const [cartItems, setCartItems] = useState(0);
  const [sortBy, setSortBy] = useState('price');
  const [filterByStock, setFilterByStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handlePhoneSearch = (brand: string, model: string) => {
    setSelectedPhone({ brand, model });
  };

  const handleAddToCart = (vendorId: string, optionId: string) => {
    setCartItems(prev => prev + 1);
    console.log(`Added item ${optionId} from vendor ${vendorId} to cart`);
  };

  const resetFlow = () => {
    setSelectedCategory(null);
    setSelectedPhone(null);
  };

  // Filter and sort vendors
  const filteredVendors = mockVendors
    .filter(vendor => {
      if (searchQuery) {
        return vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .filter(vendor => {
      if (filterByStock) {
        return vendor.options.some(option => option.inStock);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return Math.min(...a.options.map(o => o.price)) - Math.min(...b.options.map(o => o.price));
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartItems={cartItems} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Mobile Parts
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compare prices from verified vendors, get instant quotes, and enjoy fast delivery 
            with quality guarantee on all products.
          </p>
          
          {/* Quick Stats */}
          <div className="flex justify-center items-center space-x-8 mt-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span>4.8 avg rating</span>
            </div>
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-green-500 mr-1" />
              <span>2hr delivery</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-blue-500 mr-1" />
              <span>Quality guaranteed</span>
            </div>
          </div>
        </div>

        {!selectedCategory ? (
          /* Enhanced Category Selection */
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Category</h2>
              <p className="text-gray-600">Select the type of mobile part you need</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div key={category.id} className="relative">
                  <CategoryCard
                    title={category.title}
                    description={category.description}
                    icon={category.icon}
                    gradient={category.gradient}
                    onClick={() => handleCategorySelect(category.id)}
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="text-xs font-medium text-gray-700">{category.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedPhone ? (
          /* Enhanced Phone Selection */
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Select Your Phone Model
                </h2>
                <p className="text-gray-600">
                  Choose your device to see compatible {categories.find(c => c.id === selectedCategory)?.title.toLowerCase()}
                </p>
              </div>
              <button 
                onClick={resetFlow}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Categories
              </button>
            </div>
            
            {/* Category reminder */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                {React.createElement(categories.find(c => c.id === selectedCategory)?.icon || Monitor, { 
                  className: "h-5 w-5 text-blue-600 mr-2" 
                })}
                <span className="text-blue-800 font-medium">
                  Looking for: {categories.find(c => c.id === selectedCategory)?.title}
                </span>
              </div>
            </div>
            
            <PhoneSearch onSearch={handlePhoneSearch} />
          </div>
        ) : (
          /* Enhanced Vendor Selection */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPhone.brand} {selectedPhone.model} - {categories.find(c => c.id === selectedCategory)?.title}
                </h2>
                <p className="text-gray-600">Compare prices and choose the best option for you</p>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setSelectedPhone(null)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Change Phone
                </button>
                <button 
                  onClick={resetFlow}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                >
                  Change Category
                </button>
              </div>
            </div>

            {/* Advanced Filters and Search */}
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Sort By */}
                <div className="flex items-center space-x-2">
                  <Sort className="h-4 w-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="price">Price: Low to High</option>
                    <option value="rating">Highest Rated</option>
                    <option value="reviews">Most Reviews</option>
                  </select>
                </div>

                {/* In Stock Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterByStock}
                      onChange={(e) => setFilterByStock(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">In Stock Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Showing {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} 
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              
              {/* Quick delivery filter */}
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">Same day delivery available</span>
              </div>
            </div>

            {/* Enhanced Vendor Cards */}
            <div className="grid gap-6 max-w-4xl mx-auto">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    onAddToCart={handleAddToCart}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-12 w-12 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setFilterByStock(false);
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Why Shop with Tryodo?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <Shield className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="font-medium">Quality Guaranteed</span>
                  <span className="text-sm text-gray-600">All parts verified</span>
                </div>
                <div className="flex flex-col items-center">
                  <Zap className="h-8 w-8 text-green-600 mb-2" />
                  <span className="font-medium">Fast Delivery</span>
                  <span className="text-sm text-gray-600">Same day available</span>
                </div>
                <div className="flex flex-col items-center">
                  <Star className="h-8 w-8 text-yellow-600 mb-2" />
                  <span className="font-medium">Best Prices</span>
                  <span className="text-sm text-gray-600">Competitive rates</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Order;


import React, { useState } from 'react';
import { Monitor, Battery, Smartphone, Shield } from 'lucide-react';
import Header from '@/components/Header';
import CategoryCard from '@/components/CategoryCard';
import PhoneSearch from '@/components/PhoneSearch';
import VendorCard from '@/components/VendorCard';

const categories = [
  {
    id: 'display',
    title: 'Mobile Display',
    description: 'LCD, OLED, and AMOLED screens',
    icon: Monitor,
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-800'
  },
  {
    id: 'battery',
    title: 'Battery',
    description: 'Original and compatible batteries',
    icon: Battery,
    gradient: 'bg-gradient-to-br from-green-600 to-green-800'
  },
  {
    id: 'parts',
    title: 'Mobile Parts',
    description: 'Speakers, cameras, and more',
    icon: Smartphone,
    gradient: 'bg-gradient-to-br from-purple-600 to-purple-800'
  },
  {
    id: 'glass',
    title: 'Tempered Glass',
    description: 'Screen protectors and covers',
    icon: Shield,
    gradient: 'bg-gradient-to-br from-orange-600 to-orange-800'
  }
];

const mockVendors = [
  {
    id: '1',
    name: 'Rohan Communication',
    rating: 4.8,
    reviews: 324,
    location: 'Electronics Market, Delhi',
    options: [
      {
        id: '1a',
        name: 'Original Display',
        price: 8500,
        originalPrice: 10000,
        quality: 'Original',
        warranty: '6 months',
        deliveryTime: '2-3 days'
      },
      {
        id: '1b',
        name: 'OEM Display',
        price: 5500,
        quality: 'OEM',
        warranty: '3 months',
        deliveryTime: '1-2 days'
      }
    ]
  },
  {
    id: '2',
    name: 'Dhanesh Electronics',
    rating: 4.6,
    reviews: 187,
    location: 'Nehru Place, Delhi',
    options: [
      {
        id: '2a',
        name: 'Premium Display',
        price: 7800,
        quality: 'AAA+',
        warranty: '4 months',
        deliveryTime: '1-2 days'
      },
      {
        id: '2b',
        name: 'Standard Display',
        price: 4500,
        quality: 'AA',
        warranty: '2 months',
        deliveryTime: 'Same day'
      }
    ]
  }
];

const Order = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<{brand: string, model: string} | null>(null);
  const [cartItems, setCartItems] = useState(0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartItems={cartItems} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Mobile Parts
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from our wide range of mobile parts and accessories. 
            Compare prices from different vendors and get the best deals.
          </p>
        </div>

        {!selectedCategory ? (
          /* Category Selection */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                description={category.description}
                icon={category.icon}
                gradient={category.gradient}
                onClick={() => handleCategorySelect(category.id)}
              />
            ))}
          </div>
        ) : !selectedPhone ? (
          /* Phone Selection */
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Select Your Phone Model
              </h2>
              <button 
                onClick={resetFlow}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Back to Categories
              </button>
            </div>
            <PhoneSearch onSearch={handlePhoneSearch} />
          </div>
        ) : (
          /* Vendor Selection */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPhone.brand} {selectedPhone.model} - {categories.find(c => c.id === selectedCategory)?.title}
                </h2>
                <p className="text-gray-600">Compare prices from different vendors</p>
              </div>
              <button 
                onClick={() => setSelectedPhone(null)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Change Phone
              </button>
            </div>

            <div className="grid gap-6 max-w-4xl mx-auto">
              {mockVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Order;

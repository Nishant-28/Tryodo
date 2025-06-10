
import React from 'react';
import { Star, MapPin, Clock, Shield, Zap, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VendorOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quality: string;
  warranty: string;
  deliveryTime: string;
  inStock?: boolean;
  fastDelivery?: boolean;
}

interface VendorCardProps {
  vendor: {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    location: string;
    responseTime?: string;
    verified?: boolean;
    options: VendorOption[];
  };
  onAddToCart: (vendorId: string, optionId: string) => void;
}

const VendorCard = ({ vendor, onAddToCart }: VendorCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
            {vendor.verified && (
              <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-medium">{vendor.rating}</span>
              <span className="text-gray-500">({vendor.reviews} reviews)</span>
            </div>
            
            {vendor.responseTime && (
              <div className="flex items-center space-x-1 text-green-600">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Responds in {vendor.responseTime}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 mt-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">{vendor.location}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {vendor.options.map((option) => (
          <div key={option.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">{option.name}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {option.quality}
                  </span>
                  {option.fastDelivery && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Zap className="h-3 w-3 mr-1" />
                      Fast
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                  <span>📅 {option.deliveryTime}</span>
                  <span>🛡️ {option.warranty}</span>
                  <div className="flex items-center space-x-1">
                    {option.inStock ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">In Stock</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600">Out of Stock</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">₹{option.price.toLocaleString()}</span>
                    {option.originalPrice && (
                      <>
                        <span className="text-sm text-gray-500 line-through">₹{option.originalPrice.toLocaleString()}</span>
                        <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded">
                          {Math.round(((option.originalPrice - option.price) / option.originalPrice) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    size="sm"
                    onClick={() => onAddToCart(vendor.id, option.id)}
                    disabled={!option.inStock}
                    className={`${
                      option.inStock 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {option.inStock ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorCard;

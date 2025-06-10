
import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VendorOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quality: string;
  warranty: string;
  deliveryTime: string;
}

interface VendorCardProps {
  vendor: {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    location: string;
    options: VendorOption[];
  };
  onAddToCart: (vendorId: string, optionId: string) => void;
}

const VendorCard = ({ vendor, onAddToCart }: VendorCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{vendor.rating}</span>
            </div>
            <span className="text-sm text-gray-500">({vendor.reviews} reviews)</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">{vendor.location}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {vendor.options.map((option) => (
          <div key={option.id} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-semibold text-gray-900">{option.name}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {option.quality}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                  <span>📅 {option.deliveryTime}</span>
                  <span>🛡️ {option.warranty}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">₹{option.price}</span>
                    {option.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">₹{option.originalPrice}</span>
                    )}
                  </div>
                  
                  <Button 
                    size="sm"
                    onClick={() => onAddToCart(vendor.id, option.id)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Add to Cart
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

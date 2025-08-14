import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { hapticFeedback } from '@/lib/haptic';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { cart, loading, updateQuantity, removeFromCart } = useCart();
  
  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.totalPrice || 0;
  const deliveryFee = 0; // Free delivery
  const total = subtotal + deliveryFee;

  // Handle backdrop click and escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    hapticFeedback.quantity();
    await updateQuantity(productId, newQuantity);
  };

  const handleRemoveItem = async (productId: string) => {
    hapticFeedback.delete();
    await removeFromCart(productId);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    hapticFeedback.checkout();
    setIsCheckingOut(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      navigate('/checkout');
      onClose();
      setIsCheckingOut(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Cart Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              {totalItems > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {totalItems}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              hapticFeedback.navigation();
              onClose();
            }}
            className="hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-6" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Discover amazing products and add them to your cart</p>
              <Button onClick={() => {
                hapticFeedback.navigation();
                onClose();
              }} className="px-6 py-2">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group items by vendor for better organization */}
              {Object.entries(
                items.reduce((groups, item) => {
                  const vendorKey = `${item.vendorId}-${item.vendor}`;
                  if (!groups[vendorKey]) {
                    groups[vendorKey] = {
                      vendor: item.vendor,
                      vendorId: item.vendorId,
                      items: []
                    };
                  }
                  groups[vendorKey].items.push(item);
                  return groups;
                }, {} as Record<string, { vendor: string; vendorId: string; items: typeof items }>)
              ).map(([vendorKey, group]) => (
                <div key={vendorKey} className="space-y-3">
                  {/* Vendor Header */}
                  <div className="flex items-center gap-2 px-2">
                    <div className="h-px bg-gray-200 flex-1" />
                    <span className="text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                      {group.vendor}
                    </span>
                    <div className="h-px bg-gray-200 flex-1" />
                  </div>

                  {/* Vendor Items */}
                  {group.items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        {item.image && (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                        )}

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {item.name}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Product Type and Details */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {/* Product Type Badge */}
                            <Badge 
                              variant={item.productType === 'marketplace' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {item.productType === 'marketplace' ? 'Marketplace' : 'Direct'}
                            </Badge>
                            
                            {item.qualityName && (
                              <Badge variant="secondary" className="text-xs">
                                {item.qualityName}
                              </Badge>
                            )}
                            {item.warranty > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.warranty} months
                              </Badge>
                            )}
                            {item.deliveryTime > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.deliveryTime} {item.productType === 'marketplace' ? 'days' : 'days'}
                              </Badge>
                            )}
                          </div>

                          {/* Price and Quantity Controls */}
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-bold text-blue-600 text-lg">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-xs text-gray-500 line-through">
                                  ₹{item.originalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(item.productId, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                className="h-8 w-8"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-white space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-blue-600">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <RainbowButton
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full h-12 text-base font-medium"
            >
              {isCheckingOut ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </RainbowButton>
          </div>
        )}
      </div>
    </>
  );
}

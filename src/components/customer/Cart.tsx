import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart = ({ isOpen, onClose }: CartProps) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);
  const { cart, loading, updateQuantity, removeFromCart } = useCart();
  
  const items = cart?.items || [];
  const total = cart?.totalPrice || 0;

  // Debug cart state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🛒 Cart modal opened!');
      console.log('🛒 Cart object:', cart);
      console.log('🛒 Items array:', items);
      console.log('🛒 Items length:', items.length);
      console.log('🛒 Total items:', cart?.totalItems);
      console.log('🛒 Loading state:', loading);
    }
  }, [isOpen, cart, items, loading]);

  // Handle backdrop click and escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
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
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 overflow-hidden",
      "transition-all duration-300 ease-out",
      isClosing ? "opacity-0" : "opacity-100"
    )}>
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-50"
        )}
        onClick={handleClose} 
      />
      
      {/* Cart Panel */}
      <div className={cn(
        "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl",
        "transform transition-transform duration-300 ease-out",
        "flex flex-col",
        isClosing ? "translate-x-full" : "translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Shopping Cart</h2>
            {items.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="mobile-icon-sm"
            className="h-10 w-10 rounded-xl hover:bg-gray-100"
            enableHaptics={true}
            hapticIntensity="light"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state-mobile">
              <div className="bg-gray-100 rounded-full p-8 mb-4">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <h3>Your cart is empty</h3>
              <p>Add some products to get started with your order</p>
              <Button
                onClick={handleClose}
                variant="outline-mobile"
                size="mobile-md"
                enableHaptics={true}
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="card-mobile"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start space-x-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-600 font-medium">🏪 {item.vendor || 'Unknown Vendor'}</p>
                          {item.qualityName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800">
                              {item.qualityName}
                            </span>
                          )}
                        </div>
                        {item.brandName && item.modelName && (
                          <p className="text-xs text-gray-500">{item.brandName} • {item.modelName}</p>
                        )}
                        {item.warranty > 0 && (
                          <p className="text-xs text-green-600">🛡️ {item.warranty} months warranty</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-semibold text-gray-900">₹{item.price.toLocaleString()}</p>
                        
                        {/* Enhanced Quantity Controls */}
                        <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1">
                          <Button
                            onClick={() => updateQuantity(item.productId, Math.max(0, item.quantity - 1))}
                            variant="ghost"
                            size="mobile-icon-sm"
                            className="quantity-btn h-10 w-10"
                            enableHaptics={true}
                            hapticIntensity="light"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <span className="min-w-[32px] text-center text-sm font-medium px-2">{item.quantity}</span>
                          
                          <Button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            variant="ghost"
                            size="mobile-icon-sm"
                            className="quantity-btn h-10 w-10"
                            enableHaptics={true}
                            hapticIntensity="light"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Item Total and Remove */}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-gray-600">
                          Total: <span className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </p>
                        <Button
                          onClick={() => removeFromCart(item.productId)}
                          variant="ghost"
                          size="mobile-icon-sm"
                          className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                          enableHaptics={true}
                          hapticIntensity="medium"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-white space-y-4 pb-safe">
            {/* Order Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Enhanced Checkout Button */}
            <Button 
              variant="primary-mobile"
              size="mobile-full-lg"
              className="shadow-lg"
              onClick={() => {
                handleClose();
                navigate('/checkout');
              }}
              enableHaptics={true}
              hapticIntensity="medium"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

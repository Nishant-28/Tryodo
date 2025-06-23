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
          <button
            onClick={handleClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors duration-200 touch-manipulation active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto scroll-touch">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <div className="bg-gray-100 rounded-full p-8 mb-4">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Add some products to get started with your order
              </p>
              <Button
                onClick={handleClose}
                variant="outline"
                className="touch-manipulation active:scale-95"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "bg-white border border-gray-200 rounded-xl p-4 shadow-sm",
                    "transition-all duration-200 hover:shadow-md",
                    "animate-in slide-in-from-right duration-300",
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start space-x-4">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{item.vendor}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-lg font-semibold text-gray-900">₹{item.price.toLocaleString()}</p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => {
                              triggerHapticFeedback();
                              updateQuantity(item.productId, Math.max(0, item.quantity - 1));
                            }}
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors touch-manipulation active:scale-95"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          
                          <button
                            onClick={() => {
                              triggerHapticFeedback();
                              updateQuantity(item.productId, item.quantity + 1);
                            }}
                            className="w-8 h-8 rounded-md border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors touch-manipulation active:scale-95"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Item Total and Remove */}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-gray-600">
                          Total: <span className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </p>
                        <button
                          onClick={() => {
                            triggerHapticFeedback();
                            removeFromCart(item.productId);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors touch-manipulation active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-white space-y-4 safe-area-pb">
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
            
            {/* Checkout Button */}
            <Button 
              className={cn(
                "w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                "touch-manipulation active:scale-98 transition-transform duration-150",
                "font-semibold text-white shadow-lg"
              )}
              onClick={() => {
                triggerHapticFeedback();
                handleClose();
                navigate('/checkout');
              }}
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

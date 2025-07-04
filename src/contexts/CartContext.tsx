import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { CartAPI, CartItem, CartSummary } from '../lib/cartApi';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface CartContextType {
  cart: CartSummary | null;
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Optimization: Cache and debouncing
  const lastLoadedUserRef = useRef<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCartUpdateRef = useRef<number>(0);
  
  // Debounced cart loading to prevent excessive API calls
  const debouncedLoadCart = useCallback(async () => {
    // Clear any pending load
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    loadTimeoutRef.current = setTimeout(async () => {
      await loadCart();
    }, 300); // 300ms debounce
  }, []);

  // Load cart data when user is authenticated
  const loadCart = useCallback(async () => {
    // Optimization: Skip loading if user hasn't changed and we have recent data
    const currentUserId = user?.id || 'guest';
    const now = Date.now();
    
    if (
      lastLoadedUserRef.current === currentUserId && 
      cart && 
      (now - lastCartUpdateRef.current) < 30000 // 30 seconds cache
    ) {
      console.log('🚀 Using cached cart data');
      return;
    }
    
    if (!user || !profile || profile.role !== 'customer') {
      // For non-customers, set empty cart
      setCart({
        items: [],
        totalItems: 0,
        totalPrice: 0,
        cartId: 'guest-cart'
      });
      lastLoadedUserRef.current = currentUserId;
      return;
    }

    setLoading(true);
    try {
      const cartData = await CartAPI.getCart();
      if (cartData) {
        setCart(cartData);
        lastCartUpdateRef.current = now;
        lastLoadedUserRef.current = currentUserId;
      } else {
        setCart({
          items: [],
          totalItems: 0,
          totalPrice: 0,
          cartId: 'empty-cart'
        });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setCart({
        items: [],
        totalItems: 0,
        totalPrice: 0,
        cartId: 'error-cart'
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, cart]);

  // Optimized sync - only run once when user logs in
  const syncLocalCart = useCallback(async () => {
    if (!user || !profile || profile.role !== 'customer') return;

    try {
      const result = await CartAPI.syncLocalCart();
      if (result.success) {
        // Force refresh after sync
        lastCartUpdateRef.current = 0;
        await loadCart();
      }
    } catch (error) {
      console.error('Error syncing local cart:', error);
    }
  }, [user, profile, loadCart]);

  // Optimized: Only load cart when authentication state actually changes
  useEffect(() => {
    const currentUserId = user?.id || 'guest';
    
    // Only trigger load if user actually changed
    if (lastLoadedUserRef.current !== currentUserId) {
      if (user && profile && profile.role === 'customer') {
        syncLocalCart();
      } else {
        debouncedLoadCart();
      }
    }
  }, [user?.id, profile?.role]); // Only depend on ID and role, not entire objects

  // Optimized cart operations with local state updates
  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    if (!user || !profile || profile.role !== 'customer') {
      toast.error('Please log in to add items to cart');
      return;
    }

    try {
      const result = await CartAPI.addToCart(productId, quantity);
      if (result.success) {
        // Force refresh cart after successful add
        lastCartUpdateRef.current = 0;
        await loadCart();
        toast.success('Added to cart!');
      } else {
        toast.error(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  }, [user, profile, loadCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    try {
      const result = await CartAPI.updateQuantity(productId, quantity);
      if (result.success) {
        // Update local state optimistically for better UX
        if (cart) {
          const updatedItems = cart.items.map(item => 
            item.productId === productId ? { ...item, quantity } : item
          );
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          setCart({
            ...cart,
            items: updatedItems,
            totalItems,
            totalPrice
          });
        }
        
        toast.success('Cart updated!');
      } else {
        toast.error(result.error || 'Failed to update cart');
        // Refresh on error to ensure consistency
        await loadCart();
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Failed to update cart');
      await loadCart();
    }
  }, [cart, loadCart]);

  const removeFromCart = useCallback(async (productId: string) => {
    try {
      const result = await CartAPI.removeFromCart(productId);
      if (result.success) {
        // Update local state optimistically
        if (cart) {
          const updatedItems = cart.items.filter(item => item.productId !== productId);
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          setCart({
            ...cart,
            items: updatedItems,
            totalItems,
            totalPrice
          });
        }
        
        toast.success('Item removed from cart');
      } else {
        toast.error(result.error || 'Failed to remove item');
        await loadCart();
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
      await loadCart();
    }
  }, [cart, loadCart]);

  const clearCart = useCallback(async () => {
    try {
      const result = await CartAPI.clearCart();
      if (result.success) {
        setCart({
          items: [],
          totalItems: 0,
          totalPrice: 0,
          cartId: cart?.cartId || 'empty-cart'
        });
        toast.success('Cart cleared');
      } else {
        toast.error(result.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  }, [cart?.cartId]);

  const refreshCart = useCallback(async () => {
    lastCartUpdateRef.current = 0; // Force refresh
    await loadCart();
  }, [loadCart]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const totalItems = cart?.totalItems || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}; 
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Load cart data when user is authenticated
  const loadCart = useCallback(async () => {
    console.log('🔄 Loading cart for user:', user?.email, 'role:', profile?.role);
    
    if (!user || !profile || profile.role !== 'customer') {
      console.log('❌ User not authenticated or not a customer');
      setCart(null);
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Fetching cart data...');
      const cartData = await CartAPI.getCart();
      console.log('🛒 Cart data received:', cartData);
      setCart(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  // Sync localStorage cart with database when user logs in
  const syncLocalCart = useCallback(async () => {
    if (!user || !profile || profile.role !== 'customer') return;

    console.log('🔄 Syncing localStorage cart to database...');
    try {
      const result = await CartAPI.syncLocalCart();
      console.log('✅ Sync result:', result);
      await loadCart(); // Reload cart after sync
    } catch (error) {
      console.error('Error syncing local cart:', error);
    }
  }, [user, profile, loadCart]);

  // Load cart when user authentication state changes
  useEffect(() => {
    if (user && profile && profile.role === 'customer') {
      syncLocalCart();
    } else {
      setCart(null);
    }
  }, [user, profile, syncLocalCart]);

  // Add item to cart
  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    console.log('🎯 AddToCart called with:', { productId, quantity });
    
    if (!user || !profile || profile.role !== 'customer') {
      // For non-authenticated users, fall back to localStorage
      const localCartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      const existingItem = localCartItems.find((item: any) => item.id === productId);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // Note: For localStorage fallback, we need product details
        // This should be handled by the calling component
        console.warn('Adding to localStorage cart requires product details');
        return;
      }
      
      localStorage.setItem('cartItems', JSON.stringify(localCartItems));
      toast.success('Added to cart!');
      return;
    }

    try {
      console.log('🚀 Adding to database cart...');
      const result = await CartAPI.addToCart(productId, quantity);
      console.log('✅ Add to cart result:', result);
      
      if (result.success) {
        console.log('🔄 Refreshing cart after add...');
        await loadCart(); // Refresh cart
        console.log('✅ Cart refreshed after add');
        toast.success('Added to cart!');
      } else {
        toast.error(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  }, [user, profile, loadCart]);

  // Update item quantity
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (!user || !profile || profile.role !== 'customer') {
      // For non-authenticated users, fall back to localStorage
      const localCartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      const updatedItems = quantity <= 0 
        ? localCartItems.filter((item: any) => item.id !== productId)
        : localCartItems.map((item: any) => 
            item.id === productId ? { ...item, quantity } : item
          );
      
      localStorage.setItem('cartItems', JSON.stringify(updatedItems));
      return;
    }

    try {
      const result = await CartAPI.updateQuantity(productId, quantity);
      if (result.success) {
        await loadCart(); // Refresh cart
      } else {
        toast.error(result.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  }, [user, profile, loadCart]);

  // Remove item from cart
  const removeFromCart = useCallback(async (productId: string) => {
    if (!user || !profile || profile.role !== 'customer') {
      // For non-authenticated users, fall back to localStorage
      const localCartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      const updatedItems = localCartItems.filter((item: any) => item.id !== productId);
      localStorage.setItem('cartItems', JSON.stringify(updatedItems));
      return;
    }

    try {
      const result = await CartAPI.removeFromCart(productId);
      if (result.success) {
        await loadCart(); // Refresh cart
        toast.success('Item removed from cart');
      } else {
        toast.error(result.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item');
    }
  }, [user, profile, loadCart]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    if (!user || !profile || profile.role !== 'customer') {
      // For non-authenticated users, clear localStorage
      localStorage.removeItem('cartItems');
      return;
    }

    try {
      const result = await CartAPI.clearCart();
      if (result.success) {
        await loadCart(); // Refresh cart
        toast.success('Cart cleared');
      } else {
        toast.error(result.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  }, [user, profile, loadCart]);

  // Refresh cart data
  const refreshCart = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  // Calculate total items
  const totalItems = cart?.totalItems || 0;

  const value: CartContextType = {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    totalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 
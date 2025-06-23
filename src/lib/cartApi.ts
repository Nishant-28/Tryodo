import { supabase } from './supabase';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  vendor: string;
  vendorId: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image?: string;
  deliveryTime: number;
  warranty: number;
  modelName?: string;
  brandName?: string;
  qualityName?: string;
  addedAt: string;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  cartId: string;
}

export class CartAPI {
  /**
   * Get the customer ID for the current user
   */
  private static async getCustomerId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.email);
      
      if (!user) {
        console.log('❌ No authenticated user');
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('role', 'customer')
        .single();

      console.log('👤 User profile:', profile);

      if (!profile) {
        console.log('❌ No customer profile found');
        return null;
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      console.log('🛍️ Customer record:', customer);

      return customer?.id || null;
    } catch (error) {
      console.error('Error getting customer ID:', error);
      return null;
    }
  }

  /**
   * Get current cart details with all items
   */
  static async getCart(): Promise<CartSummary | null> {
    try {
      const customerId = await this.getCustomerId();
      console.log('🛒 Getting cart for customer ID:', customerId);
      
      if (!customerId) {
        console.log('❌ No customer ID found');
        return null;
      }

      const { data, error } = await supabase.rpc('get_cart_details', {
        customer_uuid: customerId
      });

      console.log('🔍 Cart data from database:', data);
      console.log('🔍 Cart error from database:', error);

      if (error) {
        console.error('Error fetching cart:', error);
        return null;
      }

      const items: CartItem[] = (data || []).map((item: any) => ({
        id: item.item_id,
        productId: item.product_id,
        name: item.model_name || 'Unknown Product',
        vendor: item.vendor_name || 'Unknown Vendor',
        vendorId: item.vendor_id,
        price: parseFloat(item.price || 0),
        originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
        quantity: item.quantity,
        image: item.product_images?.[0],
        deliveryTime: item.delivery_time_days || 0,
        warranty: item.warranty_months || 0,
        modelName: item.model_name,
        brandName: item.brand_name,
        qualityName: item.quality_name,
        addedAt: item.added_at
      }));

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      console.log('📦 Processed cart items:', items);
      console.log('🔢 Total items:', totalItems);

      return {
        items,
        totalItems,
        totalPrice,
        cartId: data?.[0]?.cart_id || ''
      };
    } catch (error) {
      console.error('Error in getCart:', error);
      return null;
    }
  }

  /**
   * Add item to cart or update quantity if already exists
   */
  static async addToCart(productId: string, quantity: number = 1): Promise<{ success: boolean; error?: string }> {
    try {
      const customerId = await this.getCustomerId();
      if (!customerId) {
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      const { data, error } = await supabase.rpc('add_to_cart', {
        customer_uuid: customerId,
        product_uuid: productId,
        item_quantity: quantity
      });

      if (error) {
        console.error('Error adding to cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in addToCart:', error);
      return { success: false, error: error.message || 'Failed to add item to cart' };
    }
  }

  /**
   * Update item quantity in cart
   */
  static async updateQuantity(productId: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const customerId = await this.getCustomerId();
      if (!customerId) {
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      const { data, error } = await supabase.rpc('update_cart_item_quantity', {
        customer_uuid: customerId,
        product_uuid: productId,
        new_quantity: quantity
      });

      if (error) {
        console.error('Error updating cart quantity:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateQuantity:', error);
      return { success: false, error: error.message || 'Failed to update item quantity' };
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customerId = await this.getCustomerId();
      if (!customerId) {
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      const { data, error } = await supabase.rpc('remove_from_cart', {
        customer_uuid: customerId,
        product_uuid: productId
      });

      if (error) {
        console.error('Error removing from cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in removeFromCart:', error);
      return { success: false, error: error.message || 'Failed to remove item from cart' };
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const customerId = await this.getCustomerId();
      if (!customerId) {
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      const { data, error } = await supabase.rpc('clear_cart', {
        customer_uuid: customerId
      });

      if (error) {
        console.error('Error clearing cart:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in clearCart:', error);
      return { success: false, error: error.message || 'Failed to clear cart' };
    }
  }

  /**
   * Sync localStorage cart with database cart (for migration)
   */
  static async syncLocalCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const customerId = await this.getCustomerId();
      if (!customerId) return { success: false, error: 'User not authenticated' };

      // Get items from localStorage
      const localCartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
      console.log('🔄 LocalStorage items to sync:', localCartItems);
      
      if (localCartItems.length === 0) {
        console.log('ℹ️ No localStorage items to sync');
        return { success: true }; // Nothing to sync
      }

      console.log(`🚀 Syncing ${localCartItems.length} items from localStorage to database...`);

      // Add each item to database cart
      for (const item of localCartItems) {
        console.log('➕ Adding item to DB cart:', item);
        const result = await this.addToCart(item.id, item.quantity);
        console.log('✅ Add result:', result);
      }

      // Clear localStorage after successful sync
      localStorage.removeItem('cartItems');
      console.log('🧹 Cleared localStorage cart');
      
      return { success: true };
    } catch (error: any) {
      console.error('Error syncing local cart:', error);
      return { success: false, error: error.message || 'Failed to sync cart' };
    }
  }

  /**
   * Subscribe to cart changes (real-time updates)
   */
  static subscribeToCartChanges(customerId: string, callback: (cart: CartSummary | null) => void) {
    const subscription = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `cart_id=in.(select id from shopping_carts where customer_id=${customerId})`
        },
        async () => {
          // Refetch cart data when changes occur
          const cart = await this.getCart();
          callback(cart);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
} 
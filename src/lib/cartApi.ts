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

// Simple in-memory cache for frequently accessed data
class CacheManager {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  static clear(): void {
    this.cache.clear();
  }
}

export class CartAPI {
  /**
   * Get the customer ID for the current user with caching
   */
  private static async getCustomerId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Check cache first
      const cacheKey = `customer_id_${user.id}`;
      const cachedCustomerId = CacheManager.get(cacheKey);
      if (cachedCustomerId) {
        return cachedCustomerId;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('role', 'customer')
        .single();

      if (!profile) {
        return null;
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      const customerId = customer?.id || null;
      
      // Cache the customer ID
      if (customerId) {
        CacheManager.set(cacheKey, customerId);
      }

      return customerId;
    } catch (error) {
      console.error('Error getting customer ID:', error);
      return null;
    }
  }

  /**
   * Get current cart details with all items using optimized single query
   */
  static async getCart(): Promise<CartSummary | null> {
    try {
      const customerId = await this.getCustomerId();
      
      if (!customerId) {
        return null;
      }

      // Get or create cart
      const { data: cart, error: cartError } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (cartError || !cart) {
        // Create new cart
        const { data: newCart, error: createError } = await supabase
          .from('shopping_carts')
          .insert([{ customer_id: customerId }])
          .select('id')
          .single();

        if (createError || !newCart) {
          return null;
        }

        return {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          cartId: newCart.id
        };
      }

      // OPTIMIZED: Single query with all necessary joins
      const { data: cartItems, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          added_at,
          product_id,
          vendor_products:product_id!inner(
            id,
            price,
            original_price,
            discount_percentage,
            stock_quantity,
            is_in_stock,
            warranty_months,
            delivery_time_days,
            vendor_id,
            category_id,
            quality_type_id,
            model_id,
            vendors:vendor_id!inner(
              id,
              business_name,
              rating,
              is_verified
            ),
            category_qualities:quality_type_id(
              id,
              quality_name,
              quality_description
            ),
            smartphone_models:model_id!inner(
              id,
              model_name,
              specifications,
              official_images,
              brands:brand_id!inner(
                id,
                name,
                logo_url
              )
            )
          )
        `)
        .eq('cart_id', cart.id);

      if (itemsError) {
        console.log('❌ Error fetching cart items:', itemsError);
        return null;
      }

      if (!cartItems || cartItems.length === 0) {
        return {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          cartId: cart.id
        };
      }

      // Transform the optimized query results
      const enrichedItems: CartItem[] = cartItems.map((item: any) => {
        const product = item.vendor_products;
        const vendor = product.vendors;
        const quality = product.category_qualities;
        const model = product.smartphone_models;
        const brand = model?.brands;

        // Handle cases where joins might fail due to data issues
        const vendorName = vendor?.business_name || 'Unknown Vendor';
        const modelName = model?.model_name || 'Unknown Model';
        const brandName = brand?.name || 'Unknown Brand';

        return {
          id: item.id,
          productId: product.id,
          name: `${brandName} ${modelName}`,
          vendor: vendorName,
          vendorId: product.vendor_id,
          price: parseFloat(product.price || 0),
          originalPrice: product.original_price ? parseFloat(product.original_price) : undefined,
          quantity: item.quantity,
          image: model?.official_images?.[0],
          deliveryTime: product.delivery_time_days || 0,
          warranty: product.warranty_months || 0,
          modelName: modelName,
          brandName: brandName,
          qualityName: quality?.quality_name,
          addedAt: item.added_at
        };
      });

      const totalItems = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        items: enrichedItems,
        totalItems,
        totalPrice,
        cartId: cart.id
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
      console.log('🎯 AddToCart: Starting with productId:', productId, 'quantity:', quantity);
      
      const customerId = await this.getCustomerId();
      if (!customerId) {
        console.log('❌ No customer ID found');
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      console.log('🛍️ Customer ID for cart:', customerId);

      // Get or create cart for customer
      let { data: cart, error: cartError } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (cartError || !cart) {
        console.log('📝 Creating new cart for customer');
        
        // Create new cart
        const { data: newCart, error: createError } = await supabase
          .from('shopping_carts')
          .insert([{ customer_id: customerId }])
          .select('id')
          .single();

        if (createError || !newCart) {
          console.log('❌ Failed to create cart:', createError);
          return { success: false, error: 'Failed to create cart' };
        }

        cart = newCart;
        console.log('✅ Created new cart:', cart.id);
      }

      console.log('🛒 Using cart ID:', cart.id);

      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('product_id', productId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.log('❌ Error checking existing item:', checkError);
        return { success: false, error: 'Failed to check existing cart item' };
      }

      if (existingItem) {
        console.log('🔄 Item exists, updating quantity from', existingItem.quantity, 'to', existingItem.quantity + quantity);
        
        // Update existing item quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (updateError) {
          console.log('❌ Error updating cart item quantity:', updateError);
          return { success: false, error: 'Failed to update cart item quantity' };
        }

        console.log('✅ Updated existing cart item');
      } else {
        console.log('➕ Adding new item to cart');
        
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            cart_id: cart.id,
            product_id: productId,
            quantity: quantity
          }]);

        if (insertError) {
          console.log('❌ Error adding new cart item:', insertError);
          return { success: false, error: 'Failed to add item to cart' };
        }

        console.log('✅ Added new item to cart');
      }

      console.log('✅ AddToCart completed successfully');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Error in addToCart:', error);
      return { success: false, error: error.message || 'Failed to add item to cart' };
    }
  }

  /**
   * Update item quantity in cart
   */
  static async updateQuantity(productId: string, quantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 UpdateQuantity: productId:', productId, 'quantity:', quantity);
      
      const customerId = await this.getCustomerId();
      if (!customerId) {
        console.log('❌ No customer ID found');
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      // Get cart for customer
      const { data: cart, error: cartError } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (cartError || !cart) {
        console.log('❌ No cart found for customer');
        return { success: false, error: 'Cart not found' };
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id)
          .eq('product_id', productId);

        if (deleteError) {
          console.log('❌ Error removing cart item:', deleteError);
          return { success: false, error: 'Failed to remove item from cart' };
        }

        console.log('✅ Removed item from cart');
      } else {
        // Update quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: quantity })
          .eq('cart_id', cart.id)
          .eq('product_id', productId);

        if (updateError) {
          console.log('❌ Error updating cart item quantity:', updateError);
          return { success: false, error: 'Failed to update item quantity' };
        }

        console.log('✅ Updated cart item quantity');
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in updateQuantity:', error);
      return { success: false, error: error.message || 'Failed to update item quantity' };
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ RemoveFromCart: productId:', productId);
      
      const customerId = await this.getCustomerId();
      if (!customerId) {
        console.log('❌ No customer ID found');
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      // Get cart for customer
      const { data: cart, error: cartError } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (cartError || !cart) {
        console.log('❌ No cart found for customer');
        return { success: false, error: 'Cart not found' };
      }

      // Remove item from cart
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id)
        .eq('product_id', productId);

      if (deleteError) {
        console.log('❌ Error removing cart item:', deleteError);
        return { success: false, error: 'Failed to remove item from cart' };
      }

      console.log('✅ Removed item from cart');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in removeFromCart:', error);
      return { success: false, error: error.message || 'Failed to remove item from cart' };
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧹 ClearCart: Starting');
      
      const customerId = await this.getCustomerId();
      if (!customerId) {
        console.log('❌ No customer ID found');
        return { success: false, error: 'User not authenticated or not a customer' };
      }

      // Get cart for customer
      const { data: cart, error: cartError } = await supabase
        .from('shopping_carts')
        .select('id')
        .eq('customer_id', customerId)
        .single();

      if (cartError || !cart) {
        console.log('❌ No cart found for customer');
        return { success: false, error: 'Cart not found' };
      }

      // Clear all items from cart
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (deleteError) {
        console.log('❌ Error clearing cart:', deleteError);
        return { success: false, error: 'Failed to clear cart' };
      }

      console.log('✅ Cleared cart');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error in clearCart:', error);
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
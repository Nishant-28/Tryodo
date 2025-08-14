import { supabase } from './supabase';
import { TryodoAPI } from './api';

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
  productType?: 'existing' | 'marketplace';
  marketVendorProductId?: string;
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

      // OPTIMIZED: Single query with all necessary joins for both product types
      const { data: cartItems, error: itemsError } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          added_at,
          product_id,
          market_vendor_product_id,
          vendor_products:product_id(
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
            vendors:vendor_id(
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
            smartphone_models:model_id(
              id,
              model_name,
              specifications,
              official_images,
              brands:brand_id(
                id,
                name,
                logo_url
              )
            )
          ),
          market_vendor_products:market_vendor_product_id(
            id,
            price,
            original_price,
            discount_percentage,
            stock_quantity,
            is_in_stock,
            delivery_time_hours,
            vendor_id,
            market_product_id,
            vendors:vendor_id(
              id,
              business_name,
              rating,
              is_verified
            ),
            market_products:market_product_id(
              id,
              name,
              description,
              images,
              specifications,
              base_unit,
              category_id,
              brand_id,
              market_categories:category_id(
                id,
                name
              ),
              market_brands:brand_id(
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

      // Transform the optimized query results with robust error handling for both product types
      const enrichedItems: CartItem[] = await Promise.all(
        cartItems.map(async (item: any) => {
          console.log('🔍 Processing cart item:', item.id);
          
          // Determine product type based on which ID is present
          const isMarketplaceProduct = !!item.market_vendor_product_id;
          const productType = isMarketplaceProduct ? 'marketplace' : 'existing';
          
          if (isMarketplaceProduct) {
            // Handle marketplace product
            const marketVendorProduct = item.market_vendor_products;
            if (!marketVendorProduct) {
              console.log('❌ No marketplace product data found for cart item:', item.id);
              return null;
            }
            
            const vendor = marketVendorProduct.vendors;
            const marketProduct = marketVendorProduct.market_products;
            const category = marketProduct?.market_categories;
            const brand = marketProduct?.market_brands;

            const vendorName = vendor?.business_name || 'Unknown Vendor';
            const productName = marketProduct?.name || `Product ${marketVendorProduct.id}`;
            const brandName = brand?.name || 'Unknown Brand';
            const categoryName = category?.name || 'Unknown Category';

            console.log('✅ Processing marketplace product:', { brandName, productName, vendorName, categoryName });

            const finalPrice = parseFloat(marketVendorProduct.price || 0);

            return {
              id: item.id,
              productId: marketVendorProduct.id,
              name: productName,
              vendor: vendorName,
              vendorId: marketVendorProduct.vendor_id,
              price: finalPrice,
              originalPrice: marketVendorProduct.original_price ? parseFloat(marketVendorProduct.original_price) : undefined,
              quantity: item.quantity,
              image: marketProduct?.images?.[0],
              deliveryTime: Math.ceil((marketVendorProduct.delivery_time_hours || 0) / 24), // Convert hours to days
              warranty: 0, // Marketplace products don't have warranty in the current schema
              modelName: productName,
              brandName: brandName,
              qualityName: categoryName,
              addedAt: item.added_at,
              productType: 'marketplace',
              marketVendorProductId: marketVendorProduct.id
            };
          } else {
            // Handle existing product
            const product = item.vendor_products;
            if (!product) {
              console.log('❌ No existing product data found for cart item:', item.id);
              return null;
            }
            
            const vendor = product.vendors;
            const quality = product.category_qualities;
            const model = product.smartphone_models;
            const brand = model?.brands;

            // Handle cases where joins might fail due to data issues
            const vendorName = vendor?.business_name || 'Unknown Vendor';
            const modelName = model?.model_name || `Product ${product.id}`;
            const brandName = brand?.name || 'Unknown Brand';
            const qualityName = quality?.quality_name || 'Standard';

            console.log('✅ Processing existing product:', { brandName, modelName, vendorName, qualityName });

            // Calculate final price with upside markup
            let finalPrice = parseFloat(product.price || 0);
            try {
              if (product.vendor_id && product.quality_type_id) {
                const calculatedPrice = await TryodoAPI.calculateCustomerPrice(
                  product.vendor_id,
                  product.quality_type_id,
                  finalPrice
                );
                if (calculatedPrice > finalPrice) {
                  console.log(`💰 Upside pricing applied: ₹${finalPrice} → ₹${calculatedPrice}`);
                  finalPrice = calculatedPrice;
                }
              }
            } catch (error) {
              console.warn('❌ Failed to calculate upside pricing for cart item:', error);
              // Fall back to base price if upside calculation fails
            }

            return {
              id: item.id,
              productId: product.id,
              name: `${brandName} ${modelName}`,
              vendor: vendorName,
              vendorId: product.vendor_id,
              price: finalPrice,
              originalPrice: product.original_price ? parseFloat(product.original_price) : undefined,
              quantity: item.quantity,
              image: model?.official_images?.[0],
              deliveryTime: product.delivery_time_days || 0,
              warranty: product.warranty_months || 0,
              modelName: modelName,
              brandName: brandName,
              qualityName: qualityName,
              addedAt: item.added_at,
              productType: 'existing'
            };
          }
        })
      );

      // Filter out any null items
      const validItems = enrichedItems.filter(Boolean) as CartItem[];

      const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        items: validItems,
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
   * Supports both existing products and marketplace products
   */
  static async addToCart(
    productIdOrOptions: string | { 
      market_vendor_product_id?: string; 
      product_id?: string; 
      quantity?: number; 
      product_type?: 'existing' | 'marketplace' 
    }, 
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Parse input parameters
      let productId: string | null = null;
      let marketVendorProductId: string | null = null;
      let productType: 'existing' | 'marketplace' = 'existing';
      let actualQuantity = quantity;

      if (typeof productIdOrOptions === 'string') {
        // Legacy format - existing product
        productId = productIdOrOptions;
        productType = 'existing';
      } else {
        // New format - supports both types
        productId = productIdOrOptions.product_id || null;
        marketVendorProductId = productIdOrOptions.market_vendor_product_id || null;
        productType = productIdOrOptions.product_type || 'existing';
        actualQuantity = productIdOrOptions.quantity || quantity;
      }

      console.log('🎯 AddToCart: Starting with', { productId, marketVendorProductId, productType, actualQuantity });
      
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

      // Build query for checking existing item based on product type
      let existingItemQuery = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id);

      if (productType === 'marketplace' && marketVendorProductId) {
        existingItemQuery = existingItemQuery.eq('market_vendor_product_id', marketVendorProductId);
      } else if (productType === 'existing' && productId) {
        existingItemQuery = existingItemQuery.eq('product_id', productId);
      } else {
        return { success: false, error: 'Invalid product information provided' };
      }

      const { data: existingItem, error: checkError } = await existingItemQuery.single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.log('❌ Error checking existing item:', checkError);
        return { success: false, error: 'Failed to check existing cart item' };
      }

      if (existingItem) {
        console.log('🔄 Item exists, updating quantity from', existingItem.quantity, 'to', existingItem.quantity + actualQuantity);
        
        // Update existing item quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + actualQuantity })
          .eq('id', existingItem.id);

        if (updateError) {
          console.log('❌ Error updating cart item quantity:', updateError);
          return { success: false, error: 'Failed to update cart item quantity' };
        }

        console.log('✅ Updated existing cart item');
      } else {
        console.log('➕ Adding new item to cart');
        
        // Prepare insert data based on product type
        const insertData: any = {
          cart_id: cart.id,
          quantity: actualQuantity
        };

        if (productType === 'marketplace' && marketVendorProductId) {
          insertData.market_vendor_product_id = marketVendorProductId;
        } else if (productType === 'existing' && productId) {
          insertData.product_id = productId;
        }

        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([insertData]);

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
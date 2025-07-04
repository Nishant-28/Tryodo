import { supabase, supabaseServiceRole } from './supabase';

// Types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  brand_id?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  quality_type?: string;
  search?: string;
  is_active?: boolean;
}

// Brand-related API functions
export class BrandAPI {
  /**
   * Get all active brands
   */
  static async getAllBrands(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Brands retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch brands'
      };
    }
  }

  /**
   * Get brand by ID
   */
  static async getBrandById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Brand retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch brand'
      };
    }
  }
}

// Smartphone Models API
export class SmartphoneAPI {
  /**
   * Get all smartphone models with filters and pagination
   */
  static async getSmartphones(
    filters: FilterParams = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          )
        `)
        .eq('is_active', true);

      // Apply filters
      if (filters.brand_id) {
        query = query.eq('brand_id', filters.brand_id);
      }

      if (filters.search) {
        query = query.or(`model_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('model_name');

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} smartphones`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch smartphones'
      };
    }
  }

  /**
   * Get smartphone model by ID with all vendor listings
   */
  static async getSmartphoneById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          ),
          vendor_products (
            id,
            price,
            original_price,
            warranty_months,
            stock_quantity,
            is_in_stock,
            delivery_time_days,
            product_images,
            specifications,
            vendors (
              id,
              business_name,
              rating,
              total_reviews,
              is_verified
            ),
            categories (
              id,
              name,
              description
            ),
            category_qualities (
              id,
              quality_name,
              quality_description
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Smartphone details retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch smartphone details'
      };
    }
  }

  /**
   * Search smartphones by keyword
   */
  static async searchSmartphones(
    keyword: string,
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          )
        `)
        .or(`model_name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('model_name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Found ${data?.length || 0} smartphones matching "${keyword}"`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search smartphones'
      };
    }
  }
}

// Vendor API
export class VendorAPI {
  /**
   * Get all verified vendors
   */
  static async getVerifiedVendors(pagination: PaginationParams = {}): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          rating,
          total_reviews,
          total_sales,
          response_time_hours,
          is_verified,
          joined_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq('is_verified', true)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('rating', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Verified vendors retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendors'
      };
    }
  }

  /**
   * Get vendor by ID with their products
   */
  static async getVendorById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          vendor_products (
            id,
            price,
            original_price,
            warranty_months,
            stock_quantity,
            is_in_stock,
            delivery_time_days,
            smartphone_models (
              id,
              model_name,
              brands (
                name
              )
            ),
            categories (
              name
            ),
            category_qualities (
              quality_name
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Vendor details retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor details'
      };
    }
  }

  /**
   * Get vendor products with filters
   */
  static async getVendorProducts(
    vendorId: string,
    filters: FilterParams = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('vendor_products')
        .select(`
          *,
          smartphone_models (
            id,
            model_name,
            brands (
              name,
              logo_url
            )
          ),
          categories (
            name
          ),
          category_qualities (
            quality_name,
            quality_description
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      // Apply filters
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.min_price) {
        query = query.gte('price', filters.min_price);
      }

      if (filters.max_price) {
        query = query.lte('price', filters.max_price);
      }

      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Vendor products retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor products'
      };
    }
  }
}

// Categories API
export class CategoryAPI {
  /**
   * Get all active categories
   */
  static async getAllCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Categories retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch categories'
      };
    }
  }

  /**
   * Get quality categories
   */
  static async getQualityCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('category_qualities')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Quality categories retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch quality categories'
      };
    }
  }
}

// Product Comparison API
export class ComparisonAPI {
  /**
   * Compare multiple smartphones
   */
  static async compareSmartphones(smartphoneIds: string[]): Promise<ApiResponse<any[]>> {
    try {
      if (smartphoneIds.length < 2 || smartphoneIds.length > 5) {
        return {
          success: false,
          error: 'Please provide 2-5 smartphone IDs for comparison'
        };
      }

      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            name,
            logo_url
          ),
          vendor_products (
            price,
            original_price,
            warranty_months,
            vendors (
              business_name,
              rating
            ),
            category_qualities (
              quality_name
            )
          )
        `)
        .in('id', smartphoneIds)
        .eq('is_active', true);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Smartphone comparison data retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch comparison data'
      };
    }
  }
}

// Analytics API (Read-only for external applications)
export class AnalyticsAPI {
  /**
   * Get popular smartphones (most viewed)
   */
  static async getPopularSmartphones(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('smartphone_views')
        .select(`
          smartphone_model_id,
          count,
          smartphone_models (
            id,
            model_name,
            base_price,
            brands (
              name,
              logo_url
            )
          )
        `)
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Popular smartphones retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch popular smartphones'
      };
    }
  }

  /**
   * Get market statistics
   */
  static async getMarketStats(): Promise<ApiResponse<any>> {
    try {
      // Get total counts
      const [brandsResult, smartphonesResult, vendorsResult] = await Promise.all([
        supabase.from('brands').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('smartphone_models').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('vendors').select('id', { count: 'exact' }).eq('is_active', true).eq('is_verified', true)
      ]);

      // Get price ranges
      const { data: priceData, error: priceError } = await supabase
        .from('vendor_products')
        .select('price')
        .eq('is_active', true);

      if (priceError) throw priceError;

      const prices = priceData?.map(p => p.price) || [];
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      const stats = {
        total_brands: brandsResult.count || 0,
        total_smartphones: smartphonesResult.count || 0,
        total_verified_vendors: vendorsResult.count || 0,
        price_range: {
          min: minPrice,
          max: maxPrice,
          average: Math.round(avgPrice * 100) / 100
        },
        total_products: priceData?.length || 0
      };

      return {
        success: true,
        data: stats,
        message: 'Market statistics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch market statistics'
      };
    }
  }
}

// Order API
export class OrderAPI {
  /**
   * Get customer orders with optimized query
   */
  static async getCustomerOrders(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      // OPTIMIZED: Two efficient queries instead of excessively deep joins
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            vendor:vendors (
              id,
              business_name,
              contact_phone,
              business_city,
              business_state
            )
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!orders || orders.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No orders found'
        };
      }

             // Get delivery partner info for all orders in a single query
       const orderIds = orders.map(order => order.id);
       const { data: deliveryData } = await supabase
         .from('delivery_partner_orders')
         .select('order_id, pickup_otp, delivery_otp, assigned_at, status, delivery_partner_id')
         .in('order_id', orderIds);

               // Get delivery partner profiles separately to avoid deep nesting
        const deliveryPartnerIds = deliveryData?.map(d => d.delivery_partner_id).filter(Boolean) || [];
        const partnerProfiles = new Map();
        
        if (deliveryPartnerIds.length > 0) {
          const { data: partners } = await supabase
            .from('delivery_partners')
            .select('id, profile_id')
            .in('id', deliveryPartnerIds);
          
          // Get profile details separately
          const profileIds = partners?.map(p => p.profile_id).filter(Boolean) || [];
          if (profileIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', profileIds);
            
            // Create profile lookup map
            const profileMap = new Map();
            profiles?.forEach(profile => {
              profileMap.set(profile.id, profile);
            });
            
            // Combine partner and profile data
            partners?.forEach(partner => {
              const profile = profileMap.get(partner.profile_id);
              partnerProfiles.set(partner.id, {
                id: partner.id,
                profile: profile
              });
            });
          }
        }

      // Create a map for quick lookup of delivery data by order_id
      const deliveryMap = new Map();
      deliveryData?.forEach(item => {
        deliveryMap.set(item.order_id, item);
      });

      // Transform the results
      const enhancedOrders = orders.map((order) => {
        const deliveryInfo = deliveryMap.get(order.id);
        let deliveryDetails = null;

        if (deliveryInfo?.delivery_partner) {
          deliveryDetails = {
            delivery_partner_id: deliveryInfo.delivery_partner.id,
            delivery_partner_name: deliveryInfo.delivery_partner.profile?.full_name,
            delivery_partner_phone: deliveryInfo.delivery_partner.profile?.phone,
            pickup_otp: deliveryInfo.pickup_otp,
            delivery_otp: deliveryInfo.delivery_otp,
            delivery_assigned_at: deliveryInfo.assigned_at,
            delivery_status: deliveryInfo.status
          };
        }

        return {
          ...order,
          ...deliveryDetails,
          current_delivery_status: this.getCurrentDeliveryStatus(order, deliveryDetails)
        };
      });

      return {
        success: true,
        data: enhancedOrders,
        message: 'Orders retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch orders'
      };
    }
  }

  /**
   * Subscribe to real-time order updates for a customer
   */
  static subscribeToOrderUpdates(
    customerId: string,
    onUpdate: (payload: any) => void
  ): () => void {
    // Subscribe to orders table changes
    const ordersSubscription = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    // Subscribe to order_items table changes
    const orderItemsSubscription = supabase
      .channel('customer-order-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
                 async (payload) => {
           // Check if this order item belongs to the customer
           const orderId = (payload.new as any)?.order_id || (payload.old as any)?.order_id;
           if (orderId) {
             const { data: order } = await supabase
               .from('orders')
               .select('customer_id')
               .eq('id', orderId)
               .single();

             if (order?.customer_id === customerId) {
               console.log('Order item update received:', payload);
               onUpdate(payload);
             }
           }
         }
      )
      .subscribe();

    // Subscribe to delivery partner orders changes
    const deliverySubscription = supabase
      .channel('customer-delivery-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_partner_orders'
        },
                 async (payload) => {
           // Check if this delivery update belongs to the customer
           const orderId = (payload.new as any)?.order_id || (payload.old as any)?.order_id;
           if (orderId) {
             const { data: order } = await supabase
               .from('orders')
               .select('customer_id')
               .eq('id', orderId)
               .single();

             if (order?.customer_id === customerId) {
               console.log('Delivery update received:', payload);
               onUpdate(payload);
             }
           }
         }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      ordersSubscription.unsubscribe();
      orderItemsSubscription.unsubscribe();
      deliverySubscription.unsubscribe();
    };
  }

  /**
   * Get order by ID with full tracking details
   */
  static async getOrderById(orderId: string): Promise<ApiResponse<any>> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            vendor:vendors (
              id,
              business_name,
              contact_phone,
              business_city,
              business_state
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Get delivery partner information
      let deliveryInfo = null;
      try {
        const { data: deliveryData } = await supabase
          .from('delivery_partner_orders')
          .select(`
            *,
            delivery_partner:delivery_partners (
              id,
              profile:profiles (
                full_name,
                phone
              )
            )
          `)
          .eq('order_id', orderId)
          .single();

        if (deliveryData?.delivery_partner) {
          deliveryInfo = {
            delivery_partner_id: deliveryData.delivery_partner.id,
            delivery_partner_name: deliveryData.delivery_partner.profile?.full_name,
            delivery_partner_phone: deliveryData.delivery_partner.profile?.phone,
            pickup_otp: deliveryData.pickup_otp,
            delivery_otp: deliveryData.delivery_otp,
            delivery_assigned_at: deliveryData.assigned_at,
            delivery_status: deliveryData.status
          };
        }
      } catch (e) {
        // Delivery partner not assigned yet
      }

      return {
        success: true,
        data: {
          ...order,
          ...deliveryInfo,
          current_delivery_status: this.getCurrentDeliveryStatus(order, deliveryInfo)
        },
        message: 'Order retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch order'
      };
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_status: status,
          updated_at: new Date().toISOString(),
          ...(notes && { notes }),
          ...(status === 'delivered' && { actual_delivery_date: new Date().toISOString() }),
          ...(status === 'shipped' && { shipped_date: new Date().toISOString() }),
          ...(status === 'picked_up' && { picked_up_date: new Date().toISOString() }),
          ...(status === 'out_for_delivery' && { out_for_delivery_date: new Date().toISOString() })
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Order status updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update order status'
      };
    }
  }

  /**
   * Get delivery progress percentage
   */
  static getDeliveryProgress(order: any, deliveryPartner?: any): number {
    const status = order.order_status;
    
    switch (status) {
      case 'pending': return 0;
      case 'confirmed': return 20;
      case 'processing': return 40;
      case 'packed': return 50;
      case 'picked_up': return 65;
      case 'shipped': 
      case 'out_for_delivery': return 85;
      case 'delivered': return 100;
      case 'cancelled':
      case 'returned': return 0;
      default: return 0;
    }
  }

  /**
   * Get order statistics for customer
   */
  static async getCustomerOrderStats(customerId: string): Promise<ApiResponse<any>> {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('order_status, total_amount, created_at')
        .eq('customer_id', customerId);

      if (error) throw error;

      const stats = {
        total_orders: orders?.length || 0,
        total_spent: orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        pending_orders: orders?.filter(o => o.order_status === 'pending').length || 0,
        delivered_orders: orders?.filter(o => o.order_status === 'delivered').length || 0,
        cancelled_orders: orders?.filter(o => o.order_status === 'cancelled').length || 0,
        recent_orders: orders?.filter(o => {
          const orderDate = new Date(o.created_at);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return orderDate > thirtyDaysAgo;
        }).length || 0
      };

      return {
        success: true,
        data: stats,
        message: 'Customer order statistics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch order statistics'
      };
    }
  }

  /**
   * Get detailed order tracking information
   */
  static async getOrderTracking(orderId: string): Promise<ApiResponse<any>> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            vendor:vendors (
              id,
              business_name,
              contact_phone
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get delivery partner information
      let deliveryPartner = null;
      const { data: deliveryData } = await supabase
        .from('delivery_partner_orders')
        .select(`
          *,
          delivery_partner:delivery_partners (
            profile:profiles (
              full_name,
              phone
            )
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (deliveryData?.delivery_partner) {
        deliveryPartner = {
          id: deliveryData.delivery_partner_id,
          name: deliveryData.delivery_partner.profile?.full_name,
          phone: deliveryData.delivery_partner.profile?.phone,
          pickup_otp: deliveryData.pickup_otp,
          delivery_otp: deliveryData.delivery_otp,
          assigned_at: deliveryData.assigned_at,
          status: deliveryData.status
        };
      }

      // Build tracking timeline
      const trackingUpdates = this.buildTrackingTimeline(order, deliveryPartner);

      return {
        success: true,
        data: {
          ...order,
          delivery_partner: deliveryPartner,
          tracking_updates: trackingUpdates,
          current_delivery_status: this.getCurrentDeliveryStatus(order, deliveryPartner)
        },
        message: 'Order tracking retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch order tracking'
      };
    }
  }

  /**
   * Cancel an order
   */
  static async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          cancelled_date: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('order_status', 'pending') // Only allow cancelling pending orders
        .select()
        .single();

      if (error) throw error;

      // Also cancel all order items
      await supabase
        .from('order_items')
        .update({
          item_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      return {
        success: true,
        data,
        message: 'Order cancelled successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel order'
      };
    }
  }

  /**
   * Request order return
   */
  static async requestReturn(orderId: string, reason: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          order_status: 'returned',
          updated_at: new Date().toISOString(),
          notes: `Return requested: ${reason}`
        })
        .eq('id', orderId)
        .eq('order_status', 'delivered') // Only allow returns for delivered orders
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Return request submitted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to request return'
      };
    }
  }

  /**
   * Helper method to determine current delivery status
   */
  private static getCurrentDeliveryStatus(order: any, deliveryInfo?: any): string {
    if (deliveryInfo?.delivery_status) {
      return deliveryInfo.delivery_status;
    }
    
    // Map order status to delivery status
    switch (order.order_status) {
      case 'confirmed': return 'confirmed';
      case 'processing': return 'assigned_to_delivery';
      case 'packed': return 'picked_up';
      case 'shipped':
      case 'out_for_delivery': return 'out_for_delivery';
      case 'delivered': return 'delivered';
      default: return order.order_status;
    }
  }

  /**
   * Build tracking timeline from order data
   */
  private static buildTrackingTimeline(order: any, deliveryPartner?: any): any[] {
    const updates = [];

    // Order confirmed
    if (order.created_at) {
      updates.push({
        id: 'confirmed',
        status: 'Order Confirmed',
        message: 'Your order has been confirmed and is being prepared',
        timestamp: order.created_at,
        location: 'Order Processing Center'
      });
    }

    // Assigned to delivery
    if (deliveryPartner?.assigned_at) {
      updates.push({
        id: 'assigned',
        status: 'Assigned to Delivery Partner',
        message: `Order assigned to ${deliveryPartner.name}`,
        timestamp: deliveryPartner.assigned_at,
        location: 'Delivery Hub'
      });
    }

    // Picked up
    if (order.picked_up_date) {
      updates.push({
        id: 'picked_up',
        status: 'Picked Up',
        message: 'Order has been picked up by delivery partner',
        timestamp: order.picked_up_date,
        location: 'Vendor Location'
      });
    }

    // Out for delivery
    if (order.out_for_delivery_date) {
      updates.push({
        id: 'out_for_delivery',
        status: 'Out for Delivery',
        message: 'Order is on the way to your location',
        timestamp: order.out_for_delivery_date,
        location: 'En Route'
      });
    }

    // Delivered
    if (order.actual_delivery_date) {
      updates.push({
        id: 'delivered',
        status: 'Delivered',
        message: 'Order has been successfully delivered',
        timestamp: order.actual_delivery_date,
        location: 'Customer Location'
      });
    }

    return updates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  static async updateOrderItemStatus(
    orderItemId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    try {
      console.log('Updating order item status:', { orderItemId, status });
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'User not authenticated' };
      }
      
      console.log('User authenticated:', user.email);
      
      // Use upsert approach to avoid CORS issues
      try {
        const { data, error } = await supabase
          .from('order_items')
          .upsert({
            id: orderItemId,
            item_status: status,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (error) {
          console.error('Upsert error:', error);
          
          // Try alternative approach with rpc call if available
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('update_order_item_status', {
              item_id: orderItemId,
              new_status: status
            });

            if (rpcError) throw rpcError;
            
            console.log('Update successful via RPC:', rpcData);
            return { success: true, data: rpcData, message: 'Order item status updated successfully' };
          } catch (rpcErr) {
            console.warn('RPC also failed:', rpcErr);
            throw error; // Throw original upsert error
          }
        }

        console.log('Update successful via upsert:', data);
        return { success: true, data, message: 'Order item status updated successfully' };
      } catch (error: any) {
        // Final fallback: Try to get current item and update with all required fields
        console.warn('Upsert failed, trying full record update:', error);
        
        // First get the current order item
        const { data: currentItem, error: getError } = await supabase
          .from('order_items')
          .select('*')
          .eq('id', orderItemId)
          .single();

        if (getError || !currentItem) {
          console.error('Failed to get current order item:', getError);
          return { success: false, error: 'Order item not found' };
        }

        // Update with all required fields
        const { data: updateData, error: updateError } = await supabase
          .from('order_items')
          .upsert({
            ...currentItem,
            item_status: status,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (updateError) {
          console.error('Final fallback failed:', updateError);
          return { success: false, error: updateError.message || 'Failed to update order item status' };
        }

        console.log('Update successful via full record upsert:', updateData);
        return { success: true, data: updateData, message: 'Order item status updated successfully' };
      }
    } catch (error: any) {
      console.error('OrderAPI.updateOrderItemStatus error:', error);
      return { success: false, error: error.message || 'Failed to update order item status' };
    }
  }
}

// Tryodo Main API
export class TryodoAPI {
  static Brand = BrandAPI;
  static Smartphone = SmartphoneAPI;
  static Vendor = VendorAPI;
  static Category = CategoryAPI;
  static Comparison = ComparisonAPI;
  static Analytics = AnalyticsAPI;
  static Order = OrderAPI;

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.from('brands').select('id').limit(1);
      
      if (error) throw error;

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected'
        },
        message: 'Tryodo API is running smoothly'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'API health check failed'
      };
    }
  }

  /**
   * Get API version and documentation
   */
  static getAPIInfo(): ApiResponse<any> {
    return {
      success: true,
      data: {
        name: 'Tryodo Marketplace API',
        version: '1.0.0',
        description: 'RESTful API for the Tryodo smartphone marketplace',
        endpoints: {
          brands: [
            'GET /api/brands - Get all brands',
            'GET /api/brands/:id - Get brand by ID'
          ],
          smartphones: [
            'GET /api/smartphones - Get smartphones with filters',
            'GET /api/smartphones/:id - Get smartphone details',
            'GET /api/smartphones/search?q=keyword - Search smartphones'
          ],
          vendors: [
            'GET /api/vendors - Get verified vendors',
            'GET /api/vendors/:id - Get vendor details',
            'GET /api/vendors/:id/products - Get vendor products'
          ],
          categories: [
            'GET /api/categories - Get all categories',
            'GET /api/quality-categories - Get quality categories'
          ],
          comparison: [
            'POST /api/compare - Compare smartphones (body: {ids: [id1, id2, ...]})'
          ],
          analytics: [
            'GET /api/analytics/popular - Get popular smartphones',
            'GET /api/analytics/stats - Get market statistics'
          ]
        }
      },
      message: 'Tryodo API information'
    };
  }
}

// ============================================================================
// TRANSACTION AND COMMISSION MANAGEMENT API
// ============================================================================

export class TransactionAPI {
  /**
   * Get all transactions with filtering
   */
  static async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    status?: string;
    vendorId?: string;
    deliveryPartnerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          order:orders(order_number, customer_id),
          order_item:order_items(product_name, vendor_id),
          commission_rule:commission_rules(commission_percentage, category_id),
          commission_override:vendor_commission_overrides(commission_percentage, vendor_id)
        `)
        .order('transaction_date', { ascending: false });

      if (filters) {
        if (filters.startDate) {
          query = query.gte('transaction_date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('transaction_date', filters.endDate);
        }
        if (filters.transactionType) {
          query = query.eq('transaction_type', filters.transactionType);
        }
        if (filters.status) {
          query = query.eq('transaction_status', filters.status);
        }
        if (filters.vendorId) {
          query = query.eq('to_party_id', filters.vendorId).eq('to_party_type', 'vendor');
        }
        if (filters.deliveryPartnerId) {
          query = query.eq('to_party_id', filters.deliveryPartnerId).eq('to_party_type', 'delivery_partner');
        }
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} transactions`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch transactions'
      };
    }
  }

  /**
   * Get daily transaction summary
   */
  static async getDailyTransactionSummary(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('daily_transaction_summary')
        .select('*')
        .order('transaction_day', { ascending: false });

      if (startDate) {
        query = query.gte('transaction_day', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_day', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved daily summary for ${data?.length || 0} days`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch daily transaction summary'
      };
    }
  }

  /**
   * Create manual transaction (for adjustments, refunds, etc.)
   */
  static async createManualTransaction(transactionData: {
    orderId: string;
    orderItemId?: string;
    transactionType: string;
    grossAmount: number;
    commissionAmount?: number;
    netAmount: number;
    fromPartyType?: string;
    fromPartyId?: string;
    toPartyType: string;
    toPartyId: string;
    description: string;
    paymentMethod?: string;
    metadata?: any;
  }): Promise<ApiResponse<any>> {
    try {
      // Generate unique transaction number with microseconds, random component, and party info
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
      const microseconds = now.getTime().toString().slice(-6);
      const randomSuffix = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
      const orderSuffix = transactionData.orderId.slice(0, 8);
      
      const transactionNumber = `TXN-${timestamp}-${microseconds}-${orderSuffix}-${randomSuffix}`;

      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          transaction_number: transactionNumber,
          ...transactionData,
          transaction_status: 'completed',
          processed_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Manual transaction created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create manual transaction'
      };
    }
  }

  /**
   * Process order completion manually (trigger the automated function)
   */
  static async processOrderCompletion(orderId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('process_order_completion', {
        p_order_id: orderId
      });

      if (error) throw error;

      const result = data[0];
      
      return {
        success: result.success,
        data: result,
        message: result.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process order completion'
      };
    }
  }
}

export class CommissionAPI {
  /**
   * Get all commission rules
   */
  static async getCommissionRules(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('commission_rules')
        .select(`
          *,
          category:categories(name, id),
          created_by_profile:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} commission rules`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch commission rules'
      };
    }
  }

  /**
   * Create or update commission rule
   */
  static async upsertCommissionRule(ruleData: {
    id?: string;
    categoryId: string;
    commissionPercentage: number;
    minimumCommission?: number;
    maximumCommission?: number;
    effectiveFrom?: string;
    effectiveUntil?: string;
    notes?: string;
    createdBy: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('commission_rules')
        .upsert([{
          id: ruleData.id,
          category_id: ruleData.categoryId,
          commission_percentage: ruleData.commissionPercentage,
          minimum_commission: ruleData.minimumCommission || 0,
          maximum_commission: ruleData.maximumCommission,
          effective_from: ruleData.effectiveFrom || new Date().toISOString(),
          effective_until: ruleData.effectiveUntil,
          notes: ruleData.notes,
          created_by: ruleData.createdBy
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: ruleData.id ? 'Commission rule updated successfully' : 'Commission rule created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save commission rule'
      };
    }
  }

  /**
   * Get vendor commission overrides
   */
  static async getVendorCommissionOverrides(vendorId?: string): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('vendor_commission_overrides')
        .select(`
          *,
          vendor:vendors(business_name),
          category:categories(name),
          created_by_profile:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} vendor commission overrides`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor commission overrides'
      };
    }
  }

  /**
   * Create vendor-specific commission override
   */
  static async createVendorCommissionOverride(overrideData: {
    vendorId: string;
    categoryId: string;
    commissionPercentage: number;
    minimumCommission?: number;
    maximumCommission?: number;
    effectiveFrom?: string;
    effectiveUntil?: string;
    reason?: string;
    createdBy: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendor_commission_overrides')
        .insert([{
          vendor_id: overrideData.vendorId,
          category_id: overrideData.categoryId,
          commission_percentage: overrideData.commissionPercentage,
          minimum_commission: overrideData.minimumCommission || 0,
          maximum_commission: overrideData.maximumCommission,
          effective_from: overrideData.effectiveFrom || new Date().toISOString(),
          effective_until: overrideData.effectiveUntil,
          reason: overrideData.reason,
          created_by: overrideData.createdBy
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Vendor commission override created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create vendor commission override'
      };
    }
  }

  /**
   * Calculate commission for a given amount
   */
  static async calculateCommission(
    vendorId: string,
    categoryId: string,
    amount: number
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('calculate_commission', {
        p_vendor_id: vendorId,
        p_category_id: categoryId,
        p_amount: amount
      });

      if (error) throw error;

      const result = data[0];

      return {
        success: true,
        data: {
          commissionRate: result.commission_rate,
          commissionAmount: result.commission_amount,
          vendorEarning: result.vendor_earning,
          ruleType: result.rule_type,
          ruleId: result.rule_id
        },
        message: 'Commission calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate commission'
      };
    }
  }

  /**
   * Get commission transactions for reporting
   */
  static async getCommissionTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    vendorId?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('commission_transactions')
        .select(`
          *,
          transaction:transactions(transaction_number, transaction_date),
          vendor:vendors(business_name),
          category:categories(name),
          order:orders(order_number)
        `)
        .order('calculated_at', { ascending: false });

      if (filters) {
        if (filters.startDate) {
          query = query.gte('calculated_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('calculated_at', filters.endDate);
        }
        if (filters.vendorId) {
          query = query.eq('vendor_id', filters.vendorId);
        }
        if (filters.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} commission transactions`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch commission transactions'
      };
    }
  }
}

export class WalletAPI {
  /**
   * Get vendor wallet details
   */
  static async getVendorWallet(vendorId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendor_wallets')
        .select(`
          *,
          vendor:vendors(business_name, contact_phone)
        `)
        .eq('vendor_id', vendorId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('vendor_wallets')
          .insert([{ vendor_id: vendorId }])
          .select(`
            *,
            vendor:vendors(business_name, contact_phone)
          `)
          .single();

        if (createError) throw createError;

        return {
          success: true,
          data: newWallet,
          message: 'Vendor wallet created and retrieved successfully'
        };
      }

      return {
        success: true,
        data,
        message: 'Vendor wallet retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor wallet'
      };
    }
  }

  /**
   * Get delivery partner wallet details
   */
  static async getDeliveryPartnerWallet(deliveryPartnerId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_wallets')
        .select(`
          *,
          delivery_partner:delivery_partners(
            profiles(full_name, phone)
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('delivery_partner_wallets')
          .insert([{ delivery_partner_id: deliveryPartnerId }])
          .select(`
            *,
            delivery_partner:delivery_partners(
              profiles(full_name, phone)
            )
          `)
          .single();

        if (createError) throw createError;

        return {
          success: true,
          data: newWallet,
          message: 'Delivery partner wallet created and retrieved successfully'
        };
      }

      return {
        success: true,
        data,
        message: 'Delivery partner wallet retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch delivery partner wallet'
      };
    }
  }

  /**
   * Get platform wallet details
   */
  static async getPlatformWallet(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('platform_wallet')
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Platform wallet retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch platform wallet'
      };
    }
  }

  /**
   * Get all vendor wallets for admin dashboard
   */
  static async getAllVendorWallets(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('vendor_performance_summary')
        .select('*')
        .order('total_sales', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} vendor wallets`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor wallets'
      };
    }
  }

  /**
   * Get all delivery partner wallets for admin dashboard
   */
  static async getAllDeliveryPartnerWallets(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_earnings_summary')
        .select('*')
        .order('total_earned', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} delivery partner wallets`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch delivery partner wallets'
      };
    }
  }
}

export class PayoutAPI {
  /**
   * Get all payouts with filtering
   */
  static async getPayouts(filters?: {
    recipientType?: 'vendor' | 'delivery_partner';
    recipientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('payouts')
        .select(`
          *,
          processed_by_profile:profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters) {
        if (filters.recipientType) {
          query = query.eq('recipient_type', filters.recipientType);
        }
        if (filters.recipientId) {
          query = query.eq('recipient_id', filters.recipientId);
        }
        if (filters.status) {
          query = query.eq('payout_status', filters.status);
        }
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} payouts`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch payouts'
      };
    }
  }

  /**
   * Create a new payout
   */
  static async createPayout(payoutData: {
    recipientType: 'vendor' | 'delivery_partner';
    recipientId: string;
    payoutAmount: number;
    payoutMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
    periodStart: string;
    periodEnd: string;
    includedTransactions?: string[];
    scheduledDate?: string;
    bankDetails?: any;
    notes?: string;
    processedBy: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Generate unique payout number with microseconds and random component
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
      const microseconds = now.getTime().toString().slice(-6);
      const randomSuffix = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
      const recipientSuffix = payoutData.recipientId.slice(0, 8);
      
      const payoutNumber = `PAY-${timestamp}-${payoutData.recipientType.toUpperCase()}-${recipientSuffix}-${randomSuffix}`;

      const { data, error } = await supabase
        .from('payouts')
        .insert([{
          payout_number: payoutNumber,
          ...payoutData,
          payout_status: 'pending',
          transaction_count: payoutData.includedTransactions?.length || 0
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Payout created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create payout'
      };
    }
  }

  /**
   * Update payout status
   */
  static async updatePayoutStatus(
    payoutId: string,
    status: 'processing' | 'completed' | 'failed' | 'cancelled',
    paymentReference?: string,
    processedBy?: string
  ): Promise<ApiResponse<any>> {
    try {
      const updateData: any = {
        payout_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'processing') {
        updateData.processed_date = new Date().toISOString();
        updateData.processed_by = processedBy;
      } else if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
        updateData.payment_reference = paymentReference;
      }

      const { data, error } = await supabase
        .from('payouts')
        .update(updateData)
        .eq('id', payoutId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Payout ${status} successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update payout status'
      };
    }
  }

  /**
   * Calculate pending payout amount for a recipient
   */
  static async calculatePendingPayout(
    recipientType: 'vendor' | 'delivery_partner',
    recipientId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<ApiResponse<any>> {
    try {
      let walletTable, walletIdField;
      
      if (recipientType === 'vendor') {
        walletTable = 'vendor_wallets';
        walletIdField = 'vendor_id';
      } else {
        walletTable = 'delivery_partner_wallets';
        walletIdField = 'delivery_partner_id';
      }

      const { data, error } = await supabase
        .from(walletTable)
        .select('available_balance, total_earned, total_paid_out')
        .eq(walletIdField, recipientId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          availableBalance: data.available_balance,
          totalEarned: data.total_earned,
          totalPaidOut: data.total_paid_out,
          pendingAmount: data.available_balance
        },
        message: 'Pending payout calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate pending payout'
      };
    }
  }
}

export default TryodoAPI; 
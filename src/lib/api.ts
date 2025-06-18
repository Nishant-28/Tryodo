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
            quality_categories (
              id,
              name,
              description
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
            quality_categories (
              name
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
          quality_categories (
            name,
            description
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
        .from('quality_categories')
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
            quality_categories (
              name
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
   * Get customer orders with detailed tracking information
   */
  static async getCustomerOrders(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
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

      // Enhance orders with delivery tracking information
      const enhancedOrders = await Promise.all(
        (data || []).map(async (order) => {
          // Get delivery partner information if order is assigned
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
              .eq('order_id', order.id)
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
            ...order,
            ...deliveryInfo,
            current_delivery_status: this.getCurrentDeliveryStatus(order, deliveryInfo)
          };
        })
      );

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
      
      // First try using the RPC function to bypass CORS restrictions
      try {
        const { data, error } = await supabase.rpc('update_order_item_status', {
          item_id: orderItemId,
          new_status: status
        });

        if (!error) {
          console.log('Update successful via RPC:', data);
          return { success: true, data, message: 'Order item status updated successfully' };
        } else {
          console.warn('RPC function not available, falling back to direct update:', error);
        }
      } catch (rpcError: any) {
        console.warn('RPC function failed, falling back to direct update:', rpcError);
      }

      // Fallback to direct table update
      const { data, error } = await supabase
        .from('order_items')
        .update({ 
          item_status: status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderItemId)
        .select()
        .single();

      if (error) {
        console.error('Direct update error:', error);
        throw error;
      }

      console.log('Update successful via direct update:', data);
      return { success: true, data, message: 'Order item status updated successfully' };
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

export default TryodoAPI; 
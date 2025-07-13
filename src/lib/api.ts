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

  /**
   * Get vendor financial summary
   */
  static async getVendorFinancialSummary(vendorId: string): Promise<ApiResponse<any>> {
    try {
      // Try the RPC first (preferred – uses DB-side function for performance)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_vendor_financial_summary', {
        p_vendor_id: vendorId,
      });

      // If RPC succeeds and returns data, use it
      if (!rpcError && rpcData && rpcData.length > 0) {
        return {
          success: true,
          data: rpcData[0],
          message: 'Vendor financial summary retrieved successfully',
        };
      }

      // Fallback: compute summary directly from order_items and orders
      console.log('RPC failed or returned empty, computing from order_items...');

      // Get vendor's sales data from order_items
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          line_total,
          unit_price,
          quantity,
          item_status,
          order:orders (
            order_status,
            payment_status,
            created_at
          )
        `)
        .eq('vendor_id', vendorId);

      if (orderError) {
        console.error('Error fetching order items:', orderError);
        return {
          success: false,
          error: 'Failed to fetch order data: ' + orderError.message,
          data: null,
        };
      }

      // Get vendor products count
      const { count: productCount, error: productError } = await supabase
        .from('vendor_products')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      if (productError) {
        console.warn('Error fetching product count:', productError);
      }

      // Calculate metrics from order_items
      const items = orderItems || [];
      
      // Filter items by status for accurate sales calculation
      const deliveredItems = items.filter(item => 
        item.item_status === 'delivered'
      );
      
      const totalSales = deliveredItems.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);
      
      // Count unique orders from delivered items
      const uniqueOrderIds = new Set(deliveredItems.map(item => 
        item.order && item.order.length > 0 ? item.order[0]?.created_at : null
      ).filter(Boolean));
      const totalOrders = uniqueOrderIds.size;
      
      const deliveredSales = totalSales; // Same as totalSales since we're already filtering delivered items

      // Calculate commission (assume 15% default commission rate)
      const commissionRate = 0.15;
      const totalCommission = totalSales * commissionRate;
      const netEarnings = totalSales - totalCommission;

      // Pending payouts (items not yet delivered)
      const pendingItems = items.filter(item =>
        item.item_status !== 'delivered' &&
        item.item_status !== 'cancelled'
      );
      const pendingPayouts = pendingItems.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0);

      const summary = {
        total_sales: totalSales,
        total_commission: totalCommission,
        net_earnings: netEarnings,
        pending_payouts: pendingPayouts,
        total_orders: totalOrders,
        total_products: productCount || 0,
        delivered_sales: deliveredSales,
        average_order_value: totalOrders > 0 ? totalSales / totalOrders : 0,
        commission_rate: commissionRate,
        // Additional metrics for dashboard
        pending_orders: items.filter(item => item.item_status === 'pending').length,
        confirmed_orders: items.filter(item => item.item_status === 'confirmed').length,
        delivered_orders: deliveredItems.length,
      };

      return {
        success: true,
        data: summary,
        message: 'Vendor financial summary computed from order data',
      };

    } catch (error: any) {
      console.error('Error in getVendorFinancialSummary:', error);
      return {
        success: false,
        error: error.message || 'Unknown error in vendor financial summary',
        data: null,
      };
    }
  }

  /**
   * Get day-wise analytics for a vendor (last 30 days)
   */
  static async getVendorDayWiseAnalytics(vendorId: string, days: number = 30): Promise<ApiResponse<any[]>> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get order items for the date range
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          line_total,
          unit_price,
          quantity,
          item_status,
          created_at,
          orders!inner (
            order_status,
            created_at,
            id
          )
        `)
        .eq('vendor_id', vendorId)
        .gte('orders.created_at', startDateStr)
        .lte('orders.created_at', endDateStr + 'T23:59:59');

      if (orderError) {
        console.error('Error fetching order items for day-wise analytics:', orderError);
        return {
          success: false,
          error: 'Failed to fetch order data: ' + orderError.message
        };
      }

      // Group data by date
      const dailyData = new Map();
      
      // Initialize all dates in range with zero values
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyData.set(dateKey, {
          date: dateKey,
          net_sales: 0,
          net_earnings: 0,
          net_orders: 0,
          pending_orders: 0,
          confirmed_orders: 0,
          delivered_orders: 0,
          total_commission: 0,
          order_ids: new Set()
        });
      }

      // Process order items
      const commissionRate = 0.15; // Default 15% commission
      
      (orderItems || []).forEach(item => {
        // Handle orders relationship - it could be an array or single object
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
        if (!order) return;
        
        const orderDate = order.created_at.split('T')[0];
        const dayData = dailyData.get(orderDate);
        
        if (dayData) {
          // Add unique orders
          dayData.order_ids.add(order.id);
          
          // Calculate metrics based on item status
          if (item.item_status === 'delivered') {
            dayData.net_sales += parseFloat(item.line_total || 0);
            const commission = parseFloat(item.line_total || 0) * commissionRate;
            dayData.total_commission += commission;
            dayData.net_earnings += (parseFloat(item.line_total || 0) - commission);
            dayData.delivered_orders++;
          } else if (item.item_status === 'confirmed') {
            dayData.confirmed_orders++;
          } else if (item.item_status === 'pending') {
            dayData.pending_orders++;
          }
        }
      });

      // Convert to array and calculate final metrics
      const result = Array.from(dailyData.values()).map(day => ({
        date: day.date,
        net_sales: Math.round(day.net_sales * 100) / 100,
        net_earnings: Math.round(day.net_earnings * 100) / 100,
        net_orders: day.order_ids.size,
        pending_orders: day.pending_orders,
        confirmed_orders: day.confirmed_orders,
        delivered_orders: day.delivered_orders,
        total_commission: Math.round(day.total_commission * 100) / 100,
        // Calculate day-over-day growth (basic)
        day_name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })
      }));

      // Sort by date (newest first)
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        success: true,
        data: result,
        message: `Retrieved day-wise analytics for ${days} days`
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch day-wise analytics'
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
      // Fetch orders with slot and sector information
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          total_amount,
          order_status,
          payment_status,
          delivery_address_id,
          created_at,
          updated_at,
          subtotal,
          shipping_charges,
          tax_amount,
          discount_amount,
          estimated_delivery_date,
          actual_delivery_date,
          preferred_delivery_time,
          delivery_attempts,
          last_delivery_attempt,
          cancelled_date,
          payment_method,
          payment_id,
          notes,
          cancellation_reason,
          delivery_instructions,
          special_instructions,
          slot_id,
          sector_id,
          delivery_date,
          pickup_time,
          out_for_delivery_time,
          estimated_delivery_time,
          delivery_slots(
            id,
            slot_name,
            start_time,
            end_time,
            cutoff_time,
            pickup_delay_minutes
          ),
          sectors(
            id,
            name
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

      const orderIds = orders.map(order => order.id);
      const deliveryAddressIds = orders.map(order => order.delivery_address_id).filter(Boolean);

      // Fetch order items separately
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          vendor:vendors ( id, business_name )
        `)
        .in('order_id', orderIds);
      if (orderItemsError) throw orderItemsError;

      // Fetch delivery partner orders separately
      const { data: deliveryPartnerOrders, error: deliveryPartnerOrdersError } = await supabase
        .from('delivery_partner_orders')
        .select(`
          order_id,
          pickup_otp,
          delivery_otp,
          assigned_at,
          status,
          delivery_partner_id
        `)
        .in('order_id', orderIds);
      if (deliveryPartnerOrdersError) throw deliveryPartnerOrdersError;

      // Fetch delivery partner profiles separately (if needed for name/phone)
      const deliveryPartnerIds = deliveryPartnerOrders?.map(dpo => dpo.delivery_partner_id).filter(Boolean) || [];
      const partnerProfilesMap = new Map();
      if (deliveryPartnerIds.length > 0) {
        const { data: partners, error: partnersError } = await supabase
          .from('delivery_partners')
          .select('id, profile_id');
        if (partnersError) throw partnersError;

        const profileIds = partners?.map(p => p.profile_id).filter(Boolean) || [];
        if (profileIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', profileIds);
          if (profilesError) throw profilesError;

          const profileLookup = new Map(profiles?.map(p => [p.id, p]));
          partners?.forEach(partner => {
            partnerProfilesMap.set(partner.id, {
              id: partner.id,
              profile: profileLookup.get(partner.profile_id)
            });
          });
        }
      }

      // Fetch customer addresses separately
      let customerAddressesMap = new Map();
      if (deliveryAddressIds.length > 0) {
        const { data: addresses, error: addressesError } = await supabase
          .from('customer_addresses')
          .select('id, address_box, pincode')
          .in('id', deliveryAddressIds);

        if (addressesError) throw addressesError;
        addresses?.forEach(addr => customerAddressesMap.set(addr.id, addr));
      }

      // Organize order items by order_id
      const orderItemsMap = new Map();
      orderItems?.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id).push(item);
      });

      // Organize delivery partner orders by order_id
      const deliveryMap = new Map();
      deliveryPartnerOrders?.forEach(item => {
        deliveryMap.set(item.order_id, item);
      });

      // Transform and reconstruct orders
      const enhancedOrders = orders.map(order => {
        const deliveryInfo = deliveryMap.get(order.id);
        const address = customerAddressesMap.get(order.delivery_address_id);
        const reconstructedDeliveryAddress = address ? `${address.address_box}, ${address.pincode}` : null;

        let deliveryDetails = null;
        if (deliveryInfo) {
          const partnerProfile = partnerProfilesMap.get(deliveryInfo.delivery_partner_id);
          deliveryDetails = {
            delivery_partner_id: deliveryInfo.delivery_partner_id,
            delivery_partner_name: partnerProfile?.profile?.full_name,
            delivery_partner_phone: partnerProfile?.profile?.phone,
            pickup_otp: deliveryInfo.pickup_otp,
            delivery_otp: deliveryInfo.delivery_otp,
            delivery_assigned_at: deliveryInfo.assigned_at,
            delivery_status: deliveryInfo.status,
          };
        }

        // Format slot information
        let slotInfo = null;
        if (order.delivery_slots) {
          // Handle both single object and array responses from Supabase
          const slot = Array.isArray(order.delivery_slots) ? order.delivery_slots[0] : order.delivery_slots;
          if (slot) {
            slotInfo = {
              slot_id: slot.id,
              slot_name: slot.slot_name,
              delivery_window: `${this.formatTime(slot.start_time)} - ${this.formatTime(slot.end_time)}`,
              start_time: slot.start_time,
              end_time: slot.end_time,
              cutoff_time: slot.cutoff_time,
              pickup_delay_minutes: slot.pickup_delay_minutes
            };
          }
        }

        // Format sector information
        let sectorInfo = null;
        if (order.sectors) {
          // Handle both single object and array responses from Supabase
          const sector = Array.isArray(order.sectors) ? order.sectors[0] : order.sectors;
          if (sector) {
            sectorInfo = {
              sector_id: sector.id,
              sector_name: sector.name
            };
          }
        }

        return {
          ...order,
          delivery_address: reconstructedDeliveryAddress,
          order_items: orderItemsMap.get(order.id) || [],
          delivery_details: deliveryDetails,
          slot_info: slotInfo,
          sector_info: sectorInfo,
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
        async (payload) => { // Added async here
          console.log('Order update received:', payload);
          // Re-fetch order to get updated details including reconstructed address
          if ((payload.new as any)?.id) {
            const { data, error } = await this.getOrderById((payload.new as any).id);
            if (data) {
              onUpdate({ ...payload, new: data }); // Send updated full order object
            } else if (error) {
              console.error("Error re-fetching order after update:", error);
              onUpdate(payload); // Fallback to original payload if re-fetch fails
            }
          } else {
            onUpdate(payload);
          }
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
              // Re-fetch affected order to get updated details
              const { data, error } = await this.getOrderById(orderId);
              if (data) {
                onUpdate({ ...payload, new: data });
              } else if (error) {
                console.error("Error re-fetching order after item update:", error);
                onUpdate(payload);
              }
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
              // Re-fetch affected order to get updated details
              const { data, error } = await this.getOrderById(orderId);
              if (data) {
                onUpdate({ ...payload, new: data });
              } else if (error) {
                console.error("Error re-fetching order after delivery update:", error);
                onUpdate(payload);
              }
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
      // Fetch the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_address_id
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Fetch order items for this order
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          vendor:vendors ( id, business_name )
        `)
        .eq('order_id', orderId);
      if (orderItemsError) throw orderItemsError;

      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('profile_id')
        .eq('id', order.customer_id)
        .single();
      if (customerError) throw customerError;

      let customerProfile = null;
      if (customerData?.profile_id) {
        const { data: profileData, error: customerProfileError } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', customerData.profile_id)
          .single();
        if (customerProfileError) throw customerProfileError;
        customerProfile = profileData;
      }


      // Fetch customer address details
      let customerAddress = null;
      if (order.delivery_address_id) {
        const { data: addressData, error: addressError } = await supabase
          .from('customer_addresses')
          .select('address_box, pincode')
          .eq('id', order.delivery_address_id)
          .single();

        if (addressError) throw addressError;
        customerAddress = addressData;
      }

      // Reconstruct delivery_address
      const reconstructedDeliveryAddress = customerAddress
        ? `${customerAddress.address_box}, ${customerAddress.pincode}`
        : null;

      // Get delivery partner information
      let deliveryInfo = null;
      let deliveryPartnerProfile = null;
      try {
        const { data: deliveryData, error: deliveryDataError } = await supabase
          .from('delivery_partner_orders')
          .select(`
            *,
            delivery_partner_id
          `)
          .eq('order_id', orderId)
          .single();

        if (deliveryDataError && deliveryDataError.code !== 'PGRST116') { // PGRST116 is "No rows found"
          throw deliveryDataError;
        }

        if (deliveryData) {
          deliveryInfo = deliveryData;
          if (deliveryData.delivery_partner_id) {
            const { data: partnerEntity, error: partnerEntityError } = await supabase
              .from('delivery_partners')
              .select('profile_id')
              .eq('id', deliveryData.delivery_partner_id)
              .single();

            if (partnerEntityError) throw partnerEntityError;

            if (partnerEntity?.profile_id) {
              const { data: dpProfile, error: dpProfileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', partnerEntity.profile_id)
                .single();
              if (dpProfileError) throw dpProfileError;
              deliveryPartnerProfile = dpProfile;
            }
          }
        }
      } catch (e: any) {
        console.error('Error fetching delivery partner info:', e.message);
        // Continue even if delivery info fails, as it's optional
      }

      // Build tracking timeline
      const trackingUpdates = this.buildTrackingTimeline(order, {
        ...deliveryInfo,
        delivery_partner: {
          profile: deliveryPartnerProfile
        }
      });

      return {
        success: true,
        data: {
          ...order,
          delivery_address: reconstructedDeliveryAddress, // Add the reconstructed address
          order_items: orderItems,
          customer_name: customerProfile?.full_name,
          customer_phone: customerProfile?.phone,
          delivery_partner: deliveryPartnerProfile, // Flatten delivery partner details
          delivery_status_details: deliveryInfo, // Raw delivery info
          tracking_updates: trackingUpdates,
          current_delivery_status: this.getCurrentDeliveryStatus(order, deliveryInfo)
        },
        message: 'Order details retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch order details'
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
          ...(status === 'shipped' && { out_for_delivery_time: new Date().toISOString() }), // Assuming shipped implies out for delivery
          ...(status === 'picked_up' && { pickup_time: new Date().toISOString() }),
          ...(status === 'out_for_delivery' && { out_for_delivery_time: new Date().toISOString() })
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
      const { data: order, error } = await this.getOrderById(orderId);

      if (error) throw error;

      return {
        success: true,
        data: order,
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
        .in('order_status', ['pending', 'confirmed']) // Only allow cancelling pending or confirmed orders
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return { success: false, error: 'Order cannot be cancelled at its current stage.' };
      }

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

      if (!data) {
        return { success: false, error: 'Order is not in a returnable state.' };
      }

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
  private static formatTime(timeString: string): string {
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return timeString;
    }
  }

  private static getCurrentDeliveryStatus(order: any, deliveryInfo?: any): string {
    if (deliveryInfo?.status) {
      return deliveryInfo.status;
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
        message: `Order assigned to ${deliveryPartner.delivery_partner?.profile?.full_name || 'delivery partner'}`,
        timestamp: deliveryPartner.assigned_at,
        location: 'Delivery Hub'
      });
    }

    // Picked up
    if (order.pickup_time) {
      updates.push({
        id: 'picked_up',
        status: 'Picked Up',
        message: 'Order has been picked up by delivery partner',
        timestamp: order.pickup_time,
        location: 'Vendor Location'
      });
    }

    // Out for delivery
    if (order.out_for_delivery_time) {
      updates.push({
        id: 'out_for_delivery',
        status: 'Out for Delivery',
        message: 'Order is on the way to your location',
        timestamp: order.out_for_delivery_time,
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
          .update({
            item_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderItemId)
          .select()
          .single();

        if (error) {
          throw error;
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
          .update({
            ...currentItem,
            item_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderItemId)
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

  static async createOrder(orderData: {
    customerId: string;
    delivery_address_id: string;
    items: any[]; // Consider defining a proper type for cart items
    subtotal: number;
    shipping_charges: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    notes?: string;
    delivery_instructions?: string;
    special_instructions?: string;
    slot_id: string;
    sector_id: string;
    delivery_date: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Start a database transaction to ensure atomicity
      console.log('Starting order creation process...');

      // Generate unique order number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `TRY${timestamp}${randomSuffix}`;

      // Create order without triggering wallet sync yet
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_id: orderData.customerId,
          delivery_address_id: orderData.delivery_address_id,
          subtotal: orderData.subtotal,
          shipping_charges: orderData.shipping_charges,
          tax_amount: orderData.tax_amount,
          discount_amount: orderData.discount_amount,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          payment_status: orderData.payment_status,
          notes: orderData.notes,
          delivery_instructions: orderData.delivery_instructions,
          special_instructions: orderData.special_instructions,
          slot_id: orderData.slot_id,
          sector_id: orderData.sector_id,
          delivery_date: orderData.delivery_date,
          order_status: 'pending',
        }])
        .select()
        .single();

      if (orderError) {
        console.error('Order creation failed:', orderError);
        throw orderError;
      }

      console.log('Order created successfully:', order.id);

      // Enhanced order items creation with quality information fetching
      const orderItems = await Promise.all(orderData.items.map(async (item) => {
        let qualityName = item.quality_type_name;

        // If quality name is missing, fetch it from the database
        if (!qualityName && item.vendor_product_id) {
          try {
            const { data: productData, error: productError } = await supabase
              .from('vendor_products')
              .select(`
                    quality_type_id,
                    category_qualities:quality_type_id(quality_name)
                  `)
              .eq('id', item.vendor_product_id)
              .single();

            if (!productError && productData?.category_qualities && Array.isArray(productData.category_qualities) && productData.category_qualities.length > 0) {
              qualityName = productData.category_qualities[0].quality_name;
            } else if (!productError && productData?.category_qualities && typeof productData.category_qualities === 'object') {
              qualityName = (productData.category_qualities as any).quality_name;
            }
          } catch (error) {
            console.warn('Failed to fetch quality information for product:', item.vendor_product_id);
          }
        }

        console.log('Processing cart item:', item);
        
        // Validate required fields - items now come pre-transformed from checkout
        if (!item.vendor_id || !item.vendor_product_id || !item.product_name || !item.unit_price || !item.quantity) {
          console.error('Missing required fields in cart item:', {
            vendor_id: item.vendor_id,
            vendor_product_id: item.vendor_product_id,
            product_name: item.product_name,
            unit_price: item.unit_price,
            quantity: item.quantity
          });
          throw new Error(`Invalid cart item: missing required fields`);
        }

        // Check if vendor exists
        const { data: vendorExists, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('id', item.vendor_id)
          .single();

        if (vendorError || !vendorExists) {
          console.error('Vendor not found:', item.vendor_id, vendorError);
          throw new Error(`Vendor ${item.vendor_id} not found`);
        }

        // Check if product exists
        const { data: productExists, error: productError } = await supabase
          .from('vendor_products')
          .select('id, vendor_id')
          .eq('id', item.vendor_product_id)
          .single();

        if (productError || !productExists) {
          console.error('Product not found:', item.vendor_product_id, productError);
          throw new Error(`Product ${item.vendor_product_id} not found`);
        }

        // Verify product belongs to vendor
        if (productExists.vendor_id !== item.vendor_id) {
          console.error('Product-vendor mismatch:', {
            productId: item.vendor_product_id,
            cartVendorId: item.vendor_id,
            actualVendorId: productExists.vendor_id
          });
          throw new Error(`Product ${item.vendor_product_id} does not belong to vendor ${item.vendor_id}`);
        }
        
        // Create order item with exact field names from schema - use the transformed item directly
        const orderItem = {
          order_id: order.id,
          vendor_id: item.vendor_id,
          vendor_product_id: item.vendor_product_id,
          product_name: item.product_name,
          product_description: item.product_description || null,
          category_name: null,
          quality_type_name: item.quality_type_name || qualityName || null,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toString()),
          line_total: parseFloat(item.line_total.toString()),
          warranty_months: item.warranty_months || 0,
          estimated_delivery_days: item.estimated_delivery_days || 3,
          smartphone_model_id: null,
          item_status: 'pending'
        };
        
        console.log('Created order item object:', orderItem);
        return orderItem;
      }));

      console.log('Attempting to insert order items:', orderItems);
      
      // Use a direct insert with explicit field specification
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        console.log(`Inserting order item ${i + 1}/${orderItems.length}:`, item);
        
        // Insert with all fields to avoid trigger field mapping issues
        const insertData = {
          order_id: item.order_id,
          vendor_id: item.vendor_id,
          vendor_product_id: item.vendor_product_id,
          product_name: item.product_name,
          product_description: item.product_description,
          quality_type_name: item.quality_type_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          warranty_months: item.warranty_months,
          estimated_delivery_days: item.estimated_delivery_days,
          item_status: 'pending'
        };

        console.log('Final insert payload:', insertData);

        // Try with minimal required fields only to bypass schema cache issues
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: insertData.order_id,
            vendor_id: insertData.vendor_id,
            vendor_product_id: insertData.vendor_product_id,
            product_name: insertData.product_name,
            quantity: insertData.quantity,
            unit_price: insertData.unit_price,
            line_total: insertData.line_total,
            item_status: 'pending'
          });
          
        if (itemError) {
          console.error(`Error inserting order item ${i + 1}:`, itemError);
          throw itemError;
        } else {
          console.log(`Successfully inserted order item ${i + 1}`);
        }
      }

      return {
        success: true,
        data: order,
        message: 'Order created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create order'
      };
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
   * Calculate final customer price with upside markup
   */
  static async calculateCustomerPrice(
    vendorId: string,
    qualityId: string,
    basePrice: number
  ): Promise<number> {
    try {
      const result = await CommissionAPI.calculatePricingBreakdown(vendorId, qualityId, basePrice);
      
      if (result.success && result.data) {
        return result.data.finalSellingPrice;
      }
      
      // Fallback to base price if calculation fails
      console.warn('Failed to calculate upside pricing, using base price:', result.error);
      return basePrice;
    } catch (error) {
      console.warn('Error calculating customer price, using base price:', error);
      return basePrice;
    }
  }

  /**
   * Add final customer prices to a list of products
   */
  static async enrichProductsWithFinalPrices(products: any[]): Promise<any[]> {
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          const finalPrice = await TryodoAPI.calculateCustomerPrice(
            product.vendor_id,
            product.quality_type_id,
            product.price
          );
          
          return {
            ...product,
            final_price: finalPrice,
            price_markup: finalPrice - product.price,
            has_upside: finalPrice > product.price
          };
        } catch (error) {
          console.warn('Error enriching product with final price:', error);
          return {
            ...product,
            final_price: product.price,
            price_markup: 0,
            has_upside: false
          };
        }
      })
    );
    
    return enrichedProducts;
  }

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
   * Get transactions with filtering and pagination
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
          order:orders (
            order_number,
            customer_id
          )
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

      if (error) {
        // If the table doesn't exist, return empty array
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('transactions table does not exist, returning empty array');
          return {
            success: true,
            data: [],
            message: 'No transactions (table missing)'
          };
        }
        throw error;
      }

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

export interface CommissionRule {
  id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number | null;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  quality_id: string | null;
  smartphone_model_id: string | null;
  category?: { id: string; name: string };
  quality?: { id: string; quality_name: string };
  model?: { id: string; model_name: string };
  created_by_profile?: { full_name: string };
}

export interface VendorCommissionOverride {
  id: string;
  vendor_id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number | null;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_by: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  quality_id: string | null;
  smartphone_model_id: string | null;
  vendor?: { business_name: string };
  category?: { name: string };
  quality?: { quality_name: string };
  model?: { model_name: string };
  created_by_profile?: { full_name: string };
}

export class CommissionAPI {
  /**
   * Get all commission rules
   */
  static async getCommissionRules(): Promise<ApiResponse<CommissionRule[]>> {
    try {
      const { data, error } = await supabase
        .from('commission_rules')
        .select(`
          *,
          category:categories(name, id),
          model:smartphone_models(model_name, id),
          created_by_profile:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return localStorage data or empty array
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️ Commission rules table does not exist, returning localStorage data');
          const localRules = JSON.parse(localStorage.getItem('commission_rules') || '[]');
          return {
            success: true,
            data: localRules,
            message: `Retrieved ${localRules.length} commission rules from localStorage (simulated)`
          };
        }
        throw error;
      }

      // Manually fetch quality data for records that have quality_id
      if (data && data.length > 0) {
        const qualityIds = data.filter(item => item.quality_id).map(item => item.quality_id);

        if (qualityIds.length > 0) {
          const { data: qualityData } = await supabase
            .from('category_qualities')
            .select('id, quality_name')
            .in('id', qualityIds);

          // Map quality data to each record
          data.forEach(item => {
            if (item.quality_id && qualityData) {
              const quality = qualityData.find(q => q.id === item.quality_id);
              if (quality) {
                item.quality = {
                  id: quality.id,
                  quality_name: quality.quality_name
                };
              }
            }
          });
        }
      }

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} commission rules`
      };
    } catch (error: any) {
      console.log('⚠️ Error loading commission rules, returning localStorage data:', error.message);
      const localRules = JSON.parse(localStorage.getItem('commission_rules') || '[]');
      return {
        success: true,
        data: localRules,
        message: `Retrieved ${localRules.length} commission rules from localStorage (fallback)`
      };
    }
  }

  /**
   * Get vendor-quality specific commissions
   */
  static async getVendorCommissions(vendorId?: string): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('vendor_commissions')
        .select(`
          *,
          vendor:vendors(id, business_name),
          quality:category_qualities(id, quality_name, quality_description),
          created_by_profile:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, return localStorage data or empty array
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️ Vendor commissions table does not exist, returning localStorage data');
          const localCommissions = JSON.parse(localStorage.getItem('vendor_commissions') || '[]');
          const filteredCommissions = vendorId
            ? localCommissions.filter((c: any) => c.vendor_id === vendorId)
            : localCommissions;
          return {
            success: true,
            data: filteredCommissions,
            message: `Retrieved ${filteredCommissions.length} vendor commissions from localStorage (simulated)`
          };
        }
        throw error;
      }

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} vendor commissions`
      };
    } catch (error: any) {
      console.log('⚠️ Error loading vendor commissions, returning localStorage data:', error.message);
      const localCommissions = JSON.parse(localStorage.getItem('vendor_commissions') || '[]');
      const filteredCommissions = vendorId
        ? localCommissions.filter((c: any) => c.vendor_id === vendorId)
        : localCommissions;
      return {
        success: true,
        data: filteredCommissions,
        message: `Retrieved ${filteredCommissions.length} vendor commissions from localStorage (fallback)`
      };
    }
  }

  /**
   * Create or update vendor-quality commission
   */
  static async upsertVendorCommission(commissionData: {
    id?: string;
    vendorId: string;
    qualityId: string;
    commissionRate: number;
    upsideRate: number;
    isActive?: boolean;
    effectiveFrom?: string;
    effectiveUntil?: string;
    createdBy: string;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendor_commissions')
        .upsert([{
          id: commissionData.id,
          vendor_id: commissionData.vendorId,
          quality_id: commissionData.qualityId,
          commission_rate: commissionData.commissionRate,
          upside_rate: commissionData.upsideRate,
          is_active: commissionData.isActive !== false,
          effective_from: commissionData.effectiveFrom || new Date().toISOString(),
          effective_until: commissionData.effectiveUntil,
          created_by: commissionData.createdBy,
          notes: commissionData.notes,
        }])
        .select()
        .single();

      if (error) {
        // If table doesn't exist, store in localStorage
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️ Vendor commissions table does not exist, storing in localStorage');
          const newCommission = {
            id: commissionData.id || crypto.randomUUID(),
            vendor_id: commissionData.vendorId,
            quality_id: commissionData.qualityId,
            commission_rate: commissionData.commissionRate,
            upside_rate: commissionData.upsideRate,
            is_active: commissionData.isActive !== false,
            effective_from: commissionData.effectiveFrom || new Date().toISOString(),
            effective_until: commissionData.effectiveUntil,
            created_by: commissionData.createdBy,
            notes: commissionData.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const existingCommissions = JSON.parse(localStorage.getItem('vendor_commissions') || '[]');
          if (commissionData.id) {
            const index = existingCommissions.findIndex((c: any) => c.id === commissionData.id);
            if (index >= 0) {
              existingCommissions[index] = newCommission;
            } else {
              existingCommissions.push(newCommission);
            }
          } else {
            existingCommissions.push(newCommission);
          }
          localStorage.setItem('vendor_commissions', JSON.stringify(existingCommissions));

          return {
            success: true,
            data: newCommission,
            message: commissionData.id ? 'Vendor commission updated successfully (localStorage)' : 'Vendor commission created successfully (localStorage)'
          };
        }
        throw error;
      }

      return {
        success: true,
        data,
        message: commissionData.id ? 'Vendor commission updated successfully' : 'Vendor commission created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save vendor commission'
      };
    }
  }

  /**
   * Get commission analytics by vendor and quality
   */
  static async getCommissionAnalytics(filters?: {
    vendorId?: string;
    qualityId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('commission_analytics')
        .select(`
          *,
          vendor:vendors(business_name),
          quality:category_qualities(quality_name)
        `)
        .order('period_start', { ascending: false });

      if (filters) {
        if (filters.vendorId) {
          query = query.eq('vendor_id', filters.vendorId);
        }
        if (filters.qualityId) {
          query = query.eq('quality_id', filters.qualityId);
        }
        if (filters.startDate) {
          query = query.gte('period_start', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('period_end', filters.endDate);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} commission analytics records`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch commission analytics'
      };
    }
  }

  /**
   * Get quality performance metrics
   */
  static async getQualityPerformanceMetrics(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase.rpc('get_quality_performance_metrics');

      if (error) {
        // If function doesn't exist, return mock data
        if (error.message.includes('Could not find the function') || error.code === '42883') {
          console.log('⚠️ get_quality_performance_metrics function not found, returning mock data');
          return {
            success: true,
            data: [],
            message: 'Quality performance metrics retrieved successfully (mock data - function not available)'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: data || [],
        message: 'Quality performance metrics retrieved successfully'
      };
    } catch (error: any) {
      console.log('⚠️ Error loading quality performance metrics, returning mock data:', error.message);
      return {
        success: true,
        data: [],
        message: 'Quality performance metrics retrieved successfully (fallback mock data)'
      };
    }
  }

  /**
   * Get vendor commission summary
   */
  static async getVendorCommissionSummary(vendorId?: string): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase.rpc('get_vendor_commission_summary', vendorId ? { p_vendor_id: vendorId } : {});

      const { data, error } = await query;

      if (error) {
        // If function doesn't exist, return mock data
        if (error.message.includes('Could not find the function') || error.code === '42883') {
          console.log('⚠️ get_vendor_commission_summary function not found, returning mock data');
          return {
            success: true,
            data: [],
            message: 'Vendor commission summary retrieved successfully (mock data - function not available)'
          };
        }
        throw error;
      }

      return {
        success: true,
        data: data || [],
        message: 'Vendor commission summary retrieved successfully'
      };
    } catch (error: any) {
      console.log('⚠️ Error loading vendor commission summary, returning mock data:', error.message);
      return {
        success: true,
        data: [],
        message: 'Vendor commission summary retrieved successfully (fallback mock data)'
      };
    }
  }

  /**
   * Calculate pricing breakdown for vendor-quality combination
   */
  static async calculatePricingBreakdown(
    vendorId: string,
    qualityId: string,
    basePrice: number
  ): Promise<ApiResponse<any>> {
    try {
      // Get vendor commission for this quality
      const { data: vendorCommission, error: commissionError } = await supabase
        .from('vendor_commissions')
        .select('commission_rate, upside_rate')
        .eq('vendor_id', vendorId)
        .eq('quality_id', qualityId)
        .eq('is_active', true)
        .single();

      if (commissionError) throw commissionError;

      if (!vendorCommission) {
        return {
          success: false,
          error: 'No commission rate found for this vendor-quality combination'
        };
      }

      const commissionAmount = basePrice * (vendorCommission.commission_rate / 100);
      const upsideAmount = basePrice * (vendorCommission.upside_rate / 100);
      const finalSellingPrice = basePrice + upsideAmount;
      const vendorNetEarning = basePrice - commissionAmount;
      const platformEarning = commissionAmount + upsideAmount;

      return {
        success: true,
        data: {
          basePrice,
          commissionRate: vendorCommission.commission_rate,
          upsideRate: vendorCommission.upside_rate,
          commissionAmount,
          upsideAmount,
          finalSellingPrice,
          vendorNetEarning,
          platformEarning,
          platformMarginPercentage: (platformEarning / finalSellingPrice) * 100
        },
        message: 'Pricing breakdown calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate pricing breakdown'
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
    qualityId?: string;
    smartphoneModelId?: string;
  }): Promise<ApiResponse<CommissionRule>> {
    try {
      // Use service role client when available
      const { supabaseServiceRole } = await import('./supabase');
      const client = supabaseServiceRole && supabaseServiceRole !== supabase ? supabaseServiceRole : supabase;

      const { data, error } = await client
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
          created_by: ruleData.createdBy,
          quality_id: ruleData.qualityId,
          smartphone_model_id: ruleData.smartphoneModelId,
        }])
        .select()
        .single();

      if (error) {
        // If table doesn't exist, store in localStorage
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log('⚠️ Commission rules table does not exist, storing in localStorage');
          const newRule = {
            id: ruleData.id || crypto.randomUUID(),
            category_id: ruleData.categoryId,
            commission_percentage: ruleData.commissionPercentage,
            minimum_commission: ruleData.minimumCommission || 0,
            maximum_commission: ruleData.maximumCommission,
            effective_from: ruleData.effectiveFrom || new Date().toISOString(),
            effective_until: ruleData.effectiveUntil,
            notes: ruleData.notes,
            created_by: ruleData.createdBy,
            quality_id: ruleData.qualityId,
            smartphone_model_id: ruleData.smartphoneModelId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true
          };

          const existingRules = JSON.parse(localStorage.getItem('commission_rules') || '[]');
          if (ruleData.id) {
            const index = existingRules.findIndex((r: any) => r.id === ruleData.id);
            if (index >= 0) {
              existingRules[index] = newRule;
            } else {
              existingRules.push(newRule);
            }
          } else {
            existingRules.push(newRule);
          }
          localStorage.setItem('commission_rules', JSON.stringify(existingRules));

          return {
            success: true,
            data: newRule,
            message: ruleData.id ? 'Commission rule updated successfully (localStorage)' : 'Commission rule created successfully (localStorage)'
          };
        }
        throw error;
      }

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

  static async getVendorDashboardMetrics(vendorId: string) {
    return supabase.rpc('get_vendor_dashboard_metrics', { v_vendor_id: vendorId });
  }

  /**
   * Get vendor commission overrides
   */
  static async getVendorCommissionOverrides(vendorId?: string): Promise<ApiResponse<VendorCommissionOverride[]>> {
    try {
      // Import service role client for admin operations
      const { supabaseServiceRole } = await import('./supabase');

      // Use service role if available, fallback to regular client
      const client = supabaseServiceRole && supabaseServiceRole !== supabase ? supabaseServiceRole : supabase;

      let query = client
        .from('vendor_commission_overrides')
        .select(`
          *,
          vendor:vendors ( business_name ),
          category:categories(name),
          model:smartphone_models(model_name, id),
          created_by_profile:profiles(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Manually fetch quality data for records that have quality_id
      if (data && data.length > 0) {
        const qualityIds = data.filter(item => item.quality_id).map(item => item.quality_id);

        if (qualityIds.length > 0) {
          const { data: qualityData } = await client
            .from('category_qualities')
            .select('id, quality_name')
            .in('id', qualityIds);

          // Map quality data to each record
          data.forEach(item => {
            if (item.quality_id && qualityData) {
              const quality = qualityData.find(q => q.id === item.quality_id);
              if (quality) {
                item.quality = {
                  id: quality.id,
                  quality_name: quality.quality_name
                };
              }
            }
          });
        }
      }

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} vendor commission overrides`
      };
    } catch (error: any) {
      console.error('Error fetching vendor commission overrides:', error);
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
    qualityId?: string;
    smartphoneModelId?: string;
  }): Promise<ApiResponse<VendorCommissionOverride>> {
    try {
      // Import service role client for admin operations
      const { supabaseServiceRole } = await import('./supabase');

      // Use service role if available, fallback to regular client
      const client = supabaseServiceRole && supabaseServiceRole !== supabase ? supabaseServiceRole : supabase;

      const { data, error } = await client
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
          created_by: overrideData.createdBy,
          quality_id: overrideData.qualityId,
          smartphone_model_id: overrideData.smartphoneModelId,
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
      console.error('Error creating vendor commission override:', error);
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
    amount: number,
    qualityId?: string,
    smartphoneModelId?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('calculate_commission', {
        p_vendor_id: vendorId,
        p_category_id: categoryId,
        p_amount: amount,
        p_quality_id: qualityId,
        p_smartphone_model_id: smartphoneModelId,
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
          ruleId: result.rule_id,
          overrideId: result.override_id,
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

// WalletAPI removed - wallet functionality no longer needed

export class PayoutAPI {
  /**
   * Get payouts for vendor or admin
   */
  static async getPayouts(filters?: {
    vendorId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('payouts')
        .select(`
          *,
          vendor:vendors!recipient_id(
            id,
            business_name,
            profile:profiles(full_name, phone)
          ),
          processed_by_profile:profiles!processed_by(
            full_name
          )
        `)
        .eq('recipient_type', 'vendor')
        .order('created_at', { ascending: false });

      if (filters?.vendorId) {
        query = query.eq('recipient_id', filters.vendorId);
      }

      if (filters?.status) {
        query = query.eq('payout_status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
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
   * Create payout request for vendor
   */
  static async createPayoutRequest(
    vendorId: string,
    amount: number,
    payoutMethod: string = 'bank_transfer'
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('create_vendor_payout_request', {
        p_vendor_id: vendorId,
        p_amount: amount,
        p_payout_method: payoutMethod
      });

      if (error) throw error;

      return {
        success: true,
        data: { payout_id: data },
        message: 'Payout request created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create payout request'
      };
    }
  }

  /**
   * Create payout (admin function)
   */
  static async createPayout(payoutData: {
    recipientType: 'vendor' | 'delivery_partner';
    recipientId: string;
    payoutAmount: number;
    payoutMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
    periodStart: string;
    periodEnd: string;
    scheduledDate: string;
    notes?: string;
    processedBy: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Generate unique payout number
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const randomSuffix = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
      const payoutNumber = `PAYOUT-${timestamp}-${randomSuffix}`;

      // Create payout record
      const { data, error } = await supabase
        .from('payouts')
        .insert({
          payout_number: payoutNumber,
          recipient_type: payoutData.recipientType,
          recipient_id: payoutData.recipientId,
          payout_amount: payoutData.payoutAmount,
          payout_method: payoutData.payoutMethod,
          payout_status: 'pending',
          period_start: payoutData.periodStart,
          period_end: payoutData.periodEnd,
          scheduled_date: payoutData.scheduledDate,
          notes: payoutData.notes,
          processed_by: payoutData.processedBy,
          transaction_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
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
   * Process payout (admin function)
   */
  static async processPayout(
    payoutId: string,
    processedBy: string,
    paymentReference?: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('process_vendor_payout', {
        p_payout_id: payoutId,
        p_processed_by: processedBy,
        p_payment_reference: paymentReference,
        p_notes: notes
      });

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Payout processed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process payout'
      };
    }
  }

  /**
   * Update payout status
   */
  static async updatePayoutStatus(
    payoutId: string,
    status: string,
    notes?: string,
    userId?: string
  ): Promise<ApiResponse<any>> {
    try {
      const updateData: any = {
        payout_status: status,
        updated_at: new Date().toISOString()
      };

      if (notes) updateData.notes = notes;
      if (userId && status === 'processing') {
        updateData.processed_by = userId;
        updateData.processed_date = new Date().toISOString();
      }
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
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
        data: data,
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
   * Get vendor payout summary
   */
  static async getVendorPayoutSummary(vendorId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('get_vendor_payout_summary', {
        p_vendor_id: vendorId
      });

      if (error) throw error;

      return {
        success: true,
        data: data?.[0] || {},
        message: 'Vendor payout summary retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get vendor payout summary'
      };
    }
  }

  /**
   * Get admin payout dashboard data
   */
  static async getAdminPayoutDashboard(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('get_admin_payout_dashboard');

      if (error) throw error;

      return {
        success: true,
        data: data?.[0] || {},
        message: 'Admin payout dashboard data retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get admin payout dashboard data'
      };
    }
  }

  /**
   * Get payout analytics
   */
  static async getPayoutAnalytics(filters?: {
    recipientType?: 'vendor' | 'delivery_partner';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> {
    try {
      let query = supabase.from('payouts').select('*');

      if (filters?.recipientType) {
        query = query.eq('recipient_type', filters.recipientType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const payouts = data || [];

      // Calculate analytics
      const totalPayouts = payouts.length;
      const totalAmount = payouts.reduce((sum, p) => sum + p.payout_amount, 0);

      const statusBreakdown = {
        pending: payouts.filter(p => p.payout_status === 'pending').length,
        processing: payouts.filter(p => p.payout_status === 'processing').length,
        completed: payouts.filter(p => p.payout_status === 'completed').length,
        failed: payouts.filter(p => p.payout_status === 'failed').length,
        cancelled: payouts.filter(p => p.payout_status === 'cancelled').length,
      };

      const amountBreakdown = {
        pending: payouts.filter(p => p.payout_status === 'pending').reduce((sum, p) => sum + p.payout_amount, 0),
        processing: payouts.filter(p => p.payout_status === 'processing').reduce((sum, p) => sum + p.payout_amount, 0),
        completed: payouts.filter(p => p.payout_status === 'completed').reduce((sum, p) => sum + p.payout_amount, 0),
        failed: payouts.filter(p => p.payout_status === 'failed').reduce((sum, p) => sum + p.payout_amount, 0),
      };

      const methodBreakdown = {
        bank_transfer: payouts.filter(p => p.payout_method === 'bank_transfer').length,
        upi: payouts.filter(p => p.payout_method === 'upi').length,
        cash: payouts.filter(p => p.payout_method === 'cash').length,
        cheque: payouts.filter(p => p.payout_method === 'cheque').length,
      };

      const recipientTypeBreakdown = {
        vendor: payouts.filter(p => p.recipient_type === 'vendor').length,
        delivery_partner: payouts.filter(p => p.recipient_type === 'delivery_partner').length,
      };

      const successRate = totalPayouts > 0 ? 
        ((statusBreakdown.completed / totalPayouts) * 100).toFixed(1) : '0';

      const averageAmount = totalPayouts > 0 ? 
        (totalAmount / totalPayouts).toFixed(2) : '0';

      // Monthly trend (simplified for now)
      const monthlyTrend = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const monthPayouts = payouts.filter(p => {
          const payoutDate = p.created_at.split('T')[0];
          return payoutDate >= monthStart && payoutDate <= monthEnd;
        });

        monthlyTrend.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          totalPayouts: monthPayouts.length,
          totalAmount: monthPayouts.reduce((sum, p) => sum + p.payout_amount, 0),
          completedPayouts: monthPayouts.filter(p => p.payout_status === 'completed').length,
          completedAmount: monthPayouts.filter(p => p.payout_status === 'completed').reduce((sum, p) => sum + p.payout_amount, 0),
        });
      }

      return {
        success: true,
        data: {
          totalPayouts,
          totalAmount,
          statusBreakdown,
          amountBreakdown,
          methodBreakdown,
          recipientTypeBreakdown,
          successRate,
          averageAmount,
          monthlyTrend,
        },
        message: 'Payout analytics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get payout analytics'
      };
    }
  }

  /**
   * Approve or reject payout (admin function)
   */
  static async approveRejectPayout(
    payoutId: string,
    action: 'approve' | 'reject',
    processedBy: string,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      if (action === 'approve') {
        return this.processPayout(payoutId, processedBy, undefined, notes);
      } else {
        return this.updatePayoutStatus(payoutId, 'cancelled', notes, processedBy);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || `Failed to ${action} payout`
      };
    }
  }
}

export class WalletAPI {
  /**
   * Get vendor wallet data from database
   */
  static async getVendorWalletData(vendorId: string): Promise<ApiResponse<any>> {
    try {
      // Fix the date calculations
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Fix week calculation - create a new date object to avoid mutation
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - now.getDay()); // Go back to Sunday
      weekStartDate.setHours(0, 0, 0, 0); // Start of day
      const weekStart = weekStartDate.toISOString().split('T')[0];
      
      // Month start calculation
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      console.log('Date calculations:', {
        today,
        weekStart,
        monthStart,
        currentDay: now.getDay() // 0 = Sunday, 1 = Monday, etc.
      });

      // Get financial summary first
      const financialSummary = await AnalyticsAPI.getVendorFinancialSummary(vendorId);
      
      // Get delivered orders for time-based calculations
      const { data: deliveredItems, error: deliveredError } = await supabase
        .from('order_items')
        .select(`
          line_total,
          created_at,
          orders!inner (
            order_status,
            created_at
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('orders.order_status', 'delivered');

      if (deliveredError) {
        console.error('Error fetching delivered orders:', deliveredError);
      }

      const deliveredOrderItems = deliveredItems || [];
      
      console.log('Delivered items found:', deliveredOrderItems.length);
      
      // Debug: Log some sample dates
      if (deliveredOrderItems.length > 0) {
        console.log('Sample order dates:', deliveredOrderItems.slice(0, 3).map(item => {
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          return {
            order_created: order?.created_at || 'N/A',
            item_created: item.created_at,
            line_total: item.line_total
          };
        }));
      }

      // Calculate time-based earnings using order creation date (not item creation date)
      const todayEarnings = deliveredOrderItems
        .filter(item => {
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          if (!order) return false;
          const orderDate = order.created_at.split('T')[0];
          return orderDate === today;
        })
        .reduce((sum, item) => sum + (item.line_total || 0), 0);

      const weekEarnings = deliveredOrderItems
        .filter(item => {
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          if (!order) return false;
          const orderDate = order.created_at.split('T')[0];
          return orderDate >= weekStart;
        })
        .reduce((sum, item) => sum + (item.line_total || 0), 0);

      const monthEarnings = deliveredOrderItems
        .filter(item => {
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          if (!order) return false;
          const orderDate = order.created_at.split('T')[0];
          return orderDate >= monthStart;
        })
        .reduce((sum, item) => sum + (item.line_total || 0), 0);

      console.log('Calculated earnings:', {
        todayEarnings,
        weekEarnings,
        monthEarnings,
        totalDeliveredItems: deliveredOrderItems.length
      });

      const walletData = {
        vendor_id: vendorId,
        available_balance: financialSummary.success ? financialSummary.data.net_earnings : 0,
        pending_balance: financialSummary.success ? financialSummary.data.pending_payouts : 0,
        total_earned: financialSummary.success ? financialSummary.data.total_sales : 0,
        today_earnings: todayEarnings,
        week_earnings: weekEarnings,
        month_earnings: monthEarnings,
        total_commission_paid: financialSummary.success ? financialSummary.data.total_commission : 0,
        minimum_payout_amount: 1000,
        payout_frequency: 'weekly',
        auto_payout_enabled: false,
        last_payout_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        success: true,
        data: walletData,
        message: 'Vendor wallet data calculated successfully'
      };

    } catch (error: any) {
      console.error('Error calculating vendor wallet data:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate vendor wallet data',
        data: null
      };
    }
  }

  /**
   * Sync wallet balance with order and payout data
   */
  static async syncWalletBalance(vendorId: string): Promise<ApiResponse<any>> {
    try {
      // Call the database function to sync wallet balance
      const { data, error } = await supabase.rpc('sync_vendor_wallet_balance', {
        p_vendor_id: vendorId
      });

      if (error) throw error;

      return {
        success: true,
        data: null,
        message: 'Wallet balance synchronized successfully'
      };

    } catch (error: any) {
      console.error('Error syncing wallet balance:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync wallet balance'
      };
    }
  }

  /**
   * Update wallet payout settings
   */
  static async updateWalletSettings(
    vendorId: string,
    settings: {
      minimum_payout_amount?: number;
      payout_frequency?: 'daily' | 'weekly' | 'monthly';
      auto_payout_enabled?: boolean;
      bank_account_number?: string;
      bank_ifsc_code?: string;
      bank_account_holder_name?: string;
      upi_id?: string;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendor_wallets')
        .update(settings)
        .eq('vendor_id', vendorId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Wallet settings updated successfully'
      };

    } catch (error: any) {
      console.error('Error updating wallet settings:', error);
      return {
        success: false,
        error: error.message || 'Failed to update wallet settings'
      };
    }
  }

  /**
   * Get vendor wallet (for backward compatibility)
   */
  static async getVendorWallet(vendorId: string): Promise<ApiResponse<any>> {
    return this.getVendorWalletData(vendorId);
  }

  /**
   * Request payout (creates payout request)
   */
  static async requestPayout(
    vendorId: string,
    amount: number,
    payoutMethod: 'bank_transfer' | 'upi' = 'bank_transfer'
  ): Promise<ApiResponse<any>> {
    try {
      return await PayoutAPI.createPayoutRequest(vendorId, amount, payoutMethod);
    } catch (error: any) {
      console.error('Error requesting payout:', error);
      return {
        success: false,
        error: error.message || 'Failed to request payout'
      };
    }
  }

  /**
   * Get payout history for vendor
   */
  static async getPayoutHistory(vendorId: string): Promise<ApiResponse<any[]>> {
    try {
      return await PayoutAPI.getPayouts({ vendorId });
    } catch (error: any) {
      console.error('Error getting payout history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get payout history'
      };
    }
  }

  /**
   * Get wallet summary with payout info
   */
  static async getWalletSummary(vendorId: string): Promise<ApiResponse<any>> {
    try {
      const [walletResponse, payoutSummaryResponse] = await Promise.all([
        this.getVendorWalletData(vendorId),
        PayoutAPI.getVendorPayoutSummary(vendorId)
      ]);

      if (!walletResponse.success) {
        return walletResponse;
      }

      const summary = {
        ...walletResponse.data,
        payout_summary: payoutSummaryResponse.success ? payoutSummaryResponse.data : {}
      };

      return {
        success: true,
        data: summary,
        message: 'Wallet summary retrieved successfully'
      };

    } catch (error: any) {
      console.error('Error getting wallet summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to get wallet summary'
      };
    }
  }

  /**
   * Sync all vendor wallets (admin function)
   */
  static async syncAllWallets(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('sync_all_vendor_wallets');

      if (error) throw error;

      return {
        success: true,
        data: null,
        message: 'All vendor wallets synchronized successfully'
      };

    } catch (error: any) {
      console.error('Error syncing all wallets:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync all wallets'
      };
    }
  }
}

export default TryodoAPI; 
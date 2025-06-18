import { supabase } from './supabase';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AvailableOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  delivery_address: any;
  total_amount: number;
  item_count: number;
  created_at: string;
  pickup_otp: string;
  delivery_otp: string;
  distance_km?: number;
  estimated_time_mins?: number;
}

export interface MyOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  delivery_address: any;
  total_amount: number;
  item_count: number;
  status: 'accepted' | 'picked_up' | 'delivered';
  accepted_at: string;
  pickup_otp: string;
  delivery_otp: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export interface DeliveryStats {
  delivery_partner_id: string;
  today_deliveries: number;
  total_earnings: number;
  average_rating: number;
  total_deliveries: number;
  active_orders: number;
  created_at: string;
  updated_at: string;
}

export class DeliveryAPI {
  /**
   * Get all available orders for delivery
   */
  static async getAvailableOrders(): Promise<ApiResponse<AvailableOrder[]>> {
    try {
      const { data, error } = await supabase
        .from('delivery_available_orders_view')
        .select('*')
        .eq('status', 'available_for_pickup')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Found ${data?.length || 0} available orders`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch available orders'
      };
    }
  }

  /**
   * Get delivery partner's current orders
   */
  static async getMyOrders(deliveryPartnerId: string): Promise<ApiResponse<MyOrder[]>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_orders_view')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('status', ['accepted', 'picked_up'])
        .order('accepted_at', { ascending: false });

      if (error) throw error;

      return {  
        success: true,
        data: data || [],
        message: `Found ${data?.length || 0} active orders`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch your orders'
      };
    }
  }

  /**
   * Accept a delivery order
   */
  static async acceptOrder(orderId: string, deliveryPartnerId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('accept_delivery_order', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Order accepted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to accept order'
      };
    }
  }

  /**
   * Mark order as picked up with OTP verification
   */
  static async markPickedUp(
    orderId: string, 
    deliveryPartnerId: string, 
    pickupOtp: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('mark_order_picked_up', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId,
        p_pickup_otp: pickupOtp
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Order marked as picked up successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark as picked up'
      };
    }
  }

  /**
   * Mark order as delivered with OTP verification
   */
  static async markDelivered(
    orderId: string, 
    deliveryPartnerId: string, 
    deliveryOtp: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('mark_order_delivered', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId,
        p_delivery_otp: deliveryOtp
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Order delivered successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark as delivered'
      };
    }
  }

  /**
   * Get delivery partner statistics
   */
  static async getDeliveryStats(deliveryPartnerId: string): Promise<ApiResponse<DeliveryStats>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_stats')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no stats exist, create default stats
      if (!data) {
        const defaultStats: Partial<DeliveryStats> = {
          delivery_partner_id: deliveryPartnerId,
          today_deliveries: 0,
          total_earnings: 0,
          average_rating: 0,
          total_deliveries: 0,
          active_orders: 0
        };

        const { data: newStats, error: createError } = await supabase
          .from('delivery_partner_stats')
          .insert(defaultStats)
          .select()
          .single();

        if (createError) throw createError;

        return {
          success: true,
          data: newStats,
          message: 'Stats initialized successfully'
        };
      }

      return {
        success: true,
        data,
        message: 'Stats retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch delivery stats'
      };
    }
  }

  /**
   * Update delivery partner location
   */
  static async updateLocation(
    deliveryPartnerId: string, 
    latitude: number, 
    longitude: number
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('update_delivery_partner_location', {
        p_delivery_partner_id: deliveryPartnerId,
        p_latitude: latitude,
        p_longitude: longitude
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Location updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update location'
      };
    }
  }

  /**
   * Get order details by order ID
   */
  static async getOrderDetails(orderId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_order_details_view')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
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
   * Generate new OTP for pickup/delivery
   */
  static async generateOTP(orderId: string, type: 'pickup' | 'delivery'): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.rpc('generate_delivery_otp', {
        p_order_id: orderId,
        p_otp_type: type
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: `${type} OTP generated successfully`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate OTP'
      };
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(
    orderId: string, 
    otp: string, 
    type: 'pickup' | 'delivery'
  ): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase.rpc('verify_delivery_otp', {
        p_order_id: orderId,
        p_otp: otp,
        p_otp_type: type
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'OTP verified successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Invalid OTP'
      };
    }
  }

  /**
   * Get delivery partner profile
   */
  static async getDeliveryPartnerProfile(deliveryPartnerId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select(`
          *,
          profiles!inner(
            full_name,
            phone,
            email
          )
        `)
        .eq('profile_id', deliveryPartnerId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Profile retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch profile'
      };
    }
  }

  /**
   * Update delivery partner availability status
   */
  static async updateAvailabilityStatus(
    deliveryPartnerId: string, 
    isAvailable: boolean
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', deliveryPartnerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Status updated to ${isAvailable ? 'available' : 'unavailable'}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update availability status'
      };
    }
  }

  /**
   * Get delivery history
   */
  static async getDeliveryHistory(
    deliveryPartnerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<any[]>> {
    try {
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('delivery_history_view')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .order('delivered_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} delivery records`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch delivery history'
      };
    }
  }

  /**
   * Calculate earnings for a specific period
   */
  static async getEarnings(
    deliveryPartnerId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('calculate_delivery_earnings', {
        p_delivery_partner_id: deliveryPartnerId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Earnings calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate earnings'
      };
    }
  }

  /**
   * Assignment management methods
   */
  static Assignment = {
    /**
     * Create delivery assignment from order
     */
    async createAssignmentFromOrder(
      orderItemId: string,
      orderId: string,
      vendorId: string,
      customerPincode: string,
      priority: 'normal' | 'urgent' = 'normal'
    ): Promise<ApiResponse<any>> {
      try {
        // First check if order is already assigned
        const { data: existingAssignment } = await supabase
          .from('delivery_partner_orders')
          .select('id')
          .eq('order_id', orderId)
          .single();

        if (existingAssignment) {
          return {
            success: false,
            error: 'Order already assigned to delivery partner'
          };
        }

        // Generate OTPs for pickup and delivery
        const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Create delivery assignment record with OTPs
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('delivery_partner_orders')
          .insert({
            order_id: orderId,
            delivery_partner_id: null, // Will be filled when a delivery partner accepts
            status: 'accepted',
            pickup_otp: pickupOtp,
            delivery_otp: deliveryOtp,
            accepted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (assignmentError) throw assignmentError;

        // Update order status to ready for pickup
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            order_status: 'ready_for_pickup',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (orderError) throw orderError;

        return {
          success: true,
          data: {
            orderId,
            assignmentId: assignmentData.id,
            pickupOtp,
            deliveryOtp,
            status: 'ready_for_pickup',
            message: 'Order marked as ready for pickup by delivery partners'
          },
          message: 'Delivery assignment created successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to create delivery assignment'
        };
      }
    },

    /**
     * Auto-assign order to best delivery partner
     */
    async autoAssignOrder(
      orderId: string,
      customerLatitude?: number,
      customerLongitude?: number
    ): Promise<ApiResponse<any>> {
      try {
        // This would implement smart assignment logic
        // For now, just mark as available for pickup
        return this.createAssignmentFromOrder('', orderId, '', '', 'normal');
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to auto-assign order'
        };
      }
    }
  };
}

// Export as default and named export for flexibility
export default DeliveryAPI; 
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
  status: 'assigned' | 'accepted' | 'picked_up' | 'delivered';
  accepted_at: string;
  pickup_otp: string;
  delivery_otp: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export interface DeliveryStats {
  delivery_partner_id: string;
  today_deliveries: number;
  week_deliveries: number;
  month_deliveries: number;
  total_deliveries: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  total_earnings: number;
  average_rating: number;
  active_orders: number;
  last_delivery_at: string | null;
  stats_date: string;
  created_at: string;
  updated_at: string;
}

export class DeliveryAPI {
  /**
   * Get all available orders for delivery
   */
  static async getAvailableOrders(): Promise<ApiResponse<AvailableOrder[]>> {
    try {
      // First, get all confirmed orders
      const { data: confirmedOrders, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          created_at,
          delivery_address,
          customers!inner(
            id,
            profiles!inner(
              full_name,
              phone
            )
          ),
          order_items!inner(
            item_status,
            vendors!inner(
              id,
              business_name,
              business_address,
              profiles!inner(
                phone
              )
            )
          )
        `)
        .eq('order_status', 'pending')
        .eq('order_items.item_status', 'confirmed');

      if (orderError) throw orderError;

      // Get all assigned order IDs
      const { data: assignedOrderIds, error: assignedError } = await supabase
        .from('delivery_partner_orders')
        .select('order_id');

      if (assignedError) throw assignedError;

      // Create a set of assigned order IDs for fast lookup
      const assignedIds = new Set(assignedOrderIds?.map(item => item.order_id) || []);

      // Filter out already assigned orders
      const availableOrdersData = (confirmedOrders || []).filter(order => !assignedIds.has(order.id));

      // Transform the data to match the expected format
      const availableOrders: AvailableOrder[] = availableOrdersData.map((order: any) => {
        const customer = order.customers;
        const orderItem = order.order_items[0]; // Get first item for vendor info
        const vendor = orderItem?.vendors;
        
        return {
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customer.id,
          customer_name: customer.profiles.full_name || 'Unknown Customer',
          customer_phone: customer.profiles.phone || '',
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'Unknown Vendor',
          vendor_phone: vendor?.profiles?.phone || '',
          vendor_address: vendor?.business_address || '',
          delivery_address: order.delivery_address,
          total_amount: parseFloat(order.total_amount),
          item_count: order.order_items.length,
          created_at: order.created_at,
          pickup_otp: '0000', // Temporary - will be generated when assigned
          delivery_otp: '0000', // Temporary - will be generated when assigned
        };
      });

      return {
        success: true,
        data: availableOrders,
        message: `Found ${availableOrders.length} available orders`
      };
    } catch (error: any) {
      console.error('Error fetching available orders:', error);
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
      console.log('🚚 DeliveryAPI.getMyOrders called with deliveryPartnerId:', deliveryPartnerId);
      
      // Start with the simplest possible query - just delivery_partner_orders
      const { data: dpoData, error: dpoError } = await supabase
        .from('delivery_partner_orders')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('status', ['accepted', 'picked_up', 'delivered'])
        .order('assigned_at', { ascending: false });

      console.log('🚚 Simple DPO Query result:', { data: dpoData, error: dpoError, dataLength: dpoData?.length });

      if (dpoError) {
        console.error('🚚 DPO Query error:', dpoError);
        throw dpoError;
      }

      if (!dpoData || dpoData.length === 0) {
        console.log('🚚 No delivery partner orders found');
        return {
          success: true,
          data: [],
          message: 'No active orders found'
        };
      }

      // For now, return basic data to test if the core query works
      const myOrders: MyOrder[] = dpoData.map((dpo: any) => {
        console.log('🚚 Processing delivery partner order:', dpo);
        
        return {
          order_id: dpo.order_id,
          order_number: `Order-${dpo.order_id.slice(0, 8)}`,
          customer_name: 'Loading...',
          customer_phone: '',
          vendor_name: 'Loading...',
          vendor_phone: '',
          vendor_address: '',
          delivery_address: {},
          total_amount: 0,
          item_count: 1,
          status: dpo.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered',
          accepted_at: dpo.accepted_at || dpo.assigned_at,
          pickup_otp: dpo.pickup_otp,
          delivery_otp: dpo.delivery_otp,
          picked_up_at: dpo.picked_up_at,
          delivered_at: dpo.delivered_at,
        };
      });

      console.log('🚚 Final myOrders array:', myOrders);

      return {  
        success: true,
        data: myOrders,
        message: `Found ${myOrders.length} active orders`
      };
    } catch (error: any) {
      console.error('🚚 Error fetching my orders:', error);
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
      console.log('🚚 DeliveryAPI.acceptOrder called with:', { orderId, deliveryPartnerId });
      
      // Try the RPC function first
      const { data, error } = await supabase.rpc('accept_delivery_order', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId
      });

      console.log('🚚 RPC accept_delivery_order result:', { data, error });

      if (error) {
        console.warn('🚚 RPC failed, trying direct update:', error);
        
        // Fallback: Direct database update
        const { data: updateData, error: updateError } = await supabase
          .from('delivery_partner_orders')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .eq('delivery_partner_id', deliveryPartnerId)
          .eq('status', 'assigned')
          .select();

        console.log('🚚 Direct update result:', { data: updateData, error: updateError });

        if (updateError) throw updateError;

        if (!updateData || updateData.length === 0) {
          throw new Error('No assigned order found to accept');
        }

        return {
          success: true,
          data: updateData[0],
          message: 'Order accepted successfully'
        };
      }

      return {
        success: true,
        data,
        message: 'Order accepted successfully'
      };
    } catch (error: any) {
      console.error('🚚 Error accepting order:', error);
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

        // Try to find an available delivery partner first
        const { data: availablePartners, error: partnerError } = await supabase
          .from('delivery_partners')
          .select('id, profile_id')
          .eq('is_available', true)
          .eq('is_active', true)
          .limit(1);

        if (partnerError) {
          console.warn('DeliveryAPI: Error finding delivery partners:', partnerError);
        }

        // If we have an available delivery partner, assign directly
        if (availablePartners && availablePartners.length > 0) {
          const deliveryPartner = availablePartners[0];
          
          // Create delivery assignment record with assigned delivery partner
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('delivery_partner_orders')
            .insert({
              order_id: orderId,
              delivery_partner_id: deliveryPartner.id,
              status: 'assigned',
              pickup_otp: pickupOtp,
              delivery_otp: deliveryOtp,
              assigned_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (assignmentError) throw assignmentError;

          // Update order status to assigned
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              order_status: 'assigned_to_delivery',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (orderError) throw orderError;

          return {
            success: true,
            data: {
              orderId,
              assignmentId: assignmentData.id,
              deliveryPartnerId: deliveryPartner.id,
              pickupOtp,
              deliveryOtp,
              status: 'assigned_to_delivery',
              message: 'Order assigned to delivery partner - waiting for acceptance'
            },
            message: 'Delivery assignment created successfully - waiting for delivery partner acceptance'
          };
        } else {
          // No delivery partner available - mark order as ready for pickup without creating assignment
          console.log('DeliveryAPI: No delivery partners available, marking order as ready for pickup');
          
          // Update order status to ready for pickup
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              order_status: 'ready_for_pickup',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (orderError) throw orderError;

          // Store OTPs in order_items table for later use
          const { error: itemError } = await supabase
            .from('order_items')
            .update({
              vendor_notes: JSON.stringify({ 
                pickupOtp, 
                deliveryOtp, 
                readyForPickup: true,
                createdAt: new Date().toISOString()
              }),
              updated_at: new Date().toISOString()
            })
            .eq('id', orderItemId);

          if (itemError) {
            console.warn('DeliveryAPI: Could not store OTPs in order_items:', itemError);
          }

          return {
            success: true,
            data: {
              orderId,
              pickupOtp,
              deliveryOtp,
              status: 'ready_for_pickup',
              message: 'Order marked as ready for pickup. Delivery partners will be notified.',
              pendingAssignment: true
            },
            message: 'Order ready for pickup - delivery partners will be notified'
          };
        }
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
    },

    /**
     * Allow delivery partners to pick up ready orders
     */
    async pickupReadyOrder(
      orderId: string,
      deliveryPartnerId: string
    ): Promise<ApiResponse<any>> {
      try {
        // Check if order is ready for pickup and not already assigned
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, order_status, order_items(id, vendor_notes)')
          .eq('id', orderId)
          .eq('order_status', 'ready_for_pickup')
          .single();

        if (orderError || !order) {
          return {
            success: false,
            error: 'Order not found or not ready for pickup'
          };
        }

        // Check if delivery partner is available
        const { data: partner, error: partnerError } = await supabase
          .from('delivery_partners')
          .select('id')
          .eq('id', deliveryPartnerId)
          .eq('is_available', true)
          .eq('is_active', true)
          .single();

        if (partnerError || !partner) {
          return {
            success: false,
            error: 'Delivery partner not available'
          };
        }

        // Get stored OTPs from order_items
        let pickupOtp = '';
        let deliveryOtp = '';
        
        if (order.order_items && order.order_items.length > 0) {
          try {
            const vendorNotes = order.order_items[0].vendor_notes;
            if (vendorNotes) {
              const notesData = JSON.parse(vendorNotes);
              pickupOtp = notesData.pickupOtp || '';
              deliveryOtp = notesData.deliveryOtp || '';
            }
          } catch (e) {
            console.warn('DeliveryAPI: Could not parse vendor notes for OTPs');
          }
        }

        // Generate new OTPs if not found
        if (!pickupOtp || !deliveryOtp) {
          pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
          deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
        }

        // Create delivery assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('delivery_partner_orders')
          .insert({
            order_id: orderId,
            delivery_partner_id: deliveryPartnerId,
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

        // Update order status
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            order_status: 'assigned_to_delivery',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) throw updateError;

        return {
          success: true,
          data: {
            orderId,
            assignmentId: assignmentData.id,
            deliveryPartnerId,
            pickupOtp,
            deliveryOtp,
            status: 'assigned_to_delivery'
          },
          message: 'Order picked up successfully'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to pickup order'
        };
      }
    }
  };

  /**
   * Manual assignment function - assigns an available order to a delivery partner
   * This is a workaround until the auto-assignment system is implemented
   */
  static async manualAssignOrder(orderId: string, deliveryPartnerId: string): Promise<ApiResponse<any>> {
    try {
      // Use the server-side function to assign the order
      const { data, error } = await supabase.rpc('assign_order_to_delivery_partner', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId
      });

      if (error) throw error;

      // The function returns a JSON object with success/error info
      if (data.success) {
        return {
          success: true,
          data: data,
          message: data.message || 'Order assigned successfully'
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to assign order'
        };
      }
    } catch (error: any) {
      console.error('Error assigning order:', error);
      return {
        success: false,
        error: error.message || 'Failed to assign order'
      };
    }
  }

  /**
   * Auto-assign all available orders to delivery partners
   * This is a temporary solution until the database trigger is implemented
   */
  static async autoAssignAvailableOrders(): Promise<ApiResponse<any>> {
    try {
      // Get all available orders
      console.log('🔍 Getting available orders...');
      const availableOrdersResponse = await this.getAvailableOrders();
      console.log('📦 Available orders response:', availableOrdersResponse);
      
      if (!availableOrdersResponse.success || !availableOrdersResponse.data) {
        return {
          success: false,
          error: `Failed to fetch available orders: ${availableOrdersResponse.error || 'Unknown error'}`
        };
      }

      console.log(`📋 Found ${availableOrdersResponse.data.length} available orders`);

      // Get all delivery partners
      const { data: deliveryPartners, error: dpError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'delivery_partner');

      if (dpError) throw dpError;

      console.log('👥 Delivery partners:', deliveryPartners);

      if (!deliveryPartners || deliveryPartners.length === 0) {
        return {
          success: false,
          error: 'No delivery partners available'
        };
      }

      // If no available orders, return success with 0 assignments
      if (availableOrdersResponse.data.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No available orders to assign - all orders are already assigned'
        };
      }

      // Assign orders to delivery partners (round-robin)
      const assignments = [];
      for (let i = 0; i < availableOrdersResponse.data.length; i++) {
        const order = availableOrdersResponse.data[i];
        const deliveryPartner = deliveryPartners[i % deliveryPartners.length];
        
        console.log(`🎯 Assigning order ${order.order_number} to ${deliveryPartner.full_name}`);
        
        const assignmentResult = await this.manualAssignOrder(order.order_id, deliveryPartner.id);
        if (assignmentResult.success) {
          assignments.push({
            order_id: order.order_id,
            order_number: order.order_number,
            delivery_partner: deliveryPartner.full_name
          });
          console.log(`✅ Successfully assigned order ${order.order_number}`);
        } else {
          console.log(`❌ Failed to assign order ${order.order_number}:`, assignmentResult.error);
        }
      }

      return {
        success: true,
        data: assignments,
        message: `Successfully assigned ${assignments.length} orders`
      };
    } catch (error: any) {
      console.error('Error auto-assigning orders:', error);
      return {
        success: false,
        error: error.message || 'Failed to auto-assign orders'
      };
    }
  }

  /**
   * Get available orders for a specific delivery partner to accept
   */
  static async getAvailableOrdersForDeliveryPartner(deliveryPartnerId: string): Promise<ApiResponse<AvailableOrder[]>> {
    try {
      console.log('🚚 DeliveryAPI.getAvailableOrdersForDeliveryPartner called with deliveryPartnerId:', deliveryPartnerId);
      
      // Step 1: Get basic delivery partner order assignments
      const { data: assignments, error: assignError } = await supabase
        .from('delivery_partner_orders')
        .select('order_id, pickup_otp, delivery_otp, assigned_at, status')
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('status', 'assigned');

      console.log('🚚 Assigned orders result:', { data: assignments, error: assignError });

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        console.log('🚚 No assigned orders found for delivery partner');
        return {
          success: true,
          data: [],
          message: 'No orders assigned to you'
        };
      }

      // Step 2: Get order details for each assignment
      const orderIds = assignments.map(a => a.order_id);
      const { data: orderDetails, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at, delivery_address, customer_id')
        .in('id', orderIds);

      console.log('🚚 Order details result:', { data: orderDetails, error: orderError });

      if (orderError) {
        console.warn('🚚 Could not fetch full order details, using basic data:', orderError);
        
        // Fallback: Create orders with minimal data
        const basicOrders: AvailableOrder[] = assignments.map((assignment: any) => ({
          order_id: assignment.order_id,
          order_number: `ORD-${assignment.order_id.slice(0, 8).toUpperCase()}`,
          customer_id: '',
          customer_name: 'Customer',
          customer_phone: '',
          vendor_id: '',
          vendor_name: 'Vendor',
          vendor_phone: '',
          vendor_address: '',
          delivery_address: {},
          total_amount: 0,
          item_count: 1,
          created_at: assignment.assigned_at,
          pickup_otp: assignment.pickup_otp || '',
          delivery_otp: assignment.delivery_otp || '',
        }));

        return {
          success: true,
          data: basicOrders,
          message: `Found ${basicOrders.length} orders assigned to you (basic info)`
        };
      }

      // Step 3: Try to get customer data (may fail due to RLS)
      const customerIds = orderDetails?.map(o => o.customer_id).filter(Boolean) || [];
      let customerData: any[] = [];
      
      if (customerIds.length > 0) {
        const { data: customerProfiles, error: customerError } = await supabase
          .from('customers')
          .select(`
            id,
            profile_id,
            profiles!inner(
              full_name,
              phone
            )
          `)
          .in('id', customerIds);

        console.log('🚚 Customer data result:', { data: customerProfiles, error: customerError });
        
        if (!customerError && customerProfiles) {
          customerData = customerProfiles;
        } else {
          console.warn('🚚 Could not fetch customer data due to RLS:', customerError);
        }
      }

      // Step 4: Try to get vendor data from order items
      const { data: orderItems, error: itemError } = await supabase
        .from('order_items')
        .select('order_id, vendor_id, product_name, quantity')
        .in('order_id', orderIds)
        .eq('item_status', 'confirmed');

      console.log('🚚 Order item data result:', { data: orderItems, error: itemError });

      // Step 5: Create customer lookup map
      const customerMap: Record<string, any> = {};
      customerData.forEach(customer => {
        customerMap[customer.id] = customer;
      });

      // Step 6: Create order item lookup map
      const orderItemMap: Record<string, any> = {};
      if (orderItems && !itemError) {
        orderItems.forEach(item => {
          if (!orderItemMap[item.order_id]) {
            orderItemMap[item.order_id] = [];
          }
          orderItemMap[item.order_id].push(item);
        });
      }

      // Step 7: Combine all data
      const availableOrders: AvailableOrder[] = assignments.map((assignment: any) => {
        const order = orderDetails?.find(o => o.id === assignment.order_id);
        const customer = customerMap[order?.customer_id] || null;
        const items = orderItemMap[assignment.order_id] || [];
        
        return {
          order_id: assignment.order_id,
          order_number: order?.order_number || `ORD-${assignment.order_id.slice(0, 8).toUpperCase()}`,
          customer_id: order?.customer_id || '',
          customer_name: customer?.profiles?.full_name || 'Customer',
          customer_phone: customer?.profiles?.phone || '',
          vendor_id: items[0]?.vendor_id || '',
          vendor_name: 'Vendor Store',
          vendor_phone: '',
          vendor_address: '',
          delivery_address: order?.delivery_address || {},
          total_amount: parseFloat(order?.total_amount || '0'),
          item_count: items.length || 1,
          created_at: order?.created_at || assignment.assigned_at,
          pickup_otp: assignment.pickup_otp || '',
          delivery_otp: assignment.delivery_otp || '',
        };
      });

      console.log('🚚 Final available orders array:', availableOrders);

      return {
        success: true,
        data: availableOrders,
        message: `Found ${availableOrders.length} orders assigned to you`
      };
    } catch (error: any) {
      console.error('🚚 Error fetching available orders for delivery partner:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch available orders'
      };
    }
  }
}

// Export as default and named export for flexibility
export default DeliveryAPI; 
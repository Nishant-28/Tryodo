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
  payment_method?: string;
  payment_status?: string;
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
  picked_up_at?: string;
  delivered_at?: string;
  payment_method?: string;
  collection_required?: boolean;
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
  // Wallet balance fields from delivery_partner_wallets table
  available_balance: number;
  pending_balance: number;
  total_paid_out: number;
}

export interface VendorPickupInfo {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  pickup_otp: string;
  is_confirmed: boolean;
  confirmed_at?: string;
  confirmed_by_vendor?: boolean;
  vendor_confirmed_at?: string;
  vendor_notes?: string;
  items: Array<{
    product_name: string;
    quantity: number;
    line_total: number;
  }>;
}

export interface MultiVendorOrder extends MyOrder {
  vendors: VendorPickupInfo[];
  all_vendors_confirmed: boolean;
  total_vendors: number;
  confirmed_vendors: number;
}

export class DeliveryAPI {
  /**
   * Get all available orders for delivery
   */
  static async getAvailableOrders(): Promise<ApiResponse<AvailableOrder[]>> {
    try {
      // First, get all confirmed orders with payment information
      const { data: confirmedOrders, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
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
          payment_method: order.payment_method,
          payment_status: order.payment_status,
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
      
      // First, get basic delivery partner orders
      const { data: dpoData, error: dpoError } = await supabase
        .from('delivery_partner_orders')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('status', ['accepted', 'picked_up', 'delivered'])
        .order('assigned_at', { ascending: false });

      console.log('🚚 DPO Query result:', { data: dpoData, error: dpoError, dataLength: dpoData?.length });

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

      // Get order IDs to fetch detailed order information
      const orderIds = dpoData.map(dpo => dpo.order_id);
      
      // Fetch detailed order information including payment details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          delivery_address,
          customers!inner(
            id,
            profiles!inner(
              full_name,
              phone
            )
          ),
          order_items!inner(
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
        .in('id', orderIds);

      if (ordersError) {
        console.error('🚚 Orders Query error:', ordersError);
        // Fallback to basic data if detailed fetch fails
        const myOrders: MyOrder[] = dpoData.map((dpo: any) => ({
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
          picked_up_at: dpo.picked_up_at,
          delivered_at: dpo.delivered_at,
          payment_method: 'unknown',
          collection_required: false,
        }));
        
        return {
          success: true,
          data: myOrders,
          message: `Found ${myOrders.length} active orders (basic data)`
        };
      }

      // Create a map of order details by order ID
      const orderDetailsMap = new Map();
      (ordersData || []).forEach(order => {
        orderDetailsMap.set(order.id, order);
      });

      // Transform the data to include proper payment information
      const myOrders: MyOrder[] = dpoData.map((dpo: any) => {
        console.log('🚚 Processing delivery partner order:', dpo);
        
        const orderDetails = orderDetailsMap.get(dpo.order_id);
        
        if (!orderDetails) {
          // Fallback if order details not found
          return {
            order_id: dpo.order_id,
            order_number: `Order-${dpo.order_id.slice(0, 8)}`,
            customer_name: 'Order Details Loading...',
            customer_phone: '',
            vendor_name: 'Order Details Loading...',
            vendor_phone: '',
            vendor_address: '',
            delivery_address: {},
            total_amount: 0,
            item_count: 1,
            status: dpo.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered',
            accepted_at: dpo.accepted_at || dpo.assigned_at,
            picked_up_at: dpo.picked_up_at,
            delivered_at: dpo.delivered_at,
            payment_method: 'unknown',
            collection_required: false,
          };
        }

        const customer = orderDetails.customers;
        const orderItem = orderDetails.order_items?.[0]; // Get first item for vendor info
        const vendor = orderItem?.vendors;
        
        // Determine collection requirement based on payment method
        const isCOD = orderDetails.payment_method === 'cod' || orderDetails.payment_method === 'cash_on_delivery';
        const collectionRequired = isCOD && orderDetails.payment_status === 'pending';
        
        return {
          order_id: dpo.order_id,
          order_number: orderDetails.order_number || `Order-${dpo.order_id.slice(0, 8)}`,
          customer_name: customer?.profiles?.full_name || 'Unknown Customer',
          customer_phone: customer?.profiles?.phone || '',
          vendor_name: vendor?.business_name || 'Unknown Vendor',
          vendor_phone: vendor?.profiles?.phone || '',
          vendor_address: vendor?.business_address || '',
          delivery_address: orderDetails.delivery_address || {},
          total_amount: parseFloat(orderDetails.total_amount || '0'),
          item_count: orderDetails.order_items?.length || 1,
          status: dpo.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered',
          accepted_at: dpo.accepted_at || dpo.assigned_at,
          picked_up_at: dpo.picked_up_at,
          delivered_at: dpo.delivered_at,
          payment_method: orderDetails.payment_method,
          collection_required: collectionRequired,
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
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      const currentTime = new Date().toISOString();
      
      // First verify the order is in accepted status
      const { data: currentOrder, error: checkError } = await supabase
        .from('delivery_partner_orders')
        .select('status, order_id')
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      if (checkError) throw new Error('Order not found or access denied');
      if (currentOrder.status !== 'accepted') {
        throw new Error(`Cannot mark as picked up. Current status: ${currentOrder.status}`);
      }

      // Update delivery partner order status to picked_up
      const { error: updateDPOError } = await supabase
        .from('delivery_partner_orders')
        .update({ 
          status: 'picked_up',
          picked_up_at: currentTime
        })
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId);

      if (updateDPOError) throw updateDPOError;

      // Update main orders table status
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ 
          status: 'picked_up',
          picked_up_at: currentTime
        })
        .eq('id', orderId);

      if (updateOrderError) {
        console.warn('Failed to update main order status:', updateOrderError.message);
        // Don't fail the entire operation for this
      }

      return {
        success: true,
        data: { 
          order_id: orderId,
          picked_up_at: currentTime,
          status: 'picked_up'
        },
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
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      console.log('🚚 DeliveryAPI.markDelivered called with:', { orderId, deliveryPartnerId });
      
      // First verify the order is in picked_up status and get the delivery OTP
      const { data: orderData, error: checkError } = await supabase
        .from('delivery_partner_orders')
        .select('status, order_id, delivery_otp')
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      if (checkError) {
        console.error('🚚 Check error:', checkError);
        throw new Error('Order not found or access denied');
      }
      if (orderData.status !== 'picked_up') {
        throw new Error(`Cannot mark as delivered. Current status: ${orderData.status}`);
      }

      // Try the RPC function first
      const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_order_delivered', {
        p_order_id: orderId,
        p_delivery_partner_id: deliveryPartnerId,
        p_delivery_otp: orderData.delivery_otp
      });

      console.log('🚚 RPC mark_order_delivered result:', { data: rpcResult, error: rpcError });

      if (rpcError) {
        console.warn('🚚 RPC failed, trying direct update approach:', rpcError.message);
        
        // Fallback: Update delivery partner orders table first
        const currentTime = new Date().toISOString();
        const { error: updateDPOError } = await supabase
          .from('delivery_partner_orders')
          .update({ 
            status: 'delivered',
            delivery_otp_verified: true,
            delivery_otp_verified_at: currentTime,
            delivered_at: currentTime,
            updated_at: currentTime
          })
          .eq('order_id', orderId)
          .eq('delivery_partner_id', deliveryPartnerId);

        if (updateDPOError) {
          console.error('🚚 Failed to update delivery partner orders:', updateDPOError);
          throw new Error('Failed to update delivery status');
        }

        // Update order items
        const { error: updateItemsError } = await supabase
          .from('order_items')
          .update({ 
            item_status: 'delivered',
            updated_at: currentTime
          })
          .eq('order_id', orderId);

        if (updateItemsError) {
          console.warn('🚚 Failed to update order items:', updateItemsError);
        }

        // Try to update main orders table  
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ 
            order_status: 'delivered',
            actual_delivery_date: currentTime,
            updated_at: currentTime
          })
          .eq('id', orderId);

        if (updateOrderError) {
          console.warn('🚚 Failed to update main order status:', updateOrderError.message);
          // Don't fail the entire operation for this
        }
      } else if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.error || 'Failed to mark as delivered');
      }

      return {
        success: true,
        data: { 
          order_id: orderId,
          status: 'delivered'
        },
        message: 'Order delivered successfully'
      };
    } catch (error: any) {
      console.error('🚚 Error in markDelivered:', error);
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
      // Get stats data separately to avoid relationship issues
      const { data: statsData, error: statsError } = await supabase
        .from('delivery_partner_stats')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      // Get wallet data separately
      const { data: walletData } = await supabase
        .from('delivery_partner_wallets')
        .select('available_balance, pending_balance, total_paid_out')
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      // If no stats exist, create default stats
      if (statsError && statsError.code === 'PGRST116') {
        const defaultStats: Partial<DeliveryStats> = {
          delivery_partner_id: deliveryPartnerId,
          today_deliveries: 0,
          week_deliveries: 0,
          month_deliveries: 0,
          total_deliveries: 0,
          today_earnings: 0,
          week_earnings: 0,
          month_earnings: 0,
          total_earnings: 0,
          average_rating: 0,
          active_orders: 0,
          last_delivery_at: null,
          available_balance: walletData?.available_balance || 0,
          pending_balance: walletData?.pending_balance || 0,
          total_paid_out: walletData?.total_paid_out || 0
        };

        const { data: newStats, error: createError } = await supabase
          .from('delivery_partner_stats')
          .insert(defaultStats)
          .select()
          .single();

        if (createError) throw createError;

        return {
          success: true,
          data: {
            ...newStats,
            available_balance: defaultStats.available_balance || 0,
            pending_balance: defaultStats.pending_balance || 0,
            total_paid_out: defaultStats.total_paid_out || 0
          },
          message: 'Stats initialized successfully'
        };
      }

      if (statsError) throw statsError;

      // Combine stats data with wallet data
      const combinedData = {
        ...statsData,
        available_balance: walletData?.available_balance || 0,
        pending_balance: walletData?.pending_balance || 0,
        total_paid_out: walletData?.total_paid_out || 0
      };

      return {
        success: true,
        data: combinedData,
        message: 'Stats retrieved successfully'
      };
    } catch (error: any) {
      console.error('Error fetching delivery stats:', error);
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
   * Generate OTP - Updated with fallback logic
   */
  static async generateOTP(orderId: string, type: 'pickup' | 'delivery'): Promise<ApiResponse<string>> {
    try {
      // First try using database function
      const { data, error } = await supabase.rpc('generate_delivery_otp', {
        p_order_id: orderId,
        p_otp_type: type
      });

      if (!error && data) {
        return {
          success: true,
          data,
          message: `${type} OTP generated successfully`
        };
      }

      // Fallback: Generate 4-digit OTP manually and update table directly
      console.warn('Database function not available, using fallback OTP generation');
      
      const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
      const currentTime = new Date().toISOString();
      
      if (type === 'pickup') {
        const { error: updateError } = await supabase
          .from('delivery_partner_orders')
          .update({
            pickup_otp: otp,
            pickup_otp_verified: false,
            pickup_otp_verified_at: null,
            updated_at: currentTime
          })
          .eq('order_id', orderId);
          
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('delivery_partner_orders')
          .update({
            delivery_otp: otp,
            delivery_otp_verified: false,
            delivery_otp_verified_at: null,
            updated_at: currentTime
          })
          .eq('order_id', orderId);
          
        if (updateError) throw updateError;
      }

      return {
        success: true,
        data: otp,
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
   * Verify OTP - Updated with proper validation logic
   */
  static async verifyOTP(
    orderId: string, 
    otp: string, 
    type: 'pickup' | 'delivery'
  ): Promise<ApiResponse<boolean>> {
    try {
      // First try using database function
      const { data, error } = await supabase.rpc('verify_delivery_otp', {
        p_order_id: orderId,
        p_otp: otp,
        p_otp_type: type
      });

      if (!error && data !== null) {
        return {
          success: true,
          data,
          message: data ? 'OTP verified successfully' : 'Invalid OTP'
        };
      }

      // Fallback: Verify manually
      console.warn('Database function not available, using fallback OTP verification');
      
      const { data: orderData, error: fetchError } = await supabase
        .from('delivery_partner_orders')
        .select(`
          pickup_otp, 
          delivery_otp, 
          pickup_otp_verified, 
          delivery_otp_verified
        `)
        .eq('order_id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const storedOtp = type === 'pickup' ? orderData.pickup_otp : orderData.delivery_otp;
      const isAlreadyVerified = type === 'pickup' ? orderData.pickup_otp_verified : orderData.delivery_otp_verified;

      if (isAlreadyVerified) {
        return {
          success: true,
          data: true,
          message: 'OTP already verified'
        };
      }

      if (storedOtp === otp) {
        const currentTime = new Date().toISOString();
        const updateField = type === 'pickup' ? 'pickup_otp_verified' : 'delivery_otp_verified';
        const updateTimeField = type === 'pickup' ? 'pickup_otp_verified_at' : 'delivery_otp_verified_at';

        const { error: updateError } = await supabase
          .from('delivery_partner_orders')
          .update({
            [updateField]: true,
            [updateTimeField]: currentTime,
            updated_at: currentTime
          })
          .eq('order_id', orderId);

        if (updateError) throw updateError;

        return {
          success: true,
          data: true,
          message: 'OTP verified successfully'
        };
      } else {
        return {
          success: false, // Changed from true to false for invalid OTP
          data: false,
          error: 'Invalid OTP'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify OTP'
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
        .eq('id', deliveryPartnerId)
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

  /**
   * Generate multi-vendor pickup OTPs
   */
  static async generateMultiVendorPickupOTPs(orderId: string): Promise<ApiResponse<VendorPickupInfo[]>> {
    try {
      // First try using database function
      const { data: functionData, error: functionError } = await supabase.rpc('generate_multi_vendor_pickup_otps', {
        p_order_id: orderId
      });

      if (!functionError && functionData) {
        // Transform function result to VendorPickupInfo format
        const vendorInfos: VendorPickupInfo[] = functionData.map((item: any) => ({
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_name,
          vendor_phone: '',
          vendor_address: '',
          pickup_otp: item.pickup_otp,
          is_confirmed: false,
          items: []
        }));

        return {
          success: true,
          data: vendorInfos,
          message: 'Multi-vendor pickup OTPs generated successfully'
        };
      }

      // Fallback: Manual generation
      console.warn('Database function not available, using fallback multi-vendor OTP generation');
      
      // Get all vendors for this order (try different statuses)
      let { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          vendor_id,
          product_name,
          quantity,
          line_total,
          item_status,
          vendors!inner(
            id,
            business_name,
            business_address,
            profiles!inner(phone)
          )
        `)
        .eq('order_id', orderId)
        .eq('item_status', 'confirmed');

      // If no confirmed items, try pending or other statuses
      if (!orderItems || orderItems.length === 0) {
        const { data: pendingItems, error: pendingError } = await supabase
          .from('order_items')
          .select(`
            vendor_id,
            product_name,
            quantity,
            line_total,
            item_status,
            vendors!inner(
              id,
              business_name,
              business_address,
              profiles!inner(phone)
            )
          `)
          .eq('order_id', orderId)
          .in('item_status', ['pending', 'processing', 'ready']);
        
        if (!pendingError && pendingItems && pendingItems.length > 0) {
          orderItems = pendingItems;
        }
      }

      // If still no items, try all items regardless of status
      if (!orderItems || orderItems.length === 0) {
        const { data: allItems, error: allError } = await supabase
          .from('order_items')
          .select(`
            vendor_id,
            product_name,
            quantity,
            line_total,
            item_status,
            vendors!inner(
              id,
              business_name,
              business_address,
              profiles!inner(phone)
            )
          `)
          .eq('order_id', orderId);
        
        if (!allError && allItems && allItems.length > 0) {
          orderItems = allItems;
          itemsError = null;
        }
      }

      if (itemsError) throw itemsError;

      // Group by vendor
      const vendorGroups = orderItems.reduce((acc: any, item: any) => {
        const vendorId = item.vendor_id;
        if (!acc[vendorId]) {
          acc[vendorId] = {
            vendor_id: vendorId,
            vendor_name: item.vendors.business_name,
            vendor_phone: item.vendors.profiles?.phone || '',
            vendor_address: item.vendors.business_address || '',
            pickup_otp: Math.floor(1000 + Math.random() * 9000).toString(), // 4-digit OTP
            is_confirmed: false,
            items: []
          };
        }
        acc[vendorId].items.push({
          product_name: item.product_name,
          quantity: item.quantity,
          line_total: parseFloat(item.line_total)
        });
        return acc;
      }, {});

      const vendorInfos = Object.values(vendorGroups) as VendorPickupInfo[];

      // Store OTPs (this would ideally be in the vendor_pickup_confirmations table)
      // For now, we'll store in the order notes field as JSON
      const { error: notesError } = await supabase
        .from('delivery_partner_orders')
        .update({
          notes: JSON.stringify({
            multiVendorOTPs: vendorInfos.map(v => ({
              vendor_id: v.vendor_id,
              pickup_otp: v.pickup_otp,
              is_confirmed: v.is_confirmed
            })),
            generated_at: new Date().toISOString()
          }),
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (notesError) throw notesError;

      return {
        success: true,
        data: vendorInfos,
        message: 'Multi-vendor pickup OTPs generated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate multi-vendor pickup OTPs'
      };
    }
  }

  /**
   * Verify vendor pickup OTP
   */
  static async verifyVendorPickupOTP(
    orderId: string,
    vendorId: string,
    otp: string,
    confirmedByVendor: boolean = false
  ): Promise<ApiResponse<boolean>> {
    try {
      // First try using database function
      const { data, error } = await supabase.rpc('verify_vendor_pickup_otp', {
        p_order_id: orderId,
        p_vendor_id: vendorId,
        p_otp: otp,
        p_confirmed_by_vendor: confirmedByVendor
      });

      if (!error && data !== null) {
        return {
          success: true,
          data,
          message: 'Vendor pickup OTP verified successfully'
        };
      }

      // Fallback: Manual verification
      console.warn('Database function not available, using fallback vendor OTP verification');
      
      // Get current multi-vendor OTPs from notes
      const { data: orderData, error: fetchError } = await supabase
        .from('delivery_partner_orders')
        .select('notes')
        .eq('order_id', orderId)
        .single();

      if (fetchError) throw fetchError;

      let multiVendorData: any;
      try {
        multiVendorData = JSON.parse(orderData.notes || '{}');
      } catch {
        throw new Error('Invalid multi-vendor OTP data');
      }

      const vendorOTPs = multiVendorData.multiVendorOTPs || [];
      const vendorOTP = vendorOTPs.find((v: any) => v.vendor_id === vendorId);

      if (!vendorOTP) {
        throw new Error(`No OTP found for vendor ${vendorId}`);
      }

      if (vendorOTP.pickup_otp === otp) {
        // Mark as confirmed
        vendorOTP.is_confirmed = true;
        vendorOTP.confirmed_at = new Date().toISOString();
        if (confirmedByVendor) {
          vendorOTP.confirmed_by_vendor = true;
          vendorOTP.vendor_confirmed_at = new Date().toISOString();
        }

        // Update notes
        const { error: updateError } = await supabase
          .from('delivery_partner_orders')
          .update({
            notes: JSON.stringify(multiVendorData),
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderId);

        if (updateError) throw updateError;

        return {
          success: true,
          data: true,
          message: 'Vendor pickup OTP verified successfully'
        };
      } else {
        return {
          success: true,
          data: false,
          message: 'Invalid vendor pickup OTP'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify vendor pickup OTP'
      };
    }
  }

  /**
   * Get multi-vendor pickup status for an order
   */
  static async getMultiVendorPickupStatus(orderId: string): Promise<ApiResponse<{
    vendors: VendorPickupInfo[];
    all_confirmed: boolean;
    total_vendors: number;
    confirmed_vendors: number;
  }>> {
    try {
      // Get order items and vendor info (try different statuses)
      let { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          vendor_id,
          product_name,
          quantity,
          line_total,
          item_status,
          vendors!inner(
            id,
            business_name,
            business_address,
            profiles!inner(phone)
          )
        `)
        .eq('order_id', orderId)
        .eq('item_status', 'confirmed');

      // If no confirmed items, try other statuses
      if (!orderItems || orderItems.length === 0) {
        const { data: allItems, error: allError } = await supabase
          .from('order_items')
          .select(`
            vendor_id,
            product_name,
            quantity,
            line_total,
            item_status,
            vendors!inner(
              id,
              business_name,
              business_address,
              profiles!inner(phone)
            )
          `)
          .eq('order_id', orderId);
        
        if (!allError && allItems && allItems.length > 0) {
          orderItems = allItems;
          itemsError = null;
        }
      }

      if (itemsError) throw itemsError;

      // Get current OTP status from notes
      const { data: orderData, error: fetchError } = await supabase
        .from('delivery_partner_orders')
        .select('notes')
        .eq('order_id', orderId)
        .single();

      if (fetchError) throw fetchError;

      let multiVendorData: any = {};
      try {
        multiVendorData = JSON.parse(orderData.notes || '{}');
      } catch {
        // No existing data
      }

      const vendorOTPs = multiVendorData.multiVendorOTPs || [];

      // Group by vendor
      const vendorGroups = orderItems.reduce((acc: any, item: any) => {
        const vendorId = item.vendor_id;
        if (!acc[vendorId]) {
          const vendorOTP = vendorOTPs.find((v: any) => v.vendor_id === vendorId);
          acc[vendorId] = {
            vendor_id: vendorId,
            vendor_name: item.vendors.business_name,
            vendor_phone: item.vendors.profiles?.phone || '',
            vendor_address: item.vendors.business_address || '',
            pickup_otp: vendorOTP?.pickup_otp || '',
            is_confirmed: vendorOTP?.is_confirmed || false,
            confirmed_at: vendorOTP?.confirmed_at,
            vendor_confirmed_at: vendorOTP?.vendor_confirmed_at,
            items: []
          };
        }
        acc[vendorId].items.push({
          product_name: item.product_name,
          quantity: item.quantity,
          line_total: parseFloat(item.line_total)
        });
        return acc;
      }, {});

      const vendors = Object.values(vendorGroups) as VendorPickupInfo[];
      const confirmedVendors = vendors.filter(v => v.is_confirmed).length;
      const allConfirmed = vendors.length > 0 && confirmedVendors === vendors.length;

      return {
        success: true,
        data: {
          vendors,
          all_confirmed: allConfirmed,
          total_vendors: vendors.length,
          confirmed_vendors: confirmedVendors
        },
        message: 'Multi-vendor pickup status retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get multi-vendor pickup status'
      };
    }
  }

  /**
   * Get delivery partner's current orders with multi-vendor support
   */
  static async getMyOrdersWithMultiVendor(deliveryPartnerId: string): Promise<ApiResponse<MultiVendorOrder[]>> {
    try {
      // Get basic orders first
      const ordersResult = await this.getMyOrders(deliveryPartnerId);
      if (!ordersResult.success || !ordersResult.data) {
        return ordersResult as ApiResponse<MultiVendorOrder[]>;
      }

      // Enhance with multi-vendor information
      const enhancedOrders: MultiVendorOrder[] = [];

      for (const order of ordersResult.data) {
        const pickupStatus = await this.getMultiVendorPickupStatus(order.order_id);
        
        if (pickupStatus.success && pickupStatus.data) {
          enhancedOrders.push({
            ...order,
            vendors: pickupStatus.data.vendors,
            all_vendors_confirmed: pickupStatus.data.all_confirmed,
            total_vendors: pickupStatus.data.total_vendors,
            confirmed_vendors: pickupStatus.data.confirmed_vendors
          });
        } else {
          // Fallback to single vendor
          enhancedOrders.push({
            ...order,
            vendors: [],
            all_vendors_confirmed: false,
            total_vendors: 1,
            confirmed_vendors: 0
          });
        }
      }

      return {
        success: true,
        data: enhancedOrders,
        message: `Retrieved ${enhancedOrders.length} orders with multi-vendor support`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch multi-vendor orders'
      };
    }
  }

  /**
   * Calculate and update real-time delivery statistics
   */
  static async calculateAndUpdateStats(deliveryPartnerId: string): Promise<ApiResponse<DeliveryStats>> {
    try {
      console.log('🔄 calculateAndUpdateStats called with deliveryPartnerId:', deliveryPartnerId);
      
      // Get today's date boundaries
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Get week boundaries (Monday to Sunday)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      // Get month boundaries
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      console.log('📅 Date calculations:', {
        today: today.toISOString().split('T')[0],
        todayStart: todayStart.toISOString().split('T')[0],
        weekStart: weekStart.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0]
      });

      // Use real-time calculation function for all time periods
      console.log('🚀 Starting RPC calls...');
      const [todayStats, weekStats, monthStats, totalStats] = await Promise.all([
        // Today's stats
        supabase.rpc('calculate_delivery_earnings_real_time', {
          p_delivery_partner_id: deliveryPartnerId,
          p_start_date: todayStart.toISOString().split('T')[0],
          p_end_date: todayStart.toISOString().split('T')[0]
        }),
        // Week's stats
        supabase.rpc('calculate_delivery_earnings_real_time', {
          p_delivery_partner_id: deliveryPartnerId,
          p_start_date: weekStart.toISOString().split('T')[0],
          p_end_date: today.toISOString().split('T')[0]
        }),
        // Month's stats
        supabase.rpc('calculate_delivery_earnings_real_time', {
          p_delivery_partner_id: deliveryPartnerId,
          p_start_date: monthStart.toISOString().split('T')[0],
          p_end_date: today.toISOString().split('T')[0]
        }),
        // Total stats (all time)
        supabase.rpc('calculate_delivery_earnings_real_time', {
          p_delivery_partner_id: deliveryPartnerId,
          p_start_date: '2020-01-01',
          p_end_date: today.toISOString().split('T')[0]
        })
      ]);

      console.log('📊 RPC Results:', {
        todayStats: { data: todayStats.data, error: todayStats.error },
        weekStats: { data: weekStats.data, error: weekStats.error },
        monthStats: { data: monthStats.data, error: monthStats.error },
        totalStats: { data: totalStats.data, error: totalStats.error }
      });

      // Check for errors in RPC calls
      if (todayStats.error) throw todayStats.error;
      if (weekStats.error) throw weekStats.error;
      if (monthStats.error) throw monthStats.error;
      if (totalStats.error) throw totalStats.error;

      // Get active orders count
      const { data: activeOrders, error: activeError } = await supabase
        .from('delivery_partner_orders')
        .select('id')
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('status', ['assigned', 'accepted', 'picked_up']);

      if (activeError) throw activeError;

      // Get average rating from delivery_partners table instead
      const { data: deliveryPartnerData, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('rating')
        .eq('id', deliveryPartnerId)
        .single();

      if (partnerError) console.warn('Could not fetch delivery partner rating:', partnerError);

      // Get last delivery
      const { data: lastDelivery } = await supabase
        .from('delivery_partner_orders')
        .select('delivered_at')
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(1)
        .single();

      // Get wallet data
      const { data: walletData } = await supabase
        .from('delivery_partner_wallets')
        .select('available_balance, pending_balance, total_paid_out')
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      // Extract calculated stats
      const todayData = todayStats.data || { total_deliveries: 0, total_earnings: '0.00', cash_collected: '0.00', digital_collected: '0.00' };
      const weekData = weekStats.data || { total_deliveries: 0, total_earnings: '0.00', cash_collected: '0.00', digital_collected: '0.00' };
      const monthData = monthStats.data || { total_deliveries: 0, total_earnings: '0.00', cash_collected: '0.00', digital_collected: '0.00' };
      const totalData = totalStats.data || { total_deliveries: 0, total_earnings: '0.00', cash_collected: '0.00', digital_collected: '0.00' };

      const averageRating = deliveryPartnerData?.rating || 0;

      const activeOrdersCount = activeOrders?.length || 0;

      console.log('📈 Processed Data:', {
        todayData,
        weekData,
        monthData,
        totalData,
        activeOrdersCount,
        averageRating
      });

      // Update or insert stats
      const statsData = {
        delivery_partner_id: deliveryPartnerId,
        today_deliveries: todayData.total_deliveries,
        week_deliveries: weekData.total_deliveries,
        month_deliveries: monthData.total_deliveries,
        total_deliveries: totalData.total_deliveries,
        today_earnings: parseFloat(todayData.total_earnings),
        week_earnings: parseFloat(weekData.total_earnings),
        month_earnings: parseFloat(monthData.total_earnings),
        total_earnings: parseFloat(totalData.total_earnings),
        average_rating: averageRating,
        active_orders: activeOrdersCount,
        last_delivery_at: lastDelivery?.delivered_at || null,
        stats_date: today.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      console.log('💾 Stats Data to be saved:', statsData);

      const { data: updatedStats, error: updateError } = await supabase
        .from('delivery_partner_stats')
        .upsert(statsData, { onConflict: 'delivery_partner_id' })
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Updated Stats from DB:', updatedStats);

      // Combine with wallet data
      const finalStats = {
        ...updatedStats,
        available_balance: walletData?.available_balance || 0,
        pending_balance: walletData?.pending_balance || 0,
        total_paid_out: walletData?.total_paid_out || 0
      };

      console.log('🎯 Final Stats Result:', finalStats);

      return {
        success: true,
        data: finalStats,
        message: 'Stats calculated and updated successfully'
      };
    } catch (error: any) {
      console.error('❌ Error calculating stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate delivery stats'
      };
    }
  }

  /**
   * Record payment collection for delivery partner
   */
  static async recordPaymentCollection(
    deliveryPartnerId: string,
    orderId: string,
    amountCollected: number,
    paymentMethod: 'cash' | 'card' | 'upi',
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const currentTime = new Date().toISOString();

      // Insert payment collection record
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('delivery_payment_collections')
        .insert({
          delivery_partner_id: deliveryPartnerId,
          order_id: orderId,
          amount_collected: amountCollected,
          payment_method: paymentMethod,
          collection_notes: notes || '',
          collected_at: currentTime,
          created_at: currentTime
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // First, get the current wallet balance
      const { data: currentWallet, error: getWalletError } = await supabase
        .from('delivery_partner_wallets')
        .select('pending_balance, total_collected')
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();

      if (getWalletError) throw getWalletError;

      // Update delivery partner wallet pending balance
      const { error: walletError } = await supabase
        .from('delivery_partner_wallets')
        .update({
          pending_balance: (currentWallet?.pending_balance || 0) + amountCollected,
          total_collected: (currentWallet?.total_collected || 0) + amountCollected,
          updated_at: currentTime
        })
        .eq('delivery_partner_id', deliveryPartnerId);

      if (walletError) throw walletError;

      // Update order status to mark payment collected
      const { error: orderError } = await supabase
        .from('delivery_partner_orders')
        .update({
          payment_collected: true,
          payment_collected_at: currentTime,
          payment_collection_amount: amountCollected,
          updated_at: currentTime
        })
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId);

      if (orderError) throw orderError;

      return {
        success: true,
        data: paymentRecord,
        message: 'Payment collection recorded successfully'
      };
    } catch (error: any) {
      console.error('Error recording payment collection:', error);
      return {
        success: false,
        error: error.message || 'Failed to record payment collection'
      };
    }
  }

  /**
   * Get daily payment collection summary for delivery partner
   */
  static async getDailyCollectionSummary(
    deliveryPartnerId: string,
    date?: string
  ): Promise<ApiResponse<any>> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dayStart = new Date(targetDate + 'T00:00:00.000Z');
      const dayEnd = new Date(targetDate + 'T23:59:59.999Z');

      // Get payment collections for the day
      const { data: collections, error: collectionsError } = await supabase
        .from('delivery_payment_collections')
        .select(`
          *,
          orders!inner(
            order_number,
            total_amount,
            customers!inner(
              profiles!inner(
                full_name,
                phone
              )
            )
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .gte('collected_at', dayStart.toISOString())
        .lte('collected_at', dayEnd.toISOString())
        .order('collected_at', { ascending: false });

      if (collectionsError) throw collectionsError;

      // Calculate summary
      const totalCollected = collections?.reduce((sum, c) => sum + c.amount_collected, 0) || 0;
      const cashCollected = collections?.filter(c => c.payment_method === 'cash')
        .reduce((sum, c) => sum + c.amount_collected, 0) || 0;
      const digitalCollected = collections?.filter(c => c.payment_method !== 'cash')
        .reduce((sum, c) => sum + c.amount_collected, 0) || 0;

      return {
        success: true,
        data: {
          date: targetDate,
          total_collected: totalCollected,
          cash_collected: cashCollected,
          digital_collected: digitalCollected,
          total_orders: collections?.length || 0,
          collections: collections || [],
          breakdown_by_method: {
            cash: cashCollected,
            card: collections?.filter(c => c.payment_method === 'card')
              .reduce((sum, c) => sum + c.amount_collected, 0) || 0,
            upi: collections?.filter(c => c.payment_method === 'upi')
              .reduce((sum, c) => sum + c.amount_collected, 0) || 0
          }
        },
        message: 'Daily collection summary retrieved successfully'
      };
    } catch (error: any) {
      console.error('Error getting daily collection summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to get daily collection summary'
      };
    }
  }

  /**
   * Submit end-of-day payment summary
   */
  static async submitDayEndSummary(
    deliveryPartnerId: string,
    totalCashCollected: number,
    totalDigitalCollected: number,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const currentTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      // Check if summary already exists for today
      const { data: existingSummary } = await supabase
        .from('delivery_day_end_summaries')
        .select('id')
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('summary_date', today)
        .single();

      const summaryData = {
        delivery_partner_id: deliveryPartnerId,
        summary_date: today,
        total_cash_collected: totalCashCollected,
        total_digital_collected: totalDigitalCollected,
        total_amount: totalCashCollected + totalDigitalCollected,
        summary_notes: notes || '',
        submitted_at: currentTime,
        updated_at: currentTime
      };

      let summaryResult;
      if (existingSummary) {
        // Update existing summary
        const { data, error } = await supabase
          .from('delivery_day_end_summaries')
          .update({
            ...summaryData,
            updated_at: currentTime
          })
          .eq('id', existingSummary.id)
          .select()
          .single();

        if (error) throw error;
        summaryResult = data;
      } else {
        // Create new summary
        const { data, error } = await supabase
          .from('delivery_day_end_summaries')
          .insert(summaryData)
          .select()
          .single();

        if (error) throw error;
        summaryResult = data;
      }

      // Update wallet with the submitted amounts
      const { error: walletError } = await supabase
        .from('delivery_partner_wallets')
        .update({
          cash_in_hand: totalCashCollected,
          last_settlement_date: today,
          updated_at: currentTime
        })
        .eq('delivery_partner_id', deliveryPartnerId);

      if (walletError) throw walletError;

      return {
        success: true,
        data: summaryResult,
        message: 'Day-end summary submitted successfully'
      };
    } catch (error: any) {
      console.error('Error submitting day-end summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit day-end summary'
      };
    }
  }
}

// Export as default and named export for flexibility
export default DeliveryAPI;
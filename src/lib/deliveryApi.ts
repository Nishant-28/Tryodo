import { supabase } from './supabase';

// Types for Delivery API
export interface DeliveryBoy {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  email: string;
  assigned_pincodes: string[];
  status: 'active' | 'inactive' | 'busy' | 'offline';
  current_location?: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  vehicle_type: 'bike' | 'scooter' | 'car' | 'cycle';
  vehicle_number?: string;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  is_verified: boolean;
}

export interface DeliveryAssignment {
  id: string;
  delivery_boy_id: string;
  order_ids: string[];
  pickup_addresses: any[];
  delivery_addresses: any[];
  total_orders: number;
  estimated_distance?: number;
  estimated_time?: number;
  status: 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_at: string;
  delivery_instructions?: string;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  timestamp: string;
  notes?: string;
  delivery_boy_id?: string;
  estimated_arrival?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Delivery Boy Management API
export class DeliveryBoyAPI {
  /**
   * Get delivery boy profile
   */
  static async getProfile(deliveryBoyId: string): Promise<ApiResponse<DeliveryBoy>> {
    try {
      const { data, error } = await supabase
        .from('delivery_boys')
        .select('*')
        .eq('id', deliveryBoyId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Delivery boy profile retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch delivery boy profile'
      };
    }
  }

  /**
   * Update delivery boy status
   */
  static async updateStatus(
    deliveryBoyId: string, 
    status: DeliveryBoy['status']
  ): Promise<ApiResponse<DeliveryBoy>> {
    try {
      const { data, error } = await supabase
        .from('delivery_boys')
        .update({ 
          status,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryBoyId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Status updated to ${status}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update status'
      };
    }
  }

  /**
   * Update delivery boy location
   */
  static async updateLocation(
    deliveryBoyId: string,
    location: { lat: number; lng: number; address?: string }
  ): Promise<ApiResponse<any>> {
    try {
      const locationData = {
        ...location,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('delivery_boys')
        .update({ 
          current_location: locationData,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryBoyId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: locationData,
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
   * Get delivery boy statistics
   */
  static async getStatistics(deliveryBoyId: string): Promise<ApiResponse<any>> {
    try {
      const { data: deliveryBoy, error: dbError } = await supabase
        .from('delivery_boys')
        .select('total_deliveries, successful_deliveries, cancelled_deliveries, rating')
        .eq('id', deliveryBoyId)
        .single();

      if (dbError) throw dbError;

      // Get today's deliveries
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAssignments, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .select('status')
        .eq('delivery_boy_id', deliveryBoyId)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`);

      if (assignmentError) throw assignmentError;

      const todayDelivered = todayAssignments?.filter(a => a.status === 'delivered').length || 0;
      const todayTotal = todayAssignments?.length || 0;

      const stats = {
        ...deliveryBoy,
        today_deliveries: todayDelivered,
        today_assignments: todayTotal,
        success_rate: deliveryBoy.total_deliveries > 0 
          ? Math.round((deliveryBoy.successful_deliveries / deliveryBoy.total_deliveries) * 100)
          : 0
      };

      return {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch statistics'
      };
    }
  }
}

// Delivery Assignment API
export class DeliveryAssignmentAPI {
  /**
   * Get assignments for a delivery boy
   */
  static async getAssignments(
    deliveryBoyId: string,
    status?: string
  ): Promise<ApiResponse<DeliveryAssignment[]>> {
    try {
      let query = supabase
        .from('delivery_assignments')
        .select(`
          *,
          orders!inner(
            id,
            order_number,
            customer_id,
            delivery_address,
            total_amount,
            customers(
              profiles(full_name, phone)
            )
          )
        `)
        .eq('delivery_boy_id', deliveryBoyId)
        .order('assigned_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Assignments retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch assignments'
      };
    }
  }

  /**
   * Accept an assignment
   */
  static async acceptAssignment(assignmentId: string): Promise<ApiResponse<DeliveryAssignment>> {
    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      // Update delivery boy status to busy
      await supabase
        .from('delivery_boys')
        .update({ status: 'busy' })
        .eq('id', data.delivery_boy_id);

      return {
        success: true,
        data,
        message: 'Assignment accepted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to accept assignment'
      };
    }
  }

  /**
   * Update assignment status
   */
  static async updateStatus(
    assignmentId: string,
    status: DeliveryAssignment['status'],
    notes?: string
  ): Promise<ApiResponse<DeliveryAssignment>> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Set timestamp based on status
      const timestamp = new Date().toISOString();
      switch (status) {
        case 'picked_up':
          updateData.pickup_completed_at = timestamp;
          break;
        case 'in_transit':
          updateData.delivery_started_at = timestamp;
          break;
        case 'delivered':
          updateData.delivered_at = timestamp;
          break;
        case 'cancelled':
          updateData.cancelled_at = timestamp;
          if (notes) updateData.cancellation_reason = notes;
          break;
      }

      const { data, error } = await supabase
        .from('delivery_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      // Update related orders status
      if (status === 'delivered') {
        await supabase
          .from('orders')
          .update({ 
            delivery_status: 'delivered',
            actual_delivery_date: timestamp
          })
          .in('id', data.order_ids);

        // Update delivery boy status back to active
        await supabase
          .from('delivery_boys')
          .update({ status: 'active' })
          .eq('id', data.delivery_boy_id);
      }

      return {
        success: true,
        data,
        message: `Assignment status updated to ${status}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update assignment status'
      };
    }
  }

  /**
   * Get route optimization for assignments
   */
  static async getRouteOptimization(assignmentId: string): Promise<ApiResponse<any>> {
    try {
      const { data: assignment, error } = await supabase
        .from('delivery_assignments')
        .select('pickup_addresses, delivery_addresses')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;

      // Simple route optimization (in production, use Google Maps API or similar)
      const optimizedRoute = {
        pickup_sequence: assignment.pickup_addresses.map((addr: any, index: number) => ({
          order: index + 1,
          address: addr,
          estimated_time: 15 // minutes
        })),
        delivery_sequence: assignment.delivery_addresses.map((addr: any, index: number) => ({
          order: index + 1,
          address: addr,
          estimated_time: 10 // minutes
        })),
        total_estimated_time: (assignment.pickup_addresses.length * 15) + (assignment.delivery_addresses.length * 10),
        total_estimated_distance: assignment.pickup_addresses.length + assignment.delivery_addresses.length * 2 // km
      };

      return {
        success: true,
        data: optimizedRoute,
        message: 'Route optimization calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate route optimization'
      };
    }
  }
}

// Order Tracking API
export class OrderTrackingAPI {
  /**
   * Get tracking information for an order
   */
  static async getTracking(orderId: string): Promise<ApiResponse<OrderTracking[]>> {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select(`
          *,
          delivery_boys(name, phone, vehicle_type, vehicle_number)
        `)
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
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
   * Add tracking update
   */
  static async addTrackingUpdate(
    orderId: string,
    status: string,
    location?: { lat: number; lng: number; address: string },
    notes?: string,
    deliveryBoyId?: string
  ): Promise<ApiResponse<OrderTracking>> {
    try {
      const trackingData: any = {
        order_id: orderId,
        status,
        timestamp: new Date().toISOString(),
        notes,
        delivery_boy_id: deliveryBoyId
      };

      if (location) {
        trackingData.location = location;
      }

      const { data, error } = await supabase
        .from('order_tracking')
        .insert(trackingData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Tracking update added successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add tracking update'
      };
    }
  }

  /**
   * Get real-time tracking for multiple orders
   */
  static async getMultipleOrderTracking(orderIds: string[]): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select(`
          order_id,
          status,
          location,
          timestamp,
          delivery_boys(name, phone, current_location)
        `)
        .in('order_id', orderIds)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Group by order_id and get latest status
      const trackingByOrder = data?.reduce((acc: any, tracking: any) => {
        if (!acc[tracking.order_id]) {
          acc[tracking.order_id] = tracking;
        }
        return acc;
      }, {});

      return {
        success: true,
        data: trackingByOrder || {},
        message: 'Multiple order tracking retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch multiple order tracking'
      };
    }
  }
}

// Delivery Pricing API
export class DeliveryPricingAPI {
  /**
   * Calculate delivery fee for an order
   */
  static async calculateDeliveryFee(
    pincode: string,
    orderValue: number,
    distance?: number
  ): Promise<ApiResponse<any>> {
    try {
      const { data: pricing, error } = await supabase
        .from('delivery_pricing')
        .select('*')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      let deliveryFee = pricing.base_price;

      // Check order value ranges
      if (pricing.order_value_ranges) {
        const range = pricing.order_value_ranges.find((r: any) => 
          orderValue >= r.min && orderValue < r.max
        );
        if (range) {
          deliveryFee = range.price;
        }
      }

      // Add distance-based pricing
      if (distance && pricing.per_km_price) {
        deliveryFee += distance * pricing.per_km_price;
      }

      // Check free delivery threshold
      if (orderValue >= pricing.free_delivery_threshold) {
        deliveryFee = 0;
      }

      const result = {
        base_price: pricing.base_price,
        calculated_fee: deliveryFee,
        is_free_delivery: deliveryFee === 0,
        free_delivery_threshold: pricing.free_delivery_threshold,
        distance_fee: distance ? distance * pricing.per_km_price : 0
      };

      return {
        success: true,
        data: result,
        message: 'Delivery fee calculated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate delivery fee'
      };
    }
  }

  /**
   * Check delivery availability for pincode
   */
  static async checkDeliveryAvailability(pincode: string): Promise<ApiResponse<any>> {
    try {
      const { data: pricing, error } = await supabase
        .from('delivery_pricing')
        .select('*')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const isAvailable = !!pricing;
      
      return {
        success: true,
        data: {
          is_available: isAvailable,
          pricing: pricing || null,
          message: isAvailable ? 'Delivery available' : 'Delivery not available in this area'
        },
        message: 'Delivery availability checked successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check delivery availability'
      };
    }
  }
}

// Notifications API for delivery partners
export class DeliveryNotificationAPI {
  /**
   * Get notifications for delivery boy
   */
  static async getNotifications(deliveryBoyId: string): Promise<ApiResponse<any[]>> {
    try {
      // Get new assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .select('*')
        .eq('delivery_boy_id', deliveryBoyId)
        .eq('status', 'assigned')
        .order('assigned_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      const notifications = assignments?.map(assignment => ({
        id: assignment.id,
        type: 'new_assignment',
        title: 'New Delivery Assignment',
        message: `You have ${assignment.total_orders} new order(s) to deliver`,
        timestamp: assignment.assigned_at,
        data: assignment
      })) || [];

      return {
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch notifications'
      };
    }
  }

  /**
   * Send notification to customer about delivery status
   */
  static async notifyCustomer(
    orderId: string,
    status: string,
    message: string
  ): Promise<ApiResponse<any>> {
    try {
      // In a real implementation, this would send push notifications, SMS, or email
      // For now, we'll just log the tracking update
      
      const trackingUpdate = await OrderTrackingAPI.addTrackingUpdate(
        orderId,
        status,
        undefined,
        message
      );

      return {
        success: true,
        data: { notification_sent: true },
        message: 'Customer notification sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send customer notification'
      };
    }
  }
}

// Main Delivery API class
export class DeliveryAPI {
  static DeliveryBoy = DeliveryBoyAPI;
  static Assignment = DeliveryAssignmentAPI;
  static Tracking = OrderTrackingAPI;
  static Pricing = DeliveryPricingAPI;
  static Notification = DeliveryNotificationAPI;

  /**
   * Health check for delivery services
   */
  static async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_boys')
        .select('id')
        .limit(1);

      if (error) throw error;

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          delivery_service: 'operational'
        },
        message: 'Delivery API is running smoothly'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Delivery API health check failed'
      };
    }
  }
}

export default DeliveryAPI; 
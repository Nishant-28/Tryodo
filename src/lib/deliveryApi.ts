// @ts-nocheck
// eslint-disable
import { supabase, supabaseServiceRole } from './supabase';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  shop_name?: string;
  owner_name: string;
  pincode: string;
  address_box: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface VendorAddress {
  id: string;
  vendor_id: string;
  company_name: string;
  pincode: string;
  address_box: string;
  phone_number1: string;
  phone_number2?: string;
  phone_number3?: string;
  phone_number4?: string;
  phone_number5?: string;
  created_at: string;
  updated_at: string;
}

// Intermediate types for Supabase nested selects
interface ProfileResult {
  full_name?: string;
  phone?: string;
}

interface CustomerSelectResult {
  id: string;
  profiles: ProfileResult[];
}

interface VendorProfileSelectResult {
  phone?: string;
}

interface VendorSelectResult {
  id: string;
  business_name?: string;
  profiles: VendorProfileSelectResult[];
}

interface ProductSelectResult {
  id: string;
  vendor_id: string;
  product_name: string;
}

interface OrderItemSelectResult {
  item_status: string;
  vendors: VendorSelectResult[];
  products: ProductSelectResult[];
  quantity: number;
  line_total: number;
  unit_price: number;
  vendor_confirmed_at?: string;
}

interface OrderSelectResult {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  delivery_address_id: string | null;
  customers?: CustomerSelectResult[];
  order_items: OrderItemSelectResult[];
  delivery_assigned_at?: string;
  picked_up_date?: string;
  delivered_at?: string;
  delivery_partner_orders?: {
    status: string;
    accepted_at: string;
    picked_up_at?: string;
    delivered_at?: string;
  }[];
}

interface DeliveryPartnerOrderSelectResult {
  id: string;
  order_id: string;
  status: string;
  accepted_at: string;
  picked_up_at?: string;
  delivered_at?: string;
  order?: OrderSelectResult;
}

export interface AvailableOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: CustomerAddress; // Full address object
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_full_address?: VendorAddress; // Full address object
  delivery_address_id: string | null; // Reference to customer_addresses
  vendor_address_id: string | null; // Reference to vendor_addresses for pickup
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
  customer_address?: CustomerAddress; // Full address object
  vendor_name: string;
  vendor_phone: string;
  vendor_full_address?: VendorAddress; // Full address object
  delivery_address_id: string | null; // Reference to customer_addresses
  vendor_address_id: string | null; // Reference to vendor_addresses for pickup
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
  successful_deliveries: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  total_earnings: number;
  average_rating: number;
  total_distance?: number;
  average_delivery_time?: number;
  active_orders: number;
  last_delivery_at: string | null;
  stats_date?: string;
  created_at?: string;
  updated_at?: string;
  // Wallet balance fields from delivery_partner_wallets table
  available_balance?: number;
  pending_balance?: number;
  total_paid_out?: number;
}

export interface VendorPickupInfo {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address_id: string | null; // Reference to vendor_addresses for pickup
  vendor_full_address?: VendorAddress; // Full address object
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

// Types for the delivery system
export interface Sector {
  id: string;
  city_name: string;
  name: string;
  pincodes: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliverySlot {
  id: string;
  sector_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  cutoff_time: string;
  pickup_delay_minutes: number;
  max_orders: number;
  is_active: boolean;
  day_of_week?: number[];
  created_at: string;
  updated_at: string;
  sector?: Sector;
  available_orders?: number;
}

export interface DeliveryAssignment {
  id: string;
  delivery_partner_id: string;
  slot_id: string;
  assigned_date: string;
  sector_id: string;
  max_orders: number;
  current_orders: number;
  status: 'assigned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface OrderPickup {
  id: string;
  order_id: string;
  vendor_id: string;
  delivery_partner_id: string;
  pickup_status: 'pending' | 'en_route' | 'picked_up' | 'failed';
  pickup_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  delivery_status: 'pending' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  delivery_time?: string;
  delivery_notes?: string;
  customer_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  pincodes: string[];
  is_active: boolean;
}

export interface DeliveryPartnerDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_url: string;
  is_verified: boolean;
  expiry_date: string;
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
        .select<string, OrderSelectResult>(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          delivery_address_id,
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
              profiles!inner(
                phone
              )
            ),
            products!inner(
              id,
              vendor_id,
              product_name
            ),
            quantity,
            line_total,
            unit_price,
            vendor_confirmed_at
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

      // Collect all unique customer and vendor address IDs
      const customerAddressIds = [...new Set(availableOrdersData.map(order => order.delivery_address_id).filter((id): id is string => id !== null))];
      const vendorIds = [...new Set(availableOrdersData.flatMap(order => order.order_items.map(item => item.vendors[0]?.id)).filter((id): id is string => id !== null))];

      // Fetch full customer addresses
      const { data: customerAddresses, error: customerAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .in('id', customerAddressIds);

      if (customerAddressError) throw customerAddressError;

      // Fetch full vendor addresses
      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', vendorIds);
      
      if (vendorAddressError) throw vendorAddressError;

      const customerAddressMap = new Map(customerAddresses?.map(addr => [addr.id, addr]));
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));

      const finalAvailableOrders: AvailableOrder[] = availableOrdersData.map(order => {
        const customer = order.customers?.[0];
        const customerProfile = customer?.profiles?.[0];
        const vendorOrderItem = order.order_items?.[0]; // Taking the first item for primary vendor details
        const vendor = vendorOrderItem?.vendors?.[0];
        const vendorProfile = vendor?.profiles?.[0];

        const customerAddress = order.delivery_address_id ? customerAddressMap.get(order.delivery_address_id) : undefined;
        const vendorFullAddress = vendor?.id ? vendorAddressMap.get(vendor.id) : undefined;

        const totalItemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customer?.id || '',
          customer_name: customerProfile?.full_name || 'N/A',
          customer_phone: customerProfile?.phone || 'N/A',
          customer_address: customerAddress,
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_full_address: vendorFullAddress,
          delivery_address_id: order.delivery_address_id,
          vendor_address_id: vendorFullAddress?.id || null,
          total_amount: order.total_amount,
          item_count: totalItemCount,
          created_at: order.created_at,
          pickup_otp: '',
          delivery_otp: '',
          distance_km: 0,
          estimated_time_mins: 0,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
        };
      });

      return { success: true, data: finalAvailableOrders };
    } catch (error: any) {
      console.error('Error fetching available orders:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get delivery partner's current orders
   */
  static async getMyOrders(deliveryPartnerId: string): Promise<ApiResponse<MyOrder[]>> {
    try {
      const { data: deliveryPartnerOrders, error: dpOrderError } = await supabase
        .from('delivery_partner_orders')
        .select<string, DeliveryPartnerOrderSelectResult>(`
          id,
          order_id,
          status,
          accepted_at,
          picked_up_at,
          delivered_at,
          order:orders(
            id,
            order_number,
            total_amount,
            payment_method,
            payment_status,
            created_at,
            delivery_address_id,
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
                profiles!inner(
                  phone
                )
              ),
              products!inner(
                id,
                vendor_id,
                product_name
              ),
              quantity,
              line_total,
              unit_price,
              vendor_confirmed_at
            )
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .order('created_at', { ascending: false });

      if (dpOrderError) throw dpOrderError;

      const ordersData = (deliveryPartnerOrders || []).map(dpOrder => dpOrder.order).filter((order): order is OrderSelectResult => order !== null);

      // Collect all unique customer and vendor address IDs
      const customerAddressIds = [...new Set(ordersData.map(order => order.delivery_address_id).filter((id): id is string => id !== null))];
      const vendorIds = [...new Set(ordersData.flatMap(order => order.order_items.map(item => item.vendors[0]?.id)).filter((id): id is string => id !== null))];

      // Fetch full customer addresses
      const { data: customerAddresses, error: customerAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .in('id', customerAddressIds);

      if (customerAddressError) throw customerAddressError;

      // Fetch full vendor addresses
      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', vendorIds);
      
      if (vendorAddressError) throw vendorAddressError;

      const customerAddressMap = new Map(customerAddresses?.map(addr => [addr.id, addr]));
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));

      const myOrders: MyOrder[] = deliveryPartnerOrders.map(dpOrder => {
        const order = dpOrder.order;
        if (!order) return null;

        const customer = order.customers?.[0];
        const customerProfile = customer?.profiles?.[0];
        const vendorOrderItem = order.order_items?.[0];
        const vendor = vendorOrderItem?.vendors?.[0];
        const vendorProfile = vendor?.profiles?.[0];

        const customerAddress = order.delivery_address_id ? customerAddressMap.get(order.delivery_address_id) : undefined;
        const vendorFullAddress = vendor?.id ? vendorAddressMap.get(vendor.id) : undefined;

        const totalItemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: customerProfile?.full_name || 'N/A',
          customer_phone: customerProfile?.phone || 'N/A',
          customer_address: customerAddress,
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_full_address: vendorFullAddress,
          delivery_address_id: order.delivery_address_id,
          vendor_address_id: vendorFullAddress?.id || null,
          total_amount: order.total_amount,
          item_count: totalItemCount,
          status: dpOrder.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered',
          accepted_at: dpOrder.accepted_at,
          picked_up_at: dpOrder.picked_up_at,
          delivered_at: dpOrder.delivered_at,
          payment_method: order.payment_method,
          collection_required: order.payment_method === 'Cash on Delivery',
        };
      }).filter((order): order is MyOrder => order !== null);

      return { success: true, data: myOrders };
    } catch (error: any) {
      console.error('Error fetching my orders:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get order details by order ID
   */
  static async getOrderDetails(orderId: string): Promise<ApiResponse<MultiVendorOrder>> {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select<string, OrderSelectResult>(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          delivery_address_id,
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
              profiles!inner(
                phone
              )
            ),
            products!inner(
              id,
              vendor_id,
              product_name
            ),
            quantity,
            line_total,
            unit_price,
            vendor_confirmed_at
          ),
          delivery_partner_orders(
            status,
            accepted_at,
            picked_up_at,
            delivered_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) return { success: false, message: 'Order not found.' };

      // Fetch customer address if delivery_address_id exists
      let customerAddress: CustomerAddress | undefined;
      if (orderData.delivery_address_id) {
        const { data: addrData, error: addrError } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', orderData.delivery_address_id)
          .single();
        if (addrError) console.error('Error fetching customer address:', addrError.message);
        customerAddress = addrData || undefined;
      }

      // Fetch vendor addresses for all vendors in the order
      const vendorIds = [...new Set(orderData.order_items.map(item => item.vendors[0]?.id).filter((id): id is string => id !== null))];
      let vendorFullAddresses: VendorAddress[] = [];

      if (vendorIds.length > 0) {
        const { data: vendorAddrData, error: vendorAddrError } = await supabase
          .from('vendor_addresses')
          .select('*')
          .in('vendor_id', vendorIds);
        if (vendorAddrError) console.error('Error fetching vendor addresses:', vendorAddrError.message);
        vendorFullAddresses = vendorAddrData || [];
      }

      const customer = orderData.customers?.[0];
      const customerProfile = customer?.profiles?.[0];
      const deliveryPartnerOrder = orderData.delivery_partner_orders?.[0];

      // Group order items by vendor
      const vendorsMap = new Map<string, { vendor: VendorSelectResult, items: OrderItemSelectResult[] }>();
      orderData.order_items.forEach(item => {
        const vendor = item.vendors?.[0];
        if (vendor) {
          if (!vendorsMap.has(vendor.id)) {
            vendorsMap.set(vendor.id, { vendor, items: [] });
          }
          vendorsMap.get(vendor.id)?.items.push(item);
        }
      });

      const vendorsInfo: VendorPickupInfo[] = Array.from(vendorsMap.values()).map(({ vendor, items }) => {
        const vendorProfile = vendor?.profiles?.[0];
        const vendorAddress = vendorFullAddresses.find(addr => addr.vendor_id === vendor?.id);

        return {
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_address_id: vendorAddress?.id || null,
          vendor_full_address: vendorAddress,
          pickup_otp: '',
          is_confirmed: items.every(item => item.item_status === 'confirmed'),
          confirmed_at: items[0]?.vendor_confirmed_at,
          confirmed_by_vendor: items.some(item => !!item.vendor_confirmed_at),
          vendor_confirmed_at: items[0]?.vendor_confirmed_at,
          vendor_notes: '',
          items: items.map(item => ({
            product_name: item.products?.[0]?.product_name || 'N/A',
            quantity: item.quantity,
            line_total: item.line_total,
          })),
        };
      });

      // Aggregate item count from all order items
      const totalItemCount = orderData.order_items.reduce((sum, item) => sum + item.quantity, 0);

      const transformedOrder: MultiVendorOrder = {
        order_id: orderData.id,
        order_number: orderData.order_number,
        customer_name: customerProfile?.full_name || 'N/A',
        customer_phone: customerProfile?.phone || 'N/A',
        customer_address: customerAddress,
        vendor_name: vendorsInfo[0]?.vendor_name || 'N/A',
        vendor_phone: vendorsInfo[0]?.vendor_phone || 'N/A',
        vendor_full_address: vendorsInfo[0]?.vendor_full_address,
        delivery_address_id: orderData.delivery_address_id,
        vendor_address_id: vendorsInfo[0]?.vendor_address_id || null,
        total_amount: orderData.total_amount,
        item_count: totalItemCount,
        status: (deliveryPartnerOrder?.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered') || 'pending',
        accepted_at: deliveryPartnerOrder?.accepted_at || '',
        picked_up_at: deliveryPartnerOrder?.picked_up_at,
        delivered_at: deliveryPartnerOrder?.delivered_at,
        payment_method: orderData.payment_method,
        collection_required: orderData.payment_method === 'Cash on Delivery',
        vendors: vendorsInfo,
        all_vendors_confirmed: vendorsInfo.every(v => v.is_confirmed),
        total_vendors: vendorsInfo.length,
        confirmed_vendors: vendorsInfo.filter(v => v.is_confirmed).length,
      };

      return { success: true, data: transformedOrder };
    } catch (error: any) {
      console.error('Error fetching order details:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept an available order and assign it to the delivery partner
   */
  static async acceptOrder(orderId: string, deliveryPartnerId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_orders')
        .insert({
          order_id: orderId,
          delivery_partner_id: deliveryPartnerId,
          status: 'accepted',
        })
        .select()
        .single();

      if (error) throw error;

      // Update order status in the orders table
      const { error: updateOrderError } = await supabase.from('orders').update({
        order_status: 'assigned_to_delivery',
        delivery_assigned_at: new Date().toISOString(),
      }).eq('id', orderId);

      if (updateOrderError) throw updateOrderError;

      return { success: true, data, message: 'Order accepted and assigned successfully' };
    } catch (error: any) {
      console.error('Error accepting order:', error.message);
      return { success: false, error: error.message || 'Failed to accept order' };
    }
  }

  /**
   * Mark an order as picked up by the delivery partner
   */
  static async markPickedUp(
    orderId: string, 
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_orders')
        .update({ 
          status: 'picked_up',
          picked_up_at: new Date().toISOString() 
        })
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId);

      if (error) throw error;
      
      // Also update the main order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          order_status: 'out_for_delivery',
          picked_up_date: new Date().toISOString(),
        })
        .eq('id', orderId);
        
      if (orderError) throw orderError;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark an order as delivered by the delivery partner
   */
  static async markDelivered(
    orderId: string,
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      console.log('🚚 markDelivered: Starting delivery process for order:', orderId);

      // Call the Edge Function which has service role permissions
      const { data, error } = await supabase.functions.invoke('mark-delivered', {
        body: {
          orderId,
          deliveryPartnerId
        }
      });

      if (error) {
        console.error('❌ markDelivered: Edge function error:', error);
        throw error;
      }

      if (!data.success) {
        console.error('❌ markDelivered: Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ markDelivered: Order marked as delivered successfully');
      return { success: true, data: data, message: 'Order marked as delivered successfully' };

    } catch (error) {
      console.error('💥 markDelivered: Final error:', error);
      return { success: false, error: error.message || 'Failed to mark order as delivered' };
    }
  }

  /**
   * Get delivery stats for a delivery partner
   */
  static async getDeliveryStats(deliveryPartnerId: string): Promise<ApiResponse<DeliveryStats>> {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('delivery_partner_stats')
        .select(`*`)
        .eq('delivery_partner_id', deliveryPartnerId)
        .single();
      
      if (statsError) throw statsError;

      const { data: walletData, error: walletError } = await supabase
        .from('delivery_partner_wallets')
        .select(`
            available_balance,
            pending_balance,
            total_paid_out
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .maybeSingle();

      if (walletError) {
        // We can choose to return stats without wallet info if it's non-critical
        console.warn('Could not fetch wallet info:', walletError.message);
      }

      const stats: DeliveryStats = {
        delivery_partner_id: statsData.delivery_partner_id,
        today_deliveries: statsData.today_deliveries,
        week_deliveries: statsData.week_deliveries,
        month_deliveries: statsData.month_deliveries,
        total_deliveries: statsData.total_deliveries,
        successful_deliveries: statsData.successful_deliveries,
        today_earnings: statsData.today_earnings,
        week_earnings: statsData.week_earnings,
        month_earnings: statsData.month_earnings,
        total_earnings: statsData.total_earnings,
        average_rating: statsData.average_rating,
        total_distance: statsData.total_distance,
        average_delivery_time: statsData.average_delivery_time,
        active_orders: statsData.active_orders,
        last_delivery_at: statsData.last_delivery_at,
        stats_date: statsData.stats_date,
        created_at: statsData.created_at,
        updated_at: statsData.updated_at,
        available_balance: walletData?.available_balance || 0,
        pending_balance: walletData?.pending_balance || 0,
        total_paid_out: walletData?.total_paid_out || 0,
      };

      return { success: true, data: stats, message: 'Delivery stats retrieved successfully' };
    } catch (error: any) {
      console.error('Error fetching delivery stats:', error.message);
      return { success: false, error: error.message || 'Failed to fetch delivery stats' };
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
      const { data, error } = await supabase
        .from('delivery_partners')
        .update({ current_latitude: latitude, current_longitude: longitude })
        .eq('id', deliveryPartnerId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, message: 'Location updated successfully' };
    } catch (error: any) {
      console.error('Error updating location:', error.message);
      return { success: false, error: error.message || 'Failed to update location' };
    }
  }

  /**
   * Generate OTP for pickup or delivery
   */
  static async generateOTP(orderId: string, type: 'pickup' | 'delivery'): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase
        .rpc('generate_otp', { p_order_id: orderId, p_otp_type: type })
        .single();
      
      if (error) throw error;

      return { success: true, data: data as string, message: 'OTP generated successfully' };
    } catch (error: any) {
      console.error('Error generating OTP:', error.message);
      return { success: false, error: error.message || 'Failed to generate OTP' };
    }
  }

  /**
   * Verify OTP for pickup or delivery
   */
  static async verifyOTP(
    orderId: string, 
    otp: string, 
    type: 'pickup' | 'delivery'
  ): Promise<ApiResponse<boolean>> {
    try {
      const { data, error } = await supabase
        .rpc('verify_otp', { p_order_id: orderId, p_otp_type: type, p_otp_code: otp })
        .single();
      
      if (error) throw error;

      return { success: true, data: data as boolean, message: 'OTP verified successfully' };
    } catch (error: any) {
      console.error('Error verifying OTP:', error.message);
      return { success: false, error: error.message || 'Failed to verify OTP' };
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
          profiles(full_name, email, phone)
        `)
        .eq('id', deliveryPartnerId)
        .single();

      if (error) throw error;

      return { success: true, data, message: 'Delivery partner profile retrieved successfully' };
    } catch (error: any) {
      console.error('Error fetching delivery partner profile:', error.message);
      return { success: false, error: error.message || 'Failed to fetch delivery partner profile' };
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
        .update({ is_available: isAvailable })
        .eq('id', deliveryPartnerId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, message: 'Availability status updated successfully' };
    } catch (error: any) {
      console.error('Error updating availability status:', error.message);
      return { success: false, error: error.message || 'Failed to update availability status' };
    }
  }

  /**
   * Get delivery history for a delivery partner
   */
  static async getDeliveryHistory(
    deliveryPartnerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<any[]>> {
    try {
      const offset = (page - 1) * limit;
      const { data, error } = await supabase
        .from('delivery_partner_orders')
        .select(`
          id,
          order_id,
          status,
          accepted_at,
          picked_up_at,
          delivered_at,
          order:orders(
            id,
            order_number,
            total_amount,
            created_at,
            customers!inner(profiles(full_name)),
            delivery_address_id
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return { success: true, data, message: 'Delivery history retrieved successfully' };
    } catch (error: any) {
      console.error('Error fetching delivery history:', error.message);
      return { success: false, error: error.message || 'Failed to fetch delivery history' };
    }
  }

  /**
   * Get earnings for a delivery partner within a date range
   */
  static async getEarnings(
    deliveryPartnerId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_earnings')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .gte('earning_date', startDate)
        .lte('earning_date', endDate)
        .order('earning_date', { ascending: false });

      if (error) throw error;

      const totalEarnings = data.reduce((sum, entry) => sum + entry.amount, 0);

      return { 
        success: true, 
        data: { 
          earnings: data, 
          total: totalEarnings 
        }, 
        message: 'Earnings retrieved successfully' 
      };
    } catch (error: any) {
      console.error('Error fetching earnings:', error.message);
      return { success: false, error: error.message || 'Failed to fetch earnings' };
    }
  }

  static Assignment = {
    async createAssignmentFromOrder(
      orderItemId: string,
      orderId: string,
      vendorId: string,
      customerPincode: string,
      priority: 'normal' | 'urgent' = 'normal'
    ): Promise<ApiResponse<any>> {
      try {
        const { data, error } = await supabase
          .from('order_assignments')
          .insert({
            order_item_id: orderItemId,
            order_id: orderId,
            vendor_id: vendorId,
            customer_pincode: customerPincode,
            priority: priority,
            assignment_status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, data, message: 'Order assignment created successfully.' };
      } catch (error: any) {
        console.error('Error creating order assignment:', error.message);
        return { success: false, error: error.message || 'Failed to create order assignment.' };
      }
    },

    async autoAssignOrder(
      orderId: string,
      customerLatitude?: number,
      customerLongitude?: number
    ): Promise<ApiResponse<any>> {
      try {
        const { data, error } = await supabase
          .rpc('auto_assign_delivery_partner', {
            p_order_id: orderId,
            p_customer_latitude: customerLatitude,
            p_customer_longitude: customerLongitude
          })
          .single();

        if (error) throw error;
        return { success: true, data, message: 'Auto-assignment processed.' };
      } catch (error: any) {
        console.error('Error during auto-assignment:', error.message);
        return { success: false, error: error.message || 'Failed to auto-assign order.' };
      }
    },
  };

  /**
   * Mark an order as ready for pickup by a vendor
   */
  static async pickupReadyOrder(
    orderId: string,
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_orders')
        .update({ status: 'ready_for_pickup' })
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartnerId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Order marked as ready for pickup.' };
    } catch (error: any) {
      console.error('Error marking order as ready for pickup:', error.message);
      return { success: false, error: error.message || 'Failed to mark order as ready for pickup.' };
    }
  }

  /**
   * Get available orders for a specific delivery partner (perhaps based on location/capacity)
   * This might be a more targeted version of getAvailableOrders or used for a different purpose.
   */
  static async getAvailableOrdersForDeliveryPartner(deliveryPartnerId: string): Promise<ApiResponse<AvailableOrder[]>> {
    try {
      // This is a placeholder. The actual implementation would involve complex logic
      // based on delivery partner's location, availability, current load, etc.
      // For now, it might return all available orders or a filtered subset.

      const { data: confirmedOrders, error: orderError } = await supabase
        .from('orders')
        .select<string, OrderSelectResult>(`
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          delivery_address_id,
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
              profiles!inner(
                phone
              )
            ),
            products!inner(
              id,
              vendor_id,
              product_name
            ),
            quantity,
            line_total,
            unit_price,
            vendor_confirmed_at
          )
        `)
        .eq('order_status', 'pending')
        .eq('order_items.item_status', 'confirmed');

      if (orderError) throw orderError;

      const { data: assignedOrderIds, error: assignedError } = await supabase
        .from('delivery_partner_orders')
        .select('order_id')
        .eq('delivery_partner_id', deliveryPartnerId); // Filter for orders already assigned to THIS delivery partner

      if (assignedError) throw assignedError;

      const assignedIds = new Set(assignedOrderIds?.map(item => item.order_id) || []);

      const availableOrdersForPartnerData = (confirmedOrders || []).filter(order => !assignedIds.has(order.id));

      const customerAddressIds = [...new Set(availableOrdersForPartnerData.map(order => order.delivery_address_id).filter((id): id is string => id !== null))];
      const vendorIds = [...new Set(availableOrdersForPartnerData.flatMap(order => order.order_items.map(item => item.vendors[0]?.id)).filter((id): id is string => id !== null))];

      const { data: customerAddresses, error: customerAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .in('id', customerAddressIds);

      if (customerAddressError) throw customerAddressError;

      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', vendorIds);
      
      if (vendorAddressError) throw vendorAddressError;

      const customerAddressMap = new Map(customerAddresses?.map(addr => [addr.id, addr]));
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));

      const finalAvailableOrders: AvailableOrder[] = availableOrdersForPartnerData.map(order => {
        const customer = order.customers?.[0];
        const customerProfile = customer?.profiles?.[0];
        const vendorOrderItem = order.order_items?.[0];
        const vendor = vendorOrderItem?.vendors?.[0];
        const vendorProfile = vendor?.profiles?.[0];

        const customerAddress = order.delivery_address_id ? customerAddressMap.get(order.delivery_address_id) : undefined;
        const vendorFullAddress = vendor?.id ? vendorAddressMap.get(vendor.id) : undefined;

        const totalItemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customer?.id || '',
          customer_name: customerProfile?.full_name || 'N/A',
          customer_phone: customerProfile?.phone || 'N/A',
          customer_address: customerAddress,
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_full_address: vendorFullAddress,
          delivery_address_id: order.delivery_address_id,
          vendor_address_id: vendorFullAddress?.id || null,
          total_amount: order.total_amount,
          item_count: totalItemCount,
          created_at: order.created_at,
          pickup_otp: '',
          delivery_otp: '',
          distance_km: 0,
          estimated_time_mins: 0,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
        };
      });

      return { success: true, data: finalAvailableOrders };

    } catch (error: any) {
      console.error('Error fetching available orders for delivery partner:', error.message);
      return { success: false, error: error.message };
    }
  }


  /**
   * Generate OTPs for multi-vendor pickups
   */
  static async generateMultiVendorPickupOTPs(orderId: string): Promise<ApiResponse<VendorPickupInfo[]>> {
    try {
      // This function would generate and store unique OTPs for each vendor involved in a multi-vendor order.
      // For now, it's a placeholder. It would return an array of VendorPickupInfo with generated OTPs.
      console.warn('generateMultiVendorPickupOTPs: This is a placeholder and does not generate real OTPs.');
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          order_items!inner(
            vendors!inner(
              id,
              business_name,
              profiles!inner(phone)
            ),
            products!inner(
              product_name
            ),
            quantity,
            line_total,
            item_status,
            vendor_confirmed_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) return { success: false, message: 'Order not found.' };

      const vendorsMap = new Map<string, { vendor: VendorSelectResult, items: OrderItemSelectResult[] }>();
      orderData.order_items.forEach(item => {
        const vendor = item.vendors?.[0];
        if (vendor) {
          if (!vendorsMap.has(vendor.id)) {
            vendorsMap.set(vendor.id, { vendor, items: [] });
          }
          vendorsMap.get(vendor.id)?.items.push(item);
        }
      });

      const vendorIds = Array.from(vendorsMap.keys());
      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', vendorIds);
      
      if (vendorAddressError) console.error('Error fetching vendor addresses for OTP generation:', vendorAddressError.message);
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));


      const vendorsInfo: VendorPickupInfo[] = Array.from(vendorsMap.values()).map(({ vendor, items }) => {
        const vendorProfile = vendor?.profiles?.[0];
        const vendorAddress = vendorAddressMap.get(vendor?.id || '');

        return {
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_address_id: vendorAddress?.id || null,
          vendor_full_address: vendorAddress,
          pickup_otp: 'PLACEHOLDER_OTP', // Placeholder for generated OTP
          is_confirmed: items.every(item => item.item_status === 'confirmed'),
          confirmed_at: items[0]?.vendor_confirmed_at,
          confirmed_by_vendor: items.some(item => !!item.vendor_confirmed_at),
          vendor_confirmed_at: items[0]?.vendor_confirmed_at,
          vendor_notes: '',
          items: items.map(item => ({
            product_name: item.products?.[0]?.product_name || 'N/A',
            quantity: item.quantity,
            line_total: item.line_total,
          })),
        };
      });

      return { success: true, data: vendorsInfo, message: 'Multi-vendor pickup OTPs generated (placeholder).' };
    } catch (error: any) {
      console.error('Error generating multi-vendor pickup OTPs:', error.message);
      return { success: false, error: error.message || 'Failed to generate multi-vendor pickup OTPs.' };
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
      console.warn('verifyVendorPickupOTP: This is a placeholder and does not verify real OTPs.');
      // In a real scenario, you would query the database to check the OTP
      // and update the vendor_confirmed_at timestamp for the relevant order_items.

      // For demonstration, assume OTP is always valid if not empty.
      if (otp === 'PLACEHOLDER_OTP' || otp === '0000') { // Assuming '0000' for manual testing
        // Update item_status for this vendor's items to 'confirmed_by_vendor_otp' or similar
        // if confirmedByVendor is true.
        const { error } = await supabase
          .from('order_items')
          .update({
            item_status: 'confirmed', // Assuming 'confirmed' means vendor confirmed
            vendor_confirmed_at: new Date().toISOString()
          })
          .eq('order_id', orderId)
          .eq('vendor_id', vendorId);

        if (error) throw error;

        return { success: true, data: true, message: 'OTP verified (placeholder).' };
      } else {
        return { success: false, data: false, message: 'Invalid OTP (placeholder).' };
      }
    } catch (error: any) {
      console.error('Error verifying vendor pickup OTP:', error.message);
      return { success: false, error: error.message || 'Failed to verify vendor pickup OTP.' };
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
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          order_items!inner(
            vendors!inner(
              id,
              business_name,
              profiles!inner(phone)
            ),
            products!inner(
              product_name
            ),
            quantity,
            line_total,
            item_status,
            vendor_confirmed_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) return { success: false, message: 'Order not found.' };

      const vendorsMap = new Map<string, { vendor: VendorSelectResult, items: OrderItemSelectResult[] }>();
      orderData.order_items.forEach(item => {
        const vendor = item.vendors?.[0];
        if (vendor) {
          if (!vendorsMap.has(vendor.id)) {
            vendorsMap.set(vendor.id, { vendor, items: [] });
          }
          vendorsMap.get(vendor.id)?.items.push(item);
        }
      });

      const vendorIds = Array.from(vendorsMap.keys());
      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', vendorIds);
      
      if (vendorAddressError) console.error('Error fetching vendor addresses for pickup status:', vendorAddressError.message);
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));

      const vendorsInfo: VendorPickupInfo[] = Array.from(vendorsMap.values()).map(({ vendor, items }) => {
        const vendorProfile = vendor?.profiles?.[0];
        const vendorAddress = vendorAddressMap.get(vendor?.id || '');

        const isVendorConfirmed = items.every(item => item.item_status === 'confirmed');
        return {
          vendor_id: vendor?.id || '',
          vendor_name: vendor?.business_name || 'N/A',
          vendor_phone: vendorProfile?.phone || 'N/A',
          vendor_address_id: vendorAddress?.id || null,
          vendor_full_address: vendorAddress,
          pickup_otp: '', // OTP is not stored here, just status
          is_confirmed: isVendorConfirmed,
          confirmed_at: items[0]?.vendor_confirmed_at,
          confirmed_by_vendor: items.some(item => !!item.vendor_confirmed_at),
          vendor_confirmed_at: items[0]?.vendor_confirmed_at,
          vendor_notes: '',
          items: items.map(item => ({
            product_name: item.products?.[0]?.product_name || 'N/A',
            quantity: item.quantity,
            line_total: item.line_total,
          })),
        };
      });

      const allConfirmed = vendorsInfo.every(v => v.is_confirmed);
      const confirmedVendorsCount = vendorsInfo.filter(v => v.is_confirmed).length;

      return {
        success: true,
        data: {
          vendors: vendorsInfo,
          all_confirmed: allConfirmed,
          total_vendors: vendorsInfo.length,
          confirmed_vendors: confirmedVendorsCount,
        },
        message: 'Multi-vendor pickup status retrieved successfully.',
      };
    } catch (error: any) {
      console.error('Error fetching multi-vendor pickup status:', error.message);
      return { success: false, error: error.message || 'Failed to fetch multi-vendor pickup status.' };
    }
  }


  /**
   * Get my orders with multi-vendor details for delivery partner
   */
  static async getMyOrdersWithMultiVendor(deliveryPartnerId: string): Promise<ApiResponse<MultiVendorOrder[]>> {
    try {
      const { data: deliveryPartnerOrders, error: dpOrderError } = await supabase
        .from('delivery_partner_orders')
        .select<string, DeliveryPartnerOrderSelectResult>(`
          id,
          order_id,
          status,
          accepted_at,
          picked_up_at,
          delivered_at,
          order:orders(
            id,
            order_number,
            total_amount,
            payment_method,
            payment_status,
            created_at,
            delivery_address_id,
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
                profiles!inner(
                  phone
                )
              ),
              vendor_products!inner(
                id,
                vendor_id,
                smartphone_models!inner(
                  model_name
                )
              ),
              quantity,
              line_total,
              unit_price,
              vendor_confirmed_at
            )
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .order('created_at', { ascending: false });

      if (dpOrderError) throw dpOrderError;

      const ordersData = (deliveryPartnerOrders || []).map(dpOrder => dpOrder.order).filter((order): order is OrderSelectResult => order !== null);

      const customerAddressIds = [...new Set(ordersData.map(order => order.delivery_address_id).filter((id): id is string => id !== null))];
      const allVendorIds = [...new Set(ordersData.flatMap(order => order.order_items.map(item => item.vendors[0]?.id)).filter((id): id is string => id !== null))];

      const { data: customerAddresses, error: customerAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .in('id', customerAddressIds);

      if (customerAddressError) throw customerAddressError;

      const { data: vendorAddresses, error: vendorAddressError } = await supabase
        .from('vendor_addresses')
        .select('*')
        .in('vendor_id', allVendorIds);
      
      if (vendorAddressError) throw vendorAddressError;

      const customerAddressMap = new Map(customerAddresses?.map(addr => [addr.id, addr]));
      const vendorAddressMap = new Map(vendorAddresses?.map(addr => [addr.vendor_id, addr]));

      const multiVendorOrders: MultiVendorOrder[] = deliveryPartnerOrders.map(dpOrder => {
        const order = dpOrder.order;
        if (!order) return null;

        const customer = order.customers?.[0];
        const customerProfile = customer?.profiles?.[0];

        const customerAddress = order.delivery_address_id ? customerAddressMap.get(order.delivery_address_id) : undefined;
        
        const vendorsMap = new Map<string, { vendor: VendorSelectResult, items: OrderItemSelectResult[] }>();
        order.order_items.forEach(item => {
          const vendor = item.vendors?.[0];
          if (vendor) {
            if (!vendorsMap.has(vendor.id)) {
              vendorsMap.set(vendor.id, { vendor, items: [] });
            }
            vendorsMap.get(vendor.id)?.items.push(item);
          }
        });

        const vendorsInfo: VendorPickupInfo[] = Array.from(vendorsMap.values()).map(({ vendor, items }) => {
          const vendorProfile = vendor?.profiles?.[0];
          const vendorAddress = vendorAddressMap.get(vendor?.id || '');

          return {
            vendor_id: vendor?.id || '',
            vendor_name: vendor?.business_name || 'N/A',
            vendor_phone: vendorProfile?.phone || 'N/A',
            vendor_address_id: vendorAddress?.id || null,
            vendor_full_address: vendorAddress,
            pickup_otp: '',
            is_confirmed: items.every(item => item.item_status === 'confirmed'),
            confirmed_at: items[0]?.vendor_confirmed_at,
            confirmed_by_vendor: items.some(item => !!item.vendor_confirmed_at),
            vendor_confirmed_at: items[0]?.vendor_confirmed_at,
            vendor_notes: '',
            items: items.map(item => ({
              product_name: item.vendor_products?.[0]?.smartphone_models?.[0]?.model_name || 'N/A',
              quantity: item.quantity,
              line_total: item.line_total,
            })),
          };
        });

        const totalItemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: customerProfile?.full_name || 'N/A',
          customer_phone: customerProfile?.phone || 'N/A',
          customer_address: customerAddress,
          vendor_name: vendorsInfo[0]?.vendor_name || 'N/A', // Primary vendor for display
          vendor_phone: vendorsInfo[0]?.vendor_phone || 'N/A', // Primary vendor for display
          vendor_full_address: vendorsInfo[0]?.vendor_full_address, // Primary vendor for display
          delivery_address_id: order.delivery_address_id,
          vendor_address_id: vendorsInfo[0]?.vendor_address_id || null, // Primary vendor for display
          total_amount: order.total_amount,
          item_count: totalItemCount,
          status: dpOrder.status as 'assigned' | 'accepted' | 'picked_up' | 'delivered',
          accepted_at: dpOrder.accepted_at,
          picked_up_at: dpOrder.picked_up_at,
          delivered_at: dpOrder.delivered_at,
          payment_method: order.payment_method,
          collection_required: order.payment_method === 'Cash on Delivery',
          vendors: vendorsInfo,
          all_vendors_confirmed: vendorsInfo.every(v => v.is_confirmed),
          total_vendors: vendorsInfo.length,
          confirmed_vendors: vendorsInfo.filter(v => v.is_confirmed).length,
        };
      }).filter((order): order is MultiVendorOrder => order !== null);

      return { success: true, data: multiVendorOrders };
    } catch (error: any) {
      console.error('Error fetching multi-vendor orders:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record payment collection by delivery partner
   */
  static async recordPaymentCollection(
    deliveryPartnerId: string,
    orderId: string,
    amountCollected: number,
    paymentMethod: 'cash' | 'card' | 'upi',
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('payment_collections')
        .insert({
          delivery_partner_id: deliveryPartnerId,
          order_id: orderId,
          amount_collected: amountCollected,
          payment_method: paymentMethod,
          notes: notes,
          collection_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Optionally update the order's payment status to 'paid'
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (updateOrderError) console.error('Error updating order payment status:', updateOrderError.message);

      return { success: true, data, message: 'Payment collected successfully.' };
    } catch (error: any) {
      console.error('Error recording payment collection:', error.message);
      return { success: false, error: error.message || 'Failed to record payment collection.' };
    }
  }

  /**
   * Get daily collection summary for a delivery partner
   */
  static async getDailyCollectionSummary(
    deliveryPartnerId: string,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('payment_collections')
        .select('*')
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('collection_date', date); // Assuming collection_date stores only date part

      if (error) throw error;

      const totalCashCollected = data.filter(item => item.payment_method === 'cash').reduce((sum, item) => sum + item.amount_collected, 0);
      const totalDigitalCollected = data.filter(item => item.payment_method !== 'cash').reduce((sum, item) => sum + item.amount_collected, 0);
      const totalCollected = totalCashCollected + totalDigitalCollected;

      return { 
        success: true, 
        data: { 
          totalCashCollected, 
          totalDigitalCollected, 
          totalCollected, 
          collections: data 
        }, 
        message: 'Daily collection summary retrieved successfully.' 
      };
    } catch (error: any) {
      console.error('Error fetching daily collection summary:', error.message);
      return { success: false, error: error.message || 'Failed to fetch daily collection summary.' };
    }
  }

  /**
   * Submit day end summary for a delivery partner
   */
  static async submitDayEndSummary(
    deliveryPartnerId: string,
    totalCashCollected: number,
    totalDigitalCollected: number,
    notes?: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_day_summaries')
        .insert({
          delivery_partner_id: deliveryPartnerId,
          total_cash_collected: totalCashCollected,
          total_digital_collected: totalDigitalCollected,
          notes: notes,
          summary_date: new Date().toISOString().split('T')[0], // Current date
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, message: 'Day end summary submitted successfully.' };
    } catch (error: any) {
      console.error('Error submitting day end summary:', error.message);
      return { success: false, error: error.message || 'Failed to submit day end summary.' };
    }
  }

  static async createSlotAssignment(
    deliveryPartnerId: string,
    slotId: string,
    assignedDate: string,
    sectorId: string
  ): Promise<{ success: boolean; error?: any }> {
    // 1. insert into delivery_assignments
    const { data: assignment, error: assignError } = await supabase
      .from('delivery_assignments')
      .insert([{ delivery_partner_id: deliveryPartnerId, slot_id: slotId, assigned_date: assignedDate, sector_id: sectorId }])
      .single();
    if (assignError) return { success: false, error: assignError };
  
    // 2. update orders so future reads will pick them up
    const { error: updateError } = await supabase
      .from('orders')
      .update({ slot_id: slotId })
      .eq('delivery_date', assignedDate)
      .eq('sector_id', sectorId);
  
    return { success: !updateError, error: updateError };
  }

  // Partner Management
  static async createDeliveryPartner(partnerData: any) {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .insert(partnerData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating delivery partner:', error);
      return { success: false, error };
    }
  }

  static async updateDeliveryPartner(partnerId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .update(updates)
        .eq('id', partnerId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating delivery partner:', error);
      return { success: false, error };
    }
  }

  static async getDeliveryPartnerById(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            email,
            phone
          )
        `)
        .eq('id', partnerId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching delivery partner:', error);
      return { success: false, error };
    }
  }

  static async getAllDeliveryPartners() {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching delivery partners:', error);
      return { success: false, error };
    }
  }

  // Zone Management
  static async createDeliveryZone(zoneData: Partial<DeliveryZone>) {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert(zoneData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating delivery zone:', error);
      return { success: false, error };
    }
  }

  static async updateDeliveryZone(zoneId: string, updates: Partial<DeliveryZone>) {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .update(updates)
        .eq('id', zoneId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating delivery zone:', error);
      return { success: false, error };
    }
  }

  static async getAllDeliveryZones() {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      return { success: false, error };
    }
  }

  // Document Management
  static async uploadPartnerDocument(partnerId: string, documentData: Partial<DeliveryPartnerDocument>) {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_documents')
        .insert({
          delivery_partner_id: partnerId,
          ...documentData
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error uploading partner document:', error);
      return { success: false, error };
    }
  }

  static async verifyPartnerDocument(documentId: string, verifiedBy: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_documents')
        .update({
          is_verified: true,
          verified_by: verifiedBy,
          verification_date: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error verifying partner document:', error);
      return { success: false, error };
    }
  }

  // Order Management
  static async getMyOrders(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching partner orders:', error);
      return { success: false, error };
    }
  }

  static async updateOrderStatus(orderId: string, status: string, additionalData = {}) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          ...additionalData,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error };
    }
  }

  // Earnings Management
  static async getPartnerEarnings(partnerId: string, startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('delivery_partner_earnings')
        .select('*')
        .eq('delivery_partner_id', partnerId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching partner earnings:', error);
      return { success: false, error };
    }
  }

  static async recordEarning(earningData: any) {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_earnings')
        .insert(earningData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error recording earning:', error);
      return { success: false, error };
    }
  }

  // Attendance Management
  static async checkIn(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_attendance')
        .insert({
          delivery_partner_id: partnerId,
          check_in: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error checking in:', error);
      return { success: false, error };
    }
  }

  static async checkOut(attendanceId: string, summary: any) {
    try {
      const { data, error } = await supabase
        .from('delivery_partner_attendance')
        .update({
          check_out: new Date().toISOString(),
          ...summary
        })
        .eq('id', attendanceId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error checking out:', error);
      return { success: false, error };
    }
  }

  // Statistics and Analytics
  static async getDeliveryPartnerStats(partnerId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: DeliveryStats; error?: any }> {
    try {
      // Fetch basic stats
      const { data: partner, error: partnerError } = await supabase
        .from('delivery_partners')
        .select('total_deliveries, successful_deliveries, rating')
        .eq('id', partnerId)
        .single();

      if (partnerError) throw partnerError;

      // Fetch earnings for the period
      let earningsQuery = supabase
        .from('delivery_partner_earnings')
        .select('amount')
        .eq('delivery_partner_id', partnerId);

      if (startDate) earningsQuery = earningsQuery.gte('created_at', startDate);
      if (endDate) earningsQuery = earningsQuery.lte('created_at', endDate);

      const { data: earnings, error: earningsError } = await earningsQuery;
      if (earningsError) throw earningsError;

      // Calculate total earnings
      const total_earnings = earnings.reduce((sum, e) => sum + e.amount, 0);

      // Fetch attendance records for distance and time calculations
      let attendanceQuery = supabase
        .from('delivery_partner_attendance')
        .select('total_distance, total_orders');

      if (startDate) attendanceQuery = attendanceQuery.gte('created_at', startDate);
      if (endDate) attendanceQuery = attendanceQuery.lte('created_at', endDate);

      const { data: attendance, error: attendanceError } = await attendanceQuery;
      if (attendanceError) throw attendanceError;

      // Calculate aggregated stats
      const total_distance = attendance.reduce((sum, a) => sum + (a.total_distance || 0), 0);
      const total_orders = attendance.reduce((sum, a) => sum + (a.total_orders || 0), 0);
      const average_delivery_time = total_orders > 0 ? total_distance / total_orders : 0;

      return {
        success: true,
        data: {
          total_earnings,
          total_deliveries: partner.total_deliveries,
          successful_deliveries: partner.successful_deliveries,
          average_rating: partner.rating,
          total_distance,
          average_delivery_time
        }
      };
    } catch (error) {
      console.error('Error fetching delivery partner stats:', error);
      return { success: false, error };
    }
  }

  // Fallback/basic order fetch method (not used in main flow)
  static async getPartnerOrdersBasic(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching partner orders:', error);
      return { success: false, error };
    }
  }

  // Duplicate simple fetch - kept for legacy compatibility
  static async getPartnerOrdersSimple(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching partner orders:', error);
      return { success: false, error };
    }
  }

  static async markVendorPickedUp(
    orderId: string,
    vendorId: string,
    deliveryPartnerId: string
  ): Promise<ApiResponse<any>> {
    try {
      // Update the vendor specific pickup record
      const { error } = await supabase
        .from('order_pickups')
        .update({
          pickup_status: 'picked_up',
          pickup_time: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('vendor_id', vendorId)
        .eq('delivery_partner_id', deliveryPartnerId);

      if (error) throw error;

      /*
       * Once the current vendor has been marked as picked-up we should check if
       * the remaining vendor pickups of the SAME order are also completed.
       * Only after every vendor pickup is done do we mark the entire order and
       * delivery_partner_orders record as picked-up. This preserves the per-
       * vendor workflow while still allowing the rest of the system (customer
       * deliveries, earnings, etc.) to rely on the aggregate order status.
       */
      const { data: pickups, error: pickupsError } = await supabase
        .from('order_pickups')
        .select('pickup_status')
        .eq('order_id', orderId);

      if (pickupsError) throw pickupsError;

      const allPicked = (pickups || []).every(p => p.pickup_status === 'picked_up');

      if (allPicked) {
        // Update order status
        await supabase
          .from('orders')
          .update({ order_status: 'picked_up', picked_up_date: new Date().toISOString() })
          .eq('id', orderId);

        // Update delivery_partner_orders record(s)
        await supabase
          .from('delivery_partner_orders')
          .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
          .eq('order_id', orderId);
      }

      return { success: true, message: 'Vendor pickup marked as picked-up' };
    } catch (e: any) {
      console.error('Error marking vendor pickup:', e.message);
      return { success: false, error: e.message || 'Failed to mark vendor pickup' };
    }
  }
}

// === SECTOR MANAGEMENT === //

export const sectorAPI = {
  // Get all sectors
  getAll: async (): Promise<Sector[]> => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('city_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get sectors by city
  getByCity: async (cityName: string): Promise<Sector[]> => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('city_name', cityName)
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get sector by pincode
  getByPincode: async (pincode: number): Promise<Sector | null> => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .contains('pincodes', [pincode])
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  // Create new sector
  create: async (sector: Omit<Sector, 'id' | 'created_at' | 'updated_at'>): Promise<Sector> => {
    const { data, error } = await supabase
      .from('sectors')
      .insert([sector])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update sector
  update: async (id: string, updates: Partial<Sector>): Promise<Sector> => {
    const { data, error } = await supabase
      .from('sectors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete sector
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('sectors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// === DELIVERY SLOT MANAGEMENT === //

export const deliverySlotAPI = {
  // Get available slots for a date and sector
  getAvailableSlots: async (sectorId: string, date: string): Promise<DeliverySlot[]> => {
    const dayOfWeek = new Date(date).getDay();
    
    const { data, error } = await supabase
      .from('delivery_slots')
      .select(`
        *,
        sector:sectors(*)
      `)
      .eq('sector_id', sectorId)
      .eq('is_active', true)
      .or(`day_of_week.is.null,day_of_week.cs.{${dayOfWeek}}`);
    
    if (error) throw error;

    // Calculate available orders for each slot
    const slotsWithAvailability = await Promise.all(
      (data || []).map(async (slot) => {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('slot_id', slot.id)
          .eq('delivery_date', date);

        return {
          ...slot,
          available_orders: slot.max_orders - (count || 0)
        };
      })
    );

    // Filter out slots that are past cutoff time for today
    const now = new Date();
    const selectedDate = new Date(date);
    
    if (selectedDate.toDateString() === now.toDateString()) {
      const currentTime = now.toTimeString().slice(0, 5);
      return slotsWithAvailability.filter(slot => 
        slot.cutoff_time > currentTime && slot.available_orders > 0
      );
    }

    return slotsWithAvailability.filter(slot => slot.available_orders > 0);
  },

  // Get all slots for admin
  getAll: async (): Promise<DeliverySlot[]> => {
    const { data, error } = await supabase
      .from('delivery_slots')
      .select(`
        *,
        sector:sectors(*)
      `)
      .order('sector_id', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Create new delivery slot
  create: async (slot: Omit<DeliverySlot, 'id' | 'created_at' | 'updated_at' | 'sector' | 'available_orders'>): Promise<DeliverySlot> => {
    const { data, error } = await supabase
      .from('delivery_slots')
      .insert([slot])
      .select(`
        *,
        sector:sectors(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update delivery slot
  update: async (id: string, updates: Partial<DeliverySlot>): Promise<DeliverySlot> => {
    const { data, error } = await supabase
      .from('delivery_slots')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        sector:sectors(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete delivery slot
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('delivery_slots')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// === DELIVERY ASSIGNMENT MANAGEMENT === //

export const deliveryAssignmentAPI = {
  // Get assignments for a delivery partner
  getByPartner: async (deliveryPartnerId: string, date?: string): Promise<DeliveryAssignment[]> => {
    let query = supabase
      .from('delivery_assignments')
      .select(`
        *,
        delivery_slot:delivery_slots(*),
        sector:sectors(*)
      `)
      .eq('delivery_partner_id', deliveryPartnerId);

    if (date) {
      query = query.eq('assigned_date', date);
    }

    const { data, error } = await query.order('assigned_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get assignments for a specific date and sector
  getByDateAndSector: async (date: string, sectorId: string): Promise<DeliveryAssignment[]> => {
    const { data, error } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        delivery_slot:delivery_slots(*),
        sector:sectors(*)
      `)
      .eq('assigned_date', date)
      .eq('sector_id', sectorId);
    
    if (error) throw error;
    return data || [];
  },

  // Create delivery assignment
  create: async (assignment: Omit<DeliveryAssignment, 'id' | 'created_at'>): Promise<DeliveryAssignment> => {
    const { data, error } = await supabase
      .from('delivery_assignments')
      .insert([assignment])
      .select()
      .single();
    
    if (error) throw error;

    // backfill matching orders with this slot_id
    const { error: updateError } = await supabase
      .from('orders')
      .update({ slot_id: data.slot_id })
      .eq('delivery_date', data.assigned_date)
      .eq('sector_id', data.sector_id);
    if (updateError) console.error('Error backfilling slot_id on orders:', updateError);

    return data;
  },

  // Update assignment status
  updateStatus: async (id: string, status: DeliveryAssignment['status']): Promise<DeliveryAssignment> => {
    const { data, error } = await supabase
      .from('delivery_assignments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// === ORDER PICKUP MANAGEMENT === //

export const orderPickupAPI = {
  // Get pickups for a delivery partner
  getByDeliveryPartner: async (deliveryPartnerId: string, date?: string): Promise<OrderPickup[]> => {
    let query = supabase
      .from('order_pickups')
      .select(`
        *,
        order:orders(*),
        vendor:vendors(*)
      `)
      .eq('delivery_partner_id', deliveryPartnerId);

    if (date) {
      query = query.gte('created_at', `${date}T00:00:00`)
                  .lt('created_at', `${date}T23:59:59`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Update pickup status
  updateStatus: async (id: string, status: OrderPickup['pickup_status'], notes?: string): Promise<OrderPickup> => {
    const updates: any = { pickup_status: status };
    
    if (status === 'picked_up') {
      updates.pickup_time = new Date().toISOString();
    }
    
    if (notes) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from('order_pickups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create pickup record
  create: async (pickup: Omit<OrderPickup, 'id' | 'created_at' | 'updated_at'>): Promise<OrderPickup> => {
    const { data, error } = await supabase
      .from('order_pickups')
      .insert([pickup])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// === ORDER DELIVERY MANAGEMENT === //

export const orderDeliveryAPI = {
  // Get deliveries for a delivery partner
  getByDeliveryPartner: async (deliveryPartnerId: string, date?: string): Promise<OrderDelivery[]> => {
    let query = supabase
      .from('order_deliveries')
      .select(`
        *,
        order:orders(*)
      `)
      .eq('delivery_partner_id', deliveryPartnerId);

    if (date) {
      query = query.gte('created_at', `${date}T00:00:00`)
                  .lt('created_at', `${date}T23:59:59`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Update delivery status
  updateStatus: async (id: string, status: OrderDelivery['delivery_status'], notes?: string): Promise<OrderDelivery> => {
    const updates: any = { delivery_status: status };
    
    if (status === 'delivered') {
      updates.delivery_time = new Date().toISOString();
    }
    
    if (notes) {
      updates.delivery_notes = notes;
    }

    const { data, error } = await supabase
      .from('order_deliveries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create delivery record
  create: async (delivery: Omit<OrderDelivery, 'id' | 'created_at' | 'updated_at'>): Promise<OrderDelivery> => {
    const { data, error } = await supabase
      .from('order_deliveries')
      .insert([delivery])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// === UTILITY FUNCTIONS === //

export const deliveryUtils = {
  // Check if current time is past cutoff for a slot
  isPastCutoff: (cutoffTime: string): boolean => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime > cutoffTime;
  },

  // Calculate estimated delivery time
  calculateEstimatedDelivery: (slotStartTime: string, slotEndTime: string): string => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Create delivery window
    const startTime = new Date(`${today}T${slotStartTime}`);
    const endTime = new Date(`${today}T${slotEndTime}`);
    
    return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  },

  // Get sector by pincode
  getSectorByPincode: async (pincode: number): Promise<Sector | null> => {
    return await sectorAPI.getByPincode(pincode);
  }
}; 
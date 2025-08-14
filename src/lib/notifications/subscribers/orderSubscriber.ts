import { supabase } from '@/lib/supabase';
import NotificationService from '../NotificationService';
import CustomerNotificationTemplates, { CustomerNotificationData } from '../templates/customerTemplates';
import VendorNotificationTemplates, { VendorNotificationData } from '../templates/vendorTemplates';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  business_name?: string;
}

interface Vendor {
  id: string;
  business_name: string;
  profiles: Profile;
}

interface Customer {
  profiles: Profile;
}

interface OrderItem {
  id: string;
  product_name: string;
  vendor_id: string;
  line_total: number;
  vendors: Vendor;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  customer_id: string;
  customers: Customer;
  order_items: OrderItem[];
}

interface DeliveryPartner {
  profiles: {
    full_name: string;
  };
}

interface DeliveryPartnerOrder {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  status: string;
  orders: Order;
  delivery_partners: DeliveryPartner;
}

export interface OrderEventData {
  orderId: string;
  orderNumber: string;
  customerId: string;
  vendorId?: string;
  orderItemId?: string;
  oldStatus?: string;
  newStatus: string;
  eventType: 'order_placed' | 'order_confirmed' | 'order_rejected' | 'delivery_assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
}

export class OrderNotificationSubscriber {
  private static instance: OrderNotificationSubscriber;
  private notificationService: NotificationService;
  private subscriptions: any[] = [];

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): OrderNotificationSubscriber {
    if (!OrderNotificationSubscriber.instance) {
      OrderNotificationSubscriber.instance = new OrderNotificationSubscriber();
    }
    return OrderNotificationSubscriber.instance;
  }

  /**
   * Initialize order event subscriptions
   */
  async initialize(): Promise<void> {
    try {
      await this.notificationService.initialize();
      this.setupOrderSubscriptions();
      this.setupOrderItemSubscriptions();
      this.setupDeliverySubscriptions();
      
      console.log('✅ Order notification subscriber initialized');
    } catch (error) {
      console.error('❌ Error initializing order notification subscriber:', error);
    }
  }

  /**
   * Setup subscriptions for order table changes
   */
  private setupOrderSubscriptions(): void {
    const orderSubscription = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          await this.handleOrderEvent(payload);
        }
      )
      .subscribe();

    this.subscriptions.push(orderSubscription);
  }

  /**
   * Setup subscriptions for order_items table changes
   */
  private setupOrderItemSubscriptions(): void {
    const orderItemSubscription = supabase
      .channel('order-item-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          await this.handleOrderItemEvent(payload);
        }
      )
      .subscribe();

    this.subscriptions.push(orderItemSubscription);
  }

  /**
   * Setup subscriptions for delivery partner orders
   */
  private setupDeliverySubscriptions(): void {
    const deliverySubscription = supabase
      .channel('delivery-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_partner_orders'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          await this.handleDeliveryEvent(payload);
        }
      )
      .subscribe();

    this.subscriptions.push(deliverySubscription);
  }

  /**
   * Handle order table events
   */
  private async handleOrderEvent(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'INSERT') {
        // New order placed
        await this.triggerOrderPlacedNotifications(newRecord);
      } else if (eventType === 'UPDATE') {
        // Order status changed
        if (oldRecord?.order_status !== newRecord?.order_status) {
          await this.triggerOrderStatusNotifications(newRecord, oldRecord);
        }
      }
    } catch (error) {
      console.error('Error handling order event:', error);
    }
  }

  /**
   * Handle order item events
   */
  private async handleOrderItemEvent(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    try {
      const { new: newRecord, old: oldRecord } = payload;

      if (oldRecord?.item_status !== newRecord?.item_status) {
        await this.triggerOrderItemStatusNotifications(newRecord, oldRecord);
      }
    } catch (error) {
      console.error('Error handling order item event:', error);
    }
  }

  /**
   * Handle delivery partner order events
   */
  private async handleDeliveryEvent(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'INSERT') {
        // Delivery partner assigned
        await this.triggerDeliveryAssignedNotifications(newRecord);
      } else if (eventType === 'UPDATE') {
        // Delivery status changed
        if (oldRecord?.status !== newRecord?.status) {
          await this.triggerDeliveryStatusNotifications(newRecord, oldRecord);
        }
      }
    } catch (error) {
      console.error('Error handling delivery event:', error);
    }
  }

  /**
   * Trigger notifications when order is placed
   */
  private async triggerOrderPlacedNotifications(orderRecord: any): Promise<void> {
    try {
      // Get order details with customer info
      const { data: orderDetails, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          customer_id,
          customers (
            profiles (
              id,
              full_name,
              phone
            )
          ),
          order_items (
            id,
            product_name,
            vendor_id,
            vendors (
              id,
              business_name,
              profiles (
                id,
                full_name
              )
            )
          )
        `)
        .eq('id', orderRecord.id)
        .single();

      if (error || !orderDetails) {
        console.error('Error fetching order details:', error);
        return;
      }

      // Notify customer about order placement
      const customerNotificationData: CustomerNotificationData = {
        orderNumber: orderDetails.order_number,
        orderId: orderDetails.id,
        amount: orderDetails.total_amount
      };

      await this.sendNotificationToUser(
        orderDetails.customers?.profiles?.id,
        CustomerNotificationTemplates.orderPlaced(customerNotificationData)
      );

      // Notify vendors about new orders
      for (const item of orderDetails.order_items) {
        const vendorNotificationData: VendorNotificationData = {
          orderNumber: orderDetails.order_number,
          orderId: orderDetails.id,
          orderItemId: item.id,
          amount: orderDetails.total_amount,
          productName: item.product_name,
          timeLeft: '15 minutes'
        };

        await this.sendNotificationToUser(
          item.vendors?.profiles?.id,
          VendorNotificationTemplates.newOrder(vendorNotificationData)
        );

        // Schedule timeout warning (10 minutes)
        setTimeout(async () => {
          await this.checkAndSendTimeoutWarning(item.id, orderDetails.order_number);
        }, 10 * 60 * 1000); // 10 minutes
      }

    } catch (error) {
      console.error('Error triggering order placed notifications:', error);
    }
  }

  /**
   * Trigger notifications for order status changes
   */
  private async triggerOrderStatusNotifications(newRecord: any, oldRecord: any): Promise<void> {
    try {
      const { data: orderDetails } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          customer_id,
          customers (
            profiles (
              id,
              full_name
            )
          )
        `)
        .eq('id', newRecord.id)
        .single();

      if (!orderDetails) return;

      const customerNotificationData: CustomerNotificationData = {
        orderNumber: orderDetails.order_number,
        orderId: orderDetails.id,
        amount: orderDetails.total_amount
      };

      switch (newRecord.order_status) {
        case 'picked_up':
          await this.sendNotificationToUser(
            orderDetails.customers.profiles.id,
            CustomerNotificationTemplates.orderPickedUp({
              ...customerNotificationData,
              estimatedTime: '30-45 minutes'
            })
          );
          break;

        case 'out_for_delivery':
          await this.sendNotificationToUser(
            orderDetails.customers.profiles.id,
            CustomerNotificationTemplates.outForDelivery({
              ...customerNotificationData,
              estimatedTime: '15-30 minutes'
            })
          );
          break;

        case 'delivered':
          await this.sendNotificationToUser(
            orderDetails.customers.profiles.id,
            CustomerNotificationTemplates.orderDelivered(customerNotificationData)
          );
          break;

        case 'cancelled':
          await this.sendNotificationToUser(
            orderDetails.customers.profiles.id,
            CustomerNotificationTemplates.orderCancelled(customerNotificationData)
          );
          break;
      }
    } catch (error) {
      console.error('Error triggering order status notifications:', error);
    }
  }

  /**
   * Trigger notifications for order item status changes
   */
  private async triggerOrderItemStatusNotifications(newRecord: any, oldRecord: any): Promise<void> {
    try {
      const { data: itemDetails } = await supabase
        .from('order_items')
        .select(`
          id,
          product_name,
          vendor_id,
          order_id,
          orders (
            order_number,
            total_amount,
            customer_id,
            customers (
              profiles (
                id,
                full_name
              )
            )
          ),
          vendors (
            profiles (
              id,
              full_name,
              business_name
            )
          )
        `)
        .eq('id', newRecord.id)
        .single();

      if (!itemDetails) return;

      const customerNotificationData: CustomerNotificationData = {
        orderNumber: itemDetails.orders.order_number,
        orderId: itemDetails.order_id,
        amount: itemDetails.orders.total_amount,
        vendorName: itemDetails.vendors.profiles.business_name,
        productName: itemDetails.product_name
      };

      const vendorNotificationData: VendorNotificationData = {
        orderNumber: itemDetails.orders.order_number,
        orderId: itemDetails.order_id,
        orderItemId: itemDetails.id,
        amount: itemDetails.orders.total_amount,
        productName: itemDetails.product_name
      };

      switch (newRecord.item_status) {
        case 'confirmed':
          // Notify customer about vendor confirmation
          await this.sendNotificationToUser(
            itemDetails.orders.customers.profiles.id,
            CustomerNotificationTemplates.vendorConfirmed(customerNotificationData)
          );
          break;

        case 'cancelled':
          // Notify customer about vendor rejection
          await this.sendNotificationToUser(
            itemDetails.orders.customers.profiles.id,
            CustomerNotificationTemplates.vendorRejected(customerNotificationData)
          );

          // Notify vendor about auto-rejection
          await this.sendNotificationToUser(
            itemDetails.vendors.profiles.id,
            VendorNotificationTemplates.orderAutoRejected(vendorNotificationData)
          );
          break;
      }
    } catch (error) {
      console.error('Error triggering order item status notifications:', error);
    }
  }

  /**
   * Trigger notifications for delivery assignment
   */
  private async triggerDeliveryAssignedNotifications(deliveryRecord: any): Promise<void> {
    try {
      const { data: deliveryDetails } = await supabase
        .from('delivery_partner_orders')
        .select(`
          order_id,
          delivery_partner_id,
          orders (
            order_number,
            total_amount,
            customer_id,
            customers (
              profiles (
                id,
                full_name
              )
            ),
            order_items (
              id,
              product_name,
              vendor_id,
              vendors (
                profiles (
                  id,
                  business_name
                )
              )
            )
          ),
          delivery_partners (
            profiles (
              full_name
            )
          )
        `)
        .eq('id', deliveryRecord.id)
        .single();

      if (!deliveryDetails) return;

      const partnerName = deliveryDetails.delivery_partners.profiles.full_name;

      // Notify customer about delivery assignment
      const customerNotificationData: CustomerNotificationData = {
        orderNumber: deliveryDetails.orders.order_number,
        orderId: deliveryDetails.order_id,
        amount: deliveryDetails.orders.total_amount,
        partnerName,
        estimatedTime: '2-3 hours'
      };

      await this.sendNotificationToUser(
        deliveryDetails.orders.customers.profiles.id,
        CustomerNotificationTemplates.deliveryAssigned(customerNotificationData)
      );

      // Notify vendors about delivery assignment
      for (const item of deliveryDetails.orders.order_items) {
        const vendorNotificationData: VendorNotificationData = {
          orderNumber: deliveryDetails.orders.order_number,
          orderId: deliveryDetails.order_id,
          orderItemId: item.id,
          amount: deliveryDetails.orders.total_amount,
          productName: item.product_name,
          partnerName
        };

        await this.sendNotificationToUser(
          item.vendors.profiles.id,
          VendorNotificationTemplates.deliveryPartnerAssigned(vendorNotificationData)
        );
      }
    } catch (error) {
      console.error('Error triggering delivery assigned notifications:', error);
    }
  }

  /**
   * Trigger notifications for delivery status changes
   */
  private async triggerDeliveryStatusNotifications(newRecord: any, oldRecord: any): Promise<void> {
    try {
      // Handle pickup notifications, delivery notifications etc.
      if (newRecord.status === 'picked_up' && oldRecord.status !== 'picked_up') {
        await this.triggerPickupNotifications(newRecord);
      }
    } catch (error) {
      console.error('Error triggering delivery status notifications:', error);
    }
  }

  /**
   * Trigger pickup notifications
   */
  private async triggerPickupNotifications(deliveryRecord: any): Promise<void> {
    try {
      const { data: deliveryDetails } = await supabase
        .from('delivery_partner_orders')
        .select(`
          order_id,
          orders (
            order_number,
            order_items (
              id,
              product_name,
              line_total,
              vendor_id,
              vendors (
                profiles (
                  id,
                  business_name
                )
              )
            )
          ),
          delivery_partners (
            profiles (
              full_name
            )
          )
        `)
        .eq('id', deliveryRecord.id)
        .single();

      if (!deliveryDetails) return;

      const partnerName = deliveryDetails.delivery_partners.profiles.full_name;

      // Notify vendors about pickup
      for (const item of deliveryDetails.orders.order_items) {
        const vendorNotificationData: VendorNotificationData = {
          orderNumber: deliveryDetails.orders.order_number,
          orderId: deliveryDetails.order_id,
          orderItemId: item.id,
          amount: item.line_total,
          productName: item.product_name,
          partnerName,
          earnings: item.line_total * 0.9 // Assuming 10% commission
        };

        await this.sendNotificationToUser(
          item.vendors.profiles.id,
          VendorNotificationTemplates.orderPickedUp(vendorNotificationData)
        );
      }
    } catch (error) {
      console.error('Error triggering pickup notifications:', error);
    }
  }

  /**
   * Check and send timeout warning for pending orders
   */
  private async checkAndSendTimeoutWarning(orderItemId: string, orderNumber: string): Promise<void> {
    try {
      const { data: item } = await supabase
        .from('order_items')
        .select(`
          id,
          item_status,
          product_name,
          vendor_id,
          vendors (
            profiles (
              id
            )
          )
        `)
        .eq('id', orderItemId)
        .single();

      if (!item || item.item_status !== 'pending') return;

      const vendorNotificationData: VendorNotificationData = {
        orderNumber,
        orderId: orderItemId,
        orderItemId,
        amount: 0,
        productName: item.product_name,
        timeLeft: '5 minutes'
      };

      await this.sendNotificationToUser(
        item.vendors.profiles.id,
        VendorNotificationTemplates.urgentOrderTimeout(vendorNotificationData)
      );
    } catch (error) {
      console.error('Error sending timeout warning:', error);
    }
  }

  /**
   * Send notification to a specific user
   */
  private async sendNotificationToUser(profileId: string, notification: any): Promise<void> {
    try {
      // Check if user has notification preferences enabled
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('push_notifications')
        .eq('profile_id', profileId)
        .single();

      if (preferences?.push_notifications === false) {
        return; // User has disabled push notifications
      }

      // Send the notification
      await this.notificationService.showLocalNotification(notification);
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }
}

export default OrderNotificationSubscriber; 
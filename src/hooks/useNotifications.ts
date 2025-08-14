import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/lib/notifications/NotificationService';
import CustomerNotificationTemplates, { CustomerNotificationData } from '@/lib/notifications/templates/customerTemplates';
import VendorNotificationTemplates, { VendorNotificationData } from '@/lib/notifications/templates/vendorTemplates';
import { supabase } from '@/lib/supabase';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isInitialized: boolean;
}

interface NotificationHook {
  notificationState: NotificationState;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (payload: any) => Promise<void>;
  initializeNotifications: () => Promise<void>;
  sendCustomerNotification: (type: string, data: CustomerNotificationData) => Promise<void>;
  sendVendorNotification: (type: string, data: VendorNotificationData) => Promise<void>;
}

export const useNotifications = (): NotificationHook => {
  const { profile } = useAuth();
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isInitialized: false
  });

  const notificationService = NotificationService.getInstance();

  // Initialize notification service
  const initializeNotifications = useCallback(async () => {
    try {
      const initialized = await notificationService.initialize();
      
      setNotificationState({
        isSupported: notificationService.isSupported(),
        permission: notificationService.getPermissionStatus(),
        isInitialized: initialized
      });

      if (initialized) {
        notificationService.setupNotificationClickHandler();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }, [notificationService]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const permission = await notificationService.requestPermission();
      
      setNotificationState(prev => ({
        ...prev,
        permission
      }));

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [notificationService]);

  // Show notification
  const showNotification = useCallback(async (payload: any): Promise<void> => {
    try {
      if (notificationState.permission === 'granted') {
        await notificationService.showLocalNotification(payload);
      } else {
        console.warn('Notification permission not granted');
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [notificationService, notificationState.permission]);

  // Send customer notification
  const sendCustomerNotification = useCallback(async (
    type: string, 
    data: CustomerNotificationData
  ): Promise<void> => {
    try {
      if (profile?.role !== 'customer') return;

      let notification;
      
      switch (type) {
        case 'order_placed':
          notification = CustomerNotificationTemplates.orderPlaced(data);
          break;
        case 'vendor_confirmed':
          notification = CustomerNotificationTemplates.vendorConfirmed(data);
          break;
        case 'vendor_rejected':
          notification = CustomerNotificationTemplates.vendorRejected(data);
          break;
        case 'delivery_assigned':
          notification = CustomerNotificationTemplates.deliveryAssigned(data);
          break;
        case 'order_picked_up':
          notification = CustomerNotificationTemplates.orderPickedUp(data);
          break;
        case 'out_for_delivery':
          notification = CustomerNotificationTemplates.outForDelivery(data);
          break;
        case 'order_delivered':
          notification = CustomerNotificationTemplates.orderDelivered(data);
          break;
        case 'order_cancelled':
          notification = CustomerNotificationTemplates.orderCancelled(data);
          break;
        case 'timeout_warning':
          notification = CustomerNotificationTemplates.vendorTimeoutWarning(data);
          break;
        default:
          console.warn('Unknown customer notification type:', type);
          return;
      }

      await showNotification(notification);
    } catch (error) {
      console.error('Error sending customer notification:', error);
    }
  }, [profile?.role, showNotification]);

  // Send vendor notification
  const sendVendorNotification = useCallback(async (
    type: string, 
    data: VendorNotificationData
  ): Promise<void> => {
    try {
      if (profile?.role !== 'vendor') return;

      let notification;
      
      switch (type) {
        case 'new_order':
          notification = VendorNotificationTemplates.newOrder(data);
          break;
        case 'urgent_timeout':
          notification = VendorNotificationTemplates.urgentOrderTimeout(data);
          break;
        case 'delivery_assigned':
          notification = VendorNotificationTemplates.deliveryPartnerAssigned(data);
          break;
        case 'order_picked_up':
          notification = VendorNotificationTemplates.orderPickedUp(data);
          break;
        case 'order_delivered':
          notification = VendorNotificationTemplates.orderDelivered(data);
          break;
        case 'auto_rejected':
          notification = VendorNotificationTemplates.orderAutoRejected(data);
          break;
        case 'pickup_reminder':
          notification = VendorNotificationTemplates.pickupReminder(data);
          break;
        default:
          console.warn('Unknown vendor notification type:', type);
          return;
      }

      await showNotification(notification);
    } catch (error) {
      console.error('Error sending vendor notification:', error);
    }
  }, [profile?.role, showNotification]);

  // Initialize on mount
  useEffect(() => {
    initializeNotifications();
  }, [initializeNotifications]);

  return {
    notificationState,
    requestPermission,
    showNotification,
    initializeNotifications,
    sendCustomerNotification,
    sendVendorNotification
  };
};

// Helper hook for setting up order-specific notification listeners
export const useOrderNotifications = () => {
  const { profile } = useAuth();
  const { sendCustomerNotification, sendVendorNotification } = useNotifications();

  useEffect(() => {
    if (!profile) return;

    let subscriptions: any[] = [];

    // Customer notifications
    if (profile.role === 'customer') {
      // Listen for order updates
      const orderSubscription = supabase
        .channel(`customer-orders-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customers.profile_id=eq.${profile.id}`
          },
          async (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            if (eventType === 'INSERT') {
              // Order placed
              await sendCustomerNotification('order_placed', {
                orderNumber: newRecord.order_number,
                orderId: newRecord.id,
                amount: newRecord.total_amount
              });
            } else if (eventType === 'UPDATE' && oldRecord?.order_status !== newRecord?.order_status) {
              // Order status changed
              const data = {
                orderNumber: newRecord.order_number,
                orderId: newRecord.id,
                amount: newRecord.total_amount,
                estimatedTime: '30-45 minutes'
              };

              switch (newRecord.order_status) {
                case 'picked_up':
                  await sendCustomerNotification('order_picked_up', data);
                  break;
                case 'out_for_delivery':
                  await sendCustomerNotification('out_for_delivery', {
                    ...data,
                    estimatedTime: '15-30 minutes'
                  });
                  break;
                case 'delivered':
                  await sendCustomerNotification('order_delivered', data);
                  break;
                case 'cancelled':
                  await sendCustomerNotification('order_cancelled', data);
                  break;
              }
            }
          }
        )
        .subscribe();

      subscriptions.push(orderSubscription);
    }

    // Vendor notifications
    if (profile.role === 'vendor') {
      // Listen for new order items
      const orderItemSubscription = supabase
        .channel(`vendor-orders-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_items',
            filter: `vendors.profile_id=eq.${profile.id}`
          },
          async (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            if (eventType === 'INSERT') {
              // New order item for vendor
              const { data: orderData } = await supabase
                .from('orders')
                .select('order_number, total_amount')
                .eq('id', newRecord.order_id)
                .single();

              if (orderData) {
                await sendVendorNotification('new_order', {
                  orderNumber: orderData.order_number,
                  orderId: newRecord.order_id,
                  orderItemId: newRecord.id,
                  amount: orderData.total_amount,
                  productName: newRecord.product_name,
                  timeLeft: '15 minutes'
                });

                // Schedule timeout warning (10 minutes)
                setTimeout(async () => {
                  // Check if still pending
                  const { data: currentItem } = await supabase
                    .from('order_items')
                    .select('item_status')
                    .eq('id', newRecord.id)
                    .single();

                  if (currentItem?.item_status === 'pending') {
                    await sendVendorNotification('urgent_timeout', {
                      orderNumber: orderData.order_number,
                      orderId: newRecord.order_id,
                      orderItemId: newRecord.id,
                      amount: orderData.total_amount,
                      productName: newRecord.product_name,
                      timeLeft: '5 minutes'
                    });
                  }
                }, 10 * 60 * 1000); // 10 minutes
              }
            }
          }
        )
        .subscribe();

      subscriptions.push(orderItemSubscription);
    }

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [profile, sendCustomerNotification, sendVendorNotification]);
};

export default useNotifications; 
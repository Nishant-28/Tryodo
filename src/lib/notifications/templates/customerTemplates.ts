import { NotificationPayload } from '../NotificationService';

export interface CustomerNotificationData {
  orderNumber: string;
  orderId: string;
  amount: number;
  vendorName?: string;
  partnerName?: string;
  productName?: string;
  estimatedTime?: string;
  timeLeft?: string;
  customerName?: string;
  address?: string;
}

export class CustomerNotificationTemplates {
  
  /**
   * Order placed successfully
   */
  static orderPlaced(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Placed Successfully! 🎉",
      body: `Order #${data.orderNumber} for ₹${data.amount} has been placed. Waiting for vendor confirmation.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-placed-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        type: 'order_placed'
      },
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'track', title: 'Track Order' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Vendor confirmation timeout warning (10 minutes left)
   */
  static vendorTimeoutWarning(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "⏰ Order Confirmation Pending",
      body: `Order #${data.orderNumber} is awaiting vendor confirmation. ${data.timeLeft} remaining.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-timeout-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        type: 'timeout_warning'
      },
      actions: [
        { action: 'view', title: 'View Order' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Vendor confirmed the order
   */
  static vendorConfirmed(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Confirmed! ✅",
      body: `${data.vendorName} confirmed your order #${data.orderNumber}. Preparing for delivery.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-confirmed-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        vendorName: data.vendorName,
        type: 'order_confirmed'
      },
      actions: [
        { action: 'track', title: 'Track Order' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Vendor rejected the order
   */
  static vendorRejected(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Update ⚠️",
      body: `${data.vendorName} is unable to fulfill order #${data.orderNumber}. We're finding alternative vendors.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-rejected-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        vendorName: data.vendorName,
        type: 'order_rejected'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'explore', title: 'Browse Similar' }
      ],
      requireInteraction: true
    };
  }

  /**
   * Delivery partner assigned
   */
  static deliveryAssigned(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Delivery Partner Assigned 🚚",
      body: `${data.partnerName} will deliver your order #${data.orderNumber}. Expected pickup in ${data.estimatedTime}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `delivery-assigned-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        partnerName: data.partnerName,
        type: 'delivery_assigned'
      },
      actions: [
        { action: 'track', title: 'Track Live' },
        { action: 'contact', title: 'Contact Partner' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order picked up by delivery partner
   */
  static orderPickedUp(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Picked Up! 📦",
      body: `Your order #${data.orderNumber} is now with our delivery partner. Arriving in ${data.estimatedTime}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-picked-up-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        estimatedTime: data.estimatedTime,
        type: 'order_picked_up'
      },
      actions: [
        { action: 'track', title: 'Track Live' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order out for delivery
   */
  static outForDelivery(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Out for Delivery! 🚛",
      body: `Your order #${data.orderNumber} is on the way! Expected delivery in ${data.estimatedTime}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `out-for-delivery-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        estimatedTime: data.estimatedTime,
        type: 'out_for_delivery'
      },
      actions: [
        { action: 'track', title: 'Track Live' },
        { action: 'prepare', title: 'Prepare for Delivery' }
      ],
      requireInteraction: true
    };
  }

  /**
   * Order delivered successfully
   */
  static orderDelivered(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Delivered Successfully! ✅",
      body: `Order #${data.orderNumber} has been delivered. Thank you for choosing Tryodo!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-delivered-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        type: 'order_delivered'
      },
      actions: [
        { action: 'rate', title: 'Rate Experience' },
        { action: 'reorder', title: 'Reorder' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order cancelled
   */
  static orderCancelled(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Cancelled ❌",
      body: `Order #${data.orderNumber} has been cancelled. Refund will be processed within 3-5 business days.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-cancelled-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        type: 'order_cancelled'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'support', title: 'Contact Support' }
      ],
      requireInteraction: true
    };
  }

  /**
   * Delivery delay notification
   */
  static deliveryDelay(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Delivery Update 📋",
      body: `Order #${data.orderNumber} delivery has been delayed. New estimated time: ${data.estimatedTime}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `delivery-delay-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        estimatedTime: data.estimatedTime,
        type: 'delivery_delay'
      },
      actions: [
        { action: 'track', title: 'Track Order' },
        { action: 'support', title: 'Contact Support' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Payment reminder (for COD orders)
   */
  static paymentReminder(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Payment Reminder 💰",
      body: `Order #${data.orderNumber} will be delivered soon. Please keep ₹${data.amount} ready for COD payment.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `payment-reminder-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        type: 'payment_reminder'
      },
      actions: [
        { action: 'track', title: 'Track Order' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order timeout - auto cancelled
   */
  static orderTimeout(data: CustomerNotificationData): NotificationPayload {
    return {
      title: "Order Timeout ⏰",
      body: `Order #${data.orderNumber} was cancelled due to no vendor confirmation. Refund will be processed.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `order-timeout-${data.orderId}`,
      data: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        type: 'order_timeout'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'reorder', title: 'Place New Order' }
      ],
      requireInteraction: true
    };
  }
}

export default CustomerNotificationTemplates; 
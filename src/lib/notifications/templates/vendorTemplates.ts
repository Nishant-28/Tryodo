import { NotificationPayload } from '../NotificationService';

export interface VendorNotificationData {
  orderNumber: string;
  orderId: string;
  orderItemId: string;
  amount: number;
  productName: string;
  customerName?: string;
  partnerName?: string;
  timeLeft?: string;
  address?: string;
  phone?: string;
  earnings?: number;
  quantity?: number;
}

export class VendorNotificationTemplates {
  
  /**
   * New order received
   */
  static newOrder(data: VendorNotificationData): NotificationPayload {
    return {
      title: "New Order Received! 💰",
      body: `Order #${data.orderNumber} for ${data.productName} (₹${data.amount}). ${data.timeLeft} to confirm.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `new-order-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        productName: data.productName,
        amount: data.amount,
        type: 'new_order'
      },
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'reject', title: 'Reject' },
        { action: 'view', title: 'View Details' }
      ],
      requireInteraction: true
    };
  }

  /**
   * Urgent order timeout warning (5 minutes left)
   */
  static urgentOrderTimeout(data: VendorNotificationData): NotificationPayload {
    return {
      title: "⏰ Order Confirmation Urgent!",
      body: `Order #${data.orderNumber} expires in ${data.timeLeft}. Please confirm or it will be auto-rejected.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `urgent-order-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        type: 'urgent_timeout'
      },
      actions: [
        { action: 'accept', title: 'Accept Now' },
        { action: 'view', title: 'View Order' }
      ],
      requireInteraction: true
    };
  }

  /**
   * Order auto-rejected due to timeout
   */
  static orderAutoRejected(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Order Auto-Rejected ⏰",
      body: `Order #${data.orderNumber} for ${data.productName} was auto-rejected due to timeout.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `auto-rejected-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        productName: data.productName,
        type: 'auto_rejected'
      },
      actions: [
        { action: 'view', title: 'View Details' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Delivery partner assigned
   */
  static deliveryPartnerAssigned(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Delivery Partner Assigned 🚚",
      body: `${data.partnerName} assigned for order #${data.orderNumber}. Prepare ${data.productName} for pickup.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `delivery-assigned-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        partnerName: data.partnerName,
        productName: data.productName,
        type: 'delivery_assigned'
      },
      actions: [
        { action: 'prepare', title: 'Prepare Order' },
        { action: 'contact', title: 'Contact Partner' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Pickup reminder
   */
  static pickupReminder(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Pickup Reminder 📦",
      body: `Delivery partner arriving soon for order #${data.orderNumber}. Please keep ${data.productName} ready.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `pickup-reminder-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        productName: data.productName,
        type: 'pickup_reminder'
      },
      actions: [
        { action: 'ready', title: 'Mark Ready' },
        { action: 'contact', title: 'Contact Partner' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order picked up successfully
   */
  static orderPickedUp(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Order Picked Up ✅",
      body: `Order #${data.orderNumber} picked up by ${data.partnerName}. Earnings: ₹${data.earnings}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `picked-up-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        partnerName: data.partnerName,
        earnings: data.earnings,
        type: 'order_picked_up'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'track', title: 'Track Delivery' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order delivered successfully
   */
  static orderDelivered(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Order Delivered! 🎉",
      body: `Order #${data.orderNumber} delivered to ${data.customerName}. Payment confirmed: ₹${data.earnings}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `delivered-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        earnings: data.earnings,
        type: 'order_delivered'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'wallet', title: 'View Earnings' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order cancelled by customer
   */
  static orderCancelledByCustomer(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Order Cancelled ❌",
      body: `Customer cancelled order #${data.orderNumber} for ${data.productName}. Update your inventory.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `cancelled-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        productName: data.productName,
        type: 'order_cancelled'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'inventory', title: 'Update Inventory' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Order cancelled by delivery partner
   */
  static orderCancelledByDelivery(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Delivery Cancelled 🚚❌",
      body: `Delivery partner cancelled order #${data.orderNumber}. We'll reassign a new partner.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `delivery-cancelled-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        type: 'delivery_cancelled'
      },
      actions: [
        { action: 'view', title: 'View Details' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Low stock alert
   */
  static lowStockAlert(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Low Stock Alert ⚠️",
      body: `${data.productName} is running low. Only ${data.quantity} items left in stock.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `low-stock-${data.productName}`,
      data: {
        productName: data.productName,
        quantity: data.quantity,
        type: 'low_stock'
      },
      actions: [
        { action: 'restock', title: 'Add Stock' },
        { action: 'disable', title: 'Disable Product' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Daily earnings summary
   */
  static dailyEarningsSummary(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Daily Earnings Summary 💰",
      body: `Today's earnings: ₹${data.earnings} from ${data.quantity} orders. Keep up the great work!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'daily-earnings',
      data: {
        earnings: data.earnings,
        quantity: data.quantity,
        type: 'daily_earnings'
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'analytics', title: 'View Analytics' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Payment received notification
   */
  static paymentReceived(data: VendorNotificationData): NotificationPayload {
    return {
      title: "Payment Received! 💸",
      body: `Payment of ₹${data.amount} received for order #${data.orderNumber}. Check your wallet.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `payment-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        type: 'payment_received'
      },
      actions: [
        { action: 'wallet', title: 'View Wallet' },
        { action: 'withdraw', title: 'Withdraw Funds' }
      ],
      requireInteraction: false
    };
  }

  /**
   * Customer review received
   */
  static customerReview(data: VendorNotificationData): NotificationPayload {
    return {
      title: "New Review Received ⭐",
      body: `${data.customerName} left a review for order #${data.orderNumber}. Check your rating!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `review-${data.orderItemId}`,
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        type: 'customer_review'
      },
      actions: [
        { action: 'view', title: 'View Review' },
        { action: 'respond', title: 'Respond' }
      ],
      requireInteraction: false
    };
  }
}

export default VendorNotificationTemplates; 
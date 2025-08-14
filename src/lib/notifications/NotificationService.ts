export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Notifications or Service Workers not supported');
        return false;
      }

      // Register service worker if not already registered
      if (!this.swRegistration) {
        this.swRegistration = await navigator.serviceWorker.ready;
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Get current push subscription
   */
  async getPushSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.swRegistration) {
        await this.initialize();
      }

      return await this.swRegistration?.pushManager.getSubscription() || null;
    } catch (error) {
      console.error('Error getting push subscription:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      if (!this.swRegistration) {
        await this.initialize();
      }

      // Check if already subscribed
      let subscription = await this.getPushSubscription();
      
      if (!subscription) {
        subscription = await this.swRegistration?.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        }) || null;
      }

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  /**
   * Show local notification (when app is open)
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      const permission = Notification.permission;
      
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // If service worker is available, use it for better notification management
      if (this.swRegistration) {
        await this.swRegistration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-96x96.png',
          tag: payload.tag,
          data: payload.data,
          actions: payload.actions,
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
          timestamp: Date.now()
        });
      } else {
        // Fallback to basic Notification API
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          tag: payload.tag,
          data: payload.data,
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false
        });
      }
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Schedule a delayed notification
   */
  async scheduleNotification(payload: NotificationPayload, delayMs: number): Promise<void> {
    setTimeout(() => {
      this.showLocalNotification(payload);
    }, delayMs);
  }

  /**
   * Clear notifications by tag
   */
  async clearNotifications(tag?: string): Promise<void> {
    try {
      if (!this.swRegistration) return;

      const notifications = await this.swRegistration.getNotifications(tag ? { tag } : {});
      notifications.forEach(notification => notification.close());
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Handle notification click events
   */
  setupNotificationClickHandler(): void {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { action, data } = event.data;
        this.handleNotificationAction(action, data);
      }
    });
  }

  /**
   * Handle notification actions
   */
  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'view':
        if (data.orderId) {
          window.location.href = `/order-success?orderId=${data.orderId}`;
        }
        break;
      case 'track':
        if (data.orderId) {
          window.location.href = `/my-orders`;
        }
        break;
      case 'accept':
        // Handle order acceptance
        this.handleOrderAction(data.orderItemId, 'accept');
        break;
      case 'reject':
        // Handle order rejection
        this.handleOrderAction(data.orderItemId, 'reject');
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  }

  /**
   * Handle order actions from notifications
   */
  private async handleOrderAction(orderItemId: string, action: 'accept' | 'reject'): Promise<void> {
    try {
      // This would integrate with your existing order API
      const response = await fetch('/api/orders/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId, action })
      });

      if (response.ok) {
        const message = action === 'accept' ? 'Order accepted!' : 'Order rejected!';
        this.showLocalNotification({
          title: 'Action Completed',
          body: message,
          tag: 'order-action'
        });
      }
    } catch (error) {
      console.error('Error handling order action:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Check if user has granted notification permission
   */
  hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export default NotificationService; 
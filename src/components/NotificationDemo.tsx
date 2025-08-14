import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Smartphone, User, Package, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const NotificationDemo: React.FC = () => {
  const { profile } = useAuth();
  const { notificationState, sendCustomerNotification, sendVendorNotification } = useNotifications();

  const testCustomerNotifications = async () => {
    if (profile?.role !== 'customer') {
      toast.warning('Please log in as a customer to test customer notifications');
      return;
    }

    const sampleOrderData = {
      orderNumber: 'TRY123456789',
      orderId: 'demo-order-id',
      amount: 2499,
      vendorName: 'TechStore Mumbai',
      partnerName: 'Rajesh Kumar',
      productName: 'iPhone 14 Pro',
      estimatedTime: '30-45 minutes'
    };

    try {
      // Test order placed notification
      await sendCustomerNotification('order_placed', sampleOrderData);
      
      // Test vendor confirmed notification (after 2 seconds)
      setTimeout(() => {
        sendCustomerNotification('vendor_confirmed', sampleOrderData);
      }, 2000);
      
      // Test delivery assigned notification (after 4 seconds)
      setTimeout(() => {
        sendCustomerNotification('delivery_assigned', sampleOrderData);
      }, 4000);
      
      // Test order picked up notification (after 6 seconds)
      setTimeout(() => {
        sendCustomerNotification('order_picked_up', sampleOrderData);
      }, 6000);
      
      // Test out for delivery notification (after 8 seconds)
      setTimeout(() => {
        sendCustomerNotification('out_for_delivery', {
          ...sampleOrderData,
          estimatedTime: '15-30 minutes'
        });
      }, 8000);
      
      // Test delivered notification (after 10 seconds)
      setTimeout(() => {
        sendCustomerNotification('order_delivered', sampleOrderData);
      }, 10000);

      toast.success('Customer notification demo started! Check your notifications.');
    } catch (error) {
      console.error('Error testing customer notifications:', error);
      toast.error('Failed to send test notifications');
    }
  };

  const testVendorNotifications = async () => {
    if (profile?.role !== 'vendor') {
      toast.warning('Please log in as a vendor to test vendor notifications');
      return;
    }

    const sampleOrderData = {
      orderNumber: 'TRY123456789',
      orderId: 'demo-order-id',
      orderItemId: 'demo-item-id',
      amount: 2499,
      productName: 'iPhone 14 Pro',
      customerName: 'Amit Sharma',
      partnerName: 'Rajesh Kumar',
      earnings: 2249,
      timeLeft: '15 minutes'
    };

    try {
      // Test new order notification
      await sendVendorNotification('new_order', sampleOrderData);
      
      // Test urgent timeout notification (after 3 seconds)
      setTimeout(() => {
        sendVendorNotification('urgent_timeout', {
          ...sampleOrderData,
          timeLeft: '5 minutes'
        });
      }, 3000);
      
      // Test delivery assigned notification (after 6 seconds)
      setTimeout(() => {
        sendVendorNotification('delivery_assigned', sampleOrderData);
      }, 6000);
      
      // Test order picked up notification (after 9 seconds)
      setTimeout(() => {
        sendVendorNotification('order_picked_up', sampleOrderData);
      }, 9000);
      
      // Test order delivered notification (after 12 seconds)
      setTimeout(() => {
        sendVendorNotification('order_delivered', sampleOrderData);
      }, 12000);

      toast.success('Vendor notification demo started! Check your notifications.');
    } catch (error) {
      console.error('Error testing vendor notifications:', error);
      toast.error('Failed to send test notifications');
    }
  };

  const getPermissionStatusColor = () => {
    switch (notificationState.permission) {
      case 'granted':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification System Demo
        </CardTitle>
        <CardDescription>
          Test the notification system with sample order journey notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">Browser Support:</span>
            <Badge variant={notificationState.isSupported ? 'default' : 'destructive'}>
              {notificationState.isSupported ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="text-sm">Permission:</span>
            <Badge className={getPermissionStatusColor()}>
              {notificationState.permission}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm">Role:</span>
            <Badge variant="outline">
              {profile?.role || 'Not logged in'}
            </Badge>
          </div>
        </div>

        {/* Demo Buttons */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Customer Journey Demo
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Experience the complete customer order journey with notifications for order placement, 
              vendor confirmation, delivery assignment, pickup, and delivery.
            </p>
            <Button 
              onClick={testCustomerNotifications}
              disabled={!notificationState.isSupported || notificationState.permission !== 'granted'}
              className="w-full"
            >
              Test Customer Notifications
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vendor Journey Demo
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              See vendor notifications for new orders, timeout warnings, delivery assignments, 
              pickups, and successful deliveries.
            </p>
            <Button 
              onClick={testVendorNotifications}
              disabled={!notificationState.isSupported || notificationState.permission !== 'granted'}
              variant="outline"
              className="w-full"
            >
              Test Vendor Notifications
            </Button>
          </div>
        </div>

        {/* Instructions */}
        {notificationState.permission !== 'granted' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Setup Required</h4>
            <p className="text-sm text-yellow-700">
              Please enable notifications in your browser settings or use the notification 
              settings page to grant permission before testing the demo.
            </p>
          </div>
        )}

        {!notificationState.isSupported && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Not Supported</h4>
            <p className="text-sm text-red-700">
              Your browser doesn't support notifications. Please use a modern browser 
              like Chrome, Firefox, Safari, or Edge.
            </p>
          </div>
        )}

        {/* Notification Timeline */}
        <div className="space-y-2">
          <h4 className="font-semibold">Demo Timeline</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>0s: Order placed notification</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>2s: Vendor confirmed notification</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-3 w-3" />
              <span>4s: Delivery assigned notification</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              <span>6s: Order picked up notification</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-3 w-3" />
              <span>8s: Out for delivery notification</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>10s: Order delivered notification</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationDemo; 
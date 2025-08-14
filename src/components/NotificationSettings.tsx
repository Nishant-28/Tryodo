import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, Settings, Smartphone, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPreferences {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  order_confirmations: boolean;
  order_status_updates: boolean;
  delivery_updates: boolean;
  cancellation_alerts: boolean;
  promotional_emails: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPreferences: NotificationPreferences = {
  push_notifications: true,
  email_notifications: true,
  sms_notifications: false,
  order_confirmations: true,
  order_status_updates: true,
  delivery_updates: true,
  cancellation_alerts: true,
  promotional_emails: false,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00'
};

const NotificationSettings: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { notificationState, requestPermission } = useNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences({
        ...defaultPreferences,
        ...profile.notification_preferences
      });
    }
  }, [profile]);

  // Handle preference changes
  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Save preferences
  const savePreferences = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await updateProfile({
        notification_preferences: preferences
      });

      if (result.success) {
        toast.success('Notification preferences saved successfully!');
      } else {
        toast.error('Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('An error occurred while saving preferences.');
    } finally {
      setLoading(false);
    }
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    try {
      const permission = await requestPermission();
      
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        // Enable push notifications automatically
        handlePreferenceChange('push_notifications', true);
      } else {
        toast.error('Notification permission denied. Please enable in browser settings.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission.');
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      if (notificationState.permission !== 'granted') {
        toast.warning('Please grant notification permission first.');
        return;
      }

      if (notificationState.isInitialized) {
        const testPayload = {
          title: "Test Notification 🔔",
          body: "This is a test notification from Tryodo. Notifications are working!",
          icon: '/icons/icon-192x192.png',
          tag: 'test-notification'
        };

        // We'll use the notification service directly here
        const NotificationService = (await import('@/lib/notifications/NotificationService')).default;
        const service = NotificationService.getInstance();
        await service.showLocalNotification(testPayload);
        
        setTestNotificationSent(true);
        toast.success('Test notification sent!');
        
        // Reset the flag after 3 seconds
        setTimeout(() => setTestNotificationSent(false), 3000);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification.');
    }
  };

  const getPermissionBadge = () => {
    switch (notificationState.permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Permission
          </CardTitle>
          <CardDescription>
            Manage browser notification permissions and test notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Browser Permission Status</div>
              <div className="text-sm text-muted-foreground">
                Current status: {getPermissionBadge()}
              </div>
            </div>
            {notificationState.permission !== 'granted' && (
              <Button onClick={handleRequestPermission} variant="outline">
                Enable Notifications
              </Button>
            )}
          </div>

          {notificationState.permission === 'granted' && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-1">
                <div className="font-medium">Test Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Send a test notification to verify everything is working
                </div>
              </div>
              <Button 
                onClick={sendTestNotification} 
                variant="outline"
                disabled={testNotificationSent}
              >
                {testNotificationSent ? 'Sent!' : 'Send Test'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Instant notifications on your device
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => handlePreferenceChange('push_notifications', checked)}
                disabled={notificationState.permission !== 'granted'}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Important updates via email
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium">SMS Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Critical alerts via text message
                  </div>
                </div>
              </div>
              <Switch
                checked={preferences.sms_notifications}
                onCheckedChange={(checked) => handlePreferenceChange('sms_notifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Order Notifications</CardTitle>
          <CardDescription>
            Control which order events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Order Confirmations</div>
                <div className="text-sm text-muted-foreground">
                  When vendors confirm your orders
                </div>
              </div>
              <Switch
                checked={preferences.order_confirmations}
                onCheckedChange={(checked) => handlePreferenceChange('order_confirmations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Order Status Updates</div>
                <div className="text-sm text-muted-foreground">
                  Pickup, delivery, and status changes
                </div>
              </div>
              <Switch
                checked={preferences.order_status_updates}
                onCheckedChange={(checked) => handlePreferenceChange('order_status_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Delivery Updates</div>
                <div className="text-sm text-muted-foreground">
                  Real-time delivery tracking updates
                </div>
              </div>
              <Switch
                checked={preferences.delivery_updates}
                onCheckedChange={(checked) => handlePreferenceChange('delivery_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Cancellation Alerts</div>
                <div className="text-sm text-muted-foreground">
                  When orders are cancelled or rejected
                </div>
              </div>
              <Switch
                checked={preferences.cancellation_alerts}
                onCheckedChange={(checked) => handlePreferenceChange('cancellation_alerts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing & Promotional */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing & Promotions</CardTitle>
          <CardDescription>
            Optional promotional and marketing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Promotional Emails</div>
              <div className="text-sm text-muted-foreground">
                Deals, offers, and product recommendations
              </div>
            </div>
            <Switch
              checked={preferences.promotional_emails}
              onCheckedChange={(checked) => handlePreferenceChange('promotional_emails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Quiet Hours</div>
              <div className="text-sm text-muted-foreground">
                Disable non-urgent notifications during specified hours
              </div>
            </div>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={savePreferences} 
          disabled={loading}
          className="min-w-32"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings; 
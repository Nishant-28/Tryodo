import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Settings, 
  Bell, 
  LogOut, 
  Download
} from "lucide-react";

const SettingsContent = () => {
  const { profile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // Basic notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    order_updates: true,
    promotional_emails: false,
  });

  // Load settings from profile
  useEffect(() => {
    if (profile && profile.notification_preferences) {
      setNotificationSettings({ ...notificationSettings, ...profile.notification_preferences });
    }
  }, [profile]);

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const result = await updateProfile({
        notification_preferences: notificationSettings,
      });

      if (result.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setLoading(false);
    }
  };

  const downloadAccountData = async () => {
    if (!profile) return;

    try {
      const accountData = {
        profile: {
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          address: {
            street: profile.address,
            city: profile.city,
            state: profile.state,
            pincode: profile.pincode,
          },
          joined_date: profile.created_at,
        },
        settings: {
          notifications: notificationSettings,
        },
      };

      const dataStr = JSON.stringify(accountData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tryodo-account-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Account data downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download account data');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!profile) {
    return (
      <Card className="bg-white rounded-2xl p-6 shadow-lg h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notification Settings
          </CardTitle>
          <CardDescription className="text-gray-600">
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Email Notifications</div>
                <div className="text-sm text-gray-500">Receive notifications via email</div>
              </div>
              <Switch
                checked={notificationSettings.email_notifications}
                onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Push Notifications</div>
                <div className="text-sm text-gray-500">Receive push notifications on your device</div>
              </div>
              <Switch
                checked={notificationSettings.push_notifications}
                onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Order Updates</div>
                <div className="text-sm text-gray-500">Get notified about your order status</div>
              </div>
              <Switch
                checked={notificationSettings.order_updates}
                onCheckedChange={(checked) => handleNotificationChange('order_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Promotional Emails</div>
                <div className="text-sm text-gray-500">Receive promotional offers and updates</div>
              </div>
              <Switch
                checked={notificationSettings.promotional_emails}
                onCheckedChange={(checked) => handleNotificationChange('promotional_emails', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Account Management
          </CardTitle>
          <CardDescription className="text-gray-600">
            Export your data or manage your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={downloadAccountData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download My Data
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveSettings}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-8 py-3"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsContent; 
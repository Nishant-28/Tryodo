import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const SettingsContent = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailMarketing: false,
    theme: 'light',
    language: 'en',
  });

  const handleSwitchChange = (id: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [id]: checked }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Settings updated:', settings);
    alert('Settings updated successfully!');
  };

  return (
    <Card className="bg-white rounded-2xl p-6 shadow-lg h-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-gray-900">Account Settings</CardTitle>
        <CardDescription className="text-gray-600">Manage your account preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-gray-700 font-medium">Email Notifications</Label>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) => handleSwitchChange('notifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emailMarketing" className="text-gray-700 font-medium">Email Marketing</Label>
            <Switch
              id="emailMarketing"
              checked={settings.emailMarketing}
              onCheckedChange={(checked) => handleSwitchChange('emailMarketing', checked)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="theme" className="text-gray-700 font-medium">Theme</Label>
            <Select value={settings.theme} onValueChange={(value) => handleSelectChange('theme', value)}>
              <SelectTrigger id="theme" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="language" className="text-gray-700 font-medium">Language</Label>
            <Select value={settings.language} onValueChange={(value) => handleSelectChange('language', value)}>
              <SelectTrigger id="language" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-3">
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SettingsContent; 
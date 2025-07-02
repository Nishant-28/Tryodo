import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from '@/components/Header';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Eye, EyeOff, User, Lock, Store, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { Link } from 'react-router-dom';

const VendorProfile = () => {
  const { profile, user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile form data - focused on vendor-specific fields
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: ''
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Show/hide password states
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Vendor address state
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorAddress, setVendorAddress] = useState<any>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressForm, setAddressForm] = useState({
    company_name: '',
    pincode: '',
    address_box: '',
    phone_number1: '',
    phone_number2: '',
    phone_number3: '',
    phone_number4: '',
    phone_number5: ''
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      });
    }
    if (profile?.role === 'vendor') {
      fetchVendorId();
    }
  }, [profile]);

  useEffect(() => {
    if (vendorId) {
      fetchVendorAddress(vendorId);
    }
  }, [vendorId]);

  const fetchVendorId = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();
      if (error) throw error;
      setVendorId(data.id);
    } catch (error: any) {
      console.error('Error fetching vendor ID:', error);
      toast.error('Failed to load vendor ID.');
    }
  };

  const fetchVendorAddress = async (id: string) => {
    setAddressLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_addresses')
        .select('*')
        .eq('vendor_id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      if (data) {
        setVendorAddress(data);
        setAddressForm({
          company_name: data.company_name || '',
          pincode: data.pincode || '',
          address_box: data.address_box || '',
          phone_number1: data.phone_number1 || '',
          phone_number2: data.phone_number2 || '',
          phone_number3: data.phone_number3 || '',
          phone_number4: data.phone_number4 || '',
          phone_number5: data.phone_number5 || ''
        });
      } else {
        setVendorAddress(null);
        setAddressForm({
          company_name: '',
          pincode: '',
          address_box: '',
          phone_number1: '',
          phone_number2: '',
          phone_number3: '',
          phone_number4: '',
          phone_number5: ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching vendor address:', error);
      toast.error('Failed to load vendor address.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setLoading(true);
    try {
      // Save Profile
      if (profileData.full_name !== profile.full_name || profileData.phone !== profile.phone) {
        const { error: updateError } = await updateProfile(
          { 
            full_name: profileData.full_name,
            phone: profileData.phone
          }
        );
        if (updateError) {
          throw updateError;
        }
        toast.success('Profile updated successfully');
      } else {
        toast.info('No changes to save for profile');
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;
    setAddressLoading(true);
    try {
      const payload = {
        vendor_id: vendorId,
        company_name: addressForm.company_name,
        pincode: addressForm.pincode,
        address_box: addressForm.address_box,
        phone_number1: addressForm.phone_number1,
        phone_number2: addressForm.phone_number2 || null,
        phone_number3: addressForm.phone_number3 || null,
        phone_number4: addressForm.phone_number4 || null,
        phone_number5: addressForm.phone_number5 || null
      };
      if (vendorAddress) {
        await supabase
          .from('vendor_addresses')
          .update(payload)
          .eq('vendor_id', vendorId);
        toast.success('Address updated successfully');
      } else {
        await supabase
          .from('vendor_addresses')
          .insert(payload);
        toast.success('Address added successfully');
      }
    } catch {
      toast.error('Failed to save vendor address');
    } finally {
      setAddressLoading(false);
    }
  };

  if (!profile) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="bg-white rounded-2xl p-6 shadow-lg h-full">
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading profile...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Information Card */}
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-6 w-6 text-purple-500" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Manage your name and phone number.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-gray-700 font-medium">Full Name</Label>
                      <Input
                        name="full_name"
                        type="text"
                        value={profileData.full_name}
                        onChange={handleProfileChange}
                        placeholder="Enter your full name"
                        required
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full bg-gray-100 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      name="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="+91 9876543210"
                      className="w-full"
                    />
                  </div>

                  {/* The following fields are now managed in vendor_addresses table */}
                  {/*
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-700 font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <Input
                      name="address"
                      type="text"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      placeholder="Enter your full address"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-700 font-medium">City</Label>
                      <Input
                        name="city"
                        type="text"
                        value={profileData.city}
                        onChange={handleProfileChange}
                        placeholder="Enter your city"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-700 font-medium">State</Label>
                      <Input
                        name="state"
                        type="text"
                        value={profileData.state}
                        onChange={handleProfileChange}
                        placeholder="Enter your state"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-gray-700 font-medium">PIN Code</Label>
                    <Input
                      name="pincode"
                      type="text"
                      value={profileData.pincode}
                      onChange={handleProfileChange}
                      placeholder="123456"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="w-full"
                    />
                  </div>
                  */}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white py-3"
                    disabled={loading}
                  >
                    {loading ? 'Saving Profile...' : 'Save Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Vendor Address Card */}
            {profile?.role === 'vendor' && (
              <Card className="bg-white rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Store className="h-6 w-6 text-orange-500" />
                    Vendor Address
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage your company/shop address and contact numbers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name" className="text-gray-700 font-medium">Company Name</Label>
                      <Input
                        name="company_name"
                        type="text"
                        value={addressForm.company_name}
                        onChange={handleAddressChange}
                        placeholder="Enter your company/shop name"
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-gray-700 font-medium">PIN Code</Label>
                      <Input
                        name="pincode"
                        type="text"
                        value={addressForm.pincode}
                        onChange={handleAddressChange}
                        placeholder="123456"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_box" className="text-gray-700 font-medium">Address</Label>
                      <Input
                        name="address_box"
                        type="text"
                        value={addressForm.address_box}
                        onChange={handleAddressChange}
                        placeholder="Enter your address"
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number1" className="text-gray-700 font-medium">Phone Number</Label>
                      <Input
                        name="phone_number1"
                        type="tel"
                        value={addressForm.phone_number1}
                        onChange={handleAddressChange}
                        placeholder="+91 9876543210"
                        required
                        className="w-full"
                      />
                    </div>
                    {/* Optional phone numbers */}
                    {[2,3,4,5].map(num => (
                      <div key={num} className="space-y-2">
                        <Label htmlFor={`phone_number${num}`} className="text-gray-700 font-medium">Phone Number {num} (optional)</Label>
                        <Input
                          name={`phone_number${num}` as keyof typeof addressForm}
                          type="tel"
                          value={addressForm[`phone_number${num}` as keyof typeof addressForm] || ''}
                          onChange={handleAddressChange}
                          placeholder={`+91 98765432${num}0`}
                          className="w-full"
                        />
                      </div>
                    ))}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white py-3"
                      disabled={addressLoading}
                    >
                      {addressLoading ? 'Saving...' : 'Save Address'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Password Change Card */}
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-red-500" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Update your account password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white py-3"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notification Preferences Card */}
            {/* <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-6 w-6 text-green-500" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Manage how you receive updates and communications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email_notifications" className="text-gray-700 font-medium">Email Notifications</Label>
                    <Switch
                      id="email_notifications"
                      checked={notificationPrefs.email_notifications}
                      onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="order_updates" className="text-gray-700 font-medium">Order Updates</Label>
                    <Switch
                      id="order_updates"
                      checked={notificationPrefs.order_updates}
                      onCheckedChange={(checked) => handleNotificationChange('order_updates', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="promotional_emails" className="text-gray-700 font-medium">Promotional Emails</Label>
                    <Switch
                      id="promotional_emails"
                      checked={notificationPrefs.promotional_emails}
                      onCheckedChange={(checked) => handleNotificationChange('promotional_emails', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms_notifications" className="text-gray-700 font-medium">SMS Notifications</Label>
                    <Switch
                      id="sms_notifications"
                      checked={notificationPrefs.sms_notifications}
                      onCheckedChange={(checked) => handleNotificationChange('sms_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push_notifications" className="text-gray-700 font-medium">Push Notifications</Label>
                    <Switch
                      id="push_notifications"
                      checked={notificationPrefs.push_notifications}
                      onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveNotifications} 
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 text-white py-3"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card> */}

            {/* Privacy Settings Card */}
            {/* <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-blue-500" />
                  Privacy Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Control your profile visibility and data sharing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile_visibility" className="text-gray-700 font-medium">Profile Visibility</Label>
                    <Select
                      value={privacySettings.profile_visibility}
                      onValueChange={(value: 'public' | 'private') => handlePrivacyChange('profile_visibility', value)}
                    >
                      <SelectTrigger id="profile_visibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show_order_history" className="text-gray-700 font-medium">Show Order History to Vendors</Label>
                    <Switch
                      id="show_order_history"
                      checked={privacySettings.show_order_history}
                      onCheckedChange={(checked) => handlePrivacyChange('show_order_history', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="data_sharing" className="text-gray-700 font-medium">Allow Data Sharing with Partners</Label>
                    <Switch
                      id="data_sharing"
                      checked={privacySettings.data_sharing}
                      onCheckedChange={(checked) => handlePrivacyChange('data_sharing', checked)}
                    />
                  </div>
                  <Button 
                    onClick={handleSavePrivacy} 
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white py-3"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorProfile;
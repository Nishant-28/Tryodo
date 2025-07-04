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
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
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

  // Load profile data when component mounts
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || ''
      });
    }
  }, [profile]);

  // Handle profile form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Submit profile updates
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Submit password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password fields
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      // Use Supabase's built-in password update which handles verification internally
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) {
        if (error.message.includes('New password should be different')) {
          toast.error('New password must be different from current password');
        } else if (error.message.includes('weak')) {
          toast.error('Password is too weak. Please choose a stronger password');
        } else if (error.message.includes('same')) {
          toast.error('New password must be different from current password');
        } else {
          toast.error('Failed to change password. Please verify your current password and try again.');
        }
      } else {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
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
          {/* Back to Dashboard Button */}
          <div className="mb-6">
            <Link 
              to="/vendor-dashboard"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendor Profile</h1>
            <p className="text-gray-600">Manage your account information and security settings</p>
          </div>

          <div className="space-y-6">
            {/* Profile Information Card */}
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Store className="h-6 w-6 text-green-600" />
                  Vendor Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-gray-700 font-medium flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Full Name
                      </Label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

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

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white py-3"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Save Profile Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Password Change Card */}
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Lock className="h-6 w-6 text-red-600" />
                  Change Password
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Update your account password for better security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-gray-700 font-medium">Current Password</Label>
                    <div className="relative">
                      <Input
                        name="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your current password"
                        required
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-gray-700 font-medium">New Password</Label>
                    <div className="relative">
                      <Input
                        name="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter your new password"
                        required
                        minLength={6}
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        name="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm your new password"
                        required
                        minLength={6}
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white py-3"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorProfile;
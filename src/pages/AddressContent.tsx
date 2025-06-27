import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  Plus, 
  MapPin, 
  Edit3, 
  Trash2, 
  Star, 
  Home, 
  Building, 
  User, 
  Phone,
  Check,
  X,
  AlertCircle
} from "lucide-react";

interface Address {
  id: string;
  address_type: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_default: boolean;
}

interface AddressFormData {
  address_type: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  contact_name: string;
  contact_phone: string;
  is_default: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
  'Puducherry', 'Andaman and Nicobar Islands'
];

const ADDRESS_TYPES = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Building },
  { value: 'other', label: 'Other', icon: MapPin }
];

const AddressContent = () => {
  const { profile, updateProfile } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [useSimpleStorage, setUseSimpleStorage] = useState(false);

  const [formData, setFormData] = useState<AddressFormData>({
    address_type: 'home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    contact_name: '',
    contact_phone: '',
    is_default: false,
  });

  // Initialize addresses from profile if customer table access fails
  useEffect(() => {
    if (profile) {
      loadAddresses();
    }
  }, [profile]);

  const loadAddresses = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // First try to use the customer_addresses table
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (existingCustomer) {
        // Customer exists, load addresses from customer_addresses table
        const { data: addressesData, error: addressError } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', existingCustomer.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!addressError && addressesData) {
          setAddresses(addressesData);
          setUseSimpleStorage(false);
          return;
        }
      }

      // Fallback: Use simple profile-based storage
      setUseSimpleStorage(true);
      loadSimpleAddresses();
      
    } catch (error) {
      console.error('Error loading addresses:', error);
      setUseSimpleStorage(true);
      loadSimpleAddresses();
    } finally {
      setLoading(false);
    }
  };

  const loadSimpleAddresses = () => {
    // Load from profile fields as a simple fallback
    if (profile?.address || profile?.city || profile?.state || profile?.pincode) {
      const simpleAddress: Address = {
        id: 'profile-address',
        address_type: 'home',
        address_line1: profile.address || '',
        address_line2: null,
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
        landmark: null,
        contact_name: profile.full_name || '',
        contact_phone: profile.phone || '',
        is_default: true,
      };
      setAddresses([simpleAddress]);
    } else {
      setAddresses([]);
    }
  };

  const handleFormChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      address_type: 'home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      contact_name: profile?.full_name || '',
      contact_phone: '',
      is_default: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleAddNew = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      contact_name: profile?.full_name || '',
      is_default: addresses.length === 0
    }));
    setShowForm(true);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      address_type: address.address_type,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || '',
      contact_name: address.contact_name || '',
      contact_phone: address.contact_phone || '',
      is_default: address.is_default,
    });
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.address_line1.trim() || !formData.city.trim() || 
        !formData.state.trim() || !formData.pincode.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      toast.error('PIN code must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      if (useSimpleStorage) {
        // Use simple profile storage as fallback
        const result = await updateProfile({
          address: formData.address_line1,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.contact_phone || profile?.phone || null,
        });
        
        if (result.success) {
          toast.success('Address saved successfully');
          loadSimpleAddresses();
          resetForm();
        } else {
          toast.error(result.error || 'Failed to save address');
        }
      } else {
        // Try to use the customer_addresses table
        try {
          const { data: existingCustomer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('profile_id', profile?.id)
            .single();

          if (customerError || !existingCustomer) {
            // Fall back to simple storage if customer table doesn't exist
            console.log('Customer table not found, falling back to simple storage');
            setUseSimpleStorage(true);
            
            const result = await updateProfile({
              address: formData.address_line1,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              phone: formData.contact_phone || profile?.phone || null,
            });
            
            if (result.success) {
              toast.success('Address saved successfully');
              loadSimpleAddresses();
              resetForm();
            } else {
              toast.error(result.error || 'Failed to save address');
            }
            return;
          }

          // If we reach here, customer exists, try to save to customer_addresses
          const addressData = {
            customer_id: existingCustomer.id,
            address_type: formData.address_type,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || null,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            landmark: formData.landmark || null,
            contact_name: formData.contact_name || null,
            contact_phone: formData.contact_phone || null,
            is_default: formData.is_default || addresses.length === 0,
          };

          if (editingAddress) {
            const { error: updateError } = await supabase
              .from('customer_addresses')
              .update(addressData)
              .eq('id', editingAddress.id);
              
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('customer_addresses')
              .insert(addressData);
              
            if (insertError) throw insertError;
          }
          
          toast.success(editingAddress ? 'Address updated successfully' : 'Address added successfully');
          loadAddresses();
          resetForm();
        } catch (dbError) {
          console.error('Database error, falling back to simple storage:', dbError);
          setUseSimpleStorage(true);
          
          const result = await updateProfile({
            address: formData.address_line1,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            phone: formData.contact_phone || profile?.phone || null,
          });
          
          if (result.success) {
            toast.success('Address saved successfully');
            loadSimpleAddresses();
            resetForm();
          } else {
            toast.error(result.error || 'Failed to save address');
          }
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    // For simple storage, there's only one address and it's always default
    if (useSimpleStorage) {
      toast.success('This is your default address');
      return;
    }
    toast.error('Feature not available in simple mode');
  };

  const handleDelete = async (addressId: string) => {
    if (useSimpleStorage) {
      setLoading(true);
      try {
        await updateProfile({
          address: null,
          city: null,
          state: null,
          pincode: null,
        });
        toast.success('Address deleted successfully');
        setAddresses([]);
      } catch (error) {
        console.error('Error deleting address:', error);
        toast.error('Failed to delete address');
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('Feature not available in simple mode');
    }
  };

  const getAddressIcon = (type: string) => {
    const addressType = ADDRESS_TYPES.find(t => t.value === type);
    return addressType ? addressType.icon : MapPin;
  };

  const formatAddress = (address: Address) => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.landmark,
      address.city,
      address.state,
      address.pincode
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (loading && addresses.length === 0) {
    return (
      <Card className="bg-white rounded-2xl shadow-lg h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading addresses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Delivery Addresses
            </div>
            <Button 
              onClick={handleAddNew}
              disabled={loading || (useSimpleStorage && addresses.length >= 1)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addresses.length === 0 ? 'Add Address' : 'Edit Address'}
            </Button>
          </CardTitle>
          <CardDescription className="text-gray-600">
            {useSimpleStorage ? (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Simple mode: One address stored in profile
              </div>
            ) : (
              'Manage your delivery addresses (Maximum 5 addresses allowed)'
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Addresses List */}
      {addresses.length > 0 ? (
        <div className="grid gap-4">
          {addresses.map((address) => {
            const AddressIcon = getAddressIcon(address.address_type);
            return (
              <Card key={address.id} className="bg-white rounded-lg shadow-sm border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AddressIcon className="h-5 w-5 text-blue-600" />
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 capitalize">
                            {address.address_type}
                          </span>
                          {address.is_default && (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-2 leading-relaxed">
                        {formatAddress(address)}
                      </p>
                      
                      {(address.contact_name || address.contact_phone) && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {address.contact_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {address.contact_name}
                            </div>
                          )}
                          {address.contact_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {address.contact_phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(address)}
                        disabled={loading}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      
                      {useSimpleStorage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(address.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white rounded-lg shadow-sm border-dashed border-2">
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses found</h3>
            <p className="text-gray-600 mb-4">Add your first delivery address to get started</p>
            <Button 
              onClick={handleAddNew}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Card className="bg-white rounded-2xl shadow-lg border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {useSimpleStorage ? 
                'Simple address storage (stored in your profile)' : 
                (editingAddress ? 'Update your address details' : 'Add a new delivery address')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Address Type */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Address Type *</Label>
                <Select 
                  value={formData.address_type} 
                  onValueChange={(value) => handleFormChange('address_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADDRESS_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Address Lines */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Address Line 1 *</Label>
                  <Input
                    value={formData.address_line1}
                    onChange={(e) => handleFormChange('address_line1', e.target.value)}
                    placeholder="House/Flat No., Building Name, Street"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Address Line 2</Label>
                  <Input
                    value={formData.address_line2}
                    onChange={(e) => handleFormChange('address_line2', e.target.value)}
                    placeholder="Area, Locality, Sector (Optional)"
                  />
                </div>
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">City *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">State *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => handleFormChange('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">PIN Code *</Label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => handleFormChange('pincode', e.target.value)}
                    placeholder="123456"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Contact Name</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => handleFormChange('contact_name', e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Contact Phone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => handleFormChange('contact_phone', e.target.value)}
                    placeholder="+91 9876543210"
                    type="tel"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : (editingAddress ? 'Update Address' : 'Save Address')}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddressContent; 
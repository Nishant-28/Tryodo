import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, MapPin } from "lucide-react";

interface Address {
  id: string;
  shop_name: string;
  owner_name: string;
  pincode: string;
  address_box: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

interface AddressFormData {
  shop_name: string;
  owner_name: string;
  pincode: string;
  address_box: string;
  phone_number: string;
}

const AddressContent = () => {
  const { profile } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    shop_name: "",
    owner_name: "",
    pincode: "",
    address_box: "",
    phone_number: ""
  });

  useEffect(() => {
    if (profile) loadAddresses();
  }, [profile]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (custErr || !customer) {
        setAddresses([]);
      } else {
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAddresses(data || []);
      }
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ shop_name: "", owner_name: "", pincode: "", address_box: "", phone_number: "" });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleAddClick = () => {
    if (addresses.length >= 5) {
      toast.error('You can only have up to 5 addresses');
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const handleEditClick = (addr: Address) => {
    setEditingAddress(addr);
    setFormData({
      shop_name: addr.shop_name,
      owner_name: addr.owner_name,
      pincode: addr.pincode,
      address_box: addr.address_box,
      phone_number: addr.phone_number
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (customer) {
        const { error } = await supabase
          .from('customer_addresses')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Address deleted');
        loadAddresses();
      }
    } catch {
      toast.error('Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (!customer) throw new Error('Customer not found');
      const payload = { customer_id: customer.id, ...formData };
      if (editingAddress) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq('id', editingAddress.id);
        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert(payload);
        if (error) throw error;
        toast.success('Address added');
      }
      resetForm();
      loadAddresses();
    } catch {
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Manage Addresses
          </CardTitle>
          <CardDescription>
            You can add up to 5 addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {addresses.map(addr => (
            <div key={addr.id} className="flex justify-between items-center p-4 border rounded mb-4">
              <div>
                <p className="font-semibold">{addr.shop_name}</p>
                <p>{addr.owner_name}</p>
                <p>{addr.address_box} - {addr.pincode}</p>
                <p>{addr.phone_number}</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditClick(addr)}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(addr.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <Button onClick={handleAddClick} disabled={loading} className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add New Address
          </Button>
          {showForm && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <Input value={formData.shop_name} onChange={e => setFormData(prev => ({ ...prev, shop_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input value={formData.owner_name} onChange={e => setFormData(prev => ({ ...prev, owner_name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input type="text" value={formData.pincode} onChange={e => setFormData(prev => ({ ...prev, pincode: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address_box} onChange={e => setFormData(prev => ({ ...prev, address_box: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input type="tel" value={formData.phone_number} onChange={e => setFormData(prev => ({ ...prev, phone_number: e.target.value }))} required />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>{editingAddress ? 'Update' : 'Add'}</Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddressContent; 
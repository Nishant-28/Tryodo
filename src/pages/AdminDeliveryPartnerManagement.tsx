import React, { useEffect, useState } from 'react';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const vehicleTypes = ['Two Wheeler', 'Three Wheeler', 'Four Wheeler'];

export default function AdminDeliveryPartnerManagement() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    vehicle_number: '',
    aadhar_number: '',
    pan_number: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    const response = await DeliveryAPI.getAllPartners();
    if (response.success) {
      setPartners(response.data || []);
    } else {
      toast({
        title: "Error",
        description: "Failed to load delivery partners",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await DeliveryAPI.createPartner(formData);
    if (response.success) {
      toast({
        title: "Success",
        description: "Delivery partner created successfully"
      });
      setAddPartnerOpen(false);
      loadPartners();
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        license_number: '',
        vehicle_type: '',
        vehicle_number: '',
        aadhar_number: '',
        pan_number: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to create delivery partner",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (partnerId: string, isActive: boolean) => {
    const response = await DeliveryAPI.updatePartnerStatus(partnerId, isActive);
    if (response.success) {
      toast({
        title: "Success",
        description: `Partner ${isActive ? 'activated' : 'deactivated'} successfully`
      });
      loadPartners();
    } else {
      toast({
        title: "Error",
        description: "Failed to update partner status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Delivery Partner Management</h1>
        <Dialog open={addPartnerOpen} onOpenChange={setAddPartnerOpen}>
          <DialogTrigger asChild>
            <Button>Add New Partner</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Delivery Partner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_number">Vehicle Number</Label>
                  <Input
                    id="vehicle_number"
                    name="vehicle_number"
                    value={formData.vehicle_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhar_number">Aadhar Number</Label>
                  <Input
                    id="aadhar_number"
                    name="aadhar_number"
                    value={formData.aadhar_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                  <Input
                    id="bank_ifsc_code"
                    name="bank_ifsc_code"
                    value={formData.bank_ifsc_code}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setAddPartnerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Partner</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((partner) => (
          <Card key={partner.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{partner.full_name}</span>
                <Badge variant={partner.is_active ? "default" : "secondary"}>
                  {partner.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span>{partner.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Phone:</span>
                  <span>{partner.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Vehicle:</span>
                  <span>{partner.vehicle_type} - {partner.vehicle_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <div className="space-x-2">
                    <Badge variant={partner.is_verified ? "default" : "secondary"}>
                      {partner.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    <Badge variant={partner.is_available ? "default" : "secondary"}>
                      {partner.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Deliveries:</span>
                  <span>{partner.total_deliveries} ({partner.successful_deliveries} successful)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Rating:</span>
                  <span>{partner.rating.toFixed(1)} ⭐ ({partner.total_reviews} reviews)</span>
                </div>
                <div className="pt-4">
                  <Button
                    variant={partner.is_active ? "destructive" : "default"}
                    className="w-full"
                    onClick={() => handleStatusChange(partner.id, !partner.is_active)}
                  >
                    {partner.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, MapPin, TrendingUp, Shield,
  AlertTriangle, CheckCircle, Ban, RefreshCw,
  Wallet, Settings, Search, Filter, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DeliveryPartner {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  is_available: boolean;
  is_verified: boolean;
  is_active: boolean;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  assigned_pincodes: string[];
  created_at: string;
  wallet_balance: number;
}

interface DeliveryZone {
  id: string;
  name: string;
  pincodes: string[];
  is_active: boolean;
}

const AdminDeliveryPartnerManagement = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  // State management
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  
  // Dialog states
  const [addPartnerDialog, setAddPartnerDialog] = useState(false);
  const [editPartnerDialog, setEditPartnerDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(null);
  const [zoneManagementDialog, setZoneManagementDialog] = useState(false);
  
  // Form states for new partner
  const [newPartner, setNewPartner] = useState({
    full_name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_type: '',
    vehicle_number: '',
    assigned_pincodes: [] as string[]
  });

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadDeliveryPartners();
      loadDeliveryZones();
    } else {
      navigate('/login');
    }
  }, [user, profile]);

  const loadDeliveryPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_partners')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            email,
            phone
          )
        `);

      if (error) throw error;

      const formattedPartners = data.map(partner => ({
        ...partner,
        full_name: partner.profiles.full_name,
        email: partner.profiles.email,
        phone: partner.profiles.phone
      }));

      setPartners(formattedPartners);
    } catch (error) {
      console.error('Error loading delivery partners:', error);
      toast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*');

      if (error) throw error;
      setZones(data);
    } catch (error) {
      console.error('Error loading delivery zones:', error);
      toast.error('Failed to load delivery zones');
    }
  };

  const handleAddPartner = async () => {
    try {
      // First create a new profile
      const { data: profileData, error: profileError } = await supabase.auth.signUp({
        email: newPartner.email,
        password: generateTemporaryPassword(), // You'll need to implement this
        options: {
          data: {
            full_name: newPartner.full_name,
            phone: newPartner.phone,
            role: 'delivery_partner'
          }
        }
      });

      if (profileError) throw profileError;

      // Then create the delivery partner record
      const { error: partnerError } = await supabase
        .from('delivery_partners')
        .insert({
          profile_id: profileData.user!.id,
          license_number: newPartner.license_number,
          vehicle_type: newPartner.vehicle_type,
          vehicle_number: newPartner.vehicle_number,
          assigned_pincodes: newPartner.assigned_pincodes,
          is_active: true,
          is_verified: false
        });

      if (partnerError) throw partnerError;

      toast.success('Delivery partner added successfully');
      setAddPartnerDialog(false);
      loadDeliveryPartners();
    } catch (error) {
      console.error('Error adding delivery partner:', error);
      toast.error('Failed to add delivery partner');
    }
  };

  const handleUpdatePartner = async (partnerId: string, updates: Partial<DeliveryPartner>) => {
    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update(updates)
        .eq('id', partnerId);

      if (error) throw error;

      toast.success('Partner updated successfully');
      loadDeliveryPartners();
    } catch (error) {
      console.error('Error updating partner:', error);
      toast.error('Failed to update partner');
    }
  };

  const handleTogglePartnerStatus = async (partnerId: string, isActive: boolean) => {
    await handleUpdatePartner(partnerId, { is_active: isActive });
  };

  const handleVerifyPartner = async (partnerId: string) => {
    await handleUpdatePartner(partnerId, { is_verified: true });
  };

  const handleUpdateZone = async (zoneId: string, updates: Partial<DeliveryZone>) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .update(updates)
        .eq('id', zoneId);

      if (error) throw error;

      toast.success('Zone updated successfully');
      loadDeliveryZones();
    } catch (error) {
      console.error('Error updating zone:', error);
      toast.error('Failed to update zone');
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = 
      partner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.phone.includes(searchTerm);
    
    const matchesStatus = 
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? partner.is_active :
      !partner.is_active;

    const matchesVerified =
      filterVerified === 'all' ? true :
      filterVerified === 'verified' ? partner.is_verified :
      !partner.is_verified;

    return matchesSearch && matchesStatus && matchesVerified;
  });

  const exportToCSV = () => {
    // Implementation for exporting partner data to CSV
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Delivery Partner Management</h1>
          <div className="flex gap-2">
            <Button onClick={() => setAddPartnerDialog(true)} className="flex items-center gap-2">
              <UserPlus size={20} />
              Add Partner
            </Button>
            <Button variant="outline" onClick={() => setZoneManagementDialog(true)}>
              <MapPin size={20} className="mr-2" />
              Manage Zones
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search partners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<Search size={20} />}
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVerified} onValueChange={(value: any) => setFilterVerified(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download size={20} className="mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners.map((partner) => (
              <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{partner.full_name}</CardTitle>
                      <CardDescription>{partner.email}</CardDescription>
                    </div>
                    <Switch
                      checked={partner.is_active}
                      onCheckedChange={(checked) => handleTogglePartnerStatus(partner.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Badge variant={partner.is_verified ? "success" : "warning"}>
                        {partner.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant="outline">
                        Rating: {partner.rating.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      <p>📱 {partner.phone}</p>
                      <p>🚗 {partner.vehicle_type} - {partner.vehicle_number}</p>
                      <p>📍 {partner.assigned_pincodes.join(", ")}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span>Total Deliveries: {partner.total_deliveries}</span>
                      <span>Success Rate: {((partner.successful_deliveries / partner.total_deliveries) * 100 || 0).toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPartner(partner);
                          setEditPartnerDialog(true);
                        }}
                      >
                        Edit
                      </Button>
                      {!partner.is_verified && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleVerifyPartner(partner.id)}
                        >
                          Verify Partner
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Partner Dialog */}
      <Dialog open={addPartnerDialog} onOpenChange={setAddPartnerDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Delivery Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newPartner.full_name}
                onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newPartner.email}
                onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newPartner.phone}
                onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                value={newPartner.license_number}
                onChange={(e) => setNewPartner({ ...newPartner, license_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select
                  value={newPartner.vehicle_type}
                  onValueChange={(value) => setNewPartner({ ...newPartner, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="scooter">Scooter</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={newPartner.vehicle_number}
                  onChange={(e) => setNewPartner({ ...newPartner, vehicle_number: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPartnerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPartner}>Add Partner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={editPartnerDialog} onOpenChange={setEditPartnerDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Partner Details</DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4 py-4">
              {/* Similar form fields as Add Partner Dialog but with selectedPartner data */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zone Management Dialog */}
      <Dialog open={zoneManagementDialog} onOpenChange={setZoneManagementDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Delivery Zones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Zone management content */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryPartnerManagement; 
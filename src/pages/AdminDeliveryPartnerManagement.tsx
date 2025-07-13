import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, MapPin, TrendingUp, Shield,
  AlertTriangle, CheckCircle, Ban, RefreshCw,
  Wallet, Settings, Search, Filter, Download, Zap, RotateCcw,
  Plus, Edit3, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DeliveryAPI } from '@/lib/deliveryApi';
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

interface DeliveryPartnerSectorAssignment {
  id: string;
  delivery_partner_id: string;
  sector_id: string;
  slot_id: string;
  assigned_date: string;
  is_active: boolean;
  sector?: any;
  delivery_slot?: any;
}

const AdminDeliveryPartnerManagement = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  // State management
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  
  // Sector assignment states
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [submittingSectorAssignment, setSubmittingSectorAssignment] = useState(false);
  
  // Dialog states
  const [addPartnerDialog, setAddPartnerDialog] = useState(false);
  const [editPartnerDialog, setEditPartnerDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(null);
  const [sectorAssignmentDialog, setSectorAssignmentDialog] = useState(false);
  const [selectedPartnerForSector, setSelectedPartnerForSector] = useState<DeliveryPartner | null>(null);
  
  // Auto-assignment states
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [resetAssignLoading, setResetAssignLoading] = useState(false);
  
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
      loadSectors();
      loadAvailableSlots();
    } else {
      navigate('/login');
    }
  }, [user, profile]);

  const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-8) + 'Temp!';
  };

  const loadDeliveryPartners = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading delivery partners...');
      
      // Debug: Check current user context
      const { data: userData } = await supabase.auth.getUser();
      console.log('👤 Current user:', userData?.user?.email, 'Role:', userData?.user?.user_metadata?.role);
      
      // First get delivery partners
      console.log('📋 Fetching delivery partners...');
      let { data: partnersData, error: partnersError } = await supabase
        .from('delivery_partners')
        .select('*');

      if (partnersError) {
        console.error('❌ Error loading delivery partners:', partnersError);
        // Try alternative query with explicit auth context
        console.log('🔄 Trying alternative query...');
        
        const { data: altPartnersData, error: altPartnersError } = await supabase
          .from('delivery_partners')
          .select(`
            id,
            profile_id,
            license_number,
            vehicle_type,
            vehicle_number,
            is_active,
            is_verified,
            rating,
            total_deliveries,
            successful_deliveries,
            assigned_pincodes
          `);
        
        if (altPartnersError) {
          console.error('❌ Alternative query also failed:', altPartnersError);
          throw new Error(`Database query failed: ${partnersError.message}`);
        }
        
        console.log('✅ Alternative query succeeded');
        // Use alternative data
        partnersData = altPartnersData;
      }

      console.log('📊 Raw delivery partners data:', partnersData);

      if (!partnersData || partnersData.length === 0) {
        console.log('ℹ️ No delivery partners found in database');
        setPartners([]);
        return;
      }

      // Get profile IDs
      const profileIds = partnersData.map(partner => partner.profile_id);
      console.log('👥 Fetching profiles for IDs:', profileIds);

      // Get profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', profileIds);

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        console.log('⚠️ Continuing without profile data');
      }

      console.log('👤 Profiles data:', profilesData);

      // Create a map of profile data for easier lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const formattedPartners = partnersData.map(partner => {
        console.log('Processing partner:', partner.id, 'Profile ID:', partner.profile_id);
        
        // Get profile data from map
        const profile = profilesMap.get(partner.profile_id);
        console.log('Found profile for partner:', profile);
        
        return {
          ...partner,
          full_name: profile?.full_name || `Delivery Partner ${partner.id.slice(0, 8)}`,
          email: profile?.email || 'No Email',
          phone: profile?.phone || 'No Phone',
          // Ensure default values for required fields
          rating: partner.rating || 0,
          total_deliveries: partner.total_deliveries || 0,
          successful_deliveries: partner.successful_deliveries || 0,
          assigned_pincodes: partner.assigned_pincodes || [],
          wallet_balance: partner.wallet_balance || 0
        };
      });

      console.log('✅ Formatted delivery partners:', formattedPartners);
      setPartners(formattedPartners);
      
      if (formattedPartners.length > 0) {
        toast.success(`Loaded ${formattedPartners.length} delivery partners`);
      }
    } catch (error) {
      console.error('💥 Error loading delivery partners:', error);
      toast.error(`Failed to load delivery partners: ${error.message || 'Unknown error'}`);
      setPartners([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadSectors = async () => {
    try {
      console.log('🔄 Loading sectors...');
      
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('is_active', true)
        .order('city_name', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Loaded sectors successfully:', data);
      setSectors(data || []);
      
      if (data && data.length > 0) {
        toast.success(`Loaded ${data.length} sectors`);
      } else {
        console.log('ℹ️ No sectors found in database');
      }
    } catch (error) {
      console.error('💥 Unexpected error loading sectors:', error);
      toast.error(`Failed to load sectors: ${error.message}`);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      console.log('Loading available slots...');
      const { data, error } = await supabase
        .from('delivery_slots')
        .select(`
          *,
          sector:sectors(name, city_name)
        `)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      console.log('Loaded available slots:', data);
      setAvailableSlots(data || []);
      
      if (data && data.length > 0) {
        console.log(`Loaded ${data.length} available slots`);
      } else {
        console.log('No available slots found');
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast.error('Failed to load available slots');
    }
  };

  const handleAddPartner = async () => {
    try {
      // First create a new profile
      const { data: profileData, error: profileError } = await supabase.auth.signUp({
        email: newPartner.email,
        password: generateTemporaryPassword(),
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
      const timestamp = Date.now();
      const { error: partnerError } = await supabase
        .from('delivery_partners')
        .insert({
          profile_id: profileData.user!.id,
          license_number: newPartner.license_number,
          vehicle_type: newPartner.vehicle_type,
          vehicle_number: newPartner.vehicle_number,
          aadhar_number: `TEMP-${timestamp}`, // Required field - can be updated later
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

  const handleAutoAssignDeliveryPartners = async () => {
    try {
      setAutoAssignLoading(true);
      toast.success("Starting Auto-Assignment", {
        description: "Assigning delivery partners to slots with orders...",
      });

      const result = await DeliveryAPI.autoAssignDeliveryPartners();
      
      if (result.success) {
        toast.success("Auto-Assignment Complete", {
          description: `Successfully assigned ${result.assignments} delivery partners to slots.`,
        });
      } else {
        toast.error("Auto-Assignment Failed", {
          description: result.error?.message || "Failed to auto-assign delivery partners",
        });
      }
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      toast.error("Error", {
        description: "Failed to run auto-assignment",
      });
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleResetAllAssignments = async () => {
    try {
      setResetAssignLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      toast.success("Resetting Assignments", {
        description: "Removing all delivery assignments for today...",
      });

      // Get all delivery assignments for today
      const { data: assignments, error: fetchError } = await supabase
        .from('delivery_assignments')
        .select('slot_id')
        .eq('assigned_date', today);

      if (fetchError) throw fetchError;

      if (!assignments || assignments.length === 0) {
        toast.success("No assignments to reset");
        return;
      }

      // Remove all assignments for today
      const { error: deleteError } = await supabase
        .from('delivery_assignments')
        .delete()
        .eq('assigned_date', today);

      if (deleteError) throw deleteError;

      toast.success("Reset Complete", {
        description: `Successfully removed ${assignments.length} delivery assignments. You can now run auto-assignment again.`,
      });
    } catch (error) {
      console.error('Error resetting assignments:', error);
      toast.error("Error", {
        description: "Failed to reset assignments",
      });
    } finally {
      setResetAssignLoading(false);
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

  const handleAssignSectorToPartner = async () => {
    if (!selectedPartnerForSector || !selectedSector || selectedSlots.length === 0) {
      toast.error('Please select a sector and at least one slot');
      return;
    }

    try {
      setSubmittingSectorAssignment(true);
      const assignedDate = new Date().toISOString().split('T')[0];
      
      // First, check for existing assignments to avoid duplicates
      const { data: existingAssignments, error: checkError } = await supabase
        .from('delivery_partner_sector_assignments')
        .select('slot_id')
        .eq('delivery_partner_id', selectedPartnerForSector.id)
        .eq('sector_id', selectedSector)
        .eq('assigned_date', assignedDate)
        .eq('is_active', true);

      if (checkError) throw checkError;

      // Filter out slots that are already assigned
      const existingSlotIds = existingAssignments?.map(a => a.slot_id) || [];
      const newSlotIds = selectedSlots.filter(slotId => !existingSlotIds.includes(slotId));
      
      if (newSlotIds.length === 0) {
        toast.error('All selected slots are already assigned to this partner for today');
        return;
      }

      // Create sector assignments for new slots only
      const sectorAssignments = newSlotIds.map(slotId => ({
        delivery_partner_id: selectedPartnerForSector.id,
        sector_id: selectedSector,
        slot_id: slotId,
        assigned_date: assignedDate,
        is_active: true
      }));

      const { error: sectorError } = await supabase
        .from('delivery_partner_sector_assignments')
        .insert(sectorAssignments);

      if (sectorError) throw sectorError;

      // Check for existing delivery assignments to avoid duplicates
      const { data: existingDeliveryAssignments, error: deliveryCheckError } = await supabase
        .from('delivery_assignments')
        .select('slot_id')
        .eq('delivery_partner_id', selectedPartnerForSector.id)
        .eq('assigned_date', assignedDate);

      if (deliveryCheckError) throw deliveryCheckError;

      // Filter out slots that already have delivery assignments
      const existingDeliverySlotIds = existingDeliveryAssignments?.map(a => a.slot_id) || [];
      const newDeliverySlotIds = newSlotIds.filter(slotId => !existingDeliverySlotIds.includes(slotId));

      // Create delivery assignments for backward compatibility (only for new slots)
      if (newDeliverySlotIds.length > 0) {
        const deliveryAssignments = newDeliverySlotIds.map(slotId => ({
          delivery_partner_id: selectedPartnerForSector.id,
          slot_id: slotId,
          assigned_date: assignedDate,
          sector_id: selectedSector,
          max_orders: 30,
          current_orders: 0,
          status: 'assigned'
        }));

        const { error: deliveryError } = await supabase
          .from('delivery_assignments')
          .insert(deliveryAssignments);

        if (deliveryError) {
          console.warn('Warning: Failed to create delivery assignments for backward compatibility:', deliveryError);
          // Don't throw error here as the main sector assignment succeeded
        }
      }

      // Update delivery partner's assigned pincodes
      const sector = sectors.find(s => s.id === selectedSector);
      if (sector) {
        // Get current assigned pincodes and merge with new sector pincodes
        const currentPincodes = selectedPartnerForSector.assigned_pincodes || [];
        const newPincodes = sector.pincodes.map(String);
        const mergedPincodes = [...new Set([...currentPincodes, ...newPincodes])];
        
        await handleUpdatePartner(selectedPartnerForSector.id, {
          assigned_pincodes: mergedPincodes
        });
      }

      const assignedCount = newSlotIds.length;
      const skippedCount = selectedSlots.length - assignedCount;
      
      let message = `Successfully assigned ${assignedCount} slot${assignedCount !== 1 ? 's' : ''} to ${selectedPartnerForSector.full_name}`;
      if (skippedCount > 0) {
        message += ` (${skippedCount} slot${skippedCount !== 1 ? 's' : ''} were already assigned)`;
      }
      
      toast.success(message);
      setSectorAssignmentDialog(false);
      setSelectedSector('');
      setSelectedSlots([]);
      setSelectedPartnerForSector(null);
      loadDeliveryPartners();
    } catch (error) {
      console.error('Error assigning sector:', error);
      toast.error(`Failed to assign sector: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmittingSectorAssignment(false);
    }
  };

  const handleOpenSectorAssignment = async (partner: DeliveryPartner) => {
    setSelectedPartnerForSector(partner);
    
    // Reload sectors and slots to ensure we have the latest data
    await Promise.all([
      loadSectors(),
      loadAvailableSlots()
    ]);
    
    setSectorAssignmentDialog(true);
  };

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
          </div>
        </div>

        {/* Auto-Assignment Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Delivery Assignment Management
            </CardTitle>
            <CardDescription>
              Automatically assign delivery partners to slots with orders, or reset all assignments for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={handleAutoAssignDeliveryPartners}
                disabled={autoAssignLoading}
                className="flex items-center gap-2"
              >
                {autoAssignLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {autoAssignLoading ? 'Assigning...' : 'Auto-Assign Delivery Partners'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetAllAssignments}
                disabled={resetAssignLoading}
                className="flex items-center gap-2"
              >
                {resetAssignLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {resetAssignLoading ? 'Resetting...' : 'Reset All Assignments'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search partners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
                      <Badge variant={partner.is_verified ? "default" : "secondary"}>
                        {partner.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant="outline">
                        Rating: {partner.rating.toFixed(1)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      <p>📱 {partner.phone}</p>
                      <p>🚗 {partner.vehicle_type} - {partner.vehicle_number}</p>
                      <p>📍 {partner.assigned_pincodes.length > 0 ? partner.assigned_pincodes.join(", ") : "No sectors assigned"}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span>Total Deliveries: {partner.total_deliveries}</span>
                      <span>Success Rate: {((partner.successful_deliveries / partner.total_deliveries) * 100 || 0).toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenSectorAssignment(partner)}
                      >
                        <MapPin size={16} className="mr-1" />
                        Assign Sector
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

      {/* Sector Assignment Dialog */}
      <Dialog open={sectorAssignmentDialog} onOpenChange={setSectorAssignmentDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Assign Sector & Slots to Delivery Partner</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await Promise.all([
                    loadSectors(),
                    loadAvailableSlots()
                  ]);
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </Button>
            </DialogTitle>
            <DialogDescription>
              {selectedPartnerForSector && 
                `Assign delivery sector and time slots to ${selectedPartnerForSector.full_name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sector Selection */}
            <div className="space-y-2">
              <Label htmlFor="sector-select">Select Delivery Sector *</Label>
              {sectors.length === 0 ? (
                <div className="p-3 border rounded-lg bg-yellow-50 text-yellow-800">
                  <p className="text-sm">
                    No delivery sectors found. Please ensure sectors are created in the system.
                  </p>
                </div>
              ) : (
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger id="sector-select">
                    <SelectValue placeholder="Choose a delivery sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.filter(sector => sector.is_active).map(sector => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}, {sector.city_name} ({sector.pincodes.join(', ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="text-xs text-gray-500">
                Available sectors: {sectors.filter(sector => sector.is_active).length} / Total sectors: {sectors.length}
              </div>
            </div>

            {/* Slot Selection */}
            <div className="space-y-3">
              <Label>Select Time Slots *</Label>
              <div className="text-sm text-gray-600 mb-2">
                Choose which time slots this delivery partner will handle
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {availableSlots.filter(slot => slot.sector_id === selectedSector).map(slot => (
                  <div key={slot.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`slot-${slot.id}`}
                      checked={selectedSlots.includes(slot.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSlots([...selectedSlots, slot.id]);
                        } else {
                          setSelectedSlots(selectedSlots.filter(id => id !== slot.id));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`slot-${slot.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{slot.slot_name}</div>
                      <div className="text-sm text-gray-500">
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <div className="text-sm text-gray-500">
                        {slot.sector?.name}, {slot.sector?.city_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Max Orders: {slot.max_orders}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Summary */}
            {selectedSector && selectedSlots.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Assignment Summary</h4>
                <div className="text-sm text-blue-800">
                  <div className="mb-1">
                    <strong>Sector:</strong> {sectors.find(s => s.id === selectedSector)?.name}, {sectors.find(s => s.id === selectedSector)?.city_name}
                  </div>
                  <div className="mb-1">
                    <strong>Pincodes:</strong> {sectors.find(s => s.id === selectedSector)?.pincodes.join(', ')}
                  </div>
                  <div>
                    <strong>Slots:</strong> {selectedSlots.length} selected
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSectorAssignmentDialog(false);
                setSelectedSector('');
                setSelectedSlots([]);
                setSelectedPartnerForSector(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignSectorToPartner}
              disabled={!selectedSector || selectedSlots.length === 0 || submittingSectorAssignment}
            >
              {submittingSectorAssignment ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Assign Sector & Slots
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryPartnerManagement; 
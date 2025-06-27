import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  Eye,
  Edit,
  Wallet,
  Calendar,
  Star,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText,
  Settings,
  AlertTriangle,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { supabase, supabaseServiceRole } from '../lib/supabase';
import { CommissionAPI, WalletAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Vendor {
  id: string;
  business_name: string;
  business_email: string;
  contact_phone: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_pincode: string;
  gstin: string;
  pan_number: string;
  rating: number;
  total_sales: number;
  is_verified: boolean;
  is_active: boolean;
  rejection_reason: string | null;
  verification_notes: string | null;
  joined_at: string;
  profile: {
    full_name: string;
    email: string;
  };
  wallet?: {
    pending_balance: number;
    available_balance: number;
    total_earned: number;
    total_commission_paid: number;
    average_commission_rate: number;
  };
}

interface Category {
  id: string;
  name: string;
}

interface CommissionRule {
  id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number | null;
  is_active: boolean;
  category?: {
    name: string;
  };
}

interface VendorCommissionOverride {
  id: string;
  vendor_id: string;
  category_id: string;
  commission_percentage: number;
  minimum_commission: number;
  maximum_commission: number;
  is_active: boolean;
  reason: string;
  category: {
    name: string;
  };
}

const AdminVendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, profile: currentProfile } = useAuth();
  
  // State management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [vendorOverrides, setVendorOverrides] = useState<VendorCommissionOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);

  // Commission form state
  const [commissionForm, setCommissionForm] = useState({
    category_id: '',
    commission_percentage: 10,
    minimum_commission: 0,
    maximum_commission: null as number | null,
    reason: ''
  });

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchTerm === '' || 
      vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.business_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'verified' && vendor.is_verified) ||
      (filterStatus === 'unverified' && !vendor.is_verified) ||
      (filterStatus === 'active' && vendor.is_active) ||
      (filterStatus === 'inactive' && !vendor.is_active);
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    loadVendors();
    loadCategories();
    loadCommissionRules();
  }, []);

  const loadVendors = async () => {
    try {
      console.log('Loading vendors...');
      
      // Check if service role client is available
      if (!supabaseServiceRole) {
        console.error('Service role client not available!');
        throw new Error('Service role client not available. Please check your VITE_SUPABASE_SERVICE_ROLE_KEY environment variable.');
      }
      
      // Use service role for admin operations to bypass RLS
      const { data, error } = await supabaseServiceRole
        .from('vendors')
        .select(`
          *,
          profile:profiles(full_name, email),
          wallet:vendor_wallets(
            pending_balance,
            available_balance,
            total_earned,
            total_commission_paid,
            average_commission_rate
          )
        `)
        .order('created_at', { ascending: false });

      console.log('Vendor query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Create missing vendor wallets if they don't exist
      if (data && data.length > 0) {
        for (const vendor of data) {
          if (!vendor.wallet) {
            console.log(`Creating wallet for vendor: ${vendor.business_name}`);
            const { error: walletError } = await supabaseServiceRole
              .from('vendor_wallets')
              .insert({
                vendor_id: vendor.id,
                pending_balance: 0,
                available_balance: 0,
                total_earned: 0,
                total_commission_paid: 0,
                average_commission_rate: 0
              });
            
            if (walletError) {
              console.error('Error creating wallet:', walletError);
            }
          }
        }
      }

      setVendors(data || []);
      console.log(`Loaded ${data?.length || 0} vendors`);
    } catch (error: any) {
      console.error('Error loading vendors:', error);
      toast({
        title: "Error",
        description: `Failed to load vendors: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCommissionRules = async () => {
    try {
      const response = await CommissionAPI.getCommissionRules();
      if (response.success && response.data) {
        setCommissionRules(response.data);
      }
    } catch (error) {
      console.error('Error loading commission rules:', error);
    }
  };

  const loadVendorCommissions = async (vendorId: string) => {
    try {
      const response = await CommissionAPI.getVendorCommissionOverrides(vendorId);
      if (response.success && response.data) {
        setVendorOverrides(response.data);
      }
    } catch (error) {
      console.error('Error loading vendor commissions:', error);
    }
  };

  const handleVendorAction = async (vendorId: string, action: 'approve' | 'reject' | 'activate' | 'deactivate') => {
    try {
      let updateData: any = {};
      
      switch (action) {
        case 'approve':
          updateData = { 
            is_verified: true, 
            is_active: true,
            rejection_reason: null,
            updated_at: new Date().toISOString()
          };
          break;
        case 'reject':
          const reason = prompt('Please provide a reason for rejection:');
          if (!reason) return;
          updateData = { 
            is_verified: false, 
            is_active: false,
            rejection_reason: reason,
            updated_at: new Date().toISOString()
          };
          break;
        case 'activate':
          updateData = { 
            is_active: true,
            updated_at: new Date().toISOString()
          };
          break;
        case 'deactivate':
          updateData = { 
            is_active: false,
            updated_at: new Date().toISOString()
          };
          break;
      }

      console.log(`🔄 ${action}ing vendor ${vendorId}...`);

      const { data, error } = await supabaseServiceRole
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId)
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to ${action} vendor:`, error);
        toast({
          title: "Error",
          description: `Failed to ${action} vendor: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log(`✅ Successfully ${action}d vendor:`, data);

      toast({
        title: "Success",
        description: `Vendor ${action}d successfully`,
      });

      // If approving a vendor, ensure they have a wallet
      if (action === 'approve') {
        console.log('🔄 Checking vendor wallet...');
        try {
          const { data: existingWallet } = await supabaseServiceRole
            .from('vendor_wallets')
            .select('id')
            .eq('vendor_id', vendorId)
            .single();

          if (!existingWallet) {
            console.log('💰 Creating vendor wallet...');
            const { error: walletError } = await supabaseServiceRole
              .from('vendor_wallets')
              .insert({
                vendor_id: vendorId,
                pending_balance: 0,
                available_balance: 0,
                reserved_balance: 0,
                total_earned: 0,
                total_paid_out: 0,
                today_earnings: 0,
                week_earnings: 0,
                month_earnings: 0,
                total_commission_paid: 0,
                average_commission_rate: 10,
                minimum_payout_amount: 1000,
                auto_payout_enabled: false,
                payout_frequency: 'weekly'
              });

            if (walletError) {
              console.error('⚠️ Failed to create vendor wallet:', walletError);
            } else {
              console.log('✅ Vendor wallet created successfully');
            }
          }
        } catch (walletError) {
          console.error('⚠️ Error handling vendor wallet:', walletError);
        }
      }

      // Refresh vendor list
      await loadVendors();
    } catch (error: any) {
      console.error(`Error ${action}ing vendor:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} vendor: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateCommissionOverride = async () => {
    if (!selectedVendor || !commissionForm.category_id) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating commission override...', {
        vendorId: selectedVendor.id,
        categoryId: commissionForm.category_id,
        commissionPercentage: commissionForm.commission_percentage,
        minimumCommission: commissionForm.minimum_commission,
        maximumCommission: commissionForm.maximum_commission,
        reason: commissionForm.reason,
        createdBy: currentProfile?.id
      });

      const { data, error } = await supabase
        .from('vendor_commission_overrides')
        .insert([{
          vendor_id: selectedVendor.id,
          category_id: commissionForm.category_id,
          commission_percentage: commissionForm.commission_percentage,
          minimum_commission: commissionForm.minimum_commission,
          maximum_commission: commissionForm.maximum_commission,
          reason: commissionForm.reason,
          created_by: currentProfile?.id || null,
        }])
        .select();

      console.log('Commission override result:', { data, error });

      if (error) {
        console.error('Error creating override:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Commission override created successfully"
      });

      // Reset form
      setCommissionForm({
        category_id: '',
        commission_percentage: 10,
        minimum_commission: 0,
        maximum_commission: null,
        reason: ''
      });

      setShowCommissionDialog(false);
      loadVendorCommissions(selectedVendor.id);
    } catch (error: any) {
      console.error('Failed to create commission override:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create commission override",
        variant: "destructive",
      });
    }
  };

  const openVendorDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDialog(true);
    loadVendorCommissions(vendor.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/admin-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Vendor Management</h1>
            <p className="text-gray-600">Manage and oversee all vendors in the platform</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">
              {vendors.filter(v => v.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Vendors</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.filter(v => v.is_verified).length}</div>
            <p className="text-xs text-muted-foreground">
              {vendors.filter(v => !v.is_verified).length} pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{vendors.reduce((sum, v) => sum + (v.total_sales || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform-wide sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.length > 0 
                ? (vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Vendor ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Vendors ({filteredVendors.length})
          </CardTitle>
          <CardDescription>
            Manage vendor accounts, verification status, and commission settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {vendor.business_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{vendor.business_name}</h3>
                      <p className="text-sm text-gray-600">{vendor.profile.full_name}</p>
                      <p className="text-xs text-gray-500">{vendor.business_email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant={vendor.is_verified ? "default" : "secondary"}>
                        {vendor.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant={vendor.is_active ? "default" : "destructive"}>
                        {vendor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Sales:</span>
                      <span className="ml-1 font-medium">₹{(vendor.total_sales || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Rating:</span>
                      <span className="ml-1 font-medium">{(vendor.rating || 0).toFixed(1)}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <span className="ml-1 font-medium">{vendor.business_city}, {vendor.business_state}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Joined:</span>
                      <span className="ml-1 font-medium">{new Date(vendor.joined_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openVendorDetails(vendor)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {!vendor.is_verified && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleVendorAction(vendor.id, 'approve')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  
                  {!vendor.is_verified && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleVendorAction(vendor.id, 'reject')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                  
                  {vendor.is_verified && (
                    <Button
                      variant={vendor.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleVendorAction(vendor.id, vendor.is_active ? 'deactivate' : 'activate')}
                    >
                      {vendor.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredVendors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No vendors found matching your filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vendor Details Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>{selectedVendor?.business_name}</span>
            </DialogTitle>
            <DialogDescription>
              Complete vendor profile and management options
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="commission">Commission</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <div className="font-medium">{selectedVendor.business_name}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <div className="font-medium">{selectedVendor.profile.full_name}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="font-medium">{selectedVendor.business_email}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div className="font-medium">{selectedVendor.contact_phone}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <div className="font-medium">
                    {selectedVendor.business_address}, {selectedVendor.business_city}, {selectedVendor.business_state} - {selectedVendor.business_pincode}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <div className="font-medium">{selectedVendor.gstin}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <div className="font-medium">{selectedVendor.pan_number}</div>
                  </div>
                </div>

                {selectedVendor.rejection_reason && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Rejection Reason:</strong> {selectedVendor.rejection_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Pending Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        ₹{(selectedVendor.wallet?.pending_balance || 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Available Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        ₹{(selectedVendor.wallet?.available_balance || 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        ₹{(selectedVendor.wallet?.total_earned || 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commission Paid</Label>
                    <div className="text-xl font-semibold">
                      ₹{(selectedVendor.wallet?.total_commission_paid || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Average Commission Rate</Label>
                    <div className="text-xl font-semibold">
                      {(selectedVendor.wallet?.average_commission_rate || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="commission" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Commission Overrides</h3>
                  <Button onClick={() => setShowCommissionDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>

                <div className="space-y-2">
                  {vendorOverrides.map((override) => (
                    <div key={override.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{override.category.name}</h4>
                        <p className="text-sm text-gray-600">{override.commission_percentage}% commission</p>
                        <p className="text-xs text-gray-500">{override.reason}</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  ))}
                  {vendorOverrides.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No commission overrides set
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Commission Override Dialog */}
      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Commission Override</DialogTitle>
            <DialogDescription>
              Set a custom commission rate for {selectedVendor?.business_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={commissionForm.category_id}
                onValueChange={(value) => setCommissionForm(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Commission Percentage</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissionForm.commission_percentage}
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, commission_percentage: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Minimum Commission (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={commissionForm.minimum_commission}
                  onChange={(e) => setCommissionForm(prev => ({ ...prev, minimum_commission: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Maximum Commission (₹) - Optional</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={commissionForm.maximum_commission || ''}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, maximum_commission: e.target.value ? parseFloat(e.target.value) : null }))}
              />
            </div>

            <div>
              <Label>Reason for Override</Label>
              <Textarea
                value={commissionForm.reason}
                onChange={(e) => setCommissionForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this vendor gets special commission rate..."
              />
            </div>

            <Button onClick={handleCreateCommissionOverride} className="w-full">
              Create Override
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendorManagement; 
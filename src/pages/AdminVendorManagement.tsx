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
  ArrowLeft,
  Trash2
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
import { CommissionAPI, WalletAPI, VendorCommissionOverride, CommissionRule } from '../lib/api';
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

interface QualityCategory {
  id: string;
  name: string;
}

interface SmartphoneModel {
  id: string;
  model_name: string;
}

const AdminVendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, profile: currentProfile } = useAuth();

  // State management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualityCategories, setQualityCategories] = useState<QualityCategory[]>([]);
  const [smartphoneModels, setSmartphoneModels] = useState<SmartphoneModel[]>([]);
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
    quality_id: '',
    smartphone_model_id: '',
    commission_percentage: 10,
    minimum_commission: 0,
    maximum_commission: null as number | null,
    reason: ''
  });

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchTerm === '' ||
      (vendor.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.business_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

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
    loadQualityCategories();
    loadSmartphoneModels();
  }, []);

  const loadVendors = async () => {
    try {
      console.log('Loading vendors...');

      // Check if service role client is available
      if (!supabaseServiceRole || supabaseServiceRole === supabase) {
        console.warn('Service role client not available! Falling back to regular client with limited access.');

        // Fallback to regular client for basic vendor information
        const { data, error } = await supabase
          .from('vendors')
          .select(`
            *,
            profile:profiles(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error with fallback:', error);
          toast({
            title: "Warning",
            description: "Limited access mode. Some admin features may not work properly. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
            variant: "destructive",
          });
        }

        // Set vendors with empty wallet data since we can't access wallets without service role
        const vendorsWithEmptyWallets = (data || []).map(vendor => ({
          ...vendor,
          wallet: {
            pending_balance: 0,
            available_balance: 0,
            total_earned: 0,
            total_commission_paid: 0,
            average_commission_rate: 0
          }
        }));

        setVendors(vendorsWithEmptyWallets);
        console.log(`Loaded ${vendorsWithEmptyWallets.length} vendors in fallback mode`);
        return;
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
            try {
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
            } catch (walletError) {
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

      // Set empty vendors array to prevent blank page
      setVendors([]);
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
      // Check if service role is available
      if (!supabaseServiceRole || supabaseServiceRole === supabase) {
        console.warn('Service role not available, cannot load commission overrides');
        setVendorOverrides([]);
        return;
      }

      const response = await CommissionAPI.getVendorCommissionOverrides(vendorId);
      if (response.success && response.data) {
        setVendorOverrides(response.data);
      } else {
        setVendorOverrides([]);
      }
    } catch (error) {
      console.error('Error loading vendor commissions:', error);
      setVendorOverrides([]);
    }
  };

  const loadQualityCategories = async () => {
    try {
      console.log('Loading quality categories...');
      const { data, error } = await supabase
        .from('category_qualities')
        .select('id, quality_name')
        .eq('is_active', true)
        .order('quality_name');

      if (error) {
        console.error('Error loading quality categories:', error);
        throw error;
      }

      // Map quality_name to name for component compatibility
      const mappedData = data?.map(item => ({
        id: item.id,
        name: item.quality_name
      })) || [];

      console.log(`Loaded ${mappedData.length} quality categories:`, mappedData);
      setQualityCategories(mappedData);
    } catch (error) {
      console.error('Error loading quality categories:', error);
      setQualityCategories([]); // Set empty array on error
    }
  };

  const loadSmartphoneModels = async () => {
    try {
      const { data, error } = await supabase
        .from('smartphone_models')
        .select('id, model_name')
        .eq('is_active', true)
        .order('model_name');

      if (error) throw error;
      setSmartphoneModels(data || []);
    } catch (error) {
      console.error('Error loading smartphone models:', error);
    }
  };

  const handleVendorAction = async (vendorId: string, action: 'approve' | 'reject' | 'activate' | 'deactivate') => {
    try {
      console.log(`🔄 Attempting to ${action} vendor:`, vendorId);

      // Check if service role is available for vendor actions
      if (!supabaseServiceRole || supabaseServiceRole === supabase) {
        toast({
          title: "Error",
          description: `${action} vendor requires admin privileges. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY.`,
          variant: "destructive"
        });
        return;
      }

      let updateData: any = {};

      switch (action) {
        case 'approve':
          updateData = {
            is_verified: true,
            is_active: true,
            verification_notes: `Approved by admin on ${new Date().toISOString()}`,
            rejection_reason: null
          };
          break;
        case 'reject':
          const reason = prompt('Please enter rejection reason:');
          if (!reason) return;
          updateData = {
            is_verified: false,
            is_active: false,
            rejection_reason: reason,
            verification_notes: `Rejected by admin on ${new Date().toISOString()}: ${reason}`
          };
          break;
        case 'activate':
          updateData = { is_active: true };
          break;
        case 'deactivate':
          updateData = { is_active: false };
          break;
      }

      console.log(`📝 Updating vendor with data:`, updateData);

      const { data, error } = await supabaseServiceRole
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId)
        .select();

      if (error) {
        console.error(`❌ Failed to ${action} vendor:`, error);
        toast({
          title: "Error",
          description: `Failed to ${action} vendor: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log(`✅ Successfully ${action}ed vendor:`, data);

      toast({
        title: "Success",
        description: `Vendor ${action}ed successfully`,
      });

      // For newly approved vendors, create a wallet if it doesn't exist
      if (action === 'approve') {
        try {
          // Check if wallet already exists
          const { data: existingWallet } = await supabaseServiceRole
            .from('vendor_wallets')
            .select('id')
            .eq('vendor_id', vendorId)
            .single();

          if (!existingWallet) {
            console.log(`💰 Creating wallet for newly approved vendor: ${vendorId}`);
            const { error: walletError } = await supabaseServiceRole
              .from('vendor_wallets')
              .insert({
                vendor_id: vendorId,
                pending_balance: 0,
                available_balance: 0,
                total_earned: 0,
                total_commission_paid: 0,
                average_commission_rate: 10,
                minimum_payout_amount: 100,
                payout_frequency: 'weekly',
                auto_payout_enabled: false,
                payment_details: null,
                last_payout_date: null,
                next_payout_date: null,
                total_transactions: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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

      // Reload vendors to reflect changes
      loadVendors();
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

    // Additional validation
    if (commissionForm.commission_percentage <= 0 || commissionForm.commission_percentage > 100) {
      toast({
        title: "Error",
        description: "Commission percentage must be between 0.1% and 100%",
        variant: "destructive"
      });
      return;
    }

    if (commissionForm.minimum_commission < 0) {
      toast({
        title: "Error",
        description: "Minimum commission cannot be negative",
        variant: "destructive"
      });
      return;
    }

    if (commissionForm.maximum_commission !== null && commissionForm.maximum_commission < commissionForm.minimum_commission) {
      toast({
        title: "Error",
        description: "Maximum commission must be greater than or equal to minimum commission",
        variant: "destructive"
      });
      return;
    }

    // Check if service role is available for commission overrides
    if (!supabaseServiceRole || supabaseServiceRole === supabase) {
      toast({
        title: "Error",
        description: "Commission overrides require admin privileges. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
        variant: "destructive"
      });
      return;
    }

    if (!currentProfile?.id) {
      toast({
        title: "Error",
        description: "Unable to identify current user. Please log in again.",
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
        qualityId: commissionForm.quality_id,
        smartphoneModelId: commissionForm.smartphone_model_id,
        createdBy: currentProfile.id
      });

      // Use CommissionAPI for better error handling and consistency
      const response = await CommissionAPI.createVendorCommissionOverride({
        vendorId: selectedVendor.id,
        categoryId: commissionForm.category_id,
        commissionPercentage: commissionForm.commission_percentage,
        minimumCommission: commissionForm.minimum_commission,
        maximumCommission: commissionForm.maximum_commission,
        reason: commissionForm.reason || undefined,
        createdBy: currentProfile.id,
        qualityId: commissionForm.quality_id || undefined,
        smartphoneModelId: commissionForm.smartphone_model_id || undefined,
      });

      console.log('Commission override result:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create commission override');
      }

      toast({
        title: "Success",
        description: "Commission override created successfully"
      });

      // Reset form
      setCommissionForm({
        category_id: '',
        quality_id: '',
        smartphone_model_id: '',
        commission_percentage: 10,
        minimum_commission: 0,
        maximum_commission: null,
        reason: ''
      });

      setShowCommissionDialog(false);
      loadVendorCommissions(selectedVendor.id);
    } catch (error: any) {
      console.error('Failed to create commission override:', error);

      // Provide more specific error messages
      let errorMessage = error.message || "Failed to create commission override";

      if (error.message?.includes('duplicate key')) {
        errorMessage = "A commission override already exists for this vendor and category combination.";
      } else if (error.message?.includes('permission denied')) {
        errorMessage = "Permission denied. Please ensure you have admin privileges.";
      } else if (error.message?.includes('foreign key')) {
        errorMessage = "Invalid vendor, category, or other reference data.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!selectedVendor) return;

    // Check if service role is available
    if (!supabaseServiceRole || supabaseServiceRole === supabase) {
      toast({
        title: "Error",
        description: "Deleting commission overrides requires admin privileges. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm("Are you sure you want to delete this commission override?")) {
      try {
        const { error } = await supabaseServiceRole
          .from('vendor_commission_overrides')
          .delete()
          .eq('id', overrideId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Commission override deleted successfully",
        });
        loadVendorCommissions(selectedVendor.id); // Reload overrides
      } catch (error: any) {
        console.error('Error deleting commission override:', error);
        toast({
          title: "Error",
          description: `Failed to delete commission override: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const openVendorDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDialog(true);
    loadVendorCommissions(vendor.id);
  };

  // Test function for debugging commission overrides
  const testCommissionOverrides = async () => {
    console.log('🧪 Testing Commission Override Functionality...');

    try {
      // Test 1: Check service role availability
      console.log('1. Service Role Check:', {
        serviceRoleAvailable: !!supabaseServiceRole,
        differentFromRegular: supabaseServiceRole !== supabase,
        currentProfile: currentProfile?.id,
        currentRole: currentProfile?.role
      });

      // Test 2: Check table access
      if (supabaseServiceRole && supabaseServiceRole !== supabase) {
        const { data: testData, error: testError } = await supabaseServiceRole
          .from('vendor_commission_overrides')
          .select('id')
          .limit(1);

        console.log('2. Table Access Test:', {
          error: testError?.message,
          hasData: !!testData,
          dataLength: testData?.length
        });

        // Test 3: Check categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .limit(5);

        console.log('3. Categories Test:', {
          error: categoriesError?.message,
          count: categoriesData?.length,
          categories: categoriesData?.map(c => c.name)
        });

        // Test 4: Test API function
        const apiResponse = await CommissionAPI.getVendorCommissionOverrides();
        console.log('4. API Test:', {
          success: apiResponse.success,
          error: apiResponse.error,
          dataCount: apiResponse.data?.length
        });

        // Test 5: Check form data
        console.log('5. Form Data Check:', {
          categoriesLoaded: categories.length,
          qualityCategoriesLoaded: qualityCategories.length,
          smartphoneModelsLoaded: smartphoneModels.length,
          commissionRulesLoaded: commissionRules.length
        });

        const allTestsPassed = !testError && !categoriesError && apiResponse.success;

        toast({
          title: allTestsPassed ? "✅ Debug Complete - All Tests Passed!" : "⚠️ Debug Complete - Some Issues Found",
          description: `Check console for detailed test results. ${allTestsPassed ? 'Commission overrides should work correctly.' : 'There may be configuration issues.'}`,
          variant: allTestsPassed ? "default" : "destructive"
        });
      } else {
        toast({
          title: "Service Role Missing",
          description: "Service role client not available for testing. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Test error:', error);
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600">Manage vendor accounts, verification, and commission settings</p>
        </div>
        <div className="flex gap-2">
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={testCommissionOverrides}
              variant="outline"
              className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
            >
              🧪 Debug Commission
            </Button>
          )}
          <Button onClick={() => navigate('/admin-dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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
                      {(vendor.business_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{vendor.business_name || 'Unnamed Business'}</h3>
                      <p className="text-sm text-gray-600">{vendor.profile?.full_name || 'Unknown Owner'}</p>
                      <p className="text-xs text-gray-500">{vendor.business_email || 'No email provided'}</p>
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
                      <span className="ml-1 font-medium">
                        {[vendor.business_city, vendor.business_state].filter(Boolean).join(', ') || 'Location not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Joined:</span>
                      <span className="ml-1 font-medium">
                        {vendor.joined_at ? new Date(vendor.joined_at).toLocaleDateString() : 'Date not available'}
                      </span>
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
                    <div className="font-medium">{selectedVendor.business_name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <div className="font-medium">{selectedVendor.profile?.full_name || 'Not provided'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="font-medium">{selectedVendor.business_email || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div className="font-medium">{selectedVendor.contact_phone || 'Not provided'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <div className="font-medium">
                    {[
                      selectedVendor.business_address,
                      selectedVendor.business_city,
                      selectedVendor.business_state,
                      selectedVendor.business_pincode
                    ].filter(Boolean).join(', ') || 'Address not provided'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <div className="font-medium">{selectedVendor.gstin || 'Not provided'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <div className="font-medium">{selectedVendor.pan_number || 'Not provided'}</div>
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
                {(!supabaseServiceRole || supabaseServiceRole === supabase) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Limited Access:</strong> Commission override features require admin privileges. Please configure VITE_SUPABASE_SERVICE_ROLE_KEY to enable these features.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Commission Overrides</h3>
                  <Button
                    onClick={() => setShowCommissionDialog(true)}
                    disabled={!supabaseServiceRole || supabaseServiceRole === supabase}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>

                <div className="space-y-2">
                  {vendorOverrides.map((override) => (
                    <div key={override.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{override.category?.name || 'Unknown Category'}
                          {override.quality && <span className="text-sm text-gray-500"> / {override.quality.name}</span>}
                          {override.model && <span className="text-sm text-gray-500"> / {override.model.model_name}</span>}
                        </h4>
                        <p className="text-sm text-gray-600">{override.commission_percentage}% commission</p>
                        <p className="text-xs text-gray-500">Min: ₹{override.minimum_commission} {override.maximum_commission ? `Max: ₹${override.maximum_commission}` : ''}</p>
                        {override.reason && <p className="text-xs text-gray-500">Reason: {override.reason}</p>}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOverride(override.id)}
                        disabled={!supabaseServiceRole || supabaseServiceRole === supabase}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {vendorOverrides.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      {(!supabaseServiceRole || supabaseServiceRole === supabase)
                        ? 'Commission overrides require admin privileges'
                        : 'No commission overrides set'
                      }
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

            <div>
              <Label>Quality (Optional)</Label>
              <Select
                value={commissionForm.quality_id || 'none'}
                onValueChange={(value) => setCommissionForm(prev => ({ ...prev, quality_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {qualityCategories.map((quality) => (
                    <SelectItem key={quality.id} value={quality.id}>
                      {quality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Smartphone Model (Optional)</Label>
              <Select
                value={commissionForm.smartphone_model_id || 'none'}
                onValueChange={(value) => setCommissionForm(prev => ({ ...prev, smartphone_model_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select smartphone model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {smartphoneModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.model_name}
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
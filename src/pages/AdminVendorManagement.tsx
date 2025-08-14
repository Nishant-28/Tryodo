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
  Trash2,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

interface VendorProfile {
  id: string;
  profile_id: string;
  business_name: string;
  business_email: string;
  business_registration?: string;
  gstin?: string;
  rating: number;
  total_reviews: number;
  total_sales: number;
  is_verified: boolean;
  is_active: boolean;
  auto_approve_orders: boolean;
  order_confirmation_timeout_minutes: number;
  auto_approve_under_amount?: number;
  business_hours_start: string;
  business_hours_end: string;
  auto_approve_during_business_hours_only: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Profile information
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  // Financial summary
  financial_summary?: {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    completed_orders: number;
    commission_earned: number;
    average_order_value: number;
  };
}

const AdminVendorManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter vendors based on search and status
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchTerm === '' ||
      (vendor.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.business_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor.profile?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'pending' && !vendor.is_verified && vendor.is_active) ||
      (filterStatus === 'verified' && vendor.is_verified) ||
      (filterStatus === 'unverified' && !vendor.is_verified) ||
      (filterStatus === 'active' && vendor.is_active) ||
      (filterStatus === 'inactive' && !vendor.is_active);

    return matchesSearch && matchesStatus;
  });

  // Load vendors data
  const loadVendors = async () => {
    try {
      console.log('🔄 Loading vendors...');
      setRefreshing(true);

      // Fetch vendors with profile information
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          profiles!vendors_profile_id_fkey (
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (vendorsError) {
        console.error('❌ Error loading vendors:', vendorsError);
        throw vendorsError;
      }

      console.log('📊 Raw vendors data:', vendorsData);

      // Process vendors data and add financial summaries
      const processedVendors = await Promise.all(
        (vendorsData || []).map(async (vendor) => {
          try {
            // Get financial summary for each vendor
            const financialSummary = await getVendorFinancialSummary(vendor.id);
            
            return {
              ...vendor,
              profile: Array.isArray(vendor.profiles) ? vendor.profiles[0] : vendor.profiles,
              financial_summary: financialSummary
            };
          } catch (error) {
            console.error(`⚠️ Error processing vendor ${vendor.id}:`, error);
            return {
              ...vendor,
              profile: Array.isArray(vendor.profiles) ? vendor.profiles[0] : vendor.profiles,
              financial_summary: {
                total_orders: 0,
                total_revenue: 0,
                pending_orders: 0,
                completed_orders: 0,
                commission_earned: 0,
                average_order_value: 0
              }
            };
          }
        })
      );

      console.log('✅ Processed vendors:', processedVendors.length);
      setVendors(processedVendors);

    } catch (error: any) {
      console.error('💥 Error loading vendors:', error);
      toast({
        title: "Error",
        description: `Failed to load vendors: ${error.message}`,
        variant: "destructive",
      });
      setVendors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Get financial summary for a vendor
  const getVendorFinancialSummary = async (vendorId: string) => {
    try {
      // Get order statistics
      const { data: orderStats, error: orderError } = await supabase
        .from('order_items')
        .select('item_status, line_total, quantity, created_at')
        .eq('vendor_id', vendorId);

      if (orderError) {
        console.error('Error fetching order stats:', orderError);
        return {
          total_orders: 0,
          total_revenue: 0,
          pending_orders: 0,
          completed_orders: 0,
          commission_earned: 0,
          average_order_value: 0
        };
      }

      const totalOrders = orderStats?.length || 0;
      const totalRevenue = orderStats?.reduce((sum, order) => sum + (order.line_total || 0), 0) || 0;
      const pendingOrders = orderStats?.filter(order => order.item_status === 'pending').length || 0;
      const completedOrders = orderStats?.filter(order => order.item_status === 'delivered').length || 0;
      const commissionEarned = totalRevenue * 0.1; // Assuming 10% commission
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        commission_earned: commissionEarned,
        average_order_value: averageOrderValue
      };
    } catch (error) {
      console.error('Error calculating financial summary:', error);
      return {
        total_orders: 0,
        total_revenue: 0,
        pending_orders: 0,
        completed_orders: 0,
        commission_earned: 0,
        average_order_value: 0
      };
    }
  };

  // Handle vendor actions (approve, reject, activate, deactivate)
  const handleVendorAction = async (vendorId: string, action: 'approve' | 'reject' | 'activate' | 'deactivate') => {
    try {
      console.log(`🔄 ${action}ing vendor:`, vendorId);
      setActionLoading(vendorId);

      let updateData: any = {};

      switch (action) {
        case 'approve':
          updateData = {
            is_verified: true,
            is_active: true,
            updated_at: new Date().toISOString()
          };
          break;
        case 'reject':
          if (!rejectionReason.trim()) {
            toast({
              title: "Error",
              description: "Please provide a rejection reason",
              variant: "destructive"
            });
            return;
          }
          // Since there's no rejection_reason column, we just set verification status
          updateData = {
            is_verified: false,
            is_active: false,
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

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId)
        .select();

      if (error) {
        console.error(`❌ Failed to ${action} vendor:`, error);
        throw error;
      }

      console.log(`✅ Successfully ${action}ed vendor:`, data);

      toast({
        title: "Success",
        description: `Vendor ${action}ed successfully${action === 'reject' ? `. Reason: ${rejectionReason}` : ''}`,
      });

      // Reset rejection reason and close dialog
      setRejectionReason('');
      setShowRejectDialog(false);

      // Reload vendors to reflect changes
      await loadVendors();

    } catch (error: any) {
      console.error(`💥 Error ${action}ing vendor:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} vendor: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Open vendor details dialog
  const openVendorDetails = async (vendor: VendorProfile) => {
    console.log('👁️ Opening vendor details for:', vendor.business_name);
    
    // Refresh financial data for the selected vendor
    const updatedFinancialSummary = await getVendorFinancialSummary(vendor.id);
    
    setSelectedVendor({
      ...vendor,
      financial_summary: updatedFinancialSummary
    });
    setShowVendorDialog(true);
  };

  // Initialize component
  useEffect(() => {
    loadVendors();
  }, []);

  // Calculate stats
  const stats = {
    total: vendors.length,
    verified: vendors.filter(v => v.is_verified).length,
    unverified: vendors.filter(v => !v.is_verified).length,
    active: vendors.filter(v => v.is_active).length,
    totalRevenue: vendors.reduce((sum, v) => sum + (v.financial_summary?.total_revenue || 0), 0),
    averageRating: vendors.length > 0 
      ? vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length 
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading vendors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600">Manage vendor accounts, verification, and performance</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadVendors}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={() => navigate('/admin-dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Registered vendors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unverified} pending verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ₹{stats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-muted-foreground">
                Platform-wide sales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageRating.toFixed(1)}
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
                    placeholder="Search by business name, email, or owner name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  <SelectItem value="pending">Pending Verification</SelectItem>
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
              Manage vendor accounts, verification status, and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* Vendor Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {(vendor.business_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {vendor.business_name || 'Unnamed Business'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {vendor.profile?.full_name || 'Unknown Owner'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {vendor.business_email || vendor.profile?.email || 'No email provided'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={vendor.is_verified ? "default" : "secondary"}>
                            {vendor.is_verified ? "✓ Verified" : "⏳ Unverified"}
                          </Badge>
                          <Badge variant={vendor.is_active ? "default" : "destructive"}>
                            {vendor.is_active ? "🟢 Active" : "🔴 Inactive"}
                          </Badge>
                        </div>
                      </div>

                      {/* Vendor Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">Total Orders:</span>
                          <span className="font-semibold">{vendor.financial_summary?.total_orders || 0}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">Revenue:</span>
                          <span className="font-semibold">₹{(vendor.financial_summary?.total_revenue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">Rating:</span>
                          <span className="font-semibold flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            {(vendor.rating || 0).toFixed(1)}/5
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500 block">Joined:</span>
                          <span className="font-semibold">
                            {new Date(vendor.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {!vendor.is_verified && !vendor.is_active && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Status:</strong> This vendor has not been verified yet
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVendorDetails(vendor)}
                        className="w-24"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {!vendor.is_verified && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleVendorAction(vendor.id, 'approve')}
                            disabled={actionLoading === vendor.id}
                            className="w-24 bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === vendor.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setShowRejectDialog(true);
                            }}
                            disabled={actionLoading === vendor.id}
                            className="w-24"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {vendor.is_verified && (
                        <Button
                          variant={vendor.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleVendorAction(vendor.id, vendor.is_active ? 'deactivate' : 'activate')}
                          disabled={actionLoading === vendor.id}
                          className="w-24"
                        >
                          {actionLoading === vendor.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            vendor.is_active ? 'Deactivate' : 'Activate'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredVendors.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                  <p className="text-gray-500">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'No vendors match your current filters'
                      : 'No vendors have registered yet'
                    }
                  </p>
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
                <span>{selectedVendor?.business_name || 'Vendor Details'}</span>
              </DialogTitle>
              <DialogDescription>
                Complete vendor profile and performance metrics
              </DialogDescription>
            </DialogHeader>

            {selectedVendor && (
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Business Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Business Name</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.business_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Owner Name</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.profile?.full_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Business Email</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.business_email || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Phone</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.profile?.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">GSTIN</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.gstin || 'Not provided'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Registration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Business Registration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Registration Number</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.business_registration || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">GSTIN</Label>
                          <p className="text-sm font-semibold mt-1">{selectedVendor.gstin || 'Not provided'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Status Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Status & Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Label>Verification Status:</Label>
                          <Badge variant={selectedVendor.is_verified ? "default" : "secondary"}>
                            {selectedVendor.is_verified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>Account Status:</Label>
                          <Badge variant={selectedVendor.is_active ? "default" : "destructive"}>
                            {selectedVendor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Joined Date</Label>
                          <p className="text-sm font-semibold mt-1">
                            {new Date(selectedVendor.joined_at || selectedVendor.created_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                          <p className="text-sm font-semibold mt-1">
                            {new Date(selectedVendor.updated_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Business Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Auto Approve Orders</Label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedVendor.auto_approve_orders ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Order Timeout</Label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedVendor.order_confirmation_timeout_minutes} minutes
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Business Hours</Label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedVendor.business_hours_start} - {selectedVendor.business_hours_end}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Auto Approve Amount</Label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedVendor.auto_approve_under_amount 
                              ? `Under ₹${selectedVendor.auto_approve_under_amount}` 
                              : 'No limit'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="financial" className="space-y-6">
                  {/* Financial Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedVendor.financial_summary?.total_orders || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedVendor.financial_summary?.pending_orders || 0} pending
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          ₹{(selectedVendor.financial_summary?.total_revenue || 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Gross sales
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Avg Order Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          ₹{(selectedVendor.financial_summary?.average_order_value || 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Per order
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Financial Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Commission & Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Commission Earned</Label>
                          <p className="text-xl font-bold text-orange-600 mt-1">
                            ₹{(selectedVendor.financial_summary?.commission_earned || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Completed Orders</Label>
                          <p className="text-xl font-bold text-green-600 mt-1">
                            {selectedVendor.financial_summary?.completed_orders || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Activity tracking coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Vendor Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Vendor</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this vendor application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                    setSelectedVendor(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedVendor) {
                      handleVendorAction(selectedVendor.id, 'reject');
                    }
                  }}
                  disabled={!rejectionReason.trim() || actionLoading === selectedVendor?.id}
                >
                  {actionLoading === selectedVendor?.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminVendorManagement; 
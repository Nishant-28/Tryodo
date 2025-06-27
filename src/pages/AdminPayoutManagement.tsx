import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Users,
  Truck,
  RefreshCw,
  Eye,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle
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
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { PayoutAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Payout {
  id: string;
  payout_number: string;
  recipient_type: 'vendor' | 'delivery_partner';
  recipient_id: string;
  payout_amount: number;
  payout_method: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
  payout_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  period_start: string;
  period_end: string;
  included_transactions: string[];
  transaction_count: number;
  processed_by: string | null;
  payment_reference: string | null;
  bank_details: any | null;
  scheduled_date: string | null;
  processed_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  recipient?: {
    name: string;
    email: string;
    phone?: string;
  };
}

interface PayoutForm {
  recipientType: 'vendor' | 'delivery_partner';
  recipientId: string;
  payoutAmount: string;
  payoutMethod: 'bank_transfer' | 'upi' | 'cash' | 'cheque';
  scheduledDate: string;
  notes: string;
}

const AdminPayoutManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: currentProfile } = useAuth();
  
  // State management
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  
  // Form state
  const [payoutForm, setPayoutForm] = useState<PayoutForm>({
    recipientType: 'vendor',
    recipientId: '',
    payoutAmount: '',
    payoutMethod: 'bank_transfer',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Filtered payouts
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = searchTerm === '' || 
      payout.payout_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payout.payout_status === statusFilter;
    const matchesType = typeFilter === 'all' || payout.recipient_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate summary stats
  const summaryStats = {
    totalPayouts: payouts.length,
    pendingPayouts: payouts.filter(p => p.payout_status === 'pending').length,
    completedPayouts: payouts.filter(p => p.payout_status === 'completed').length,
    totalAmount: payouts.reduce((sum, p) => sum + p.payout_amount, 0),
    pendingAmount: payouts.filter(p => p.payout_status === 'pending').reduce((sum, p) => sum + p.payout_amount, 0),
    completedAmount: payouts.filter(p => p.payout_status === 'completed').reduce((sum, p) => sum + p.payout_amount, 0),
  };

  useEffect(() => {
    loadPayouts();
    loadRecipients();
  }, []);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      
      const response = await PayoutAPI.getPayouts();
      if (response.success && response.data) {
        setPayouts(response.data);
      }
    } catch (error: any) {
      console.error('Error loading payouts:', error);
      toast({
        title: "Error",
        description: "Failed to load payouts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      // Load vendors
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          business_email,
          contact_phone,
          is_active
        `)
        .eq('is_active', true)
        .order('business_name');

      if (vendorError) throw vendorError;
      setVendors(vendorData || []);

      // Load delivery partners
      const { data: partnerData, error: partnerError } = await supabase
        .from('delivery_partners')
        .select(`
          id,
          profile:profiles(full_name, email, phone),
          is_active
        `)
        .eq('is_active', true)
        .order('profile(full_name)');

      if (partnerError) throw partnerError;
      setDeliveryPartners(partnerData || []);
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const handleCreatePayout = async () => {
    if (!payoutForm.recipientId || !payoutForm.payoutAmount) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreateLoading(true);

      const result = await PayoutAPI.createPayout({
        recipientType: payoutForm.recipientType,
        recipientId: payoutForm.recipientId,
        payoutAmount: parseFloat(payoutForm.payoutAmount),
        payoutMethod: payoutForm.payoutMethod,
        scheduledDate: payoutForm.scheduledDate,
        notes: payoutForm.notes,
        processedBy: currentProfile?.id || ''
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Payout created successfully"
        });
        
        // Reset form
        setPayoutForm({
          recipientType: 'vendor',
          recipientId: '',
          payoutAmount: '',
          payoutMethod: 'bank_transfer',
          scheduledDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        
        setShowCreateDialog(false);
        loadPayouts();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payout",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdatePayoutStatus = async (payoutId: string, newStatus: string) => {
    try {
      const result = await PayoutAPI.updatePayoutStatus(payoutId, newStatus, currentProfile?.id || '');
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Payout status updated to ${newStatus}`
        });
        loadPayouts();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update payout status",
        variant: "destructive"
      });
    }
  };

  const handleRefreshPayouts = async () => {
    setRefreshing(true);
    await loadPayouts();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Payouts refreshed successfully",
    });
  };

  const openPayoutDetails = (payout: Payout) => {
    setSelectedPayout(payout);
    setShowPayoutDetails(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock },
      processing: { variant: 'outline' as const, icon: RefreshCw },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: XCircle },
      cancelled: { variant: 'secondary' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
            <h1 className="text-3xl font-bold">Payout Management</h1>
            <p className="text-gray-600">Manage vendor and delivery partner payouts</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefreshPayouts} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Payout</DialogTitle>
                <DialogDescription>
                  Process a manual payout to a vendor or delivery partner
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Recipient Type *</Label>
                  <Select
                    value={payoutForm.recipientType}
                    onValueChange={(value: 'vendor' | 'delivery_partner') => 
                      setPayoutForm(prev => ({ ...prev, recipientType: value, recipientId: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="delivery_partner">Delivery Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recipient *</Label>
                  <Select
                    value={payoutForm.recipientId}
                    onValueChange={(value) => setPayoutForm(prev => ({ ...prev, recipientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutForm.recipientType === 'vendor' 
                        ? vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.business_name} ({vendor.business_email})
                            </SelectItem>
                          ))
                        : deliveryPartners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.profile?.full_name} ({partner.profile?.phone})
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payout Amount (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payoutForm.payoutAmount}
                      onChange={(e) => setPayoutForm(prev => ({ ...prev, payoutAmount: e.target.value }))}
                      placeholder="1000.00"
                    />
                  </div>
                  <div>
                    <Label>Payment Method *</Label>
                    <Select
                      value={payoutForm.payoutMethod}
                      onValueChange={(value: any) => setPayoutForm(prev => ({ ...prev, payoutMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Scheduled Date *</Label>
                  <Input
                    type="date"
                    value={payoutForm.scheduledDate}
                    onChange={(e) => setPayoutForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this payout..."
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleCreatePayout} 
                  className="w-full"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Payout'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalPayouts}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.pendingPayouts} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              All payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summaryStats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.completedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully paid
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
                  placeholder="Search by payout number, recipient, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vendor">Vendors</SelectItem>
                <SelectItem value="delivery_partner">Delivery Partners</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payouts ({filteredPayouts.length})
          </CardTitle>
          <CardDescription>
            Manage and track all vendor and delivery partner payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {payout.recipient_type === 'vendor' ? 'V' : 'D'}
                    </div>
                    <div>
                      <h3 className="font-semibold">{payout.payout_number}</h3>
                      <p className="text-sm text-gray-600">{payout.recipient?.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(payout.payout_status)}
                        <Badge variant="outline">
                          {payout.recipient_type === 'vendor' ? <Users className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                          {payout.recipient_type === 'vendor' ? 'Vendor' : 'Delivery Partner'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(payout.payout_amount)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Method:</span>
                      <div className="font-semibold capitalize">
                        {payout.payout_method.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Scheduled:</span>
                      <div className="font-semibold">
                        {payout.scheduled_date ? new Date(payout.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <div className="font-semibold">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPayoutDetails(payout)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {payout.payout_status === 'pending' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUpdatePayoutStatus(payout.id, 'processing')}
                    >
                      Process
                    </Button>
                  )}
                  {payout.payout_status === 'processing' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUpdatePayoutStatus(payout.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredPayouts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No payouts found matching your filters'
                  : 'No payouts found'
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showPayoutDetails} onOpenChange={setShowPayoutDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payout Details - {selectedPayout?.payout_number}</span>
            </DialogTitle>
            <DialogDescription>
              Complete payout information and status tracking
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payout Amount</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedPayout.payout_amount)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedPayout.payout_status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <div className="capitalize">{selectedPayout.recipient_type.replace('_', ' ')}</div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="capitalize">{selectedPayout.payout_method.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <div>{selectedPayout.scheduled_date ? new Date(selectedPayout.scheduled_date).toLocaleDateString() : 'Not scheduled'}</div>
                </div>
                <div className="space-y-2">
                  <Label>Created Date</Label>
                  <div>{new Date(selectedPayout.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedPayout.payment_reference && (
                <div className="space-y-2">
                  <Label>Payment Reference</Label>
                  <div className="font-mono text-sm">{selectedPayout.payment_reference}</div>
                </div>
              )}

              {selectedPayout.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <div className="text-sm text-gray-600">{selectedPayout.notes}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transaction Count</Label>
                  <div>{selectedPayout.transaction_count}</div>
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <div className="text-sm">
                    {new Date(selectedPayout.period_start).toLocaleDateString()} - {new Date(selectedPayout.period_end).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutManagement;

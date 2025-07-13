import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Users, Clock, CheckCircle, AlertTriangle, RefreshCw,
  TrendingUp, Calendar, Filter, Download, Eye, Check, X,
  CreditCard, Building2, Smartphone, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { PayoutAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const AdminPayoutDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('week');

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, payoutsResponse] = await Promise.all([
        PayoutAPI.getAdminPayoutDashboard(),
        PayoutAPI.getPayouts({ limit: 100 })
      ]);

      if (dashboardResponse.success) {
        setDashboardData(dashboardResponse.data);
      }

      if (payoutsResponse.success) {
        setPayouts(payoutsResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handleProcessPayout = async (payoutId: string, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(true);
    try {
      const response = await PayoutAPI.approveRejectPayout(
        payoutId,
        action,
        user?.id || '',
        notes
      );
      
      if (response.success) {
        toast.success(`Payout ${action}d successfully`);
        setShowPayoutDialog(false);
        await loadDashboardData();
      } else {
        toast.error(response.error || `Failed to ${action} payout`);
      }
    } catch (error) {
      console.error(`Error ${action}ing payout:`, error);
      toast.error(`Failed to ${action} payout`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: RefreshCw },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: X }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString('en-IN') || '0'}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN');

  // Filter payouts based on status and search
  const filteredPayouts = payouts.filter(payout => {
    const matchesStatus = statusFilter === 'all' || payout.payout_status === statusFilter;
    const matchesSearch = !searchTerm || 
      payout.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.payout_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading payout dashboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payout Management</h2>
          <p className="text-gray-600">Manage vendor payouts and track financial transactions</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-gray-300 hover:border-blue-300"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {formatCurrency(dashboardData?.total_pending_payouts || 0)}
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              {dashboardData?.pending_payout_count || 0} requests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Processing</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(dashboardData?.total_processing_payouts || 0)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {dashboardData?.processing_payout_count || 0} processing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(dashboardData?.total_completed_today || 0)}
            </div>
            <p className="text-xs text-green-600 mt-1">Today's payouts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(dashboardData?.total_completed_month || 0)}
            </div>
            <p className="text-xs text-purple-600 mt-1">Monthly total</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payout Requests
              </CardTitle>
              <CardDescription>
                Review and process vendor payout requests
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by vendor or payout number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
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
          </div>

          {/* Payout Table */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payout requests found</p>
              <p className="text-sm">Payout requests will appear here when vendors submit them</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payout #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">
                        {payout.payout_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.vendor?.business_name}</p>
                          <p className="text-sm text-gray-500">
                            {payout.vendor?.profile?.full_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.payout_amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payout.payout_method === 'upi' ? (
                            <Smartphone className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                          {payout.payout_method === 'upi' ? 'UPI' : 'Bank Transfer'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payout.payout_status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payout.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowPayoutDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payout.payout_status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                                onClick={() => handleProcessPayout(payout.id, 'approve')}
                                disabled={processing}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                onClick={() => handleProcessPayout(payout.id, 'reject', 'Rejected by admin')}
                                disabled={processing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Payout Number</Label>
                  <p className="text-lg font-semibold">{selectedPayout.payout_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayout.payout_status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Amount</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedPayout.payout_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Method</Label>
                  <p className="text-lg">
                    {selectedPayout.payout_method === 'upi' ? 'UPI Transfer' : 'Bank Transfer'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Vendor Information</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedPayout.vendor?.business_name}</p>
                  <p className="text-sm text-gray-600">{selectedPayout.vendor?.profile?.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedPayout.vendor?.profile?.phone}</p>
                </div>
              </div>

              {selectedPayout.bank_details && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Bank Details</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p><strong>Account:</strong> {selectedPayout.bank_details.account_number}</p>
                    <p><strong>IFSC:</strong> {selectedPayout.bank_details.ifsc_code}</p>
                    <p><strong>Holder:</strong> {selectedPayout.bank_details.account_holder}</p>
                    {selectedPayout.bank_details.upi_id && (
                      <p><strong>UPI:</strong> {selectedPayout.bank_details.upi_id}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedPayout.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Notes</Label>
                  <p className="mt-2 p-4 bg-gray-50 rounded-lg">{selectedPayout.notes}</p>
                </div>
              )}

              <div className="flex gap-4">
                <p className="text-sm text-gray-600">
                  <strong>Created:</strong> {formatDate(selectedPayout.created_at)}
                </p>
                {selectedPayout.processed_date && (
                  <p className="text-sm text-gray-600">
                    <strong>Processed:</strong> {formatDate(selectedPayout.processed_date)}
                  </p>
                )}
                {selectedPayout.completed_date && (
                  <p className="text-sm text-gray-600">
                    <strong>Completed:</strong> {formatDate(selectedPayout.completed_date)}
                  </p>
                )}
              </div>

              {selectedPayout.payout_status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleProcessPayout(selectedPayout.id, 'approve')}
                    disabled={processing}
                  >
                    {processing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve Payout
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    onClick={() => handleProcessPayout(selectedPayout.id, 'reject', 'Rejected by admin')}
                    disabled={processing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Payout
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoutDashboard; 
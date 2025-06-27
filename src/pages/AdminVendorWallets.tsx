import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  CreditCard,
  RefreshCw,
  Eye,
  Download,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { WalletAPI } from '../lib/api';

interface VendorWallet {
  id: string;
  vendor_id: string;
  pending_balance: number;
  available_balance: number;
  reserved_balance: number;
  total_earned: number;
  total_paid_out: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  total_commission_paid: number;
  average_commission_rate: number;
  minimum_payout_amount: number;
  auto_payout_enabled: boolean;
  payout_frequency: 'daily' | 'weekly' | 'monthly';
  last_payout_date: string | null;
  last_transaction_date: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    business_name: string;
    business_email: string;
    contact_phone: string;
    is_verified: boolean;
    is_active: boolean;
  };
}

const AdminVendorWallets: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [vendorWallets, setVendorWallets] = useState<VendorWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('total_earned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedWallet, setSelectedWallet] = useState<VendorWallet | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Filtered and sorted wallets
  const filteredAndSortedWallets = vendorWallets
    .filter(wallet => {
      const searchMatch = searchTerm === '' || 
        wallet.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.vendor?.business_email?.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof VendorWallet] as number;
      const bValue = b[sortBy as keyof VendorWallet] as number;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

  // Calculate summary stats
  const summaryStats = {
    totalVendors: vendorWallets.length,
    activeVendors: vendorWallets.filter(w => w.vendor?.is_active).length,
    totalPendingBalance: vendorWallets.reduce((sum, w) => sum + w.pending_balance, 0),
    totalAvailableBalance: vendorWallets.reduce((sum, w) => sum + w.available_balance, 0),
    totalEarned: vendorWallets.reduce((sum, w) => sum + w.total_earned, 0),
    totalCommissionPaid: vendorWallets.reduce((sum, w) => sum + w.total_commission_paid, 0),
  };

  useEffect(() => {
    loadVendorWallets();
  }, []);

  const loadVendorWallets = async () => {
    try {
      setLoading(true);
      
      // Load vendor wallets with vendor information
      const { data, error } = await supabase
        .from('vendor_wallets')
        .select(`
          *,
          vendor:vendors(
            business_name,
            business_email,
            contact_phone,
            is_verified,
            is_active
          )
        `)
        .order('total_earned', { ascending: false });

      if (error) throw error;

      setVendorWallets(data || []);
    } catch (error: any) {
      console.error('Error loading vendor wallets:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor wallets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshWallets = async () => {
    setRefreshing(true);
    await loadVendorWallets();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Vendor wallets refreshed successfully",
    });
  };

  const openWalletDetails = (wallet: VendorWallet) => {
    setSelectedWallet(wallet);
    setShowWalletDetails(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getWalletStatus = (wallet: VendorWallet) => {
    if (!wallet.vendor?.is_active) {
      return { status: 'Inactive', variant: 'destructive' as const };
    }
    if (!wallet.vendor?.is_verified) {
      return { status: 'Unverified', variant: 'secondary' as const };
    }
    if (wallet.available_balance > wallet.minimum_payout_amount) {
      return { status: 'Payout Ready', variant: 'default' as const };
    }
    return { status: 'Active', variant: 'outline' as const };
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
            <h1 className="text-3xl font-bold">Vendor Wallets Management</h1>
            <p className="text-gray-600">Monitor and manage vendor earnings and balances</p>
          </div>
        </div>
        <Button onClick={handleRefreshWallets} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalVendors}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.activeVendors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalEarned)}</div>
            <p className="text-xs text-muted-foreground">
              All-time vendor earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.totalAvailableBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summaryStats.totalCommissionPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform revenue
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
                  placeholder="Search by vendor name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_earned">Total Earned</SelectItem>
                <SelectItem value="available_balance">Available Balance</SelectItem>
                <SelectItem value="pending_balance">Pending Balance</SelectItem>
                <SelectItem value="total_commission_paid">Commission Paid</SelectItem>
                <SelectItem value="last_transaction_date">Last Transaction</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Highest First</SelectItem>
                <SelectItem value="asc">Lowest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Vendor Wallets List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Vendor Wallets ({filteredAndSortedWallets.length})
          </CardTitle>
          <CardDescription>
            Detailed view of all vendor wallet balances and earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAndSortedWallets.map((wallet) => {
              const walletStatus = getWalletStatus(wallet);
              
              return (
                <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {wallet.vendor?.business_name?.charAt(0)?.toUpperCase() || 'V'}
                      </div>
                      <div>
                        <h3 className="font-semibold">{wallet.vendor?.business_name || 'Unknown Vendor'}</h3>
                        <p className="text-sm text-gray-600">{wallet.vendor?.business_email}</p>
                      </div>
                      <Badge variant={walletStatus.variant}>
                        {walletStatus.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Available:</span>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(wallet.available_balance)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Pending:</span>
                        <div className="font-semibold text-orange-600">
                          {formatCurrency(wallet.pending_balance)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Earned:</span>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(wallet.total_earned)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Commission Paid:</span>
                        <div className="font-semibold text-red-600">
                          {formatCurrency(wallet.total_commission_paid)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Commission Rate:</span>
                        <div className="font-semibold">
                          {wallet.average_commission_rate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWalletDetails(wallet)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredAndSortedWallets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No vendor wallets found matching your search' : 'No vendor wallets found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5" />
              <span>{selectedWallet?.vendor?.business_name} - Wallet Details</span>
            </DialogTitle>
            <DialogDescription>
              Complete financial overview for this vendor
            </DialogDescription>
          </DialogHeader>

          {selectedWallet && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Today's Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedWallet.today_earnings)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Week Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-blue-600">
                        {formatCurrency(selectedWallet.week_earnings)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Month Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-purple-600">
                        {formatCurrency(selectedWallet.month_earnings)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-emerald-600">
                        {formatCurrency(selectedWallet.total_earned - selectedWallet.total_commission_paid)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="balances" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Available Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedWallet.available_balance)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Ready for payout</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                        Pending Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(selectedWallet.pending_balance)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Processing orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                        Reserved Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedWallet.reserved_balance)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">On hold</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Earned</Label>
                    <div className="text-2xl font-bold">{formatCurrency(selectedWallet.total_earned)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Paid Out</Label>
                    <div className="text-2xl font-bold">{formatCurrency(selectedWallet.total_paid_out)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Transaction</Label>
                    <div className="text-sm">
                      {selectedWallet.last_transaction_date 
                        ? new Date(selectedWallet.last_transaction_date).toLocaleString()
                        : 'No transactions yet'
                      }
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Payout</Label>
                    <div className="text-sm">
                      {selectedWallet.last_payout_date 
                        ? new Date(selectedWallet.last_payout_date).toLocaleString()
                        : 'No payouts yet'
                      }
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Payout Amount</Label>
                    <div className="text-lg font-semibold">{formatCurrency(selectedWallet.minimum_payout_amount)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payout Frequency</Label>
                    <div className="text-lg font-semibold capitalize">{selectedWallet.payout_frequency}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto Payout</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedWallet.auto_payout_enabled ? "default" : "secondary"}>
                        {selectedWallet.auto_payout_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Average Commission Rate</Label>
                    <div className="text-lg font-semibold">{selectedWallet.average_commission_rate.toFixed(2)}%</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendorWallets; 
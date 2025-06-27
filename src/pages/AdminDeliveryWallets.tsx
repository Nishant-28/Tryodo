import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Truck,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Star,
  CheckCircle,
  AlertTriangle
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

interface DeliveryPartnerWallet {
  id: string;
  delivery_partner_id: string;
  pending_balance: number;
  available_balance: number;
  total_earned: number;
  total_paid_out: number;
  base_salary: number;
  incentive_earnings: number;
  bonus_earnings: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  today_deliveries: number;
  week_deliveries: number;
  month_deliveries: number;
  base_salary_amount: number;
  incentive_per_delivery: number;
  minimum_payout_amount: number;
  auto_payout_enabled: boolean;
  last_payout_date: string | null;
  last_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  delivery_partner?: {
    id: string;
    profile: {
      full_name: string;
      phone: string;
      email: string;
    };
    vehicle_type: string;
    vehicle_number: string;
    is_verified: boolean;
    is_active: boolean;
    is_available: boolean;
    rating: number;
    total_deliveries: number;
    assigned_pincodes: string[];
  };
}

const AdminDeliveryWallets: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [deliveryWallets, setDeliveryWallets] = useState<DeliveryPartnerWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('total_earned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedWallet, setSelectedWallet] = useState<DeliveryPartnerWallet | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Filtered and sorted wallets
  const filteredAndSortedWallets = deliveryWallets
    .filter(wallet => {
      const searchMatch = searchTerm === '' || 
        wallet.delivery_partner?.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.delivery_partner?.profile?.phone?.includes(searchTerm) ||
        wallet.delivery_partner?.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof DeliveryPartnerWallet] as number;
      const bValue = b[sortBy as keyof DeliveryPartnerWallet] as number;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

  // Calculate summary stats
  const summaryStats = {
    totalPartners: deliveryWallets.length,
    activePartners: deliveryWallets.filter(w => w.delivery_partner?.is_active).length,
    availablePartners: deliveryWallets.filter(w => w.delivery_partner?.is_available).length,
    totalPendingBalance: deliveryWallets.reduce((sum, w) => sum + w.pending_balance, 0),
    totalAvailableBalance: deliveryWallets.reduce((sum, w) => sum + w.available_balance, 0),
    totalEarned: deliveryWallets.reduce((sum, w) => sum + w.total_earned, 0),
    todayDeliveries: deliveryWallets.reduce((sum, w) => sum + w.today_deliveries, 0),
  };

  useEffect(() => {
    loadDeliveryWallets();
  }, []);

  const loadDeliveryWallets = async () => {
    try {
      setLoading(true);
      
      // Load delivery partner wallets with partner information
      const { data, error } = await supabase
        .from('delivery_partner_wallets')
        .select(`
          *,
          delivery_partner:delivery_partners(
            id,
            profile:profiles(full_name, phone, email),
            vehicle_type,
            vehicle_number,
            is_verified,
            is_active,
            is_available,
            rating,
            total_deliveries,
            assigned_pincodes
          )
        `)
        .order('total_earned', { ascending: false });

      if (error) throw error;

      setDeliveryWallets(data || []);
    } catch (error: any) {
      console.error('Error loading delivery partner wallets:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery partner wallets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshWallets = async () => {
    setRefreshing(true);
    await loadDeliveryWallets();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Delivery partner wallets refreshed successfully",
    });
  };

  const openWalletDetails = (wallet: DeliveryPartnerWallet) => {
    setSelectedWallet(wallet);
    setShowWalletDetails(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getPartnerStatus = (wallet: DeliveryPartnerWallet) => {
    if (!wallet.delivery_partner?.is_active) {
      return { status: 'Inactive', variant: 'destructive' as const };
    }
    if (!wallet.delivery_partner?.is_verified) {
      return { status: 'Unverified', variant: 'secondary' as const };
    }
    if (wallet.delivery_partner?.is_available) {
      return { status: 'Available', variant: 'default' as const };
    }
    return { status: 'Busy', variant: 'outline' as const };
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
            <h1 className="text-3xl font-bold">Delivery Partner Wallets</h1>
            <p className="text-gray-600">Monitor and manage delivery partner earnings and balances</p>
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
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalPartners}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.availablePartners} available now
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
              All-time partner earnings
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
            <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.todayDeliveries}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed today
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
                  placeholder="Search by name, phone, or vehicle number..."
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
                <SelectItem value="today_earnings">Today's Earnings</SelectItem>
                <SelectItem value="month_deliveries">Monthly Deliveries</SelectItem>
                <SelectItem value="last_delivery_date">Last Delivery</SelectItem>
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

      {/* Delivery Partner Wallets List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Delivery Partner Wallets ({filteredAndSortedWallets.length})
          </CardTitle>
          <CardDescription>
            Detailed view of all delivery partner wallet balances and earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAndSortedWallets.map((wallet) => {
              const partnerStatus = getPartnerStatus(wallet);
              
              return (
                <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {wallet.delivery_partner?.profile?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <h3 className="font-semibold">{wallet.delivery_partner?.profile?.full_name || 'Unknown Partner'}</h3>
                        <p className="text-sm text-gray-600">
                          {wallet.delivery_partner?.vehicle_type} - {wallet.delivery_partner?.vehicle_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {wallet.delivery_partner?.profile?.phone}
                        </p>
                      </div>
                      <Badge variant={partnerStatus.variant}>
                        {partnerStatus.status}
                      </Badge>
                      <div className="flex items-center text-yellow-500">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">
                          {wallet.delivery_partner?.rating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Available:</span>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(wallet.available_balance)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Today:</span>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(wallet.today_earnings)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Earned:</span>
                        <div className="font-semibold text-purple-600">
                          {formatCurrency(wallet.total_earned)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Deliveries Today:</span>
                        <div className="font-semibold">
                          {wallet.today_deliveries}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Month Total:</span>
                        <div className="font-semibold">
                          {wallet.month_deliveries}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Coverage:</span>
                        <div className="font-semibold">
                          {wallet.delivery_partner?.assigned_pincodes?.length || 0} areas
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
                {searchTerm ? 'No delivery partner wallets found matching your search' : 'No delivery partner wallets found'}
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
              <Truck className="h-5 w-5" />
              <span>{selectedWallet?.delivery_partner?.profile?.full_name} - Wallet Details</span>
            </DialogTitle>
            <DialogDescription>
              Complete financial overview for this delivery partner
            </DialogDescription>
          </DialogHeader>

          {selectedWallet && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
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
                      <p className="text-xs text-gray-500">
                        {selectedWallet.today_deliveries} deliveries
                      </p>
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
                      <p className="text-xs text-gray-500">
                        {selectedWallet.week_deliveries} deliveries
                      </p>
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
                      <p className="text-xs text-gray-500">
                        {selectedWallet.month_deliveries} deliveries
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Available Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-emerald-600">
                        {formatCurrency(selectedWallet.available_balance)}
                      </div>
                      <p className="text-xs text-gray-500">Ready for payout</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Partner Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-medium">{selectedWallet.delivery_partner?.profile?.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone:</span>
                        <span className="font-medium">{selectedWallet.delivery_partner?.profile?.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vehicle:</span>
                        <span className="font-medium">
                          {selectedWallet.delivery_partner?.vehicle_type} - {selectedWallet.delivery_partner?.vehicle_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rating:</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{selectedWallet.delivery_partner?.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Coverage Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedWallet.delivery_partner?.assigned_pincodes?.map((pincode, index) => (
                        <Badge key={index} variant="outline">
                          {pincode}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="earnings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Base Salary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedWallet.base_salary_amount)}
                      </div>
                      <p className="text-xs text-gray-500">Monthly base amount</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Incentive Per Delivery</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedWallet.incentive_per_delivery)}
                      </div>
                      <p className="text-xs text-gray-500">Per successful delivery</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Incentive Earnings</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedWallet.incentive_earnings)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus Earnings</Label>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedWallet.bonus_earnings)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Paid Out</Label>
                    <div className="text-2xl font-bold text-gray-600">
                      {formatCurrency(selectedWallet.total_paid_out)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Payout Amount</Label>
                    <div className="text-lg font-semibold">{formatCurrency(selectedWallet.minimum_payout_amount)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto Payout</Label>
                    <Badge variant={selectedWallet.auto_payout_enabled ? "default" : "secondary"}>
                      {selectedWallet.auto_payout_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{selectedWallet.today_deliveries}</div>
                      <p className="text-xs text-gray-500">Deliveries</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{selectedWallet.week_deliveries}</div>
                      <p className="text-xs text-gray-500">Deliveries</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{selectedWallet.month_deliveries}</div>
                      <p className="text-xs text-gray-500">Deliveries</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">All Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{selectedWallet.delivery_partner?.total_deliveries}</div>
                      <p className="text-xs text-gray-500">Deliveries</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Last Delivery</Label>
                    <div className="text-sm">
                      {selectedWallet.last_delivery_date 
                        ? new Date(selectedWallet.last_delivery_date).toLocaleString()
                        : 'No deliveries yet'
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
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryWallets; 
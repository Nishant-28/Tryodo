import React, { useState, useEffect } from 'react';
import { 
  DollarSign, CreditCard, Clock, CheckCircle, AlertTriangle, 
  Settings, Download, RefreshCw, TrendingUp, Calendar,
  Banknote, Smartphone, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { WalletAPI, PayoutAPI } from '@/lib/api';

interface VendorWalletPayoutSectionProps {
  vendorId: string;
  onRefresh?: () => void;
}

const VendorWalletPayoutSection: React.FC<VendorWalletPayoutSectionProps> = ({ 
  vendorId, 
  onRefresh 
}) => {
  const [wallet, setWallet] = useState<any>(null);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Payout request state
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [requestingPayout, setRequestingPayout] = useState(false);
  
  // Settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [walletSettings, setWalletSettings] = useState({
    minimum_payout_amount: 1000,
    payout_frequency: 'weekly',
    auto_payout_enabled: false,
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_account_holder_name: '',
    upi_id: ''
  });

  const loadWalletData = async () => {
    try {
      const [walletResponse, historyResponse] = await Promise.all([
        WalletAPI.getWalletSummary(vendorId),
        WalletAPI.getPayoutHistory(vendorId)
      ]);

      if (walletResponse.success) {
        setWallet(walletResponse.data);
        setWalletSettings({
          minimum_payout_amount: walletResponse.data.minimum_payout_amount || 1000,
          payout_frequency: walletResponse.data.payout_frequency || 'weekly',
          auto_payout_enabled: walletResponse.data.auto_payout_enabled || false,
          bank_account_number: walletResponse.data.bank_account_number || '',
          bank_ifsc_code: walletResponse.data.bank_ifsc_code || '',
          bank_account_holder_name: walletResponse.data.bank_account_holder_name || '',
          upi_id: walletResponse.data.upi_id || ''
        });
      }

      if (historyResponse.success) {
        setPayoutHistory(historyResponse.data);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await WalletAPI.syncWalletBalance(vendorId);
    await loadWalletData();
    onRefresh?.();
  };

  const handlePayoutRequest = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (amount < wallet.minimum_payout_amount) {
      toast.error(`Minimum payout amount is ₹${wallet.minimum_payout_amount}`);
      return;
    }

    if (amount > wallet.available_balance) {
      toast.error('Insufficient balance');
      return;
    }

    setRequestingPayout(true);
    try {
      const response = await WalletAPI.requestPayout(vendorId, amount, payoutMethod as any);
      
      if (response.success) {
        toast.success('Payout request submitted successfully');
        setShowPayoutDialog(false);
        setPayoutAmount('');
        await loadWalletData();
      } else {
        toast.error(response.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await WalletAPI.updateWalletSettings(vendorId, walletSettings);
      
      if (response.success) {
        toast.success('Wallet settings updated successfully');
        setShowSettingsDialog(false);
        await loadWalletData();
      } else {
        toast.error(response.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString('en-IN') || '0'}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN');

  useEffect(() => {
    loadWalletData();
  }, [vendorId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading wallet data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                Wallet Overview
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your earnings and payout information
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-300 hover:border-blue-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Available Balance */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Available Balance</CardTitle>
                <Banknote className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(wallet?.available_balance)}
                </div>
                <p className="text-xs text-green-600 mt-1">Ready for payout</p>
              </CardContent>
            </Card>

            {/* Pending Balance */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-800">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  {formatCurrency(wallet?.pending_balance)}
                </div>
                <p className="text-xs text-orange-600 mt-1">Awaiting delivery</p>
              </CardContent>
            </Card>

            {/* Total Earned */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Total Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(wallet?.total_earned)}
                </div>
                <p className="text-xs text-blue-600 mt-1">Lifetime earnings</p>
              </CardContent>
            </Card>

            {/* Total Paid Out */}
            <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800">Paid Out</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(wallet?.total_paid_out)}
                </div>
                <p className="text-xs text-purple-600 mt-1">Total received</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                  disabled={!wallet?.available_balance || wallet.available_balance < wallet.minimum_payout_amount}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Minimum: ₹${wallet?.minimum_payout_amount}`}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      max={wallet?.available_balance}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Available: {formatCurrency(wallet?.available_balance)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="method">Payout Method</Label>
                    <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePayoutRequest}
                      disabled={requestingPayout}
                      className="flex-1"
                    >
                      {requestingPayout ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      {requestingPayout ? 'Requesting...' : 'Submit Request'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPayoutDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-300 hover:border-blue-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Wallet Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Wallet Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="min_payout">Minimum Payout Amount</Label>
                    <Input
                      id="min_payout"
                      type="number"
                      value={walletSettings.minimum_payout_amount}
                      onChange={(e) => setWalletSettings({
                        ...walletSettings,
                        minimum_payout_amount: parseFloat(e.target.value) || 1000
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Payout Frequency</Label>
                    <Select 
                      value={walletSettings.payout_frequency} 
                      onValueChange={(value) => setWalletSettings({
                        ...walletSettings,
                        payout_frequency: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bank_account">Bank Account Number</Label>
                    <Input
                      id="bank_account"
                      value={walletSettings.bank_account_number}
                      onChange={(e) => setWalletSettings({
                        ...walletSettings,
                        bank_account_number: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ifsc">IFSC Code</Label>
                    <Input
                      id="ifsc"
                      value={walletSettings.bank_ifsc_code}
                      onChange={(e) => setWalletSettings({
                        ...walletSettings,
                        bank_ifsc_code: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_holder">Account Holder Name</Label>
                    <Input
                      id="account_holder"
                      value={walletSettings.bank_account_holder_name}
                      onChange={(e) => setWalletSettings({
                        ...walletSettings,
                        bank_account_holder_name: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="upi">UPI ID</Label>
                    <Input
                      id="upi"
                      value={walletSettings.upi_id}
                      onChange={(e) => setWalletSettings({
                        ...walletSettings,
                        upi_id: e.target.value
                      })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateSettings} className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowSettingsDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payout History
          </CardTitle>
          <CardDescription>
            Your recent payout requests and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payoutHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payout history yet</p>
              <p className="text-sm">Request your first payout when you have sufficient balance</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payoutHistory.slice(0, 5).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-gray-100">
                      {payout.payout_method === 'upi' ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{formatCurrency(payout.payout_amount)}</p>
                      <p className="text-sm text-gray-500">
                        {payout.payout_method === 'upi' ? 'UPI Transfer' : 'Bank Transfer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(payout.payout_status)}
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(payout.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {payoutHistory.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    View All History
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorWalletPayoutSection; 
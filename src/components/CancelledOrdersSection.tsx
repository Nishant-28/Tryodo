import React, { useState, useEffect } from 'react';
import { 
  XCircle, 
  Calendar, 
  User, 
  Phone, 
  Package, 
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { CancelledOrderDetails, CancellationFilters } from '@/types/orderCancellation';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CancelledOrdersSectionProps {
  vendorId: string;
  refreshTrigger?: number;
}

const CancelledOrdersSection: React.FC<CancelledOrdersSectionProps> = ({
  vendorId,
  refreshTrigger = 0
}) => {
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Load cancelled orders
  const loadCancelledOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      console.log('📋 Fetching cancelled orders for vendor:', vendorId);

      // Prepare filters
      const filters: CancellationFilters = {
        vendor_id: vendorId,
        limit: 50,
        page: 1
      };

      // Add date range filter
      if (dateRange !== 'all') {
        const days = parseInt(dateRange.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        filters.start_date = startDate.toISOString().split('T')[0];
      }

      // Add reason filter - only add if it's not empty
      if (selectedReason && selectedReason.trim() !== '') {
        filters.cancellation_reason = selectedReason as any;
      }

      const result = await DeliveryAPI.getVendorCancelledOrders(vendorId, filters);
      
      if (result.success && result.data) {
        let orders = result.data.data || [];
        
        // Ensure all orders have required properties to prevent crashes
        orders = orders.map(order => ({
          ...order,
          vendor_names: order.vendor_names || [],
          delivery_partner_name: order.delivery_partner_name || 'Unknown',
          customer_name: order.customer_name || 'Unknown',
          cancellation: order.cancellation || {
            id: 'unknown',
            order_id: order.id || 'unknown',
            delivery_partner_id: 'unknown',
            cancellation_reason: 'Unknown',
            additional_details: '',
            cancelled_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));

        // Apply search filter
        if (searchTerm && searchTerm.trim() !== '') {
          orders = orders.filter(order => 
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.delivery_partner_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Apply sorting
        orders.sort((a, b) => {
          let comparison = 0;
          
          if (sortBy === 'date') {
            comparison = new Date(a.cancelled_at).getTime() - new Date(b.cancelled_at).getTime();
          } else if (sortBy === 'amount') {
            comparison = a.total_amount - b.total_amount;
          }
          
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        setCancelledOrders(orders);
        console.log('✅ Cancelled orders loaded:', orders.length);
      } else {
        console.log('⚠️ No cancelled orders found or error:', result.error);
        setCancelledOrders([]);
      }
    } catch (error) {
      console.error('💥 Error loading cancelled orders:', error);
      toast.error('Failed to load cancelled orders');
      setCancelledOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadCancelledOrders();
  }, [vendorId, selectedReason, dateRange, refreshTrigger]);

  // Apply search and sorting when they change
  useEffect(() => {
    if (!loading) {
      loadCancelledOrders(false);
    }
  }, [searchTerm, sortBy, sortOrder]);

  const handleRefresh = () => {
    loadCancelledOrders(false);
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCancellationReasonBadgeColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'customer unavailable':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'incorrect address':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'damaged product':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'customer refused delivery':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'payment issues':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'delivery issues':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'weather conditions':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'vehicle breakdown':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Show message when there are no cancelled orders and no filters applied
  const showEmptyState = cancelledOrders.length === 0 && !searchTerm && !selectedReason && dateRange === '30d';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cancelled Orders</h3>
          <p className="text-sm text-gray-600">
            {cancelledOrders.length} cancelled order{cancelledOrders.length !== 1 ? 's' : ''} found
            {showEmptyState && " in the last 30 days"}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Order number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date Range</label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Reason</label>
              <Select value={selectedReason || "all"} onValueChange={(value) => setSelectedReason(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  <SelectItem value="Customer unavailable">Customer unavailable</SelectItem>
                  <SelectItem value="Incorrect address">Incorrect address</SelectItem>
                  <SelectItem value="Damaged product">Damaged product</SelectItem>
                  <SelectItem value="Customer refused delivery">Customer refused delivery</SelectItem>
                  <SelectItem value="Payment issues">Payment issues</SelectItem>
                  <SelectItem value="Delivery issues">Delivery issues</SelectItem>
                  <SelectItem value="Weather conditions">Weather conditions</SelectItem>
                  <SelectItem value="Vehicle breakdown">Vehicle breakdown</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort by</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {cancelledOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cancelled orders found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedReason || dateRange !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'You don\'t have any cancelled orders in the selected period.'
                }
              </p>
              {showEmptyState && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    This is normal if you haven't had any delivery cancellations recently. 
                    Cancelled orders will appear here when delivery partners are unable to complete deliveries.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cancelledOrders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-semibold text-gray-900">#{order.order_number}</h4>
                      <Badge className={getCancellationReasonBadgeColor(order.cancellation.cancellation_reason)}>
                        {order.cancellation.cancellation_reason}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Customer:</span>
                        <span className="font-medium">{order.customer_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">₹{order.total_amount.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Cancelled:</span>
                        <span className="font-medium">{formatDate(order.cancelled_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Delivery Partner:</span>
                        <span className="font-medium">{order.delivery_partner_name}</span>
                      </div>
                    </div>

                    {order.cancellation.additional_details && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Additional Details:</strong> {order.cancellation.additional_details}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="ml-4"
                  >
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedOrderId === order.id && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Vendor Items</h5>
                      <div className="space-y-2">
                        {order.vendor_names.map((vendorName, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span>{vendorName}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Order Cancelled</p>
                            <p className="text-sm text-red-700">
                              This order was cancelled on {formatDate(order.cancelled_at)} due to: {order.cancellation.cancellation_reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CancelledOrdersSection;
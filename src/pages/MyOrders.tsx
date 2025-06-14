import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, Filter, Search, Truck, Clock, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderTracking from '@/components/customer/OrderTracking';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  estimated_delivery_date: string;
  created_at: string;
  picked_up_date?: string;
  out_for_delivery_date?: string;
  delivery_address: any;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  product_description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  item_status: string;
  picked_up_at?: string;
  pickup_confirmed_by?: string;
  vendor_notes?: string;
  updated_at: string;
  vendor: {
    id: string;
    business_name: string;
  };
}

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const loadOrders = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      // Get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!customer) return;

      // Fetch orders with items and vendor details including tracking info
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            vendor:vendors (
              id,
              business_name
            )
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items.some(item =>
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'out_for_delivery':
      case 'picked_up':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
      case 'confirmed':
      case 'packed':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'shipped':
      case 'out_for_delivery':
      case 'picked_up':
        return <Truck className="h-4 w-4" />;
      case 'processing':
      case 'confirmed':
      case 'packed':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowTrackingModal(true);
  };

  // Real-time refresh for order status
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && orders.length > 0) {
        loadOrders();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loading, orders.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track your orders and view real-time updates</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders or products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="shipped">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {orders.length === 0 ? 'No orders yet' : 'No orders found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {orders.length === 0 
                  ? "You haven't placed any orders yet. Start shopping to see your orders here."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {orders.length === 0 && (
                <Button onClick={() => navigate('/order')}>
                  Start Shopping
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                          <p className="text-sm text-gray-500">
                            Placed on {new Date(order.created_at).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <Badge 
                          className={`${getStatusColor(order.order_status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(order.order_status)}
                          {order.order_status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      {/* Order Items Summary */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">
                          {order.order_items.length} item(s) from {new Set(order.order_items.map(item => item.vendor.business_name)).size} vendor(s)
                        </p>
                        <div className="space-y-1">
                          {order.order_items.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <p className="text-sm text-gray-800">
                                {item.quantity}x {item.product_name}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">₹{item.unit_price.toLocaleString()}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.item_status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <p className="text-sm text-gray-500">
                              +{order.order_items.length - 2} more items
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Total: ₹{order.total_amount.toLocaleString()}</span>
                        <span>•</span>
                        <span>
                          Estimated delivery: {new Date(order.estimated_delivery_date).toLocaleDateString('en-IN')}
                        </span>
                        {order.picked_up_date && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">
                              Picked up: {new Date(order.picked_up_date).toLocaleDateString('en-IN')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Track Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order Tracking Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details & Tracking</DialogTitle>
            <DialogDescription>
              Track your order progress in real-time
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order #{selectedOrder.order_number}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-medium">₹{selectedOrder.total_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="font-medium">{selectedOrder.payment_method || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {selectedOrder.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Items with Individual Tracking */}
                  <div>
                    <h4 className="font-medium mb-3">Items Ordered</h4>
                    <div className="space-y-4">
                      {selectedOrder.order_items.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-gray-600">{item.product_description}</p>
                              <p className="text-sm text-gray-500">Vendor: {item.vendor.business_name}</p>
                              <p className="text-sm text-gray-500">Qty: {item.quantity} • ₹{item.unit_price.toLocaleString()} each</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">₹{item.line_total.toLocaleString()}</p>
                              <Badge className={getStatusColor(item.item_status)}>
                                {item.item_status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Individual Item Tracking */}
                          <div className="mt-4 border-t pt-4">
                            <OrderTracking
                              orderId={item.id}
                              orderNumber={selectedOrder.order_number}
                              currentStatus={selectedOrder.order_status}
                              itemStatus={item.item_status}
                              estimatedDelivery={new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('en-IN')}
                              vendor={item.vendor.business_name}
                              vendorId={item.vendor.id}
                              createdAt={selectedOrder.created_at}
                              confirmedAt={item.item_status !== 'pending' ? item.updated_at : undefined}
                              pickedUpAt={item.picked_up_at}
                              shippedAt={item.item_status === 'shipped' ? item.updated_at : undefined}
                              deliveredAt={item.item_status === 'delivered' ? item.updated_at : undefined}
                              cancelledAt={item.item_status === 'cancelled' ? item.updated_at : undefined}
                              pickupConfirmedBy={item.pickup_confirmed_by}
                              vendorNotes={item.vendor_notes}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Delivery Address */}
                  <div>
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{selectedOrder.delivery_address.contact_name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.delivery_address.address_line1}
                        {selectedOrder.delivery_address.address_line2 && `, ${selectedOrder.delivery_address.address_line2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} - {selectedOrder.delivery_address.pincode}
                      </p>
                      <p className="text-sm text-gray-600">{selectedOrder.delivery_address.contact_phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MyOrders; 
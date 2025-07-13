import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertCircle, Phone, Navigation, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import { 
  deliveryAssignmentAPI, 
  orderPickupAPI, 
  orderDeliveryAPI,
  type DeliveryAssignment,
  type OrderPickup,
  type OrderDelivery 
} from '@/lib/deliveryApi';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface PickupWithDetails extends OrderPickup {
  order: {
    order_number: string;
    total_amount: number;
    customer_name: string;
    delivery_address: any;
  };
  vendor: {
    business_name: string;
    phone: string;
    address: any;
  };
}

interface DeliveryWithDetails extends OrderDelivery {
  order: {
    order_number: string;
    total_amount: number;
    customer_name: string;
    delivery_address: any;
  };
}

const DeliveryBoyDashboard = () => {
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [pickups, setPickups] = useState<PickupWithDetails[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusType, setStatusType] = useState<'pickup' | 'delivery'>('pickup');

  // Mock delivery partner ID - in real app, get from auth context
  const deliveryPartnerId = 'mock-delivery-partner-id';

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [assignmentsData, pickupsData, deliveriesData] = await Promise.all([
        deliveryAssignmentAPI.getByPartner(deliveryPartnerId, selectedDate),
        orderPickupAPI.getByDeliveryPartner(deliveryPartnerId, selectedDate),
        orderDeliveryAPI.getByDeliveryPartner(deliveryPartnerId, selectedDate)
      ]);

      setAssignments(assignmentsData);
      setPickups(pickupsData as PickupWithDetails[]);
      setDeliveries(deliveriesData as DeliveryWithDetails[]);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePickupStatusUpdate = async (pickupId: string, status: OrderPickup['pickup_status'], notes?: string) => {
    try {
      await orderPickupAPI.updateStatus(pickupId, status, notes);
      
      setPickups(prevPickups => 
        prevPickups.map(p => 
          p.id === pickupId ? { ...p, pickup_status: status } : p
        )
      );

      toast({
        title: "Success",
        description: `Pickup status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating pickup status:', error);
      toast({
        title: "Error",
        description: "Failed to update pickup status",
        variant: "destructive",
      });
    }
  };

  const handleDeliveryStatusUpdate = async (deliveryId: string, status: OrderDelivery['delivery_status'], notes?: string) => {
    try {
      await orderDeliveryAPI.updateStatus(deliveryId, status, notes);
      
      setDeliveries(prevDeliveries => 
        prevDeliveries.map(d => 
          d.id === deliveryId ? { ...d, delivery_status: status } : d
        )
      );

      toast({
        title: "Success",
        description: `Delivery status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive",
      });
    }
  };

  const openStatusModal = (item: any, type: 'pickup' | 'delivery') => {
    setSelectedItem(item);
    setStatusType(type);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const handleStatusModalSubmit = async () => {
    if (!selectedItem) return;

    const status = statusType === 'pickup' ? 'picked_up' : 'delivered';
    
    try {
      if (statusType === 'pickup') {
        await handlePickupStatusUpdate(selectedItem.id, status as OrderPickup['pickup_status'], statusNotes);
      } else {
        await handleDeliveryStatusUpdate(selectedItem.id, status as OrderDelivery['delivery_status'], statusNotes);
      }
      
      setShowStatusModal(false);
      // We don't need to refresh the whole dashboard, 
      // as the state is updated optimistically.
      // The individual handler will update the specific item.
    } catch (error) {
      // Error handling is done in the individual functions
    }
  };

  const getStatusColor = (status: string, type: 'pickup' | 'delivery') => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      en_route: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      returned: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    // Previous 3 days, today, and next 3 days
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === -1 ? 'Yesterday' : i === 1 ? 'Tomorrow' : 
               date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    return dates;
  };

  const getDashboardStats = () => {
    const totalPickups = pickups.length;
    const completedPickups = pickups.filter(p => p.pickup_status === 'picked_up').length;
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.delivery_status === 'delivered').length;
    
    return { totalPickups, completedPickups, totalDeliveries, completedDeliveries };
  };

  const stats = getDashboardStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => { }} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading your dashboard...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => { }} />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-600" />
              Delivery Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Manage your pickups and deliveries</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateDateOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pickups</p>
                  <p className="text-xl font-bold text-gray-900">{stats.completedPickups}/{stats.totalPickups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Deliveries</p>
                  <p className="text-xl font-bold text-gray-900">{stats.completedDeliveries}/{stats.totalDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.totalPickups + stats.totalDeliveries > 0 
                      ? Math.round(((stats.completedPickups + stats.completedDeliveries) / (stats.totalPickups + stats.totalDeliveries)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Slots</p>
                  <p className="text-xl font-bold text-gray-900">{assignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Overview */}
        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Today's Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{assignment.delivery_slot?.slot_name}</h4>
                      <Badge className={getStatusColor(assignment.status, 'pickup')}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {assignment.sector?.name} • {assignment.sector?.city_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Orders: {assignment.current_orders}/{assignment.max_orders}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="pickups" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickups" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pickups ({pickups.length})
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Deliveries ({deliveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pickups" className="space-y-4">
            {pickups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pickups assigned</h3>
                  <p className="text-gray-600">No pickup tasks for the selected date.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pickups.map((pickup) => (
                  <Card key={pickup.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order #{pickup.order.order_number}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Amount: ₹{pickup.order.total_amount}
                              </p>
                            </div>
                            <Badge className={getStatusColor(pickup.pickup_status, 'pickup')}>
                              {pickup.pickup_status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                Vendor Location
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {pickup.vendor.business_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {pickup.vendor.address}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" />
                                {pickup.vendor.phone}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Package className="h-4 w-4 text-green-600" />
                                Delivery Address
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {pickup.order.customer_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {pickup.order.delivery_address?.address_box}
                              </p>
                              <p className="text-sm text-gray-600">
                                Pincode: {pickup.order.delivery_address?.pincode}
                              </p>
                            </div>
                          </div>
                          
                          {pickup.pickup_time && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              Picked up at: {formatTime(pickup.pickup_time)}
                            </div>
                          )}
                          
                          {pickup.notes && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{pickup.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {pickup.pickup_status === 'pending' && (
                            <Button
                              onClick={() => handlePickupStatusUpdate(pickup.id, 'en_route')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Start Pickup
                            </Button>
                          )}
                          
                          {pickup.pickup_status === 'en_route' && (
                            <Button
                              onClick={() => openStatusModal(pickup, 'pickup')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark Picked Up
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            onClick={() => window.open(`tel:${pickup.vendor.phone}`)}
                            className="flex items-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            Call Vendor
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => window.open(`https://maps.google.com/?q=${pickup.vendor.address}`)}
                            className="flex items-center gap-2"
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-4">
            {deliveries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries assigned</h3>
                  <p className="text-gray-600">No delivery tasks for the selected date.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order #{delivery.order.order_number}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Amount: ₹{delivery.order.total_amount}
                              </p>
                            </div>
                            <Badge className={getStatusColor(delivery.delivery_status, 'delivery')}>
                              {delivery.delivery_status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              Delivery Address
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {delivery.order.customer_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {delivery.order.delivery_address?.shop_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {delivery.order.delivery_address?.address_box}
                            </p>
                            <p className="text-sm text-gray-600">
                              Pincode: {delivery.order.delivery_address?.pincode}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {delivery.order.delivery_address?.phone_number}
                            </p>
                          </div>
                          
                          {delivery.delivery_time && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              Delivered at: {formatTime(delivery.delivery_time)}
                            </div>
                          )}
                          
                          {delivery.delivery_notes && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{delivery.delivery_notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {delivery.delivery_status === 'pending' && (
                            <Button
                              onClick={() => handleDeliveryStatusUpdate(delivery.id, 'out_for_delivery')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Start Delivery
                            </Button>
                          )}
                          
                          {delivery.delivery_status === 'out_for_delivery' && (
                            <Button
                              onClick={() => openStatusModal(delivery, 'delivery')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark Delivered
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            onClick={() => window.open(`tel:${delivery.order.delivery_address?.phone_number}`)}
                            className="flex items-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            Call Customer
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => window.open(`https://maps.google.com/?q=${delivery.order.delivery_address?.address_box}`)}
                            className="flex items-center gap-2"
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Confirm {statusType === 'pickup' ? 'Pickup' : 'Delivery'}
            </DialogTitle>
            <DialogDescription>
              {statusType === 'pickup' 
                ? 'Confirm that you have picked up this order from the vendor.'
                : 'Confirm that you have successfully delivered this order to the customer.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder={`Add any notes about this ${statusType}...`}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusModalSubmit} className="bg-green-600 hover:bg-green-700">
              Confirm {statusType === 'pickup' ? 'Pickup' : 'Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryBoyDashboard; 
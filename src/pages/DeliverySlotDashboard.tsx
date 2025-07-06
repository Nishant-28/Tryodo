import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, Clock, MapPin, User, Phone, CheckCircle,
  AlertTriangle, Navigation, RefreshCw, Settings, Timer,
  Store, ArrowRight, Bell, Star, Target, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

// Types for delivery partner slot-based system
interface DeliverySlot {
  slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  cutoff_time: string;
  pickup_delay_minutes: number;
  estimated_pickup_time: string;
  status: 'upcoming' | 'ready_for_pickup' | 'picking_up' | 'delivering' | 'completed';
  vendors: VendorPickup[];
  total_orders: number;
  total_revenue: number;
  delivery_date: string;
  sector_id: string;
  sector_name: string;
}

interface VendorPickup {
  vendor_id: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;
  orders: DeliveryOrder[];
  total_items: number;
  total_amount: number;
  pickup_status: 'pending' | 'picked_up' | 'completed';
  estimated_prep_completion: string;
}

interface DeliveryOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  status: 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered';
  special_instructions?: string;
  delivery_distance?: number;
  estimated_delivery_time?: number;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  vendor_instructions?: string;
}

interface DeliveryPartnerStats {
  today_slots: number;
  pending_pickups: number;
  active_deliveries: number;
  completed_deliveries: number;
  total_earnings: number;
  efficiency_score: number;
}

interface DeliveryPartner {
  id: string;
  profile_id: string;
  is_available: boolean;
  current_latitude?: number;
  current_longitude?: number;
  vehicle_type: string;
  rating: number;
}

const DeliverySlotDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Core state
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [stats, setStats] = useState<DeliveryPartnerStats>({
    today_slots: 0,
    pending_pickups: 0,
    active_deliveries: 0,
    completed_deliveries: 0,
    total_earnings: 0,
    efficiency_score: 95
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('my-slots');
  const [error, setError] = useState<string | null>(null);

  // Real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshData();
      }
    }, 120000); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (user && profile?.role === 'delivery_partner') {
      initializeDeliveryDashboard();
    }
  }, [user, profile, selectedDate]);

  const initializeDeliveryDashboard = async () => {
    try {
      setError(null); // Clear previous errors
      setLoading(true);

      // Get delivery partner info
      const partnerData = await fetchDeliveryPartnerByProfileId(profile!.id);
      if (!partnerData) {
        setError('Delivery partner account not found. Please ensure your profile is complete.');
        setLoading(false);
        return;
      }

      setDeliveryPartner(partnerData);

      // Load slot-based deliveries and stats
      await Promise.all([
        loadDeliverySlots(partnerData.id),
        loadDeliveryStats(partnerData.id)
      ]);

    } catch (error) {
      console.error('Error initializing delivery dashboard:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartnerByProfileId = async (profileId: string): Promise<DeliveryPartner | null> => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select(`
          id,
          profile_id,
          is_available,
          current_latitude,
          current_longitude,
          vehicle_type,
          rating
        `)
        .eq('profile_id', profileId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('🚚 No delivery partner record found for profile:', profileId);
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching delivery partner:', error);
      // Do not set global error here, let initializeDeliveryDashboard handle it
      return null;
    }
  };

  const loadDeliverySlots = async (deliveryPartnerId: string) => {
    try {
      // Get delivery assignments grouped by slots for the selected date
      const { data: assignmentsData, error } = await supabase
        .from('delivery_partner_orders')
        .select(`
          id,
          order_id,
          status,
          accepted_at,
          picked_up_at,
          delivered_at,
          orders!inner(
            id,
            order_number,
            total_amount,
            payment_method,
            special_instructions,
            delivery_date,
            slot_id,
            customers!inner(
              profiles!inner(
                full_name,
                phone
              )
            ),
            delivery_addresses!inner(
              address_box,
              area,
              city,
              pincode
            ),
            delivery_slots!inner(
              id,
              slot_name,
              start_time,
              end_time,
              cutoff_time,
              pickup_delay_minutes,
              sectors!inner(
                id,
                name
              )
            ),
            order_items!inner(
              id,
              product_name,
              quantity,
              unit_price,
              line_total,
              vendor_id,
              vendors!inner(
                id,
                business_name,
                profiles!inner(
                  phone
                )
              ),
              vendor_addresses!inner(
                address_box
              )
            )
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('orders.delivery_date', selectedDate)
        .in('status', ['assigned', 'accepted', 'picked_up', 'out_for_delivery'])
        .order('orders.delivery_slots.start_time', { ascending: true });

      if (error) throw error;

      // Group by slots and vendors
      const slotMap = new Map<string, DeliverySlot>();

      assignmentsData?.forEach((assignment: any) => {
        const order = assignment.orders;
        const slot = order.delivery_slots;
        const customer = order.customers.profiles;
        const deliveryAddress = order.delivery_addresses;
        const sector = slot.sectors;

        // Initialize slot if not exists
        if (!slotMap.has(slot.id)) {
          const now = new Date();
          const cutoffTime = new Date(`${selectedDate}T${slot.cutoff_time}`);
          const pickupTime = new Date(cutoffTime.getTime() + (slot.pickup_delay_minutes * 60000));

          slotMap.set(slot.id, {
            slot_id: slot.id,
            slot_name: slot.slot_name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            cutoff_time: slot.cutoff_time,
            pickup_delay_minutes: slot.pickup_delay_minutes,
            estimated_pickup_time: pickupTime.toISOString(),
            status: getSlotDeliveryStatus(assignment.status, pickupTime, now),
            vendors: [],
            total_orders: 0,
            total_revenue: 0,
            delivery_date: selectedDate,
            sector_id: sector.id,
            sector_name: sector.name
          });
        }

        const slotData = slotMap.get(slot.id)!;

        // Group by vendors within the slot
        order.order_items.forEach((item: any) => {
          const vendor = item.vendors;
          const vendorAddress = item.vendor_addresses;

          let vendorPickup = slotData.vendors.find(v => v.vendor_id === vendor.id);

          if (!vendorPickup) {
            vendorPickup = {
              vendor_id: vendor.id,
              vendor_name: vendor.business_name,
              vendor_address: vendorAddress.address_box,
              vendor_phone: vendor.profiles.phone || 'N/A',
              orders: [],
              total_items: 0,
              total_amount: 0,
              pickup_status: getVendorPickupStatus(assignment.status),
              estimated_prep_completion: new Date(Date.now() + 30 * 60000).toISOString() // Mock 30 min prep
            };
            slotData.vendors.push(vendorPickup);
          }

          // Find or create order within vendor
          let vendorOrder = vendorPickup.orders.find(o => o.order_id === order.id);

          if (!vendorOrder) {
            vendorOrder = {
              order_id: order.id,
              order_number: order.order_number,
              customer_name: customer.full_name || 'N/A',
              customer_phone: customer.phone || 'N/A',
              delivery_address: `${deliveryAddress.address_box}, ${deliveryAddress.area}, ${deliveryAddress.city} ${deliveryAddress.pincode}`,
              items: [],
              total_amount: order.total_amount,
              payment_method: order.payment_method,
              status: assignment.status,
              special_instructions: order.special_instructions,
              delivery_distance: Math.random() * 5 + 1, // Mock distance
              estimated_delivery_time: Math.floor(Math.random() * 20) + 10 // Mock delivery time
            };
            vendorPickup.orders.push(vendorOrder);
          }

          // Add item to order
          vendorOrder.items.push({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            vendor_instructions: 'Handle with care'
          });

          vendorPickup.total_items += item.quantity;
          vendorPickup.total_amount += item.line_total;
        });

        slotData.total_orders++;
        slotData.total_revenue += order.total_amount;
      });

      // Convert to array and sort
      const slotsArray = Array.from(slotMap.values()).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      setDeliverySlots(slotsArray);
    } catch (error) {
      console.error('Error loading delivery slots:', error);
      toast.error('Failed to load deliveries');
    }
  };

  const loadDeliveryStats = async (deliveryPartnerId: string) => {
    try {
      // This would be implemented based on your analytics requirements
      setStats({
        today_slots: deliverySlots.length,
        pending_pickups: deliverySlots.reduce((sum, slot) =>
          sum + slot.vendors.filter(v => v.pickup_status === 'pending').length, 0
        ),
        active_deliveries: deliverySlots.reduce((sum, slot) =>
          sum + slot.vendors.reduce((vSum, vendor) =>
            vSum + vendor.orders.filter(o => o.status === 'picked_up' || o.status === 'out_for_delivery').length, 0
          ), 0
        ),
        completed_deliveries: deliverySlots.reduce((sum, slot) =>
          sum + slot.vendors.reduce((vSum, vendor) =>
            vSum + vendor.orders.filter(o => o.status === 'delivered').length, 0
          ), 0
        ),
        total_earnings: deliverySlots.reduce((sum, slot) => sum + slot.total_revenue, 0) * 0.1, // 10% commission
        efficiency_score: 95
      });
    } catch (error) {
      console.error('Error loading delivery stats:', error);
    }
  };

  const refreshData = async () => {
    if (!deliveryPartner || refreshing) return;

    setRefreshing(true);
    try {
      await Promise.all([
        loadDeliverySlots(deliveryPartner.id),
        loadDeliveryStats(deliveryPartner.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions
  const getSlotDeliveryStatus = (orderStatus: string, pickupTime: Date, now: Date): DeliverySlot['status'] => {
    if (orderStatus === 'delivered') return 'completed';
    if (orderStatus === 'out_for_delivery' || orderStatus === 'picked_up') return 'delivering';
    if (now >= pickupTime) return 'ready_for_pickup';
    return 'upcoming';
  };

  const getVendorPickupStatus = (orderStatus: string): VendorPickup['pickup_status'] => {
    if (orderStatus === 'delivered') return 'completed';
    if (orderStatus === 'picked_up' || orderStatus === 'out_for_delivery') return 'picked_up';
    return 'pending';
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeUntil = (minutes: number) => {
    if (minutes <= 0) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: DeliverySlot['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ready_for_pickup': return 'bg-orange-100 text-orange-800';
      case 'picking_up': return 'bg-yellow-100 text-yellow-800';
      case 'delivering': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVendorPickup = async (slotId: string, vendorId: string) => {
    try {
      // Update all orders from this vendor to 'picked_up'
      const slot = deliverySlots.find(s => s.slot_id === slotId);
      const vendor = slot?.vendors.find(v => v.vendor_id === vendorId);

      if (!vendor) return;

      const orderIds = vendor.orders.map(o => o.order_id);

      const { error } = await supabase
        .from('delivery_partner_orders')
        .update({
          status: 'picked_up',
          picked_up_at: new Date().toISOString()
        })
        .in('order_id', orderIds)
        .eq('delivery_partner_id', deliveryPartner!.id);

      if (error) throw error;

      toast.success(`Picked up orders from ${vendor.vendor_name}`);
      await refreshData();
    } catch (error) {
      console.error('Error updating pickup status:', error);
      toast.error('Failed to update pickup status');
    }
  };

  const handleOrderDelivery = async (orderId: string) => {
    try {
      // Use the proper DeliveryAPI.markDelivered function that updates all tables
      const result = await DeliveryAPI.markDelivered(orderId, deliveryPartner!.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Order delivered successfully!');
      await refreshData();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Failed to update delivery status');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => {
              setError(null);
              if (profile?.role === 'delivery_partner') {
                initializeDeliveryDashboard();
              }
            }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Delivery Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Slot-based Pickup & Delivery</p>
            <p className="text-sm text-gray-500">{currentTime.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Today's Slots</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.today_slots}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pending Pickups</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.pending_pickups}</p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Active Deliveries</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.active_deliveries}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Earnings</p>
                  <p className="text-xl font-bold text-green-900">₹{stats.total_earnings.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Slots */}
        <div className="space-y-4">
          {deliverySlots.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries for this date</h3>
                <p className="text-gray-600">Delivery assignments will appear here when orders are ready for pickup.</p>
              </CardContent>
            </Card>
          ) : (
            deliverySlots.map((slot) => (
              <Card key={slot.slot_id} className="border-2 border-gray-200 hover:shadow-lg transition-all">
                {/* Slot Header */}
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg sm:text-xl">{slot.slot_name}</CardTitle>
                        <Badge className={getStatusColor(slot.status)}>
                          {slot.status === 'upcoming' && '⏳ Upcoming'}
                          {slot.status === 'ready_for_pickup' && '📦 Ready for Pickup'}
                          {slot.status === 'picking_up' && '🚶 Picking Up'}
                          {slot.status === 'delivering' && '🚚 Delivering'}
                          {slot.status === 'completed' && '✅ Completed'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {slot.sector_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {slot.vendors.length} vendors
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">₹{slot.total_revenue.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{slot.total_orders} orders</div>
                      <div className="text-xs text-gray-500">
                        Pickup: {formatTime(new Date(slot.estimated_pickup_time).toTimeString().slice(0, 5))}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Vendors List */}
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {slot.vendors.map((vendor) => (
                      <Card key={vendor.vendor_id} className="bg-gray-50">
                        <CardContent className="p-4">
                          {/* Vendor Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Store className="h-4 w-4 text-orange-600" />
                                <h4 className="font-semibold text-gray-900">{vendor.vendor_name}</h4>
                                <Badge
                                  variant="outline"
                                  className={
                                    vendor.pickup_status === 'completed' ? 'border-green-500 text-green-700' :
                                    vendor.pickup_status === 'picked_up' ? 'border-blue-500 text-blue-700' :
                                    'border-orange-500 text-orange-700'
                                  }
                                >
                                  {vendor.pickup_status === 'pending' && '📋 Ready for Pickup'}
                                  {vendor.pickup_status === 'picked_up' && '📦 Picked Up'}
                                  {vendor.pickup_status === 'completed' && '✅ Completed'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{vendor.vendor_address}</p>
                              <p className="text-xs text-gray-500">📞 {vendor.vendor_phone}</p>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">₹{vendor.total_amount.toLocaleString()}</div>
                              <div className="text-sm text-gray-600">{vendor.orders.length} orders • {vendor.total_items} items</div>
                            </div>
                          </div>

                          {/* Orders for this vendor */}
                          <div className="space-y-2 mb-3">
                            {vendor.orders.map((order) => (
                              <div key={order.order_id} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">#{order.order_number}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {order.payment_method === 'cod' ? '💰 COD' : '💳 Paid'}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      <div className="flex items-center gap-1 mb-1">
                                        <User className="h-3 w-3" />
                                        {order.customer_name} • {order.customer_phone}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {order.delivery_address}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {order.items.length} items • Est. {order.estimated_delivery_time}m delivery
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="font-bold text-gray-900">₹{order.total_amount.toLocaleString()}</div>
                                    {order.status === 'picked_up' && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleOrderDelivery(order.order_id)}
                                        className="mt-1 bg-green-600 hover:bg-green-700"
                                      >
                                        Mark Delivered
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Vendor Actions */}
                          {vendor.pickup_status === 'pending' && slot.status === 'ready_for_pickup' && (
                            <Button
                              onClick={() => handleVendorPickup(slot.slot_id, vendor.vendor_id)}
                              className="w-full bg-orange-600 hover:bg-orange-700 font-semibold"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Confirm Pickup from {vendor.vendor_name}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliverySlotDashboard;

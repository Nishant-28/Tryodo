import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, MapPin, Star, Clock, Check, X, 
  RefreshCw, Phone, Navigation, AlertTriangle, CheckCircle,
  DollarSign, Target, Truck, User, Store, ArrowRight, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DeliveryAPI, DeliveryStats } from '@/lib/deliveryApi';
import { cn } from '@/lib/utils';

interface DeliveryPartner {
  id: string;
  profile_id: string;
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  current_latitude: number | null;
  current_longitude: number | null;
  assigned_pincodes: string[];
  average_delivery_time_minutes: number;
}

// New slot-based delivery order interfaces
interface SlotOrder {
  slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  delivery_date: string;
  sector_name: string;
  status: 'assigned' | 'picking_up' | 'delivering' | 'completed';
  total_orders: number;
  total_amount: number;
  vendors: VendorPickup[];
  ready_for_delivery: CustomerDelivery[];
  estimated_completion: string;
}

interface VendorPickup {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  total_items: number;
  total_amount: number;
  pickup_status: 'pending' | 'en_route' | 'picked_up';
  orders: VendorOrder[];
  pickup_otp?: string;
  estimated_prep_time?: string;
}

interface VendorOrder {
  order_id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  special_instructions?: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface CustomerDelivery {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number;
  payment_method: string;
  delivery_status: 'pending' | 'out_for_delivery' | 'delivered';
  delivery_otp?: string;
  estimated_delivery_time?: string;
  special_instructions?: string;
}

interface CompletedOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  delivery_time: string;
  total_amount: number;
  rating?: number;
  feedback?: string;
  slot_name: string;
  earnings: number;
}

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const [myOrders, setMyOrders] = useState<SlotOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<CompletedOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string>('');

  // Initialize delivery partner dashboard
  useEffect(() => {
    if (user && profile?.role === 'delivery_partner') {
      initializeDeliveryPartnerDashboard();
    }
  }, [user, profile]);

  // Real-time refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && deliveryPartner) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading, deliveryPartner]);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Update location in database if delivery partner exists
          if (deliveryPartner) {
            updateLocationInDatabase(location);
          }
        },
        (error) => {
          console.warn('Location access denied:', error);
        }
      );
    }
  }, [deliveryPartner]);

  const initializeDeliveryPartnerDashboard = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch delivery partner data
      const deliveryPartnerData = await fetchDeliveryPartnerByProfileId(profile!.id);
      
      if (!deliveryPartnerData) {
        setError('Delivery partner account not found. Please contact support.');
        return;
      }

      setDeliveryPartner(deliveryPartnerData);
      setIsAvailable(deliveryPartnerData.is_available);

      // Load dashboard data
      await Promise.allSettled([
        loadMyOrders(deliveryPartnerData.id),
        loadDeliveredOrders(deliveryPartnerData.id),
        loadStats(deliveryPartnerData.id)
      ]);

    } catch (error) {
      console.error('Error initializing delivery partner dashboard:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartnerByProfileId = async (profileId: string): Promise<DeliveryPartner | null> => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
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
      return null;
    }
  };

  const loadMyOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('🎯 Loading orders for delivery partner:', deliveryPartnerId);
      
      // First try to get slot-based assignments
      const { data: slotData, error: slotError } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          delivery_slot:delivery_slots(*),
          sector:sectors(*)
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('assigned_date', new Date().toISOString().split('T')[0])
        .in('status', ['assigned', 'active']);

      if (slotError) {
        console.log('⚠️ No slot-based assignments, falling back to individual orders');
      }

      const slotsWithOrders: SlotOrder[] = [];

      // If we have slot-based assignments, process them
      if (slotData && slotData.length > 0) {
        console.log('📋 Processing slot-based assignments:', slotData.length);
        
        for (const assignment of slotData) {
          // Get orders for this slot
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
              *,
              order_pickups(pickup_status,vendor_id),
              order_items(
                *,
                vendor_products(
                  *,
                  smartphone_models(model_name)
                ),
                vendors(id, business_name, profiles(phone))
              ),
              customer_addresses(*),
              customers(profiles(full_name, phone))
            `)
            .eq('slot_id', assignment.slot_id)
            .eq('delivery_date', assignment.assigned_date);

          if (ordersError) {
            console.error('Error loading orders for slot:', ordersError);
            continue;
          }

          // Group orders by vendor
          const vendorGroups: { [vendorId: string]: VendorPickup } = {};
          const customerDeliveries: CustomerDelivery[] = [];

          for (const order of orders || []) {
            // Process vendor pickups
            for (const item of order.order_items) {
              const vendorInfo = Array.isArray(item.vendors) ? item.vendors[0] : item.vendors;
              const vendorId = vendorInfo?.id ?? '';
              if (!vendorGroups[vendorId]) {
                vendorGroups[vendorId] = {
                  vendor_id: vendorId,
                  vendor_name: vendorInfo?.business_name || '',
                  vendor_phone: Array.isArray(vendorInfo?.profiles) ? vendorInfo.profiles[0]?.phone || '' : vendorInfo?.profiles?.phone || '',
                  vendor_address: '', // TODO: Get vendor address
                  total_items: 0,
                  total_amount: 0,
                  pickup_status: (() => {
                    const pr = order.order_pickups?.find((p: any) => p.vendor_id === vendorId);
                    return pr?.pickup_status ?? 'pending';
                  })(),
                  orders: []
                };
              }
              
              vendorGroups[vendorId].total_items += item.quantity;
              vendorGroups[vendorId].total_amount += item.line_total;

              let vendorOrder = vendorGroups[vendorId].orders.find(o => o.order_id === order.id);
              if (!vendorOrder) {
                vendorOrder = {
                  order_id: order.id,
                  order_number: order.order_number,
                  items: [],
                  total_amount: order.total_amount
                };
                vendorGroups[vendorId].orders.push(vendorOrder);
              }

              vendorOrder.items.push({
                product_name: item.vendor_products?.smartphone_models?.model_name || 'Unknown',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total
              });
            }

            // If order is picked up, add to customer deliveries
            if (order.order_status === 'picked_up' || order.order_status === 'out_for_delivery') {
              customerDeliveries.push({
                order_id: order.id,
                order_number: order.order_number,
                customer_name: order.customers?.profiles?.full_name || 'Unknown',
                customer_phone: order.customers?.profiles?.phone || '',
                delivery_address: order.customer_addresses?.address_box || '',
                total_amount: order.total_amount,
                payment_method: order.payment_method,
                delivery_status: order.order_status === 'out_for_delivery' ? 'out_for_delivery' : 'pending',
                estimated_delivery_time: assignment.delivery_slot?.end_time
              });
            }
          }

          const slotOrder: SlotOrder = {
            slot_id: assignment.slot_id,
            slot_name: assignment.delivery_slot?.slot_name || '',
            start_time: assignment.delivery_slot?.start_time || '',
            end_time: assignment.delivery_slot?.end_time || '',
            delivery_date: assignment.assigned_date,
            sector_name: assignment.sector?.name || '',
            status: assignment.status === 'active' ? 'picking_up' : 'assigned',
            total_orders: orders?.length || 0,
            total_amount: orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
            vendors: Object.values(vendorGroups),
            ready_for_delivery: customerDeliveries,
            estimated_completion: assignment.delivery_slot?.end_time || ''
          };

          slotsWithOrders.push(slotOrder);
        }
      } else {
        // Fall back to individual order assignments
        console.log('📦 Loading individual order assignments...');
        
        const { data: individualOrders, error: individualError } = await supabase
          .from('delivery_partner_orders')
          .select(`
            *,
            orders(
              *,
              order_pickups(pickup_status,vendor_id),
              order_items(
                *,
                vendor_products(
                  *,
                  smartphone_models(model_name)
                ),
                vendors(id, business_name, profiles(phone))
              ),
              customer_addresses(*),
              customers(profiles(full_name, phone)),
              delivery_slots(slot_name, start_time, end_time)
            )
          `)
          .eq('delivery_partner_id', deliveryPartnerId)
          .in('status', ['assigned', 'accepted', 'picked_up']);

        if (individualError) {
          console.error('Error loading individual orders:', individualError);
        } else if (individualOrders && individualOrders.length > 0) {
          console.log('📋 Processing individual orders:', individualOrders.length);
          
          // Group orders by vendor for a unified view
          const vendorGroups: { [vendorId: string]: VendorPickup } = {};
          const customerDeliveries: CustomerDelivery[] = [];

          for (const partnerOrder of individualOrders) {
            const order = partnerOrder.orders;
            if (!order) continue;

            // Process vendor pickups
            for (const item of order.order_items || []) {
              const vendorInfo = Array.isArray(item.vendors) ? item.vendors[0] : item.vendors;
              const vendorId = vendorInfo?.id ?? '';
              if (!vendorGroups[vendorId]) {
                vendorGroups[vendorId] = {
                  vendor_id: vendorId,
                  vendor_name: vendorInfo?.business_name || '',
                  vendor_phone: Array.isArray(vendorInfo?.profiles) ? vendorInfo.profiles[0]?.phone || '' : vendorInfo?.profiles?.phone || '',
                  vendor_address: '', // TODO: Get vendor address
                  total_items: 0,
                  total_amount: 0,
                  pickup_status: (() => {
                    const pr = order.order_pickups?.find((p: any) => p.vendor_id === vendorId);
                    return pr?.pickup_status ?? (partnerOrder.status === 'picked_up' ? 'picked_up' : 'pending');
                  })(),
                  orders: []
                };
              }
              
              vendorGroups[vendorId].total_items += item.quantity;
              vendorGroups[vendorId].total_amount += item.line_total;

              let vendorOrder = vendorGroups[vendorId].orders.find(o => o.order_id === order.id);
              if (!vendorOrder) {
                vendorOrder = {
                  order_id: order.id,
                  order_number: order.order_number,
                  items: [],
                  total_amount: order.total_amount
                };
                vendorGroups[vendorId].orders.push(vendorOrder);
              }

              vendorOrder.items.push({
                product_name: item.vendor_products?.smartphone_models?.model_name || 'Unknown',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total
              });
            }

            // If order is picked up, add to customer deliveries
            if (partnerOrder.status === 'picked_up') {
              customerDeliveries.push({
                order_id: order.id,
                order_number: order.order_number,
                customer_name: order.customers?.profiles?.full_name || 'Unknown',
                customer_phone: order.customers?.profiles?.phone || '',
                delivery_address: order.customer_addresses?.address_box || '',
                total_amount: order.total_amount,
                payment_method: order.payment_method,
                delivery_status: 'pending',
                estimated_delivery_time: order.delivery_slots?.end_time
              });
            }
          }

          // Create a virtual slot for individual orders
          const virtualSlot: SlotOrder = {
            slot_id: 'individual-orders',
            slot_name: 'My Orders',
            start_time: '09:00',
            end_time: '18:00',
            delivery_date: new Date().toISOString().split('T')[0],
            sector_name: 'All Areas',
            status: customerDeliveries.length > 0 ? 'delivering' : 'picking_up',
            total_orders: individualOrders.length,
            total_amount: individualOrders.reduce((sum, po) => sum + (po.orders?.total_amount || 0), 0),
            vendors: Object.values(vendorGroups),
            ready_for_delivery: customerDeliveries,
            estimated_completion: '18:00'
          };

          slotsWithOrders.push(virtualSlot);
        }
      }

      setMyOrders(slotsWithOrders);
      console.log('✅ Orders loaded:', slotsWithOrders.length);
    } catch (error) {
      console.error('💥 Error loading orders:', error);
      setMyOrders([]);
    }
  };

  const loadDeliveredOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('📦 Loading delivered orders for delivery partner:', deliveryPartnerId);
      
      const { data: deliveredData, error } = await supabase
        .from('delivery_partner_orders')
        .select(`
          *,
          orders(
            order_number,
            total_amount,
            delivery_date,
            delivery_slots(slot_name),
            customers(profiles(full_name)),
            delivery_partner_earnings(amount)
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const completedOrders: CompletedOrder[] = (deliveredData || []).map(item => ({
        order_id: item.order_id,
        order_number: item.orders?.order_number || '',
        customer_name: item.orders?.customers?.profiles?.full_name || 'Unknown',
        delivery_date: item.orders?.delivery_date || '',
        delivery_time: item.delivered_at || '',
        total_amount: item.orders?.total_amount || 0,
        slot_name: item.orders?.delivery_slots?.slot_name || '',
        earnings: item.orders?.delivery_partner_earnings?.amount || 0
      }));

      setDeliveredOrders(completedOrders);
      console.log('✅ Delivered orders loaded:', completedOrders.length);
    } catch (error) {
      console.error('💥 Error loading delivered orders:', error);
      setDeliveredOrders([]);
    }
  };

  const loadStats = async (deliveryPartnerId: string) => {
    try {
      console.log('📊 Loading delivery stats for partner:', deliveryPartnerId);
      const result = await DeliveryAPI.getDeliveryStats(deliveryPartnerId);
      
      if (result.success && result.data) {
        setStats(result.data);
        console.log('✅ Stats loaded successfully');
      } else {
        console.error('❌ Failed to load stats:', result.error);
        setStats(null);
      }
    } catch (error) {
      console.error('💥 Error loading stats:', error);
      setStats(null);
    }
  };

  const refreshData = async () => {
    if (!deliveryPartner) return;
    
    try {
      setRefreshing(true);
      await Promise.allSettled([
        loadMyOrders(deliveryPartner.id),
        loadDeliveredOrders(deliveryPartner.id),
        loadStats(deliveryPartner.id)
      ]);
      console.log('🔄 Data refreshed successfully');
    } catch (error) {
      console.error('💥 Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateLocationInDatabase = async (location: { lat: number; lng: number }) => {
    // Implementation for updating location
  };

  const handleUpdateAvailability = async (available: boolean) => {
    if (!deliveryPartner) return;

    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ 
          is_available: available,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryPartner.id);

      if (error) throw error;

      setIsAvailable(available);
      setDeliveryPartner({ ...deliveryPartner, is_available: available });
      
      toast.success(available ? 'You are now available for orders' : 'You are now unavailable');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability status');
    }
  };

  // Mark all orders from a particular vendor within a slot as picked up (vendor-level)
  const handleVendorPickup = async (_slotId: string, vendor: VendorPickup) => {
    if (!deliveryPartner) return;

    try {
      const updatePromises = vendor.orders.map(async (o) => {
        const res = await DeliveryAPI.markVendorPickedUp(o.order_id, vendor.vendor_id, deliveryPartner.id);
        if (!res.success) throw res.error;
      });

      await Promise.all(updatePromises);

      toast.success('Vendor pickup marked as complete');
      await refreshData();
    } catch (error) {
      console.error('Error marking vendor pickup:', error);
      toast.error('Failed to mark vendor pickup');
    }
  };

  const handleCustomerDelivery = async (orderId: string) => {
    if (!deliveryPartner) return;
    try {
      const res = await DeliveryAPI.markDelivered(orderId, deliveryPartner.id);
      if (!res.success) throw res.error;

      toast.success('Order delivered successfully');
      await refreshData();
    } catch (error) {
      console.error('Error marking delivery:', error);
      toast.error('Failed to mark delivery');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'picking_up': return 'bg-yellow-100 text-yellow-800';
      case 'delivering': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'picked_up': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateTimeString;
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
                initializeDeliveryPartnerDashboard();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Organic background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 left-20 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>
      
      <Header cartItems={0} onCartClick={() => {}} />
      
      <main className="relative container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-First Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                Delivery Partner
              </h1>
              <p className="text-gray-600 font-medium">Manage your slot-based deliveries and track earnings</p>
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {/* Mobile: Grid layout for better touch */}
              <div className="grid grid-cols-2 sm:hidden gap-2">
                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  disabled={refreshing}
                >
                  <div className="flex flex-col items-center gap-1">
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">{refreshing ? 'Updating' : 'Refresh'}</span>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/delivery-slot-dashboard')}
                  className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Slot View</span>
                  </div>
                </Button>
              </div>

              {/* Availability Toggle - Full width on mobile */}
              <div className="flex items-center justify-between space-x-3 bg-white p-3 rounded-xl shadow-soft border border-gray-200 w-full sm:w-auto">
                <Label htmlFor="availability" className="font-medium text-gray-700">Available for Orders</Label>
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={handleUpdateAvailability}
                />
              </div>

              {/* Desktop: Original layout */}
              <div className="hidden sm:flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/delivery-slot-dashboard')}
                  className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                >
                  <Clock className="h-4 w-4" />
                  <span>Slot Dashboard</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-800">Today's Deliveries</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-blue-700">{stats?.today_deliveries || 0}</div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Active slots: {myOrders.length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-800">Today's Earnings</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-green-700">₹{stats?.today_earnings || 0}</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                Total: ₹{stats?.total_earnings || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-800">Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-yellow-700">{deliveryPartner?.rating || 0.0}</div>
              <p className="text-xs text-yellow-600 font-medium mt-1">
                {deliveryPartner?.total_deliveries || 0} total deliveries
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800">Success Rate</CardTitle>
              <Target className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-purple-700">
                {deliveryPartner?.total_deliveries ? 
                  Math.round((deliveryPartner.successful_deliveries / deliveryPartner.total_deliveries) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-purple-600 font-medium mt-1">
                {deliveryPartner?.successful_deliveries || 0} successful
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="my-orders" className="w-full">
          {/* Mobile-first tabs with improved layout */}
          <div className="block sm:hidden mb-4">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-soft h-auto">
              <TabsTrigger 
                value="my-orders" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>My Orders ({myOrders.length})</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="delivered" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Delivered ({deliveredOrders.length})</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="my-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                My Orders ({myOrders.length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Delivered ({deliveredOrders.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="my-orders" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Timer className="h-5 w-5 text-blue-600" />
                  Today's Delivery Slots
                </CardTitle>
                <CardDescription className="font-medium">
                  Slot-based deliveries with vendor pickup tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAvailable && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-soft">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-800">
                        You're currently unavailable. Toggle your availability to receive new slot assignments.
                      </span>
                    </div>
                  </div>
                )}

                {myOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active slots</h3>
                    <p className="text-gray-600">
                      {!isAvailable
                        ? "Set yourself as available to receive slot assignments."
                        : "New delivery slots will appear here when assigned."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((slot) => (
                      <Card key={slot.slot_id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedSlotId(expandedSlotId === slot.slot_id ? '' : slot.slot_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-semibold text-gray-900">
                                  {slot.slot_name}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)} • {slot.sector_name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={cn("text-xs", getStatusBadgeColor(slot.status))}>
                                {slot.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <ArrowRight 
                                className={cn(
                                  "h-4 w-4 text-gray-400 transition-transform",
                                  expandedSlotId === slot.slot_id && "rotate-90"
                                )} 
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 pt-3">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Orders</p>
                              <p className="font-semibold text-gray-900">{slot.total_orders}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Vendors</p>
                              <p className="font-semibold text-gray-900">{slot.vendors.length}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Amount</p>
                              <p className="font-semibold text-gray-900">₹{slot.total_amount}</p>
                            </div>
                          </div>
                        </CardHeader>

                        {expandedSlotId === slot.slot_id && (
                          <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            
                            {/* Vendor Pickup Section */}
                            {slot.vendors.length > 0 && (
                              <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Store className="h-4 w-4" />
                                  Vendor Pickups ({slot.vendors.filter(v => v.pickup_status === 'picked_up').length}/{slot.vendors.length})
                                </h4>
                                <div className="space-y-3">
                                  {slot.vendors.map((vendor) => (
                                    <Card key={vendor.vendor_id} className="border border-gray-100">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                              <Store className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900">{vendor.vendor_name}</p>
                                              <p className="text-sm text-gray-600">{vendor.vendor_phone}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge className={cn("text-xs", getStatusBadgeColor(vendor.pickup_status))}>
                                              {vendor.pickup_status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            {vendor.pickup_status === 'pending' && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleVendorPickup(slot.slot_id, vendor)}
                                                className="bg-green-600 hover:bg-green-700"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Mark Picked Up
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                          <div>
                                            <p className="text-gray-600">Items: <span className="font-medium">{vendor.total_items}</span></p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Amount: <span className="font-medium">₹{vendor.total_amount}</span></p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Customer Delivery Section */}
                            {slot.ready_for_delivery.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <Navigation className="h-4 w-4" />
                                  Ready for Delivery ({slot.ready_for_delivery.length})
                                </h4>
                                <div className="space-y-3">
                                  {slot.ready_for_delivery.map((delivery) => (
                                    <Card key={delivery.order_id} className="border border-gray-100">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                              <User className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900">{delivery.customer_name}</p>
                                              <p className="text-sm text-gray-600">{delivery.order_number}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge className={cn("text-xs", getStatusBadgeColor(delivery.delivery_status))}>
                                              {delivery.delivery_status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            {delivery.delivery_status === 'pending' && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleCustomerDelivery(delivery.order_id)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Mark Delivered
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm">
                                          <p className="text-gray-600">
                                            <Phone className="h-3 w-3 inline mr-1" />
                                            {delivery.customer_phone}
                                          </p>
                                          <p className="text-gray-600">
                                            <MapPin className="h-3 w-3 inline mr-1" />
                                            {delivery.delivery_address}
                                          </p>
                                          <p className="text-gray-600">
                                            <DollarSign className="h-3 w-3 inline mr-1" />
                                            ₹{delivery.total_amount} • {delivery.payment_method}
                                          </p>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivered" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Delivered Orders
                </CardTitle>
                <CardDescription className="font-medium">
                  Your recent delivery history and earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deliveredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No delivered orders</h3>
                    <p className="text-gray-600">
                      Completed deliveries will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveredOrders.map((order) => (
                      <Card key={order.order_id} className="border border-gray-100 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{order.customer_name}</p>
                                <p className="text-sm text-gray-600">{order.order_number} • {order.slot_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">₹{order.total_amount}</p>
                              <p className="text-sm text-green-600">+₹{order.earnings} earned</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <p>Delivered: {formatDateTime(order.delivery_time)}</p>
                            {order.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{order.rating}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DeliveryPartnerDashboard;

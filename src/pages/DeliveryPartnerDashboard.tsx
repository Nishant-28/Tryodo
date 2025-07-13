import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, TrendingUp, MapPin, Star, Clock, Check, X,
  RefreshCw, Phone, Navigation, AlertTriangle, CheckCircle,
  DollarSign, Target, Truck, User, Store, ArrowRight, Timer,
  ChevronDown, ChevronUp, Route, Calendar, Zap, Activity,
  Shield, Eye, EyeOff, Copy, ExternalLink, Menu, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

// Enhanced slot-based delivery order interfaces
interface SlotOrder {
  slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  delivery_date: string;
  sector_name: string;
  status: 'assigned' | 'picking_up' | 'delivering' | 'completed' | 'blocked';
  total_orders: number;
  total_amount: number;
  vendors: VendorPickup[];
  ready_for_delivery: CustomerDelivery[];
  estimated_completion: string;
  can_start: boolean;
  previous_slot_completed: boolean;
  pickup_progress: number;
  delivery_progress: number;
  estimated_earnings: number;
}

interface VendorPickup {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string;
  vendor_address: string;
  vendor_full_address?: string;
  total_items: number;
  total_amount: number;
  pickup_status: 'pending' | 'en_route' | 'picked_up';
  orders: VendorOrder[];
  pickup_otp?: string;
  estimated_prep_time?: string;
  distance_from_current?: number;
  navigation_url?: string;
}

interface VendorOrder {
  order_id: string;
  order_number: string;
  items: OrderItem[];
  total_amount: number;
  special_instructions?: string;
  customer_name?: string;
  customer_phone?: string;
}

interface OrderItem {
  product_name: string;
  quality_type_name: string | null;
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
  delivery_full_address?: string;
  total_amount: number;
  payment_method: string;
  delivery_status: 'pending' | 'out_for_delivery' | 'delivered';
  delivery_otp?: string;
  estimated_delivery_time?: string;
  special_instructions?: string;
  distance_from_vendor?: number;
  navigation_url?: string;
  vendor_name?: string;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize delivery partner dashboard
  useEffect(() => {
    if (user && profile?.role === 'delivery_partner') {
      initializeDeliveryPartnerDashboard();
    }

    // Make DeliveryAPI available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).DeliveryAPI = DeliveryAPI;
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
        setLoading(false);
        return;
      }

      setDeliveryPartner(deliveryPartnerData);
      setIsAvailable(deliveryPartnerData.is_available);

      // Load orders, stats, and delivered orders
      await Promise.all([
        loadMyOrders(deliveryPartnerData.id),
        loadStats(deliveryPartnerData.id),
        loadDeliveredOrders(deliveryPartnerData.id)
      ]);

    } catch (error) {
      console.error('Error initializing dashboard:', error);
      setError('Failed to load dashboard. Please try again.');
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
      console.log('🎯 Loading slot-based orders for delivery partner:', deliveryPartnerId);

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get slot assignments from both tables for backward compatibility
      const { data: sectorAssignments, error: sectorError } = await supabase
        .from('delivery_partner_sector_assignments')
        .select(`
          *,
          delivery_slot:delivery_slots(*),
          sector:sectors(*)
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('assigned_date', [today, yesterday])
        .eq('is_active', true);

      const { data: deliveryAssignments, error: deliveryError } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          delivery_slot:delivery_slots(*),
          sector:sectors(*)
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('assigned_date', [today, yesterday])
        .in('status', ['assigned', 'active'])
        .order('slot_id');

      if (sectorError || deliveryError) {
        console.warn('Error loading assignments:', sectorError || deliveryError);
      }

      // Prioritize sector assignments over delivery assignments
      let slotData: any[] = [];
      if (sectorAssignments && sectorAssignments.length > 0) {
        slotData = sectorAssignments.map(assignment => ({
          ...assignment,
          status: 'assigned',
          slot_id: assignment.slot_id,
          assigned_date: assignment.assigned_date
        }));
        console.log('📋 Using sector-based assignments:', slotData.length);
      } else if (deliveryAssignments && deliveryAssignments.length > 0) {
        slotData = deliveryAssignments;
        console.log('📋 Using legacy delivery assignments:', slotData.length);
      }

      if (!slotData || slotData.length === 0) {
        console.log('📝 No slot assignments found');
        setMyOrders([]);
        return;
      }

      const slotsWithOrders: SlotOrder[] = [];

      // Sort slots by start time
      slotData.sort((a, b) => {
        const aTime = a.delivery_slot?.start_time || '';
        const bTime = b.delivery_slot?.start_time || '';
        return aTime.localeCompare(bTime);
      });

      // Filter out expired slots
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      
      const validSlots = slotData.filter(assignment => {
        if (assignment.assigned_date !== today) return true;
        
        const slot = assignment.delivery_slot;
        if (!slot) return false;

        // Allow 2 hour buffer after slot end time
        const [endHour, endMinute] = slot.end_time.split(':').map(Number);
        const bufferEndTime = `${String(endHour + 2).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        return currentTime <= bufferEndTime;
      });

      console.log(`📋 Valid slots after filtering: ${validSlots.length}/${slotData.length}`);

      for (let i = 0; i < validSlots.length; i++) {
        const assignment = validSlots[i];

        try {
          // Load orders for this slot
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
              *,
              delivery_partner_orders!left(
                delivery_partner_id,
                status
              ),
              order_items(*),
              customer_addresses(*),
              customers(
                profiles(full_name, phone)
              )
            `)
            .eq('slot_id', assignment.slot_id)
            .eq('delivery_date', assignment.assigned_date);

          if (ordersError) {
            console.error('Error loading orders for slot:', ordersError);
            continue;
          }

          if (!orders || orders.length === 0) {
            console.log(`📦 No orders found for slot ${assignment.delivery_slot?.slot_name}`);
            continue;
          }

          // Filter orders assigned to this delivery partner for this specific slot
          const assignedOrders = orders.filter(order => {
            // An order is considered assigned if it's in the current slot AND a delivery partner order record exists for this partner.
            const dpo = order.delivery_partner_orders;
            const hasAssignmentForThisPartner = Array.isArray(dpo)
              ? dpo.some((a: any) => a.delivery_partner_id === deliveryPartnerId)
              : dpo?.delivery_partner_id === deliveryPartnerId;
            return order.slot_id === assignment.slot_id && hasAssignmentForThisPartner;
          });

          console.log(`📦 Processing ${assignedOrders.length}/${orders.length} assigned orders for slot ${assignment.delivery_slot?.slot_name}`);

          // Determine which orders in the slot do not have a delivery_partner_orders record yet
          const ordersNeedingAssignment = orders.filter(order => {
            const dpo = order.delivery_partner_orders;
            const hasAssignment = Array.isArray(dpo)
              ? dpo.some((a: any) => a.delivery_partner_id === deliveryPartnerId)
              : dpo?.delivery_partner_id === deliveryPartnerId;
            return !hasAssignment && order.slot_id === assignment.slot_id;
          });

          // If there are orders in this slot that are missing the assignment record, create them.
          if (ordersNeedingAssignment.length > 0) {
            console.log(`🔧 Creating missing delivery partner assignments for ${ordersNeedingAssignment.length} orders in slot ${assignment.slot_id}`);

            for (const order of ordersNeedingAssignment) {
              // CORRECT: Call the fixed API method
              await DeliveryAPI.ensureOrderDeliveryPartnerAssignment(order.id, deliveryPartnerId);
            }

            // Reload orders after creating assignments
            const { data: updatedOrders } = await supabase
              .from('orders')
              .select(`
                *,
                delivery_partner_orders!left(
                  delivery_partner_id,
                  status
                ),
                order_items(*),
                customer_addresses(*),
                customers(
                  profiles(full_name, phone)
                )
              `)
              .eq('slot_id', assignment.slot_id)
              .eq('delivery_date', assignment.assigned_date);

            if (updatedOrders) {
              orders.splice(0, orders.length, ...updatedOrders);
            }
          }

          // Load vendor and pickup data separately to avoid complex joins
          const vendorIds = [...new Set(assignedOrders.flatMap(order => 
            order.order_items?.map((item: any) => item.vendor_id) || []
          ))].filter(Boolean);

          let vendorData: any[] = [];
          let pickupData: any[] = [];
          
          if (vendorIds.length > 0) {
            const { data: vendors } = await supabase
              .from('vendors')
              .select(`
                id,
                business_name,
                profiles(phone),
                vendor_addresses(address_box)
              `)
              .in('id', vendorIds);
            
            vendorData = vendors || [];

            const orderIds = assignedOrders.map(order => order.id);
            const { data: pickups } = await supabase
              .from('order_pickups')
              .select('*')
              .in('order_id', orderIds);
            
            pickupData = pickups || [];
          }

          // Group orders by vendor and process deliveries
          const vendorGroups: { [vendorId: string]: VendorPickup } = {};
          const customerDeliveries: CustomerDelivery[] = [];

          const nonDeliveredOrders = assignedOrders.filter(order => order.order_status !== 'delivered');

          for (const order of nonDeliveredOrders) {
            // Process vendor pickups
            for (const item of order.order_items || []) {
              const vendorInfo = vendorData.find(v => v.id === item.vendor_id);
              const vendorId = item.vendor_id;

              if (!vendorGroups[vendorId] && vendorInfo) {
                const pickupRecord = pickupData.find(p => 
                  p.order_id === order.id && p.vendor_id === vendorId
                );

                vendorGroups[vendorId] = {
                  vendor_id: vendorId,
                  vendor_name: vendorInfo.business_name || '',
                  vendor_phone: vendorInfo.profiles?.phone || '',
                  vendor_address: vendorInfo.vendor_addresses?.[0]?.address_box || '',
                  total_items: 0,
                  total_amount: 0,
                  pickup_status: pickupRecord?.pickup_status || 'pending',
                  orders: []
                };
              }

              if (vendorGroups[vendorId]) {
                vendorGroups[vendorId].total_items += item.quantity;
                vendorGroups[vendorId].total_amount += item.line_total;

                let vendorOrder = vendorGroups[vendorId].orders.find(o => o.order_id === order.id);
                if (!vendorOrder) {
                  vendorOrder = {
                    order_id: order.id,
                    order_number: order.order_number,
                    items: [],
                    total_amount: order.total_amount,
                    special_instructions: order.special_instructions,
                    customer_name: order.customers?.profiles?.full_name || 'Unknown',
                    customer_phone: order.customers?.profiles?.phone || ''
                  };
                  vendorGroups[vendorId].orders.push(vendorOrder);
                }

                vendorOrder.items.push({
                  product_name: item.product_name,
                  quality_type_name: item.quality_type_name,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  line_total: item.line_total
                });
              }
            }

            // Process customer deliveries (orders ready for delivery)
            const isReadyForDelivery = ['picked_up', 'out_for_delivery'].includes(order.order_status);
            const allVendorsPickedUp = Object.values(vendorGroups).every(v => v.pickup_status === 'picked_up');

            if (isReadyForDelivery || allVendorsPickedUp) {
              const customerAddress = order.customer_addresses;
              const fullAddress = customerAddress ? 
                `${customerAddress.address_box}, ${customerAddress.area}, ${customerAddress.city} ${customerAddress.pincode}` :
                'Address not available';

              customerDeliveries.push({
                order_id: order.id,
                order_number: order.order_number,
                customer_name: order.customers?.profiles?.full_name || 'Unknown',
                customer_phone: order.customers?.profiles?.phone || '',
                delivery_address: customerAddress?.address_box || '',
                delivery_full_address: fullAddress,
                total_amount: order.total_amount,
                payment_method: order.payment_method,
                delivery_status: order.order_status === 'out_for_delivery' ? 'out_for_delivery' : 'pending',
                estimated_delivery_time: assignment.delivery_slot?.end_time,
                special_instructions: order.special_instructions
              });
            }
          }

          // Calculate progress
          const activeVendors = Object.values(vendorGroups).filter(vendor => vendor.orders.length > 0);
          const totalVendors = activeVendors.length;
          const pickedUpVendors = activeVendors.filter(v => v.pickup_status === 'picked_up').length;
          const pickupProgress = totalVendors > 0 ? Math.round((pickedUpVendors / totalVendors) * 100) : 0;

          const totalDeliveries = customerDeliveries.length;
          const completedDeliveries = customerDeliveries.filter(d => d.delivery_status === 'delivered').length;
          const deliveryProgress = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;

          // Determine slot status
          const previousSlotCompleted = i === 0 ? true : (slotsWithOrders[i - 1]?.status === 'completed');
          const canStart = previousSlotCompleted;

          let slotStatus: SlotOrder['status'] = 'assigned';
          if (!canStart && !previousSlotCompleted) {
            slotStatus = 'blocked';
          } else if (pickupProgress === 100 && deliveryProgress === 100) {
            slotStatus = 'completed';
          } else if (pickupProgress === 100 && deliveryProgress < 100) {
            slotStatus = 'delivering';
          } else if (pickupProgress < 100) {
            slotStatus = 'picking_up';
          }

          const slotOrder: SlotOrder = {
            slot_id: assignment.slot_id,
            slot_name: assignment.delivery_slot?.slot_name || '',
            start_time: assignment.delivery_slot?.start_time || '',
            end_time: assignment.delivery_slot?.end_time || '',
            delivery_date: assignment.assigned_date,
            sector_name: assignment.sector?.name || '',
            status: slotStatus,
            total_orders: assignedOrders.length,
            total_amount: assignedOrders.reduce((sum, order) => sum + order.total_amount, 0),
            vendors: activeVendors,
            ready_for_delivery: customerDeliveries,
            estimated_completion: assignment.delivery_slot?.end_time || '',
            can_start: canStart,
            previous_slot_completed: previousSlotCompleted,
            pickup_progress: pickupProgress,
            delivery_progress: deliveryProgress,
            estimated_earnings: Math.round(assignedOrders.reduce((sum, order) => sum + order.total_amount, 0) * 0.1)
          };

          // Only include active slots (filter out completed ones from previous days)
          const isPreviousDay = assignment.assigned_date !== today;
          const shouldInclude = !isPreviousDay || (slotStatus !== 'completed' && (activeVendors.length > 0 || customerDeliveries.length > 0));

          if (shouldInclude) {
            slotsWithOrders.push(slotOrder);
          }

        } catch (error) {
          console.error(`Error processing slot ${assignment.delivery_slot?.slot_name}:`, error);
        }
      }

      setMyOrders(slotsWithOrders);
      console.log('✅ Slot-based orders loaded:', slotsWithOrders.length);

    } catch (error) {
      console.error('💥 Error loading slot-based orders:', error);
      setMyOrders([]);
    }
  };

  const loadDeliveredOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('📦 Loading delivered orders for delivery partner:', deliveryPartnerId);

      // Get slot assignments
      const { data: sectorSlots } = await supabase
        .from('delivery_partner_sector_assignments')
        .select('slot_id, assigned_date')
        .eq('delivery_partner_id', deliveryPartnerId);

      const { data: assignedSlots } = await supabase
        .from('delivery_assignments')
        .select('slot_id, assigned_date')
        .eq('delivery_partner_id', deliveryPartnerId);

      const sectorSlotData = sectorSlots?.map(s => ({ slot_id: s.slot_id, assigned_date: s.assigned_date })).filter(s => s.slot_id && s.assigned_date) || [];
      const deliverySlotData = assignedSlots?.map(s => ({ slot_id: s.slot_id, assigned_date: s.assigned_date })).filter(s => s.slot_id && s.assigned_date) || [];
      
      const allSlotData = [...sectorSlotData, ...deliverySlotData];
      const uniqueSlotData = allSlotData.filter((item, index, self) => 
        index === self.findIndex(t => t.slot_id === item.slot_id && t.assigned_date === item.assigned_date)
      );

      if (uniqueSlotData.length === 0) {
        setDeliveredOrders([]);
        return;
      }

      const slotIds = uniqueSlotData.map(item => item.slot_id);
      const { data: deliveredData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          delivery_date,
          actual_delivery_date,
          slot_id,
          delivery_slots(slot_name),
          customers(profiles(full_name))
        `)
        .in('slot_id', slotIds)
        .eq('order_status', 'delivered')
        .not('actual_delivery_date', 'is', null)
        .order('actual_delivery_date', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      const validDeliveredOrders = (deliveredData || []).filter(order => {
        return uniqueSlotData.some(slotData => 
          slotData.slot_id === order.slot_id && 
          slotData.assigned_date === order.delivery_date
        );
      });

      const completedOrders: CompletedOrder[] = validDeliveredOrders.map(item => ({
        order_id: item.id,
        order_number: item.order_number || '',
        customer_name: item.customers?.[0]?.profiles?.[0]?.full_name || 'Unknown',
        delivery_date: item.delivery_date || '',
        delivery_time: item.actual_delivery_date || '',
        total_amount: item.total_amount || 0,
        slot_name: item.delivery_slots?.[0]?.slot_name || '',
        earnings: Math.round((item.total_amount || 0) * 0.1)
      }));

      setDeliveredOrders(completedOrders);
      console.log('✅ Delivered orders loaded:', completedOrders.length);

    } catch (error) {
      console.error('Error loading delivered orders:', error);
      setDeliveredOrders([]);
    }
  };

  const loadStats = async (deliveryPartnerId: string) => {
    try {
      const result = await DeliveryAPI.getDeliveryStats(deliveryPartnerId);
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const refreshData = async () => {
    if (!deliveryPartner || refreshing) return;

    setRefreshing(true);
    try {
      await Promise.all([
        loadMyOrders(deliveryPartner.id),
        loadStats(deliveryPartner.id),
        loadDeliveredOrders(deliveryPartner.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const updateLocationInDatabase = async (location: { lat: number; lng: number }) => {
    // Implementation for location update
  };

  const handleUpdateAvailability = async (available: boolean) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.updateAvailabilityStatus(deliveryPartner.id, available);
      if (result.success) {
        setIsAvailable(available);
        toast.success(`You are now ${available ? 'available' : 'unavailable'} for deliveries`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability status');
    }
  };

  // Fixed vendor pickup function with proper error handling
  const handleVendorPickup = async (slotId: string, vendor: VendorPickup) => {
    if (!deliveryPartner) return;

    try {
      console.log('🚚 Starting vendor pickup for:', vendor.vendor_name);

      const updatePromises = vendor.orders.map(async (order) => {
        console.log(`📦 Marking order ${order.order_number} as picked up from vendor ${vendor.vendor_id}`);
        
        const result = await DeliveryAPI.markVendorPickedUp(order.order_id, vendor.vendor_id, deliveryPartner.id);
        
        if (!result.success) {
          console.error(`❌ Failed to mark pickup for order ${order.order_number}:`, result.error);
          throw new Error(result.error || 'Failed to mark vendor pickup');
        }
        
        console.log(`✅ Successfully marked pickup for order ${order.order_number}`);
        return result;
      });

      await Promise.all(updatePromises);

      toast.success(`All orders picked up from ${vendor.vendor_name}`);
      await refreshData();
      
    } catch (error) {
      console.error('Error marking vendor pickup:', error);
      toast.error(`Failed to mark vendor pickup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    if (!deliveryPartner) return;
    
    try {
      // Check current order status
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('order_status')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Update to picked_up if not already
      if (currentOrder.order_status !== 'picked_up') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            order_status: 'picked_up',
            picked_up_date: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) throw updateError;
      }

      // Mark as out for delivery
      const { error: outForDeliveryError } = await supabase
        .from('orders')
        .update({
          order_status: 'out_for_delivery',
          out_for_delivery_time: new Date().toISOString()
        })
        .eq('id', orderId);

      if (outForDeliveryError) throw outForDeliveryError;

      // Update delivery partner orders status
      const { error: dpOrderError } = await supabase
        .from('delivery_partner_orders')
        .update({
          status: 'out_for_delivery'
        })
        .eq('order_id', orderId)
        .eq('delivery_partner_id', deliveryPartner.id);

      if (dpOrderError) throw dpOrderError;

      toast.success('Order is now out for delivery');
      await refreshData();
      
    } catch (error) {
      console.error('Error starting delivery:', error);
      toast.error('Failed to start delivery');
    }
  };

  const handleCustomerDelivery = async (orderId: string) => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.markDelivered(orderId, deliveryPartner.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

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
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'picked_up': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSlotStatusIcon = (status: SlotOrder['status']) => {
    switch (status) {
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'picking_up': return <Package className="h-4 w-4" />;
      case 'delivering': return <Truck className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'blocked': return <Shield className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const openNavigation = (url: string) => {
    window.open(url, '_blank');
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
      <Header cartItems={0} onCartClick={() => { }} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 sm:pb-8">
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
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800">Currently Unavailable</h4>
                        <p className="text-sm text-yellow-700">Turn on availability to start receiving orders</p>
                      </div>
                    </div>
                  </div>
                )}

                {myOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Slots</h3>
                    <p className="text-gray-500 mb-4">
                      You don't have any active delivery slots assigned for today.
                      {deliveredOrders.length > 0 && (
                        <span className="block mt-2 text-sm">
                          ✅ Completed slots have been moved to the "Delivered" tab.
                        </span>
                      )}
                    </p>
                    {isAvailable && (
                      <Button
                        onClick={refreshData}
                        variant="outline"
                        className="rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        Check for New Assignments
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 lg:space-y-6">
                    {myOrders.map((slot) => (
                      <Card key={slot.slot_id} className={cn(
                        "shadow-soft border transition-all duration-200 hover:shadow-medium",
                        slot.status === 'completed' ? 'border-green-200 bg-green-50' :
                          slot.status === 'blocked' ? 'border-red-200 bg-red-50' :
                            slot.status === 'delivering' ? 'border-purple-200 bg-purple-50' :
                              slot.status === 'picking_up' ? 'border-yellow-200 bg-yellow-50' :
                                'border-blue-200 bg-blue-50'
                      )}>
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getSlotStatusIcon(slot.status)}
                                <h3 className="text-lg lg:text-xl font-bold text-gray-900">{slot.slot_name}</h3>
                                <Badge className={cn("text-xs", getStatusBadgeColor(slot.status))}>
                                  {slot.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{slot.sector_name}</span>
                                </div>
                              </div>

                              {/* Mobile-optimized progress bars */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">Pickup Progress</span>
                                    <span className="text-xs font-bold text-gray-900">{slot.pickup_progress}%</span>
                                  </div>
                                  <Progress value={slot.pickup_progress} className="h-2" />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">Delivery Progress</span>
                                    <span className="text-xs font-bold text-gray-900">{slot.delivery_progress}%</span>
                                  </div>
                                  <Progress value={slot.delivery_progress} className="h-2" />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl lg:text-3xl font-bold text-gray-900">₹{slot.total_amount.toLocaleString()}</div>
                                <div className="text-sm text-gray-600">{slot.total_orders} orders</div>
                              </div>

                              <Button
                                variant="outline"
                                onClick={() => setExpandedSlotId(expandedSlotId === slot.slot_id ? '' : slot.slot_id)}
                                className="rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 p-2 transition-all duration-200"
                              >
                                {expandedSlotId === slot.slot_id ?
                                  <ChevronUp className="h-5 w-5" /> :
                                  <ChevronDown className="h-5 w-5" />
                                }
                              </Button>
                            </div>
                          </div>

                          {!slot.can_start && slot.status === 'blocked' && (
                            <Alert className="bg-red-50 border-red-200">
                              <Shield className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-700 font-medium">
                                Complete the previous slot before starting this one
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardHeader>

                        {expandedSlotId === slot.slot_id && (
                          <CardContent className="pt-0">
                            <Separator className="mb-6" />

                            {/* Enhanced Vendor Pickup Section - Mobile Optimized */}
                            {slot.vendors.length > 0 && (
                              <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Store className="h-5 w-5 text-orange-600" />
                                    Vendor Pickups ({slot.vendors.filter(v => v.pickup_status === 'picked_up').length}/{slot.vendors.length})
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {slot.pickup_progress}% Complete
                                  </Badge>
                                </div>

                                <div className="space-y-4">
                                  {slot.vendors.map((vendor) => (
                                    <Card key={vendor.vendor_id} className="bg-white border border-gray-200 shadow-soft">
                                      <CardContent className="p-4">
                                        <div className="flex flex-col gap-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h5 className="font-semibold text-gray-900 mb-1">{vendor.vendor_name}</h5>
                                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Phone className="h-3 w-3" />
                                                <button
                                                  onClick={() => copyToClipboard(vendor.vendor_phone)}
                                                  className="hover:text-blue-600 transition-colors"
                                                >
                                                  {vendor.vendor_phone}
                                                </button>
                                              </div>
                                            </div>

                                            <div className="text-right">
                                              <Badge className={cn("text-xs mb-2", getStatusBadgeColor(vendor.pickup_status))}>
                                                {vendor.pickup_status.replace('_', ' ').toUpperCase()}
                                              </Badge>
                                              <p className="text-sm font-semibold text-gray-900">₹{vendor.total_amount.toLocaleString()}</p>
                                              <p className="text-xs text-gray-600">{vendor.total_items} items</p>
                                            </div>
                                          </div>

                                          {/* Mobile-optimized action buttons */}
                                          <div className="flex flex-col sm:flex-row gap-2">
                                            {vendor.navigation_url && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openNavigation(vendor.navigation_url!)}
                                                className="flex-1 sm:flex-none rounded-lg border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                              >
                                                <Route className="h-4 w-4 mr-2" />
                                                Navigate
                                              </Button>
                                            )}

                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => window.open(`tel:${vendor.vendor_phone}`)}
                                              className="flex-1 sm:flex-none rounded-lg border-gray-200 hover:border-green-300 hover:bg-green-50"
                                            >
                                              <Phone className="h-4 w-4 mr-2" />
                                              Call
                                            </Button>

                                            {vendor.pickup_status === 'pending' && slot.can_start && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleVendorPickup(slot.slot_id, vendor)}
                                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 rounded-lg"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Mark Picked Up
                                              </Button>
                                            )}
                                          </div>

                                          {/* Order Details for this Vendor - Collapsible on mobile */}
                                          <div className="border-t border-gray-100 pt-3">
                                            <p className="text-xs font-medium text-gray-700 mb-2">Orders to pickup:</p>
                                            <div className="space-y-2">
                                              {vendor.orders.map((order) => (
                                                <div key={order.order_id} className="bg-gray-50 rounded-lg p-3">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <p className="font-medium text-sm text-gray-900">{order.order_number}</p>
                                                    <p className="text-sm font-semibold text-gray-900">₹{order.total_amount.toLocaleString()}</p>
                                                  </div>
                                                  <div className="text-xs text-gray-600 mb-2">
                                                    Customer: {order.customer_name} • {order.customer_phone}
                                                  </div>
                                                  <div className="space-y-1 max-h-20 overflow-y-auto">
                                                    {order.items.map((item, idx) => (
                                                      <div key={idx} className="flex justify-between text-xs">
                                                        <div className="truncate mr-2">
                                                          <div className="font-bold text-gray-900 text-sm">{item.product_name} x{item.quantity}</div>
                                                          {item.quality_type_name && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                              <span className="text-blue-700 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                                                Quality: {item.quality_type_name}
                                                              </span>
                                                            </div>
                                                          )}
                                                        </div>
                                                        <span className="flex-shrink-0 font-bold text-gray-900 text-sm">₹{item.line_total.toLocaleString()}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Show message if no deliveries are ready yet */}
                            {slot.ready_for_delivery.length === 0 && slot.vendors.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Truck className="h-4 w-4 text-blue-600" />
                                  <h4 className="font-medium text-blue-800">Customer Deliveries</h4>
                                </div>
                                <p className="text-sm text-blue-700 mb-2">
                                  No deliveries ready yet. Complete vendor pickups to unlock customer deliveries.
                                </p>
                                <div className="text-xs text-blue-600">
                                  Progress: {slot.vendors.filter(v => v.pickup_status === 'picked_up').length}/{slot.vendors.length} vendors picked up
                                </div>
                              </div>
                            )}

                            {/* Customer Delivery Section - Mobile Optimized */}
                            {slot.ready_for_delivery.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-blue-600" />
                                    Customer Deliveries ({slot.ready_for_delivery.filter(d => d.delivery_status === 'delivered').length}/{slot.ready_for_delivery.length})
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {slot.delivery_progress}% Complete
                                    </Badge>
                                    {slot.ready_for_delivery.filter(d => d.delivery_status === 'out_for_delivery').length > 0 && (
                                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                                        {slot.ready_for_delivery.filter(d => d.delivery_status === 'out_for_delivery').length} En Route
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {slot.ready_for_delivery.map((delivery) => (
                                    <Card key={delivery.order_id} className="bg-white border border-gray-200 shadow-soft">
                                      <CardContent className="p-4">
                                        <div className="flex flex-col gap-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h5 className="font-semibold text-gray-900 mb-1">#{delivery.order_number}</h5>
                                              <p className="text-sm text-gray-900 font-medium mb-1">{delivery.customer_name}</p>
                                              <p className="text-sm text-gray-600 mb-1">{delivery.delivery_address}</p>
                                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Phone className="h-3 w-3" />
                                                <button
                                                  onClick={() => copyToClipboard(delivery.customer_phone)}
                                                  className="hover:text-blue-600 transition-colors"
                                                >
                                                  {delivery.customer_phone}
                                                </button>
                                              </div>
                                            </div>

                                            <div className="text-right">
                                              <Badge className={cn("text-xs mb-2", getStatusBadgeColor(delivery.delivery_status))}>
                                                {delivery.delivery_status.replace('_', ' ').toUpperCase()}
                                              </Badge>
                                              <p className="text-sm font-semibold text-gray-900">₹{delivery.total_amount.toLocaleString()}</p>
                                              <p className="text-xs text-gray-600">{delivery.payment_method}</p>
                                            </div>
                                          </div>

                                          {delivery.special_instructions && (
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                              <p className="text-xs text-blue-800 font-medium">Special Instructions:</p>
                                              <p className="text-xs text-blue-700">{delivery.special_instructions}</p>
                                            </div>
                                          )}

                                          {/* Mobile-optimized action buttons */}
                                          <div className="flex flex-col sm:flex-row gap-2">
                                            {delivery.navigation_url && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openNavigation(delivery.navigation_url!)}
                                                className="flex-1 sm:flex-none rounded-lg border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                              >
                                                <Route className="h-4 w-4 mr-2" />
                                                Navigate
                                              </Button>
                                            )}

                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => window.open(`tel:${delivery.customer_phone}`)}
                                              className="flex-1 sm:flex-none rounded-lg border-gray-200 hover:border-green-300 hover:bg-green-50"
                                            >
                                              <Phone className="h-4 w-4 mr-2" />
                                              Call Customer
                                            </Button>

                                            {delivery.delivery_status === 'pending' && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleStartDelivery(delivery.order_id)}
                                                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 rounded-lg"
                                              >
                                                <Truck className="h-4 w-4 mr-2" />
                                                Start Delivery
                                              </Button>
                                            )}

                                            {delivery.delivery_status === 'out_for_delivery' && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleCustomerDelivery(delivery.order_id)}
                                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 rounded-lg"
                                              >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Mark Delivered
                                              </Button>
                                            )}

                                            {delivery.delivery_status === 'delivered' && (
                                              <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="h-4 w-4" />
                                                <span className="text-sm font-medium">Delivered</span>
                                              </div>
                                            )}
                                          </div>
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
                  <div className="text-center py-12">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Deliveries Yet</h3>
                    <p className="text-gray-500">Your completed deliveries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveredOrders.map((order) => (
                      <Card key={order.order_id} className="bg-green-50 border border-green-200 shadow-soft">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold text-gray-900">#{order.order_number}</h5>
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  {order.slot_name}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 font-medium mb-1">{order.customer_name}</p>
                              <p className="text-xs text-gray-600">
                                Delivered: {formatDateTime(order.delivery_time)}
                              </p>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">₹{order.total_amount.toLocaleString()}</div>
                              {/* <div className="text-sm font-semibold text-green-600">Earned: ₹{order.earnings}</div> */}
                              {order.rating && (
                                <div className="flex items-center gap-1 justify-end">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-gray-600">{order.rating}</span>
                                </div>
                              )}
                            </div>
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

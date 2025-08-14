import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin, Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Activity, Users, Package, Truck, Calendar, Filter, RefreshCw, BarChart3,
  PieChart, ArrowRight, Eye, Settings, Target, Zap, Timer, Plus
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
  Treemap, ScatterChart, Scatter, Heatmap
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';

interface CityData {
  city_name: string;
  total_orders: number;
  active_orders: number;
  on_time_rate: number;
  sla_breach_percentage: number;
  delivery_partner_availability: number;
  sectors: SectorData[];
  top_sector: string;
  worst_sector: string;
  total_capacity: number;
  capacity_utilization: number;
  revenue: number;
  avg_delivery_time: number;
}

interface SectorData {
  id: string;
  name: string;
  city_name: string;
  pincodes: number[];
  active_orders: number;
  total_orders: number;
  capacity_usage: number;
  partner_availability: number;
  cancellation_rate: number;
  avg_delivery_time: number;
  on_time_rate: number;
  slots: SlotData[];
  revenue: number;
  top_slot: string;
  problem_indicators: string[];
}

interface PincodeData {
  pincode: number;
  sector_id: string;
  demand_intensity: number;
  sla_breach_rate: number;
  orders_count: number;
  partner_coverage: number;
  top_vendors: VendorPerformance[];
  slot_performance: SlotPerformance[];
  avg_delivery_time: number;
  revenue: number;
}

interface SlotData {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  sector_id: string;
  orders_vs_limit: number;
  partner_coverage: number;
  pending_pickups: number;
  delays: number;
  cancellations: number;
  expected_orders: number;
  actual_orders: number;
  capacity_utilization: number;
  revenue: number;
  avg_delivery_time: number;
  can_increase_capacity: boolean;
  partner_count?: number;
  on_time_rate?: number;
}

interface VendorPerformance {
  vendor_id: string;
  business_name: string;
  order_volume: number;
  on_time_rate: number;
  revenue: number;
}

interface SlotPerformance {
  slot_id: string;
  slot_name: string;
  demand: number;
  capacity: number;
  utilization: number;
}

interface DrillDownState {
  level: 'city' | 'sector' | 'pincode' | 'slot';
  selected_city?: string;
  selected_sector?: string;
  selected_pincode?: number;
  selected_slot?: string;
}

interface FilterState {
  date_range: string;
  time_range: string;
  status_filter: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SlotSectorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cities, setCities] = useState<CityData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [pincodes, setPincodes] = useState<PincodeData[]>([]);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [alerts, setAlerts] = useState<Array<{id: string, type: 'warning' | 'error' | 'info', message: string}>>([]);
  
  const [drillDown, setDrillDown] = useState<DrillDownState>({ level: 'city' });
  const [filters, setFilters] = useState<FilterState>({
    date_range: '7d',
    time_range: 'all',
    status_filter: 'all'
  });

  const refreshDebounceRef = useRef<number | null>(null);

  const cityList = useMemo(() => Array.from(new Set(cities.map((c) => c.city_name))).sort(), [cities]);
  const sectorListForCity = useMemo(
    () => sectors.filter((s) => (drillDown.selected_city ? s.city_name === drillDown.selected_city : true)),
    [sectors, drillDown.selected_city]
  );
  const pincodeListForSector = useMemo(
    () => pincodes.filter((p) => (drillDown.selected_sector ? p.sector_id === drillDown.selected_sector : true)),
    [pincodes, drillDown.selected_sector]
  );

  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  // Realtime updates for orders and slots
  useEffect(() => {
    const channel = supabase
      .channel('4layer-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = window.setTimeout(() => {
          loadAnalyticsData();
        }, 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_slots' }, () => {
        if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = window.setTimeout(() => {
          loadAnalyticsData();
        }, 300);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      // Load data based on current drill-down level
      await Promise.all([
        loadCityData(),
        loadSectorData(),
        loadPincodeData(),
        loadSlotData(),
        generateAlerts()
      ]);
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCityData = async () => {
    // Get all sectors first
    const { data: sectorsData, error: sectorsError } = await supabase
      .from('sectors')
      .select(`
        id, name, city_name, pincodes, is_active,
        delivery_slots(id, slot_name, start_time, end_time, max_orders)
      `)
      .eq('is_active', true);

    if (sectorsError) throw sectorsError;

    // Get orders data for each city
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, order_status, total_amount, created_at, estimated_delivery_date, actual_delivery_date,
        sector_id, delivery_address_id,
        customer_addresses(pincode)
      `)
      .gte('created_at', getDateRange(filters.date_range));

    if (ordersError) throw ordersError;

    // Process city-level analytics
    const cityMap = new Map<string, CityData>();
    
    sectorsData?.forEach(sector => {
      if (!cityMap.has(sector.city_name)) {
        cityMap.set(sector.city_name, {
          city_name: sector.city_name,
          total_orders: 0,
          active_orders: 0,
          on_time_rate: 0,
          sla_breach_percentage: 0,
          delivery_partner_availability: 0,
          sectors: [],
          top_sector: '',
          worst_sector: '',
          total_capacity: 0,
          capacity_utilization: 0,
          revenue: 0,
          avg_delivery_time: 0
        });
      }
    });

    // Calculate metrics for each city
    ordersData?.forEach(order => {
      const sector = sectorsData?.find(s => s.id === order.sector_id);
      if (!sector) return;

      const cityData = cityMap.get(sector.city_name);
      if (!cityData) return;

      cityData.total_orders += 1;
      cityData.revenue += order.total_amount || 0;
      
      if (['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(order.order_status)) {
        cityData.active_orders += 1;
      }

      // Calculate on-time delivery
      if (order.actual_delivery_date && order.estimated_delivery_date) {
        const estimated = new Date(order.estimated_delivery_date);
        const actual = new Date(order.actual_delivery_date);
        if (actual <= estimated) {
          cityData.on_time_rate += 1;
        } else {
          cityData.sla_breach_percentage += 1;
        }
      }
    });

    // Finalize calculations
    cityMap.forEach(city => {
      if (city.total_orders > 0) {
        city.on_time_rate = (city.on_time_rate / city.total_orders) * 100;
        city.sla_breach_percentage = (city.sla_breach_percentage / city.total_orders) * 100;
      }
      
      // Calculate capacity from sectors
      const citySectors = sectorsData?.filter(s => s.city_name === city.city_name) || [];
      city.total_capacity = citySectors.reduce((sum, sector) => {
        return sum + (sector.delivery_slots?.reduce((slotSum: number, slot: any) => slotSum + (slot.max_orders || 0), 0) || 0);
      }, 0);
      
      if (city.total_capacity > 0) {
        city.capacity_utilization = (city.active_orders / city.total_capacity) * 100;
      }
    });

    setCities(Array.from(cityMap.values()));
  };

  const loadSectorData = async () => {
    // Similar implementation for sector-level data
    const { data: sectorsData, error } = await supabase
      .from('sectors')
      .select(`
        id, name, city_name, pincodes, is_active,
        delivery_slots(id, slot_name, start_time, end_time, max_orders, is_active),
        orders(id, order_status, total_amount, created_at, estimated_delivery_date, actual_delivery_date)
      `)
      .eq('is_active', true);

    if (error) throw error;

    const processedSectors: SectorData[] = sectorsData?.map((sector: any) => {
      const activeOrders = sector.orders?.filter((o: any) =>
        ['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(o.order_status)
      ).length || 0;
      const totalCapacity = (sector.delivery_slots || []).reduce((sum: number, s: any) => sum + (s.max_orders || 0), 0);
      const capacityUsage = totalCapacity > 0 ? (activeOrders / totalCapacity) * 100 : 0;
      const topSlot = (sector.delivery_slots || [])
        .slice()
        .sort((a: any, b: any) => (b.max_orders || 0) - (a.max_orders || 0))[0]?.slot_name || '';

      return {
        id: sector.id,
        name: sector.name,
        city_name: sector.city_name,
        pincodes: sector.pincodes || [],
        active_orders: activeOrders,
        total_orders: sector.orders?.length || 0,
        capacity_usage: capacityUsage,
        partner_availability: Math.random() * 100, // Placeholder - implement actual calculation
        cancellation_rate: Math.random() * 10,
        avg_delivery_time: 30 + Math.random() * 30,
        on_time_rate:
          ((sector.orders?.filter((o: any) => {
            if (o.order_status !== 'delivered') return false;
            const est = o.estimated_delivery_date ? new Date(o.estimated_delivery_date) : null;
            const act = o.actual_delivery_date ? new Date(o.actual_delivery_date) : null;
            return est && act && act <= est;
          }).length || 0) /
            Math.max(1, sector.orders?.filter((o: any) => o.order_status === 'delivered').length || 0)) *
          100,
        slots: [],
        revenue: sector.orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0,
        top_slot: topSlot,
        problem_indicators: []
      } as SectorData;
    }) || [];

    setSectors(processedSectors);
  };

  const loadPincodeData = async () => {
    // Implementation for pincode-level data
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        id, order_status, total_amount, created_at, sector_id, slot_id,
        estimated_delivery_date, actual_delivery_date,
        customer_addresses(pincode),
        order_items(vendor_id, vendors(business_name)),
        delivery_slots(slot_name, max_orders)
      `)
      .gte('created_at', getDateRange(filters.date_range));

    if (error) throw error;

    const pincodeMap = new Map<number, PincodeData & { _slaBreachCount?: number }>();
    const vendorStatsByPincode = new Map<number, Map<string, { vendor_id: string; business_name: string; orders: number; revenue: number; delivered: number; onTime: number }>>();
    const slotStatsByPincode = new Map<number, Map<string, { slot_id: string; slot_name: string; demand: number; capacity: number }>>();

    ordersData?.forEach((order: any) => {
      const pincode = order.customer_addresses?.pincode;
      if (!pincode) return;

      if (!pincodeMap.has(pincode)) {
        pincodeMap.set(pincode, {
          pincode,
          sector_id: order.sector_id || '',
          demand_intensity: 0,
          sla_breach_rate: 0,
          orders_count: 0,
          partner_coverage: 0,
          top_vendors: [],
          slot_performance: [],
          avg_delivery_time: 0,
          revenue: 0,
          _slaBreachCount: 0
        });
      }

      const pincodeData = pincodeMap.get(pincode)!;
      pincodeData.orders_count += 1;
      pincodeData.revenue += order.total_amount || 0;
      pincodeData.demand_intensity = pincodeData.orders_count; // Simplified

      // SLA breach tracking
      const est = order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : null;
      const act = order.actual_delivery_date ? new Date(order.actual_delivery_date) : null;
      if (order.order_status === 'delivered' && est && act && act > est) {
        pincodeData._slaBreachCount = (pincodeData._slaBreachCount || 0) + 1;
      }

      // Vendor stats
      if (!vendorStatsByPincode.has(pincode)) vendorStatsByPincode.set(pincode, new Map());
      const vmap = vendorStatsByPincode.get(pincode)!;
      (order.order_items || []).forEach((item: any) => {
        const vid = item.vendor_id;
        const vname = item.vendors?.business_name || 'Unknown Vendor';
        if (!vmap.has(vid)) vmap.set(vid, { vendor_id: vid, business_name: vname, orders: 0, revenue: 0, delivered: 0, onTime: 0 });
        const vstat = vmap.get(vid)!;
        vstat.orders += 1;
        vstat.revenue += order.total_amount || 0;
        if (order.order_status === 'delivered') {
          vstat.delivered += 1;
          if (est && act && act <= est) vstat.onTime += 1;
        }
      });

      // Slot stats per pincode
      if (order.delivery_slots) {
        if (!slotStatsByPincode.has(pincode)) slotStatsByPincode.set(pincode, new Map());
        const smap = slotStatsByPincode.get(pincode)!;
        const sid = order.slot_id || order.delivery_slots?.id || '';
        const sname = order.delivery_slots?.slot_name || 'Unknown';
        const cap = order.delivery_slots?.max_orders || 0;
        if (!smap.has(sid)) smap.set(sid, { slot_id: sid, slot_name: sname, demand: 0, capacity: cap });
        const sstat = smap.get(sid)!;
        sstat.demand += 1;
        sstat.capacity = Math.max(sstat.capacity, cap);
      }
    });

    // Finalize pincode data
    pincodeMap.forEach((pd, pin) => {
      // SLA rate
      pd.sla_breach_rate = pd.orders_count > 0 ? ((pd._slaBreachCount || 0) / pd.orders_count) * 100 : 0;

      // Top vendors
      const vmap = vendorStatsByPincode.get(pin);
      if (vmap) {
        const topVendors = Array.from(vmap.values())
          .map((v) => ({
            vendor_id: v.vendor_id,
            business_name: v.business_name,
            order_volume: v.orders,
            on_time_rate: v.delivered > 0 ? (v.onTime / v.delivered) * 100 : 0,
            revenue: v.revenue
          }))
          .sort((a, b) => b.order_volume - a.order_volume)
          .slice(0, 5);
        pd.top_vendors = topVendors;
      }

      // Slot performance
      const smap = slotStatsByPincode.get(pin);
      if (smap) {
        const perf = Array.from(smap.values()).map((s) => ({
          slot_id: s.slot_id,
          slot_name: s.slot_name,
          demand: s.demand,
          capacity: s.capacity,
          utilization: s.capacity > 0 ? (s.demand / s.capacity) * 100 : 0
        }));
        pd.slot_performance = perf;
      }
    });

    setPincodes(Array.from(pincodeMap.values()).map(({ _slaBreachCount, ...rest }) => rest as PincodeData));
  };

  const loadSlotData = async () => {
    const { data: slotsData, error } = await supabase
      .from('delivery_slots')
      .select(`
        id, slot_name, start_time, end_time, sector_id, max_orders, is_active,
        orders(id, order_status, total_amount, created_at, estimated_delivery_date, actual_delivery_date),
        delivery_assignments(delivery_partner_id)
      `)
      .eq('is_active', true);

    if (error) throw error;

    const processedSlots: SlotData[] = slotsData?.map((slot: any) => {
      const totalOrders = slot.orders?.length || 0;
      const activeOrders = slot.orders?.filter((o: any) =>
        ['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(o.order_status)
      ).length || 0;
      const deliveredOrders = slot.orders?.filter((o: any) => o.order_status === 'delivered') || [];
      const onTime = deliveredOrders.filter((o: any) => {
        const est = o.estimated_delivery_date ? new Date(o.estimated_delivery_date) : null;
        const act = o.actual_delivery_date ? new Date(o.actual_delivery_date) : null;
        return est && act && act <= est;
      }).length;
      const partnerCount = new Set((slot.delivery_assignments || []).map((a: any) => a.delivery_partner_id)).size;

      return {
        id: slot.id,
        slot_name: slot.slot_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        sector_id: slot.sector_id,
        orders_vs_limit: slot.max_orders || 0,
        partner_coverage: Math.random() * 100,
        pending_pickups: Math.floor(Math.random() * 10),
        delays: Math.floor(Math.random() * 5),
        cancellations: Math.floor(Math.random() * 3),
        expected_orders: slot.max_orders || 0,
        actual_orders: totalOrders,
        capacity_utilization: slot.max_orders ? (activeOrders / slot.max_orders) * 100 : 0,
        revenue: slot.orders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0,
        avg_delivery_time: 25 + Math.random() * 20,
        can_increase_capacity: activeOrders / (slot.max_orders || 1) > 0.8,
        partner_count: partnerCount,
        on_time_rate: deliveredOrders.length > 0 ? (onTime / deliveredOrders.length) * 100 : 0
      } as SlotData;
    }) || [];

    setSlots(processedSlots);
  };

  const generateAlerts = async () => {
    const newAlerts: Array<{id: string, type: 'warning' | 'error' | 'info', message: string}> = [];
    
    // Generate alerts based on current data
    sectors.forEach(sector => {
      if (sector.capacity_usage > 90) {
        newAlerts.push({
          id: `sector-${sector.id}-capacity`,
          type: 'error',
          message: `Sector ${sector.name} is at ${sector.capacity_usage.toFixed(1)}% capacity`
        });
      }
      
      if (sector.on_time_rate < 70) {
        newAlerts.push({
          id: `sector-${sector.id}-sla`,
          type: 'warning',
          message: `Sector ${sector.name} has low on-time rate: ${sector.on_time_rate.toFixed(1)}%`
        });
      }
    });

    slots.forEach(slot => {
      if (slot.capacity_utilization > 85) {
        newAlerts.push({
          id: `slot-${slot.id}-capacity`,
          type: 'warning',
          message: `Slot ${slot.slot_name} is near capacity at ${slot.capacity_utilization.toFixed(1)}%`
        });
      }
    });

    setAlerts(newAlerts);
  };

  const getDateRange = (range: string) => {
    const now = new Date();
    const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 7;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const handleDrillDown = (level: DrillDownState['level'], params: Partial<DrillDownState> = {}) => {
    setDrillDown({ level, ...params });
  };

  const handleIncreaseCapacity = async (slotId: string, step: number = 5) => {
    try {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;
      const newCap = (slot.orders_vs_limit || 0) + step;
      const { error } = await supabase.from('delivery_slots').update({ max_orders: newCap }).eq('id', slotId);
      if (error) throw error;
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, orders_vs_limit: newCap, expected_orders: newCap } : s)));
      toast({ title: 'Capacity Updated', description: `New capacity: ${newCap}` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to update capacity', variant: 'destructive' });
    }
  };

  const renderSectorSlotTable = (sectorId: string) => {
    const sectorSlots = slots.filter((s) => s.sector_id === sectorId);
    if (sectorSlots.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Sector Slot Performance</CardTitle>
          <CardDescription>Slot-wise metrics for the selected sector</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>SLA %</TableHead>
                  <TableHead>Avg Time</TableHead>
                  <TableHead>Partners</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorSlots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div className="font-medium">{slot.slot_name}</div>
                      <div className="text-xs text-gray-500">{slot.start_time} - {slot.end_time}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{slot.actual_orders}/{slot.orders_vs_limit}</div>
                    </TableCell>
                    <TableCell>
                      <div className={cn('font-semibold', slot.capacity_utilization > 90 ? 'text-red-600' : slot.capacity_utilization > 75 ? 'text-yellow-600' : 'text-green-600')}>
                        {slot.capacity_utilization.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>{(slot.on_time_rate || 0).toFixed(1)}%</TableCell>
                    <TableCell>{slot.avg_delivery_time.toFixed(0)}m</TableCell>
                    <TableCell>{slot.partner_count || 0}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleIncreaseCapacity(slot.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Boost
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCityOverview = () => (
    <div className="space-y-6">
      {/* City Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cities.map(city => (
          <Card key={city.city_name} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleDrillDown('sector', { selected_city: city.city_name })}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{city.city_name}</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Orders</span>
                  <span className="font-semibold">{city.active_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">On-time Rate</span>
                  <Badge variant={city.on_time_rate > 80 ? "default" : "destructive"}>
                    {city.on_time_rate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Capacity</span>
                  <span className="text-sm">{city.capacity_utilization.toFixed(1)}%</span>
                </div>
                <Progress value={city.capacity_utilization} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-medium">{formatCurrency(city.revenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* City Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>City Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="on_time_rate" fill="#8884d8" name="On-time Rate %" />
                  <Bar dataKey="capacity_utilization" fill="#82ca9d" name="Capacity Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={cities}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ city_name, percent }) => `${city_name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {cities.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSectorView = () => {
    const filteredSectors = drillDown.selected_city 
      ? sectors.filter(s => s.city_name === drillDown.selected_city)
      : sectors;

    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('city')}>
            Cities
          </Button>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium">{drillDown.selected_city || 'All Sectors'}</span>
        </div>

        {/* Sector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSectors.map(sector => (
            <Card key={sector.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleDrillDown('pincode', { ...drillDown, selected_sector: sector.id })}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{sector.name}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </CardTitle>
                <CardDescription>{sector.city_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Active Orders</p>
                      <p className="text-lg font-semibold">{sector.active_orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pincodes</p>
                      <p className="text-lg font-semibold">{sector.pincodes.length}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>On-time Rate</span>
                      <span className={cn("font-medium", 
                        sector.on_time_rate > 80 ? "text-green-600" : "text-red-600")}>
                        {sector.on_time_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={sector.on_time_rate} className="h-2" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Avg Delivery Time</span>
                      <span>{sector.avg_delivery_time.toFixed(0)}min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenue</span>
                      <span className="font-medium">{formatCurrency(sector.revenue)}</span>
                    </div>
                  </div>

                  {sector.problem_indicators.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sector.problem_indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sector Slot Table when a sector is selected */}
        {drillDown.selected_sector && renderSectorSlotTable(drillDown.selected_sector)}
      </div>
    );
  };

  const renderPincodeView = () => {
    const filteredPincodes = drillDown.selected_sector
      ? pincodes.filter(p => p.sector_id === drillDown.selected_sector)
      : pincodes;

    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('city')}>
            Cities
          </Button>
          <ArrowRight className="h-4 w-4" />
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('sector', { selected_city: drillDown.selected_city })}>
            {drillDown.selected_city}
          </Button>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium">Pincodes</span>
        </div>

        {/* Pincode Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pincode Demand Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={filteredPincodes}>
                    <CartesianGrid />
                    <XAxis dataKey="pincode" />
                    <YAxis dataKey="demand_intensity" />
                    <Tooltip />
                    <Scatter dataKey="orders_count" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pincodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPincodes
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 5)
                  .map(pincode => (
                    <div key={pincode.pincode} 
                         className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                         onClick={() => handleDrillDown('slot', { ...drillDown, selected_pincode: pincode.pincode })}>
                      <div>
                        <p className="font-medium">{pincode.pincode}</p>
                        <p className="text-sm text-gray-600">{pincode.orders_count} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(pincode.revenue)}</p>
                        <Badge variant={pincode.sla_breach_rate < 20 ? "default" : "destructive"} className="text-xs">
                          {pincode.sla_breach_rate.toFixed(1)}% SLA breach
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor and Slot Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance in Pincode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPincodes
                  .sort((a, b) => b.orders_count - a.orders_count)
                  .slice(0, 1)
                  .flatMap((p) => p.top_vendors)
                  .slice(0, 5)
                  .map((v) => (
                    <div key={v.vendor_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{v.business_name}</p>
                        <p className="text-xs text-gray-600">{v.order_volume} orders</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={v.on_time_rate >= 85 ? 'default' : 'secondary'} className="text-xs">
                          {v.on_time_rate.toFixed(1)}% on-time
                        </Badge>
                        <div className="text-sm font-semibold">{formatCurrency(v.revenue)}</div>
                      </div>
                    </div>
                  ))}
                {filteredPincodes.length === 0 && (
                  <div className="text-sm text-gray-500">No vendor data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pincode Slot Analytics</CardTitle>
              <CardDescription>Orders vs capacity per slot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(filteredPincodes.find((p) => p.pincode === drillDown.selected_pincode)?.slot_performance) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="slot_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="demand" fill="#8884d8" name="Orders" />
                    <Bar dataKey="capacity" fill="#82ca9d" name="Capacity" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSlotView = () => {
    const filteredSlots = drillDown.selected_sector
      ? slots.filter(s => s.sector_id === drillDown.selected_sector)
      : slots;

    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm">
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('city')}>
            Cities
          </Button>
          <ArrowRight className="h-4 w-4" />
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('sector', { selected_city: drillDown.selected_city })}>
            {drillDown.selected_city}
          </Button>
          <ArrowRight className="h-4 w-4" />
          <Button variant="ghost" size="sm" onClick={() => handleDrillDown('pincode', { ...drillDown })}>
            Pincodes
          </Button>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium">Slots</span>
        </div>

        {/* Slot Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlots.map(slot => (
            <Card key={slot.id} className={cn(
              "border-2",
              slot.capacity_utilization > 90 ? "border-red-500" : 
              slot.capacity_utilization > 75 ? "border-yellow-500" : "border-gray-200"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{slot.slot_name}</span>
                  <Badge variant={slot.capacity_utilization > 90 ? "destructive" : "default"}>
                    {slot.capacity_utilization.toFixed(1)}%
                  </Badge>
                </CardTitle>
                <CardDescription>{slot.start_time} - {slot.end_time}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Orders</p>
                      <p className="font-semibold">{slot.actual_orders}/{slot.orders_vs_limit}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pending</p>
                      <p className="font-semibold text-orange-600">{slot.pending_pickups}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Delays</p>
                      <p className="font-semibold text-red-600">{slot.delays}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-semibold">{formatCurrency(slot.revenue)}</p>
                    </div>
                  </div>

                  <Progress value={slot.capacity_utilization} className="h-2" />

                  <div className="flex gap-2">
                    {slot.can_increase_capacity && (
                      <Button size="sm" variant="outline" className="text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Increase Capacity
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs">
                      <Settings className="h-3 w-3 mr-1" />
                      Controls
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Slot & Sector Analytics</h2>
          <p className="text-gray-600">4-Layer drill-down analytics: City → Sector → Pincode → Slot</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Hierarchical Filters */}
          <Select value={drillDown.selected_city || ''} onValueChange={(value) => handleDrillDown('sector', { selected_city: value })}>
            <SelectTrigger className="w-36"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              {cityList.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={drillDown.selected_sector || ''} onValueChange={(value) => handleDrillDown('pincode', { selected_city: drillDown.selected_city, selected_sector: value })}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sector" /></SelectTrigger>
            <SelectContent>
              {sectorListForCity.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={(drillDown.selected_pincode || '').toString()} onValueChange={(value) => handleDrillDown('slot', { selected_city: drillDown.selected_city, selected_sector: drillDown.selected_sector, selected_pincode: Number(value) })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Pincode" /></SelectTrigger>
            <SelectContent>
              {pincodeListForSector.map((p) => (
                <SelectItem key={p.pincode} value={String(p.pincode)}>{p.pincode}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.date_range} onValueChange={(value) => setFilters({ ...filters, date_range: value })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalyticsData}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
          {alerts.length > 3 && (
            <p className="text-sm text-gray-600">+{alerts.length - 3} more alerts</p>
          )}
        </div>
      )}

      {/* Analytics Content */}
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          {drillDown.level === 'city' && renderCityOverview()}
          {drillDown.level === 'sector' && renderSectorView()}
          {drillDown.level === 'pincode' && renderPincodeView()}
          {drillDown.level === 'slot' && renderSlotView()}
        </div>
      </div>
    </div>
  );
};

export default SlotSectorAnalytics; 
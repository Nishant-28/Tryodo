import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Calendar,
  MapPin,
  Building,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { OrderAPI } from '@/lib/api';

interface OrderRow {
  id: string;
  order_number: string;
  total_amount: number;
  order_status: string;
  created_at: string;
}

interface CustomerRow {
  customer_id: string;
  name: string;
  phone?: string;
  orders_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_value: number;
  average_order_value: number;
  last_order_date?: string;
}

interface CityRow {
  city_name: string;
  orders_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_value: number;
}

interface PincodeRow {
  pincode: string;
  orders_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_value: number;
}

type Timeframe = 'daily' | 'monthly' | 'overall';

type OrdersQueryResult = Array<{
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  order_status: string;
  created_at: string;
  cancelled_date: string | null;
  delivery_address_id: string | null;
  sectors?: { id: string; city_name: string } | { id: string; city_name: string }[] | null;
}>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    isNaN(amount) ? 0 : amount
  );

const AdminCustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [timeframe, setTimeframe] = useState<Timeframe>('overall');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const [orders, setOrders] = useState<OrdersQueryResult>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, { name: string; phone?: string }>>(new Map());
  const [addressPincodeMap, setAddressPincodeMap] = useState<Map<string, string>>(new Map());
  const [addressDetailMap, setAddressDetailMap] = useState<Map<string, { pincode: string; phone_number?: string; owner_name?: string; shop_name?: string }>>(new Map());

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderRow[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState<boolean>(false);

  const computeDateRange = useCallback((tf: Timeframe) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (tf === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return {
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      };
    }

    if (tf === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      };
    }

    return { startISO: null as any, endISO: end.toISOString() };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startISO, endISO } = computeDateRange(timeframe);

      // 1) Load orders in timeframe with customer profile and sector inline
      let orderQuery = supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          customer_id,
          total_amount,
          order_status,
          created_at,
          cancelled_date,
          delivery_address_id,
          sectors(id, city_name),
          customers(
            id,
            profiles(full_name, phone)
          )
        `
        );

      if (timeframe !== 'overall') {
        orderQuery = orderQuery.gte('created_at', startISO).lte('created_at', endISO);
      }

      const { data: ordersData, error: ordersError } = await orderQuery.returns<any[]>();
      if (ordersError) throw ordersError;

      // 2) Normalize and deduplicate orders by id
      const mapById = new Map<string, any>();
      (ordersData || []).forEach((o: any) => {
        mapById.set(o.id, o);
      });
      const uniqueOrders = Array.from(mapById.values());

      const normalizedOrders: OrdersQueryResult = uniqueOrders.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        customer_id: o.customer_id,
        total_amount: parseFloat(o.total_amount) || 0,
        order_status: o.order_status,
        created_at: o.created_at,
        cancelled_date: o.cancelled_date,
        delivery_address_id: o.delivery_address_id,
        sectors: o.sectors || null,
      }));
      setOrders(normalizedOrders);

      // 3) Build customer name/phone map from joined data
      const namePhoneMap = new Map<string, { name: string; phone?: string }>();
      uniqueOrders.forEach((o: any) => {
        // Supabase can return an array or object for joined tables depending on relationship
        const customerJoin = Array.isArray(o.customers) ? o.customers[0] : o.customers;
        const profileJoin = customerJoin?.profiles;
        const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
        const fullName = profile?.full_name;
        const phone = profile?.phone;
        const displayName = fullName && String(fullName).trim().length > 0 ? fullName : 'Customer';
        if (o.customer_id && !namePhoneMap.has(o.customer_id)) {
          namePhoneMap.set(o.customer_id, { name: displayName, phone: phone || undefined });
        }
      });

      // Fallback: if inline join didn’t populate names, fetch via separate queries
      if (namePhoneMap.size === 0 && uniqueOrders.length > 0) {
        const customerIds = Array.from(new Set(uniqueOrders.map((o: any) => o.customer_id).filter(Boolean)));
        if (customerIds.length > 0) {
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select('id, profile_id')
            .in('id', customerIds);
          if (customersError) throw customersError;

          const profileIds = Array.from(new Set((customersData || []).map((c: any) => c.profile_id).filter(Boolean)));
          if (profileIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, phone')
              .in('id', profileIds);
            if (profilesError) throw profilesError;
            const profilesMap = new Map<string, { full_name?: string; phone?: string }>();
            (profiles || []).forEach((p: any) => profilesMap.set(p.id, { full_name: p.full_name, phone: p.phone }));
            (customersData || []).forEach((c: any) => {
              const p = profilesMap.get(c.profile_id);
              const displayName = p?.full_name && String(p.full_name).trim().length > 0 ? p.full_name : 'Customer';
              namePhoneMap.set(c.id, { name: displayName, phone: p?.phone });
            });
          }
        }
      }

      setCustomerMap(namePhoneMap);

      // 4) Load address pincodes for orders
      const addressIds = Array.from(
        new Set(normalizedOrders.map(o => o.delivery_address_id).filter((id): id is string => !!id))
      );

      let pincodeMap = new Map<string, string>();
      let detailMap = new Map<string, { pincode: string; phone_number?: string; owner_name?: string; shop_name?: string }>();
      if (addressIds.length > 0) {
        const { data: addresses, error: addressError } = await supabase
          .from('customer_addresses')
          .select('id, pincode, phone_number, owner_name, shop_name')
          .in('id', addressIds);
        if (addressError) throw addressError;
        (addresses || []).forEach((a: any) => {
          pincodeMap.set(a.id, a.pincode);
          detailMap.set(a.id, {
            pincode: a.pincode,
            phone_number: a.phone_number || undefined,
            owner_name: a.owner_name || undefined,
            shop_name: a.shop_name || undefined,
          });
        });
      }
      setAddressPincodeMap(pincodeMap);
      setAddressDetailMap(detailMap);
    } catch (error: any) {
      console.error('Error loading customer analytics:', error);
      toast({ title: 'Error', description: 'Failed to load customer analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [computeDateRange, timeframe, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Derived metrics
  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const lower = search.toLowerCase();
    return orders.filter(o => {
      const customer = customerMap.get(o.customer_id);
      const name = customer?.name?.toLowerCase() || '';
      const phone = customer?.phone || '';
      const city = Array.isArray(o.sectors) ? o.sectors[0]?.city_name : (o.sectors as any)?.city_name;
      const pincode = o.delivery_address_id ? addressPincodeMap.get(o.delivery_address_id) : '';
      return (
        name.includes(lower) || phone.includes(search) || city?.toLowerCase()?.includes(lower) || pincode?.includes(search)
      );
    });
  }, [orders, customerMap, addressPincodeMap, search]);

  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const deliveredCount = filteredOrders.filter(o => o.order_status === 'delivered').length;
    const cancelledCount = filteredOrders.filter(o => o.order_status === 'cancelled').length;
    const gmv = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    return { totalOrders, deliveredCount, cancelledCount, gmv };
  }, [filteredOrders]);

  const byCustomer: CustomerRow[] = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    filteredOrders.forEach(o => {
      const key = o.customer_id;
      const customer = customerMap.get(o.customer_id);
      const addressDetail = o.delivery_address_id ? addressDetailMap.get(o.delivery_address_id) : undefined;
      const existing = map.get(key) || {
        customer_id: key,
        name: customer?.name || addressDetail?.owner_name || addressDetail?.shop_name || 'Customer',
        phone: customer?.phone || addressDetail?.phone_number,
        orders_count: 0,
        delivered_count: 0,
        cancelled_count: 0,
        total_value: 0,
        average_order_value: 0,
        last_order_date: undefined,
      };
      // If name/phone missing, try to enrich with address info from this order
      if (!existing.phone && addressDetail?.phone_number) existing.phone = addressDetail.phone_number;
      if ((!existing.name || existing.name === 'Customer') && (addressDetail?.owner_name || addressDetail?.shop_name)) {
        existing.name = addressDetail.owner_name || addressDetail.shop_name || existing.name;
      }
      existing.orders_count += 1;
      if (o.order_status === 'delivered') existing.delivered_count += 1;
      if (o.order_status === 'cancelled') existing.cancelled_count += 1;
      existing.total_value += o.total_amount || 0;
      if (!existing.last_order_date || new Date(o.created_at) > new Date(existing.last_order_date)) {
        existing.last_order_date = o.created_at;
      }
      map.set(key, existing);
    });
    const arr = Array.from(map.values()).map(row => ({
      ...row,
      average_order_value: row.orders_count > 0 ? row.total_value / row.orders_count : 0,
    }));
    // Sort by total value desc
    arr.sort((a, b) => b.total_value - a.total_value);
    return arr;
  }, [filteredOrders, customerMap, addressDetailMap]);

  const byCity: CityRow[] = useMemo(() => {
    const map = new Map<string, CityRow>();
    filteredOrders.forEach(o => {
      const sector = Array.isArray(o.sectors) ? o.sectors[0] : (o.sectors as any);
      const city = sector?.city_name || 'Unknown';
      const existing = map.get(city) || {
        city_name: city,
        orders_count: 0,
        delivered_count: 0,
        cancelled_count: 0,
        total_value: 0,
      };
      existing.orders_count += 1;
      if (o.order_status === 'delivered') existing.delivered_count += 1;
      if (o.order_status === 'cancelled') existing.cancelled_count += 1;
      existing.total_value += o.total_amount || 0;
      map.set(city, existing);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
    return arr;
  }, [filteredOrders]);

  const byPincode: PincodeRow[] = useMemo(() => {
    const map = new Map<string, PincodeRow>();
    filteredOrders.forEach(o => {
      const pincode = (o.delivery_address_id ? addressPincodeMap.get(o.delivery_address_id) : null) || 'Unknown';
      const existing = map.get(pincode) || {
        pincode,
        orders_count: 0,
        delivered_count: 0,
        cancelled_count: 0,
        total_value: 0,
      };
      existing.orders_count += 1;
      if (o.order_status === 'delivered') existing.delivered_count += 1;
      if (o.order_status === 'cancelled') existing.cancelled_count += 1;
      existing.total_value += o.total_amount || 0;
      map.set(pincode, existing);
    });
    const arr = Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
    return arr;
  }, [filteredOrders, addressPincodeMap]);

  const topCustomers = useMemo(() => byCustomer.slice(0, 10), [byCustomer]);

  const openCustomerOrders = async (row: CustomerRow) => {
    try {
      setSelectedCustomer(row);
      setCustomerOrdersLoading(true);
      const res = await OrderAPI.getCustomerOrders(row.customer_id);
      if (res.success) {
        const list: OrderRow[] = (res.data || []).map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          total_amount: parseFloat(o.total_amount) || 0,
          order_status: o.order_status,
          created_at: o.created_at,
        }));
        setCustomerOrders(list);
      } else {
        throw new Error(res.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load customer orders', variant: 'destructive' });
    } finally {
      setCustomerOrdersLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedCustomer(null);
    setCustomerOrders([]);
  };

  const headerTitle = useMemo(() => {
    if (timeframe === 'daily') return 'Daily';
    if (timeframe === 'monthly') return 'Monthly';
    return 'Overall';
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600">Analyze orders by customer, city, and pincode</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin-dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={refresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={timeframe} onValueChange={v => setTimeframe(v as Timeframe)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="overall">Overall</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 md:max-w-md">
            <Input
              placeholder="Search by customer, phone, city, pincode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{headerTitle} Orders</CardTitle>
              <CardDescription>Total number of orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalOrders.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-1">
                Delivered {summary.deliveredCount} • Cancelled {summary.cancelledCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{headerTitle} GMV</CardTitle>
              <CardDescription>Total order value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(summary.gmv)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Customer</CardTitle>
              <CardDescription>By total value</CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers[0] ? (
                <div className="space-y-1">
                  <div className="font-semibold">{topCustomers[0].name}</div>
                  <div className="text-sm text-gray-600">
                    {topCustomers[0].orders_count} orders • {formatCurrency(topCustomers[0].total_value)}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancellation Leaders</CardTitle>
              <CardDescription>Most cancellations</CardDescription>
            </CardHeader>
            <CardContent>
              {byCustomer.slice(0, 1).map(c => (
                <div key={c.customer_id} className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-gray-600">{c.cancelled_count} cancelled</div>
                  </div>
                  <Badge variant="secondary">{((c.cancelled_count / Math.max(1, c.orders_count)) * 100).toFixed(1)}%</Badge>
                </div>
              ))}
              {byCustomer.length === 0 && <div className="text-gray-500 text-sm">No data</div>}
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <Tabs defaultValue="customer" className="w-full">
          <TabsList>
            <TabsTrigger value="customer">
              <Users className="h-4 w-4 mr-2" /> By Customer
            </TabsTrigger>
            <TabsTrigger value="city">
              <Building className="h-4 w-4 mr-2" /> By City
            </TabsTrigger>
            <TabsTrigger value="pincode">
              <MapPin className="h-4 w-4 mr-2" /> By Pincode
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Customers ({byCustomer.length})</CardTitle>
                <CardDescription>Top performing customers and cancellations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Customer</th>
                        <th className="py-2 pr-4">Phone</th>
                        <th className="py-2 pr-4">Orders</th>
                        <th className="py-2 pr-4">Delivered</th>
                        <th className="py-2 pr-4">Cancelled</th>
                        <th className="py-2 pr-4">Total Value</th>
                        <th className="py-2 pr-4">Avg Order</th>
                        <th className="py-2 pr-4">Last Order</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCustomer.map((c) => (
                        <tr key={c.customer_id} className="border-t">
                          <td className="py-2 pr-4 font-medium">{c.name}</td>
                          <td className="py-2 pr-4">{c.phone || '-'}</td>
                          <td className="py-2 pr-4">{c.orders_count}</td>
                          <td className="py-2 pr-4">
                            <div className="inline-flex items-center gap-1">
                              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                              {c.delivered_count}
                            </div>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="inline-flex items-center gap-1">
                              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                              {c.cancelled_count}
                            </div>
                          </td>
                          <td className="py-2 pr-4">{formatCurrency(c.total_value)}</td>
                          <td className="py-2 pr-4">{formatCurrency(c.average_order_value)}</td>
                          <td className="py-2 pr-4">{c.last_order_date ? new Date(c.last_order_date).toLocaleString() : '-'}</td>
                          <td className="py-2 pr-4">
                            <Button size="sm" variant="outline" onClick={() => openCustomerOrders(c)}>
                              <Eye className="h-4 w-4 mr-2" /> View Orders
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="city">
            <Card>
              <CardHeader>
                <CardTitle>Orders by City</CardTitle>
                <CardDescription>{headerTitle} totals by city</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">City</th>
                        <th className="py-2 pr-4">Orders</th>
                        <th className="py-2 pr-4">Delivered</th>
                        <th className="py-2 pr-4">Cancelled</th>
                        <th className="py-2 pr-4">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCity.map((row) => (
                        <tr key={row.city_name} className="border-t">
                          <td className="py-2 pr-4 font-medium">{row.city_name}</td>
                          <td className="py-2 pr-4">{row.orders_count}</td>
                          <td className="py-2 pr-4">{row.delivered_count}</td>
                          <td className="py-2 pr-4">{row.cancelled_count}</td>
                          <td className="py-2 pr-4">{formatCurrency(row.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pincode">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Pincode</CardTitle>
                <CardDescription>{headerTitle} totals by pincode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Pincode</th>
                        <th className="py-2 pr-4">Orders</th>
                        <th className="py-2 pr-4">Delivered</th>
                        <th className="py-2 pr-4">Cancelled</th>
                        <th className="py-2 pr-4">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPincode.map((row) => (
                        <tr key={row.pincode} className="border-t">
                          <td className="py-2 pr-4 font-medium">{row.pincode}</td>
                          <td className="py-2 pr-4">{row.orders_count}</td>
                          <td className="py-2 pr-4">{row.delivered_count}</td>
                          <td className="py-2 pr-4">{row.cancelled_count}</td>
                          <td className="py-2 pr-4">{formatCurrency(row.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Customer Orders Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Orders for {selectedCustomer?.name}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {customerOrdersLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  Loading orders...
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="text-gray-600 py-6">No orders found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Order #</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.map(o => (
                        <tr key={o.id} className="border-t">
                          <td className="py-2 pr-4 font-medium">{o.order_number}</td>
                          <td className="py-2 pr-4">{new Date(o.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4">
                            <Badge variant={o.order_status === 'cancelled' ? 'destructive' : 'secondary'}>
                              {o.order_status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4">{formatCurrency(o.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {loading && (
        <div className="fixed inset-0 bg-black/5 flex items-center justify-center">
          <div className="bg-white shadow rounded px-6 py-4 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-gray-700">Loading customer analytics...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomerManagement; 
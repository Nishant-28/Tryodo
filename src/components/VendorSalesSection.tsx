import React, { useState, useEffect } from 'react';
import { 
  Package, Clock, MapPin, Phone, Star, TrendingUp, Users, 
  DollarSign, CheckCircle, AlertCircle, Eye, Truck, 
  ArrowRight, RefreshCw, Calendar, Target, Bell,
  ChevronDown, ChevronUp, Store, Timer, Navigation,
  Route, Copy, ExternalLink, Grid, List
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ConfirmedOrder, DeliveredOrder } from '../../pages/VendorDashboard';

interface SlotOrderGroup {
  slot_id: string | null;
  slot_name: string;
  slot_start_time: string | null;
  slot_end_time: string | null;
  delivery_date: string;
  sector_name: string | null;
  orders: ConfirmedOrder[];
  total_revenue: number;
  total_items: number;
  status: 'preparation' | 'ready' | 'out_for_delivery';
  priority_level: 'high' | 'medium' | 'low';
  estimated_prep_time?: string;
  progress: number;
}

interface VendorSalesSectionProps {
  vendor: any;
  confirmedOrders: ConfirmedOrder[];
  deliveredOrders: DeliveredOrder[];
  onRefresh: () => void;
  onAssignToDelivery: (order: ConfirmedOrder) => void;
  onUpdateOrderStatus: (orderItemId: string, status: string, notes?: string) => void;
  refreshing?: boolean;
}

const VendorSalesSection: React.FC<VendorSalesSectionProps> = ({
  vendor,
  confirmedOrders,
  deliveredOrders,
  onRefresh,
  onAssignToDelivery,
  onUpdateOrderStatus,
  refreshing = false
}) => {
  const [expandedSlot, setExpandedSlot] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  // Group orders by delivery slots with enhanced mobile-friendly logic
  const groupOrdersBySlots = (): SlotOrderGroup[] => {
    const activeOrders = confirmedOrders.filter(o => o.current_status !== 'delivered');
    
    const groupedOrders = activeOrders.reduce((acc: Record<string, SlotOrderGroup>, order: ConfirmedOrder) => {
      const slotKey = order.slot_id
        ? `slot_${order.slot_id}_${order.delivery_date || new Date(order.created_at).toISOString().split('T')[0]}`
        : `no-slot_${new Date(order.created_at).toISOString().split('T')[0]}`;

      if (!acc[slotKey]) {
        let priorityLevel: 'high' | 'medium' | 'low' = 'medium';
        let progress = 0;
        
        if (order.slot_start_time) {
          const slotHour = parseInt(order.slot_start_time.split(':')[0]);
          if (slotHour <= 10) priorityLevel = 'high';
          else if (slotHour <= 14) priorityLevel = 'medium';
          else priorityLevel = 'low';
        }

        // Calculate progress based on order statuses
        const orderStatuses = activeOrders.filter(o => 
          (o.slot_id === order.slot_id || (!o.slot_id && !order.slot_id))
        );
        const completedCount = orderStatuses.filter(o => 
          ['assigned_to_delivery', 'out_for_delivery', 'delivered'].includes(o.current_status)
        ).length;
        progress = orderStatuses.length ? Math.round((completedCount / orderStatuses.length) * 100) : 0;

        acc[slotKey] = {
          slot_id: order.slot_id,
          slot_name: order.slot_name || 'No Slot Assigned',
          slot_start_time: order.slot_start_time,
          slot_end_time: order.slot_end_time,
          delivery_date: order.delivery_date || new Date(order.created_at).toISOString().split('T')[0],
          sector_name: order.sector_name,
          orders: [],
          total_revenue: 0,
          total_items: 0,
          status: order.current_status === 'confirmed' ? 'preparation' :
                  order.current_status === 'assigned_to_delivery' ? 'ready' : 'out_for_delivery',
          priority_level: priorityLevel,
          estimated_prep_time: order.slot_start_time ? 
            new Date(Date.now() + 30 * 60000).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : undefined,
          progress
        };
      }
      
      acc[slotKey].orders.push(order);
      acc[slotKey].total_revenue += order.line_total;
      acc[slotKey].total_items += order.quantity;
      return acc;
    }, {} as Record<string, SlotOrderGroup>);

    return Object.values(groupedOrders).sort((a, b) => {
      const dateCompare = a.delivery_date.localeCompare(b.delivery_date);
      if (dateCompare !== 0) return dateCompare;
      
      if (a.slot_start_time && b.slot_start_time) {
        return a.slot_start_time.localeCompare(b.slot_start_time);
      }
      
      if (!a.slot_start_time && b.slot_start_time) return 1;
      if (a.slot_start_time && !b.slot_start_time) return -1;
      return 0;
    });
  };

  const filteredSlotGroups = groupOrdersBySlots().filter(group => {
    if (selectedSlotFilter === 'all') return true;
    
    if (!group.slot_start_time) return selectedSlotFilter === 'all';
    
    const hour = parseInt(group.slot_start_time.split(':')[0]);
    if (selectedSlotFilter === 'morning') return hour <= 10;
    if (selectedSlotFilter === 'afternoon') return hour > 10 && hour <= 14;
    if (selectedSlotFilter === 'evening') return hour > 14;
    
    return true;
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getSlotTimeFormat = (startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return 'No specific time';
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparation': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'out_for_delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-blue-300 bg-blue-50';
      case 'low': return 'border-purple-300 bg-purple-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile-First Header with Slot Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Today's Delivery Slots</h2>
            <p className="text-sm text-gray-600">Manage slot-based orders and track preparation progress</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Mobile: Stack buttons vertically */}
            <div className="flex gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex-1 rounded-lg"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4 mr-1" /> : <Grid className="h-4 w-4 mr-1" />}
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="flex-1 rounded-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden sm:flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="rounded-lg"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4 mr-1" /> : <Grid className="h-4 w-4 mr-1" />}
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="rounded-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['all', 'morning', 'afternoon', 'evening'].map((filter) => {
            const count = filter === 'all' 
              ? groupOrdersBySlots().length
              : groupOrdersBySlots().filter(group => {
                  if (!group.slot_start_time) return false;
                  const hour = parseInt(group.slot_start_time.split(':')[0]);
                  if (filter === 'morning') return hour <= 10;
                  if (filter === 'afternoon') return hour > 10 && hour <= 14;
                  if (filter === 'evening') return hour > 14;
                  return false;
                }).length;

            const isActive = selectedSlotFilter === filter;
            
            return (
              <button
                key={filter}
                onClick={() => setSelectedSlotFilter(filter as any)}
                className={cn(
                  "p-3 rounded-lg transition-all duration-200 text-center",
                  isActive 
                    ? "bg-white shadow-md border-2 border-blue-300" 
                    : "bg-white/50 hover:bg-white/80 border border-gray-200"
                )}
              >
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {filter === 'all' ? '📋 Total Slots' : 
                   filter === 'morning' ? '🌅 Morning' :
                   filter === 'afternoon' ? '☀️ Afternoon' : '🌆 Evening'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="confirmed" className="w-full mt-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-12">
          <TabsTrigger value="confirmed" className="text-base">Confirmed Orders</TabsTrigger>
          <TabsTrigger value="delivered" className="text-base">Delivered Orders</TabsTrigger>
          <TabsTrigger value="history" className="text-base">Delivery History</TabsTrigger>
        </TabsList>
        <TabsContent value="confirmed" className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Orders Awaiting Delivery</h3>
      {filteredSlotGroups.length === 0 ? (
            <Alert className="bg-white border-blue-200 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="font-medium">
                No confirmed orders currently awaiting pickup or delivery.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[600px] sm:h-[700px] lg:h-[800px] pr-4">
              <div className={cn("grid gap-4 sm:gap-6", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {filteredSlotGroups.map((group) => (
                  <Card key={group.slot_id || group.delivery_date} className={cn(
                    "shadow-lg border",
                getPriorityColor(group.priority_level)
                  )}>
                    <CardHeader className="pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-purple-600" />
                          {group.slot_name}
                          <Badge className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(group.status))}>
                            {group.status.replace(/_/g, ' ')}
                          </Badge>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedSlot(expandedSlot === group.slot_id ? '' : group.slot_id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expandedSlot === group.slot_id ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </div>
                      <CardDescription className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" /> {new Date(group.delivery_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        <span className="mx-1">•</span>
                        <Timer className="h-4 w-4" /> {getSlotTimeFormat(group.slot_start_time, group.slot_end_time)}
                      {group.sector_name && (
                          <>
                            <span className="mx-1">•</span>
                            <MapPin className="h-4 w-4" /> {group.sector_name}
                          </>
                        )}
                      </CardDescription>
                      <div className="mt-2 text-sm text-gray-700 font-medium flex justify-between items-center">
                        <span>Total Orders: {group.orders.length}</span>
                        <span>Revenue: ₹{group.total_revenue.toFixed(2)}</span>
                      </div>
                      <Progress value={group.progress} className="mt-2 h-2 bg-gray-200" indicatorColor="bg-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">{group.progress}% orders ready or out for delivery</p>
              </CardHeader>
              {expandedSlot === group.slot_id && (
                      <CardContent className="pt-4 space-y-4">
                        {group.orders.map((order: ConfirmedOrder) => (
                          <Card key={order.order_item_id} className="border-l-4 border-blue-400 shadow-sm">
                        <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-800 text-base">Order #{order.order_number.substring(0, 8)}</h4>
                                <Badge className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  order.current_status === 'confirmed' ? 'bg-orange-100 text-orange-800' :
                                  order.current_status === 'assigned_to_delivery' ? 'bg-indigo-100 text-indigo-800' :
                                  order.current_status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                )}>
                                  {order.current_status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">
                                <Package className="h-4 w-4 inline-block mr-1 text-gray-500" />
                                {order.product_name} x {order.quantity} (₹{order.line_total.toFixed(2)})
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                <Users className="h-4 w-4 inline-block mr-1 text-gray-500" />
                                Customer: {order.customer_name || 'N/A'} ({order.customer_phone || 'N/A'})
                              </p>
                              <p className="text-sm text-gray-600 mb-3">
                                <MapPin className="h-4 w-4 inline-block mr-1 text-gray-500" />
                                Delivery Address: {order.delivery_address?.address_box || 'N/A'}, {order.delivery_address?.pincode || 'N/A'}
                              </p>
                                
                                {order.current_status === 'confirmed' && (
                                    <Button
                                      size="sm"
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={() => onAssignToDelivery(order)}
                                    >
                                  <Truck className="h-4 w-4 mr-2" /> Assign to Delivery
                                    </Button>
                              )}

                              {order.current_status === 'assigned_to_delivery' && (
                                <div className="flex flex-col space-y-2 mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <p className="text-sm font-medium text-blue-800 flex items-center">
                                    <Truck className="h-4 w-4 mr-2" /> Assigned to: {order.delivery_partner_name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-blue-700 ml-6">
                                    Contact: {order.delivery_partner_phone || 'N/A'}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full border-blue-400 text-blue-700 hover:bg-blue-100"
                                    onClick={() => copyToClipboard(order.delivery_partner_phone || '')}
                                    disabled={!order.delivery_partner_phone}
                                  >
                                    <Copy className="h-3 w-3 mr-1" /> Copy Partner Phone
                                  </Button>
                                </div>
                              )}

                              {order.current_status === 'out_for_delivery' && (
                                <div className="flex flex-col space-y-2 mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                  <p className="text-sm font-medium text-green-800 flex items-center">
                                    <Truck className="h-4 w-4 mr-2" /> Out for Delivery
                                  </p>
                                  <p className="text-xs text-green-700 ml-6">
                                    Estimated delivery by: {order.delivered_at ? new Date(order.delivered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </p>
                              </div>
                              )}
                        </CardContent>
                      </Card>
                    ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="delivered" className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivered Orders</h3>
          {deliveredOrders.length === 0 ? (
            <Alert className="bg-white border-green-200 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <AlertDescription className="font-medium">
                No orders have been marked as delivered yet.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[600px] sm:h-[700px] lg:h-[800px] pr-4">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {deliveredOrders.map((order: DeliveredOrder) => (
                  <Card key={order.order_item_id} className="shadow-lg border border-green-300">
                    <CardHeader className="pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Order #{order.order_number.substring(0, 8)}
                        </CardTitle>
                        <Badge className="text-xs px-2 py-1 rounded-full bg-green-500 text-white">
                          Delivered
                        </Badge>
                      </div>
                      <CardDescription className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" /> {new Date(order.delivered_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        <span className="mx-1">•</span>
                        <Timer className="h-4 w-4" /> {new Date(order.delivered_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm text-gray-700">
                        <Package className="h-4 w-4 inline-block mr-1 text-gray-500" />
                        {order.product_name} x {order.quantity} (₹{order.line_total.toFixed(2)})
                      </p>
                      <p className="text-sm text-gray-600">
                        <Users className="h-4 w-4 inline-block mr-1 text-gray-500" />
                        Customer: {order.customer_name || 'N/A'} ({order.customer_phone || 'N/A'})
                      </p>
                      <p className="text-sm text-gray-600">
                        <MapPin className="h-4 w-4 inline-block mr-1 text-gray-500" />
                        Delivery Address: {order.delivery_address?.address_box || 'N/A'}, {order.delivery_address?.pincode || 'N/A'}
                      </p>
                      {order.delivery_partner_name && (
                        <p className="text-sm text-gray-600">
                          <Truck className="h-4 w-4 inline-block mr-1 text-gray-500" />
                          Delivered by: {order.delivery_partner_name}
                        </p>
                      )}
                      {order.rating && (
                        <p className="text-sm text-gray-600">
                          <Star className="h-4 w-4 inline-block mr-1 text-yellow-500" />
                          Customer Rating: {order.rating} / 5
                        </p>
                      )}
                      {order.customer_feedback && (
                        <p className="text-sm text-gray-600 italic">
                          "{order.customer_feedback}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Past Order History</h3>
          <Alert className="bg-white border-gray-200 text-gray-700">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="font-medium">
              This section will display a detailed history of all your past orders.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorSalesSection;

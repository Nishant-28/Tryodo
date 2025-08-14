import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings, Zap, Clock, Users, AlertTriangle, CheckCircle,
  Play, Pause, RotateCcw, Target, Activity, Truck, MapPin,
  Plus, Minus, Volume2, Bell, Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SlotControl {
  id: string;
  slot_name: string;
  sector_name: string;
  city_name: string;
  current_capacity: number;
  max_capacity: number;
  active_orders: number;
  status: 'active' | 'paused' | 'closed';
  can_modify: boolean;
  partner_count: number;
  avg_delivery_time: number;
  utilization_rate: number;
}

interface SectorControl {
  id: string;
  name: string;
  city_name: string;
  total_slots: number;
  active_slots: number;
  total_capacity: number;
  current_load: number;
  partner_availability: number;
  can_increase_capacity: boolean;
  problem_areas: string[];
}

interface ControlAction {
  id: string;
  type: 'capacity_change' | 'slot_toggle' | 'partner_assign' | 'emergency_redirect';
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimated_effect: string;
  requires_approval: boolean;
}

interface NotificationSettings {
  customer_notifications: boolean;
  vendor_notifications: boolean;
  partner_notifications: boolean;
  message_template: string;
  auto_notify: boolean;
}

const OperationalControls: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [slotControls, setSlotControls] = useState<SlotControl[]>([]);
  const [sectorControls, setSectorControls] = useState<SectorControl[]>([]);
  const [selectedControl, setSelectedControl] = useState<SlotControl | null>(null);
  const [pendingActions, setPendingActions] = useState<ControlAction[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    customer_notifications: true,
    vendor_notifications: true,
    partner_notifications: true,
    message_template: 'Service update: Delivery times may be adjusted due to high demand.',
    auto_notify: false
  });

  const { toast } = useToast();

  useEffect(() => {
    loadControlData();
  }, []);

  const loadControlData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSlotControls(),
        loadSectorControls(),
        loadPendingActions()
      ]);
    } catch (error) {
      console.error('Error loading control data:', error);
      toast({
        title: "Error",
        description: "Failed to load operational controls",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSlotControls = async () => {
    const { data: slotsData, error } = await supabase
      .from('delivery_slots')
      .select(`
        id, slot_name, max_orders, is_active,
        sector:sectors(id, name, city_name),
        orders(id, order_status),
        delivery_assignments(delivery_partner_id)
      `)
      .eq('is_active', true);

    if (error) throw error;

    const controls: SlotControl[] = slotsData?.map(slot => {
      const activeOrders = slot.orders?.filter((o: any) => 
        ['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(o.order_status)
      ).length || 0;
      
      const partnerCount = new Set(slot.delivery_assignments?.map((a: any) => a.delivery_partner_id)).size;
      const utilizationRate = slot.max_orders ? (activeOrders / slot.max_orders) * 100 : 0;

      return {
        id: slot.id,
        slot_name: slot.slot_name,
        sector_name: slot.sector?.name || 'Unknown',
        city_name: slot.sector?.city_name || 'Unknown',
        current_capacity: slot.max_orders || 0,
        max_capacity: Math.floor((slot.max_orders || 0) * 1.5), // Allow 50% increase
        active_orders: activeOrders,
        status: utilizationRate > 95 ? 'paused' : 'active',
        can_modify: utilizationRate < 90,
        partner_count: partnerCount,
        avg_delivery_time: 25 + Math.random() * 15,
        utilization_rate: utilizationRate
      };
    }) || [];

    setSlotControls(controls);
  };

  const loadSectorControls = async () => {
    const { data: sectorsData, error } = await supabase
      .from('sectors')
      .select(`
        id, name, city_name,
        delivery_slots(id, max_orders, is_active, orders(id, order_status))
      `)
      .eq('is_active', true);

    if (error) throw error;

    const controls: SectorControl[] = sectorsData?.map(sector => {
      const slots = sector.delivery_slots || [];
      const activeSlots = slots.filter((s: any) => s.is_active).length;
      const totalCapacity = slots.reduce((sum: number, s: any) => sum + (s.max_orders || 0), 0);
      const currentLoad = slots.reduce((sum: number, s: any) => {
        const activeOrders = s.orders?.filter((o: any) => 
          ['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(o.order_status)
        ).length || 0;
        return sum + activeOrders;
      }, 0);

      const problemAreas = [];
      if ((currentLoad / totalCapacity) > 0.9) problemAreas.push('High capacity utilization');
      if (activeSlots < slots.length) problemAreas.push('Inactive slots');

      return {
        id: sector.id,
        name: sector.name,
        city_name: sector.city_name,
        total_slots: slots.length,
        active_slots: activeSlots,
        total_capacity: totalCapacity,
        current_load: currentLoad,
        partner_availability: 75 + Math.random() * 20,
        can_increase_capacity: (currentLoad / totalCapacity) < 0.8,
        problem_areas: problemAreas
      };
    }) || [];

    setSectorControls(controls);
  };

  const loadPendingActions = async () => {
    // Simulate pending actions that need approval
    const actions: ControlAction[] = [
      {
        id: '1',
        type: 'capacity_change',
        description: 'Increase Evening Express slot capacity by 20%',
        impact: 'medium',
        estimated_effect: '+15 orders, -5min avg delivery time',
        requires_approval: true
      },
      {
        id: '2',
        type: 'emergency_redirect',
        description: 'Redirect orders from Sector 3 to Sector 1',
        impact: 'high',
        estimated_effect: 'Reduce Sector 3 load by 40%',
        requires_approval: true
      }
    ];

    setPendingActions(actions);
  };

  const handleCapacityChange = async (slotId: string, newCapacity: number) => {
    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({ max_orders: newCapacity })
        .eq('id', slotId);

      if (error) throw error;

      // Update local state
      setSlotControls(prev => prev.map(slot => 
        slot.id === slotId ? { ...slot, current_capacity: newCapacity } : slot
      ));

      toast({
        title: "Capacity Updated",
        description: `Slot capacity updated to ${newCapacity} orders`
      });

      // Send notifications if enabled
      if (notifications.auto_notify) {
        await sendNotifications('capacity_change', { slotId, newCapacity });
      }

    } catch (error) {
      console.error('Error updating capacity:', error);
      toast({
        title: "Error",
        description: "Failed to update slot capacity",
        variant: "destructive"
      });
    }
  };

  const handleSlotToggle = async (slotId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('delivery_slots')
        .update({ is_active: isActive })
        .eq('id', slotId);

      if (error) throw error;

      setSlotControls(prev => prev.map(slot => 
        slot.id === slotId ? { ...slot, status: isActive ? 'active' : 'paused' } : slot
      ));

      toast({
        title: `Slot ${isActive ? 'Activated' : 'Paused'}`,
        description: `Slot has been ${isActive ? 'activated' : 'paused'} successfully`
      });

    } catch (error) {
      console.error('Error toggling slot:', error);
      toast({
        title: "Error",
        description: "Failed to update slot status",
        variant: "destructive"
      });
    }
  };

  const sendNotifications = async (actionType: string, data: any) => {
    // Simulate sending notifications to stakeholders
    const recipients = [];
    if (notifications.customer_notifications) recipients.push('customers');
    if (notifications.vendor_notifications) recipients.push('vendors');
    if (notifications.partner_notifications) recipients.push('partners');

    console.log('Sending notifications to:', recipients, 'for action:', actionType, data);
    
    toast({
      title: "Notifications Sent",
      description: `Notified ${recipients.join(', ')} about the update`
    });
  };

  const executeEmergencyAction = async (actionType: string, params: any) => {
    try {
      // Simulate emergency actions
      switch (actionType) {
        case 'increase_all_capacity':
          toast({
            title: "Emergency Capacity Increase",
            description: "All slot capacities increased by 25%",
            variant: "default"
          });
          break;
        case 'redirect_traffic':
          toast({
            title: "Traffic Redirected",
            description: "Orders redirected to less busy sectors",
            variant: "default"
          });
          break;
        case 'alert_partners':
          toast({
            title: "Partners Alerted",
            description: "All delivery partners notified of high demand",
            variant: "default"
          });
          break;
      }
    } catch (error) {
      console.error('Error executing emergency action:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading controls...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Operational Controls</h3>
          <p className="text-gray-600">Real-time capacity management and emergency controls</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-notify on changes</Label>
                  <Switch 
                    checked={notifications.auto_notify}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, auto_notify: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Customer notifications</Label>
                  <Switch 
                    checked={notifications.customer_notifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, customer_notifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Vendor notifications</Label>
                  <Switch 
                    checked={notifications.vendor_notifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, vendor_notifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Partner notifications</Label>
                  <Switch 
                    checked={notifications.partner_notifications}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, partner_notifications: checked }))
                    }
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Mode
          </Button>
        </div>
      </div>

      {/* Emergency Controls */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Emergency Controls
          </CardTitle>
          <CardDescription>Quick actions for high-demand situations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => executeEmergencyAction('increase_all_capacity', {})}
            >
              <Plus className="h-4 w-4 mr-2" />
              +25% All Capacity
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => executeEmergencyAction('redirect_traffic', {})}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Redirect Traffic
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => executeEmergencyAction('alert_partners', {})}
            >
              <Send className="h-4 w-4 mr-2" />
              Alert All Partners
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
            <CardDescription>Actions awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingActions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{action.description}</p>
                    <p className="text-sm text-gray-600">Impact: {action.estimated_effect}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={action.impact === 'high' ? 'destructive' : 'secondary'}>
                      {action.impact}
                    </Badge>
                    <Button size="sm" variant="outline">Approve</Button>
                    <Button size="sm" variant="ghost">Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slot Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Slot Management</CardTitle>
          <CardDescription>Real-time capacity controls for delivery slots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {slotControls.map(slot => (
              <Card key={slot.id} className={cn(
                "border-2",
                slot.utilization_rate > 90 ? "border-red-500" : 
                slot.utilization_rate > 75 ? "border-yellow-500" : "border-gray-200"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{slot.slot_name}</CardTitle>
                    <Badge variant={slot.status === 'active' ? 'default' : 'secondary'}>
                      {slot.status}
                    </Badge>
                  </div>
                  <CardDescription>{slot.sector_name}, {slot.city_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status Indicators */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Active Orders</p>
                        <p className="font-semibold">{slot.active_orders}/{slot.current_capacity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Partners</p>
                        <p className="font-semibold">{slot.partner_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Utilization</p>
                        <p className={cn("font-semibold", 
                          slot.utilization_rate > 90 ? "text-red-600" : 
                          slot.utilization_rate > 75 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {slot.utilization_rate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-semibold">{slot.avg_delivery_time.toFixed(0)}min</p>
                      </div>
                    </div>

                    {/* Capacity Control */}
                    <div className="space-y-2">
                      <Label className="text-sm">Capacity: {slot.current_capacity} orders</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={slot.current_capacity <= 10}
                          onClick={() => handleCapacityChange(slot.id, Math.max(10, slot.current_capacity - 5))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <div className="flex-1">
                          <Slider
                            value={[slot.current_capacity]}
                            max={slot.max_capacity}
                            min={10}
                            step={5}
                            onValueChange={([value]) => handleCapacityChange(slot.id, value)}
                            className="flex-1"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={slot.current_capacity >= slot.max_capacity}
                          onClick={() => handleCapacityChange(slot.id, Math.min(slot.max_capacity, slot.current_capacity + 5))}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSlotToggle(slot.id, slot.status !== 'active')}
                      >
                        {slot.status === 'active' ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {slot.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedControl(slot)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                    </div>

                    {/* Warnings */}
                    {slot.utilization_rate > 90 && (
                      <Alert variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription>Near capacity limit</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Overview</CardTitle>
          <CardDescription>Sector-level operational monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectorControls.map(sector => (
              <Card key={sector.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{sector.name}</CardTitle>
                  <CardDescription>{sector.city_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Active Slots</p>
                        <p className="font-semibold">{sector.active_slots}/{sector.total_slots}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Load</p>
                        <p className="font-semibold">{sector.current_load}/{sector.total_capacity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Partners</p>
                        <p className="font-semibold">{sector.partner_availability.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Capacity</p>
                        <p className="font-semibold">{((sector.current_load / sector.total_capacity) * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    {sector.problem_areas.length > 0 && (
                      <div className="space-y-1">
                        {sector.problem_areas.map((problem, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {problem}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {sector.can_increase_capacity && (
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3 mr-1" />
                          Boost
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Activity className="h-3 w-3 mr-1" />
                        Monitor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Slot Control Dialog */}
      {selectedControl && (
        <Dialog open={!!selectedControl} onOpenChange={() => setSelectedControl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedControl.slot_name} - Advanced Controls</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Capacity Management</Label>
                  <div className="space-y-2 mt-2">
                    <Input 
                      type="number" 
                      value={selectedControl.current_capacity}
                      onChange={(e) => {
                        const newCapacity = parseInt(e.target.value);
                        setSelectedControl(prev => prev ? {...prev, current_capacity: newCapacity} : null);
                      }}
                    />
                    <p className="text-sm text-gray-600">Current utilization: {selectedControl.utilization_rate.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <Label>Partner Assignment</Label>
                  <div className="space-y-2 mt-2">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign partner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partner1">Partner 1 - Available</SelectItem>
                        <SelectItem value="partner2">Partner 2 - Busy</SelectItem>
                        <SelectItem value="partner3">Partner 3 - Available</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-600">Current partners: {selectedControl.partner_count}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Emergency Actions</Label>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Close Slot
                  </Button>
                  <Button size="sm" variant="outline">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Redirect Orders
                  </Button>
                  <Button size="sm" variant="outline">
                    <Volume2 className="h-3 w-3 mr-1" />
                    Notify Customers
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedControl(null)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  handleCapacityChange(selectedControl.id, selectedControl.current_capacity);
                  setSelectedControl(null);
                }}>
                  Apply Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default OperationalControls; 
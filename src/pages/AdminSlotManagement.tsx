import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit3, Trash2, Search, Filter, Calendar, MapPin, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import { deliverySlotAPI, sectorAPI, type DeliverySlot, type Sector } from '@/lib/deliveryApi';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface SlotFormData {
  sector_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  cutoff_time: string;
  pickup_delay_minutes: number;
  max_orders: number;
  is_active: boolean;
  day_of_week?: number[];
}

const AdminSlotManagement = () => {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);
  const [formData, setFormData] = useState<SlotFormData>({
    sector_id: '',
    slot_name: '',
    start_time: '',
    end_time: '',
    cutoff_time: '',
    pickup_delay_minutes: 45,
    max_orders: 30,
    is_active: true,
    day_of_week: undefined
  });
  const [submitting, setSubmitting] = useState(false);

  const weekDays = [
    { id: 0, name: 'Sunday', short: 'Sun' },
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [slotsData, sectorsData] = await Promise.all([
        deliverySlotAPI.getAll(),
        sectorAPI.getAll()
      ]);
      setSlots(slotsData);
      setSectors(sectorsData.filter(s => s.is_active));
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = () => {
    setEditingSlot(null);
    setFormData({
      sector_id: '',
      slot_name: '',
      start_time: '',
      end_time: '',
      cutoff_time: '',
      pickup_delay_minutes: 45,
      max_orders: 30,
      is_active: true,
      day_of_week: undefined
    });
    setShowModal(true);
  };

  const handleEditSlot = (slot: DeliverySlot) => {
    setEditingSlot(slot);
    setFormData({
      sector_id: slot.sector_id,
      slot_name: slot.slot_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      cutoff_time: slot.cutoff_time,
      pickup_delay_minutes: slot.pickup_delay_minutes,
      max_orders: slot.max_orders,
      is_active: slot.is_active,
      day_of_week: slot.day_of_week
    });
    setShowModal(true);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot? This action cannot be undone.')) {
      return;
    }

    try {
      await deliverySlotAPI.delete(slotId);
      setSlots(slots.filter(s => s.id !== slotId));
      toast({
        title: "Success",
        description: "Slot deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      toast({
        title: "Error",
        description: "Failed to delete slot",
        variant: "destructive",
      });
    }
  };

  const validateFormData = () => {
    if (!formData.sector_id || !formData.slot_name.trim() || 
        !formData.start_time || !formData.end_time || !formData.cutoff_time) {
      return "Please fill in all required fields";
    }

    if (formData.start_time >= formData.end_time) {
      return "End time must be after start time";
    }

    if (formData.cutoff_time > formData.start_time) {
      return "Cutoff time must be before or equal to start time";
    }

    if (formData.pickup_delay_minutes < 0 || formData.pickup_delay_minutes > 1440) {
      return "Pickup delay must be between 0 and 1440 minutes (24 hours)";
    }

    if (formData.max_orders < 1 || formData.max_orders > 200) {
      return "Max orders must be between 1 and 200";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateFormData();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingSlot) {
        console.log('Updating slot with data:', formData);
        const updatedSlot = await deliverySlotAPI.update(editingSlot.id, formData);
        console.log('Updated slot response:', updatedSlot);
        setSlots(slots.map(s => s.id === editingSlot.id ? updatedSlot : s));
        toast({
          title: "Success",
          description: "Slot updated successfully",
        });
      } else {
        console.log('Creating slot with data:', formData);
        const newSlot = await deliverySlotAPI.create(formData);
        console.log('Created slot response:', newSlot);
        setSlots([...slots, newSlot]);
        toast({
          title: "Success",
          description: "Slot created successfully",
        });
      }

      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving slot:', error);
      console.error('Error details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save slot",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDayToggle = (dayId: number, checked: boolean) => {
    if (!formData.day_of_week) {
      // If no specific days set, initialize with all days except the one being unchecked
      if (!checked) {
        setFormData(prev => ({
          ...prev,
          day_of_week: weekDays.filter(d => d.id !== dayId).map(d => d.id)
        }));
      }
      return;
    }

    if (checked) {
      // Add the day
      setFormData(prev => ({
        ...prev,
        day_of_week: [...(prev.day_of_week || []), dayId].sort()
      }));
    } else {
      // Remove the day
      const newDays = (formData.day_of_week || []).filter(d => d !== dayId);
      setFormData(prev => ({
        ...prev,
        day_of_week: newDays.length === 0 ? undefined : newDays
      }));
    }
  };

  const getFilteredSlots = () => {
    return slots.filter(slot => {
      const matchesSearch = 
        slot.slot_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.sector?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.sector?.city_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSector = sectorFilter === 'all' || slot.sector_id === sectorFilter;
      
      return matchesSearch && matchesSector;
    });
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getSlotTypeColor = (pickupDelay: number) => {
    if (pickupDelay <= 180) return 'bg-green-100 text-green-800';
    if (pickupDelay <= 720) return 'bg-blue-100 text-blue-800';
    return 'bg-purple-100 text-purple-800';
  };

  const getSlotTypeLabel = (pickupDelay: number) => {
    if (pickupDelay <= 180) return 'Express';
    if (pickupDelay <= 720) return 'Same Day';
    return 'Next Day';
  };

  const getSlotStats = () => {
    const total = slots.length;
    const active = slots.filter(s => s.is_active).length;
    const totalCapacity = slots.reduce((sum, s) => sum + s.max_orders, 0);
    
    return { total, active, totalCapacity };
  };

  const stats = getSlotStats();
  const filteredSlots = getFilteredSlots();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => { }} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading slots...</h2>
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
              <Clock className="h-8 w-8 text-blue-600" />
              Slot Management
            </h1>
            <p className="text-gray-600 mt-2">Manage delivery time slots and availability</p>
          </div>
          
          <Button 
            onClick={handleCreateSlot}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={sectors.length === 0}
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </Button>
        </div>

        {sectors.length === 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              No active sectors found. Please create sectors first before adding delivery slots.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Slots</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Slots</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCapacity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search slots, sectors, or cities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="w-full sm:w-64">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name} ({sector.city_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Slots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSlots.map((slot) => (
            <Card key={slot.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      {slot.slot_name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {slot.sector?.name} • {slot.sector?.city_name}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={slot.is_active ? "default" : "secondary"}>
                      {slot.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge className={getSlotTypeColor(slot.pickup_delay_minutes)}>
                      {getSlotTypeLabel(slot.pickup_delay_minutes)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">Time Window</Label>
                    <p className="font-medium">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Cutoff Time</Label>
                    <p className="font-medium">{formatTime(slot.cutoff_time)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Pickup Delay</Label>
                    <p className="font-medium">{slot.pickup_delay_minutes} mins</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Max Orders</Label>
                    <p className="font-medium">{slot.max_orders}</p>
                  </div>
                </div>
                
                {slot.day_of_week && slot.day_of_week.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">Available Days</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {slot.day_of_week.map(dayId => (
                        <Badge key={dayId} variant="outline" className="text-xs">
                          {weekDays.find(d => d.id === dayId)?.short}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(slot.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSlot(slot)}
                      className="flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSlots.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No slots found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || sectorFilter !== 'all' 
                  ? 'No slots match your current filters.' 
                  : 'Get started by creating your first delivery slot.'
                }
              </p>
              {(!searchTerm && sectorFilter === 'all' && sectors.length > 0) && (
                <Button onClick={handleCreateSlot} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Create First Slot
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? 'Edit Delivery Slot' : 'Create New Delivery Slot'}
            </DialogTitle>
            <DialogDescription>
              {editingSlot 
                ? 'Update the slot timing and configuration.'
                : 'Create a new delivery time slot for customer selection.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector_id">Sector *</Label>
                <Select value={formData.sector_id} onValueChange={(value) => setFormData(prev => ({ ...prev, sector_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(sector => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name} ({sector.city_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slot_name">Slot Name *</Label>
                <Input
                  id="slot_name"
                  value={formData.slot_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, slot_name: e.target.value }))}
                  placeholder="e.g., Morning Express"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cutoff_time">Cutoff Time *</Label>
                <Input
                  id="cutoff_time"
                  type="time"
                  value={formData.cutoff_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, cutoff_time: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_delay_minutes">Pickup Delay (minutes) *</Label>
                <Input
                  id="pickup_delay_minutes"
                  type="number"
                  value={formData.pickup_delay_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickup_delay_minutes: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="1440"
                  placeholder="45"
                />
                <p className="text-xs text-gray-500">Time between cutoff and pickup start</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_orders">Max Orders *</Label>
                <Input
                  id="max_orders"
                  type="number"
                  value={formData.max_orders}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_orders: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="200"
                  placeholder="30"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Available Days (Optional)</Label>
              <p className="text-xs text-gray-500 mb-3">
                Leave all unchecked for available all days. Select specific days to limit availability.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.id}`}
                      checked={!formData.day_of_week || formData.day_of_week.includes(day.id)}
                      onCheckedChange={(checked) => handleDayToggle(day.id, checked as boolean)}
                    />
                    <Label 
                      htmlFor={`day-${day.id}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.short}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="is_active" className="text-sm font-medium">
                  Active Status
                </Label>
                <p className="text-xs text-gray-500">
                  Only active slots will be available for selection
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Saving...' : editingSlot ? 'Update Slot' : 'Create Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSlotManagement; 
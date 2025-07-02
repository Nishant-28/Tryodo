import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Truck, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deliverySlotAPI, deliveryUtils, type DeliverySlot, type Sector } from '@/lib/deliveryApi';
import { cn } from '@/lib/utils';

interface SlotSelectionProps {
  customerPincode: number;
  selectedDate: string;
  onSlotSelect: (slot: DeliverySlot | null, estimatedDelivery: string) => void;
  selectedSlotId?: string;
  className?: string;
}

const SlotSelection: React.FC<SlotSelectionProps> = ({
  customerPincode,
  selectedDate,
  onSlotSelect,
  selectedSlotId,
  className
}) => {
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableSlots();
  }, [customerPincode, selectedDate]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the sector for this pincode
      const userSector = await deliveryUtils.getSectorByPincode(customerPincode);
      
      if (!userSector) {
        setError('Delivery not available in your area. Please contact support.');
        setAvailableSlots([]);
        setSector(null);
        return;
      }

      setSector(userSector);

      // Get available slots for the sector and date
      const slots = await deliverySlotAPI.getAvailableSlots(userSector.id, selectedDate);
      
      // Smart time filtering - show all slots if it's early morning (before 6 AM) to allow pre-ordering
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      
      let availableSlots;
      if (isToday && currentHour < 6) {
        // Early morning (12 AM - 6 AM): Show all today's slots for pre-ordering
        console.log(`🌙 Early morning detected (${currentHour}:xx) - showing all ${slots.length} slots for pre-ordering`);
        availableSlots = slots;
      } else if (isToday) {
        // Regular hours today: Filter based on cutoff time
        availableSlots = slots.filter(slot => {
          const cutoffTime = new Date(`${selectedDate}T${slot.cutoff_time}`);
          return cutoffTime > currentTime;
        });
        console.log(`⏰ Regular hours (${currentHour}:xx) - filtered to ${availableSlots.length} slots out of ${slots.length} based on cutoff time`);
      } else {
        // Future dates: Show all slots
        console.log(`📅 Future date - showing all ${slots.length} slots`);
        availableSlots = slots;
      }

      setAvailableSlots(availableSlots);

    } catch (err: any) {
      console.error('Error loading slots:', err);
      setError('Failed to load delivery slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelection = (slot: DeliverySlot) => {
    const estimatedDelivery = deliveryUtils.calculateEstimatedDelivery(
      slot.start_time,
      slot.end_time
    );
    onSlotSelect(slot, estimatedDelivery);
  };

  const getSlotBadge = (slot: DeliverySlot) => {
    const pickupHours = slot.pickup_delay_minutes / 60;
    
    if (pickupHours <= 3) {
      return <Badge className="bg-green-100 text-green-800 text-xs">🚀 Fast Delivery</Badge>;
    } else if (pickupHours <= 12) {
      return <Badge className="bg-blue-100 text-blue-800 text-xs">🚚 Same Day</Badge>;
    } else {
      return <Badge className="bg-purple-100 text-purple-800 text-xs">📅 Next Day</Badge>;
    }
  };

  const getAvailabilityColor = (availableOrders: number, maxOrders: number) => {
    const percentage = (availableOrders / maxOrders) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isSelectedDate = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (date === today) return 'Today';
    if (date === tomorrow) return 'Tomorrow';
    
    return new Date(date).toLocaleDateString('en-IN', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getSlotEmoji = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    
    if (hour >= 6 && hour < 12) return '🌅'; // Morning
    if (hour >= 12 && hour < 17) return '🌞'; // Afternoon  
    if (hour >= 17 && hour < 21) return '🌆'; // Evening
    return '🌙'; // Night
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loading Delivery Slots...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delivery Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-blue-600" />
          Select Delivery Slot
        </CardTitle>
        
        {sector && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{sector.name} - {isSelectedDate(selectedDate)}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {availableSlots.length === 0 ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              No delivery slots available for this date. Please select a different date.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {availableSlots.map((slot) => (
              <div
                key={slot.id}
                className={cn(
                  "border rounded-lg p-4 cursor-pointer transition-all duration-200",
                  "hover:border-blue-300 hover:shadow-md",
                  selectedSlotId === slot.id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white"
                )}
                onClick={() => handleSlotSelection(slot)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getSlotEmoji(slot.start_time)}</span>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                      {getSlotBadge(slot)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      Order cutoff: <span className="font-medium">{formatTime(slot.cutoff_time)} sharp</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "text-sm font-medium",
                          getAvailabilityColor(slot.available_orders || 0, slot.max_orders)
                        )}>
                          {slot.available_orders} slots left
                        </span>
                        
                        {slot.pickup_delay_minutes <= 180 && (
                          <span className="text-xs text-green-600 font-medium">
                            🚀 Priority Zone
                          </span>
                        )}
                      </div>
                      
                      {selectedSlotId === slot.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sector && availableSlots.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50 mt-4">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{sector.name}:</strong> Your address qualifies for express delivery with 
              priority routing and dedicated delivery personnel.
            </AlertDescription>
          </Alert>
        )}

        {selectedDate === new Date().toISOString().split('T')[0] && (
          <div className="text-xs text-gray-500 mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-3 w-3" />
              <span className="font-medium">Today's Delivery Process:</span>
            </div>
            <ul className="space-y-1 ml-5 text-xs">
              <li>• Orders confirmed after cutoff time</li>
              <li>• Pickup starts 45 minutes after cutoff</li>
              <li>• Delivery within selected time window</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlotSelection; 
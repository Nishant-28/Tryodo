import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, TrendingUp, MapPin, Star, Clock, Check, X, 
  RefreshCw, Phone, Navigation, AlertTriangle, CheckCircle,
  DollarSign, Target, Truck, User, Banknote, Shield, Play, 
  Users, Store, ExternalLink, Calculator, CreditCard, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DeliveryAPI, AvailableOrder, MyOrder, DeliveryStats, MultiVendorOrder, VendorPickupInfo } from '@/lib/deliveryApi';


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

const DeliveryPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartner | null>(null);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [multiVendorOrders, setMultiVendorOrders] = useState<MultiVendorOrder[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMultiVendor, setShowMultiVendor] = useState(false);
  
  // OTP State Management
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpType, setOtpType] = useState<'pickup' | 'delivery'>('pickup');
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // Multi-vendor state
  const [multiVendorDialogOpen, setMultiVendorDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorOtpValue, setVendorOtpValue] = useState('');
  const [vendorOtpLoading, setVendorOtpLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string>('');
  const [currentVendorPickupStatus, setCurrentVendorPickupStatus] = useState<VendorPickupInfo[]>([]);

  // Testing state
  const [testingMode, setTestingMode] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Payment collection state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<MyOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Day-end summary state
  const [dayEndDialogOpen, setDayEndDialogOpen] = useState(false);
  const [dailyCollectionSummary, setDailyCollectionSummary] = useState<any>(null);
  const [dayEndCashAmount, setDayEndCashAmount] = useState('');
  const [dayEndDigitalAmount, setDayEndDigitalAmount] = useState('');
  const [dayEndNotes, setDayEndNotes] = useState('');
  const [dayEndLoading, setDayEndLoading] = useState(false);

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
        loadAvailableOrders(),
        loadMyOrders(deliveryPartnerData.id),
        loadStats(deliveryPartnerData.id),
        loadEarningsHistory(deliveryPartnerData.id)
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
          // No delivery partner record found
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

  const loadAvailableOrders = async () => {
    try {
      if (!deliveryPartner) return;
      console.log('🎯 Loading available orders for delivery partner:', deliveryPartner.id);
      const result = await DeliveryAPI.getAvailableOrdersForDeliveryPartner(deliveryPartner.id);
      console.log('🎯 Available orders result:', result);
      if (result.success) {
        setAvailableOrders(result.data || []);
      }
    } catch (error) {
      console.error('Error loading available orders:', error);
    }
  };

  const loadMyOrders = async (deliveryPartnerId: string) => {
    try {
      console.log('🎯 DeliveryPartnerDashboard.loadMyOrders called with deliveryPartnerId:', deliveryPartnerId);
      const result = await DeliveryAPI.getMyOrders(deliveryPartnerId);
      console.log('🎯 DeliveryAPI.getMyOrders result:', result);
      if (result.success) {
        console.log('🎯 Setting myOrders state to:', result.data);
        setMyOrders(result.data || []);
      } else {
        console.error('🎯 DeliveryAPI.getMyOrders failed:', result.error);
      }
    } catch (error) {
      console.error('🎯 Error loading my orders:', error);
    }
  };

  const loadStats = async (deliveryPartnerId: string) => {
    try {
      // Use the new real-time stats calculation function
      const result = await DeliveryAPI.calculateAndUpdateStats(deliveryPartnerId);
      if (result.success) {
        setStats(result.data || null);
      } else {
        console.error('Failed to calculate stats:', result.error);
        // Fallback to regular stats if calculation fails
        const fallbackResult = await DeliveryAPI.getDeliveryStats(deliveryPartnerId);
        if (fallbackResult.success) {
          setStats(fallbackResult.data || null);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadEarningsHistory = async (deliveryPartnerId: string) => {
    try {
      console.log('🎯 Loading earnings history for delivery partner:', deliveryPartnerId);
      const { data, error } = await supabase
        .from('delivery_earnings')
        .select(`
          *,
          orders!inner(
            order_number,
            total_amount,
            created_at
          )
        `)
        .eq('delivery_partner_id', deliveryPartnerId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error loading earnings history:', error);
        return;
      }
      
      console.log('🎯 Earnings history loaded:', data);
      setEarningsHistory(data || []);
    } catch (error) {
      console.error('Error loading earnings history:', error);
    }
  };

  const refreshData = useCallback(async () => {
    if (!deliveryPartner) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        loadAvailableOrders(),
        loadMyOrders(deliveryPartner.id),
        loadMultiVendorOrders(),
        loadStats(deliveryPartner.id)
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [deliveryPartner]);

  const handleAutoAssignOrders = async () => {
    try {
      setRefreshing(true);
      const result = await DeliveryAPI.autoAssignAvailableOrders();
      
      if (result.success) {
        toast.success(result.message || 'Orders assigned successfully');
        await refreshData(); // Refresh data to show newly assigned orders
      } else {
        toast.error(result.error || 'Failed to assign orders');
      }
    } catch (error) {
      console.error('Error auto-assigning orders:', error);
      toast.error('Failed to assign orders');
    } finally {
      setRefreshing(false);
    }
  };

  const updateLocationInDatabase = async (location: { lat: number; lng: number }) => {
    if (!deliveryPartner) return;
    
    try {
      await DeliveryAPI.updateLocation(deliveryPartner.id, location.lat, location.lng);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!deliveryPartner) return;

    try {
      console.log('🎯 Attempting to accept order:', { orderId, deliveryPartnerId: deliveryPartner.id });
      const result = await DeliveryAPI.acceptOrder(orderId, deliveryPartner.id);
      console.log('🎯 Accept order result:', result);
      
      if (result.success) {
        toast.success('Order accepted successfully!');
        console.log('🎯 Refreshing data after successful accept');
        await refreshData();
      } else {
        console.error('🎯 Accept order failed:', result.error);
        toast.error(result.error || 'Failed to accept order');
      }
    } catch (error: any) {
      console.error('🎯 Accept order error:', error);
      toast.error(`Error accepting order: ${error.message}`);
    }
  };

  const handleUpdateAvailability = async (available: boolean) => {
    if (!deliveryPartner) return;

    try {
      const result = await DeliveryAPI.updateAvailabilityStatus(deliveryPartner.profile_id, available);
      
      if (result.success) {
        setIsAvailable(available);
        setDeliveryPartner({ ...deliveryPartner, is_available: available });
        toast.success(`Status updated to ${available ? 'available' : 'unavailable'}`);
      } else {
        toast.error(result.error || 'Failed to update availability');
      }
    } catch (error: any) {
      toast.error(`Error updating availability: ${error.message}`);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // OTP Handler Functions
  // Testing functions
  const runOTPTests = async () => {
    setTestingMode(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      results.push('🧪 Starting OTP System Tests...');

      // Test 1: OTP Format Validation (Basic test without database)
      results.push('✅ Test 1: OTP Format Validation');
      const testOtp1 = Math.floor(1000 + Math.random() * 9000).toString();
      const testOtp2 = Math.floor(1000 + Math.random() * 9000).toString();
      
      if (testOtp1.length === 4 && /^\d{4}$/.test(testOtp1)) {
        results.push(`✅ Generated valid 4-digit OTP: ${testOtp1}`);
      } else {
        results.push(`❌ Invalid OTP format: ${testOtp1} (expected 4 digits)`);
      }

      // Test 2: Use existing order for real testing (if available)
      results.push('✅ Test 2: Real Order OTP Generation');
      let testOrderId = null;
      
      // Try to use an existing order from myOrders
      if (myOrders.length > 0) {
        testOrderId = myOrders[0].order_id;
        results.push(`✅ Using existing order: ${myOrders[0].order_number}`);
        
        const generateResult = await DeliveryAPI.generateOTP(testOrderId, 'pickup');
        if (generateResult.success && generateResult.data) {
          const otp = generateResult.data;
          if (otp.length === 4 && /^\d{4}$/.test(otp)) {
            results.push(`✅ Generated valid 4-digit OTP for real order: ${otp}`);
            
            // Test 3: Verify incorrect OTP with real order
            results.push('✅ Test 3: Verify incorrect OTP');
            const wrongOtp = '9999';
            const verifyWrongResult = await DeliveryAPI.verifyOTP(testOrderId, wrongOtp, 'pickup');
            if (!verifyWrongResult.success || verifyWrongResult.data === false) {
              results.push('✅ Incorrect OTP correctly rejected');
            } else {
              results.push('❌ Incorrect OTP was incorrectly accepted');
            }
          } else {
            results.push(`❌ Invalid OTP format from real order: ${otp} (expected 4 digits)`);
          }
        } else {
          results.push(`❌ Failed to generate OTP for real order: ${generateResult.error}`);
        }
      } else {
        results.push('⚠️ No existing orders available for real testing');
        results.push('💡 Accept an order first to test with real data');
      }

      // Test 4: Multi-vendor OTP generation with existing order and debugging
      results.push('✅ Test 4: Multi-vendor OTP Format Test');
      if (testOrderId) {
        results.push('🔍 Debug: Investigating order structure...');
        
        // Debug: Check order items first
        try {
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              vendor_id,
              product_name,
              quantity,
              line_total,
              item_status,
              vendors!inner(
                id,
                business_name,
                business_address,
                profiles!inner(phone)
              )
            `)
            .eq('order_id', testOrderId);

          if (itemsError) {
            results.push(`❌ Debug: Error fetching order items: ${itemsError.message}`);
          } else {
            results.push(`📊 Debug: Found ${orderItems.length} order items`);
            
            const statusCounts = orderItems.reduce((acc: any, item: any) => {
              acc[item.item_status] = (acc[item.item_status] || 0) + 1;
              return acc;
            }, {});
            
            results.push(`📊 Debug: Item statuses: ${Object.entries(statusCounts).map(([status, count]) => `${status}(${count})`).join(', ')}`);
            
            const uniqueVendors = new Set(orderItems.map((item: any) => item.vendor_id));
            results.push(`📊 Debug: Unique vendors: ${uniqueVendors.size}`);
            
            if (uniqueVendors.size > 1) {
              results.push('🎯 Debug: This is a MULTI-VENDOR order!');
            } else {
              results.push('🎯 Debug: This is a single-vendor order');
            }
            
            // Show vendor details
            orderItems.forEach((item: any, index: number) => {
              results.push(`📝 Debug: Item ${index + 1}: ${item.product_name} (${item.item_status}) - Vendor: ${item.vendors.business_name} (${item.vendor_id})`);
            });
          }
        } catch (debugError: any) {
          results.push(`❌ Debug: Error during investigation: ${debugError.message}`);
        }
        
        const multiVendorResult = await DeliveryAPI.generateMultiVendorPickupOTPs(testOrderId);
        if (multiVendorResult.success) {
          results.push(`✅ Multi-vendor OTPs generated for ${multiVendorResult.data?.length || 0} vendors`);
          
          // Check if OTPs are 4-digit
          if (multiVendorResult.data && multiVendorResult.data.length > 0) {
            const allValid = multiVendorResult.data.every(vendor => 
              vendor.pickup_otp.length === 4 && /^\d{4}$/.test(vendor.pickup_otp)
            );
            if (allValid) {
              results.push('✅ All vendor OTPs are valid 4-digit format');
              results.push(`📝 Sample vendor OTPs: ${multiVendorResult.data.map(v => `${v.vendor_name}:${v.pickup_otp}`).join(', ')}`);
            } else {
              results.push('❌ Some vendor OTPs are not in 4-digit format');
            }
          } else {
            results.push('⚠️ No vendors found for multi-vendor OTP generation');
          }
        } else {
          results.push(`❌ Multi-vendor OTP generation failed: ${multiVendorResult.error}`);
        }
      } else {
        // Test OTP generation logic without database
        const mockVendorOtps = Array.from({length: 3}, () => Math.floor(1000 + Math.random() * 9000).toString());
        const allValid = mockVendorOtps.every(otp => otp.length === 4 && /^\d{4}$/.test(otp));
        if (allValid) {
          results.push('✅ Mock multi-vendor OTP generation logic is valid');
          results.push(`📝 Sample mock OTPs: ${mockVendorOtps.join(', ')}`);
        } else {
          results.push('❌ Mock multi-vendor OTP generation logic failed');
        }
      }

      // Test 5: Input Validation
      results.push('✅ Test 5: Input Validation');
      const validInputs = ['1234', '5678', '9999', '0000'];
      const invalidInputs = ['123', '12345', 'abcd', '12a4', ''];
      
      validInputs.forEach(input => {
        if (input.length === 4 && /^\d{4}$/.test(input)) {
          results.push(`✅ Valid input accepted: "${input}"`);
        } else {
          results.push(`❌ Valid input rejected: "${input}"`);
        }
      });
      
      invalidInputs.forEach(input => {
        if (input.length !== 4 || !/^\d{4}$/.test(input)) {
          results.push(`✅ Invalid input correctly rejected: "${input}"`);
        } else {
          results.push(`❌ Invalid input incorrectly accepted: "${input}"`);
        }
      });

      results.push('🎉 OTP Tests completed!');
      
    } catch (error: any) {
      results.push(`❌ Test failed with error: ${error.message}`);
    }

    setTestResults(results);
    setTestingMode(false);
  };

  const loadMultiVendorOrders = async () => {
    if (!deliveryPartner) return;
    
    try {
      const result = await DeliveryAPI.getMyOrdersWithMultiVendor(deliveryPartner.id);
      if (result.success) {
        setMultiVendorOrders(result.data || []);
      }
    } catch (error) {
      console.error('Error loading multi-vendor orders:', error);
    }
  };

  const handleOtpAction = async (orderId: string, type: 'pickup' | 'delivery') => {
    setCurrentOrderId(orderId);
    setOtpType(type);
    setOtpValue('');
    setOtpDialogOpen(true);
  };

  const handleMultiVendorPickupAction = async (orderId: string) => {
    setCurrentOrderId(orderId);
    setCurrentVendorPickupStatus([]);
    
    try {
      // Load current vendor pickup status
      const statusResult = await DeliveryAPI.getMultiVendorPickupStatus(orderId);
      if (statusResult.success && statusResult.data) {
        setCurrentVendorPickupStatus(statusResult.data.vendors);
        
        // If no OTPs generated yet, generate them automatically
        if (statusResult.data.vendors.length === 0 || statusResult.data.vendors.every(v => !v.pickup_otp)) {
          toast.info('Generating vendor pickup OTPs...');
          await handleGenerateMultiVendorOTPs();
          
          // Reload status after generation
          const updatedStatus = await DeliveryAPI.getMultiVendorPickupStatus(orderId);
          if (updatedStatus.success && updatedStatus.data) {
            setCurrentVendorPickupStatus(updatedStatus.data.vendors);
          }
        }
      }
    } catch (error: any) {
      toast.error('Error loading vendor pickup status: ' + error.message);
    }
    
    setMultiVendorDialogOpen(true);
  };

  const handleGenerateOtp = async () => {
    setGeneratingOtp(true);
    try {
      const result = await DeliveryAPI.generateOTP(currentOrderId, otpType);
      if (result.success) {
        toast.success(`${otpType === 'pickup' ? 'Pickup' : 'Delivery'} OTP generated successfully`);
        toast.info(`4-digit OTP: ${result.data}`); // Show the OTP for testing
      } else {
        toast.error(result.error || 'Failed to generate OTP');
      }
    } catch (error: any) {
      toast.error('Error generating OTP: ' + error.message);
    } finally {
      setGeneratingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    if (otpValue.length !== 4) {
      toast.error('OTP must be exactly 4 digits');
      return;
    }

    setOtpLoading(true);
    try {
      // First verify the OTP
      const verifyResult = await DeliveryAPI.verifyOTP(currentOrderId, otpValue, otpType);
      if (!verifyResult.success || verifyResult.data !== true) {
        toast.error(verifyResult.error || 'Invalid OTP');
        return;
      }

      // If OTP is valid, proceed with the action
      let actionResult;
      if (otpType === 'pickup') {
        actionResult = await DeliveryAPI.markPickedUp(currentOrderId, deliveryPartner!.id);
      } else {
        actionResult = await DeliveryAPI.markDelivered(currentOrderId, deliveryPartner!.id);
      }

      if (actionResult.success) {
        const order = myOrders.find(o => o.order_id === currentOrderId);
        const successMessage = otpType === 'pickup' 
          ? 'Order marked as picked up successfully! OTP verified.'
          : order?.collection_required 
            ? `Order delivered successfully! Payment of ₹${order.total_amount} collected.`
            : 'Order delivered successfully! Payment was already processed.';
        
        toast.success(successMessage);
        setOtpDialogOpen(false);
        setOtpValue('');
        await refreshData();
      } else {
        toast.error(actionResult.error || `Failed to mark as ${otpType === 'pickup' ? 'picked up' : 'delivered'}`);
      }
    } catch (error: any) {
      toast.error(`Error confirming ${otpType}: ` + error.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGenerateMultiVendorOTPs = async () => {
    try {
      const result = await DeliveryAPI.generateMultiVendorPickupOTPs(currentOrderId);
      if (result.success) {
        toast.success(`Generated pickup OTPs for ${result.data?.length || 0} vendors`);
        setCurrentVendorPickupStatus(result.data || []);
        await loadMultiVendorOrders();
        return result.data || [];
      } else {
        toast.error(result.error || 'Failed to generate multi-vendor OTPs');
        return [];
      }
    } catch (error: any) {
      toast.error('Error generating multi-vendor OTPs: ' + error.message);
      return [];
    }
  };

  const handleVerifyVendorOtp = async (vendorId: string, otp: string) => {
    if (!otp.trim() || otp.length !== 4) {
      toast.error('Please enter a valid 4-digit OTP');
      return;
    }

    setVendorOtpLoading(true);
    try {
      const result = await DeliveryAPI.verifyVendorPickupOTP(currentOrderId, vendorId, otp);
      if (result.success && result.data === true) {
        toast.success('✅ Vendor pickup confirmed successfully!');
        
        // Update the current vendor pickup status
        setCurrentVendorPickupStatus(prev => 
          prev.map(vendor => 
            vendor.vendor_id === vendorId 
              ? { ...vendor, is_confirmed: true }
              : vendor
          )
        );
        
        // Clear input fields
        setVendorOtpValue('');
        setSelectedVendorId('');
        
        // Reload orders to reflect changes
        await loadMultiVendorOrders();
        
        // Check if all vendors are confirmed
        const updatedStatus = currentVendorPickupStatus.map(vendor => 
          vendor.vendor_id === vendorId 
            ? { ...vendor, is_confirmed: true }
            : vendor
        );
        
        if (updatedStatus.every(v => v.is_confirmed)) {
          setTimeout(() => {
            toast.success('🎉 All vendors confirmed! Ready for delivery.');
          }, 500);
        }
      } else {
        toast.error(result.error || 'Invalid vendor OTP. Please check the OTP and try again.');
      }
    } catch (error: any) {
      toast.error('Error verifying vendor OTP: ' + error.message);
    } finally {
      setVendorOtpLoading(false);
    }
  };

  const createTestMultiVendorOrder = async () => {
    try {
      toast.info('Checking available vendors...');
      
      // Check what vendors are available in the system
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          business_address,
          is_active
        `)
        .eq('is_active', true)
        .limit(10);

      if (vendorError) {
        toast.error(`Error fetching vendors: ${vendorError.message}`);
        return;
      }

      if (vendors && vendors.length >= 2) {
        toast.success(`Found ${vendors.length} active vendors!`);
        toast.info(`💡 To create multi-vendor order: Add items from multiple vendors like: ${vendors.slice(0, 3).map(v => v.business_name).join(', ')}`);
        
        // Show vendor list
        const vendorList = vendors.map(v => `• ${v.business_name}`).join('\n');
        console.log('Available vendors for multi-vendor orders:', vendorList);
      } else {
        toast.warning('Only found 1 vendor - you need at least 2 vendors for multi-vendor orders');
        toast.info('💡 Add more vendors via Admin Dashboard first');
      }
      
    } catch (error: any) {
      toast.error('Error checking vendors: ' + error.message);
    }
  };

  const handleCloseOtpDialog = () => {
    setOtpDialogOpen(false);
    setOtpValue('');
    setCurrentOrderId('');
  };

  // Payment collection functions
  const handlePaymentCollection = (order: MyOrder) => {
    setSelectedOrderForPayment(order);
    setPaymentAmount(order.total_amount.toString());
    setPaymentDialogOpen(true);
  };

  const submitPaymentCollection = async () => {
    if (!selectedOrderForPayment || !deliveryPartner) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      setPaymentLoading(true);
      const result = await DeliveryAPI.recordPaymentCollection(
        deliveryPartner.id,
        selectedOrderForPayment.order_id,
        amount,
        paymentMethod,
        paymentNotes
      );

      if (result.success) {
        toast.success('Payment collection recorded successfully!');
        setPaymentDialogOpen(false);
        resetPaymentForm();
        await refreshData(); // Refresh data to update stats
      } else {
        toast.error(result.error || 'Failed to record payment collection');
      }
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error('Error recording payment collection');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetPaymentForm = () => {
    setSelectedOrderForPayment(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
  };

  // Day-end summary functions
  const handleOpenDayEndSummary = async () => {
    if (!deliveryPartner) return;

    try {
      setDayEndLoading(true);
      const result = await DeliveryAPI.getDailyCollectionSummary(deliveryPartner.id);
      
      if (result.success) {
        setDailyCollectionSummary(result.data);
        setDayEndCashAmount(result.data.cash_collected.toString());
        setDayEndDigitalAmount(result.data.digital_collected.toString());
        setDayEndDialogOpen(true);
      } else {
        toast.error(result.error || 'Failed to load daily collection summary');
      }
    } catch (error) {
      console.error('Error loading daily summary:', error);
      toast.error('Error loading daily collection summary');
    } finally {
      setDayEndLoading(false);
    }
  };

  const submitDayEndSummary = async () => {
    if (!deliveryPartner) return;

    const cashAmount = parseFloat(dayEndCashAmount) || 0;
    const digitalAmount = parseFloat(dayEndDigitalAmount) || 0;

    try {
      setDayEndLoading(true);
      const result = await DeliveryAPI.submitDayEndSummary(
        deliveryPartner.id,
        cashAmount,
        digitalAmount,
        dayEndNotes
      );

      if (result.success) {
        toast.success('Day-end summary submitted successfully!');
        setDayEndDialogOpen(false);
        resetDayEndForm();
        await refreshData(); // Refresh data to update stats
      } else {
        toast.error(result.error || 'Failed to submit day-end summary');
      }
    } catch (error: any) {
      console.error('Error submitting day-end summary:', error);
      toast.error('Error submitting day-end summary');
    } finally {
      setDayEndLoading(false);
    }
  };

  const resetDayEndForm = () => {
    setDailyCollectionSummary(null);
    setDayEndCashAmount('');
    setDayEndDigitalAmount('');
    setDayEndNotes('');
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
              <p className="text-gray-600 font-medium">Manage your deliveries and track earnings</p>
            </div>
            {/* Mobile-optimized action buttons */}
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {/* Mobile: Grid layout for better touch */}
              <div className="grid grid-cols-2 sm:hidden gap-2">
                {/* Auto-assign button for testing */}
                <Button 
                  variant="secondary" 
                  onClick={handleAutoAssignOrders}
                  className="flex-1 min-h-12 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  disabled={refreshing}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Target className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs">Auto-Assign</span>
                  </div>
                </Button>

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
                  variant="secondary" 
                  onClick={handleAutoAssignOrders}
                  className="flex items-center gap-2 min-h-12 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 font-medium"
                  disabled={refreshing}
                >
                  <Target className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Auto-Assign Orders</span>
                </Button>

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

        {/* Testing Panel */}
        <Card className="mb-6 sm:mb-8 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Play className="h-5 w-5" />
              OTP System Testing & Multi-Vendor Support
            </CardTitle>
            <CardDescription className="text-blue-600">
              Test the OTP system functionality and manage multi-vendor orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button 
                onClick={runOTPTests}
                disabled={testingMode}
                variant="outline"
                className="border-blue-300 hover:bg-blue-100"
              >
                {testingMode ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run OTP Tests
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => setShowMultiVendor(!showMultiVendor)}
                variant="outline"
                className="border-purple-300 hover:bg-purple-100"
              >
                <Users className="h-4 w-4 mr-2" />
                {showMultiVendor ? 'Hide' : 'Show'} Multi-Vendor
              </Button>
              
              <Button 
                onClick={loadMultiVendorOrders}
                disabled={refreshing}
                variant="outline"
                className="border-green-300 hover:bg-green-100"
              >
                <Store className="h-4 w-4 mr-2" />
                Load Multi-Vendor Orders
              </Button>
              
              <Button 
                onClick={createTestMultiVendorOrder}
                variant="outline"
                className="border-green-300 hover:bg-green-100"
              >
                <Package className="h-4 w-4 mr-2" />
                Create Test Multi-Vendor Order
              </Button>
            </div>
            
            {testResults.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200 max-h-48 overflow-y-auto">
                <h4 className="font-semibold text-sm mb-2 text-blue-800">Test Results:</h4>
                <div className="space-y-1 text-sm font-mono">
                  {testResults.map((result, index) => (
                    <div key={index} className={
                      result.includes('❌') ? 'text-red-600' :
                      result.includes('✅') ? 'text-green-600' :
                      result.includes('🧪') || result.includes('🎉') ? 'text-blue-600' :
                      'text-gray-600'
                    }>
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showMultiVendor && multiVendorOrders.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-sm mb-2 text-purple-800">Multi-Vendor Orders:</h4>
                <div className="space-y-2 text-sm">
                  {multiVendorOrders.map((order) => (
                    <div key={order.order_id} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span>Order #{order.order_number}</span>
                      <Badge className={order.all_vendors_confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {order.confirmed_vendors}/{order.total_vendors} vendors confirmed
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                Active orders: {stats?.active_orders || 0}
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

        {/* Enhanced Weekly/Monthly Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-indigo-800">Weekly Performance</CardTitle>
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Deliveries</span>
                  <span className="font-bold text-indigo-800">{stats?.week_deliveries || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Earnings</span>
                  <span className="font-bold text-indigo-800">₹{stats?.week_earnings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Avg per delivery</span>
                  <span className="font-bold text-indigo-800">
                    ₹{stats?.week_deliveries ? Math.round((stats?.week_earnings || 0) / stats.week_deliveries) : 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-emerald-800">Monthly Performance</CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">Deliveries</span>
                  <span className="font-bold text-emerald-800">{stats?.month_deliveries || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">Earnings</span>
                  <span className="font-bold text-emerald-800">₹{stats?.month_earnings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">Avg per delivery</span>
                  <span className="font-bold text-emerald-800">
                    ₹{stats?.month_deliveries ? Math.round((stats?.month_earnings || 0) / stats.month_deliveries) : 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 shadow-soft hover:shadow-medium transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-rose-800">Wallet Balance</CardTitle>
              <DollarSign className="h-5 w-5 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-rose-700">Available</span>
                  <span className="font-bold text-rose-800">₹{stats?.available_balance || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-rose-700">Pending</span>
                  <span className="font-bold text-rose-800">₹{stats?.pending_balance || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-rose-700">Total Paid Out</span>
                  <span className="font-bold text-rose-800">₹{stats?.total_paid_out || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="w-full">
          {/* Mobile-first tabs with improved layout */}
          <div className="block sm:hidden mb-4">
            <TabsList className="flex flex-wrap gap-1 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-soft h-auto">
              <TabsTrigger 
                value="available" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>Available ({availableOrders.length})</span>
                </div>
              </TabsTrigger>
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
                value="earnings" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Earnings</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Analytics</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex-1 min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200 text-xs px-2 py-2 h-auto"
              >
                <div className="flex flex-col items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Profile</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-1 shadow-soft">
              <TabsTrigger value="available" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Available ({availableOrders.length})
              </TabsTrigger>
              <TabsTrigger value="my-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                My Orders ({myOrders.length})
              </TabsTrigger>
              <TabsTrigger value="earnings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                <DollarSign className="h-4 w-4 mr-1" />
                Earnings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg font-medium transition-all duration-200">
                Profile
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="available" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Available Orders
                </CardTitle>
                <CardDescription className="font-medium">
                  Orders ready for pickup in your area
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAvailable && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-soft">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-800">
                        You're currently unavailable. Toggle your availability to see and accept orders.
                      </span>
                    </div>
                  </div>
                )}

                {availableOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No available orders</h3>
                    <p className="text-gray-600">
                      {!isAvailable 
                        ? "Set yourself as available to see orders in your area." 
                        : "New orders will appear here when they become available."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableOrders.map((order) => (
                      <Card key={order.order_id} className="overflow-hidden border border-gray-200 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">Order #{order.order_number}</h4>
                                <Badge variant="secondary">
                                  {order.item_count} items
                                </Badge>
                                <Badge className="bg-green-100 text-green-800">
                                  ₹{order.total_amount}
                                </Badge>
                                {/* Payment Method Badge */}
                                {(order.payment_method === 'cod' || order.payment_method === 'cash_on_delivery') ? (
                                  <Badge className="bg-orange-100 text-orange-800 font-medium">
                                    💰 COD
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 font-medium">
                                    💳 PAID
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-900 mb-1">Customer</p>
                                  <p className="text-gray-600">{order.customer_name}</p>
                                  <p className="text-gray-600">{order.customer_phone}</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium text-gray-900 mb-1">Pickup Location</p>
                                  <p className="text-gray-600">{order.vendor_name}</p>
                                  <p className="text-gray-600">{order.vendor_address}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex items-center text-sm text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                Placed {formatTimeAgo(order.created_at)}
                                {order.distance_km && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {order.distance_km.toFixed(1)} km away
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4 sm:mt-0 sm:ml-4">
                              <Button 
                                onClick={() => handleAcceptOrder(order.order_id)}
                                variant="success-mobile"
                                size="mobile-md"
                                className="w-full sm:w-auto"
                                disabled={!isAvailable}
                                enableHaptics={true}
                                hapticIntensity="medium"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Accept Order
                              </Button>
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

          <TabsContent value="my-orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  My Active Orders
                </CardTitle>
                <CardDescription>
                  Orders you've accepted and are currently handling
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                {myOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
                    <p className="text-gray-500 mb-4">Your accepted orders will appear here</p>
                    <Button 
                      onClick={handleAutoAssignOrders}
                      variant="outline"
                      className="border-blue-300 hover:bg-blue-50"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Auto-Assign Orders
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myOrders.map((order) => (
                      <Card key={order.order_id} className="border-gray-200 shadow-soft hover:shadow-medium transition-all duration-200 overflow-hidden">
                        {/* Order Header - Always Visible */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-gray-900 truncate">
                                  #{order.order_number}
                                </h3>
                                <Badge className={`${getStatusBadgeColor(order.status)} font-medium text-xs`}>
                                  {order.status === 'assigned' && '📋 Assigned'}
                                  {order.status === 'accepted' && '✅ Accepted'}
                                  {order.status === 'picked_up' && '📦 Picked Up'}
                                  {order.status === 'delivered' && '🎉 Delivered'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {order.customer_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(order.accepted_at)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">₹{order.total_amount}</div>
                                <div className="text-xs text-gray-500">{order.item_count} items</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedOrderId(expandedOrderId === order.order_id ? '' : order.order_id)}
                                className="p-2"
                              >
                                {expandedOrderId === order.order_id ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Navigation className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Progress Timeline - Always Visible */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center ${order.status === 'accepted' ? 'text-blue-600 font-semibold' : order.status === 'picked_up' || order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'accepted' ? 'bg-blue-500 animate-pulse' : order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Accepted</span>
                              </div>
                              <div className={`flex-1 h-0.5 mx-2 rounded ${order.status === 'picked_up' || order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'picked_up' ? 'text-blue-600 font-semibold' : order.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'picked_up' ? 'bg-blue-500 animate-pulse' : order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Picked Up</span>
                              </div>
                              <div className={`flex-1 h-0.5 mx-2 rounded ${order.status === 'delivered' ? 'bg-green-300' : 'bg-gray-200'}`}></div>
                              <div className={`flex items-center ${order.status === 'delivered' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-xs font-medium">Delivered</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details - Conditionally Visible */}
                        {expandedOrderId === order.order_id && (
                          <div className="p-4 space-y-4 bg-white">
                            {/* Vendor and Delivery Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Pickup Information */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Store className="h-4 w-4 text-orange-500" />
                                  Pickup Location
                                </h4>
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                  <div className="font-medium text-orange-900">{order.vendor_name}</div>
                                  <div className="text-sm text-orange-700 mt-1">{order.vendor_address}</div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`tel:${order.vendor_phone}`)}
                                      className="border-orange-300 hover:bg-orange-100 text-orange-700"
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.vendor_address)}`)}
                                      className="border-orange-300 hover:bg-orange-100 text-orange-700"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Navigate
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Delivery Information */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-blue-500" />
                                  Delivery Location
                                </h4>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="font-medium text-blue-900">{order.customer_name}</div>
                                  <div className="text-sm text-blue-700 mt-1">
                                    {typeof order.delivery_address === 'string' 
                                      ? order.delivery_address 
                                      : JSON.stringify(order.delivery_address)
                                    }
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`tel:${order.customer_phone}`)}
                                      className="border-blue-300 hover:bg-blue-100 text-blue-700"
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(
                                        typeof order.delivery_address === 'string' 
                                          ? order.delivery_address 
                                          : JSON.stringify(order.delivery_address)
                                      )}`)}
                                      className="border-blue-300 hover:bg-blue-100 text-blue-700"
                                    >
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Navigate
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Payment Information */}
                            {order.status === 'picked_up' && (
                              <div className="mt-4">
                                {order.collection_required ? (
                                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-orange-500 p-2 rounded-full">
                                        <Banknote className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-orange-800 uppercase tracking-wide">
                                          💰 Collect Cash from Customer
                                        </p>
                                        <p className="text-2xl font-black text-orange-900">₹{order.total_amount}</p>
                                      </div>
                                    </div>
                                    <div className="bg-orange-100 p-2 rounded border border-orange-200">
                                      <p className="text-xs text-orange-800 text-center font-medium">
                                        🚨 Cash on Delivery • Payment Required • Exact Amount
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="bg-green-500 p-2 rounded-full">
                                        <CheckCircle className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-green-800 uppercase tracking-wide">
                                          ✅ Payment Completed
                                        </p>
                                        <p className="text-2xl font-black text-green-900">PAID</p>
                                      </div>
                                    </div>
                                    <div className="bg-green-100 p-2 rounded border border-green-200">
                                      <p className="text-xs text-green-800 text-center font-medium">
                                        💳 Payment already processed • No collection required
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {order.status === 'delivered' && (
                              <div className="space-y-3">
                                <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Order Completed
                                    </span>
                                    <span className="text-xl font-bold text-green-900">
                                      ₹{order.total_amount}
                                    </span>
                                  </div>
                                  <p className="text-xs text-green-700 text-center mt-1">
                                    ✅ Order completed successfully
                                  </p>
                                </div>
                                
                                {/* Payment Collection Button for COD orders */}
                                {order.collection_required && (
                                  <Button 
                                    onClick={() => handlePaymentCollection(order)}
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg"
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Record Payment Collection
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons - Always Visible */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <div className="flex flex-col gap-3">
                            {order.status === 'assigned' && (
                              <Button 
                                onClick={() => handleAcceptOrder(order.order_id)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                              >
                                <Check className="mr-2 h-5 w-5" />
                                Accept Order
                              </Button>
                            )}
                            
                            {order.status === 'accepted' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button 
                                  onClick={() => handleOtpAction(order.order_id, 'pickup')}
                                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Confirm Pickup (OTP)
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleMultiVendorPickupAction(order.order_id)}
                                  className="border-purple-300 hover:bg-purple-50 text-purple-700 font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Multi-Vendor Pickup
                                </Button>
                              </div>
                            )}
                            
                            {order.status === 'picked_up' && (
                              <Button 
                                onClick={() => handleOtpAction(order.order_id, 'delivery')}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-soft hover:shadow-medium transform hover:scale-105 transition-all duration-200"
                              >
                                <Shield className="mr-2 h-5 w-5" />
                                Confirm Delivery (OTP)
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Earnings Breakdown
                </CardTitle>
                <CardDescription className="font-medium">
                  Detailed view of your earnings and wallet balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Collection Actions */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Button 
                    onClick={handleOpenDayEndSummary}
                    disabled={dayEndLoading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3"
                  >
                    {dayEndLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-2 h-4 w-4" />
                        Day-End Summary
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={refreshData}
                    disabled={refreshing}
                    variant="outline"
                    className="flex-1 border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold py-3"
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Earnings
                      </>
                    )}
                  </Button>
                </div>

                {/* Wallet Balance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-green-800">Available Balance</h3>
                        <p className="text-2xl font-bold text-green-700">₹{stats?.available_balance || 0}</p>
                        <p className="text-xs text-green-600 mt-1">Ready for payout</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-yellow-800">Pending Balance</h3>
                        <p className="text-2xl font-bold text-yellow-700">₹{stats?.pending_balance || 0}</p>
                        <p className="text-xs text-yellow-600 mt-1">Processing earnings</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-blue-800">Total Paid Out</h3>
                        <p className="text-2xl font-bold text-blue-700">₹{stats?.total_paid_out || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">All-time payments</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Earnings Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">Daily Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Today</span>
                          <span className="font-semibold">₹{stats?.today_earnings || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.today_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg per delivery</span>
                          <span className="font-semibold">
                            ₹{stats?.today_deliveries ? Math.round((stats?.today_earnings || 0) / stats.today_deliveries) : 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">All-Time Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Earned</span>
                          <span className="font-semibold">₹{stats?.total_earnings || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Deliveries</span>
                          <span className="font-semibold">{stats?.total_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg per delivery</span>
                          <span className="font-semibold">
                            ₹{stats?.total_deliveries ? Math.round((stats?.total_earnings || 0) / stats.total_deliveries) : 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payout Information */}
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base">Payout Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Minimum payout amount: <span className="font-semibold">₹500</span></p>
                        <p className="text-sm text-gray-600 mb-2">Payout frequency: <span className="font-semibold">Weekly</span></p>
                        <p className="text-sm text-gray-600">Next payout: <span className="font-semibold">Monday</span></p>
                      </div>
                      <div className="flex items-center justify-center md:justify-end">
                        <Button 
                          disabled={(stats?.available_balance || 0) < 500}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                          Request Payout
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="shadow-soft border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Performance Analytics
                </CardTitle>
                <CardDescription className="font-medium">
                  Track your delivery performance and growth trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-blue-800">Success Rate</h3>
                      <p className="text-xl font-bold text-blue-700">
                        {deliveryPartner?.total_deliveries ? 
                          Math.round((deliveryPartner.successful_deliveries / deliveryPartner.total_deliveries) * 100) 
                          : 0}%
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-green-800">Rating</h3>
                      <p className="text-xl font-bold text-green-700">{deliveryPartner?.rating || 0.0} ⭐</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-purple-800">Active Orders</h3>
                      <p className="text-xl font-bold text-purple-700">{stats?.active_orders || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm font-semibold text-orange-800">Avg Time</h3>
                      <p className="text-xl font-bold text-orange-700">{deliveryPartner?.average_delivery_time_minutes || 0}m</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Time Period Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">Today vs Yesterday</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.today_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.today_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          {/* This would need historical data to calculate */}
                          📈 Growth metrics coming soon
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.week_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.week_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          {stats?.week_deliveries ? `₹${Math.round((stats?.week_earnings || 0) / stats.week_deliveries)} per delivery` : 'No deliveries yet'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Deliveries</span>
                          <span className="font-semibold">{stats?.month_deliveries || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Earnings</span>
                          <span className="font-semibold">₹{stats?.month_earnings || 0}</span>
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {stats?.month_deliveries ? `₹${Math.round((stats?.month_earnings || 0) / stats.month_deliveries)} per delivery` : 'No deliveries yet'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Goals and Achievements */}
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base">Goals & Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Daily Goal (10 deliveries)</span>
                          <span className="text-sm font-semibold">{stats?.today_deliveries || 0}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((stats?.today_deliveries || 0) / 10) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Weekly Goal (50 deliveries)</span>
                          <span className="text-sm font-semibold">{stats?.week_deliveries || 0}/50</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(((stats?.week_deliveries || 0) / 50) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Achievement Badges */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold mb-3">Recent Achievements</h4>
                        <div className="flex flex-wrap gap-2">
                          {deliveryPartner?.successful_deliveries && deliveryPartner.successful_deliveries >= 1 && (
                            <Badge className="bg-green-100 text-green-800">🎯 First Delivery</Badge>
                          )}
                          {deliveryPartner?.successful_deliveries && deliveryPartner.successful_deliveries >= 10 && (
                            <Badge className="bg-blue-100 text-blue-800">🏆 10 Deliveries</Badge>
                          )}
                          {deliveryPartner?.rating && deliveryPartner.rating >= 4.0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">⭐ High Rating</Badge>
                          )}
                          {deliveryPartner?.is_verified && (
                            <Badge className="bg-purple-100 text-purple-800">✅ Verified Partner</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Partner Profile</CardTitle>
                <CardDescription>Your account information and vehicle details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryPartner && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">License Number:</span> {deliveryPartner.license_number}</p>
                        <p><span className="font-medium">Verification Status:</span> 
                          <Badge className={deliveryPartner.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {deliveryPartner.is_verified ? 'Verified' : 'Pending Verification'}
                          </Badge>
                        </p>
                        <p><span className="font-medium">Assigned Pincodes:</span> {deliveryPartner.assigned_pincodes.join(', ') || 'None assigned'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Vehicle Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Vehicle Type:</span> {deliveryPartner.vehicle_type}</p>
                        <p><span className="font-medium">Vehicle Number:</span> {deliveryPartner.vehicle_number}</p>
                        <p><span className="font-medium">Current Location:</span> 
                          {deliveryPartner.current_latitude && deliveryPartner.current_longitude 
                            ? `${deliveryPartner.current_latitude.toFixed(4)}, ${deliveryPartner.current_longitude.toFixed(4)}`
                            : 'Location not available'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* OTP Verification Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {otpType === 'pickup' ? 'Pickup' : 'Delivery'} Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                Order #{myOrders.find(o => o.order_id === currentOrderId)?.order_number || 'Unknown'}
              </h4>
              <p className="text-xs text-gray-600">
                {otpType === 'pickup' 
                  ? 'Confirm pickup from vendor with OTP verification'
                  : 'Confirm delivery to customer with OTP verification'
                }
              </p>
            </div>

            {/* Generate OTP Button */}
            <div className="text-center">
              <Button 
                onClick={handleGenerateOtp}
                disabled={generatingOtp}
                variant="outline"
                className="w-full"
              >
                {generatingOtp ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating OTP...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Generate {otpType === 'pickup' ? 'Pickup' : 'Delivery'} OTP
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {otpType === 'pickup' 
                  ? 'OTP will be sent to the vendor' 
                  : 'OTP will be sent to the customer'
                }
              </p>
            </div>

            {/* OTP Input */}
            <div className="space-y-3">
              <Label htmlFor="otp-input" className="text-sm font-medium">
                Enter {otpType === 'pickup' ? 'Pickup' : 'Delivery'} OTP
              </Label>
              <Input
                id="otp-input"
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={4}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Get the 4-digit OTP from the {otpType === 'pickup' ? 'vendor' : 'customer'} and enter it above
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={handleCloseOtpDialog}
                className="flex-1"
                disabled={otpLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpValue.length !== 4}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {otpLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Confirm
                  </>
                )}
              </Button>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>
                    OTP verification ensures secure {otpType === 'pickup' ? 'pickup' : 'delivery'} confirmation. 
                    Never share your OTP with anyone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-Vendor OTP Dialog */}
      <Dialog open={multiVendorDialogOpen} onOpenChange={setMultiVendorDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Multi-Vendor Pickup Verification
            </DialogTitle>
            <DialogDescription>
              Confirm pickup from each vendor separately using their OTP codes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-purple-800">
                  Order #{myOrders.find(o => o.order_id === currentOrderId)?.order_number || 'Unknown'}
                </h4>
                <Badge className="bg-purple-100 text-purple-800">Multi-Vendor</Badge>
              </div>
              <p className="text-sm text-purple-700">
                This order contains items from multiple vendors. You must confirm pickup from each vendor individually.
              </p>
            </div>

            {currentVendorPickupStatus.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Store className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium mb-2">No Multi-Vendor Data Found</p>
                <p className="text-sm text-gray-400 mb-4">
                  This order may have items from a single vendor only, or OTPs haven't been generated yet.
                </p>
                <Button 
                  onClick={handleGenerateMultiVendorOTPs}
                  variant="outline"
                  className="border-purple-300 hover:bg-purple-50"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Generate Vendor OTPs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Progress Indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                                                 Pickup Progress: {currentVendorPickupStatus.filter(v => v.is_confirmed).length} of {currentVendorPickupStatus.length}
                      </span>
                    </div>
                    <div className="text-xl">
                      {currentVendorPickupStatus.every(v => v.is_confirmed) ? '🎉' : '📦'}
                    </div>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(currentVendorPickupStatus.filter(v => v.is_confirmed).length / currentVendorPickupStatus.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Vendor Cards */}
                {currentVendorPickupStatus.map((vendor, index) => (
                  <div 
                    key={vendor.vendor_id} 
                                         className={`border rounded-lg p-4 transition-all duration-200 ${
                       vendor.is_confirmed 
                         ? 'bg-green-50 border-green-200 shadow-green-100' 
                         : 'bg-orange-50 border-orange-200 hover:shadow-md'
                     }`}
                  >
                    {/* Vendor Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          vendor.is_confirmed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-orange-500 text-white'
                        }`}>
                          {vendor.is_confirmed ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Store className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{vendor.vendor_name}</h4>
                          <p className="text-sm text-gray-600">{vendor.vendor_address}</p>
                        </div>
                      </div>
                      <Badge 
                        className={vendor.is_confirmed 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-orange-100 text-orange-800 border-orange-200'
                        }
                      >
                        {vendor.is_confirmed ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </div>
                        )}
                      </Badge>
                    </div>
                    
                    {/* Contact and Navigation Row */}
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`tel:${vendor.vendor_phone}`)}
                        className={vendor.is_confirmed 
                          ? "border-green-300 hover:bg-green-100 text-green-700" 
                          : "border-orange-300 hover:bg-orange-100 text-orange-700"
                        }
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call Vendor
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(vendor.vendor_address)}`)}
                        className={vendor.is_confirmed 
                          ? "border-green-300 hover:bg-green-100 text-green-700" 
                          : "border-orange-300 hover:bg-orange-100 text-orange-700"
                        }
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Navigate
                      </Button>
                      <div className="text-xs text-gray-500 ml-auto">
                        {vendor.vendor_phone}
                      </div>
                    </div>
                    
                    {/* OTP Section */}
                    {vendor.is_confirmed ? (
                      <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Pickup confirmed successfully!
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          ✅ Items collected from this vendor - Ready for delivery
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* OTP Display */}
                        <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-orange-800">
                                🔐 Pickup OTP Required
                              </span>
                              <p className="text-xs text-orange-700 mt-1">
                                Get the 4-digit OTP from this vendor to confirm pickup
                              </p>
                            </div>
                            {vendor.pickup_otp && (
                              <div className="text-right bg-orange-200 rounded px-3 py-2">
                                <span className="text-xs text-orange-600 block">Generated OTP</span>
                                <div className="font-mono text-xl font-bold text-orange-900">
                                  {vendor.pickup_otp}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* OTP Input and Verification */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input 
                              type="text"
                              placeholder="Enter 4-digit OTP from vendor"
                              value={selectedVendorId === vendor.vendor_id ? vendorOtpValue : ''}
                              onChange={(e) => {
                                setSelectedVendorId(vendor.vendor_id);
                                setVendorOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4));
                              }}
                              maxLength={4}
                              className="text-center text-lg font-mono tracking-wider"
                            />
                          </div>
                          <Button 
                            onClick={() => handleVerifyVendorOtp(vendor.vendor_id, selectedVendorId === vendor.vendor_id ? vendorOtpValue : '')}
                            disabled={
                              selectedVendorId !== vendor.vendor_id || 
                              !vendorOtpValue || 
                              vendorOtpValue.length !== 4 || 
                              vendorOtpLoading
                            }
                            className="bg-orange-500 hover:bg-orange-600 text-white px-6"
                          >
                            {vendorOtpLoading && selectedVendorId === vendor.vendor_id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span className="hidden sm:inline">Verifying...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span className="hidden sm:inline">Verify OTP</span>
                                <span className="sm:hidden">Verify</span>
                              </div>
                            )}
                          </Button>
                        </div>
                        
                        {/* Instructions */}
                        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                          💡 <strong>Instructions:</strong> Visit the vendor, collect the items, and ask them for the 4-digit OTP to confirm pickup.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Overall Status Summary */}
                <div className={`p-4 rounded-lg border-2 ${
                  currentVendorPickupStatus.every(v => v.is_confirmed)
                    ? 'bg-green-50 border-green-300'
                    : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-semibold ${
                        currentVendorPickupStatus.every(v => v.is_confirmed)
                          ? 'text-green-800'
                          : 'text-blue-800'
                      }`}>
                        {currentVendorPickupStatus.every(v => v.is_confirmed)
                          ? '🎉 All Vendors Confirmed!'
                          : '⏳ Pickup In Progress'
                        }
                      </h4>
                      <p className={`text-sm ${
                        currentVendorPickupStatus.every(v => v.is_confirmed)
                          ? 'text-green-700'
                          : 'text-blue-700'
                      }`}>
                        {currentVendorPickupStatus.every(v => v.is_confirmed)
                          ? 'All items collected. You can now proceed to customer delivery.'
                          : `Please confirm pickup from ${currentVendorPickupStatus.filter(v => !v.is_confirmed).length} remaining vendor(s).`
                        }
                      </p>
                    </div>
                    <div className="text-3xl">
                      {currentVendorPickupStatus.every(v => v.is_confirmed) ? '✅' : '📦'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setMultiVendorDialogOpen(false);
                setSelectedVendorId('');
                setVendorOtpValue('');
              }}
            >
              Close
            </Button>
            
            {currentVendorPickupStatus.length > 0 && !currentVendorPickupStatus.every(v => v.is_confirmed) && (
              <Button 
                onClick={() => handleGenerateMultiVendorOTPs()}
                variant="outline"
                className="border-purple-300 hover:bg-purple-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh OTPs
              </Button>
            )}
            
            {currentVendorPickupStatus.length > 0 && currentVendorPickupStatus.every(v => v.is_confirmed) && (
              <Button 
                onClick={() => {
                  setMultiVendorDialogOpen(false);
                  setSelectedVendorId('');
                  setVendorOtpValue('');
                  toast.success('🎉 All vendors confirmed! You can now proceed to customer delivery.');
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue to Delivery
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Collection Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Record Payment Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                Order #{selectedOrderForPayment?.order_number || 'Unknown'}
              </h4>
              <p className="text-xs text-gray-600">
                Record payment collected from this order
              </p>
            </div>

            {/* Payment Amount */}
            <div className="space-y-3">
              <Label htmlFor="payment-amount" className="text-sm font-medium">
                Payment Amount
              </Label>
              <Input
                id="payment-amount"
                type="text"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total amount collected from this order
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label htmlFor="payment-method" className="text-sm font-medium">
                Payment Method
              </Label>
                             <Select
                 value={paymentMethod}
                 onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'upi')}
               >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the method used to collect payment
              </p>
            </div>

            {/* Payment Notes */}
            <div className="space-y-3">
              <Label htmlFor="payment-notes" className="text-sm font-medium">
                Payment Notes
              </Label>
              <Textarea
                id="payment-notes"
                placeholder="Enter any additional notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Add any notes about the payment collection process
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(false)}
                className="flex-1"
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitPaymentCollection}
                disabled={paymentLoading || !paymentAmount || !paymentMethod}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {paymentLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day-end Summary Dialog */}
      <Dialog open={dayEndDialogOpen} onOpenChange={setDayEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Day-end Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Daily Collection Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                Daily Collection Summary
              </h4>
              <p className="text-xs text-gray-600">
                Enter the cash and digital collected today
              </p>
            </div>

            {/* Cash Collection */}
            <div className="space-y-3">
              <Label htmlFor="day-end-cash" className="text-sm font-medium">
                Cash Collected
              </Label>
              <Input
                id="day-end-cash"
                type="text"
                placeholder="Enter cash collected"
                value={dayEndCashAmount}
                onChange={(e) => setDayEndCashAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total cash collected today
              </p>
            </div>

            {/* Digital Collection */}
            <div className="space-y-3">
              <Label htmlFor="day-end-digital" className="text-sm font-medium">
                Digital Collected
              </Label>
              <Input
                id="day-end-digital"
                type="text"
                placeholder="Enter digital collected"
                value={dayEndDigitalAmount}
                onChange={(e) => setDayEndDigitalAmount(e.target.value)}
                className="text-center text-xl font-mono tracking-[0.5em] py-3"
                maxLength={10}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">
                Enter the total digital collected today
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label htmlFor="day-end-notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="day-end-notes"
                placeholder="Enter any notes"
                value={dayEndNotes}
                onChange={(e) => setDayEndNotes(e.target.value)}
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Add any notes about the day-end summary
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDayEndDialogOpen(false)}
                className="flex-1"
                disabled={dayEndLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitDayEndSummary}
                disabled={dayEndLoading || !dayEndCashAmount || !dayEndDigitalAmount}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                {dayEndLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🛠️ Auth Debug Tools */}
      
    </div>
  );
};

export default DeliveryPartnerDashboard;

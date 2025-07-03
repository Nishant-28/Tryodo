import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Truck, Shield, Plus, Edit, AlertCircle, Trash2, Clock, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Header from '@/components/Header';
import SlotSelection from '@/components/SlotSelection';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { PulsatingButton } from "@/components/magicui/pulsating-button";
import { ShineBorder } from "@/components/magicui/shine-border";
import { deliveryUtils, type DeliverySlot } from '@/lib/deliveryApi';
import { OrderAPI } from '@/lib/api';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  vendor: string;
  vendorId: string;
  price: number;
  quantity: number;
  image?: string;
  deliveryTime: number;
  warranty: number;
  qualityName?: string;
  brandName?: string;
  modelName?: string;
}

interface Address {
  id: string;
  shop_name: string;
  owner_name: string;
  pincode: string;
  address_box: string;
  phone_number: string;
  created_at?: string;
  updated_at?: string;
}

interface AddressFormData {
  shop_name: string;
  owner_name: string;
  pincode: string;
  address_box: string;
  phone_number: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'upi' | 'cod';
  icon: React.ReactNode;
  description: string;
}

const showErrorToast = (message: string) => {
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { cart, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormData>({
    shop_name: '',
    owner_name: '',
    pincode: '',
    address_box: '',
    phone_number: '',
  });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  // Slot selection state - Default to today's date
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'razorpay_upi',
      name: 'UPI Payment',
      type: 'upi',
      icon: <div className="h-5 w-5 bg-green-600 rounded text-white text-xs flex items-center justify-center">₹</div>,
      description: 'Pay with Google Pay, PhonePe, Paytm'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      type: 'cod',
      icon: <Truck className="h-5 w-5" />,
      description: 'Pay when your order is delivered'
    }
  ];

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/order');
      return;
    }

    if (user && profile) {
      loadAddresses();
    }
  }, [cart, navigate, user, profile]);

  // Reload addresses once we have the customerId
  useEffect(() => {
    if (user && profile && customerId) {
      loadAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    const getCustomerId = async () => {
      if (!user || !profile) return;

      try {
        const { data: existingCustomer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (existingCustomer) {
          setCustomerId(existingCustomer.id);
        } else if (customerError && customerError.code === 'PGRST116') { // No rows found
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{ profile_id: profile.id }])
            .select()
            .single();

          if (createError) {
            console.error('Failed to create customer:', createError);
            showErrorToast("Failed to initialize customer data.");
            return;
          }
          setCustomerId(newCustomer.id);
        } else if (customerError) {
          throw customerError;
        }
      } catch (error: any) {
        console.error('Error getting customer ID:', error);
        showErrorToast(error.message || "Failed to retrieve customer data.");
      }
    };
    getCustomerId();
  }, [user, profile]);

  const loadAddresses = async () => {
    if (!user || !profile || !customerId) return;

    try {
      const { data: addressesData, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading customer addresses:', error);
        showErrorToast("Failed to load addresses.");
        return;
      }

      setAddresses(addressesData);

      if (addressesData.length > 0) {
        if (!selectedAddress || !addressesData.find(addr => addr.id === selectedAddress)) {
          setSelectedAddress(addressesData[0].id);
        }
      }

    } catch (error: any) {
      console.error('Error loading addresses:', error);
      showErrorToast(error.message || 'Failed to load addresses');
    }
  };

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setNewAddress(prev => ({ ...prev, [id]: value }));
  };

  const handleAddOrUpdateAddress = async () => {
    if (!user || !profile || !customerId) return;

    if (
      !newAddress.shop_name.trim() ||
      !newAddress.owner_name.trim() ||
      !newAddress.pincode.trim() ||
      !newAddress.address_box.trim() ||
      !newAddress.phone_number.trim()
    ) {
      showErrorToast("Please fill in all required fields.");
      return;
    }

    if (!/^\d{6}$/.test(newAddress.pincode)) {
      showErrorToast("Pincode must be 6 digits.");
      return;
    }

    const MAX_ADDRESSES = 5;
    if (!editingAddressId && addresses.length >= MAX_ADDRESSES) {
      showErrorToast(`You can add up to ${MAX_ADDRESSES} addresses only.`);
      return;
    }

    try {
      let operationSuccess = false;

      if (editingAddressId) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(newAddress)
          .eq('id', editingAddressId)
          .eq('customer_id', customerId);

        if (error) throw error;
        operationSuccess = true;

        setAddresses(addresses.map(addr =>
          addr.id === editingAddressId ? { ...addr, ...newAddress } : addr
        ));
        toast({
          title: "Success",
          description: "Address updated successfully.",
        });
      } else {
        const { data, error } = await supabase
          .from('customer_addresses')
          .insert([
            {
              ...newAddress,
              customer_id: customerId
            }
          ])
          .select()
          .single();

        if (error) throw error;
        operationSuccess = true;

        setAddresses([...addresses, data]);
        setSelectedAddress(data.id);
        toast({
          title: "Success",
          description: "Address added successfully.",
        });
      }

      if (operationSuccess) {
        setShowAddressModal(false);
        setNewAddress({
          shop_name: '',
          owner_name: '',
          pincode: '',
          address_box: '',
          phone_number: '',
        });
        setEditingAddressId(null);
      }

    } catch (error: any) {
      console.error('Error saving address:', error);
      showErrorToast(error.message || "Failed to save address.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !profile || !customerId) return;

    const MIN_ADDRESSES = 1;
    if (addresses.length === MIN_ADDRESSES) {
      showErrorToast(`You must have at least ${MIN_ADDRESSES} address.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId)
        .eq('customer_id', customerId); 

      if (error) throw error;

      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      if (selectedAddress === addressId && updatedAddresses.length > 0) {
        setSelectedAddress(updatedAddresses[0].id);
      } else if (updatedAddresses.length === 0) {
        setSelectedAddress('');
      }

      toast({
        title: "Success",
        description: "Address deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting address:', error);
      showErrorToast(error.message || "Failed to delete address.");
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCharges = 0; // Free delivery
    const taxAmount = 0; // No tax
    const total = subtotal + shippingCharges + taxAmount;

    return { subtotal, shippingCharges, taxAmount, total };
  };

  // Slot selection handlers
  const handleSlotSelect = (slot: DeliverySlot | null, estimatedDeliveryTime: string) => {
    setSelectedSlot(slot);
    setEstimatedDelivery(estimatedDeliveryTime);
  };

  const getSelectedAddressPincode = () => {
    const selectedAddr = addresses.find(addr => addr.id === selectedAddress);
    return selectedAddr ? parseInt(selectedAddr.pincode) : 0;
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showErrorToast("Please select a delivery address.");
      return;
    }
    if (!selectedSlot) {
      showErrorToast("Please select a delivery slot.");
      return;
    }
    if (!selectedPayment) {
      showErrorToast("Please select a payment method.");
      return;
    }
    if (!user || !profile || !customerId) {
      showErrorToast("You must be logged in to place an order.");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const { subtotal, total } = calculateTotals();
      
      const orderData = {
        customerId: customerId,
        delivery_address_id: selectedAddress,
        items: cart.items,
        subtotal: subtotal,
        shipping_charges: 50, // Example shipping charges
        tax_amount: 0, // Assuming tax is included or not applicable for now
        discount_amount: 0, // Example discount
        total_amount: total,
        payment_method: selectedPayment,
        payment_status: selectedPayment === 'cod' ? 'pending' : 'awaiting_payment',
        special_instructions: specialInstructions,
        slot_id: selectedSlot.id,
        sector_id: selectedSlot.sector_id,
        delivery_date: selectedDate,
      };

      const result = await OrderAPI.createOrder(orderData);

      if (result.success) {
        toast({
          title: "Order Placed Successfully!",
          description: `Your order #${result.data.order_number} has been placed.`,
        });
        clearCart();
        navigate(`/order-success?orderId=${result.data.id}`, {
          state: {
            orderId: result.data.id,
            orderDetails: result.data,
          },
        });
      } else {
        throw new Error(result.error || "Failed to place order.");
      }
    } catch (error: any) {
      showErrorToast(error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const { subtotal, shippingCharges, taxAmount, total } = calculateTotals();

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => { }} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty!</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet.</p>
            <Button onClick={() => navigate('/order')}>
              Start Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => { }} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking authentication...</h2>
            <p className="text-gray-600">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => navigate('/cart')} />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-orange-500" />
                  Delivery Address
                </CardTitle>
                <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Add New Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{editingAddressId ? "Edit Address" : "Add New Address"}</DialogTitle>
                      <DialogDescription>
                        {editingAddressId ? "Edit the details of your address." : "Add a new delivery address to your account. You can add up to 5 addresses."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="shop_name">Shop Name</Label>
                        <Input
                          id="shop_name"
                          value={newAddress.shop_name}
                          onChange={handleAddressFormChange}
                          placeholder="Shop Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="owner_name">Owner Name</Label>
                        <Input
                          id="owner_name"
                          value={newAddress.owner_name}
                          onChange={handleAddressFormChange}
                          placeholder="Owner Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input
                          id="pincode"
                          value={newAddress.pincode}
                          onChange={handleAddressFormChange}
                          placeholder="Pincode (e.g., 123456)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_box">Address Box</Label>
                        <Textarea
                          id="address_box"
                          value={newAddress.address_box}
                          onChange={handleAddressFormChange}
                          placeholder="House no, Building name, Street, Area, Locality"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <Input
                          id="phone_number"
                          value={newAddress.phone_number}
                          onChange={handleAddressFormChange}
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={handleAddOrUpdateAddress}>
                        {editingAddressId ? "Update Address" : "Add Address"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No addresses found. Please add a new address.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <RadioGroup
                    onValueChange={setSelectedAddress}
                    value={selectedAddress}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={
                          `relative p-4 border rounded-lg flex flex-col gap-2 cursor-pointer ` +
                          (selectedAddress === address.id
                            ? "border-orange-500 ring-2 ring-orange-500" : "border-gray-200")
                        }
                        onClick={() => setSelectedAddress(address.id)}
                      >
                        {selectedAddress === address.id && (
                          <ShineBorder
                            className="absolute inset-0 z-0"
                            shineColor={["#ff6b35", "#f7931e", "#ffd700"]}
                            borderWidth={2}
                            duration={3}
                          />
                        )}
                        <RadioGroupItem value={address.id} id={address.id} className="sr-only" />
                        <Label htmlFor={address.id} className="flex flex-col space-y-1 cursor-pointer">
                          <span className="font-semibold text-gray-900">{address.shop_name}</span>
                          <span className="text-sm text-gray-600">{address.owner_name}</span>
                          <span className="text-sm text-gray-600">{address.address_box}, {address.pincode}</span>
                          <span className="text-sm text-gray-600">Phone: {address.phone_number}</span>
                        </Label>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-orange-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewAddress({
                                shop_name: address.shop_name,
                                owner_name: address.owner_name,
                                pincode: address.pincode,
                                address_box: address.address_box,
                                phone_number: address.phone_number,
                              });
                              setEditingAddressId(address.id);
                              setShowAddressModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>

            {/* Slot Selection Section */}
            <Card className="bg-white rounded-2xl shadow-lg relative">
              {selectedSlot && (
                <ShineBorder
                  className="absolute inset-0 z-0"
                  shineColor={["#2563eb", "#3b82f6", "#60a5fa"]}
                  borderWidth={2}
                  duration={4}
                />
              )}
              <CardHeader className="relative z-10">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                  Delivery Date & Slot
                </CardTitle>
                <CardDescription>Choose when you want your order delivered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                {/* Today's Date Display */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Delivery Date</Label>
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        Today - {new Date().toLocaleDateString('en-IN', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slot Selection */}
                {selectedAddress && addresses.find(addr => addr.id === selectedAddress) && (
                  <SlotSelection
                    customerPincode={getSelectedAddressPincode()}
                    selectedDate={selectedDate}
                    onSlotSelect={handleSlotSelect}
                    selectedSlotId={selectedSlot?.id}
                    className="border-0 shadow-none bg-transparent p-0"
                  />
                )}

                {selectedSlot && estimatedDelivery && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Selected:</strong> {selectedSlot.slot_name} • {estimatedDelivery}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                  Payment Method
                </CardTitle>
                <CardDescription>Select your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  onValueChange={setSelectedPayment}
                  value={selectedPayment}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {paymentMethods.map((method) => (
                    <Label
                      key={method.id}
                      htmlFor={method.id}
                      className={
                        `relative flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 ` +
                        (selectedPayment === method.id ? "border-purple-500" : "")
                      }
                    >
                      <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {method.icon}
                          <span className="font-medium text-gray-900">{method.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">{method.description}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Card className="bg-white rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-green-600" />
                  Order Summary
                </CardTitle>
                <CardDescription>
                  Summary of your order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Shipping Charges</span>
                  <span className="text-sm font-medium text-gray-900">₹{shippingCharges.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Tax Amount</span>
                  <span className="text-sm font-medium text-gray-900">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Total</span>
                  <span className="text-sm font-medium text-gray-900">₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, CreditCard, Truck, Shield, ChevronRight, ArrowLeft, Plus, Edit, Check, AlertCircle } from 'lucide-react';
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
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CartItem {
  id: string;
  name: string;
  vendor: string;
  vendorId: string;
  price: number;
  quantity: number;
  image?: string;
  deliveryTime: number;
  warranty: number;
}

interface Address {
  id: string;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  contact_name: string;
  contact_phone: string;
  is_default: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'upi' | 'cod';
  icon: React.ReactNode;
  description: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address_type: 'home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    contact_name: profile?.full_name || '',
    contact_phone: '',
    is_default: false
  });

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
    // Get cart items from location state or localStorage
    const items = location.state?.cartItems || JSON.parse(localStorage.getItem('cartItems') || '[]');
    setCartItems(items);
    
    if (items.length === 0) {
      navigate('/order');
      return;
    }

    // Load addresses only if user is authenticated
    if (user && profile) {
      loadAddresses();
    }
  }, [location.state, navigate, user, profile]);

  const loadAddresses = async () => {
    if (!user || !profile) return;

    try {
      // First, try to get or create customer record
      let customer;
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (customerError) {
        // Create customer record if it doesn't exist
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            profile_id: profile.id
          }])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create customer:', createError);
          // Fallback to profile addresses
          loadProfileAddress();
          return;
        }
        
        customer = newCustomer;
      } else {
        customer = existingCustomer;
      }

      if (!customer) {
        loadProfileAddress();
        return;
      }

      // Try to load addresses from customer_addresses table
      const { data: addressesData, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error loading customer addresses:', error);
        loadProfileAddress();
        return;
      }

      // If no addresses in customer_addresses table, check profile
      if (!addressesData || addressesData.length === 0) {
        loadProfileAddress();
        return;
      }

      setAddresses(addressesData);
      
      // Auto-select default address
      const defaultAddress = addressesData.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      loadProfileAddress();
    }
  };

  const loadProfileAddress = () => {
    // Fallback: Load address from profile if it exists
    if (profile?.address && profile?.city && profile?.state && profile?.pincode) {
      const profileAddress: Address = {
        id: 'profile-address',
        address_type: 'home',
        address_line1: profile.address,
        address_line2: '',
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        landmark: '',
        contact_name: profile.full_name || '',
        contact_phone: profile.phone || '',
        is_default: true
      };
      
      setAddresses([profileAddress]);
      setSelectedAddress('profile-address');
    } else {
      setAddresses([]);
    }
  };

  const migrateProfileAddressToCustomer = async () => {
    if (!user || !profile || !profile.address) return;

    try {
      // Get or create customer record
      let customer;
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (customerError) {
        // Create customer record
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            profile_id: profile.id
          }])
          .select()
          .single();

        if (createError) {
          throw createError;
        }
        customer = newCustomer;
      } else {
        customer = existingCustomer;
      }

      // Check if address already exists in customer_addresses
      const { data: existingAddresses } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customer.id);

      if (existingAddresses && existingAddresses.length > 0) {
        // Address already migrated
        return;
      }

      // Migrate profile address to customer_addresses
      const { data: migratedAddress, error: insertError } = await supabase
        .from('customer_addresses')
        .insert([{
          customer_id: customer.id,
          address_type: 'home',
          address_line1: profile.address,
          address_line2: '',
          city: profile.city || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
          landmark: '',
          contact_name: profile.full_name || '',
          contact_phone: profile.phone || '',
          is_default: true
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Reload addresses to reflect the migration
      loadAddresses();

      toast({
        title: "Success",
        description: "Address migrated successfully",
      });

    } catch (error) {
      console.error('Error migrating address:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!user || !profile) return;

    // Validation
    if (!newAddress.address_line1.trim() || !newAddress.city.trim() || 
        !newAddress.state.trim() || !newAddress.pincode.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(newAddress.pincode)) {
      toast({
        title: "Error",
        description: "PIN code must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, try to get or create customer record
      let customer;
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (customerError) {
        // Create customer record if it doesn't exist
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            profile_id: profile.id
          }])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create customer:', createError);
          throw new Error('Database setup required. Please contact support.');
        }
        
        customer = newCustomer;
      } else {
        customer = existingCustomer;
      }

      if (!customer) {
        throw new Error('Unable to access customer account');
      }

      // Insert new address
      const { data, error } = await supabase
        .from('customer_addresses')
        .insert([{
          ...newAddress,
          customer_id: customer.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Update addresses list
      const updatedAddresses = [...addresses, data];
      
      // If this is the first address, make it default
      if (addresses.length === 0) {
        data.is_default = true;
      }
      
      setAddresses(updatedAddresses);
      setSelectedAddress(data.id);
      setShowAddressModal(false);
      
      // Reset form
      setNewAddress({
        address_type: 'home',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        contact_name: profile?.full_name || '',
        contact_phone: '',
        is_default: false
      });

      toast({
        title: "Success",
        description: "Address added successfully",
      });
    } catch (error) {
      console.error('Error adding address:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add address",
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCharges = 0; // Free delivery
    const taxAmount = 0; // No tax
    const total = subtotal + shippingCharges + taxAmount;

    return { subtotal, shippingCharges, taxAmount, total };
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedPayment) {
      toast({
        title: "Error",
        description: "Please select delivery address and payment method",
        variant: "destructive",
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Get or create customer
      let customer;
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (customerError && customerError.code === 'PGRST116') {
        // Customer doesn't exist, create one
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([{
            profile_id: profile?.id
          }])
          .select()
          .single();

        if (createError) throw createError;
        customer = newCustomer;
      } else if (customerError) {
        throw customerError;
      } else {
        customer = existingCustomer;
      }

      if (!customer) throw new Error('Customer not found');

      const selectedAddr = addresses.find(addr => addr.id === selectedAddress);
      if (!selectedAddr) throw new Error('Address not found');

      const { subtotal, shippingCharges, taxAmount, total } = calculateTotals();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: customer.id,
          delivery_address: selectedAddr,
          subtotal,
          shipping_charges: 0,
          tax_amount: 0,
          total_amount: total,
          payment_method: selectedPayment,
          payment_status: selectedPayment === 'cod' ? 'pending' : 'paid', // Set payment status based on method
          special_instructions: specialInstructions,
          estimated_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        vendor_id: item.vendorId,
        vendor_product_id: item.id,
        product_name: item.name,
        product_description: `Quality product from ${item.vendor}`,
        unit_price: item.price,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      localStorage.removeItem('cartItems');

      // Navigate to order success page
      navigate('/order-success', { 
        state: { 
          orderId: order.order_number,
          orderDetails: order 
        } 
      });

      toast({
        title: "Success",
        description: "Order placed successfully!",
      });

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error",
        description: `Failed to place order: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const { subtotal, shippingCharges, taxAmount, total } = calculateTotals();

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No items in cart</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart before checking out</p>
            <Button onClick={() => navigate('/order')}>
              Start Shopping
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show loading state while checking authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onCartClick={() => {}} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checking authentication...</h2>
            <p className="text-gray-600">Please wait</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Section - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Debug Info:</h3>
            <div className="text-sm text-yellow-700">
              <p>User authenticated: {user ? 'Yes' : 'No'}</p>
              <p>Profile loaded: {profile ? 'Yes' : 'No'}</p>
              <p>Cart items count: {cartItems.length}</p>
              <p>Addresses loaded: {addresses.length}</p>
              {cartItems.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Cart Items</summary>
                  <pre className="mt-2 text-xs">{JSON.stringify(cartItems, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/order')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shopping
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Select Delivery Address
                </CardTitle>
                <CardDescription>
                  Choose from saved addresses or add a new delivery address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No saved addresses found</p>
                    <Button onClick={() => setShowAddressModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Show migration notice for profile address */}
                    {addresses.some(addr => addr.id === 'profile-address') && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-blue-700">
                              📍 Address loaded from your profile. 
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Want to save multiple addresses? Click below to upgrade to the full address system.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={migrateProfileAddressToCustomer}
                            className="ml-2 text-xs"
                          >
                            Save to Addresses
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                      {addresses.map((address) => (
                        <div key={address.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                          <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Label htmlFor={address.id} className="font-medium">
                                {address.contact_name}
                              </Label>
                              <Badge variant="outline" className="text-xs">
                                {address.address_type}
                              </Badge>
                              {address.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {address.id === 'profile-address' && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                                  From Profile
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {address.address_line1}, {address.address_line2 && `${address.address_line2}, `}
                              {address.city}, {address.state} - {address.pincode}
                            </p>
                            <p className="text-sm text-gray-500">{address.contact_phone}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowAddressModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Address
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className="flex items-center gap-3 flex-1">
                        {method.icon}
                        <div>
                          <Label htmlFor={method.id} className="font-medium">
                            {method.name}
                          </Label>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Special Instructions</CardTitle>
                <CardDescription>
                  Any specific delivery instructions or notes for your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Ring the doorbell, Leave at gate, Call before delivery..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.vendor}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddress || !selectedPayment || isPlacingOrder}
                >
                  {isPlacingOrder ? (
                    <>Placing Order...</>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Place Order - ₹{total.toLocaleString()}
                    </>
                  )}
                </Button>

                {/* Security Info */}
                <div className="text-xs text-gray-500 text-center">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Your payment information is secure and encrypted
                </div>
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Truck className="h-4 w-4" />
                  <span>Expected delivery in 3-7 days</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Free delivery on all orders
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
            <DialogDescription>
              Add a new delivery address to your account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name">Name</Label>
                <Input
                  id="contact_name"
                  value={newAddress.contact_name}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={newAddress.contact_phone}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={newAddress.address_line1}
                onChange={(e) => setNewAddress(prev => ({ ...prev, address_line1: e.target.value }))}
                placeholder="House no, Building name, Street"
              />
            </div>

            <div>
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input
                id="address_line2"
                value={newAddress.address_line2}
                onChange={(e) => setNewAddress(prev => ({ ...prev, address_line2: e.target.value }))}
                placeholder="Area, Locality"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="Pincode"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address_type">Address Type</Label>
              <Select 
                value={newAddress.address_type} 
                onValueChange={(value) => setNewAddress(prev => ({ ...prev, address_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAddress}>
              Add Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Checkout; 
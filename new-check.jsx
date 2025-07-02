import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, CreditCard, Truck, Shield, ChevronRight, ArrowLeft, Plus, Edit, Check, AlertCircle, Trash2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

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

interface PaymentMethod {
  id: string;
  name: string;
  type: 'upi' | 'cod';
  icon: React.ReactNode;
  description: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { cart, clearCart } = useCart();
  const [addresses, setAddresses] = useState < Address[] > ([]);
  const [selectedAddress, setSelectedAddress] = useState < string > ('');
  const [selectedPayment, setSelectedPayment] = useState < string > ('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState < Address > ({
    shop_name: '',
    owner_name: '',
    pincode: '',
    address_box: '',
    phone_number: '',
    id: '',
    created_at: '',
    updated_at: ''
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
    if (!cart || cart.items.length === 0) {
      navigate('/order');
      return;
    }

    if (user && profile) {
      loadAddresses();
    }
  }, [cart, navigate, user, profile]);

  const loadAddresses = async () => {
    if (!user || !profile) return;

    try {
      let customer;
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (customerError || !existingCustomer) {
        toast.error('Customer not found for profile. Please ensure your profile is complete.');
        setAddresses([]);
        return;
      }
      customer = existingCustomer;

      const { data: addressesData, error } = await supabase
        .from < Address > ('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error loading customer addresses.');
        setAddresses([]);
        return;
      }

      setAddresses(addressesData || []);

      if (addressesData && addressesData.length > 0) {
        setSelectedAddress(addressesData[0].id);
      }
    } catch {
      toast.error('An unexpected error occurred while loading addresses.');
      setAddresses([]);
    }
  };

  const handleAddNewAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (!customer) throw new Error('Customer not found');

      const payload = { customer_id: customer.id, ...newAddress };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      if (newAddress.id) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq('id', newAddress.id);
        if (error) throw error;
        toast.success('Address updated successfully!');
      } else {
        if (addresses.length >= 5) {
          toast.error('You can only add up to 5 addresses.');
          return;
        }
        const { error } = await supabase
          .from('customer_addresses')
          .insert(payload);
        if (error) throw error;
        toast.success('New address added successfully!');
      }

      setShowAddressModal(false);
      setNewAddress({
        shop_name: '',
        owner_name: '',
        pincode: '',
        address_box: '',
        phone_number: '',
        id: '',
        created_at: '',
        updated_at: ''
      });
      loadAddresses();
    } catch {
      toast.error('Failed to save address.');
    }
  };

  const handleEditAddress = (address: Address) => {
    setNewAddress(address);
    setShowAddressModal(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      toast.success('Address deleted successfully!');
      loadAddresses();
      if (selectedAddress === addressId) {
        setSelectedAddress('');
      }
    } catch {
      toast.error('Failed to delete address.');
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 50;
    const tax = subtotal * 0.05;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  };

  const totals = calculateTotals();

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address.');
      return;
    }
    if (!selectedPayment) {
      toast.error('Please select a payment method.');
      return;
    }
    if (!profile || !user) {
      toast.error('User not authenticated.');
      return;
    }

    setIsPlacingOrder(true);

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile.id)
        .single();
      if (!customer) throw new Error('Customer not found.');

      const selectedAddr = addresses.find(addr => addr.id === selectedAddress);
      if (!selectedAddr) throw new Error('Selected address not found.');

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          delivery_address: {
            shop_name: selectedAddr.shop_name,
            owner_name: selectedAddr.owner_name,
            pincode: selectedAddr.pincode,
            address_box: selectedAddr.address_box,
            phone_number: selectedAddr.phone_number,
          },
          subtotal: totals.subtotal,
          shipping_charges: totals.shipping,
          tax_amount: totals.tax,
          total_amount: totals.total,
          payment_method: selectedPayment,
          order_status: 'pending',
          payment_status: 'pending',
          special_instructions: specialInstructions,
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      const orderItemsPayload = cart.items.map(item => ({
        order_id: orderData.id,
        vendor_id: item.vendorId,
        vendor_product_id: item.productId,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (orderItemsError) throw orderItemsError;

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-success?orderNumber=${orderData.order_number}`);

    } catch {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header hideCartOnMobile={true} />
      <main className="flex-grow py-6 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">Checkout</h1>

          <Card className="bg-white rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Delivery Address
              </CardTitle>
              <CardDescription>
                Select an existing address or add a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length === 0 ? (
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No addresses found. Please add a new one.</AlertDescription>
                </Alert>
              ) : (
                <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress} className="space-y-3">
                  {addresses.map(addr => (
                    <div key={addr.id} className="flex items-start space-x-3 p-4 border rounded-lg bg-gray-50 relative">
                      <RadioGroupItem value={addr.id} id={`address-${addr.id}`} className="mt-1" />
                      <Label htmlFor={`address-${addr.id}`} className="flex-1 block text-base font-normal cursor-pointer">
                        <p className="font-semibold text-gray-900">{addr.shop_name} ({addr.owner_name})</p>
                        <p className="text-gray-700">{addr.address_box}</p>
                        <p className="text-gray-700">Pincode: {addr.pincode}</p>
                        <p className="text-gray-700">Phone: {addr.phone_number}</p>
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAddress(addr)}
                        className="absolute top-2 right-10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <Button
                onClick={() => setShowAddressModal(true)}
                variant="outline"
                className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Address
              </Button>

              <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{newAddress.id ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                    <DialogDescription>
                      {newAddress.id ? 'Update your delivery address details.' : 'Add a new delivery address for your orders.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddOrUpdateAddress} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="shop_name" className="text-right">Shop Name</Label>
                      <Input id="shop_name" name="shop_name" value={newAddress.shop_name} onChange={handleAddNewAddressChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="owner_name" className="text-right">Owner Name</Label>
                      <Input id="owner_name" name="owner_name" value={newAddress.owner_name} onChange={handleAddNewAddressChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="pincode" className="text-right">Pincode</Label>
                      <Input id="pincode" name="pincode" type="text" pattern="[0-9]{6}" maxLength={6} value={newAddress.pincode} onChange={handleAddNewAddressChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address_box" className="text-right">Address Box</Label>
                      <Textarea id="address_box" name="address_box" value={newAddress.address_box} onChange={handleAddNewAddressChange} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone_number" className="text-right">Phone Number</Label>
                      <Input id="phone_number" name="phone_number" type="tel" value={newAddress.phone_number} onChange={handleAddNewAddressChange} className="col-span-3" required />
                    </div>
                    <DialogFooter>
                      <Button type="submit">{newAddress.id ? 'Save Changes' : 'Add Address'}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                Order Summary
              </CardTitle>
              <CardDescription>
                Review your order details before proceeding to payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cart.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-gray-700">{item.name} x {item.quantity}</span>
                    <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="my-4" />
                <div className="flex justify-between items-center font-medium">
                  <span>Subtotal</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>₹{totals.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Tax</span>
                  <span>₹{totals.tax.toFixed(2)}</span>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="special-instructions">Special Instructions (optional)</Label>
                <Textarea
                  id="special-instructions"
                  placeholder="e.g., Leave at the door, call before delivery..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Choose how you'd like to pay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="space-y-3">
                {paymentMethods.map(method => (
                  <div key={method.id} className="flex items-start space-x-3 p-4 border rounded-lg bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                    <Label htmlFor={method.id} className="flex-1 block text-base font-normal cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        {method.icon}
                        <span className="font-semibold text-gray-900">{method.name}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{method.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Button
            onClick={handlePlaceOrder}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-3 text-lg font-semibold"
            disabled={isPlacingOrder || addresses.length === 0 || !selectedAddress}
          >
            {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Checkout; 
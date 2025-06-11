import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AddressContent = () => {
  const [address, setAddress] = useState({
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip: '90210',
    country: 'USA',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddress(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Address updated:', address);
    alert('Address updated successfully!');
  };

  return (
    <Card className="bg-white rounded-2xl p-6 shadow-lg h-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-gray-900">Your Address</CardTitle>
        <CardDescription className="text-gray-600">Manage your shipping and billing addresses.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="street" className="text-gray-700 font-medium">Street Address</Label>
            <Input
              id="street"
              type="text"
              value={address.street}
              onChange={handleChange}
              placeholder="123 Main St"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city" className="text-gray-700 font-medium">City</Label>
            <Input
              id="city"
              type="text"
              value={address.city}
              onChange={handleChange}
              placeholder="Anytown"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state" className="text-gray-700 font-medium">State / Province</Label>
            <Input
              id="state"
              type="text"
              value={address.state}
              onChange={handleChange}
              placeholder="CA"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zip" className="text-gray-700 font-medium">Zip / Postal Code</Label>
            <Input
              id="zip"
              type="text"
              value={address.zip}
              onChange={handleChange}
              placeholder="90210"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country" className="text-gray-700 font-medium">Country</Label>
            <Input
              id="country"
              type="text"
              value={address.country}
              onChange={handleChange}
              placeholder="USA"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white py-3">
            Save Address
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddressContent; 

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Store, ShoppingBag, TrendingUp, DollarSign, Package, Smartphone, Settings, ArrowRight, AlertTriangle, Database, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d');
  const [dbSetupStatus, setDbSetupStatus] = useState<{
    categoriesExists: boolean;
    categoryQualitiesExists: boolean;
    isChecking: boolean;
  }>({
    categoriesExists: false,
    categoryQualitiesExists: false,
    isChecking: true
  });

  const stats = {
    totalCustomers: 1247,
    totalVendors: 89,
    totalOrders: 2456,
    totalRevenue: 892000,
    pendingOrders: 45,
    totalProducts: 15678
  };

  // Check database setup status on component mount
  useEffect(() => {
    const checkDatabaseSetup = async () => {
      try {
        // Check if categories table exists and has data
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select('id')
          .limit(1);

        const categoriesExists = !categoriesError && categories !== null;

        // Check if category_qualities table exists
        let categoryQualitiesExists = false;
        try {
          const { data: qualities, error: qualitiesError } = await supabase
            .from('category_qualities')
            .select('id')
            .limit(1);
          
          categoryQualitiesExists = !qualitiesError && qualities !== null;
        } catch (error) {
          categoryQualitiesExists = false;
        }

        setDbSetupStatus({
          categoriesExists,
          categoryQualitiesExists,
          isChecking: false
        });
      } catch (error) {
        console.error('Error checking database setup:', error);
        setDbSetupStatus(prev => ({ ...prev, isChecking: false }));
      }
    };

    checkDatabaseSetup();
  }, []);

  const recentOrders = [
    { id: 'ORD-001', customer: 'Rahul Kumar', vendor: 'Rohan Communication', amount: 8500, status: 'pending' },
    { id: 'ORD-002', customer: 'Priya Sharma', vendor: 'TechMart Solutions', amount: 5200, status: 'confirmed' },
    { id: 'ORD-003', customer: 'Amit Singh', vendor: 'Dhanesh Electronics', amount: 3400, status: 'delivered' },
    { id: 'ORD-004', customer: 'Sneha Patel', vendor: 'Rohan Communication', amount: 7800, status: 'shipped' }
  ];

  const topVendors = [
    { name: 'Rohan Communication', orders: 156, revenue: 245000 },
    { name: 'TechMart Solutions', orders: 134, revenue: 198000 },
    { name: 'Dhanesh Electronics', orders: 98, revenue: 145000 },
    { name: 'Mobile Zone', orders: 87, revenue: 123000 }
  ];

  const DatabaseSetupNotification = () => {
    const { categoriesExists, categoryQualitiesExists, isChecking } = dbSetupStatus;
    
    if (isChecking) {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Checking database setup...
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (!categoriesExists || !categoryQualitiesExists) {
      return (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-3">
              <div className="font-medium text-orange-800">Database Setup Required</div>
              <div className="text-sm text-orange-700">
                Some required database tables are missing. Please run the setup script to enable full functionality:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {categoriesExists ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className={categoriesExists ? 'text-green-700' : 'text-orange-700'}>
                    Categories table {categoriesExists ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {categoryQualitiesExists ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className={categoryQualitiesExists ? 'text-green-700' : 'text-orange-700'}>
                    Category Qualities table {categoryQualitiesExists ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Open Supabase Dashboard
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    // Copy the setup script content to clipboard
                    navigator.clipboard.writeText(`-- Run this in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor

-- Copy and run the contents of setup-missing-tables.sql file
-- Or contact your developer to run the database setup script`);
                    alert('Setup instructions copied to clipboard!');
                  }}
                >
                  Copy Setup Instructions
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (categoriesExists && categoryQualitiesExists) {
      return (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <div className="font-medium">Database Setup Complete ✓</div>
            <div className="text-sm mt-1">All required tables are available. You can now manage categories and qualities.</div>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Monitor and manage your marketplace</p>
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Database Setup Notification */}
        <DatabaseSetupNotification />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Vendors</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalVendors}</p>
              </div>
              <Store className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Orders</p>
                <p className="text-xl font-bold text-red-600">{stats.pendingOrders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Management Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/models')}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  Manage Models
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                Add, edit, and manage phone models for all brands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Control the phone models available in the marketplace
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-600" />
                  Manage Vendors
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                Approve and manage vendor accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Review vendor applications and manage approvals
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/categories')}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Manage Categories
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                Manage phone feature categories like Display, Battery, Camera
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Define categories for organizing phone specifications and features
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/qualities')}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  Manage Qualities
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardTitle>
              <CardDescription>
                Define specific qualities for each phone model and category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Add qualities like "TFT" for Display, "Ckoza" for Battery, etc.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                      <p className="text-xs text-gray-500">{order.vendor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{order.amount.toLocaleString()}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Vendors */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Top Performing Vendors</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topVendors.map((vendor, index) => (
                  <div key={vendor.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{vendor.name}</p>
                        <p className="text-sm text-gray-600">{vendor.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{vendor.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

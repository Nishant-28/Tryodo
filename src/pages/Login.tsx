
import React, { useState } from 'react';
import { User, Building, Store, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

type UserType = 'customer' | 'vendor' | 'admin';

const Login = () => {
  const [userType, setUserType] = useState<UserType>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { userType, ...formData });
    // Handle login logic here
  };

  const userTypeConfig = {
    customer: {
      title: 'Customer Login',
      subtitle: 'Access your account to shop mobile parts',
      icon: User,
      color: 'from-blue-600 to-blue-800'
    },
    vendor: {
      title: 'Vendor Login',
      subtitle: 'Manage your inventory and orders',
      icon: Store,
      color: 'from-green-600 to-green-800'
    },
    admin: {
      title: 'Admin Login',
      subtitle: 'Access company dashboard and analytics',
      icon: Building,
      color: 'from-purple-600 to-purple-800'
    }
  };

  const currentConfig = userTypeConfig[userType];
  const IconComponent = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* User Type Selection */}
          <div className="grid grid-cols-3 gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm">
            {Object.entries(userTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setUserType(type as UserType)}
                  className={`flex flex-col items-center p-3 rounded-md transition-all ${
                    userType === type
                      ? `bg-gradient-to-br ${config.color} text-white shadow-md`
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium capitalize">{type}</span>
                </button>
              );
            })}
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${currentConfig.color} flex items-center justify-center`}>
                <IconComponent className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{currentConfig.title}</h1>
              <p className="text-gray-600 mt-2">{currentConfig.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className={`w-full bg-gradient-to-r ${currentConfig.color} hover:opacity-90 text-white py-3`}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;

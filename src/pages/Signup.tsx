import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Shield, Users, ArrowLeft, Smartphone, Zap, CheckCircle, UserPlus, Star } from 'lucide-react';
import { toast } from 'sonner';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signUp, user, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      const roleRedirects = {
        customer: '/',
        vendor: '/vendor-dashboard',
        admin: '/admin-dashboard',
        delivery_partner: '/delivery-partner-dashboard',
      };
      navigate(roleRedirects[profile.role], { replace: true });
    }
  }, [user, profile, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role as UserRole
      );
      
      if (result.success) {
        toast.success('Account created successfully!');
        // Navigate to login or appropriate dashboard
        navigate('/login');
      } else {
        setErrors({ general: result.error || 'Sign up failed' });
      }
    } catch (err) {
      setErrors({ general: 'An unexpected error occurred' });
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-24 h-24 bg-blue-400/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-indigo-400/10 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-purple-400/10 rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-1/3 right-1/3 w-16 h-16 bg-cyan-400/10 rounded-full animate-pulse delay-700"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/LOGO-removebg-preview.png" 
              alt="Tryodo Logo" 
              className="h-10 w-auto group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
          
          <Button
            variant="ghost"
            asChild
            className="hover:bg-white/60 transition-all duration-200"
          >
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
              <img 
                src="/LOGO-main.png" 
                alt="Tryodo Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Tryodo</h1>
            <p className="text-gray-600 text-lg">Create your account and get started</p>
            <p className="text-sm text-gray-500 mt-2">Join thousands of satisfied users</p>
          </div>

          {/* Signup Form */}
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-900">Create Account</CardTitle>
              <CardDescription className="text-center text-gray-600">
                Fill in your details to get started
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {errors.general && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{errors.general}</AlertDescription>
                  </Alert>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={loading}
                    className="h-12 transition-all duration-200 focus:border-blue-500"
                    required
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    className="h-12 transition-all duration-200 focus:border-blue-500"
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Customer Option */}
                    <div
                      onClick={() => handleInputChange('role', 'customer')}
                      className={`h-12 px-3 py-2 border rounded-md flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        formData.role === 'customer' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-blue-100 rounded">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Customer</div>
                          <div className="text-xs text-gray-500">Shop for products</div>
                        </div>
                      </div>
                      {formData.role === 'customer' && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    {/* Vendor Option */}
                    <div
                      onClick={() => handleInputChange('role', 'vendor')}
                      className={`h-12 px-3 py-2 border rounded-md flex items-center justify-between cursor-pointer transition-all duration-200 ${
                        formData.role === 'vendor' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-green-100 rounded">
                          <UserPlus className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Vendor</div>
                          <div className="text-xs text-gray-500">Sell your products</div>
                        </div>
                      </div>
                      {formData.role === 'vendor' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Benefits */}
                {formData.role === 'customer' ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">Customer Account</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            Most Popular
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Shop for mobile parts and accessories</p>
                      </div>
                    </div>
                  </div>
                ) : formData.role === 'vendor' ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 border border-green-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg text-white">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Vendor Account</h3>
                        <p className="text-sm text-gray-600">List your products and manage your store</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      disabled={loading}
                      className="h-12 pr-12 transition-all duration-200 focus:border-blue-500"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={loading}
                      className="h-12 pr-12 transition-all duration-200 focus:border-blue-500"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => {
                      setAcceptTerms(checked as boolean);
                      if (errors.terms) {
                        setErrors(prev => ({ ...prev, terms: '' }));
                      }
                    }}
                    disabled={loading}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <label htmlFor="terms" className="text-gray-600 cursor-pointer">
                      I agree to the{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200">
                        Privacy Policy
                      </Link>
                    </label>
                    {errors.terms && (
                      <p className="text-red-600 mt-1">{errors.terms}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className={`w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold transition-all duration-200 transform hover:scale-[1.02] ${loading ? 'opacity-75 cursor-not-allowed scale-100' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center bg-gray-50/50 border-t">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
                >
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              🔒 Your data is secure and encrypted
            </p>
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                SSL Protected
              </span>
              <span className="flex items-center">
                <Star className="h-3 w-3 mr-1" />
                Trusted Platform
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

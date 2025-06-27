import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Shield, Users, Store, ArrowLeft, Smartphone, Zap, CheckCircle, UserPlus, Truck, Star } from 'lucide-react';
import { toast } from 'sonner';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole | '',
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

    if (!formData.role) {
      newErrors.role = 'Please select your account type';
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

  const getRoleInfo = (role: string) => {
    const roleConfig = {
      customer: {
        icon: <Smartphone className="h-5 w-5" />,
        title: 'Customer Account',
        description: 'Shop for mobile parts and accessories',
        badge: 'Most Popular',
        badgeColor: 'bg-blue-100 text-blue-700',
        gradient: 'from-blue-500 to-purple-600',
      },
      vendor: {
        icon: <Store className="h-5 w-5" />,
        title: 'Vendor Account',
        description: 'Sell products and grow your business',
        badge: 'Business',
        badgeColor: 'bg-green-100 text-green-700',
        gradient: 'from-green-500 to-teal-600',
      },
      admin: {
        icon: <Shield className="h-5 w-5" />,
        title: 'Admin Account',
        description: 'Platform management access',
        badge: 'Restricted',
        badgeColor: 'bg-orange-100 text-orange-700',
        gradient: 'from-orange-500 to-red-600',
      },
      delivery_partner: {
        icon: <Truck className="h-5 w-5" />,
        title: 'Delivery Partner',
        description: 'Earn by delivering orders',
        badge: 'Flexible',
        badgeColor: 'bg-amber-100 text-amber-700',
        gradient: 'from-amber-500 to-orange-600',
      },
    };
    return roleConfig[role as keyof typeof roleConfig];
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
                {/* Customer Account Type - Auto Selected */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                  <div className="h-12 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-1 bg-blue-100 rounded">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Customer</div>
                        <div className="text-xs text-gray-500">Shop for products</div>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Selected</span>
                  </div>
                  <input type="hidden" name="role" value="customer" />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleInputChange('role', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-12 transition-all duration-200 focus:border-blue-500">
                      <SelectValue placeholder="Choose your account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 bg-blue-100 rounded">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">Customer</div>
                              <div className="text-xs text-gray-500">Shop for products</div>
                            </div>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Popular</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="vendor">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 bg-green-100 rounded">
                              <Store className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">Vendor</div>
                              <div className="text-xs text-gray-500">Sell products</div>
                            </div>
                          </div>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Business</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 bg-orange-100 rounded">
                              <Shield className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-medium">Admin</div>
                              <div className="text-xs text-gray-500">Platform management</div>
                            </div>
                          </div>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Restricted</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="delivery_partner">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <div className="p-1 bg-amber-100 rounded">
                              <Truck className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <div className="font-medium">Delivery Partner</div>
                              <div className="text-xs text-gray-500">Earn by delivering</div>
                            </div>
                          </div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Flexible</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-600">{errors.role}</p>
                  )}
                </div> */}

                {/* Role Information */}
                {formData.role && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 bg-gradient-to-r ${getRoleInfo(formData.role).gradient} rounded-lg text-white`}>
                        {getRoleInfo(formData.role).icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{getRoleInfo(formData.role).title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getRoleInfo(formData.role).badgeColor}`}>
                            {getRoleInfo(formData.role).badge}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{getRoleInfo(formData.role).description}</p>
                      </div>
                    </div>
                  </div>
                )}

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

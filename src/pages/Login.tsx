import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Shield, Users, Store, ArrowLeft, Smartphone, Zap } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('customer');
  
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      const roleRedirects = {
        customer: '/',
        vendor: '/vendor-dashboard',
        admin: '/admin-dashboard',
      };
      
      const from = location.state?.from?.pathname || roleRedirects[profile.role];
      navigate(from, { replace: true });
    }
  }, [user, profile, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      const result = await signIn(email, password);
      
      if (result.success) {
        // The auth context will handle profile fetching
        // Just redirect - the useEffect will handle the rest
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (role: string) => {
    const roleConfig = {
      customer: {
        icon: <Smartphone className="h-6 w-6" />,
        title: 'Customer Login',
        description: 'Access your account to shop for mobile parts',
        gradient: 'from-blue-500 to-purple-600',
        bgGradient: 'from-blue-50 to-purple-50',
      },
      vendor: {
        icon: <Store className="h-6 w-6" />,
        title: 'Vendor Portal',
        description: 'Manage your products and orders',
        gradient: 'from-green-500 to-teal-600',
        bgGradient: 'from-green-50 to-teal-50',
      },
      admin: {
        icon: <Shield className="h-6 w-6" />,
        title: 'Admin Dashboard',
        description: 'Manage the platform and vendors',
        gradient: 'from-orange-500 to-red-600',
        bgGradient: 'from-orange-50 to-red-50',
      },
    };
    return roleConfig[role as keyof typeof roleConfig];
  };

  const currentRoleInfo = getRoleInfo(selectedTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-purple-400/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-400/20 rounded-full animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              Tryodo
            </span>
          </Link>
          
          <Button
            variant="ghost"
            asChild
            className="hover:bg-white/50"
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
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center bg-gradient-to-r ${currentRoleInfo.gradient} p-3 rounded-2xl mb-4`}>
              <div className="text-white">
                {currentRoleInfo.icon}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your Tryodo account</p>
          </div>

          {/* Login Form */}
          <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Choose your account type and enter your credentials
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="customer" className="text-xs">
                    <Users className="h-4 w-4 mr-1" />
                    Customer
                  </TabsTrigger>
                  <TabsTrigger value="vendor" className="text-xs">
                    <Store className="h-4 w-4 mr-1" />
                    Vendor
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="text-xs">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </TabsTrigger>
                </TabsList>

                {['customer', 'vendor', 'admin'].map((role) => (
                  <TabsContent key={role} value={role} className="space-y-4">
                    <div className={`p-4 rounded-lg bg-gradient-to-r ${getRoleInfo(role).bgGradient} border-l-4 border-l-blue-500`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-gradient-to-r ${getRoleInfo(role).gradient} rounded-lg text-white`}>
                          {getRoleInfo(role).icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{getRoleInfo(role).title}</h3>
                          <p className="text-sm text-gray-600">{getRoleInfo(role).description}</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                          className="h-12"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="h-12 pr-12"
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
                      </div>

                      <div className="flex items-center justify-between">
                        <Link
                          to="/reset-password"
                          className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>

                      <Button
                        type="submit"
                        className={`w-full h-12 bg-gradient-to-r ${currentRoleInfo.gradient} hover:opacity-90 text-white font-semibold`}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" />
                            Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-500 font-semibold hover:underline"
                >
                  Sign up here
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Secure login powered by Supabase
            </p>
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                SSL Encrypted
              </span>
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                Trusted by 5000+ users
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, Mail, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        return;
      }

      const result = await resetPassword(email);
      
      if (result.success) {
        setEmailSent(true);
        toast.success('Password reset email sent successfully!');
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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
              <Link to="/login" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Login</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Success Content */}
        <div className="relative z-10 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-2xl mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-600">We've sent you a password reset link</p>
            </div>

            <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <Mail className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Email Sent Successfully</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We've sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Please check your inbox and click the link to reset your password.
                      Don't forget to check your spam folder if you don't see it.
                    </p>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Button
                      asChild
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white font-semibold"
                    >
                      <Link to="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                      </Link>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEmailSent(false);
                        setEmail('');
                      }}
                      className="w-full h-12"
                    >
                      Send Another Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <Link to="/login" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl mb-4">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive a reset link</p>
          </div>

          {/* Reset Form */}
          <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center">Forgot Password?</CardTitle>
              <CardDescription className="text-center">
                No worries! Enter your email and we'll send you a reset link
              </CardDescription>
            </CardHeader>

            <CardContent>
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
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    We'll send a password reset link to this email address
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-500 font-semibold hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Secure password reset powered by Supabase
            </p>
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                SSL Encrypted
              </span>
              <span className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                Instant Delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

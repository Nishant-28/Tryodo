import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, debugAuthState, testDbConnection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Database, User, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import DatabaseSetup from './DatabaseSetup';

const AuthDebug = () => {
  const { user, profile, session, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dbTest, setDbTest] = useState<any>(null);
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);

  const refreshDebugInfo = async () => {
    try {
      // Get session directly from Supabase
      const { data: { session: directSession }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user: directUser }, error: userError } = await supabase.auth.getUser();
      
      let directProfile = null;
      if (directUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', directUser.id)
          .single();
        directProfile = data;
      }

      setDebugInfo({
        directSession: !!directSession,
        directUser: !!directUser,
        directProfile,
        sessionError,
        userError,
        sessionExpiry: directSession?.expires_at,
        userEmail: directUser?.email,
      });

      // Test database connection
      const dbResult = await testDbConnection();
      setDbTest(dbResult);

      // Get localStorage keys
      const authKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('tryodo')
      );
      setLocalStorageKeys(authKeys);

    } catch (error) {
      console.error('Debug refresh error:', error);
    }
  };

  useEffect(() => {
    refreshDebugInfo();
  }, []);

  const getStatusIcon = (condition: boolean) => {
    return condition ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Authentication Debug Panel</span>
          </CardTitle>
          <CardDescription>
            Debug information for authentication system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={refreshDebugInfo} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={debugAuthState} variant="outline" size="sm">
              Console Debug
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Database Setup */}
      <DatabaseSetup />

      {/* Auth Context State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Auth Context State</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(!loading)}
              <span className="text-sm">Loading: {loading ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(!!user)}
              <span className="text-sm">User: {user ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(!!profile)}
              <span className="text-sm">Profile: {profile ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(!!session)}
              <span className="text-sm">Session: {session ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          {profile && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Profile Details:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Email:</span> {profile.email}</p>
                <p><span className="font-medium">Role:</span> <Badge variant="outline">{profile.role}</Badge></p>
                <p><span className="font-medium">Name:</span> {profile.full_name || 'Not set'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Supabase State */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Direct Supabase State</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(debugInfo.directSession)}
                <span className="text-sm">Direct Session</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(debugInfo.directUser)}
                <span className="text-sm">Direct User</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(!!debugInfo.directProfile)}
                <span className="text-sm">Direct Profile</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(!debugInfo.sessionError && !debugInfo.userError)}
                <span className="text-sm">No Errors</span>
              </div>
            </div>

            {debugInfo.userEmail && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm"><span className="font-medium">Email:</span> {debugInfo.userEmail}</p>
                {debugInfo.sessionExpiry && (
                  <p className="text-sm"><span className="font-medium">Session Expires:</span> {new Date(debugInfo.sessionExpiry).toLocaleString()}</p>
                )}
              </div>
            )}

            {(debugInfo.sessionError || debugInfo.userError) && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {debugInfo.sessionError?.message || debugInfo.userError?.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Database Connection */}
      {dbTest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Connection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(dbTest.success)}
              <span className="text-sm">
                Database: {dbTest.success ? 'Connected' : 'Failed'}
              </span>
            </div>
            {!dbTest.success && dbTest.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {dbTest.error.message || 'Database connection failed'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Local Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Local Storage Keys</CardTitle>
          <CardDescription>
            Authentication-related keys in browser storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localStorageKeys.length > 0 ? (
            <div className="space-y-2">
              {localStorageKeys.map(key => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-mono">{key}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      localStorage.removeItem(key);
                      refreshDebugInfo();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No authentication keys found</p>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold">If "User profile not found" error occurs:</h4>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>Check if the profiles table exists in Supabase (use Database Setup above)</li>
              <li>Verify the trigger function is creating profiles on signup</li>
              <li>Try creating a test user through the signup form</li>
              <li>Check browser console for detailed error messages</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">If auth fails on reload:</h4>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>Check if session exists but profile is missing</li>
              <li>Verify database connection and profile table</li>
              <li>Clear localStorage and try fresh login</li>
              <li>Check browser console for errors</li>
            </ul>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              variant="outline"
              size="sm"
            >
              Clear All Storage
            </Button>
            <Button 
              onClick={() => window.location.href = '/login'}
              variant="outline"
              size="sm"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebug; 
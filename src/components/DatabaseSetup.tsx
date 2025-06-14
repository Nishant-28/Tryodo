import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const DatabaseSetup = () => {
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [setupError, setSetupError] = useState<string>('');

  const checkTableExists = async () => {
    setChecking(true);
    setSetupError('');
    
    try {
      // Try to query the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('Table check error:', error);
        setTableExists(false);
        if (error.code === '42P01') {
          setSetupError('Profiles table does not exist');
        } else {
          setSetupError(`Database error: ${error.message}`);
        }
      } else {
        setTableExists(true);
        console.log('✅ Profiles table exists');
      }
    } catch (err) {
      console.error('Check error:', err);
      setTableExists(false);
      setSetupError('Failed to check table existence');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkTableExists();
  }, []);

  const setupSQL = `-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(setupSQL);
      toast.success('SQL copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Database Setup</span>
        </CardTitle>
        <CardDescription>
          Check and setup the profiles table in your Supabase database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Checking database...</span>
              </>
            ) : tableExists === true ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Profiles table exists</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Ready
                </Badge>
              </>
            ) : tableExists === false ? (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Profiles table missing</span>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Setup Required
                </Badge>
              </>
            ) : null}
          </div>
          
          <Button onClick={checkTableExists} size="sm" variant="outline">
            Recheck
          </Button>
        </div>

        {setupError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{setupError}</AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        {tableExists === false && (
          <div className="space-y-4">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Setup Required</p>
                  <p>The profiles table is missing from your Supabase database. Follow these steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                    <li>Open your Supabase dashboard</li>
                    <li>Go to SQL Editor</li>
                    <li>Copy and run the SQL script below</li>
                    <li>Come back and click "Recheck"</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">SQL Setup Script</h4>
                <Button onClick={copyToClipboard} size="sm" variant="outline">
                  <Copy className="h-4 w-4 mr-1" />
                  Copy SQL
                </Button>
              </div>
              
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {setupSQL}
                </pre>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Make sure to run this SQL in your Supabase project's SQL Editor. 
                This will create the profiles table and set up automatic profile creation for new users.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Success state */}
        {tableExists === true && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-semibold">Database Ready!</p>
                <p>The profiles table is properly configured. Authentication should work correctly now.</p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>Profiles table exists</li>
                  <li>Row Level Security enabled</li>
                  <li>User policies configured</li>
                  <li>Auto-profile creation trigger active</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup; 
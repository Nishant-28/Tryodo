import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

const EnvironmentCheck = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const hasUrl = !!supabaseUrl;
  const hasKey = !!supabaseKey;
  const isConfigured = hasUrl && hasKey;

  if (isConfigured) {
    return null; // Don't show anything if properly configured
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <div className="font-semibold">Supabase Configuration Missing</div>
          <div className="text-sm space-y-1">
            <div className="flex items-center space-x-2">
              {hasUrl ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
              <span>VITE_SUPABASE_URL: {hasUrl ? 'Set' : 'Missing'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {hasKey ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
              <span>VITE_SUPABASE_ANON_KEY: {hasKey ? 'Set' : 'Missing'}</span>
            </div>
          </div>
          <div className="text-xs">
            Create a .env file in your project root with these variables.
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EnvironmentCheck; 
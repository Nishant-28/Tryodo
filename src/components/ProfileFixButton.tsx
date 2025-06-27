import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface ProfileFixButtonProps {
  className?: string;
}

export const ProfileFixButton: React.FC<ProfileFixButtonProps> = ({ className }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const handleCreateProfile = async () => {
    if (!user) {
      setResult({ success: false, message: 'No user logged in' });
      return;
    }

    setIsCreating(true);
    setResult(null);

    try {
      console.log('🔧 Manually creating profile for user:', user.id);
      
      // Get role from user metadata or default to customer
      const role = user.user_metadata?.role || 'customer';
      const fullName = user.user_metadata?.full_name || null;

      // Dynamic import to avoid bundle size issues
      const { createMissingProfile } = await import('../lib/profileUtils');
      const createResult = await createMissingProfile(
        user.id,
        user.email || '',
        role,
        fullName
      );

      if (createResult.success) {
        setResult({ success: true, message: 'Profile created successfully!' });
        
        // Refresh the profile data
        setTimeout(() => {
          refreshProfile();
        }, 1000);
      } else {
        setResult({ success: false, message: createResult.error });
      }
    } catch (error: any) {
      console.error('❌ Error creating profile:', error);
      setResult({ success: false, message: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Only show this component if user is logged in but has no profile
  if (!user || profile) {
    return null;
  }

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your account exists but your profile is missing. This may happen with older accounts.
          Click the button below to create your profile manually.
        </AlertDescription>
      </Alert>

      <Button
        onClick={handleCreateProfile}
        disabled={isCreating}
        className="w-full flex items-center gap-2"
        variant="outline"
      >
        {isCreating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Creating Profile...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create Missing Profile
          </>
        )}
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.message}
          </AlertDescription>
        </Alert>
      )}

      {user && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.user_metadata?.role || 'customer'}</p>
        </div>
      )}
    </div>
  );
};

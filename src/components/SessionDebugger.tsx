import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionTimeRemaining, shouldRefreshSession, hasValidCachedSession } from '@/lib/authUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SessionDebugger: React.FC = () => {
  const { user, session, refreshSession } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [hasValidCache, setHasValidCache] = useState(false);

  useEffect(() => {
    const updateSessionInfo = () => {
      setTimeRemaining(getSessionTimeRemaining());
      setShouldRefresh(shouldRefreshSession());
      setHasValidCache(hasValidCachedSession());
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const handleManualRefresh = async () => {
    try {
      await refreshSession();
    } catch (error) {
      console.error('Manual session refresh failed:', error);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      {/* <CardHeader className="pb-2">
        <CardTitle className="text-sm">Session Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>User: {user ? user.email : 'Not logged in'}</div>
        <div>Session Valid: {session ? 'Yes' : 'No'}</div>
        <div>Cached Valid: {hasValidCache ? 'Yes' : 'No'}</div>
        <div>Time Remaining: {timeRemaining > 0 ? formatTime(timeRemaining) : 'Expired'}</div>
        <div>Should Refresh: {shouldRefresh ? 'Yes' : 'No'}</div>
        {session?.expires_at && (
          <div>Expires: {new Date(session.expires_at * 1000).toLocaleTimeString()}</div>
        )}
        <Button 
          size="sm" 
          onClick={handleManualRefresh}
          disabled={!user}
          className="w-full mt-2"
        >
          Manual Refresh
        </Button> 
       </CardContent> */}
    </Card>
  );
};

export default SessionDebugger; 
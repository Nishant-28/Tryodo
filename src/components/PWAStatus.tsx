import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored!', {
        description: 'You are back online.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost', {
        description: 'You are now offline. Some features may be limited.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for PWA updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
          setUpdateSW(() => event.data.updateSW);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = async () => {
    if (updateSW) {
      try {
        await updateSW();
        toast.success('App updated!', {
          description: 'The app has been updated to the latest version.',
        });
        setUpdateAvailable(false);
      } catch (error) {
        toast.error('Update failed', {
          description: 'Failed to update the app. Please try again.',
        });
      }
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
        isOnline 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Update Available */}
      {updateAvailable && (
        <div className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-medium">Update available</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdate}
              className="h-6 px-2 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Update
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus; 
import { toast } from 'sonner';

export interface PWAUpdateInfo {
  isUpdateAvailable: boolean;
  updateServiceWorker: () => Promise<void>;
}

let updateSW: (() => Promise<void>) | null = null;

export const registerPWA = (): Promise<PWAUpdateInfo> => {
  return new Promise((resolve) => {
    if ('serviceWorker' in navigator) {
      // Import the virtual module created by vite-plugin-pwa
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          updateSW = registerSW({
            onNeedRefresh() {
              toast('New version available!', {
                description: 'Click to update the app',
                action: {
                  label: 'Update',
                  onClick: () => {
                    if (updateSW) {
                      updateSW();
                    }
                  },
                },
                duration: 10000,
              });
              
              resolve({
                isUpdateAvailable: true,
                updateServiceWorker: async () => {
                  if (updateSW) {
                    await updateSW();
                  }
                },
              });
            },
            onOfflineReady() {
              toast.success('App ready to work offline!', {
                description: 'The app has been cached and is ready to work offline.',
              });
              
              resolve({
                isUpdateAvailable: false,
                updateServiceWorker: async () => {},
              });
            },
            onRegistered(registration) {
              console.log('SW Registered: ', registration);
            },
            onRegisterError(error) {
              console.log('SW registration error', error);
              toast.error('Failed to register service worker', {
                description: 'The app may not work offline.',
              });
              
              resolve({
                isUpdateAvailable: false,
                updateServiceWorker: async () => {},
              });
            },
          });
        })
        .catch((error) => {
          console.log('PWA registration failed:', error);
          resolve({
            isUpdateAvailable: false,
            updateServiceWorker: async () => {},
          });
        });
    } else {
      console.log('Service workers are not supported');
      resolve({
        isUpdateAvailable: false,
        updateServiceWorker: async () => {},
      });
    }
  });
};

export const checkForPWAUpdate = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
    } catch (error) {
      console.error('Error checking for PWA update:', error);
    }
  }
  return false;
};

export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Check for Chrome/Edge standalone mode
  const isChromeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  return isStandalone || isIOSStandalone || isChromeStandalone;
};

export const getInstallPrompt = (): Promise<Event | null> => {
  return new Promise((resolve) => {
    let deferredPrompt: Event | null = null;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      resolve(deferredPrompt);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Timeout after 5 seconds if no prompt event
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      resolve(null);
    }, 5000);
  });
};

export const shareContent = async (data: ShareData): Promise<boolean> => {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }
  return false;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }
  return false;
}; 
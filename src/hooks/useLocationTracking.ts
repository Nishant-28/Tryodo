import { useState, useEffect, useCallback } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
}

export function useLocationTracking() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const successCallback = useCallback((position: GeolocationPosition) => {
    const newLocation: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: new Date().toISOString(),
    };
    
    setLocation(newLocation);
    setError(null);
  }, []);

  const errorCallback = useCallback((err: GeolocationPositionError) => {
    const errorMessage = `Location error (${err.code}): ${err.message}`;
    setError(errorMessage);
    console.error('Location error:', err);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    if (isTracking) {
      return; // Already tracking
    }

    const id = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      { 
        enableHighAccuracy: true, 
        maximumAge: 30000, // 30 seconds
        timeout: 10000 // 10 seconds
      }
    );

    setWatchId(id);
    setIsTracking(true);
    setError(null);
  }, [isTracking, successCallback, errorCallback]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return { 
    location, 
    error, 
    isTracking, 
    startTracking, 
    stopTracking 
  };
} 
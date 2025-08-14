import React from 'react';
import { useOrderNotifications } from '@/hooks/useNotifications';

interface NotificationProviderProps {
  children: React.ReactNode;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // Initialize order notifications for the entire app
  useOrderNotifications();

  return <>{children}</>;
};

export default NotificationProvider; 
import React, { useEffect, useState } from 'react';
import { Home, Search, ShoppingCart, User, Package, Truck, Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  cartItems?: number;
  onCartClick?: () => void;
}

const MobileBottomNav = ({ cartItems = 0, onCartClick }: MobileBottomNavProps) => {
  const { profile } = useAuth();
  const location = useLocation();

  // Use the cartItems prop directly from the cart context
  const cartCount = cartItems;

  // Only show for customer and delivery_partner roles
  if (!profile || !['customer', 'delivery_partner'].includes(profile.role)) {
    return null;
  }

  // Simulate haptic feedback for touch interactions
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Light vibration for 50ms
    }
  };

  // Different navigation for different roles
  const customerNavigationItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      isActive: location.pathname === '/'
    },
    {
      icon: Search,
      label: 'Order',
      href: '/order',
      isActive: location.pathname === '/order'
    },
    {
      icon: ShoppingCart,
      label: 'Cart',
      href: '#',
      isActive: false,
      onClick: onCartClick,
      badge: cartCount > 0 ? cartCount : undefined
    },
    {
      icon: Package,
      label: 'Orders',
      href: '/my-orders',
      isActive: location.pathname === '/my-orders'
    },
    {
      icon: User,
      label: 'Profile',
      href: '/profile',
      isActive: location.pathname === '/profile'
    }
  ];

  const deliveryNavigationItems = [
    {
      icon: Package,
      label: 'Available',
      href: '/delivery-partner-dashboard',
      isActive: location.pathname === '/delivery-partner-dashboard' && location.hash !== '#my-orders',
      onClick: undefined,
      badge: undefined
    },
    {
      icon: Truck,
      label: 'My Orders',
      href: '/delivery-partner-dashboard#my-orders',
      isActive: location.pathname === '/delivery-partner-dashboard' && location.hash === '#my-orders',
      onClick: undefined,
      badge: undefined
    },
    {
      icon: Activity,
      label: 'Dashboard',
      href: '/delivery-partner-dashboard',
      isActive: location.pathname === '/delivery-partner-dashboard',
      onClick: undefined,
      badge: undefined
    },
    {
      icon: User,
      label: 'Profile',
      href: '/profile',
      isActive: location.pathname === '/profile',
      onClick: undefined,
      badge: undefined
    }
  ];

  const navigationItems = profile.role === 'delivery_partner' ? deliveryNavigationItems : customerNavigationItems;

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 safe-area-pb z-50 sm:hidden shadow-2xl">
        <div className="grid grid-cols-5 h-16 relative">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            if (item.onClick && typeof item.onClick === 'function') {
              return (
                <button
                  key={index}
                  onClick={() => {
                    triggerHapticFeedback();
                    item.onClick!();
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center space-y-1 touch-manipulation relative",
                    "transition-all duration-300 ease-out",
                    "active:scale-95 active:bg-gray-100/50",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-inset",
                    isActive 
                      ? "text-blue-600 bg-blue-50/80" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full transition-all duration-300" />
                  )}
                  
                  <div className="relative">
                    <Icon className={cn(
                      "transition-all duration-300",
                      isActive ? "h-6 w-6" : "h-5 w-5"
                    )} />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300",
                    isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={index}
                to={item.href}
                onClick={triggerHapticFeedback}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 touch-manipulation relative",
                  "transition-all duration-300 ease-out",
                  "active:scale-95 active:bg-gray-100/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-inset",
                  isActive 
                    ? "text-blue-600 bg-blue-50/80" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full transition-all duration-300" />
                )}
                
                <Icon className={cn(
                  "transition-all duration-300",
                  isActive ? "h-6 w-6" : "h-5 w-5"
                )} />
                <span className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        
        {/* Safe area spacer for devices with bottom safe area */}
        <div className="h-safe-bottom bg-white/95"></div>
      </nav>

      {/* Backdrop for bottom navigation to prevent content overlap */}
      <div className="h-20 sm:hidden" />
    </>
  );
};

export default MobileBottomNav; 
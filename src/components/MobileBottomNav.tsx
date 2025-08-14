import React, { useEffect, useState } from 'react';
import { Home, Search, ShoppingCart, User, Package, Truck, Activity, Store } from 'lucide-react';
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

  // Enhanced haptic feedback for touch interactions
  const triggerHapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 30,
        medium: 50,
        heavy: 80
      }
      navigator.vibrate(patterns[intensity]);
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
    // {
    //   icon: Package,
    //   label: 'Orders',
    //   href: '/my-orders',
    //   isActive: location.pathname === '/my-orders'
    // },
    {
      icon: User,
      label: 'Profile',
      href: '/profile',
      isActive: location.pathname === '/profile'
    },{
      icon: Store,
      label: 'Market',
      href: '/market',
      isActive: location.pathname === '/market'
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
      icon: Store,
      label: 'Market',
      href: '/market',
      isActive: location.pathname === '/market',
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

  // Dynamic grid columns based on number of items
  const getGridCols = () => {
    const itemCount = navigationItems.length;
    if (itemCount === 4) return 'grid-cols-4';
    if (itemCount === 5) return 'grid-cols-5';
    return 'grid-cols-4'; // fallback
  };

  return (
    <>
      {/* Enhanced Bottom Navigation */}
      <nav className="nav-mobile shadow-2xl">
        <div className={cn("h-16 relative", getGridCols(), "grid")}>
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            if (item.onClick && typeof item.onClick === 'function') {
              return (
                <button
                  key={index}
                  onClick={() => {
                    triggerHapticFeedback('light');
                    item.onClick!();
                  }}
                  className={cn(
                    "nav-mobile-item",
                    "relative overflow-hidden",
                    "flex flex-col items-center justify-center",
                    "px-1 py-2 rounded-xl transition-all duration-300",
                    "min-h-[56px] min-w-[48px]",
                    "active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                    isActive 
                      ? "text-blue-600 bg-blue-50/80" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {/* Enhanced Active indicator */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-full transition-all duration-300 shadow-md" />
                  )}
                  
                  {/* Enhanced ripple effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 scale-75 transition-all duration-300 active:opacity-100 active:scale-100" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                      <Icon className={cn(
                        "transition-all duration-300",
                        isActive ? "h-6 w-6" : "h-5 w-5"
                      )} />
                      {item.badge && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse border-2 border-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium transition-all duration-300 mt-1 text-center leading-none",
                      isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                    )}>
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={index}
                to={item.href}
                onClick={() => triggerHapticFeedback('light')}
                className={cn(
                  "nav-mobile-item",
                  "relative overflow-hidden",
                  "flex flex-col items-center justify-center",
                  "px-1 py-2 rounded-xl transition-all duration-300",
                  "min-h-[56px] min-w-[48px]",
                  "active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  isActive 
                    ? "text-blue-600 bg-blue-50/80" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {/* Enhanced Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-full transition-all duration-300 shadow-md" />
                )}
                
                {/* Enhanced ripple effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 scale-75 transition-all duration-300 active:opacity-100 active:scale-100" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <Icon className={cn(
                    "transition-all duration-300",
                    isActive ? "h-6 w-6" : "h-5 w-5"
                  )} />
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300 mt-1 text-center leading-none",
                    isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Enhanced bottom safe area with subtle gradient */}
        <div className="h-[env(safe-area-inset-bottom)] bg-gradient-to-t from-white/50 to-transparent" />
      </nav>

      {/* Spacer for content to avoid being hidden behind the navigation */}
      <div className="h-16 pb-safe" />
    </>
  );
};

export default MobileBottomNav; 
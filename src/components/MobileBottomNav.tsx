import React from 'react';
import { Home, Search, ShoppingCart, User, Package } from 'lucide-react';
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

  // Only show for customer role
  if (!profile || profile.role !== 'customer') {
    return null;
  }

  const navigationItems = [
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
      badge: cartItems > 0 ? cartItems : undefined
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb z-40 sm:hidden">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          if (item.onClick) {
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 touch-manipulation animate-press relative",
                  "transition-colors duration-200",
                  isActive 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-gray-500 hover:text-gray-700 active:bg-gray-50"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={index}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 touch-manipulation animate-press",
                "transition-colors duration-200",
                isActive 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-500 hover:text-gray-700 active:bg-gray-50"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for devices with bottom safe area */}
      <div className="h-safe-bottom bg-white"></div>
    </nav>
  );
};

export default MobileBottomNav; 
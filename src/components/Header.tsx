import React from 'react';
import { Search, ShoppingCart, User, Menu, LogOut, Settings, Shield, Store, Building, UserCircle, Bug, Package, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  cartItems?: number;
  onCartClick?: () => void;
  hideCartOnMobile?: boolean;
}

const Header = ({ cartItems = 0, onCartClick, hideCartOnMobile = true }: HeaderProps) => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      console.log('🚪 Header: Initiating sign out...');
      await signOut();
      toast.success('Signed out successfully');
      console.log('🚪 Header: Sign out complete, navigating to login');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ Header: Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const getRoleIcon = () => {
    if (!profile) return User;
    switch (profile.role) {
      case 'admin': return Building;
      case 'vendor': return Store;
      case 'customer': return UserCircle;
      case 'delivery_partner': return Package;
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon();

  // Don't render header for non-authenticated users on protected pages
  if (!user) {
    return (
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/login" className="touch-manipulation">
                <img src="/Tryodo-Icon.png" alt="Tryodo Logo" className="h-12 sm:h-16 w-auto" />
              </Link>
              <div className="hidden sm:block">
                <span className="text-sm text-gray-500 font-medium">Electronics Marketplace</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                About
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="min-h-touch touch-manipulation hover:bg-blue-50 hover:text-blue-600">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 min-h-touch touch-manipulation shadow-md">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link 
              to={
                profile?.role === 'customer' ? '/' : 
                profile?.role === 'vendor' ? '/vendor-dashboard' : 
                profile?.role === 'delivery_partner' ? '/delivery-partner-dashboard' :
                '/admin-dashboard'
              }
              className="touch-manipulation"
            >
              <img src="/Tryodo_Full_LOGO.png" alt="Tryodo Logo" className="h-12 sm:h-16 w-auto" />
            </Link>
            <div className="hidden sm:block">
              <span className="text-sm text-gray-500 font-medium">Electronics Marketplace</span>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile for customers */}
          <nav className={`hidden ${profile?.role === 'customer' ? 'lg:flex' : 'md:flex'} items-center space-x-8`}>
            {/* Customer Navigation */}
            {profile?.role === 'customer' && (
              <>
                <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Home
                </Link>
                <Link to="/order" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Order
                </Link>
                <Link to="/my-orders" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  My Orders
                </Link>
                <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  About
                </Link>
                <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium py-2">
                  Contact
                </Link>
              </>
            )}

            {/* Vendor Navigation */}
            {profile?.role === 'vendor' && (
              <>
                <Link to="/vendor-dashboard" className="text-green-600 hover:text-green-700 transition-colors font-medium py-2">
                  Dashboard
                </Link>
                <Link to="/vendor/analytics" className="text-green-600 hover:text-green-700 transition-colors font-medium py-2">
                  Analytics
                </Link>
                <Link to="/vendor-profile" className="text-green-600 hover:text-green-700 transition-colors font-medium py-2">
                  Profile
                </Link>
                <Link to="/vendor/add-product" className="text-green-600 hover:text-green-700 transition-colors font-medium py-2">
                  Add Product
                </Link>
              </>
            )}

            {/* Admin Navigation */}
            {profile?.role === 'admin' && (
              <>
                <Link to="/admin-dashboard" className="text-purple-600 hover:text-purple-700 transition-colors font-medium py-2">
                  Dashboard
                </Link>
              </>
            )}

            {/* Delivery Partner Navigation */}
            {profile?.role === 'delivery_partner' && (
              <>
                <Link to="/delivery-partner-dashboard" className="text-orange-600 hover:text-orange-700 transition-colors font-medium py-2">
                  Dashboard
                </Link>
                <Link to="/delivery-slot-dashboard" className="text-orange-600 hover:text-orange-700 transition-colors font-medium py-2">
                  Slot Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Customer-only cart - Hidden on mobile if hideCartOnMobile is true */}
            {profile?.role === 'customer' && onCartClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={`relative min-h-touch min-w-touch touch-manipulation active:scale-95 transition-transform hover:bg-orange-50 hover:text-orange-600 ${hideCartOnMobile ? 'hidden sm:flex' : 'flex'} items-center justify-center`}
                onClick={onCartClick}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg animate-pulse">
                    {cartItems > 99 ? '99+' : cartItems}
                  </span>
                )}
              </Button>
            )}

            {/* User Profile Dropdown */}
            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center space-x-2 min-h-touch touch-manipulation active:scale-95 transition-transform hover:bg-orange-50 hover:text-orange-600"
                  >
                    <RoleIcon className="h-5 w-5" />
                    <span className="hidden sm:block text-sm truncate max-w-20 lg:max-w-32 font-medium">
                      {profile.full_name || profile.email.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {profile.role.replace('_', ' ')}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Role-specific menu items */}
                  {profile?.role === 'customer' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/my-orders" className="flex items-center cursor-pointer">
                          <Package className="mr-2 h-4 w-4" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {profile?.role === 'vendor' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/vendor-dashboard" className="flex items-center cursor-pointer">
                          <Store className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/vendor/analytics" className="flex items-center cursor-pointer">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Analytics
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/vendor-profile" className="flex items-center cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/vendor/add-product" className="flex items-center cursor-pointer">
                          <Package className="mr-2 h-4 w-4" />
                          Add Product
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin-dashboard" className="flex items-center cursor-pointer">
                        <Building className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {profile?.role === 'delivery_partner' && (
                    <DropdownMenuItem asChild>
                      <Link to="/delivery-partner-dashboard" className="flex items-center cursor-pointer">
                        <Package className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

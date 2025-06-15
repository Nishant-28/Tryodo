import React from 'react';
import { Search, ShoppingCart, User, Menu, LogOut, Settings, Shield, Store, Building, UserCircle, Bug, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { forceAuthReset } from '@/lib/supabase';
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
  onCartClick: () => void;
}

const Header = ({ cartItems = 0, onCartClick }: HeaderProps) => {
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
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon();

  // Don't render header for non-authenticated users on protected pages
  if (!user) {
    return (
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-pt">
        <div className="container-mobile mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link to="/login" className="touch-manipulation">
                <img src="/Tryodo_Full_LOGO.png" alt="Tryodo Logo" className="h-16 sm:h-20 w-auto" />
              </Link>
              <div className="hidden sm:block">
                <span className="text-xs sm:text-sm text-gray-500">Electronics Marketplace</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                About
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="min-h-touch touch-manipulation animate-press">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 min-h-touch touch-manipulation animate-press">
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-pt">
      <div className="container-mobile mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link 
              to={profile?.role === 'customer' ? '/' : profile?.role === 'vendor' ? '/vendor-dashboard' : '/admin-dashboard'}
              className="touch-manipulation"
            >
              <img src="/Tryodo_Full_LOGO.png" alt="Tryodo Logo" className="h-16 sm:h-20 w-auto" />
            </Link>
            <div className="hidden sm:block">
              <span className="text-xs sm:text-sm text-gray-500">Electronics Marketplace</span>
            </div>
          </div>

          {/* Role-specific Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {/* Customer Navigation */}
            {profile?.role === 'customer' && (
              <>
                <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                  Home
                </Link>
                <Link to="/order" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                  Order
                </Link>
                <Link to="/my-orders" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                  My Orders
                </Link>
                <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                  About
                </Link>
                <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium touch-manipulation py-2">
                  Contact
                </Link>
              </>
            )}

            {/* Vendor Navigation */}
            {profile?.role === 'vendor' && (
              <>
                <Link to="/vendor-dashboard" className="text-green-600 hover:text-green-700 transition-colors font-medium touch-manipulation py-2">
                  Dashboard
                </Link>
              </>
            )}

            {/* Admin Navigation */}
            {profile?.role === 'admin' && (
              <>
                <Link to="/admin-dashboard" className="text-purple-600 hover:text-purple-700 transition-colors font-medium touch-manipulation py-2">
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Customer-only cart */}
            {profile?.role === 'customer' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative min-h-touch min-w-touch touch-manipulation animate-press" 
                onClick={onCartClick}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
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
                    className="flex items-center space-x-2 min-h-touch touch-manipulation animate-press"
                  >
                    <RoleIcon className="h-5 w-5" />
                    <span className="hidden sm:block text-sm truncate max-w-20 lg:max-w-32">
                      {profile.full_name || profile.email.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-mobile">
                  <DropdownMenuLabel className="flex flex-col py-3">
                    <span className="font-medium text-sm">
                      {profile.full_name || profile.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{profile.role}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Role-specific menu items */}
                  {profile.role === 'customer' && (
                    <>
                      <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                        <Link to="/profile" className="flex items-center py-3">
                          <UserCircle className="mr-3 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                        <Link to="/my-orders" className="flex items-center py-3">
                          <Package className="mr-3 h-4 w-4" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                        <Link to="/profile" className="flex items-center py-3">
                          <Settings className="mr-3 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {profile.role === 'vendor' && (
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/vendor-dashboard" className="flex items-center py-3">
                        <Store className="mr-3 h-4 w-4" />
                        Vendor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {profile.role === 'admin' && (
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/admin-dashboard" className="flex items-center py-3">
                        <Building className="mr-3 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    className="text-red-600 focus:text-red-600 touch-manipulation min-h-touch py-3"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                  
                  {/* Debug option in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <DropdownMenuItem 
                      onClick={() => {
                        console.log('🔧 Force auth reset triggered');
                        forceAuthReset();
                      }} 
                      className="text-orange-600 touch-manipulation min-h-touch py-3"
                    >
                      <Bug className="mr-3 h-4 w-4" />
                      Force Reset Auth
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden min-h-touch min-w-touch touch-manipulation animate-press"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-mobile">
                <DropdownMenuLabel className="py-3">
                  <span className="font-medium text-sm">Navigation</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Customer mobile menu */}
                {profile?.role === 'customer' && (
                  <>
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/" className="py-3">
                        <UserCircle className="mr-3 h-4 w-4" />
                        Home
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/order" className="py-3">
                        <Search className="mr-3 h-4 w-4" />
                        Order
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/my-orders" className="py-3">
                        <Package className="mr-3 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/about" className="py-3">
                        <Shield className="mr-3 h-4 w-4" />
                        About
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/contact" className="py-3">
                        <User className="mr-3 h-4 w-4" />
                        Contact
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                      <Link to="/profile" className="py-3">
                        <Settings className="mr-3 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}

                {/* Vendor mobile menu */}
                {profile?.role === 'vendor' && (
                  <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                    <Link to="/vendor-dashboard" className="py-3">
                      <Store className="mr-3 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}

                {/* Admin mobile menu */}
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild className="touch-manipulation min-h-touch">
                    <Link to="/admin-dashboard" className="py-3">
                      <Building className="mr-3 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

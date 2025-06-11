import React from 'react';
import { Search, ShoppingCart, User, Menu, LogOut, Settings, Shield, Store, Building, UserCircle } from 'lucide-react';
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
  onCartClick: () => void;
}

const Header = ({ cartItems = 0, onCartClick }: HeaderProps) => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
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
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <img src="/Tryodo_Full_LOGO.png" alt="Tryodo Logo" className="h-20 w-auto" />
              </Link>
              <div className="hidden sm:block">
                <span className="text-sm text-gray-500">Electronics Marketplace</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                About
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link to={profile?.role === 'customer' ? '/' : profile?.role === 'vendor' ? '/vendor-dashboard' : '/admin-dashboard'}>
              <img src="/Tryodo_Full_LOGO.png" alt="Tryodo Logo" className="h-20 w-auto" />
            </Link>
            <div className="hidden sm:block">
              <span className="text-sm text-gray-500">Electronics Marketplace</span>
            </div>
          </div>

          {/* Role-specific Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Customer Navigation */}
            {profile?.role === 'customer' && (
              <>
                <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Home
                </Link>
                <Link to="/order" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Order
                </Link>
                <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  About
                </Link>
                <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                  Contact
                </Link>
              </>
            )}

            {/* Vendor Navigation */}
            {profile?.role === 'vendor' && (
              <>
                <Link to="/vendor-dashboard" className="text-green-600 hover:text-green-700 transition-colors font-medium">
                  Dashboard
                </Link>
              </>
            )}

            {/* Admin Navigation */}
            {profile?.role === 'admin' && (
              <>
                <Link to="/admin-dashboard" className="text-purple-600 hover:text-purple-700 transition-colors font-medium">
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Customer-only cart */}
            {profile?.role === 'customer' && (
              <Button variant="ghost" size="sm" className="relative" onClick={onCartClick}>
                <ShoppingCart className="h-4 w-4" />
                {cartItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems}
                  </span>
                )}
              </Button>
            )}

            {/* User Profile Dropdown */}
            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <RoleIcon className="h-4 w-4" />
                    <span className="hidden sm:block">{profile.full_name || profile.email.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-medium">{profile.full_name || profile.email.split('@')[0]}</span>
                    <span className="text-xs text-gray-500 capitalize">{profile.role}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Role-specific menu items */}
                  {profile.role === 'customer' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center">
                          <UserCircle className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {profile.role === 'vendor' && (
                    <DropdownMenuItem asChild>
                      <Link to="/vendor-dashboard" className="flex items-center">
                        <Store className="mr-2 h-4 w-4" />
                        Vendor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {profile.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin-dashboard" className="flex items-center">
                        <Building className="mr-2 h-4 w-4" />
                        Admin Dashboard
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

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Customer mobile menu */}
                {profile?.role === 'customer' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/">Home</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/order">Order</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/about">About</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/contact">Contact</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Profile</Link>
                    </DropdownMenuItem>
                  </>
                )}

                {/* Vendor mobile menu */}
                {profile?.role === 'vendor' && (
                  <DropdownMenuItem asChild>
                    <Link to="/vendor-dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                )}

                {/* Admin mobile menu */}
                {profile?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin-dashboard">Dashboard</Link>
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

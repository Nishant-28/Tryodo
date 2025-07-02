import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useEffect, useState } from "react";
import { registerPWA } from "@/lib/pwa";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Order from "./pages/Order";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";

import VendorDashboard from "./pages/VendorDashboard";
import VendorProfile from "./pages/VendorProfile";
import AddProduct from "./pages/AddProduct";
import VendorProductManagement from "./pages/VendorProductManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminModelsManagement from "./pages/AdminModelsManagement";
import AdminCategoriesManagement from "./pages/AdminCategoriesManagement";
import AdminQualitiesManagement from "./pages/AdminQualitiesManagement";

import AdminCommissionRules from "./pages/AdminCommissionRules";
import AdminVendorManagement from "./pages/AdminVendorManagement";
import AdminVendorWallets from "./pages/AdminVendorWallets";
import AdminDeliveryWallets from "./pages/AdminDeliveryWallets";
import AdminPayoutManagement from "./pages/AdminPayoutManagement";
import AdminSectorManagement from "./pages/AdminSectorManagement";
import AdminSlotManagement from "./pages/AdminSlotManagement";
import AdminDeliveryPartnerManagement from "./pages/AdminDeliveryPartnerManagement";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";
import DeliveryPartnerDashboard from "./pages/DeliveryPartnerDashboard";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { Cart } from "@/components/customer/Cart";

const queryClient = new QueryClient();

const PWAWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    registerPWA();
  }, []);

  return <>{children}</>;
};

// Mobile Layout Wrapper for Customer Views
const MobileCustomerLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const isCustomer = profile?.role === 'customer';

  return (
    <div className="flex flex-col min-h-screen">
      <main className={`flex-grow ${isCustomer ? 'pb-20 sm:pb-0' : ''}`}>
        {children}
      </main>
      
      {/* Mobile Bottom Navigation - only for customer */}
      {isCustomer && (
        <MobileBottomNav 
          cartItems={totalItems}
          onCartClick={() => setIsCartOpen(true)}
        />
      )}

      {/* Cart Modal */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <PWAWrapper>
            <div className="flex flex-col min-h-screen">
              <Toaster position="top-center" richColors />
              <PWAInstallPrompt />
              <NetworkStatusIndicator />
              
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Role-specific login routes */}
                <Route path="/vendor-login" element={<Login />} />
                <Route path="/admin-login" element={<Login />} />
                <Route path="/delivery-partner-login" element={<Login />} />

                {/* Customer-only routes with mobile layout */}
                <Route path="/" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <Index />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/order" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <Order />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <UserProfilePage />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/checkout" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <Checkout />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/order-success" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <OrderSuccess />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/my-orders" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MyOrders />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />

                {/* Vendor-only routes */}
                <Route path="/vendor-dashboard" element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
                <Route path="/vendor-profile" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProfile /></ProtectedRoute>} />
                <Route path="/vendor/add-product" element={<ProtectedRoute allowedRoles={['vendor']}><AddProduct /></ProtectedRoute>} />
                <Route path="/vendor/product-management" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProductManagement /></ProtectedRoute>} />

                {/* Admin-only routes */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/models" element={<ProtectedRoute allowedRoles={['admin']}><AdminModelsManagement /></ProtectedRoute>} />
                <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminCategoriesManagement /></ProtectedRoute>} />
                <Route path="/admin/qualities" element={<ProtectedRoute allowedRoles={['admin']}><AdminQualitiesManagement /></ProtectedRoute>} />
                <Route path="/admin/vendor-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorManagement /></ProtectedRoute>} />
                <Route path="/admin/commission-rules" element={<ProtectedRoute allowedRoles={['admin']}><AdminCommissionRules /></ProtectedRoute>} />
                <Route path="/admin/vendor-wallets" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorWallets /></ProtectedRoute>} />
                <Route path="/admin/delivery-wallets" element={<ProtectedRoute allowedRoles={['admin']}><AdminDeliveryWallets /></ProtectedRoute>} />
                <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayoutManagement /></ProtectedRoute>} />
                <Route path="/admin/sectors" element={<ProtectedRoute allowedRoles={['admin']}><AdminSectorManagement /></ProtectedRoute>} />
                <Route path="/admin/slots" element={<ProtectedRoute allowedRoles={['admin']}><AdminSlotManagement /></ProtectedRoute>} />
                <Route path="/admin/delivery-partners" element={<ProtectedRoute allowedRoles={['admin']}><AdminDeliveryPartnerManagement /></ProtectedRoute>} />

                {/* Delivery Partner routes */}
                <Route path="/delivery-partner-dashboard" element={<ProtectedRoute allowedRoles={['delivery_partner']}><DeliveryPartnerDashboard /></ProtectedRoute>} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </PWAWrapper>
        </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

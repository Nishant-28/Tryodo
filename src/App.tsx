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
import VendorAnalytics from "./pages/VendorAnalytics";
import VendorMarketProducts from "./pages/VendorMarketProducts";
import VendorProductRequest from "./pages/VendorProductRequest";
import VendorMarketProductManagement from "./pages/VendorMarketProductManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminModelsManagement from "./pages/AdminModelsManagement";
import AdminCategoriesManagement from "./pages/AdminCategoriesManagement";
import AdminQualitiesManagement from "./pages/AdminQualitiesManagement";
import AdminMarketCategories from "./pages/AdminMarketCategories";
import AdminMarketBrands from "./pages/AdminMarketBrands";
import AdminMarketProducts from "./pages/AdminMarketProducts";
import AdminVendorRequests from "./pages/AdminVendorRequests";
import AdminMarketplaceAnalytics from "./pages/AdminMarketplaceAnalytics";
import AdminAddMarketProduct from "./pages/AdminAddMarketProduct";
import AdminEditMarketProduct from "./pages/AdminEditMarketProduct";
import AdminMarketProductDetail from "./pages/AdminMarketProductDetail";
import MarketPage from "./pages/MarketPage";
import MarketProductDetail from "./pages/MarketProductDetail";

import AdminCommissionRules from "./pages/AdminCommissionRules";
import AdminManageCommissions from "./pages/AdminManageCommissions";
import AdminVendorManagement from "./pages/AdminVendorManagement";
import AdminCustomerManagement from "./pages/AdminCustomerManagement";

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
import NotificationProvider from "@/components/NotificationProvider";
import SessionDebugger from "@/components/SessionDebugger";

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
          <NotificationProvider>
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
                <Route path="/market" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MarketPage />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/market/product/:slug" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MarketProductDetail />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/market/category/:slug" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MarketPage />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/market/brand/:slug" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MarketPage />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />
                <Route path="/market/search" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MobileCustomerLayout>
                      <MarketPage />
                    </MobileCustomerLayout>
                  </ProtectedRoute>
                } />

                {/* Vendor-only routes */}
                <Route path="/vendor-dashboard" element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
                <Route path="/vendor-profile" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProfile /></ProtectedRoute>} />
                <Route path="/vendor/analytics" element={<ProtectedRoute allowedRoles={['vendor']}><VendorAnalytics /></ProtectedRoute>} />
                <Route path="/vendor/add-product" element={<ProtectedRoute allowedRoles={['vendor']}><AddProduct /></ProtectedRoute>} />
                <Route path="/vendor/product-management" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProductManagement /></ProtectedRoute>} />
                <Route path="/vendor/market-products" element={<ProtectedRoute allowedRoles={['vendor']}><VendorMarketProducts /></ProtectedRoute>} />
                <Route path="/vendor/market-products/request/:productId" element={<ProtectedRoute allowedRoles={['vendor']}><VendorProductRequest /></ProtectedRoute>} />
                <Route path="/vendor/market-products/my-products" element={<ProtectedRoute allowedRoles={['vendor']}><VendorMarketProductManagement /></ProtectedRoute>} />
                <Route path="/vendor/market-products/requests" element={<ProtectedRoute allowedRoles={['vendor']}><VendorMarketProductManagement /></ProtectedRoute>} />
                <Route path="/vendor/market-products/manage" element={<ProtectedRoute allowedRoles={['vendor']}><VendorMarketProductManagement /></ProtectedRoute>} />

                {/* Admin-only routes */}
                <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/models" element={<ProtectedRoute allowedRoles={['admin']}><AdminModelsManagement /></ProtectedRoute>} />
                <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminCategoriesManagement /></ProtectedRoute>} />
                <Route path="/admin/qualities" element={<ProtectedRoute allowedRoles={['admin']}><AdminQualitiesManagement /></ProtectedRoute>} />
                <Route path="/admin/market/categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarketCategories /></ProtectedRoute>} />
                <Route path="/admin/market/brands" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarketBrands /></ProtectedRoute>} />
                <Route path="/admin/market/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarketProducts /></ProtectedRoute>} />
                <Route path="/admin/market/products/add" element={<ProtectedRoute allowedRoles={['admin']}><AdminAddMarketProduct /></ProtectedRoute>} />
                <Route path="/admin/market/products/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><AdminEditMarketProduct /></ProtectedRoute>} />
                <Route path="/admin/market/products/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarketProductDetail /></ProtectedRoute>} />
                <Route path="/admin/market/vendor-requests" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorRequests /></ProtectedRoute>} />
                <Route path="/admin/market/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminMarketplaceAnalytics /></ProtectedRoute>} />
                <Route path="/admin/vendor-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminVendorManagement /></ProtectedRoute>} />
                <Route path="/admin/customer-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminCustomerManagement /></ProtectedRoute>} />
                <Route path="/admin/commission-rules" element={<ProtectedRoute allowedRoles={['admin']}><AdminCommissionRules /></ProtectedRoute>} />
                <Route path="/admin/manage-commissions" element={<ProtectedRoute allowedRoles={['admin']}><AdminManageCommissions /></ProtectedRoute>} />

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
            <SessionDebugger />
          </PWAWrapper>
        </BrowserRouter>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

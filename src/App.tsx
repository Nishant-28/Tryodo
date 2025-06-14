import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import EnvironmentCheck from "@/components/EnvironmentCheck";
import Index from "./pages/Index";
import Order from "./pages/Order";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";

import VendorDashboard from "./pages/VendorDashboard";
import AddProduct from "./pages/AddProduct";
import AdminDashboard from "./pages/AdminDashboard";
import AdminModelsManagement from "./pages/AdminModelsManagement";
import AdminCategoriesManagement from "./pages/AdminCategoriesManagement";
import AdminQualitiesManagement from "./pages/AdminQualitiesManagement";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AuthDebug from "./components/AuthDebug";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EnvironmentCheck />
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* Public routes - no authentication required */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            
            {/* Role-specific login routes */}
            <Route path="/vendor-login" element={<Login />} />
            <Route path="/admin-login" element={<Login />} />

            {/* Customer-only routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/order" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Order />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/checkout" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Checkout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/order-success" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <OrderSuccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-orders" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <MyOrders />
                </ProtectedRoute>
              } 
            />

            {/* Vendor-only routes */}
            <Route 
              path="/vendor-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['vendor']}>
                  <VendorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vendor/add-product" 
              element={
                <ProtectedRoute allowedRoles={['vendor']}>
                  <AddProduct />
                </ProtectedRoute>
              } 
            />

            {/* Admin-only routes */}
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/models" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminModelsManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/categories" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCategoriesManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/qualities" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminQualitiesManagement />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

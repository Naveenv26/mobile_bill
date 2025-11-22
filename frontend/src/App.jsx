import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import SubscriptionModal from "./pages/Subscription";

// Import Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ShopSetup from "./pages/ShopSetup";
import ResetPassword from "./pages/ResetPassword"; 

// Import Components
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

// Wrapper to apply the Sidebar Layout to protected pages
const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

export default function App() {
  return (
    <SubscriptionProvider>
      {/* Toast Notifications */}
      <Toaster position="bottom-right" toastOptions={{
        duration: 4000,
        style: { background: '#333', color: '#fff' },
      }} />

      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/login" element={<Login />} />
        
        {/* Route for the link sent via email: /reset-password/uid/token */}
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* --- Protected Routes (With Sidebar) --- */}
        <Route element={<PrivateRoute><LayoutWrapper /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* --- Setup Route (Protected, No Sidebar) --- */}
        <Route path="/setup-shop" element={
          <PrivateRoute>
            <ShopSetup />
          </PrivateRoute>
        } />

        {/* Fallback for unknown URLs */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global Paywall Modal */}
      <SubscriptionModal />
      
    </SubscriptionProvider>
  );
}
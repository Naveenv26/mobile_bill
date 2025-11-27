import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider, useSubscription } from "./context/SubscriptionContext";
import SubscriptionModal from "./pages/Subscription";
import GlobalLoader from "./components/GlobalLoader";

// --- STANDARD IMPORTS (No Lazy Loading) ---
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ShopSetup from "./pages/ShopSetup";
import ResetPassword from "./pages/ResetPassword";

// Import Layout Components
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

// Wrapper to apply the Sidebar Layout to protected pages
const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const MainContent = () => {
  const { loading } = useSubscription();

  // If checking subscription/auth status, show loader
  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        <Route element={<PrivateRoute><LayoutWrapper /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/setup-shop" element={
          <PrivateRoute>
            <ShopSetup />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* Paywall Modal */}
      <SubscriptionModal />
    </>
  );
};

export default function App() {
  return (
    <SubscriptionProvider>
      <Toaster position="bottom-right" toastOptions={{
        duration: 4000,
        style: { background: '#1e293b', color: '#fff', borderRadius: '12px' },
      }} />
      <MainContent />
    </SubscriptionProvider>
  );
}
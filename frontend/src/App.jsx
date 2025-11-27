import React, { Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider, useSubscription } from "./context/SubscriptionContext";
import SubscriptionModal from "./pages/Subscription";
import GlobalLoader from "./components/GlobalLoader";

// --- LAZY IMPORT PAGES ---
const Login = React.lazy(() => import("./pages/Login"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Billing = React.lazy(() => import("./pages/Billing"));
const Stock = React.lazy(() => import("./pages/Stock"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Settings = React.lazy(() => import("./pages/Settings"));
const ShopSetup = React.lazy(() => import("./pages/ShopSetup"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

// Import Layout Components (Keep these eager or lazy, eager is usually fine for layout)
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
    // Suspense handles the loading state while fetching the Lazy chunks
    <Suspense fallback={<GlobalLoader />}>
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
    </Suspense>
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
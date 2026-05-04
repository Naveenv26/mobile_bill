// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider, useSubscription } from "./context/SubscriptionContext";
import SubscriptionModal from "./pages/Subscription";
import GlobalLoader from "./components/GlobalLoader";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ShopSetup from "./pages/ShopSetup";
import ResetPassword from "./pages/ResetPassword";
import AdminOTPLogs from "./pages/AdminOTPLogs";

import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

// ============================================================
// Blocks a route if subscription is expired/invalid.
// Shows a friendly message instead of the page.
// Used ONLY for Billing and Stock — everything else is accessible.
// ============================================================
const SubscriptionGuard = ({ children }) => {
  const { isSubscribed, loading, openModal, subscription } = useSubscription();

  if (loading) return <GlobalLoader />;

  // Allow access during trial too
  const hasAccess =
    isSubscribed ||
    subscription?.allowed_by_admin ||
    (subscription?.is_trial && subscription?.days_remaining > 0);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Subscription Required
          </h2>
          <p className="text-slate-500 mb-6">
            Your subscription has expired. Please renew to access Billing and
            Inventory features.
          </p>
          <button
            onClick={openModal}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// ============================================================
// Inner layout — subscription is fully loaded here since
// SubscriptionProvider only mounts after PrivateRoute passes.
// ============================================================
const ProtectedLayout = () => {
  const { loading } = useSubscription();

  if (loading) return <GlobalLoader />;

  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
      {/* Paywall modal — renders on top of any protected page */}
      <SubscriptionModal />
    </>
  );
};

export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />

      <Routes>
        {/* ── Public routes — NO subscription check here ── */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/reset-password/:uid/:token"
          element={<ResetPassword />}
        />

        {/* ── Protected routes — SubscriptionProvider ONLY loads here ── */}
        <Route
          element={
            <PrivateRoute>
              <SubscriptionProvider>
                <ProtectedLayout />
              </SubscriptionProvider>
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Always accessible after login */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin-otp" element={<AdminOTPLogs />} />

          {/* Subscription required */}
          <Route
            path="/billing"
            element={
              <SubscriptionGuard>
                <Billing />
              </SubscriptionGuard>
            }
          />
          <Route
            path="/stock"
            element={
              <SubscriptionGuard>
                <Stock />
              </SubscriptionGuard>
            }
          />
        </Route>

        {/* Shop setup — private but no subscription needed */}
        <Route
          path="/setup-shop"
          element={
            <PrivateRoute>
              <ShopSetup />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
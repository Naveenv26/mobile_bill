// frontend/src/context/SubscriptionContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import client from "../api/axios";
import { toast } from "react-hot-toast";

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── This provider only mounts inside PrivateRoute, so the user
  //    is guaranteed to be logged in. No token check needed here.
  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/payments/subscription-status/");

      setSubscription(data.subscription);
      setIsSubscribed(data.is_valid);

      // Auto-open paywall if subscription not valid
      if (!data.is_valid) {
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Subscription check failed:", err);

      // 401 is handled by axios interceptor (redirects to login)
      // 403 means subscription expired — force paywall
      if (err.response?.status === 403) {
        setIsSubscribed(false);
        setSubscription(null);
        setIsModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once on mount — user is already logged in at this point
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ── Modal open/close ──
  const openModal = () => setIsModalOpen(true);

  const closeModal = () => {
    const isOnTrial =
      subscription?.is_trial && subscription?.days_remaining > 0;
    const hasAdminOverride = subscription?.allowed_by_admin;

    if (isSubscribed || isOnTrial || hasAdminOverride) {
      setIsModalOpen(false);
    } else {
      toast.error("Please subscribe or start your free trial to continue.");
    }
  };

  // ── Feature check ──
  // Since we have a single PRO plan with all features included,
  // this simply returns whether the subscription is valid.
  const hasFeature = useCallback(
    (featureName) => {
      if (loading || !subscription) return false;
      if (subscription.allowed_by_admin) return true;

      // If subscription is valid, all features are included
      if (isSubscribed) return true;

      // Trial also gets full access
      if (subscription.is_trial && subscription.days_remaining > 0) return true;

      return false;
    },
    [subscription, isSubscribed, loading]
  );

  // ── Derived helpers ──
  const isOnTrial =
    subscription?.is_trial && (subscription?.days_remaining ?? 0) > 0;

  const daysRemaining = subscription?.days_remaining ?? 0;

  const subscriptionStatus = subscription
    ? isSubscribed
      ? "active"
      : isOnTrial
        ? "trial"
        : "expired"
    : "none";

  const value = {
    // State
    isModalOpen,
    subscription,
    isSubscribed,
    loading,

    // Derived
    isOnTrial,
    daysRemaining,
    subscriptionStatus, // 'active' | 'trial' | 'expired' | 'none'

    // Actions
    openModal,
    closeModal,
    hasFeature,
    refetchSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
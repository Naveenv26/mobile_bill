// frontend/src/pages/Subscription.jsx
import React, { useEffect, useState } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import {
    createRazorpayOrder,
    verifyRazorpayPayment,
    startFreeTrial,
} from "../api/payments";
import useRazorpay from "../hooks/useRazorpay";
import {
    Check,
    X,
    Star,
    TrendingUp,
    Loader2,
    ShieldCheck,
    Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";

// ── Feature list for our single PRO plan ──
const ALL_FEATURES = [
    "Dashboard & Analytics",
    "Billing & Invoice Generation",
    "PDF Invoice Download",
    "WhatsApp Invoice Sharing",
    "Stock & Inventory Management",
    "Low Stock Alerts",
    "Customer Management",
    "Loyalty Points System",
    "Sales Reports",
    "CSV Product Import",
    "Multi-staff Access",
    "Tax Profile Management",
];

const FREE_FEATURES = [
    "Dashboard & Analytics",
    "Billing & Invoice Generation",
    "Stock & Inventory Management",
    "Customer Management",
    "Sales Reports",
];

// ── Single feature row ──
const Feature = ({ text, included }) => (
    <li className="flex items-center gap-2">
        {included ? (
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
            <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
        )}
        <span className={`text-sm ${included ? "text-gray-800" : "text-gray-400"}`}>
            {text}
        </span>
    </li>
);

const SubscriptionModal = () => {
    const {
        isModalOpen,
        closeModal,
        subscription,
        isSubscribed,
        isOnTrial,
        daysRemaining,
        refetchSubscription,
    } = useSubscription();

    const [isProcessing, setIsProcessing] = useState(false);
    const isRazorpayLoaded = useRazorpay();

    const trialUsed = subscription?.trial_used ?? false;
    const isExpired = !isSubscribed && !isOnTrial;

    // ── Start free trial ──
    const handleStartTrial = async () => {
        if (trialUsed) {
            toast.error("Your free trial has already been used.");
            return;
        }
        setIsProcessing(true);
        try {
            await startFreeTrial();
            toast.success("Your 30-day free trial is now active!");
            await refetchSubscription();
            closeModal();
        } catch (err) {
            console.error("Trial start failed:", err);
            toast.error(err.response?.data?.error || "Failed to start trial.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Subscribe with Razorpay ──
    const handleSubscribe = async () => {
        if (!isRazorpayLoaded) {
            toast.error("Payment gateway is still loading. Please try again.");
            return;
        }

        setIsProcessing(true);
        try {
            // We only have one PRO plan — backend picks it by plan_type
            // Pass plan_id=null and let backend find the active PRO plan,
            // OR fetch plan list first. Here we fetch to get the ID.
            const plansRes = await import("../api/payments").then((m) =>
                m.getSubscriptionPlans()
            );
            const proPlan = plansRes.find((p) => p.plan_type === "PRO" && p.is_active);

            if (!proPlan) {
                toast.error("No active plan found. Please contact support.");
                setIsProcessing(false);
                return;
            }

            const orderData = await createRazorpayOrder(proPlan.id);
            if (!orderData?.order_id) throw new Error("Failed to create order");

            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "SmartBill",
                description: "Pro Monthly Subscription — ₹300/month",
                order_id: orderData.order_id,
                handler: async (response) => {
                    try {
                        await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        toast.success("Payment successful! Subscription activated.");
                        await refetchSubscription();
                        closeModal();
                    } catch (err) {
                        console.error("Verification failed:", err);
                        toast.error("Payment verification failed. Please contact support.");
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: orderData.user_name || "",
                    email: orderData.user_email || "",
                },
                theme: { color: "#4f46e5" },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                        toast("Payment cancelled.", { icon: "ℹ️" });
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("Order creation failed:", err);
            toast.error(err.response?.data?.error || "Failed to initiate payment.");
            setIsProcessing(false);
        }
    };

    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto relative">

                {/* Close button — only shows if user has active access */}
                {(isSubscribed || isOnTrial) && (
                    <button
                        onClick={closeModal}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                    >
                        <X size={22} />
                    </button>
                )}

                {/* Header */}
                <div className="text-center p-8 pb-4">
                    <h1 className="text-3xl font-bold text-slate-900">SmartBill Plans</h1>
                    <p className="text-slate-500 mt-2">
                        Start free, upgrade anytime. Cancel anytime.
                    </p>

                    {/* Status banner */}
                    {isOnTrial && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold border border-blue-200">
                            <Clock className="w-4 h-4" />
                            Free trial active — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                        </div>
                    )}
                    {isExpired && !isOnTrial && trialUsed && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-semibold border border-red-200">
                            Your subscription has expired. Renew to continue.
                        </div>
                    )}
                    {isSubscribed && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold border border-green-200">
                            <ShieldCheck className="w-4 h-4" />
                            Pro plan active — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                        </div>
                    )}
                </div>

                {/* Plans */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-4">

                    {/* ── FREE TRIAL CARD ── */}
                    <div className="border-2 border-gray-200 rounded-2xl p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-200 rounded-xl">
                                <Star className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Free Trial</h3>
                                <p className="text-sm text-gray-500">30 days, no card needed</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                            <span className="text-gray-500 text-sm ml-2">for 30 days</span>
                        </div>

                        <ul className="space-y-2 mb-8">
                            {ALL_FEATURES.map((f) => (
                                <Feature
                                    key={f}
                                    text={f}
                                    included={FREE_FEATURES.includes(f)}
                                />
                            ))}
                        </ul>

                        <button
                            onClick={handleStartTrial}
                            disabled={trialUsed || isProcessing || isSubscribed}
                            className="w-full py-3 rounded-xl font-bold text-white transition disabled:cursor-not-allowed
                bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300"
                        >
                            {isProcessing
                                ? "Starting..."
                                : trialUsed
                                    ? "Trial Already Used"
                                    : isSubscribed
                                        ? "Subscribed"
                                        : "Start Free Trial"}
                        </button>
                    </div>

                    {/* ── PRO PLAN CARD ── */}
                    <div className="border-2 border-indigo-500 rounded-2xl p-6 bg-indigo-50 relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-indigo-600 text-white px-4 py-1 text-xs font-bold rounded-full shadow">
                                RECOMMENDED
                            </span>
                        </div>

                        {isSubscribed && (
                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Active
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Pro</h3>
                                <p className="text-sm text-indigo-600 font-medium">All features included</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-gray-900">₹300</span>
                            <span className="text-gray-500 text-sm ml-2">/ month</span>
                        </div>

                        <ul className="space-y-2 mb-8">
                            {ALL_FEATURES.map((f) => (
                                <Feature key={f} text={f} included={true} />
                            ))}
                        </ul>

                        <button
                            onClick={handleSubscribe}
                            disabled={isSubscribed || isProcessing}
                            className="w-full py-3 rounded-xl font-bold text-white transition disabled:cursor-not-allowed
                bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 shadow-lg shadow-indigo-200"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin w-4 h-4" />
                                    Processing...
                                </span>
                            ) : isSubscribed ? (
                                "Current Plan"
                            ) : (
                                "Subscribe Now — ₹300/month"
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 pb-6">
                    Payments secured by Razorpay. Cancel anytime by not renewing.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionModal;
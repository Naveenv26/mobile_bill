// frontend/src/pages/Subscription.jsx
import React, { useState } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import {
    createRazorpayOrder,
    verifyRazorpayPayment,
    startFreeTrial,
    getSubscriptionPlans,
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
    CalendarDays,
    Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";

// ── All features — shown on BOTH cards ──────────────────────
const ALL_FEATURES = [
    "Dashboard & Analytics",
    "Billing & Invoice Generation",
    "PDF Invoice Download",
    "WhatsApp Invoice Sharing",
    "Stock & Inventory Management",
    "Low Stock Alerts",
    "Customer Management",
    "Sales Reports",
    "CSV Product Import",
    "Multi-staff Access",
    "Tax Profile Management",
];

// Features NOT included in paid PRO (all included in trial too)
const PRO_EXCLUDED = [];

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

// ── Validity badge shown when user has active subscription ───
const ValidityBadge = ({ label, date, daysRemaining, color }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${color} mb-2`}>
        <CalendarDays className="w-5 h-5 flex-shrink-0" />
        <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
            <p className="text-sm font-extrabold">
                Valid till {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                <span className="ml-2 opacity-70">({daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left)</span>
            </p>
        </div>
    </div>
);

// ── Main Modal ───────────────────────────────────────────────
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
    const { isLoaded: isRazorpayLoaded, load: loadRazorpay } = useRazorpay();

    const trialUsed    = subscription?.trial_used ?? false;
    const isExpired    = !isSubscribed && !isOnTrial;
    const canClose     = isSubscribed || isOnTrial;

    // Current validity end date
    const validUntil   = subscription?.end_date || subscription?.trial_end_date || null;

    // ── Start free trial ────────────────────────────────────
    const handleStartTrial = async () => {
        if (trialUsed) { toast.error("Free trial already used."); return; }
        setIsProcessing(true);
        try {
            await startFreeTrial();
            toast.success("🎉 Your 30-day free trial is now active! All features unlocked.");
            await refetchSubscription();
            closeModal();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to start trial.");
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Subscribe / Extend ──────────────────────────────────
    const handleSubscribe = async () => {
        setIsProcessing(true);
        const ready = isRazorpayLoaded || await loadRazorpay();
        if (!ready) {
            toast.error("Payment gateway failed to load. Please try again.");
            setIsProcessing(false);
            return;
        }

        try {
            const plans   = await getSubscriptionPlans();
            const proPlan = plans.find((p) => p.plan_type === "PRO" && p.is_active);

            if (!proPlan) {
                toast.error("No active plan found. Please contact support.");
                setIsProcessing(false);
                return;
            }

            const orderData = await createRazorpayOrder(proPlan.id);
            if (!orderData?.order_id) throw new Error("Failed to create order");

            // Show what the user is getting
            const extendMsg = isSubscribed
                ? `Extends your plan by 30 days (new expiry: ${new Date(
                    new Date(validUntil).getTime() + 30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })})`
                : "Pro Monthly Subscription — ₹300/month";

            const options = {
                key:         orderData.key,
                amount:      orderData.amount,
                currency:    orderData.currency,
                name:        "SparkBill",
                description: extendMsg,
                order_id:    orderData.order_id,
                handler: async (response) => {
                    try {
                        await verifyRazorpayPayment({
                            razorpay_order_id:   response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature:  response.razorpay_signature,
                        });
                        toast.success(isSubscribed
                            ? "✅ Subscription extended by 30 days!"
                            : "✅ Payment successful! Subscription activated."
                        );
                        await refetchSubscription();
                        closeModal();
                    } catch  {
                        toast.error("Payment verification failed. Please contact support.");
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name:  orderData.user_name  || "",
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

                {/* Close — only if user has access */}
                {canClose && (
                    <button
                        onClick={closeModal}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition z-10"
                    >
                        <X size={22} />
                    </button>
                )}

                {/* Header */}
                <div className="text-center px-8 pt-8 pb-4">
                    <div className="flex justify-center mb-2">
    <img src="/sparkbill-logo.png" alt="SparkBill" className="h-10 w-auto object-contain" />
</div>
<h1 className="text-3xl font-bold text-slate-900">SparkBill Plans</h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Start free — all features unlocked during trial. Upgrade anytime.
                    </p>

                    {/* Status banners */}
                    {isOnTrial && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold border border-blue-200">
                            <Clock className="w-4 h-4" />
                            Free trial active — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                        </div>
                    )}
                    {isSubscribed && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold border border-green-200">
                            <ShieldCheck className="w-4 h-4" />
                            Pro active — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                        </div>
                    )}
                    {isExpired && trialUsed && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-semibold border border-red-200">
                            ⚠ Subscription expired — renew to continue
                        </div>
                    )}
                </div>

                {/* Current validity — shown when active */}
                {(isSubscribed || isOnTrial) && validUntil && (
                    <div className="px-8 pb-2">
                        <ValidityBadge
                            label={isOnTrial ? "Trial Validity" : "Current Plan Validity"}
                            date={validUntil}
                            daysRemaining={daysRemaining}
                            color={isOnTrial
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : "bg-green-50 border-green-200 text-green-800"
                            }
                        />
                        {isSubscribed && (
                            <p className="text-xs text-slate-400 text-center mt-1">
                                Paying again will extend your plan by 30 more days from current expiry
                            </p>
                        )}
                    </div>
                )}

                {/* Plan cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-4">

                    {/* ── FREE TRIAL CARD ── */}
                    <div className="border-2 border-gray-200 rounded-2xl p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-xl">
                                <Star className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Free Trial</h3>
                                <p className="text-sm text-gray-500">30 days · No card needed</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                            <span className="text-gray-500 text-sm ml-2">for 30 days</span>
                        </div>

                        {/* ✅ Trial unlocks EVERYTHING */}
                        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs font-bold text-amber-700">
                                All features unlocked during trial — nothing held back
                            </p>
                        </div>

                        <ul className="space-y-2 mb-8">
                            {ALL_FEATURES.map((f) => (
                                <Feature key={f} text={f} included={true} />
                            ))}
                        </ul>

                        <button
                            onClick={handleStartTrial}
                            disabled={trialUsed || isProcessing}
                            className="w-full py-3 rounded-xl font-bold text-white transition disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300"
                        >
                            {isProcessing
                                ? "Starting..."
                                : trialUsed
                                    ? "Trial Already Used"
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
                                <ShieldCheck className="w-3 h-3" /> Active
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Pro</h3>
                                <p className="text-sm text-indigo-600 font-medium">All features · Priority support</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <span className="text-4xl font-extrabold text-gray-900">₹300</span>
                            <span className="text-gray-500 text-sm ml-2">/ month</span>
                        </div>

                        {/* Show what extension will look like */}
                        {isSubscribed && validUntil && (
                            <div className="mb-4 bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-2">
                                <p className="text-xs font-bold text-indigo-700">
                                    ➕ Pay now → extends to{" "}
                                    {new Date(
                                        new Date(validUntil).getTime() + 30 * 24 * 60 * 60 * 1000
                                    ).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>
                        )}

                        <ul className="space-y-2 mb-8">
                            {ALL_FEATURES.map((f) => (
                                <Feature key={f} text={f} included={!PRO_EXCLUDED.includes(f)} />
                            ))}
                        </ul>

                        {/* ✅ Never disabled — always allow payment */}
                        <button
                            onClick={handleSubscribe}
                            disabled={isProcessing}
                            className="w-full py-3 rounded-xl font-bold text-white transition disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 shadow-lg shadow-indigo-200"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="animate-spin w-4 h-4" />
                                    Processing...
                                </span>
                            ) : isSubscribed ? (
                                "Extend by 30 Days — ₹300"
                            ) : (
                                "Subscribe Now — ₹300/month"
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 pb-6">
                    Payments secured by Razorpay · No auto-renewal · Manual renewal only
                </p>
            </div>
        </div>
    );
};

export default SubscriptionModal;
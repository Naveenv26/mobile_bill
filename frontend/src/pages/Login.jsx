import React, { useState } from "react";
import { login, registerUser, forgotPassword } from "../api/auth";
import { toast } from "react-hot-toast";

export default function Login() {
  const [view, setView] = useState("login"); // 'login', 'signup', 'forgot'
  const [step, setStep] = useState(1); // For multi-step signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Form data state
  const [form, setForm] = useState({
    email: "",
    password: "",
    shopName: "",
    shopAddress: "",
    mobile: "",
    gstin: "",
  });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // Helper to extract error messages from Django API
  const getErrorMessage = (err) => {
    if (err.response && err.response.data) {
      const data = err.response.data;
      // If backend returns { detail: "error" }
      if (data.detail) return data.detail;
      // If backend returns { email: ["Invalid email"] }
      const firstKey = Object.keys(data)[0];
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`;
      }
      // If backend returns { error: "msg" }
      if (data.error) return data.error;
    }
    return "An unexpected error occurred. Please check your connection.";
  };

  // ---------- LOGIN ----------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      window.location.href = "/dashboard"; // Hard reload to ensure clean state
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- SIGNUP (Step 1) ----------
  const handleSignupStep1 = (e) => {
    e.preventDefault();
    // Basic password validation
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError("");
    setStep(2);
  };

  // ---------- SIGNUP (Step 2) ----------
  const handleSignupStep2 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerUser(form);
      toast.success("Account created! Please log in.");
      setView("login");
      setMessage("Registration successful! Please log in.");
    } catch (err) {
      console.error("Signup error:", err);
      setError(getErrorMessage(err)); // Show specific error from backend
    } finally {
      setLoading(false);
    }
  };

  // ---------- FORGOT PASSWORD ----------
  const handleSendLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await forgotPassword(form.email);
      // Even if email doesn't exist, security best practice is to show success
      setMessage("If that email exists, a reset link has been sent to it.");
      toast.success("Link sent!");
    } catch (err) {
      console.error("Forgot password error:", err);
      // 500 errors usually land here
      if (err.response && err.response.status === 500) {
        setError("Server error. Please contact support.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- RENDER UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Smart<span className="text-indigo-600">Bill</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            {view === "login" && "Login to manage your shop"}
            {view === "signup" && "Create your shop account"}
            {view === "forgot" && "Reset your password"}
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm font-semibold rounded-lg border border-green-100 text-center">
            {message}
          </div>
        )}

        {/* === LOGIN VIEW === */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setError(""); setMessage(""); }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            <button
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <div className="text-center mt-6">
              <span className="text-slate-500 text-sm">New here? </span>
              <button
                type="button"
                onClick={() => { setView("signup"); setStep(1); setError(""); setMessage(""); }}
                className="text-indigo-600 font-bold text-sm hover:underline"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* === SIGNUP VIEW === */}
        {view === "signup" && (
          <>
            {step === 1 ? (
              <form onSubmit={handleSignupStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Create Password</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Minimum 8 characters</p>
                </div>
                <button className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-[0.98]">
                  Continue
                </button>
                <button type="button" onClick={() => setView("login")} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupStep2} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Name</label>
                  <input
                    name="shopName"
                    value={form.shopName}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                    <input
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GSTIN (Optional)</label>
                    <input
                      name="gstin"
                      value={form.gstin}
                      onChange={handleChange}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Address</label>
                  <textarea
                    name="shopAddress"
                    value={form.shopAddress}
                    onChange={handleChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                    Back
                  </button>
                  <button disabled={loading} className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70">
                    {loading ? "Creating..." : "Complete Setup"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* === FORGOT PASSWORD VIEW === */}
        {view === "forgot" && (
          <form onSubmit={handleSendLink} className="space-y-4">
             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-sm mb-4">
                Enter your email address. We will send you a link to reset your password.
             </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registered Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => setView("login")} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
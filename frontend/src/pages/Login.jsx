import React, { useState } from "react";
import { login, registerUser, forgotPassword, sendOTP, verifyOTP } from "../api/auth";
import { toast } from "react-hot-toast";

export default function Login() {
  const [view, setView] = useState("login"); // 'login', 'signup', 'forgot'
  const [step, setStep] = useState(1); // For multi-step signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otp, setOtp] = useState("");

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

  // ---------- OTP HANDLERS ----------
  const handleSendOTP = async () => {
    if (form.mobile.length !== 10) return;
    setOtpLoading(true);
    setError("");
    try {
      // Mocking successful send and auto-verifying since SMS plan is on hold
      setOtpSent(true);
      setOtpVerified(true); 
      toast.success("Mobile number accepted (SMS Verification Bypassed)");
    } catch (err) {
      toast.error("Failed to process mobile number.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    try {
      await verifyOTP(form.mobile, otp);
      setOtpVerified(true);
      toast.success("Mobile verified!");
    } catch (err) {
      toast.error("Invalid OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

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
  const validatePassword = (pwd) => {
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const handleSignupStep1 = (e) => {
    e.preventDefault();
    const v = validatePassword(form.password);
    if (!v.length || !v.upper || !v.lower || !v.number || !v.symbol) {
      setError("Please meet all password requirements.");
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
  const pwdStatus = validatePassword(form.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            <img src="/sparkbill-logo.png" alt="SparkBill" className="h-10 w-auto object-contain mx-auto" />
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
                    placeholder="Owner's email"
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
                    placeholder="Strong password"
                    required
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "8+ Characters", met: pwdStatus.length },
                      { label: "Uppercase (A)", met: pwdStatus.upper },
                      { label: "Lowercase (a)", met: pwdStatus.lower },
                      { label: "Number (1)", met: pwdStatus.number },
                      { label: "Symbol (@)", met: pwdStatus.symbol },
                    ].map((req, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[10px] font-bold ${req.met ? "text-green-600" : "text-slate-400"}`}>
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${req.met ? "bg-green-100 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                          {req.met && <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                        </div>
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-[0.98] mt-4">
                  Continue
                </button>
                <button type="button" onClick={() => setView("login")} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupStep2} className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Shop Details</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Name</label>
                      <input
                        name="shopName"
                        value={form.shopName}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. Spark Enterprises"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">10-Digit Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            name="mobile"
                            type="tel"
                            maxLength="10"
                            value={form.mobile}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setForm(p => ({ ...p, mobile: val }));
                            }}
                            disabled={otpVerified}
                            className={`w-full p-3 bg-white border ${otpVerified ? "border-green-500 bg-green-50" : "border-slate-200"} rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-colors`}
                            placeholder="9876543210"
                            required
                          />
                          {otpVerified && <span className="absolute right-3 top-3 text-green-600 font-bold text-xs flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> Verified</span>}
                        </div>
                        {!otpVerified && (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={form.mobile.length !== 10 || otpLoading}
                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                          >
                            {otpSent ? "Resend" : "Send OTP"}
                          </button>
                        )}
                      </div>
                    </div>

                    {otpSent && !otpVerified && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enter 6-Digit OTP</label>
                        <div className="flex gap-2">
                          <input
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.substring(0,6))}
                            className="flex-1 p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold tracking-[0.5em] text-lg"
                            placeholder="000000"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={otp.length !== 6 || otpLoading}
                            className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Address</label>
                      <textarea
                        name="shopAddress"
                        value={form.shopAddress}
                        onChange={handleChange}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none text-sm"
                        placeholder="Full business address"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">
                    Back
                  </button>
                  <button disabled={loading || !otpVerified} className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed">
                    {loading ? "Registering..." : "Complete Setup"}
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
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { toast } from "react-hot-toast";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd) => {
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const pwdStatus = validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validatePassword(password);
    if (!v.length || !v.upper || !v.lower || !v.number || !v.symbol) {
      return toast.error("Please meet all password requirements.");
    }
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    
    setLoading(true);
    try {
      await resetPassword(uid, token, password, confirmPassword);
      toast.success("Password changed successfully!");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Link expired or invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">New Password</h1>
          <p className="text-sm text-slate-500 font-medium">Create a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enter New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {[
                { label: "8+ Characters", met: pwdStatus.length },
                { label: "Uppercase (A)", met: pwdStatus.upper },
                { label: "Lowercase (a)", met: pwdStatus.lower },
                { label: "Number (1)", met: pwdStatus.number },
                { label: "Symbol (@)", met: pwdStatus.symbol },
              ].map((req, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-[10px] font-bold ${req.met ? "text-green-600" : "text-slate-400"}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${req.met ? "bg-green-100 border-green-200" : "bg-white border-slate-200"}`}>
                    {req.met && <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                  </div>
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-[0.98] disabled:opacity-70 mt-2 shadow-xl shadow-slate-200"
          >
            {loading ? "Updating Password..." : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
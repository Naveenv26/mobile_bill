// frontend/src/pages/settings/ProfileSettings.jsx
import React, { useState, useEffect } from "react";
import axios, { getErrorMessage } from "../../api/axios";
import { toast } from "react-hot-toast";

export default function ProfileSettings({ shop }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shop) {
      setForm(shop);
    }
  }, [shop]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.id) return;
    setLoading(true);
    
    try {
      const res = await axios.put(`/shops/${form.id}/`, form);
      
      // Update localStorage to keep sidebar in sync immediately
      localStorage.setItem("shop", JSON.stringify(res.data));
      
      // --- NEW: Dispatch Event for Instant Update in Layout/Billing ---
      window.dispatchEvent(new Event('shop-updated'));
      
      toast.success("Shop profile updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err)); // Use specific error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Shop Identity Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 overflow-hidden">
             {form.logo ? (
                 <img src={form.logo} alt="Shop Logo" className="w-full h-full object-cover" />
             ) : (
                 <span className="text-3xl">🏪</span>
             )}
          </div>
          {/* Note: Actual image upload requires multipart/form-data logic on backend */}
          <button className="absolute bottom-0 right-0 bg-sky-500 text-white p-1.5 rounded-full shadow-md hover:bg-sky-600 transition-colors" title="Upload Logo (Coming Soon)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{form.name || "Shop Name"}</h2>
              <p className="text-sm text-slate-500">Shop ID: <span className="font-mono bg-slate-100 px-1 rounded">{form.id || "..."}</span></p>
            </div>
            {!editing && (
              <button 
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-lg transition-colors"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Details Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Business Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Name</label>
            <input 
              type="text" 
              name="name" 
              value={form.name || ""} 
              onChange={handleChange} 
              disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
            />
          </div>

          {/* GST */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST Number</label>
            <input 
              type="text" 
              name="gstin" 
              value={form.gstin || ""} 
              onChange={handleChange} 
              disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Email</label>
            <input 
              type="email" 
              name="contact_email" 
              value={form.contact_email || ""} 
              onChange={handleChange} 
              disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
            <input 
              type="text" 
              name="contact_phone" 
              value={form.contact_phone || ""} 
              onChange={handleChange} 
              disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
            />
          </div>

          {/* Address (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
            <textarea 
              name="address" 
              rows="3"
              value={form.address || ""} 
              onChange={handleChange} 
              disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900"
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        {editing && (
          <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              onClick={() => {
                setEditing(false);
                setForm(shop);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
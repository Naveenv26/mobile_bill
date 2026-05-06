// frontend/src/pages/settings/ProfileSettings.jsx
import React, { useState, useEffect } from "react";
import axios, { getErrorMessage } from "../../api/axios";
import { toast } from "react-hot-toast";

export default function ProfileSettings({ shop }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  // ── Populate form when shop prop arrives ──
  useEffect(() => {
    if (shop) {
      setForm(shop);
      setLogoPreview(shop.config?.logo_base64 || null);
    }
  }, [shop]);

  // ── Read file, compress, and convert to base64 ──
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300; 
        const scale = Math.min(MAX_WIDTH / img.width, 1);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL("image/png", 0.8);
        
        setLogoPreview(compressedBase64);
        setForm((prev) => ({
          ...prev,
          config: { ...(prev.config || {}), logo_base64: compressedBase64 },
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setForm((prev) => ({
      ...prev,
      config: { ...(prev.config || {}), logo_base64: null },
    }));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!form.id) return;
    setLoading(true);
    try {
      const res = await axios.put(`/shops/${form.id}/`, form);
      localStorage.setItem("shop", JSON.stringify(res.data));
      window.dispatchEvent(new Event("shop-updated"));
      toast.success("Shop profile updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Shop Identity Card & Logo ── */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center gap-6 text-center md:text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -translate-y-16 translate-x-16 blur-3xl opacity-50 pointer-events-none" />
        
        {/* Logo preview + Upload */}
        <div className="relative group flex-shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-sky-400 group-hover:bg-sky-50/50">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Shop Logo"
                className="w-full h-full object-contain p-2"
                onError={() => setLogoPreview(null)}
              />
            ) : (
              <span className="text-4xl">🏪</span>
            )}
            
            {/* Overlay for upload */}
            <label className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
          {logoPreview && (
            <button
              onClick={removeLogo}
              className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-all z-20"
              title="Remove Logo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full relative z-10">
          <div className="flex flex-col items-center md:flex-row md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tight">{form.name || "Shop Name"}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shop ID:</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">{form.id || "..."}</span>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 md:flex-none text-sm font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-6 py-2.5 rounded-2xl transition-all shadow-sm shadow-sky-100"
                >
                  Edit Details
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditing(false); setForm(shop); }} className="flex-1 md:flex-none text-sm font-bold text-slate-500 px-6 py-2.5 rounded-2xl hover:bg-slate-50">Cancel</button>
                  <button onClick={handleSave} disabled={loading} className="flex-1 md:flex-none text-sm font-bold bg-slate-900 text-white px-6 py-2.5 rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20">{loading ? "Saving..." : "Save All"}</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ── Business Information Form ── */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6">Business Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Shop Name</label>
            <input type="text" name="name" value={form.name || ""} onChange={handleChange} disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST Number</label>
            <input type="text" name="gstin" value={form.gstin || ""} onChange={handleChange} disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Email</label>
            <input type="email" name="contact_email" value={form.contact_email || ""} onChange={handleChange} disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
            <input type="text" name="contact_phone" value={form.contact_phone || ""} onChange={handleChange} disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
            <textarea name="address" rows="3" value={form.address || ""} onChange={handleChange} disabled={!editing}
              className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900" />
          </div>
        </div>

        {editing && (
          <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button onClick={() => { setEditing(false); setForm(shop); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-50">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

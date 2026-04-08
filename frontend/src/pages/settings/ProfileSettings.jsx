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

      {/* ── Shop Identity Card ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">

        {/* Logo preview */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Shop Logo"
                className="w-full h-full object-contain p-1"
                onError={() => setLogoPreview(null)}
              />
            ) : (
              <span className="text-3xl">🏪</span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{form.name || "Shop Name"}</h2>
              <p className="text-sm text-slate-500">
                Shop ID: <span className="font-mono bg-slate-100 px-1 rounded">{form.id || "..."}</span>
              </p>
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

    {/* ── File Upload Section ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Shop Logo</h3>
        <p className="text-xs text-slate-400 mb-4">Select an image from your device.</p>

        <div className="flex gap-4 items-start">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
          />

          {logoPreview && (
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
              <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
            </div>
          )}
        </div>

        {logoPreview && (
          <button
            onClick={removeLogo}
            className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Remove logo
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Logo"}
          </button>
        </div>
      </div>

      {/* ── Business Information Form ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Business Information</h3>

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

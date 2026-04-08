// frontend/src/pages/settings/ProfileSettings.jsx
import React, { useState, useEffect, useRef } from "react";
import axios, { getErrorMessage } from "../../api/axios";
import { toast } from "react-hot-toast";

// ── Logo cache key per shop ──────────────────────────────────────────────────
const logoCacheKey = (shopId) => `logo_cache_${shopId}`;

// ── Convert an image URL to base64 (for PDF use) and cache it ───────────────
export const getLogoBase64 = async (shopId, logoUrl) => {
  if (!logoUrl || !shopId) return null;

  // Return from cache if available and url hasn't changed
  try {
    const cached = JSON.parse(localStorage.getItem(logoCacheKey(shopId)) || "null");
    if (cached && cached.url === logoUrl) return cached.base64;
  } catch { /* ignore */ }

  // Fetch and convert
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        try {
          localStorage.setItem(logoCacheKey(shopId), JSON.stringify({ url: logoUrl, base64 }));
        } catch { /* storage full — skip cache */ }
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export default function ProfileSettings({ shop }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoPreview, setLogoPreview]   = useState(null); // base64 or url for <img>
  const [logoLoading, setLogoLoading]   = useState(false);
  const debounceRef = useRef(null);

  // ── Populate form when shop prop arrives ──
  useEffect(() => {
    if (shop) {
      setForm(shop);
      const savedUrl = shop.config?.logo_url || "";
      setLogoUrlInput(savedUrl);
      // Set preview immediately from cache if available, else from url
      if (savedUrl) {
        try {
          const cached = JSON.parse(localStorage.getItem(logoCacheKey(shop.id)) || "null");
          if (cached && cached.url === savedUrl) {
            setLogoPreview(cached.base64);
          } else {
            setLogoPreview(savedUrl); // show directly, browser handles CORS
          }
        } catch {
          setLogoPreview(savedUrl);
        }
      }
    }
  }, [shop]);

  // ── Debounce URL input → validate + cache on change ──
  const handleLogoUrlChange = (e) => {
    const url = e.target.value.trim();
    setLogoUrlInput(url);
    setLogoPreview(null);

    clearTimeout(debounceRef.current);
    if (!url) return;

    debounceRef.current = setTimeout(async () => {
      setLogoLoading(true);
      try {
        // Try to cache it (will work for direct image links)
        const base64 = await getLogoBase64(shop?.id, url);
        if (base64) {
          setLogoPreview(base64);
        } else {
          // Fallback — show url directly (CORS-blocked but still visible in browser)
          setLogoPreview(url);
        }
        // Store url in form config
        setForm((prev) => ({
          ...prev,
          config: { ...(prev.config || {}), logo_url: url },
        }));
      } catch {
        toast.error("Could not load that image URL.");
      } finally {
        setLogoLoading(false);
      }
    }, 700);
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
            {logoLoading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin" />
            ) : logoPreview ? (
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

      {/* ── Logo URL section ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Shop Logo</h3>
        <p className="text-xs text-slate-400 mb-4">
          Paste a direct image URL (Google Drive, Imgur, etc.). The image is cached on your device — no storage used on the server.
        </p>

        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label>
            <input
              type="url"
              placeholder="https://i.imgur.com/yourlogo.png"
              value={logoUrlInput}
              onChange={handleLogoUrlChange}
              className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-400 text-slate-900 text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: For Google Drive — share the file publicly, then use{" "}
              <span className="font-mono bg-slate-100 px-1 rounded">https://drive.google.com/uc?export=view&id=FILE_ID</span>
            </p>
          </div>

          {logoPreview && (
            <div className="mt-5 w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
              <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" onError={() => setLogoPreview(null)} />
            </div>
          )}
        </div>

        {logoUrlInput && (
          <button
            onClick={async () => {
              setLogoUrlInput("");
              setLogoPreview(null);
              setForm((prev) => ({
                ...prev,
                config: { ...(prev.config || {}), logo_url: "" },
              }));
              // Clear cache for this shop
              if (shop?.id) localStorage.removeItem(logoCacheKey(shop.id));
              toast.success("Logo removed.");
            }}
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

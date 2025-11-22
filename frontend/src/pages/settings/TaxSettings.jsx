import React, { useState } from "react";

export default function TaxSettings({ settings, onUpdate }) {
  const [gstEnabled, setGstEnabled] = useState(settings?.gstEnabled ?? true);
  const [defaultRate, setDefaultRate] = useState(settings?.defaultRate || "18");
  const [priceInclusive, setPriceInclusive] = useState(settings?.priceInclusive ?? false);
  const [currency, setCurrency] = useState(settings?.currency || "₹");
  const [decimals, setDecimals] = useState(settings?.decimals || "2");

  const handleSave = () => {
    onUpdate({ gstEnabled, defaultRate, priceInclusive, currency, decimals });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div><h3 className="text-lg font-bold text-slate-900">GST Configuration</h3></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={gstEnabled} onChange={() => setGstEnabled(!gstEnabled)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-sky-500 transition-all"></div>
            </label>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${gstEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Tax Rate</label>
                <select value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <option value="18">18%</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="28">28%</option>
                    <option value="0">0% (Exempt)</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price Input Logic</label>
                <select value={priceInclusive ? "inclusive" : "exclusive"} onChange={(e) => setPriceInclusive(e.target.value === "inclusive")} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <option value="exclusive">Tax Exclusive (Price + GST)</option>
                    <option value="inclusive">Tax Inclusive (Price includes GST)</option>
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <h3 className="text-lg font-bold text-slate-900 mb-4">Currency & Locale</h3>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency Symbol</label>
                <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center font-bold" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Decimal Places</label>
                <select value={decimals} onChange={(e) => setDecimals(e.target.value)} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <option value="2">2 (10.50)</option>
                    <option value="0">0 (11)</option>
                    <option value="3">3 (10.500)</option>
                </select>
             </div>
         </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg">Update Settings</button>
      </div>
    </div>
  );
}
import React, { useState } from "react";

export default function TaxSettings() {
  const [gstEnabled, setGstEnabled] = useState(true);

  return (
    <div className="space-y-6">
      {/* Tax Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900">GST Configuration</h3>
                <p className="text-sm text-slate-500">Enable Goods & Services Tax calculations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={gstEnabled} onChange={() => setGstEnabled(!gstEnabled)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${gstEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Tax Rate</label>
                <select className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 text-slate-900">
                    <option>18%</option>
                    <option>12%</option>
                    <option>5%</option>
                    <option>28%</option>
                    <option>0% (Exempt)</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price Input Logic</label>
                <select className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-sky-400 text-slate-900">
                    <option>Tax Exclusive (Price + GST)</option>
                    <option>Tax Inclusive (Price includes GST)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">How do you enter product prices?</p>
            </div>
        </div>
      </div>

      {/* Currency Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <h3 className="text-lg font-bold text-slate-900 mb-4">Currency & Locale</h3>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency Symbol</label>
                <input type="text" defaultValue="₹" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center font-bold text-slate-900" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Decimal Places</label>
                <select className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-900">
                    <option>2 (e.g. 10.50)</option>
                    <option>0 (e.g. 11)</option>
                    <option>3 (e.g. 10.500)</option>
                </select>
             </div>
         </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Update Settings</button>
      </div>
    </div>
  );
}

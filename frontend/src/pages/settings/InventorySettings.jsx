import React, { useState } from "react";

export default function InventorySettings() {
  const [allowNegative, setAllowNegative] = useState(false);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      {/* Low Stock */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Global Low Stock Threshold</h3>
          <p className="text-sm text-slate-500">Default value for new products alert</p>
        </div>
        <div className="w-24">
            <input type="number" defaultValue={5} className="w-full text-center border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-sky-400" />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Negative Stock */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Negative Stock Billing</h3>
          <p className="text-sm text-slate-500">Allow billing items even if quantity is 0?</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={allowNegative} onChange={()=>setAllowNegative(!allowNegative)} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
        </label>
      </div>

      <hr className="border-slate-100" />

      {/* Units */}
      <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Unit Management</h3>
          <div className="flex flex-wrap gap-2">
            {["Pcs", "Kg", "Ltr", "Box", "Pack"].map(u => (
                <span key={u} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm border border-slate-200 flex items-center gap-2">
                    {u} <button className="text-slate-400 hover:text-rose-500">×</button>
                </span>
            ))}
            <button className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-sm border border-sky-200 hover:bg-sky-100">+ Add</button>
          </div>
      </div>
    </div>
  );
}
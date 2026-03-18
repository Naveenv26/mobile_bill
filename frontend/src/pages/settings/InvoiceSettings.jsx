import React, { useState } from "react";

export default function InvoiceSettings({ settings, onUpdate }) {
  const [form, setForm] = useState({
    paper_size: settings.paper_size || "80mm",
    terms:      settings.terms      || "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Invoice Layout</h3>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Paper Size</label>
          <select
            name="paper_size"
            value={form.paper_size}
            onChange={handleChange}
            className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50"
          >
            <option value="A4">A4 (Standard)</option>
            <option value="80mm">80mm (Thermal POS)</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Terms & Conditions</h3>
        <p className="text-xs text-slate-400 mb-3">
          Printed at the bottom of every bill, just before "Thank you for your visit"
        </p>
        <textarea
          name="terms"
          value={form.terms}
          onChange={handleChange}
          placeholder="e.g. Goods once sold will not be taken back. All disputes subject to local jurisdiction."
          className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm"
          rows="4"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onUpdate({ ...settings, ...form })}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 shadow-lg"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
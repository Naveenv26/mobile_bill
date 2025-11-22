import React, { useState } from "react";

export default function InvoiceSettings({ settings, onUpdate }) {
  const [form, setForm] = useState({
     prefix: settings.prefix || "INV-",
     paper_size: settings.paper_size || "A4",
     terms: settings.terms || "",
     bank_details: settings.bank_details || ""
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Invoice Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Prefix</label>
            <input name="prefix" value={form.prefix} onChange={handleChange} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Paper Size</label>
            <select name="paper_size" value={form.paper_size} onChange={handleChange} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50">
              <option value="A4">A4 (Standard)</option>
              <option value="A5">A5 (Half)</option>
              <option value="80mm">80mm (Thermal POS)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Details</h3>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Bank Details</label>
                <textarea name="bank_details" value={form.bank_details} onChange={handleChange} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" rows="2"></textarea>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea name="terms" value={form.terms} onChange={handleChange} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" rows="2"></textarea>
            </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => onUpdate(form)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 shadow-lg">Save Changes</button>
      </div>
    </div>
  );
}
import React from "react";

export default function InvoiceSettings() {
  return (
    <div className="space-y-6">
      {/* Card 1: General Layout */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Invoice Layout</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Prefix</label>
            <input type="text" placeholder="INV-2025-" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-sky-400 focus:border-sky-400" />
            <p className="text-xs text-slate-400 mt-1">Example: INV-2025-001</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Paper Size</label>
            <select className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-sky-400">
              <option>A4 (Standard)</option>
              <option>A5 (Half)</option>
              <option>80mm (Thermal POS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Bank & Legal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Bank Details & Terms</h3>
        <div className="grid grid-cols-1 gap-4 mb-4">
           <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Bank Details (Footer)</label>
            <textarea rows="3" placeholder="Bank Name: HDFC&#10;Acc No: XXXXX&#10;IFSC: XXXXX" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-sky-400"></textarea>
           </div>
           <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Terms & Conditions</label>
            <textarea rows="3" placeholder="1. Goods once sold will not be taken back.&#10;2. Warranty as per manufacturer." className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:ring-sky-400"></textarea>
           </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
             <div>
                <label className="block text-sm font-bold text-slate-700">Digital Signature</label>
                <p className="text-xs text-slate-500">Upload an image to auto-sign invoices</p>
             </div>
             <button className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">Upload .PNG</button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Save Changes</button>
      </div>
    </div>
  );
}
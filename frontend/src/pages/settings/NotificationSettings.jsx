import React from "react";

export default function NotificationSettings() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900">Daily Sales Report</h3>
                <p className="text-sm text-slate-500">Receive a summary of today's sales via email.</p>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Send Report At</label>
            <input type="time" defaultValue="21:00" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" />
        </div>
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
            <input type="email" defaultValue="admin@myshop.com" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" />
        </div>
      </div>
      <button className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800 w-full md:w-auto">Save Preferences</button>
    </div>
  );
}
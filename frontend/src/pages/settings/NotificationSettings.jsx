import React, { useState } from "react";

export default function NotificationSettings({ settings, onUpdate }) {
  const [dailyReport, setDailyReport] = useState(settings?.dailyReport ?? true);
  const [reportTime, setReportTime] = useState(settings?.reportTime || "21:00");
  const [email, setEmail] = useState(settings?.email || "");

  const handleSave = () => {
    onUpdate({ dailyReport, reportTime, email });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">Daily Sales Report</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={dailyReport} onChange={() => setDailyReport(!dailyReport)} />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-sky-500 transition-all"></div>
        </label>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${dailyReport ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Send Report At</label>
            <input type="time" value={reportTime} onChange={(e) => setReportTime(e.target.value)} className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" />
        </div>
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@myshop.com" className="w-full border-slate-200 rounded-lg p-2.5 bg-slate-50" />
        </div>
      </div>
      <button onClick={handleSave} className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800 w-full md:w-auto">Save Preferences</button>
    </div>
  );
}
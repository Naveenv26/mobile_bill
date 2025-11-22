import React, { useState } from "react";

export default function CustomerSettings({ settings, onUpdate }) {
  const [phoneMandatory, setPhoneMandatory] = useState(settings?.phoneMandatory ?? true);
  const [allowCredit, setAllowCredit] = useState(settings?.allowCredit ?? false);
  const [defaultName, setDefaultName] = useState(settings?.defaultName || "");
  const [defaultPhone, setDefaultPhone] = useState(settings?.defaultPhone || "");

  const handleSave = () => {
    onUpdate({ phoneMandatory, allowCredit, defaultName, defaultPhone });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Customer Constraints</h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-700 font-medium">Phone Number is Mandatory</span>
                    <input type="checkbox" checked={phoneMandatory} onChange={() => setPhoneMandatory(!phoneMandatory)} className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-700 font-medium">Allow Credit (Udhaar) by Default</span>
                    <input type="checkbox" checked={allowCredit} onChange={() => setAllowCredit(!allowCredit)} className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500" />
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Default Customer (Walk-in)</h3>
            <div className="grid grid-cols-2 gap-4">
                <input type="text" value={defaultName} onChange={(e) => setDefaultName(e.target.value)} placeholder="Name (e.g., Walk-in Customer)" className="border-slate-200 rounded-lg p-2.5" />
                <input type="text" value={defaultPhone} onChange={(e) => setDefaultPhone(e.target.value)} placeholder="Phone (e.g., 0000000000)" className="border-slate-200 rounded-lg p-2.5" />
            </div>
        </div>
        <div className="flex justify-end">
            <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800">Update Settings</button>
        </div>
    </div>
  );
}
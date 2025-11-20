import React from "react";

export default function UserSettings() {
  // Mock data for display
  const users = [
    { id: 1, name: "Naveen (You)", role: "Owner", email: "naveen@shop.com", active: true },
    { id: 2, name: "Sarah Manager", role: "Manager", email: "sarah@shop.com", active: true },
    { id: 3, name: "John Cashier", role: "Cashier", email: "john@shop.com", active: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Staff Management</h3>
          <p className="text-sm text-slate-500">Control who has access to your shop.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
          + Add New Staff
        </button>
      </div>

      {/* User List - Flat Card Style */}
      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white/60">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${user.role === 'Owner' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
                {user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{user.name}</h4>
                <p className="text-xs text-slate-500">{user.email} • <span className="font-medium text-slate-700">{user.role}</span></p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`text-xs font-bold px-2 py-1 rounded border ${user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {user.active ? 'Active' : 'Inactive'}
              </div>
              <button className="text-slate-400 hover:text-sky-600 px-2">Edit</button>
            </div>
          </div>
        ))}
      </div>

      {/* Role Definitions */}
      <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-100 mt-6">
        <h4 className="text-sm font-bold text-slate-800 mb-2">Role Permissions Guide</h4>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• <strong>Owner:</strong> Full access to everything.</li>
          <li>• <strong>Manager:</strong> Can manage stock and view sales, cannot delete history.</li>
          <li>• <strong>Cashier:</strong> Can only access Billing screen. No access to Reports or Settings.</li>
        </ul>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { toast } from "react-hot-toast";

export default function UserSettings() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", role: "SHOPKEEPER", password: "" });

  const fetchStaff = async () => {
    try {
        const res = await axios.get("/staff/");
        setUsers(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAddStaff = async () => {
      try {
          await axios.post("/staff/", newUser);
          toast.success("Staff added!");
          setIsModalOpen(false);
          fetchStaff();
      } catch(err) {
          toast.error(err.response?.data?.username?.[0] || "Failed to add staff");
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Staff Management</h3>
        <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">+ Add Staff</button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                {user.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{user.username}</h4>
                <p className="text-xs text-slate-500">{user.email} • <span className="text-sky-600">{user.role}</span></p>
              </div>
            </div>
            <button onClick={async () => { if(confirm("Delete user?")) { await axios.delete(`/staff/${user.id}/`); fetchStaff(); }}} className="text-red-400 hover:text-red-600">Remove</button>
          </div>
        ))}
        {users.length === 0 && <div className="text-center text-slate-400 py-4">No staff members yet.</div>}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
                  <h3 className="font-bold mb-4">Add New Staff</h3>
                  <input className="w-full mb-2 p-2 border rounded" placeholder="Username" onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  <input className="w-full mb-2 p-2 border rounded" placeholder="Email" type="email" onChange={e => setNewUser({...newUser, email: e.target.value})} />
                  <input className="w-full mb-2 p-2 border rounded" placeholder="Password" type="password" onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  <select className="w-full mb-4 p-2 border rounded" onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="SHOPKEEPER">Shop Keeper</option>
                      <option value="SHOP_OWNER">Manager</option>
                  </select>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                      <button onClick={handleAddStaff} className="px-4 py-2 bg-slate-900 text-white rounded">Add</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { ShieldCheck, Phone, Clock, Hash } from "lucide-react";

export default function AdminOTPLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = () => {
        setLoading(true);
        api.get("/auth/admin-otp-logs/")
            .then(res => setLogs(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchLogs();
        const timer = setInterval(fetchLogs, 10000); // Refresh every 10s
        return () => clearInterval(timer);
    }, []);

    if (loading && logs.length === 0) return <div className="p-8 text-center text-slate-400">Loading OTP Logs...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Admin OTP Monitor</h1>
                    <p className="text-sm text-slate-500 font-medium">Real-time mobile verification logs</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Mobile No</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-center">OTP Code</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-right">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-100">
                        {logs.map((log, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                            <Phone size={16} />
                                        </div>
                                        <span className="font-bold text-slate-800 tracking-tight">{log.phone}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-mono font-black text-lg shadow-inner">
                                        {log.otp}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    {log.verified ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase">
                                            <ShieldCheck size={12} /> Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase">
                                            <Clock size={12} /> Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-right text-xs font-bold text-slate-400">
                                    {new Date(log.time).toLocaleTimeString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {logs.length === 0 && (
                    <div className="py-20 text-center text-slate-400 font-medium">No verification attempts yet.</div>
                )}
            </div>
        </div>
    );
}

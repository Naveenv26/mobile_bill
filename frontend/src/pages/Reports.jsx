// frontend/src/pages/Reports.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { getInvoices } from "../api/invoices.js";
import { getProducts } from "../api/products.js";
import { useSubscription } from "../context/SubscriptionContext.jsx";

// --- Charts ---
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// --- Icons ---
const DownloadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const CalendarIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CloseIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;

// Specialized Icons
const TrendingUpIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const CubeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const StarIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const AlertIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

// --- Formatters ---
const formatCurrency = (val) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val || 0));
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

// --- Components ---

const StatCard = ({ title, value, subtext, icon, gradient, isDark }) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg min-w-[160px] ${gradient} ${isDark ? 'text-white' : 'text-slate-800'}`}>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl backdrop-blur-md border shadow-inner ${isDark ? 'bg-white/20 border-white/10' : 'bg-white/60 border-white/40'}`}>
                    {icon}
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-black tracking-tight">{value}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'opacity-80' : 'opacity-60'}`}>{title}</p>
                {subtext && <p className={`text-[10px] mt-2 w-fit px-2 py-0.5 rounded-lg ${isDark ? 'bg-white/20 opacity-90' : 'bg-slate-200/50 opacity-100 text-slate-700 font-bold'}`}>{subtext}</p>}
            </div>
        </div>
        {/* Decorative Background Elements */}
        <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-xl pointer-events-none ${isDark ? 'bg-white/10' : 'bg-blue-200/20'}`}></div>
        <div className={`absolute top-[-30px] right-[-10px] w-20 h-20 rounded-full blur-lg pointer-events-none ${isDark ? 'bg-white/5' : 'bg-blue-200/20'}`}></div>
    </div>
);

export default function Reports() {
    const [tab, setTab] = useState("sales");
    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [search, setSearch] = useState("");
    
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Get hasFeature
    const { isSubscribed, hasFeature } = useSubscription();
    const exportMenuRef = useRef(null);

    // --- THEME CONFIGURATION ---
    const themeColor = useMemo(() => {
        if(tab === 'sales') return { hex: '#0A1A2F', bg: 'bg-blue-200', text: 'text-blue-900' }; 
        if(tab === 'stock') return { hex: '#1E1B4B', bg: 'bg-indigo-200', text: 'text-indigo-900' }; 
        return { hex: '#155E75', bg: 'bg-cyan-200', text: 'text-cyan-900' }; 
    }, [tab]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [invRes, prodRes] = await Promise.all([getInvoices(), getProducts()]);
                setInvoices(Array.isArray(invRes?.data || invRes) ? (invRes?.data || invRes) : []);
                setProducts(Array.isArray(prodRes?.data || prodRes) ? (prodRes?.data || prodRes) : []);
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        loadData();
    }, []);

    // --- Data Processing ---
    const filteredData = useMemo(() => {
        const start = fromDate ? new Date(fromDate) : null;
        const end = toDate ? new Date(toDate + "T23:59:59.999Z") : null;

        const filteredInvoices = invoices.filter(inv => {
            if (!inv.invoice_date) return false;
            const d = new Date(inv.invoice_date);
            return (!start || d >= start) && (!end || d <= end);
        });

        const q = search.toLowerCase();
        
        if (tab === 'sales') {
            return filteredInvoices.filter(i => {
                const cName = i.customer_detail?.name || i.customer_name || "";
                return cName.toLowerCase().includes(q) || String(i.number).includes(q);
            });
        }
        
        if (tab === 'stock') {
            return products.filter(p => p.name.toLowerCase().includes(q));
        }

        const salesMap = {};
        filteredInvoices.forEach(inv => inv.items?.forEach(it => {
            const name = it.product_name || "Unknown";
            salesMap[name] = (salesMap[name] || 0) + Number(it.qty || 0);
        }));
        
        return Object.entries(salesMap)
            .map(([name, qty]) => ({ name, qty, price: products.find(p=>p.name===name)?.price || 0 }))
            .filter(p => p.name.toLowerCase().includes(q))
            .sort((a,b) => b.qty - a.qty);

    }, [invoices, products, fromDate, toDate, search, tab]);

    // --- Metrics ---
    const metrics = useMemo(() => {
        if (tab === 'sales') {
            const total = filteredData.reduce((sum, i) => sum + Number(i.grand_total || 0), 0);
            return { card1: total, card2: filteredData.length };
        } 
        if (tab === 'stock') {
            const totalVal = filteredData.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            const lowStockCount = filteredData.filter(p => Number(p.quantity) <= 5).length;
            return { card1: totalVal, card2: lowStockCount };
        }
        const totalUnits = filteredData.reduce((sum, p) => sum + p.qty, 0);
        const topItem = filteredData.length > 0 ? filteredData[0] : { name: 'N/A', qty: 0 };
        return { card1: totalUnits, card2: topItem };
    }, [filteredData, tab]);

    // --- Charts ---
    const chartData = useMemo(() => {
        if (tab === 'sales') {
            const grouped = {};
            filteredData.forEach(inv => {
                const date = inv.invoice_date.split('T')[0];
                grouped[date] = (grouped[date] || 0) + Number(inv.grand_total || 0);
            });
            const sorted = Object.entries(grouped).map(([date, total]) => ({ date, total })).sort((a, b) => new Date(a.date) - new Date(b.date));
            return sorted.length > 15 ? sorted.slice(-15) : sorted;
        } else {
            return filteredData.slice(0, 7).map(p => ({ name: p.name.substring(0,10), value: Number(p.quantity || p.qty) }));
        }
    }, [filteredData, tab]);

    if (loading) return <div className="h-screen flex items-center justify-center text-slate-400 text-sm animate-pulse">Loading Data...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
            
            {/* --- Header --- */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-center mb-3">
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Analytics</h1>
                        
                        {/* 2. Gate the Export Button */}
                        {hasFeature('export') && (
                            <div className="relative" ref={exportMenuRef}>
                                <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200 active:scale-95 transition-all">
                                    <DownloadIcon /> <span>EXPORT</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
                        {[
                            { id: 'sales', label: 'Revenue' },
                            { id: 'stock', label: 'Inventory' },
                            { id: 'products', label: 'Products' }
                        ].map(t => (
                            <button key={t.id} onClick={() => {setTab(t.id); setSearch('')}} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${tab === t.id ? `bg-slate-900 text-white shadow-md scale-105` : 'bg-white text-slate-500 border border-slate-200'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
                
                {/* --- Dynamic Cards --- */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                    
                    {/* CARD 1: Uses the DARK variant (Bold) */}
                    <div className="snap-center">
                        <StatCard 
                            title={tab === 'sales' ? "Total Revenue" : tab === 'stock' ? "Stock Value" : "Units Sold"} 
                            value={tab === 'products' ? metrics.card1 : formatCurrency(metrics.card1)} 
                            isDark={true}
                            gradient={
                                tab === 'sales' ? "bg-gradient-to-br from-[#0A1A2F] to-[#0F172A]" : 
                                tab === 'stock' ? "bg-gradient-to-br from-[#0F172A] to-[#1E1B4B]" : 
                                "bg-gradient-to-br from-[#155E75] to-[#1E3A8A]" 
                            }
                            icon={tab === 'sales' ? <TrendingUpIcon /> : tab === 'stock' ? <CubeIcon /> : <StarIcon />}
                        />
                    </div>

                    {/* CARD 2: Uses the LIGHT variant (Subtle) */}
                    <div className="snap-center">
                        {tab === 'sales' && (
                            <StatCard 
                                title="Transactions" 
                                value={metrics.card2} 
                                subtext="Invoices generated" 
                                isDark={false}
                                gradient="bg-gradient-to-br from-[#BFDBFE] to-[#67E8F9]" 
                                icon={<div className="font-serif italic font-black text-xl">#</div>} 
                            />
                        )}
                        {tab === 'stock' && (
                            <StatCard 
                                title="Low Stock Alert" 
                                value={metrics.card2} 
                                subtext="Items below 5 qty" 
                                isDark={false}
                                gradient="bg-gradient-to-br from-[#C7D2FE] to-[#CBD5E1]" // Deep Royal Light
                                icon={<AlertIcon />} 
                            />
                        )}
                        {tab === 'products' && (
                            <StatCard 
                                title="Top Performer" 
                                value={metrics.card2.name?.substring(0, 10)} 
                                subtext={`${metrics.card2.qty} units sold`} 
                                isDark={false} 
                                gradient="bg-gradient-to-br from-[#F1F5F9] to-[#EFF6FF]" // Cool Slate Light
                                icon={<StarIcon />} 
                            />
                        )}
                    </div>
                </div>

                {/* --- Graph --- */}
                <div className="bg-white rounded-3xl p-1 shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                    <div className="p-5 pb-0">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Overview</p>
                        <h2 className="text-xl font-black text-slate-800">Performance Trend</h2>
                    </div>
                    <div className="h-60 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            {tab === 'sales' ? (
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={themeColor.hex} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={themeColor.hex} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip cursor={{ stroke: themeColor.hex, strokeWidth: 1 }} contentStyle={{ borderRadius: '12px', fontWeight: 'bold' }} formatter={(value) => [formatCurrency(value), ""]} />
                                    <Area type="monotone" dataKey="total" stroke={themeColor.hex} strokeWidth={3} fillOpacity={1} fill="url(#colorGradient)" />
                                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                </AreaChart>
                            ) : (
                                <BarChart data={chartData} barSize={24} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', fontWeight: 'bold' }} />
                                    <Bar dataKey="value" fill={themeColor.hex} radius={[4,4,0,0]} />
                                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} dy={5} />
                                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- Filter (Sales Only) --- */}
                {tab === 'sales' && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-fit shadow-sm">
                            <CalendarIcon />
                            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="ml-2 text-xs bg-transparent outline-none text-slate-600 font-bold uppercase tracking-wide" />
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-fit shadow-sm">
                            <span className="text-slate-400 text-[10px] font-bold mr-2">TO</span>
                            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="text-xs bg-transparent outline-none text-slate-600 font-bold uppercase tracking-wide" />
                        </div>
                    </div>
                )}

                {/* --- Search --- */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><SearchIcon /></div>
                    <input type="text" placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-sm text-sm font-semibold focus:ring-2 focus:ring-indigo-500 transition-shadow" />
                </div>

                {/* --- Data List --- */}
                <div className="space-y-3 pb-10">
                    {filteredData.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">No data found</div> : 
                        filteredData.map((item, i) => {
                            
                            const displayName = tab === 'sales' 
                                ? (item.customer_detail?.name || item.customer_name || "Walk-in") 
                                : item.name;
                            
                            const initial = displayName ? displayName.charAt(0).toUpperCase() : '#';

                            return (
                                <div 
                                    key={i}
                                    onClick={() => tab === 'sales' && setSelectedInvoice(item)}
                                    className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors ${tab === 'sales' ? 'active:scale-[0.98] cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* --- Icon with Initial (Using Theme Colors) --- */}
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-inner ${themeColor.bg} ${themeColor.text}`}>
                                            {initial}
                                        </div>
                                        
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px] leading-tight">
                                                {displayName}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1 tracking-wide flex items-center gap-1">
                                                {tab === 'sales' ? <span>{formatDate(item.invoice_date)} • #{item.number}</span> : 
                                                tab === 'stock' ? `₹${item.price}/unit` : `${item.qty} units sold`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="font-bold text-slate-800 text-sm">
                                            {tab === 'sales' ? formatCurrency(item.grand_total) : 
                                            tab === 'stock' ? item.quantity : formatCurrency(item.qty * item.price)}
                                        </p>
                                        {tab === 'stock' && Number(item.quantity) <= 5 && <span className="inline-block mt-1 text-[9px] font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow-sm shadow-red-200">LOW STOCK</span>}
                                        {tab === 'products' && i === 0 && <span className="inline-block mt-1 text-[9px] font-bold text-white bg-cyan-700 px-2 py-0.5 rounded shadow-sm shadow-cyan-200">#1 SELLER</span>}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {/* Invoice Modal */}
            {selectedInvoice && (
                 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center animate-fade-in">
                    <div className="absolute inset-0" onClick={() => setSelectedInvoice(null)}></div>
                    <div className="bg-white w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
                        <div className="bg-slate-900 text-white p-6 text-center relative">
                             <button onClick={() => setSelectedInvoice(null)} className="absolute right-4 top-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><CloseIcon /></button>
                             <h2 className="text-2xl font-black">{formatCurrency(selectedInvoice.grand_total)}</h2>
                             <div className="mt-2 text-xs opacity-70">Paid via Cash</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Customer</p>
                                <div className="font-bold text-gray-800">{selectedInvoice.customer_detail?.name || selectedInvoice.customer_name || "Walk-in"}</div>
                                <div className="text-sm text-gray-500">{selectedInvoice.customer_detail?.mobile || selectedInvoice.customer_mobile}</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Items</p>
                                {selectedInvoice.items?.map((it, i) => (
                                    <div key={i} className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0 text-sm">
                                        <span>{it.product_name} <span className="text-gray-400 text-xs">x{it.qty}</span></span>
                                        <span className="font-bold">{formatCurrency(it.qty * it.unit_price)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
}
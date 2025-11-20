import React, { useEffect, useState } from "react";
import { getInvoices } from "../api/invoices";
import { getProducts } from "../api/products";

// --- Elegant Thin Icons ---
const IconWrapper = ({ children, className }) => (
  <div className={`${className} flex items-center justify-center rounded-full`}>
    {children}
  </div>
);

const CurrencyRupeeIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12.75 12H12m-4.5 3.75h9.75" />
  </svg>
);
const DocumentTextIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const CubeIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);
const AlertIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
);
const TrendUpIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
);

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, prodRes] = await Promise.all([getInvoices(), getProducts()]);
        
        const normalize = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
        
        setInvoices(normalize(invRes));
        setProducts(normalize(prodRes));
      } catch (err) {
        setError("Could not sync data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
  const lowStock = products.filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length;
  const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium animate-pulse">Syncing Dashboard...</div>;
  if (error) return <div className="h-screen flex items-center justify-center bg-slate-50 text-red-500 text-sm">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      
      {/* --- 1. The "Wallet" Header (Dark, curved, elegant) --- */}
      <div className="relative bg-slate-900 pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-2xl shadow-slate-900/20">
        <div className="flex justify-between items-start mb-6">
            <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Total Revenue</p>
                <div className="flex items-baseline mt-1 gap-1">
                    <span className="text-3xl text-white font-light">₹</span>
                    <h1 className="text-4xl font-bold text-white tracking-tight">
                        {totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </h1>
                </div>
            </div>
            {/* A decorative visual element indicating growth */}
            <div className="bg-slate-800 p-2 rounded-full">
                <TrendUpIcon className="w-5 h-5 text-emerald-400" />
            </div>
        </div>
        
        {/* Subtle decorative circles for texture */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* --- 2. The "Floating" Stat Matrix --- 
          This overlaps the dark header (-mt-16) to create depth */}
      <div className="mx-5 -mt-16 bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-1 relative z-10">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Top Row */}
            <div className="p-5 border-b border-slate-100 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-medium mb-1">Total Invoices</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-xl font-bold text-slate-800">{invoices.length}</span>
                </div>
            </div>
            <div className="p-5 border-b border-slate-100 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-medium mb-1">Inventory Count</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <CubeIcon className="w-5 h-5 text-purple-600" />
                    <span className="text-xl font-bold text-slate-800">{products.length}</span>
                </div>
            </div>
            {/* Bottom Row */}
            <div className="p-5 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-medium mb-1">Low Stock</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-lg font-semibold text-slate-700">{lowStock} Items</span>
                </div>
            </div>
            <div className="p-5 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-medium mb-1">Out of Stock</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-lg font-semibold text-slate-700">{outOfStock} Items</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- 3. Recent Transactions (Clean List) --- */}
      <div className="mt-8 px-5">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800 font-bold text-lg">Recent Sales</h2>
        </div>

        <div className="flex flex-col gap-4">
            {invoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No recent transactions</div>
            ) : (
                invoices.slice(0, 8).map((inv, index) => (
                    <div key={inv.id} className="group flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-transform">
                        <div className="flex items-center gap-4">
                            {/* Minimalist Icon Box */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${index % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                <span className="text-sm font-bold">
                                    {(inv.customer_detail?.name?.[0] || inv.customer_name?.[0] || "C")}
                                </span>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {inv.customer_detail?.name || inv.customer_name || "Walk-in"}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    {new Date(inv.created_at || inv.invoice_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })} 
                                    <span className="mx-1">•</span> 
                                    #{inv.id}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="block text-sm font-bold text-slate-800">
                                +₹{Math.floor(Number(inv.total || inv.grand_total || 0)).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}
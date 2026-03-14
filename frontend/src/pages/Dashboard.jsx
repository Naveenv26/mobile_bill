// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { getInvoices } from "../api/invoices";
import { getProducts } from "../api/products";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import InvoiceModal from "../components/InvoiceModal.jsx";

const DocumentTextIcon = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CubeIcon         = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;
const TrendUpIcon      = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;

export default function Dashboard() {
  // ✅ use daysRemaining (camelCase) — that's what the context exports
  const { daysRemaining } = useSubscription();

  const [invoices, setInvoices]               = useState([]);
  const [products, setProducts]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const currentShop = JSON.parse(localStorage.getItem("shop")) || {};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [inv, prod] = await Promise.all([getInvoices(), getProducts()]);
        setInvoices(inv);
        setProducts(prod);
      } catch (err) {
        console.error(err);
        setError("Could not sync data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
  const lowStock   = products.filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length;
  const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;

  const todayStr   = new Date().toDateString();
  const todaySales = invoices
    .filter((inv) => new Date(inv.created_at || inv.invoice_date).toDateString() === todayStr)
    .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium animate-pulse">Syncing Dashboard...</div>;
  if (error)   return <div className="h-screen flex items-center justify-center bg-slate-50 text-red-500 text-sm">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">

      {/* Dark wallet header */}
      <div className="relative bg-slate-900 pt-10 pb-24 px-6 rounded-b-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Total Revenue</p>
            <div className="flex items-baseline mt-1 gap-1">
              <span className="text-3xl text-white font-light">₹</span>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                {totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h1>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Today: <span className="text-emerald-400 font-bold">₹{todaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </p>
          </div>
          <div className="bg-slate-800 p-2 rounded-full">
            <TrendUpIcon className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* ✅ uses daysRemaining from context */}
        {daysRemaining > 0 && daysRemaining <= 5 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-400 font-semibold">
            ⚠ Subscription expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
          </div>
        )}

        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-32 h-32 bg-indigo-500 opacity-5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Floating stat cards */}
      <div className="mx-4 sm:mx-6 -mt-16 bg-white rounded-3xl shadow-xl shadow-slate-200/60 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          <div className="p-5 border-b sm:border-b-0 border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Total Invoices</p>
            <div className="flex items-center justify-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              <span className="text-xl font-bold text-slate-800">{invoices.length}</span>
            </div>
          </div>
          <div className="p-5 border-b sm:border-b-0 border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Products</p>
            <div className="flex items-center justify-center gap-2">
              <CubeIcon className="w-5 h-5 text-purple-600" />
              <span className="text-xl font-bold text-slate-800">{products.length}</span>
            </div>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Low Stock</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-lg font-semibold text-slate-700">{lowStock} Items</span>
            </div>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs text-slate-400 font-medium mb-1">Out of Stock</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-lg font-semibold text-slate-700">{outOfStock} Items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="mt-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-800 font-bold text-lg">Recent Sales</h2>
          <span className="text-xs text-slate-400 font-medium">Tap to view invoice</span>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            No transactions yet
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {invoices.slice(0, 10).map((inv, index) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${index % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"}`}>
                    <span className="text-sm font-bold">
                      {(inv.customer_detail?.name?.[0] || inv.customer_name?.[0] || "C").toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {inv.customer_detail?.name || inv.customer_name || "Walk-in"}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {new Date(inv.created_at || inv.invoice_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      <span className="mx-1">•</span>#{inv.number || inv.id}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span className="block text-sm font-bold text-slate-800">
                    +₹{Math.floor(Number(inv.grand_total || 0)).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] text-indigo-400 font-bold">VIEW →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          shop={currentShop}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
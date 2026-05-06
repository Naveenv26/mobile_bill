// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { fetchAllInvoices, getInvoices } from "../api/invoices";
import { fetchAllProducts } from "../api/products";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import InvoiceModal from "../components/InvoiceModal.jsx";

const DocumentTextIcon = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const CubeIcon         = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>;
const TrendUpIcon      = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;

const PAGE_SIZE = 10;

export default function Dashboard() {
  const { daysRemaining } = useSubscription();

  // allInvoices = complete list for totals
  // recentInvoices = paginated list for the Recent Sales UI
  const [allInvoices, setAllInvoices]       = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [products, setProducts]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [page, setPage]                     = useState(1);
  const [totalCount, setTotalCount]         = useState(0);
  const [error, setError]                   = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const currentShop = JSON.parse(localStorage.getItem("shop")) || {};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all invoices for accurate revenue totals (walks all pages)
        // Fetch first page of recent sales for the list
        // Fetch all products for stock counters
        const [allInv, firstPage, allProd] = await Promise.all([
          fetchAllInvoices(),
          getInvoices({ page: 1, page_size: PAGE_SIZE }),
          fetchAllProducts(),
        ]);
        setAllInvoices(allInv);
        setRecentInvoices(firstPage.results);
        setTotalCount(firstPage.count);
        setProducts(allProd);
      } catch (err) {
        console.error(err);
        setError("Could not sync data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { results } = await getInvoices({ page: nextPage, page_size: PAGE_SIZE });
      setRecentInvoices((prev) => [...prev, ...results]);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Totals use allInvoices so they're always accurate
  const totalSales = allInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0);
  const lowStock   = products.filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5).length;
  const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;

  const todayStr   = new Date().toDateString();
  const todaySales = allInvoices
    .filter((inv) => new Date(inv.created_at || inv.invoice_date).toDateString() === todayStr)
    .reduce((s, inv) => s + Number(inv.grand_total || 0), 0);

  const hasMore = recentInvoices.length < totalCount;

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium animate-pulse">Syncing Dashboard...</div>;
  if (error)   return <div className="h-screen flex items-center justify-center bg-slate-50 text-red-500 text-sm">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">

      {/* Dark wallet header */}
      <div className="relative bg-slate-900 pt-8 pb-20 px-4 sm:px-6 rounded-b-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Total Revenue</p>
            <div className="flex items-baseline mt-1 gap-1">
              <span className="text-3xl text-white font-light">₹</span>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                {totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h1>
            </div>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-2">
              Today: <span className="text-emerald-400 font-bold">₹{todaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              <span className="ml-2 text-slate-600">{allInvoices.length} total</span>
            </p>
          </div>
          <div className="bg-slate-800 p-2 rounded-full">
            <TrendUpIcon className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {daysRemaining > 0 && daysRemaining <= 5 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-400 font-semibold">
            ⚠ Subscription expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
          </div>
        )}

        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-32 h-32 bg-indigo-500 opacity-5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Floating stat cards */}
      <div className="mx-3 sm:mx-6 -mt-12 bg-white rounded-3xl shadow-xl shadow-slate-200/60 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          <div className="p-3 border-b sm:border-b-0 border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium mb-1 truncate">Invoices</p>
            <div className="flex items-center justify-center gap-1.5">
              <DocumentTextIcon className="w-4 h-4 text-blue-600" />
              <span className="text-base font-bold text-slate-800">{allInvoices.length}</span>
            </div>
          </div>
          <div className="p-3 border-b sm:border-b-0 border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium mb-1 truncate">Products</p>
            <div className="flex items-center justify-center gap-1.5">
              <CubeIcon className="w-4 h-4 text-purple-600" />
              <span className="text-base font-bold text-slate-800">{products.length}</span>
            </div>
          </div>
          <div className="p-3 text-center border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium mb-1 truncate">Low Stock</p>
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span className="text-sm font-semibold text-slate-700">{lowStock}</span>
            </div>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-slate-400 font-medium mb-1 truncate">Out of Stock</p>
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <span className="text-sm font-semibold text-slate-700">{outOfStock}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="mt-6 px-3 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-800 font-bold text-lg">Recent Sales</h2>
            {totalCount > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {recentInvoices.length} of {totalCount}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium">Tap to view invoice</span>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            No transactions yet
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {recentInvoices.map((inv, index) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition-all cursor-pointer hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${index % 2 === 0 ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"}`}>
                      <span className="text-xs font-bold">
                        {(inv.customer_detail?.name?.[0] || inv.customer_name?.[0] || "C").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-800 truncate">
                        {inv.customer_detail?.name || inv.customer_name || "Walk-in"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(inv.created_at || inv.invoice_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        <span className="mx-1">•</span>#{inv.number || inv.id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="block text-xs font-bold text-slate-800">
                      +₹{Math.floor(Number(inv.grand_total || 0)).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[8px] text-indigo-400 font-bold">VIEW →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Load more (${totalCount - recentInvoices.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceModal invoice={selectedInvoice} shop={currentShop} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}
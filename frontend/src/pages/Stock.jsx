import React, { useState, useEffect, useRef } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/products";

// --- HOOKS ---
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) setMatches(media.matches);
        const listener = () => setMatches(media.matches);
        window.addEventListener("resize", listener);
        return () => window.removeEventListener("resize", listener);
    }, [matches, query]);
    return matches;
};

// --- REUSABLE DATA VIEW ---
const ResponsiveDataView = ({ isMobile, data, renderMobile, renderDesktop, noDataMessage }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-sky-200/50 rounded-2xl bg-white/30 backdrop-blur-sm">
                <div className="text-4xl mb-3 animate-pulse text-sky-400">✨</div>
                <div className="text-slate-600 font-medium">{noDataMessage}</div>
            </div>
        );
    }
    return isMobile ? (
        <div className="space-y-4">{data.map(renderMobile)}</div>
    ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-md">
            {renderDesktop()}
        </div>
    );
};

// --- BACKGROUND COMPONENT ---
const SparklingBackground = () => (
    <>
        {/* Lighter base blue gradient for background */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-50/40 via-sky-50/80 to-white -z-10"></div>
        {/* Arctic Blue Orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-sky-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-80 h-80 bg-blue-300/5 rounded-full blur-3xl"></div>
        <div className="absolute top-[40%] left-[30%] w-64 h-64 bg-sky-200/5 rounded-full blur-3xl"></div>
    </>
);

// --- STATS CARD COMPONENT ---
const StatsCard = ({ title, value, colorFrom, colorTo, shadowColor, accentColor }) => (
    <div className={`bg-white/80 backdrop-blur-lg border border-white/60 p-6 rounded-2xl shadow-xl ${shadowColor} relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}>
        {/* Corner Accent Blob */}
        <div className={`absolute top-0 right-0 w-24 h-24 ${accentColor} rounded-bl-full transition-all group-hover:scale-110 opacity-20`}></div>
        
        <div className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">{title}</div>
        <div className={`text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${colorFrom} ${colorTo} relative z-10`}>
            {value}
        </div>
    </div>
);

export default function Stock() {
    const [products, setProducts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", unit: "pcs", price: "", quantity: "", tax_rate: "0" });
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const [lowStockThreshold] = useState(5); 
    const [toast, setToast] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const lastDeleted = useRef(null);

    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => { load() }, []);

    const load = async () => {
        try {
            const res = await getProducts();
            const list = res?.data ?? res;
            setProducts(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Failed to load products:", err);
            setProducts([]);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await updateProduct(editing.id, form);
            } else {
                await createProduct(form);
            }
            closeModal();
            await load();
        } catch (err) {
            console.error("Save failed:", err.response?.data || err);
            alert("Failed to save product");
        }
    };

    const handleDelete = async (p) => {
        lastDeleted.current = p;
        setProducts(prev => prev.filter(x => x.id !== p.id)); 

        setToast({
            msg: `Deleted "${p.name}"`,
            action: async () => {
                try {
                    const { id, created_at, updated_at, ...payload } = lastDeleted.current;
                    await createProduct(payload);
                    await load();
                } catch (err) {
                    console.error("Undo failed:", err);
                    alert("Undo failed to restore product.");
                }
            },
        });

        try {
            await deleteProduct(p.id);
        } catch (err) {
            console.error("Delete API call failed:", err);
            setToast(null);
            alert("Failed to delete product from server.");
            await load(); 
        }
    };

    const adjustQty = async (p, change) => {
        const currentQty = Number(p.quantity || 0);
        const newQty = currentQty + Number(change);
        if (newQty < 0) return;

        const updatedProduct = { ...p, quantity: newQty };
        const backup = [...products];
        setProducts(prev => prev.map(x => (x.id === p.id ? updatedProduct : x)));

        try {
            const { id, ...payload } = updatedProduct;
            await updateProduct(p.id, payload);
        } catch (err) {
            console.error("Quantity update failed:", err.response?.data || err);
            setProducts(backup);
            alert("Failed to update quantity. Reverted.");
        }
    };

    const openModal = (product = null) => {
        setEditing(product);
        setForm(product ? {
            name: product.name ?? "",
            unit: product.unit ?? "pcs",
            price: product.price ?? "",
            quantity: product.quantity ?? "",
            tax_rate: product.tax_rate ?? product.gst ?? "0",
        } : { name: "", unit: "pcs", price: "", quantity: "", tax_rate: "0" });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    useEffect(() => {
        if (!toast) return;
        setCountdown(5);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setToast(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [toast]);

    const filtered = products.filter(p => (p.name || "").toString().toLowerCase().includes(search.toLowerCase()));

    const sorted = [...filtered].sort((a, b) => {
        if (!sortKey) return 0;
        let v1 = a[sortKey], v2 = b[sortKey];
        if (typeof v1 === 'string') {
            return sortDir === 'asc' ? v1.localeCompare(v2) : v2.localeCompare(v1);
        }
        return sortDir === 'asc' ? (v1 || 0) - (v2 || 0) : (v2 || 0) - (v1 || 0);
    });

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const handleEnter = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const formEls = Array.from(e.target.form.querySelectorAll("input, select"));
        const index = formEls.indexOf(e.target);
        if (index < formEls.length - 1) {
            formEls[index + 1].focus();
        } else {
            document.getElementById('modal-save-button')?.click();
        }
    };
    
    // --- FLAT & LIGHT SHADE CARD STYLES ---
    const getStockStyles = (p) => {
        const qty = Number(p.quantity);
        
        // Out of Stock: Light Rose Shade
        if (qty === 0) return {
            border: "border-t-4 border-t-rose-500 border-x border-b border-rose-100",
            bg: "bg-rose-50/50", 
            text: "text-rose-900",
            badge: "bg-white border-rose-200 text-rose-700"
        };

        // Low Stock: Light Amber Shade
        if (qty <= lowStockThreshold) return {
            border: "border-t-4 border-t-amber-400 border-x border-b border-amber-100",
            bg: "bg-amber-50/50", 
            text: "text-amber-900",
            badge: "bg-white border-amber-200 text-amber-700"
        };

        // Arctic Blue: Light Sky Blue Shade
        return {
            border: "border-t-4 border-t-sky-400 border-x border-b border-sky-100",
            bg: "bg-sky-50/50", 
            text: "text-slate-900", // Ensure high visibility
            badge: "bg-white border-sky-200 text-sky-700"
        };
    };

    return (
        <main className="min-h-screen font-sans text-slate-800 relative overflow-hidden p-4 md:p-8">
            {/* Page Background */}
            <SparklingBackground />

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
                            Inventory Management<span className="text-sky-400">.</span>
                        </h1>
                        <p className="text-slate-600 font-medium mt-1">Track your products efficiently.</p>
                    </div>
                    
                    {/* Action Button - Arctic Blue */}
                    <button 
                        onClick={() => openModal()} 
                        className="group relative overflow-hidden bg-slate-900 text-white py-3 px-6 rounded-xl shadow-xl shadow-slate-900/20 transition-all hover:scale-105 hover:shadow-slate-900/40"
                    >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity"></span>
                        <div className="flex items-center gap-2 font-bold tracking-wide text-sm relative z-10">
                            <span className="text-sky-300 text-lg">✦</span> Add Product
                        </div>
                    </button>
                </div>

                {/* Stats Cards */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <StatsCard 
                        title="Total Asset Value"
                        value={`₹${products.reduce((s, p) => s + (p.price || 0) * (p.quantity || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        colorFrom="from-emerald-600"
                        colorTo="to-teal-500"
                        shadowColor="shadow-emerald-100/50"
                        accentColor="bg-emerald-400"
                    />
                    <StatsCard 
                        title="Low Stock Alerts"
                        value={products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length}
                        colorFrom="from-amber-500"
                        colorTo="to-orange-500"
                        shadowColor="shadow-amber-100/50"
                        accentColor="bg-amber-400"
                    />
                    <StatsCard 
                        title="Depleted Stock"
                        value={products.filter(p => p.quantity == 0).length}
                        colorFrom="from-rose-600"
                        colorTo="to-pink-600"
                        shadowColor="shadow-rose-100/50"
                        accentColor="bg-rose-400"
                    />
                </section>

                {/* Search & Table Section */}
                <section className="space-y-6">
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search products..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="pl-10 w-full bg-white/90 backdrop-blur border border-slate-200 rounded-xl py-3 shadow-sm focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all text-slate-900" 
                        />
                    </div>

                    {/* Table/Cards - FLAT DESIGN (No Shadow) */}
                    <ResponsiveDataView
                        isMobile={isMobile}
                        data={sorted}
                        noDataMessage="No products found. Add one to get started!"
                        renderMobile={(p) => {
                            const style = getStockStyles(p);
                            return (
                                <div key={p.id} className={`p-6 rounded-xl backdrop-blur-sm transition-colors duration-200 ${style.bg} ${style.border}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`font-bold text-lg ${style.text}`}>{p.name}</h3>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{p.unit}</span> {/* Darker for visibility */}
                                        </div>
                                        <span className="font-bold text-slate-900 text-lg bg-white/60 px-2 py-1 rounded-lg border border-slate-100">₹{p.price}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-200/40">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${style.badge}`}>
                                            <span className="text-xs font-bold uppercase text-slate-600 opacity-70">Qty</span> {/* Darker for visibility */}
                                            <span className="font-bold text-lg text-slate-900">{p.quantity}</span> {/* Darker for visibility */}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => adjustQty(p, -1)} disabled={p.quantity <= 0} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50">-</button>
                                            <button onClick={() => adjustQty(p, 1)} className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-sky-300 hover:bg-sky-700 hover:text-white transition-colors">+</button>
                                            <div className="w-px h-6 bg-slate-300 mx-2 opacity-50"></div>
                                            <button onClick={() => openModal(p)} className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">✏️</button>
                                            <button onClick={() => handleDelete(p)} className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                        renderDesktop={() => (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="p-5 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort("name")}>Product Name {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th className="p-5 text-center cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort("quantity")}>Stock {sortKey === 'quantity' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th className="p-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort("price")}>Price {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                                        <th className="p-5 text-center">Tax</th>
                                        <th className="p-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sorted.map(p => {
                                        const style = getStockStyles(p);
                                        return (
                                        <tr key={p.id} className={`transition-colors duration-200 hover:bg-white/80 ${style.bg === 'bg-rose-50/50' ? 'bg-rose-50/30' : ''}`}>
                                            <td className="p-5">
                                                <div>
                                                    <div className="font-bold text-slate-900 text-base">{p.name}</div>
                                                    <div className="text-xs text-slate-600 font-semibold">{p.unit}</div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${style.badge}`}>
                                                    {p.quantity}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right font-bold text-slate-900">₹{Number(p.price || 0).toLocaleString('en-IN')}</td>
                                            <td className="p-5 text-center text-slate-600 font-medium">{p.tax_rate ?? p.gst}%</td>
                                            <td className="p-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => adjustQty(p, -1)} disabled={p.quantity <= 0} className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-rose-400 hover:text-rose-600 flex items-center justify-center transition-all disabled:opacity-30">-</button>
                                                    <button onClick={() => adjustQty(p, 1)} className="w-8 h-8 rounded-lg bg-slate-900 text-sky-300 hover:bg-sky-700 hover:text-white transition-all">+</button>
                                                    <div className="w-px h-5 bg-slate-300 mx-2"></div>
                                                    <button onClick={() => openModal(p)} className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">✏️</button>
                                                    <button onClick={() => handleDelete(p)} className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        )}
                    />
                </section>
            </div>

            {/* Modal - Uses Sparkling Background Design */}
            {showModal && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-300">
                <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl relative border border-white/50">
                    {/* Background applied to the modal itself */}
                    <SparklingBackground /> 
                    
                    {/* Glass Content Wrapper */}
                    <div className="relative z-10 bg-white/70 backdrop-blur-md h-full">
                        <div className="p-6 border-b border-white/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold tracking-wide text-slate-900 drop-shadow-sm">
                                {editing ? "Edit Product" : "New Product"}
                            </h3>
                            <button onClick={closeModal} className="text-slate-600 hover:text-slate-900 transition-colors bg-white/50 rounded-full p-1 w-8 h-8 flex items-center justify-center">✕</button>
                        </div>
                        
                        <form onSubmit={save} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={handleEnter} 
                                    className="w-full border-white/50 bg-white/60 rounded-xl focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 transition-all p-3 text-sm font-medium shadow-inner text-slate-900" placeholder="e.g. Blue Widget" required />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantity</label>
                                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} onKeyDown={handleEnter} 
                                        className="w-full border-white/50 bg-white/60 rounded-xl focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 transition-all p-3 text-sm font-medium shadow-inner text-slate-900" required min="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Price (₹)</label>
                                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} onKeyDown={handleEnter} 
                                        className="w-full border-white/50 bg-white/60 rounded-xl focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 transition-all p-3 text-sm font-medium shadow-inner text-slate-900" required min="0" step="0.01" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GST %</label>
                                    <select value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} onKeyDown={handleEnter} 
                                        className="w-full border-white/50 bg-white/60 rounded-xl focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 transition-all p-3 text-sm font-medium shadow-sm text-slate-900">
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
                                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} onKeyDown={handleEnter} 
                                        className="w-full border-white/50 bg-white/60 rounded-xl focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20 transition-all p-3 text-sm font-medium shadow-sm text-slate-900">
                                        <option value="pcs">pcs</option>
                                        <option value="kg">kg</option>
                                        <option value="ltr">ltr</option>
                                        <option value="box">box</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div className="p-4 border-t border-white/50 flex justify-end items-center gap-3 bg-white/40">
                            <button onClick={closeModal} type="button" className="text-sm font-bold text-slate-700 px-4 py-2 rounded-lg hover:bg-white/80 transition-colors">Cancel</button>
                            <button id="modal-save-button" onClick={save} type="button" className="text-sm font-bold bg-slate-900 text-sky-300 px-6 py-2 rounded-lg hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">Save Product</button>
                        </div>
                    </div>
                </div>
            </div>}

            {/* Toast - Dark Bow */}
            {toast && <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 w-full max-w-sm">
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl shadow-slate-900/30 border border-slate-700 flex items-center gap-4">
                    <div className="bg-sky-500/20 text-sky-300 p-2 rounded-full">✨</div>
                    <div className="flex-1">
                        <div className="font-medium text-sm text-sky-50">{toast.msg}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Auto-dismiss in {countdown}s</div>
                    </div>
                    <button onClick={async () => { await toast.action(); setToast(null); }} 
                        className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-colors">
                        Undo
                    </button>
                </div>
            </div>}
        </main>
    );
}

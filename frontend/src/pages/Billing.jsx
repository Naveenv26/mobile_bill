// frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { getProducts } from "../api/products.js";
import { createInvoice } from "../api/invoices.js";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { generateThermalPDF } from "../utils/pdfGenerator.js";

// --- Icons ---
const SearchIcon = () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>;
const MinusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ShareIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;
const ChevronRight = () => <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [search, setSearch] = useState("");
  
  const [applyTax, setApplyTax] = useState(true);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Live Shop Details
  const [currentShop, setCurrentShop] = useState(
    JSON.parse(localStorage.getItem("shop")) || { name: "My Shop", address: "", contact_phone: "", config: {} }
  );

  const { hasFeature } = useSubscription();
  const nameRef = useRef();
  const searchRef = useRef();

  useEffect(() => {
    const handleUpdate = () => {
        const updated = JSON.parse(localStorage.getItem("shop"));
        if (updated) setCurrentShop(updated);
    };
    window.addEventListener('shop-updated', handleUpdate);
    return () => window.removeEventListener('shop-updated', handleUpdate);
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const products = await getProducts();
const normalized = products.map((p) => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  unit: p.unit,
  tax_rate: Number(p.tax_rate || p.gst_percent || 0),
  stock: Number(p.quantity),
}));
setProducts(normalized);
    }  catch {
  toast.error("Could not load products.");
}
  };

  const addToCart = (p) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === p.id);
      if (found) return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...p, qty: 1 }];
    });
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-800 text-white shadow-lg rounded-full pointer-events-auto flex ring-1 ring-black ring-opacity-5 px-4 py-2 items-center justify-center mb-4`}>
        <div className="flex items-center">
             <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
             <p className="text-sm font-medium">Added <span className="font-bold">{p.name}</span></p>
        </div>
      </div>
    ), { duration: 1000 });
    setSearch(""); 
    searchRef.current?.focus();
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) {
        setCart(prev => prev.filter(c => c.id !== id));
        return;
    }
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty: newQty } : c)));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.qty * c.price, 0);
  const tax = applyTax ? cart.reduce((sum, c) => sum + (c.qty * c.price * (c.tax_rate || 0)) / 100, 0) : 0;
  const rawDiscount = applyDiscount && discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const discountAmount = Math.min(Math.max(0, rawDiscount), subtotal);
  const total = subtotal + tax - discountAmount;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  const finalizeInvoice = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (typeof hasFeature === 'function' && !hasFeature('billing')) return toast.error("Upgrade plan required.");

    try {
      const payload = {
        shop: currentShop.id,
        customer_name: customerName || "Walk-in",
        customer_mobile: customerMobile || "",
        items: cart.map((c) => ({
          product: c.id,
          qty: c.qty,
          unit_price: c.price,
          tax_rate: applyTax ? (c.tax_rate || 0) : 0,
        })),
        subtotal: subtotal,
        tax_total: tax,
        discount_total: discountAmount,
        total_amount: subtotal + tax,
        grand_total: total,
      };

      const res = await createInvoice(payload);
      const responseData = res.data || res; 

      const finalInvoiceData = {
          ...responseData,
          customer_name: responseData.customer_name || customerName || "Walk-in",
          customer_mobile: responseData.customer_mobile || customerMobile || ""
      };

      setInvoiceData(finalInvoiceData);
      setShowSuccessModal(true);
      setIsCartOpen(false); 

    } catch (err) {
      console.error("Invoice Error:", err);
      toast.error(err.response?.data?.message || "Failed to save invoice");
    }
  };

  // --- PDF LOGIC STARTS HERE ---

  const generateA4PDF = (doc, printData) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("INVOICE", pageWidth - margin, 20, { align: "right" });

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(currentShop.name || "Shop Name", margin, 20);
    
doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    let addrY = 28;
    const usableW = pageWidth / 2 - margin - 10;
    if (currentShop.address) {
      const addrLines = doc.splitTextToSize(currentShop.address, usableW);
      addrLines.forEach((line) => {
        doc.text(line, margin, addrY);
        addrY += 5;
      });
    }
    if (currentShop.contact_phone) {
      doc.text(`Phone: ${currentShop.contact_phone}`, margin, addrY);
      addrY += 5;
    }
    if (currentShop.contact_email) {
      doc.text(currentShop.contact_email, margin, addrY);
      addrY += 5;
    }

    const lineY = Math.max(addrY + 2, 38);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    // Bill To & Invoice Details
    const startY = lineY + 12;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Bill To:", margin, startY);
    
    doc.setFont("helvetica", "normal");
    doc.text(printData.customer_name || "Walk-in Customer", margin, startY + 6);
    if(printData.customer_mobile) doc.text(printData.customer_mobile, margin, startY + 11);

    doc.text(`Invoice No: ${printData.number || printData.id}`, pageWidth - margin, startY, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, startY + 6, { align: "right" });

    // Table
    const tableColumn = ["#", "Item Name", "Price", "Qty", "Tax %", "Total"];
    const tableRows = [];

    (printData.items || []).forEach((item, i) => {
      const price = Number(item.unit_price);
      const total = Number(item.qty) * price;
      tableRows.push([
          i + 1,
          item.product_name || item.name,
          price.toFixed(2),
          item.qty,
          item.tax_rate + "%",
          total.toFixed(2)
      ]);
    });

    autoTable(doc, {
      startY: startY + 20,
      head: [tableColumn],
      body: tableRows,
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin }
    });

    // Totals
    let finalY = doc.lastAutoTable.finalY + 10;
    const rightAlign = pageWidth - margin;
    
    const subtotal = Number(printData.subtotal || printData.total_amount || 0);
    const tax = Number(printData.tax_total || 0);
    const discount = Number(printData.discount_total || 0);

    doc.text(`Subtotal:`, rightAlign - 40, finalY, { align: "right" });
    doc.text(`${subtotal.toFixed(2)}`, rightAlign, finalY, { align: "right" });
    
    if (discount > 0) {
        finalY += 6;
        doc.setTextColor(0, 100, 0);
        doc.text(`Discount:`, rightAlign - 40, finalY, { align: "right" });
        doc.text(`-${discount.toFixed(2)}`, rightAlign, finalY, { align: "right" });
        doc.setTextColor(0, 0, 0);
    }
    
    if (tax > 0) {
        finalY += 6;
        doc.text(`CGST:`, rightAlign - 40, finalY, { align: "right" });
        doc.text(`${(tax / 2).toFixed(2)}`, rightAlign, finalY, { align: "right" });
        finalY += 6;
        doc.text(`SGST:`, rightAlign - 40, finalY, { align: "right" });
        doc.text(`${(tax / 2).toFixed(2)}`, rightAlign, finalY, { align: "right" });
    }

    finalY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Grand Total:`, rightAlign - 40, finalY, { align: "right" });
    doc.text(`Rs. ${Number(printData.grand_total).toFixed(2)}`, rightAlign, finalY, { align: "right" });

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", pageWidth / 2, 280, { align: "center" });
  };

  const _handleDownloadAndReset = async () => {
    setIsGeneratingPDF(true);
    try {
      const paperSize = currentShop?.config?.invoice?.paper_size || "80mm";
      const isA4 = paperSize === "A4";
      const { jsPDF } = await import("jspdf");
      if (isA4) {
          const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          generateA4PDF(doc, invoiceData);
          doc.save(`Invoice_${invoiceData?.number || 'Bill'}.pdf`);
      } else {
          const doc = generateThermalPDF(invoiceData, currentShop);
          doc.save(`Invoice_${invoiceData?.number || 'Bill'}.pdf`);
      }
    } catch (err) {
      console.error("PDF Gen Error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
      resetBilling();
    }
  };

 const generatePDFFile = (dataToPrint, forceA4 = false) => {
    const paperSize = forceA4 ? "A4" : (currentShop?.config?.invoice?.paper_size || "80mm");
    const isA4 = paperSize === "A4";

    if (isA4) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      generateA4PDF(doc, dataToPrint || invoiceData);
      return doc.output('blob');
    } else {
      // generateThermalPDF creates and returns its own doc
      const doc = generateThermalPDF(dataToPrint || invoiceData, currentShop);
      return doc.output('blob');
    }
  };

  const handleShare = async () => {
    setIsGeneratingPDF(true);
    try {
        const pdfBlob = generatePDFFile(invoiceData, true); 
        const file = new File([pdfBlob], `Invoice_${invoiceData?.number || 'Bill'}.pdf`, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Bill from ${currentShop.name}`,
                text: `Hello ${invoiceData?.customer_name}, here is your invoice.`,
            });
        } else {
             toast("Sharing not supported. Opening print dialog.");
             const url = URL.createObjectURL(pdfBlob);
             window.open(url, "_blank");
        }
    } catch (error) {
        console.error("Sharing failed", error);
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const resetBilling = async () => {
    setCart([]);
    setCustomerName("");
    setCustomerMobile("");
    setShowSuccessModal(false);
    setInvoiceData(null);
    await loadProducts();
    nameRef.current?.focus(); 
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-44 font-sans text-slate-800">
      
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all mt-[2px] lg:mt-0">
        <div className="px-5 py-3 flex justify-between items-center">
            <h1 className="font-extrabold text-slate-800 text-xl tracking-tight flex items-center gap-2">
               New Sale
            </h1>
            <button onClick={resetBilling} className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                Clear Form
            </button>
        </div>
        
        <div className="px-4 pb-2">
            <div className="flex gap-3 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
                <input 
                    ref={nameRef}
                    type="text" 
                    placeholder="Customer Name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-grow bg-white border-none rounded-xl px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                <input 
                    type="tel" 
                    placeholder="Mobile" 
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="w-28 sm:w-40 bg-white border-none rounded-xl px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
            </div>
        </div>

        <div className="px-4 pb-4">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500">
                    <SearchIcon />
                </div>
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 border-none rounded-2xl bg-white ring-1 ring-slate-200 placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                />
            </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
                const filteredProducts = (products || [])
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

                if (filteredProducts.length === 0) {
                    return (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                            <p>No products found</p>
                        </div>
                    );
                }
                
                return filteredProducts.map((p) => {
                    const inCart = cart.find(c => c.id === p.id);
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => p.stock > 0 && addToCart(p)} 
                            className={`
                                group relative overflow-hidden cursor-pointer flex flex-col justify-between
                                bg-white rounded-2xl p-5 min-h-[140px]
                                border border-transparent hover:border-indigo-100
                                shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)]
                                transition-all duration-300 transform hover:-translate-y-1
                                ${inCart ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="pr-4">
                                    <h3 className="font-bold text-slate-800 text-base leading-snug">{p.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {p.stock > 0 ? `${p.stock} in Stock` : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-sm font-extrabold shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    ₹{p.price}
                                </div>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between relative z-10 h-10">
                                <span className="font-extrabold text-lg text-slate-900 tracking-tight"></span> {/* Empty span to push controls right */}
                                
                                {inCart ? (
                                    <div className="flex items-center bg-indigo-50 rounded-xl border border-indigo-100" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateQty(inCart.id, inCart.qty - 1); }} 
                                            className="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-l-xl transition-colors"
                                        >
                                            <MinusIcon />
                                        </button>
                                        <span className="w-8 text-center font-extrabold text-indigo-900 text-sm">
                                            {inCart.qty}
                                        </span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); updateQty(inCart.id, inCart.qty + 1); }} 
                                            className="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 rounded-r-xl transition-colors"
                                        >
                                            <PlusIcon />
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${p.stock === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white group-hover:bg-indigo-600'}`}>
                                        <PlusIcon />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                });
            })()}
        </div>
      </div>

      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-24 md:bottom-8 left-4 right-4 z-30 animate-slide-up-fade">
            <button 
                onClick={() => setIsCartOpen(true)} 
                className="w-full bg-slate-900 text-white p-1 rounded-2xl shadow-xl shadow-slate-900/20 flex items-stretch overflow-hidden group hover:scale-[1.01] transition-transform"
            >
                <div className="flex-1 px-5 py-3 flex flex-col items-start justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{totalItems} Items</span>
                    <span className="text-xl font-bold tracking-tight">₹{total.toFixed(2)}</span>
                </div>
                <div className="bg-indigo-600 px-6 flex items-center justify-center rounded-xl transition-colors group-hover:bg-indigo-500">
                   <div className="flex items-center gap-2 font-bold">
                       View Bill <ChevronRight />
                   </div>
                </div>
            </button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm pb-20 sm:pb-0 transition-opacity">
            <div className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
                
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-pointer" onClick={() => setIsCartOpen(false)}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>
                
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">Current Bill</h2>
                        <p className="text-xs text-slate-400 font-medium">Review items before checkout</p>
                    </div>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center group">
                            <div className="flex-1 pr-4">
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{item.name}</h4>
                                <div className="text-xs font-medium text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded">₹{item.price} / unit</div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => updateQty(item.id, item.qty - 1)} 
                                    className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-full text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                                >
                                    {item.qty === 1 ? <TrashIcon /> : <MinusIcon />}
                                </button>
                                
                                <span className="w-6 text-center font-bold text-slate-800">{item.qty}</span>
                                
                                <button 
                                    onClick={() => updateQty(item.id, item.qty + 1)} 
                                    className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-all active:scale-90 shadow-md shadow-slate-300"
                                >
                                    <PlusIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* NEW TOGGLES SECTION */}
                <div className="px-6 py-2 border-t border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={applyTax} 
                                onChange={(e) => setApplyTax(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300" 
                            />
                            <span className="text-sm font-bold text-slate-700">Apply GST/Tax</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={applyDiscount} 
                                onChange={(e) => setApplyDiscount(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300" 
                            />
                            <span className="text-sm font-bold text-slate-700">Apply Discount</span>
                        </label>
                        {applyDiscount && (
                            <div className="flex items-center justify-end w-24">
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={discountPercent} 
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value) || 0;
                                        setDiscountPercent(Math.min(100, Math.max(0, val)));
                                    }}
                                    className="w-14 items-center justify-center text-center px-2 py-1 text-sm border border-slate-200 rounded-l-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                />
                                <span className="bg-slate-100 border border-l-0 border-slate-200 text-slate-500 text-sm font-bold px-2 py-1 rounded-r-lg">%</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 sm:rounded-b-2xl">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        
                        {applyTax && tax > 0 && (
                            <>
                                <div className="flex justify-between text-xs text-slate-400 pl-2">
                                    <span>CGST</span>
                                    <span>₹{(tax / 2).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 pl-2">
                                    <span>SGST</span>
                                    <span>₹{(tax / 2).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Total Tax</span>
                            <span>+₹{tax.toFixed(2)}</span>
                        </div>
                        
                        {applyDiscount && discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600 font-bold tracking-wide">
                                <span>Discount (-{discountPercent}%)</span>
                                <span>-₹{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between text-xl font-extrabold text-slate-900 pt-3 border-t border-slate-200">
                            <span>Total Amount</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={finalizeInvoice} 
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all active:scale-[0.98]"
                    >
                        Confirm Sale
                    </button>
                </div>
            </div>
        </div>
      )}

      {showSuccessModal && invoiceData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-pop-in relative overflow-hidden">
                  
                  <div className="absolute top-0 left-0 w-32 h-32 bg-green-50 rounded-full -translate-x-10 -translate-y-10 z-0"></div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-50 rounded-full translate-x-8 translate-y-8 z-0"></div>

                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-1">Success!</h2>
                    <p className="text-slate-400 text-sm mb-4">Invoice Generated Successfully</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                        <div className="text-sm text-slate-500 mb-1">Bill No: <span className="font-mono font-bold text-slate-700">#{invoiceData.number || invoiceData.id}</span></div>
                        <div className="text-lg font-bold text-indigo-600">{invoiceData.customer_name}</div>
                        <div className="text-2xl font-black text-slate-800 mt-2">₹{Number(invoiceData.grand_total).toFixed(2)}</div>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={handleShare} 
                            disabled={isGeneratingPDF}
                            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-green-100 active:scale-[0.98]"
                        >
                            {isGeneratingPDF ? 'Generating...' : <><ShareIcon /> Share on WhatsApp</>}
                        </button>
                        
                        <button onClick={() => {
                             const blob = generatePDFFile(invoiceData);
                             const url = URL.createObjectURL(blob);
                             window.open(url, "_blank");
                        }} className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition-colors">
                            Print Bill
                        </button>
                        
                        <button onClick={resetBilling} className="block w-full text-center mt-4 text-slate-400 text-sm font-semibold hover:text-indigo-600 transition-colors">
                            Start New Sale
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
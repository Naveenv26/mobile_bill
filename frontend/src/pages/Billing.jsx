// frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAllProducts } from "../api/products.js";
import { createInvoice, updateInvoice } from "../api/invoices.js";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { generateThermalPDF } from "../utils/pdfGenerator.js";
import { sharePdfNative, downloadPdfNative, isAndroidWebView } from "../utils/androidBridge.js";

// --- Icons ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);
const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const ShareIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
  </svg>
);
const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  const [invoiceType, setInvoiceType] = useState("INVOICE");

  const [currentShop, setCurrentShop] = useState(
    JSON.parse(localStorage.getItem("shop")) || { name: "My Shop", address: "", contact_phone: "", config: {} }
  );

  const { hasFeature } = useSubscription();
  const nameRef = useRef();
  const searchRef = useRef();

  const location = useLocation();
  const navigate = useNavigate();

  // ── Handle incoming EDIT state ──
  useEffect(() => {
    if (location.state?.editMode && location.state?.invoiceId) {
      const { invoiceId, initialCart, initialCustomer, initialDiscount, initialPaymentMode } = location.state;
      setIsEditMode(true);
      setEditInvoiceId(invoiceId);
      setInvoiceType(location.state?.invoiceType || "INVOICE");
      
      // Load initial data
      setCart(initialCart.map(it => ({
        id: it.product,
        name: it.product_name,
        price: it.unit_price,
        tax_rate: it.tax_rate,
        qty: it.qty,
        stock: 999999 // In edit mode, we temporarily ignore stock since we don't know the exact current stock vs previous sale qty yet
      })));
      setCustomerName(initialCustomer?.name || "");
      setCustomerMobile(initialCustomer?.mobile || "");
      if (initialDiscount > 0) {
        setApplyDiscount(true);
        // Calculate percentage for the UI if possible
        const st = initialCart.reduce((s, it) => s + it.qty * it.unit_price, 0);
        const p = Math.round((initialDiscount / st) * 100);
        setDiscountPercent(p || 0);
      }
    }
  }, [location.state]);

  useEffect(() => {
    const handleUpdate = () => {
      const updated = JSON.parse(localStorage.getItem("shop"));
      if (updated) setCurrentShop(updated);
    };
    window.addEventListener("shop-updated", handleUpdate);
    return () => window.removeEventListener("shop-updated", handleUpdate);
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchAllProducts();
      const normalized = data.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        unit: p.unit,
        tax_rate: Number(p.tax_rate || p.gst_percent || 0),
        stock: Number(p.quantity),
      }));
      setProducts(normalized);
    } catch {
      toast.error("Could not load products.");
    }
  };

  const addToCart = (p) => {
    const inCart = cart.find((c) => c.id === p.id);
    const currentQty = inCart ? inCart.qty : 0;
    
    const allowNegative = currentShop?.config?.inventory?.allowNegative ?? false;

    if (currentQty + 1 > p.stock && !allowNegative) {
      toast.error("Product out of stock!");
      return;
    }

    if (currentQty + 1 > p.stock) {
      toast("Selling from negative stock!", { icon: "⚠" });
    }

    setCart((prev) => {
      if (inCart) return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...p, qty: 1 }];
    });

    toast.custom(
      (t) => (
        <div className={`${t.visible ? "animate-enter" : "animate-leave"} bg-slate-800 text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2`}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-sm font-medium">Added <span className="font-bold">{p.name}</span></p>
        </div>
      ),
      { duration: 900 }
    );
    setSearch("");
    searchRef.current?.focus();
  };

  const updateQty = (id, newQty) => {
    if (newQty <= 0) { setCart((prev) => prev.filter((c) => c.id !== id)); return; }
    setCart((prev) => {
      const item = prev.find((c) => c.id === id);
      const allowNegative = currentShop?.config?.inventory?.allowNegative ?? false;
      if (item && newQty > item.stock && !allowNegative) {
        toast.error("Cannot exceed available stock.");
        return prev;
      }
      if (item && newQty > item.stock) {
        toast("Selling from negative stock!", { icon: "⚠" });
      }
      return prev.map((c) => (c.id === id ? { ...c, qty: newQty } : c));
    });
  };

  const updatePrice = (id, newPrice) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, price: newPrice } : c)));
  };

  // ── Totals ──────────────────────────────────────────────────────────────
  const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
  
  const subtotal = round(cart.reduce((sum, c) => sum + c.qty * c.price, 0));
  const tax = applyTax ? round(cart.reduce((sum, c) => sum + (c.qty * c.price * (c.tax_rate || 0)) / 100, 0)) : 0;
  const rawDiscount = applyDiscount && discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const discountAmount = round(Math.min(Math.max(0, rawDiscount), subtotal));
  const total = round(subtotal + tax - discountAmount);
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  // ── Invoice submit ──────────────────────────────────────────────────────
  const finalizeInvoice = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (typeof hasFeature === "function" && !hasFeature("billing")) return toast.error("Upgrade plan required.");

    // Stock check removed to allow negative billing

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
        subtotal,
        tax_total: tax,
        discount_total: discountAmount,
        grand_total: total,
        invoice_type: invoiceType,
      };

      let res;
      if (isEditMode && editInvoiceId) {
        res = await updateInvoice(editInvoiceId, payload);
      } else {
        res = await createInvoice(payload);
      }
      
      const responseData = res.data || res;
      const finalInvoiceData = {
        ...responseData,
        customer_name: responseData.customer_name || customerName || "Walk-in",
        customer_mobile: responseData.customer_mobile || customerMobile || "",
      };
      setInvoiceData(finalInvoiceData);
      setShowSuccessModal(true);
      setIsCartOpen(false);
    } catch (err) {
      console.error("Invoice Error:", err);
      toast.error(err.response?.data?.message || "Failed to process invoice");
    }
  };

  // ── PDF builder ─────────────────────────────────────────────────────────
  // logoBase64 is pre-fetched by generatePDFBlob so this stays synchronous
  const generateA4PDF = (doc, printData, logoBase64 = null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const rightAlign = pageWidth - margin;
  
  // 1. Header Section
  let currentY = 15;

  // Header Background Accent (Optional: creates a clean line at top)
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 2);

  // Logo (Left)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 10, 30, 20);
      currentY = 35; 
    } catch (e) { currentY = 15; }
  }

  // Shop Name & Info (Left)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(currentShop.name.toUpperCase(), margin, currentY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  currentY += 6;

  if (currentShop.address) {
    const addrLines = doc.splitTextToSize(currentShop.address, 80);
    addrLines.forEach(line => {
      doc.text(line, margin, currentY);
      currentY += 4;
    });
  }
  if (currentShop.contact_phone) {
    doc.text(`Ph: ${currentShop.contact_phone}`, margin, currentY);
    currentY += 4;
  }

  // Invoice Meta Info (Right Side - Top)
  const metaY = 15;
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("INVOICE", rightAlign, metaY, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`No: ${printData.number || printData.id}`, rightAlign, metaY + 8, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, rightAlign, metaY + 13, { align: "right" });

  // 2. Billing Section (Horizontal Rule)
  currentY = Math.max(currentY + 10, 45);
  doc.setDrawColor(230, 231, 235);
  doc.line(margin, currentY, rightAlign, currentY);
  currentY += 10;

  // Bill To (Left)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("BILL TO", margin, currentY);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  currentY += 6;
  doc.text(printData.customer_name || "Walk-in Customer", margin, currentY);
  if (printData.customer_mobile) {
    currentY += 5;
    doc.text(printData.customer_mobile, margin, currentY);
  }

  // 3. Table Section
  const tableColumn = ["#", "Item Name", "Price (₹)", "Qty", "Tax %", "Total (₹)"];
  const tableRows = (printData.items || []).map((item, i) => [
    i + 1,
    item.product_name || item.name,
    Number(item.unit_price).toFixed(2),
    item.qty,
    `${item.tax_rate}%`,
    (Number(item.qty) * Number(item.unit_price)).toFixed(2)
  ]);

  autoTable(doc, {
    startY: currentY + 10,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { textColor: 50 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // 4. Totals Section
  let finalY = doc.lastAutoTable.finalY + 10;
  const statsX = rightAlign - 60; // Label start

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const rowHeight = 6;
  const drawTotalRow = (label, value, isBold = false) => {
    if (isBold) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
    }
    doc.text(label, statsX, finalY);
    doc.text(value, rightAlign, finalY, { align: "right" });
    finalY += rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
  };

  drawTotalRow("Subtotal:", Number(printData.subtotal).toFixed(2));
  
  if (Number(printData.discount_total) > 0) {
    doc.setTextColor(220, 38, 38);
    drawTotalRow("Discount:", `-${Number(printData.discount_total).toFixed(2)}`);
  }
  
  if (Number(printData.tax_total) > 0) {
    drawTotalRow("GST Total:", Number(printData.tax_total).toFixed(2));
  }

  finalY += 2;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(statsX, finalY - 4, rightAlign, finalY - 4);
  
  drawTotalRow("GRAND TOTAL:", `Rs. ${Number(printData.grand_total).toFixed(2)}`, true);

  // 5. Footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", pageWidth / 2, pageHeight - 15, { align: "center" });
};

  const generatePDFBlob = async (dataToPrint) => {
    const paperSize = currentShop?.config?.invoice?.paper_size || "80mm";
    const isA4 = paperSize === "A4";

    // Get logo from shop config
    const logoBase64 = currentShop?.config?.logo_base64 || null;

    if (isA4) {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      generateA4PDF(doc, dataToPrint || invoiceData, logoBase64);
      return doc.output("blob");
    } else {
      const doc = await generateThermalPDF(dataToPrint || invoiceData, currentShop);
      return doc.output("blob");
    }
  };

  const invoiceFilename = `Invoice_${invoiceData?.number || invoiceData?.id || "Bill"}.pdf`;

  // ── Share (WhatsApp / native) ───────────────────────────────────────────
  const handleShare = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDFBlob(invoiceData);
      await sharePdfNative(blob, invoiceFilename, {
        title: `Bill from ${currentShop.name}`,
        text: `Hello ${invoiceData?.customer_name}, here is your invoice.`,
      });
    } catch (err) {
      console.error("Share failed", err);
      toast.error("Could not share invoice.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Download / Print ────────────────────────────────────────────────────
  // In WebView: saves to Downloads folder via bridge
  // In browser: downloads via <a> tag
  const handleDownload = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDFBlob(invoiceData);
      await downloadPdfNative(blob, invoiceFilename);
      if (onAndroid) toast.success("Saved to Downloads!");
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Could not save invoice.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────
  const resetBilling = async () => {
    setCart([]);
    setCustomerName("");
    setCustomerMobile("");
    setShowSuccessModal(false);
    setInvoiceData(null);
    setIsEditMode(false);
    setEditInvoiceId(null);
    navigate("/billing", { state: {}, replace: true });
    await loadProducts();
    nameRef.current?.focus();
  };

  const filteredProducts = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-44 font-sans text-slate-800">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm mt-[6px] lg:mt-0">
        <div className="px-3 py-3 flex justify-between items-center">
          <h1 className="font-extrabold text-slate-800 text-lg tracking-tight truncate">
            {isEditMode ? "Edit Sale" : "New Sale"}
          </h1>
          <button
            onClick={resetBilling}
            className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            {isEditMode ? "Cancel" : "Clear"}
          </button>
        </div>

        {/* --- Document Type Selection (Dropdown) --- */}
        <div className="px-3 pb-2">
          <div className="relative">
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className={`
                w-full appearance-none bg-white border-2 border-black rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all
                ${invoiceType === "QUOTATION" ? "text-amber-600 border-amber-500" : "text-indigo-600 border-indigo-500"}
              `}
            >
              <option value="INVOICE">📄 Sales Invoice</option>
              <option value="QUOTATION">📝 Quotation / Estimate</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="px-4 pb-2">
            <input
              ref={nameRef}
              type="text"
              placeholder="Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="flex-grow bg-white border-none rounded-xl px-2.5 py-2 text-sm font-medium placeholder:text-[10px] sm:placeholder:text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-0"
            />
            <input
              type="tel"
              placeholder="Mobile"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              className="w-24 bg-white border-none rounded-xl px-2.5 py-2 text-sm font-medium placeholder:text-[10px] sm:placeholder:text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        <div className="px-3 pb-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-indigo-500">
              <SearchIcon />
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border-none rounded-xl bg-white ring-1 ring-slate-200 placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-sm"
            />
          </div>
        </div>

      {/* ── Product Grid ── */}
      <div className="px-3 py-3 max-w-7xl mx-auto">
        {filteredProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-slate-400 text-sm">
            No products found
          </div>
        ) : (
          /* ── COMPACT LIST LAYOUT (mobile-first POS) ── */
          <div className="flex flex-col gap-2">
            {filteredProducts.map((p) => {
              const inCart = cart.find((c) => c.id === p.id);
              const remainingStock = p.stock - (inCart?.qty || 0);
              const outOfStock = remainingStock <= 0;
              const isInitiallyOutOfStock = p.stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`
                    group relative overflow-hidden
                    bg-white rounded-2xl p-3 flex items-center gap-2.5
                    border border-slate-100 shadow-sm
                    active:scale-[0.97]
                    transition-all duration-200 cursor-pointer select-none
                    ${isInitiallyOutOfStock ? "bg-amber-50/30" : ""}
                    ${inCart ? "ring-2 ring-indigo-500 bg-indigo-50/50 shadow-indigo-100" : "hover:border-indigo-200 hover:shadow-md"}
                  `}
                >
                  {/* Subtle Glow Background for In-Cart */}
                  {inCart && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-y-12 translate-x-12 blur-2xl pointer-events-none" />
                  )}
                  {/* Left: Name + stock */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${remainingStock > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {remainingStock > 0 ? `${remainingStock} left` : `Stock: ${remainingStock}`}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-sm font-black text-slate-900 mr-2">
                    ₹{p.price}
                  </div>

                  {/* Qty controls or + button */}
                  {inCart ? (
                    <div
                      className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 relative z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => updateQty(inCart.id, inCart.qty - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        {inCart.qty === 1 ? <TrashIcon /> : <MinusIcon />}
                      </button>
                      <input
                        type="number"
                        value={inCart.qty === 0 ? "" : inCart.qty}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                          if (isNaN(val)) return;
                          updateQty(inCart.id, val);
                        }}
                        className="w-9 text-center font-black text-slate-900 text-xs bg-slate-50/50 border-x border-slate-100 focus:ring-0 focus:bg-white p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors"
                      />
                      <button
                        onClick={() => updateQty(inCart.id, inCart.qty + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      className={`w-9 h-9 rounded-xl border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center flex-shrink-0 transition-all active:shadow-none active:translate-x-[1px] active:translate-y-[1px] ${outOfStock ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white"}`}
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating Cart Bar ── */}
        {cart.length > 0 && !isCartOpen && (
          <div className="fixed bottom-[80px] md:bottom-[80px] lg:bottom-[15px] left-4 right-4 lg:left-80 lg:right-8 z-40 transition-all duration-300">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full max-w-5xl mx-auto bg-slate-900 text-white p-1 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-stretch overflow-hidden active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              <div className="flex-1 px-6 py-3 flex flex-col items-start justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {totalItems} Items
                </span>
                <span className="text-xl font-black tracking-tight">
                  ₹{total.toFixed(2)}
                </span>
              </div>
              <div className="bg-indigo-600 px-8 flex items-center justify-center rounded-xl border-l-2 border-black">
                <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-tight">
                  View Bill <ChevronRight />
                </div>
              </div>
            </button>
          </div>
        )}

      {/* ── Cart Drawer ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm pb-16 sm:pb-0">
          <div className="bg-white w-full sm:w-[500px] sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl max-h-[88vh] flex flex-col border-t border-slate-100 sm:border-none">
            {/* Drag handle (mobile) */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-pointer" onClick={() => setIsCartOpen(false)}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Current Bill</h2>
                <p className="text-xs text-slate-400 font-medium">Review before checkout</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 bg-slate-50/80 rounded-2xl border border-slate-100 p-2.5 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-[13px] leading-tight truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Price:</span>
                      <input 
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-14 bg-white border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-0 p-0 text-[11px] font-black text-indigo-600 rounded-sm px-1"
                        title="Manual Price Edit"
                      />
                    </div>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                      {item.qty === 1 ? <TrashIcon /> : <MinusIcon />}
                    </button>
                    <input
                      type="number"
                      value={item.qty === 0 ? "" : item.qty}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                        if (isNaN(val)) return;
                        updateQty(item.id, val);
                      }}
                      className="w-8 text-center font-black text-slate-900 text-xs bg-slate-50/30 border-x border-slate-100 focus:ring-0 p-0 [appearance:textfield] transition-colors"
                    />
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                      <PlusIcon />
                    </button>
                  </div>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm w-12 text-right flex-shrink-0">
                    ₹{(item.qty * item.price).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Tax & Discount toggles */}
            <div className="px-5 py-3 border-t border-slate-100 bg-white space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                <span className="text-sm font-bold text-slate-700">Apply GST / Tax</span>
              </label>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                  <span className="text-sm font-bold text-slate-700">Apply Discount</span>
                </label>
                {applyDiscount && (
                  <div className="flex items-center">
                    <input
                      type="number" min="0" max="100" value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-14 text-center px-2 py-1 text-sm border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="bg-slate-100 border border-l-0 border-slate-300 text-slate-600 text-sm font-bold px-2 py-1 rounded-r-lg">%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals + Checkout */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 sm:rounded-b-3xl">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
                {applyTax && tax > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-400 pl-2"><span>CGST (9%)</span><span>₹{(tax / 2).toFixed(2)}</span></div>
                    <div className="flex justify-between text-[11px] text-slate-400 pl-2"><span>SGST (9%)</span><span>₹{(tax / 2).toFixed(2)}</span></div>
                  </>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-xs font-bold text-slate-500"><span>Total Tax</span><span>+₹{tax.toFixed(2)}</span></div>
                )}
                {applyDiscount && discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-black text-emerald-600"><span>Discount ({discountPercent}%)</span><span>-₹{discountAmount.toFixed(0)}</span></div>
                )}
                <div className="flex justify-between items-end pt-3 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-500 mb-1">Grand Total</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">₹{total.toFixed(0)}</span>
                </div>
              </div>
              <button
                onClick={finalizeInvoice}
                className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-[0.98] ${invoiceType === "QUOTATION" ? "bg-amber-500 shadow-amber-200/50 hover:bg-amber-600" : "bg-indigo-600 shadow-indigo-200/50 hover:bg-indigo-700"}`}
              >
                {isEditMode ? "Update" : "Confirm"} {invoiceType === "QUOTATION" ? "Quotation" : "Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && invoiceData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden border border-slate-100">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-x-12 -translate-y-12 z-0 blur-2xl" />
            
            <div className="relative z-10">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-extrabold text-slate-800 mb-0.5">
                {isEditMode ? "Update Complete!" : "Sale Complete!"}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {isEditMode ? "Invoice updated successfully" : "Invoice saved successfully"}
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 mb-5 border-2 border-black text-left">
                <div className="text-xs text-slate-500 mb-0.5">Bill No: <span className="font-mono font-bold text-slate-700">#{invoiceData.number || invoiceData.id}</span></div>
                <div className="font-bold text-slate-800">{invoiceData.customer_name}</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">₹{Number(invoiceData.grand_total).toFixed(2)}</div>
              </div>

              <div className="space-y-3">
                {/* Share button — WhatsApp on web, native share sheet on Android */}
                <button
                  onClick={handleShare}
                  disabled={isGeneratingPDF}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-60 text-white py-3.5 rounded-xl font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  {isGeneratingPDF ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generating...</span>
                  ) : (
                    <><ShareIcon /> {onAndroid ? "Share Invoice" : "Share on WhatsApp"}</>
                  )}
                </button>

                {/* Download / Print — saves to Downloads on Android, browser download on web */}
                <button
                  onClick={handleDownload}
                  disabled={isGeneratingPDF}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  <DownloadIcon /> {onAndroid ? "Save to Downloads" : "Download PDF"}
                </button>

                <button
                  onClick={resetBilling}
                  className="block w-full text-center mt-2 text-slate-400 text-sm font-semibold hover:text-indigo-600 transition-colors py-1"
                >
                  Start New Sale →
                </button>
              </div>
            </div>
  
        </div>
      )}
    </div>
  );
}

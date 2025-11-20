// frontend/src/pages/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { getProducts } from "../api/products.js";
import { createInvoice } from "../api/invoices.js";
import { useSubscription } from "../context/SubscriptionContext.jsx";
import toast from "react-hot-toast";

// --- PDF Generation Libraries ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Import autoTable directly

// --- Icons ---
const SearchIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const MinusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>;
const TrashIcon = () => <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const ShareIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;


export default function Billing() {
  // --- State ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Input States (Controlled inputs for Name/Mobile)
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [search, setSearch] = useState("");
  
  // UI States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { hasFeature } = useSubscription();

  const nameRef = useRef();
  const searchRef = useRef();
  const shop = JSON.parse(localStorage.getItem("shop")) || { name: "My Shop", address: "", contact_phone: "" };

  // --- Load Products ---
  const loadProducts = async () => {
    try {
      const res = await getProducts();
      const data = res.data || res;
      const normalized = Array.isArray(data)
        ? data.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            unit: p.unit,
            tax_rate: Number(p.tax_rate || p.gst_percent || 0),
            stock: Number(p.quantity),
          }))
        : [];
      setProducts(normalized);
    } catch (err) {
      toast.error("Could not load products.");
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // --- Cart Logic ---
  const addToCart = (p) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === p.id);
      if (found) return prev.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...p, qty: 1 }];
    });
    toast.success(`Added ${p.name}`, { position: 'bottom-center', duration: 800, style: { fontSize: '12px' } });
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
  const tax = cart.reduce((sum, c) => sum + (c.qty * c.price * (c.tax_rate || 0)) / 100, 0);
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  // --- Finalize Logic ---
  const finalizeInvoice = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (typeof hasFeature === 'function' && !hasFeature('billing')) return toast.error("Upgrade plan required.");

    try {
      const payload = {
        shop: shop.id,
        customer_name: customerName || "Walk-in",
        customer_mobile: customerMobile || "",
        items: cart.map((c) => ({
          product: c.id,
          qty: c.qty,
          unit_price: c.price,
          tax_rate: c.tax_rate || 0,
        })),
        total_amount: total,
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

  // --- PDF Generator Function (Fixed & Aligned) ---
const generatePDFFile = (dataToPrint) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] 
    });

    const printData = dataToPrint || invoiceData;
    if (!printData) return;

    // --- 1. HEADER ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(shop.name || "Shop Name", 40, 8, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(shop.address || "", 40, 12, { align: "center" });
    doc.text(`Ph: ${shop.contact_phone || ""}`, 40, 16, { align: "center" });

    doc.line(4, 18, 76, 18); 

    // --- 2. CUSTOMER META (Split Left/Right) ---
    let y = 23;
    const leftX = 4;  
    const rightX = 76; 
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Row 1: Name (Left) - Date (Right)
    doc.text(`Name: ${printData.customer_name || "Walk-in"}`, leftX, y, { align: "left" });
    doc.text(`${new Date().toLocaleDateString()}`, rightX, y, { align: "right" });
    y += 5;

    // Row 2: Mobile (Left) - Bill No (Right)
    if (printData.customer_mobile) {
        doc.text(`Mob: ${printData.customer_mobile}`, leftX, y, { align: "left" });
    }
    doc.text(`Bill No: #${printData.number || printData.id}`, rightX, y, { align: "right" });

    // --- 3. TABLE ---
    const tableColumn = ["Item", "Qty", "Price", "Tot"];
    const tableRows = [];

    (printData.items || []).forEach(item => {
      const name = item.product_name || item.name || "Item";
      const displayName = name.length > 12 ? name.substring(0, 12) + ".." : name;
      const qty = item.qty;
      const price = item.unit_price || item.price;
      const total = qty * price;

      tableRows.push([displayName, qty, Math.round(price), Math.round(total)]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: y + 4,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' },
      columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 10, halign: 'center' },
          2: { cellWidth: 15, halign: 'right' },
          3: { cellWidth: 15, halign: 'right' },
      },
      margin: { left: 3, right: 3 }
    });

    // --- 4. TOTALS BREAKDOWN (Added Tax Here) ---
    let finalY = doc.lastAutoTable.finalY + 5;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    // Calculate Subtotal & Tax if not directly provided by backend
    const subTotalAmt = Number(printData.subtotal || printData.total_amount || 0); 
    const taxAmt = Number(printData.tax_total || (printData.grand_total - subTotalAmt) || 0);
    const grandTotal = Number(printData.grand_total || 0);

    // Subtotal
    doc.text(`Subtotal: ${subTotalAmt.toFixed(2)}`, 76, finalY, { align: "right" });
    finalY += 4;

    // Tax
    doc.text(`Tax: ${taxAmt.toFixed(2)}`, 76, finalY, { align: "right" });
    finalY += 5;

    // Grand Total (Bold & Larger)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: Rs. ${grandTotal.toFixed(2)}`, 76, finalY, { align: "right" });

    // Footer
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("*** Thank You Visit Again ***", 40, finalY + 8, { align: "center" });

    return doc.output('blob');
  };
  // --- Share Logic ---
  const handleShare = async () => {
    setIsGeneratingPDF(true);
    try {
        const pdfBlob = generatePDFFile(invoiceData); 
        const file = new File([pdfBlob], `Invoice_${invoiceData?.number || 'Bill'}.pdf`, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Bill from ${shop.name}`,
                text: `Hello ${invoiceData?.customer_name}, here is your invoice.`,
            });
        } else {
             toast("Sharing not supported on this device. Opening print dialog.");
             // Fallback to print if Web Share API not supported for files
             window.print(); 
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
    nameRef.current?.focus(); // Focus on customer name input after reset
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-32 md:pb-10 font-sans">
      
      {/* --- Top Header & Customer Input --- */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
            <h1 className="font-bold text-gray-800 text-lg">New Sale</h1>
            <button onClick={resetBilling} className="text-xs text-blue-600 font-bold">Reset</button>
        </div>
        
        <div className="p-3 grid grid-cols-5 gap-2">
            <input 
                ref={nameRef}
                type="text" 
                placeholder="Customer Name" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="col-span-3 bg-gray-100 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
            <input 
                type="tel" 
                placeholder="Mobile" 
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="col-span-2 bg-gray-100 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
        </div>

        <div className="px-3 pb-3">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                </div>
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search item..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl leading-5 bg-white ring-1 ring-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm shadow-sm transition-all"
                />
            </div>
        </div>
      </div>

      {/* --- Product Grid --- */}
      <div className="p-3 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(products || [])
                .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                .map((p) => {
                    const inCart = cart.find(c => c.id === p.id);
                    return (
                        <div key={p.id} onClick={() => addToCart(p)} className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform ${inCart ? 'ring-1 ring-blue-500 bg-blue-50/30' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-base">{p.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1">Stock: {p.stock}</p>
                                </div>
                                <div className="bg-gray-50 px-2 py-1 rounded-lg"><span className="font-bold text-gray-900">₹{p.price}</span></div>
                            </div>
                            {inCart && <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-100 w-fit px-2 py-0.5 rounded-full">{inCart.qty} in cart</div>}
                        </div>
                    )
                })
            }
            {products.length === 0 && <div className="text-center p-10 text-gray-400">Loading products...</div>}
        </div>
      </div>

      {/* --- Floating Checkout Bar --- */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30">
            <button onClick={() => setIsCartOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center transform transition-all hover:scale-[1.02]">
                <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-400 font-medium uppercase">{totalItems} Items</span>
                    <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm bg-white/10 px-4 py-2 rounded-xl">Cart <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></div>
            </button>
        </div>
      )}

      {/* --- Cart Drawer --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-3xl sm:rounded-b-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={() => setIsCartOpen(false)}><div className="w-12 h-1.5 bg-gray-300 rounded-full"></div></div>
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Current Bill</h2>
                    <button onClick={() => setIsCartOpen(false)} className="text-gray-500">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0">
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800">{item.name}</h4>
                                <p className="text-sm text-gray-500">₹{item.price} x {item.qty}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="p-2 bg-white rounded-md shadow-sm">{item.qty === 1 ? <TrashIcon /> : <MinusIcon />}</button>
                                <span className="w-4 text-center font-bold text-sm">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="p-2 bg-white rounded-md shadow-sm"><PlusIcon /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 bg-gray-50 rounded-b-2xl">
                    <div className="flex justify-between mb-6 text-xl font-bold text-gray-900"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                    <button onClick={finalizeInvoice} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors">Confirm Sale</button>
                </div>
            </div>
        </div>
      )}

      {/* --- Success Modal --- */}
      {showSuccessModal && invoiceData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl animate-pop-in">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Bill Saved!</h2>
                  <p className="text-gray-500 mt-1">#{invoiceData.number || invoiceData.id}</p>
                  
                  <p className="text-sm font-medium text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full mt-2">
                      {invoiceData.customer_name}
                  </p>

                  <div className="space-y-3 mt-6">
                      <button 
                        onClick={handleShare} 
                        disabled={isGeneratingPDF}
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold transition-colors"
                      >
                          {isGeneratingPDF ? 'Generating PDF...' : <><ShareIcon /> Share PDF (WhatsApp)</>}
                      </button>
                      
                      <div className="grid grid-cols-1 gap-3"> {/* Changed to 1 column after SMS removal */}
                        {/* "Mark as Unpaid" functionality will be implemented in a dedicated Invoice Details/Report page */}
                        {/* For now, this is a placeholder */}
                        {/* <button onClick={() => toast.error("To be implemented: Mark as Unpaid")} className="flex items-center justify-center gap-2 bg-red-100 text-red-700 py-3 rounded-xl font-bold">
                            Mark as Unpaid
                        </button> */}
                        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                            Print Thermal Bill
                        </button>
                      </div>
                      <button onClick={resetBilling} className="w-full mt-4 text-gray-400 text-sm py-2 hover:text-gray-600">Start New Bill</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- Global Print Styles for window.print() --- */}
      {/* --- FIXED PRINT STYLES --- */}

{/* --- CSS FOR THERMAL PRINTING (80mm) --- */}
      <style>{`
        /* Hide print container on screen */
        #printableBillContent { display: none; }

        @media print {
            /* 1. Setup 80mm Paper */
            @page {
                size: 80mm auto; /* Width 80mm, Height dynamic */
                margin: 0;       /* no browser margins, we handle it in container */
            }

            /* 2. Hide App UI */
            body * { visibility: hidden; }
            
            /* 3. Show & Style Receipt Container */
            #printableBillContent, #printableBillContent * {
                visibility: visible;
            }
            
            #printableBillContent {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 80mm; /* Force 80mm width */
                
                /* --- USER REQUESTED MARGINS --- */
                /* Top/Bottom: 6mm, Left/Right: 4mm */
                padding: 6mm 4mm; 
                
                box-sizing: border-box; /* Includes padding in width calculation */
                font-family: 'Courier New', monospace; /* Monospace aligns numbers better */
                font-size: 11px;
                line-height: 1.2;
                background: white;
            }

            /* Header */
            .print-header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .print-header h2 { margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase; }
            .print-header p { margin: 2px 0; font-size: 11px; }

            /* Metadata (Split View) */
            .print-meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }

            /* Table Styling */
            .print-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .print-table th { 
                border-bottom: 1px dashed #000; 
                border-top: 1px dashed #000;
                text-align: left; 
                padding: 4px 0;
                font-size: 10px;
                text-transform: uppercase;
            }
            .print-table td { padding: 4px 0; vertical-align: top; }
            
            /* --- COLUMN SPACING FIX --- */
            /* Item: 40% */
            .print-table th:nth-child(1), .print-table td:nth-child(1) { width: 40%; text-align: left; }
            /* Qty: 15% */
            .print-table th:nth-child(2), .print-table td:nth-child(2) { width: 15%; text-align: center; }
            /* Price: 20% - Added padding-right to separate from Total */
            .print-table th:nth-child(3), .print-table td:nth-child(3) { width: 20%; text-align: right; padding-right: 2mm; }
            /* Total: 25% */
            .print-table th:nth-child(4), .print-table td:nth-child(4) { width: 25%; text-align: right; }

            /* Breakdown Section */
            .print-breakdown { margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
            .print-breakdown-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .print-breakdown-row.total { font-size: 14px; font-weight: bold; margin-top: 8px; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; }

            .print-footer { text-align: center; margin-top: 15px; font-size: 10px; font-style: italic; }
        }
      `}</style>

      {/* --- HTML FOR THERMAL PRINTING --- */}
      <div id="printableBillContent">
        {invoiceData && (
          <>
            <div className="print-header">
              <h2>{shop.name}</h2>
              <p>{shop.address}</p>
              <p>Ph: {shop.contact_phone}</p>
            </div>
            
            <div className="print-meta-row">
                <span>Name: {invoiceData.customer_name.substring(0, 15)}</span>
                <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="print-meta-row">
                <span>{invoiceData.customer_mobile ? `Mob: ${invoiceData.customer_mobile}` : ''}</span>
                <span>#{invoiceData.number || invoiceData.id}</span>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Tot</th>
                </tr>
              </thead>
              <tbody>
                {(invoiceData.items || []).map((it, idx) => (
                  <tr key={idx}>
                    {/* Truncate Item name slightly for print */}
                    <td>{it.product_name ? it.product_name.substring(0, 18) : "Item"}</td>
                    <td>{it.qty}</td>
                    <td>{Number(it.unit_price || it.price).toFixed(2)}</td>
                    <td>{Number((it.unit_price || it.price) * it.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="print-breakdown">
                <div className="print-breakdown-row">
                    <span>Subtotal:</span>
                    <span>{Number(invoiceData.subtotal || invoiceData.total_amount).toFixed(2)}</span>
                </div>
                <div className="print-breakdown-row">
                    <span>Tax:</span>
                    <span>{Number(invoiceData.tax_total || 0).toFixed(2)}</span>
                </div>
                <div className="print-breakdown-row total">
                    <span>TOTAL:</span>
                    <span>Rs. {Number(invoiceData.grand_total).toFixed(2)}</span>
                </div>
            </div>

            <div className="print-footer">
              *** Thank You Visit Again ***
            </div>
          </>
        )}
      </div>
    </div>
  );
}
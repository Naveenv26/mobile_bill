// frontend/src/components/InvoiceModal.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sharePdfNative, downloadPdfNative, isAndroidWebView } from "../utils/androidBridge.js";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val || 0));

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Icons ────────────────────────────────────────────────────────────────────
const CloseIcon    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const PrintIcon    = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const ShareIcon    = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>;
const DownloadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const TrashIcon    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const EditIcon     = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

// ── Print via hidden iframe ───────────────────────────────────────────────────
const printBlobURL = (url) => {
  const old = document.getElementById("__invoice_print_frame");
  if (old) old.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "__invoice_print_frame";
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  iframe.src = url;
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    catch { window.open(url, "_blank"); }
    setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 60000);
  };
  document.body.appendChild(iframe);
};

// ── 80mm Thermal PDF — LEFT aligned, with logo ───────────────────────────────
const buildThermalDoc = (invoice, shop, logoBase64 = null) => {
  const pageW = 80;
  const lx = 4;
  const rx = 76;

  // Pass 1 — measure height
  const measure = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });
  measure.setFontSize(7);

  let LOGO_H = 0, LOGO_W = 0;
  if (logoBase64) {
    const img = new Image();
    img.src = logoBase64;
    LOGO_W = 16; LOGO_H = 16; // default safe size; actual ratio applied in pass 2
  }

  let fy = 4;
  if (logoBase64) fy += LOGO_H + 3;
  fy += 5; // shop name
  if (shop?.address) { const lines = measure.splitTextToSize(shop.address, pageW - lx - 4); fy += lines.length * 4; }
  if (shop?.contact_phone) fy += 4;
  if (shop?.contact_email) fy += 4;
  fy += 6; // divider
  fy += 10; // customer rows

  const tableRows = (invoice.items || []).map((item) => {
    const name = (item.product_name || item.name || "Item");
    return [name.length > 14 ? name.substring(0, 14) + ".." : name, item.qty, Math.round(item.unit_price), Math.round(Number(item.qty) * Number(item.unit_price))];
  });

  autoTable(measure, {
    head: [["Item", "Qty", "Price", "Tot"]], body: tableRows, startY: fy + 2,
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 10 }, 2: { cellWidth: 17 }, 3: { cellWidth: 18 } },
    margin: { left: lx, right: lx },
  });
  fy = measure.lastAutoTable.finalY + 6;

  const tax      = Number(invoice.tax_total || 0);
  const discount = Number(invoice.discount_total || 0);
  fy += 5;
  if (discount > 0) fy += 5;
  if (tax > 0) fy += 10;
  fy += 4 + 6 + 10 + 5 + 6;

  const terms = shop?.config?.invoice?.terms || "";
  if (terms) { const tl = measure.splitTextToSize(`T&C: ${terms}`, pageW - 8); fy += tl.length * 4 + 2; }

  // Pass 2 — render
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, fy] });
  let cur = 4;

  // Logo top-left
  if (logoBase64) {
    try {
      const img = new Image(); img.src = logoBase64;
      const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      LOGO_W = Math.min(16, 16 * ratio); LOGO_H = LOGO_W / ratio;
      if (LOGO_H > 16) { LOGO_H = 16; LOGO_W = LOGO_H * ratio; }
      doc.addImage(logoBase64, "PNG", lx, cur, LOGO_W, LOGO_H);
      cur += LOGO_H + 3;
    } catch { /* skip */ }
  }

  // Shop name — BOLD LEFT
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(shop?.name || "Shop", lx, cur); cur += 5;

  // Address / phone / email — LEFT
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  if (shop?.address) { const al = doc.splitTextToSize(shop.address, pageW - lx - 4); al.forEach((l) => { doc.text(l, lx, cur); cur += 4; }); }
  if (shop?.contact_phone) { doc.text(`Phone: ${shop.contact_phone}`, lx, cur); cur += 4; }
  if (shop?.contact_email) { doc.text(shop.contact_email, lx, cur); cur += 4; }

  // Divider
  doc.setDrawColor(180, 180, 180);
  doc.line(lx, cur + 1, rx, cur + 1); cur += 6;

  // Customer info
  const cName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const cMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const baseDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();

  doc.setFontSize(8);
  doc.text(`Name: ${cName}`, lx, cur);
  doc.text(new Date(baseDate).toLocaleDateString("en-GB"), rx, cur, { align: "right" }); cur += 5;
  if (cMobile) doc.text(`Mob: ${cMobile}`, lx, cur);
  doc.text(`Bill No: #${invoice.number || invoice.id || "N/A"}`, rx, cur, { align: "right" }); cur += 4;

  // Table
  autoTable(doc, {
    head: [["Item", "Qty", "Price", "Tot"]], body: tableRows, startY: cur + 2,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: { 0: { cellWidth: 25, halign: "left" }, 1: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 17, halign: "right" }, 3: { cellWidth: 18, halign: "right" } },
    margin: { left: lx, right: lx },
  });

  let finalY = doc.lastAutoTable.finalY + 6;
  const subtotal = Number(invoice.subtotal || 0);
  const total    = Number(invoice.grand_total || 0);

  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 44, finalY); doc.text(`${subtotal.toFixed(2)}`, rx, finalY, { align: "right" });

  if (discount > 0) {
    finalY += 5; doc.setTextColor(0, 120, 0);
    doc.text("Discount:", 44, finalY); doc.text(`-${discount.toFixed(2)}`, rx, finalY, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
  if (tax > 0) {
    finalY += 5; doc.text("CGST:", 44, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
    finalY += 5; doc.text("SGST:", 44, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
  }

  finalY += 4; doc.setDrawColor(180, 180, 180); doc.line(lx, finalY, rx, finalY); finalY += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", 35, finalY); doc.text(`Rs. ${total.toFixed(2)}`, rx, finalY, { align: "right" });

  finalY += 10; doc.setFontSize(7); doc.setFont("helvetica", "normal");
  if (terms) {
    const tl = doc.splitTextToSize(`T&C: ${terms}`, pageW - 8);
    doc.setTextColor(100, 100, 100); tl.forEach((l) => { doc.text(l, lx, finalY); finalY += 4; }); doc.setTextColor(0, 0, 0); finalY += 2;
  }
  doc.text("Thank you for your visit!", pageW / 2, finalY, { align: "center" }); finalY += 5;
  doc.setDrawColor(160, 160, 160); doc.setLineDash([1, 1], 0);
  doc.line(lx, finalY, rx, finalY); doc.setLineDash([]);

  return doc;
};

// ── A4 PDF — with logo top-right, proper layout ───────────────────────────────
const buildA4Doc = (invoice, shop, logoBase64 = null) => {
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 15;

  let headerStartY = 20;

  // Shop name and address on left
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
  doc.text(shop?.name || "Shop Name", margin, headerStartY);

  // Address block left
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  let addrY = headerStartY + 8;
  const usableW = pageW / 2 - margin - 10;
  if (shop?.address) { const al = doc.splitTextToSize(shop.address, usableW); al.forEach((l) => { doc.text(l, margin, addrY); addrY += 5; }); }
  if (shop?.contact_phone) { doc.text(`Phone: ${shop.contact_phone}`, margin, addrY); addrY += 5; }
  if (shop?.contact_email) { doc.text(shop.contact_email, margin, addrY); addrY += 5; }

  // Logo top-right aligned with shop details
  if (logoBase64) {
    try {
      const logoSize = 25;
      doc.addImage(logoBase64, "PNG", pageW - margin - logoSize, headerStartY - 12, logoSize, logoSize);
    } catch { /* skip */ }
  }

  // Horizontal rule
  const lineY = Math.max(addrY + 2, headerStartY + 30);
  doc.setDrawColor(200, 200, 200); doc.line(margin, lineY, pageW - margin, lineY);

  // INVOICE label on right, just above the line
  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
  doc.text("INVOICE", pageW - margin, lineY - 5, { align: "right" });

  // Bill To + invoice meta
  const startY = lineY + 12;
  const cName    = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in Customer";
  const cMobile  = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const baseDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();

  doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
  doc.text("Bill To:", margin, startY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(cName, margin, startY + 6);
  if (cMobile) doc.text(cMobile, margin, startY + 12);
  doc.text(`Invoice No: ${invoice.number || invoice.id}`, pageW - margin, startY, { align: "right" });
  doc.text(`Date: ${new Date(baseDate).toLocaleDateString()}`, pageW - margin, startY + 6, { align: "right" });

  // Items table
  const tableRows = (invoice.items || []).map((item, i) => [
    i + 1,
    item.product_name || item.name || "Item",
    Number(item.unit_price).toFixed(2),
    item.qty,
    `${item.tax_rate || 0}%`,
    (Number(item.qty) * Number(item.unit_price)).toFixed(2),
  ]);
  autoTable(doc, {
    startY: startY + 20,
    head: [["#", "Item Name", "Price", "Qty", "Tax %", "Total"]],
    body: tableRows,
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // Totals
  let fy = doc.lastAutoTable.finalY + 10;
  const rightCol = pageW - margin;
  const subtotal = Number(invoice.subtotal || 0);
  const tax      = Number(invoice.tax_total || 0);
  const discount = Number(invoice.discount_total || 0);

  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("Subtotal:", rightCol - 40, fy, { align: "right" }); doc.text(`${subtotal.toFixed(2)}`, rightCol, fy, { align: "right" });

  if (discount > 0) {
    fy += 7; doc.setTextColor(0, 120, 0);
    doc.text("Discount:", rightCol - 40, fy, { align: "right" }); doc.text(`-${discount.toFixed(2)}`, rightCol, fy, { align: "right" });
    doc.setTextColor(80, 80, 80);
  }
  if (tax > 0) {
    fy += 7; doc.text("CGST:", rightCol - 40, fy, { align: "right" }); doc.text(`${(tax / 2).toFixed(2)}`, rightCol, fy, { align: "right" });
    fy += 7; doc.text("SGST:", rightCol - 40, fy, { align: "right" }); doc.text(`${(tax / 2).toFixed(2)}`, rightCol, fy, { align: "right" });
  }

  fy += 10; doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(0, 0, 0);
  doc.text("Grand Total:", rightCol - 40, fy, { align: "right" });
  doc.text(`Rs. ${Number(invoice.grand_total).toFixed(2)}`, rightCol, fy, { align: "right" });

  // Footer
  fy += 16; doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(160, 160, 160);
  const terms = shop?.config?.invoice?.terms || "";
  if (terms) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    const tl = doc.splitTextToSize(`Terms & Conditions: ${terms}`, pageW - margin * 2);
    tl.forEach((l) => { doc.text(l, pageW / 2, fy, { align: "center" }); fy += 5; }); fy += 3;
    doc.setFont("helvetica", "italic"); doc.setTextColor(160, 160, 160);
  }
  doc.text("Thank you for your business!", pageW / 2, fy, { align: "center" });

  return doc;
};

// ── Imports ──────────────────────────────────────────────────────────────────
import { deleteInvoice } from "../api/invoices.js";
import toast from "react-hot-toast";

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoiceModal({ invoice, shop, onClose, onUpdate }) {
  if (!invoice) return null;

  const onAndroid  = isAndroidWebView();
  const customerName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const customerMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const invoiceDate    = invoice.created_at || invoice.invoice_date;
  const filename       = `Invoice_${invoice.number || invoice.id}.pdf`;
  const isA4           = (shop?.config?.invoice?.paper_size || "80mm") === "A4";

  // Fetch logo base64 from shop config
  const getBlob = async () => {
    const logoBase64 = shop?.config?.logo_base64 || null;
    const doc = isA4 ? buildA4Doc(invoice, shop, logoBase64) : buildThermalDoc(invoice, shop, logoBase64);
    return doc.output("blob");
  };

  const handlePrint = async () => {
    const blob = await getBlob();
    if (onAndroid) {
      await downloadPdfNative(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      printBlobURL(url);
    }
  };

  const handleShare = async () => {
    const blob = await getBlob();
    await sharePdfNative(blob, filename, {
      title: `Invoice from ${shop?.name || "Shop"}`,
      text: `Hi ${customerName}, here is your invoice.`,
    });
  };

  const handleDownload = async () => {
    const blob = await getBlob();
    await downloadPdfNative(blob, filename);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will delete the invoice, renumber all subsequent bills, and revert stock.")) return;
    try {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted & renumbered!");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      toast.error("Failed to delete invoice.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[480px] rounded-3xl shadow-2xl border-2 border-black overflow-hidden max-h-[80vh] sm:max-h-[90vh] flex flex-col animate-slide-up mb-24 sm:mb-0" 
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Dark Header ── */}
        <div className="relative bg-slate-900 px-6 pt-6 pb-7 flex-shrink-0">

          {/* Top-right icon buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => toast("Edit coming soon!")}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
              title="Edit"
            >
              <EditIcon />
            </button>
            <button
              onClick={handleDelete}
              className="w-9 h-9 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-colors text-red-400"
              title="Delete"
            >
              <TrashIcon />
            </button>
            <button
              onClick={handlePrint}
              className="h-9 px-3 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-xs font-bold"
            >
              <PrintIcon />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button 
              onClick={onClose} 
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="pr-28">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
              Invoice #{invoice.number || invoice.id}
            </p>
            <h2 className="text-3xl font-black text-white">{formatCurrency(invoice.grand_total)}</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{customerName}</p>
                {customerMobile && <p className="text-slate-400 text-xs mt-0.5">{customerMobile}</p>}
              </div>
              <div className="ml-auto text-right">
                {invoiceDate && <p className="text-slate-400 text-xs">{formatDate(invoiceDate)}</p>}
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {invoice.status || "PAID"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Items Sold</p>
            <div className="space-y-2">
              {(invoice.items || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No items found</p>
              ) : (
                (invoice.items || []).map((item, i) => (
                  <div key={i} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {(item.product_name || item.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{item.product_name || item.name || "Unknown Item"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ₹{Number(item.unit_price || 0).toFixed(2)} × {item.qty}
                          {Number(item.tax_rate) > 0 && <span className="ml-2 text-amber-600">+{item.tax_rate}% tax</span>}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">{formatCurrency(Number(item.qty) * Number(item.unit_price))}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl px-4 py-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Summary</p>
            {[
              { label: "Subtotal", val: invoice.subtotal, show: true },
              { label: "Tax",      val: invoice.tax_total, show: Number(invoice.tax_total) > 0 },
              { label: "Discount", val: `-${formatCurrency(invoice.discount_total)}`, show: Number(invoice.discount_total) > 0, raw: true },
            ].map(({ label, val, show, raw }) =>
              show ? (
                <div key={label} className="flex justify-between text-sm text-slate-500">
                  <span>{label}</span><span>{raw ? val : formatCurrency(val)}</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-black">
              <span>Grand Total</span><span>{formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex-shrink-0 bg-white border-t-2 border-black px-4 py-4 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-bold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-sm"
          >
            <DownloadIcon /> Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-sm"
          >
            <ShareIcon /> Share
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
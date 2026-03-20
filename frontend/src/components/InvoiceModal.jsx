// frontend/src/components/InvoiceModal.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sharePdfNative, downloadPdfNative, isAndroidWebView } from "../utils/androidBridge.js";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val || 0));

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Icons ────────────────────────────────────────────────────────────────────
const CloseIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const PrintIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const ShareIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>;
const DownloadIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

// ── Print via hidden iframe (browser only, not used in WebView) ──────────────
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

// ── Thermal 80mm PDF ─────────────────────────────────────────────────────────
const buildThermalDoc = (invoice, shop) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });
  const pageW = 80;
  const lx = 4;
  const rx = 76;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(shop?.name || "Shop", pageW / 2, 8, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  let headerY = 13;
  if (shop?.address) {
    const addrLines = doc.splitTextToSize(shop.address, pageW - 8);
    addrLines.forEach((line) => { doc.text(line, pageW / 2, headerY, { align: "center" }); headerY += 4; });
  }
  if (shop?.contact_phone) { doc.text(`Ph: ${shop.contact_phone}`, pageW / 2, headerY, { align: "center" }); headerY += 4; }

  doc.line(lx, headerY + 1, rx, headerY + 1);

  let y = headerY + 7;
  const cName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const cMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const baseDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();

  doc.setFontSize(8);
  doc.text(`Name: ${cName}`, lx, y);
  doc.text(new Date(baseDate).toLocaleDateString("en-GB"), rx, y, { align: "right" });
  y += 5;
  if (cMobile) doc.text(`Mob: ${cMobile}`, lx, y);
  doc.text(`Bill No: #${invoice.number || invoice.id || "N/A"}`, rx, y, { align: "right" });

  const rows = (invoice.items || []).map((item) => {
    const name = (item.product_name || item.name || "Item").substring(0, 14);
    return [name, item.qty, Math.round(item.unit_price), Math.round(item.qty * item.unit_price)];
  });

  autoTable(doc, {
    head: [["Item", "Qty", "Price", "Total"]],
    body: rows,
    startY: y + 4,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 12, halign: "center" }, 2: { cellWidth: 15, halign: "right" }, 3: { cellWidth: 18, halign: "right" } },
    margin: { left: lx, right: lx },
  });

  let fy = doc.lastAutoTable.finalY + 6;
  const subtotal = Number(invoice.subtotal || 0);
  const tax      = Number(invoice.tax_total || 0);
  const discount = Number(invoice.discount_total || 0);
  const total    = Number(invoice.grand_total || 0);

  doc.setFontSize(8);
  doc.text("Subtotal:", 45, fy);
  doc.text(`${subtotal.toFixed(2)}`, rx, fy, { align: "right" });

  if (discount > 0) {
    fy += 5; doc.setTextColor(0, 120, 0);
    doc.text("Discount:", 45, fy); doc.text(`-${discount.toFixed(2)}`, rx, fy, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
  if (tax > 0) {
    fy += 5; doc.text("CGST:", 45, fy); doc.text(`${(tax / 2).toFixed(2)}`, rx, fy, { align: "right" });
    fy += 5; doc.text("SGST:", 45, fy); doc.text(`${(tax / 2).toFixed(2)}`, rx, fy, { align: "right" });
  }

  fy += 4;
  doc.line(lx, fy, rx, fy);
  fy += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", 35, fy);
  doc.text(`Rs. ${total.toFixed(2)}`, rx, fy, { align: "right" });
  fy += 10;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your visit!", pageW / 2, fy, { align: "center" });

  return doc;
};

// ── A4 PDF ───────────────────────────────────────────────────────────────────
const buildA4Doc = (invoice, shop) => {
  const doc     = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW   = doc.internal.pageSize.getWidth();
  const margin  = 15;
  const usableW = pageW / 2 - margin - 10;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("INVOICE", pageW - margin, 20, { align: "right" });

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(shop?.name || "Shop Name", margin, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  let addrY = 28;
  if (shop?.address) {
    const addrLines = doc.splitTextToSize(shop.address, usableW);
    addrLines.forEach((line) => { doc.text(line, margin, addrY); addrY += 5; });
  }
  if (shop?.contact_phone) { doc.text(`Phone: ${shop.contact_phone}`, margin, addrY); addrY += 5; }
  if (shop?.contact_email) { doc.text(shop.contact_email, margin, addrY); addrY += 5; }

  const lineY = Math.max(addrY + 2, 38);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, lineY, pageW - margin, lineY);

  const startY = lineY + 12;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("Bill To:", margin, startY);

  const cName    = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in Customer";
  const cMobile  = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const baseDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();

  doc.setFont("helvetica", "normal");
  doc.text(cName, margin, startY + 6);
  if (cMobile) doc.text(cMobile, margin, startY + 12);
  doc.text(`Invoice No: ${invoice.number || invoice.id}`, pageW - margin, startY, { align: "right" });
  doc.text(`Date: ${new Date(baseDate).toLocaleDateString()}`, pageW - margin, startY + 6, { align: "right" });

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

  let fy = doc.lastAutoTable.finalY + 10;
  const rightCol = pageW - margin;
  const subtotal = Number(invoice.subtotal || 0);
  const tax      = Number(invoice.tax_total || 0);
  const discount = Number(invoice.discount_total || 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal:", rightCol - 40, fy, { align: "right" });
  doc.text(`${subtotal.toFixed(2)}`, rightCol, fy, { align: "right" });

  if (discount > 0) {
    fy += 7; doc.setTextColor(0, 120, 0);
    doc.text("Discount:", rightCol - 40, fy, { align: "right" }); doc.text(`-${discount.toFixed(2)}`, rightCol, fy, { align: "right" });
    doc.setTextColor(80, 80, 80);
  }
  if (tax > 0) {
    fy += 7; doc.text("CGST:", rightCol - 40, fy, { align: "right" }); doc.text(`${(tax / 2).toFixed(2)}`, rightCol, fy, { align: "right" });
    fy += 7; doc.text("SGST:", rightCol - 40, fy, { align: "right" }); doc.text(`${(tax / 2).toFixed(2)}`, rightCol, fy, { align: "right" });
  }

  fy += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("Grand Total:", rightCol - 40, fy, { align: "right" });
  doc.text(`Rs. ${Number(invoice.grand_total).toFixed(2)}`, rightCol, fy, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const terms = shop?.config?.invoice?.terms || "";
  let footerY = fy + 15;
  if (terms) {
    const termLines = doc.splitTextToSize(`Terms & Conditions: ${terms}`, pageW - margin * 2);
    termLines.forEach((line) => { doc.text(line, pageW / 2, footerY, { align: "center" }); footerY += 5; });
    footerY += 3;
  }
  doc.setFont("helvetica", "italic");
  doc.setTextColor(160, 160, 160);
  doc.text("Thank you for your business!", pageW / 2, footerY, { align: "center" });

  return doc;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvoiceModal({ invoice, shop, onClose }) {
  if (!invoice) return null;

  const onAndroid = isAndroidWebView();

  const customerName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const customerMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const invoiceDate    = invoice.created_at || invoice.invoice_date;
  const filename       = `Invoice_${invoice.number || invoice.id}.pdf`;

  const paperSize = shop?.config?.invoice?.paper_size || "80mm";
  const isA4      = paperSize === "A4";

  const getBlob = () => {
    const doc = isA4 ? buildA4Doc(invoice, shop) : buildThermalDoc(invoice, shop);
    return doc.output("blob");
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  // On Android: download to device (WebView can't print)
  // On browser: hidden iframe → native print dialog
  const handlePrint = async () => {
    const blob = getBlob();
    if (onAndroid) {
      await downloadPdfNative(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      printBlobURL(url);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  // On Android: native share sheet via JS bridge
  // On browser: Web Share API → blob URL fallback
  const handleShare = async () => {
    const blob = getBlob();
    await sharePdfNative(blob, filename, {
      title: `Invoice from ${shop?.name || "Shop"}`,
      text: `Hi ${customerName}, here is your invoice.`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[480px] rounded-3xl shadow-2xl border-2 border-black overflow-hidden max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dark Header ── */}
        <div className="relative bg-slate-900 px-6 pt-6 pb-7 flex-shrink-0">
          <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title="Close">
              <CloseIcon />
            </button>
            <button onClick={handlePrint} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title={onAndroid ? "Save PDF" : "Print"}>
              {onAndroid ? <DownloadIcon /> : <PrintIcon />}
            </button>
            <button onClick={handleShare} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title="Share">
              <ShareIcon />
            </button>
          </div>

          <div className="pr-14">
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

          {/* ── Totals ── */}
          <div className="bg-white rounded-xl px-4 py-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Summary</p>
            {[
              { label: "Subtotal", val: invoice.subtotal, show: true },
              { label: "Tax",      val: invoice.tax_total, show: Number(invoice.tax_total) > 0 },
              { label: "Discount", val: `-${formatCurrency(invoice.discount_total)}`, show: Number(invoice.discount_total) > 0, raw: true },
            ].map(({ label, val, show, raw }) =>
              show ? (
                <div key={label} className="flex justify-between text-sm text-slate-500">
                  <span>{label}</span>
                  <span>{raw ? val : formatCurrency(val)}</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-black">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex-shrink-0 bg-white border-t-2 border-black px-4 py-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-bold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all text-sm"
          >
            {onAndroid ? <><DownloadIcon /> Save PDF</> : <><PrintIcon /> Print Bill</>}
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
// frontend/src/components/InvoiceModal.jsx
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(val || 0));

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Icons ──────────────────────────────────────────────────
const CloseIcon  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const PrintIcon  = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const ShareIcon  = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>;

// ── PDF Generation ─────────────────────────────────────────
const buildPDFDoc = (invoice, shop) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(shop?.name || "Shop", 40, 8, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (shop?.address) doc.text(shop.address, 40, 13, { align: "center" });
  if (shop?.contact_phone) doc.text(`Ph: ${shop.contact_phone}`, 40, 17, { align: "center" });

  doc.line(4, 20, 76, 20);

  let y = 26;
  const cName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const cMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const baseDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();

  doc.setFontSize(8);
  doc.text(`Name: ${cName}`, 4, y);
  doc.text(new Date(baseDate).toLocaleDateString("en-GB"), 76, y, { align: "right" });
  y += 5;
  if (cMobile) doc.text(`Mob: ${cMobile}`, 4, y);
  doc.text(`Bill No: #${invoice.number || invoice.id || "N/A"}`, 76, y, { align: "right" });

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
    margin: { left: 4, right: 4 },
  });

  let fy = doc.lastAutoTable.finalY + 6;
  const subtotal = Number(invoice.subtotal || 0);
  const tax      = Number(invoice.tax_total || 0);
  const discount = Number(invoice.discount_total || 0);
  const total    = Number(invoice.grand_total || 0);

  doc.setFontSize(8);
  doc.text("Subtotal:", 45, fy); doc.text(`${subtotal.toFixed(2)}`, 75, fy, { align: "right" });
  if (discount > 0) {
    fy += 5;
    doc.setTextColor(0, 100, 0);
    doc.text("Discount:", 45, fy); doc.text(`-${discount.toFixed(2)}`, 75, fy, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
  if (tax > 0) {
    fy += 5; doc.text("CGST:", 45, fy); doc.text(`${(tax / 2).toFixed(2)}`, 75, fy, { align: "right" });
    fy += 5; doc.text("SGST:", 45, fy); doc.text(`${(tax / 2).toFixed(2)}`, 75, fy, { align: "right" });
  }
  fy += 4; doc.line(4, fy, 76, fy); fy += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", 35, fy); doc.text(`Rs. ${total.toFixed(2)}`, 75, fy, { align: "right" });
  fy += 10; doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("Thank you for your visit!", 40, fy, { align: "center" });

  return doc;
};

// ── Main Component ─────────────────────────────────────────
export default function InvoiceModal({ invoice, shop, onClose }) {
  if (!invoice) return null;

  const customerName   = invoice.customer_detail?.name   || invoice.customer_name   || "Walk-in";
  const customerMobile = invoice.customer_detail?.mobile || invoice.customer_mobile || "";
  const invoiceDate    = invoice.created_at || invoice.invoice_date;

  // Print — opens PDF in new tab
  const handlePrint = () => {
    const doc = buildPDFDoc(invoice, shop);
    const blob = doc.output("blob");
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Share — uses Web Share API if available, else opens PDF
  const handleShare = async () => {
    const doc  = buildPDFDoc(invoice, shop);
    const blob = doc.output("blob");
    const file = new File([blob], `Invoice_${invoice.number || invoice.id}.pdf`, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Invoice from ${shop?.name || "Shop"}`,
          text: `Hi ${customerName}, here is your invoice.`,
        });
      } catch {
        // user cancelled — do nothing
      }
    } else {
      // Fallback: open PDF
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Card — bottom sheet on mobile, centered on desktop */}
      <div
        className="
          bg-white w-full sm:w-[480px] lg:w-[520px]
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl overflow-hidden
          max-h-[92vh] flex flex-col
          animate-slide-up
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Dark Header ── */}
        <div className="relative bg-slate-900 px-6 pt-6 pb-7 flex-shrink-0">

          {/* Action buttons — top right */}
          <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Close"
            >
              <CloseIcon />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Print / Download PDF"
            >
              <PrintIcon />
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Share"
            >
              <ShareIcon />
            </button>
          </div>

          {/* Invoice summary */}
          <div className="pr-14">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
              Invoice #{invoice.number || invoice.id}
            </p>
            <h2 className="text-3xl font-black text-white">
              {formatCurrency(invoice.grand_total)}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{customerName}</p>
                {customerMobile && (
                  <p className="text-slate-400 text-xs mt-0.5">{customerMobile}</p>
                )}
              </div>
              <div className="ml-auto text-right">
                {invoiceDate && (
                  <p className="text-slate-400 text-xs">{formatDate(invoiceDate)}</p>
                )}
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {invoice.status || "PAID"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-4">

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Items Sold
            </p>
            <div className="space-y-2">
              {(invoice.items || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No items found</p>
              ) : (
                (invoice.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {(item.product_name || item.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {item.product_name || item.name || "Unknown Item"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ₹{Number(item.unit_price || 0).toFixed(2)} × {item.qty}
                          {Number(item.tax_rate) > 0 && (
                            <span className="ml-2 text-amber-600">+{item.tax_rate}% tax</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      {formatCurrency(Number(item.qty) * Number(item.unit_price))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Summary</p>
            {[
              { label: "Subtotal",  val: invoice.subtotal,      show: true },
              { label: "Tax",       val: invoice.tax_total,     show: Number(invoice.tax_total) > 0 },
              { label: "Discount",  val: `-${formatCurrency(invoice.discount_total)}`, show: Number(invoice.discount_total) > 0, raw: true },
            ].map(({ label, val, show, raw }) =>
              show ? (
                <div key={label} className="flex justify-between text-sm text-slate-500">
                  <span>{label}</span>
                  <span>{raw ? val : formatCurrency(val)}</span>
                </div>
              ) : null
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* ── Footer action bar ── */}
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 active:scale-[0.98] transition-all text-sm shadow-lg shadow-slate-200"
          >
            <PrintIcon /> Print Bill
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-2xl hover:bg-[#20bd5a] active:scale-[0.98] transition-all text-sm shadow-lg shadow-green-100"
          >
            <ShareIcon /> Share
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
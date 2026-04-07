import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helper: load an image URL / base64 into a jsPDF-ready base64 string ──
// Returns null if image fails so we silently skip it instead of crashing.
const loadImage = (src) =>
    new Promise((resolve) => {
        if (!src) return resolve(null);
        if (src.startsWith("data:")) return resolve(src);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d").drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

export const generateThermalPDF = async (printData, currentShop) => {
    const pageW = 80;
    const lx    = 4;   // left margin
    const rx    = 76;  // right edge

    // ── Logo ─────────────────────────────────────────────────────────────
    const logoSrc  = currentShop?.config?.logo || currentShop?.logo || null;
    const logoData = await loadImage(logoSrc);

    const LOGO_MAX_W = 16;
    const LOGO_MAX_H = 16;
    let logoW = 0, logoH = 0;
    if (logoData) {
        const img = new Image();
        img.src = logoData;
        await new Promise((r) => { img.onload = r; img.onerror = r; });
        const ratio = img.naturalWidth / img.naturalHeight;
        logoW = Math.min(LOGO_MAX_W, LOGO_MAX_H * ratio);
        logoH = logoW / ratio;
        if (logoH > LOGO_MAX_H) { logoH = LOGO_MAX_H; logoW = logoH * ratio; }
    }

    const tableRows = (printData.items || []).map((item) => {
        const name = item.product_name || item.name || "Item";
        return [
            name.length > 14 ? name.substring(0, 14) + ".." : name,
            item.qty,
            Math.round(item.unit_price),
            Math.round(item.qty * item.unit_price),
        ];
    });

    const tax      = Number(printData.tax_total || 0);
    const discount = Number(printData.discount_total || 0);
    const terms    = currentShop?.config?.invoice?.terms || "";

    // ── PASS 1: measure total height ──────────────────────────────────────
    const measure = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });
    measure.setFontSize(7);

    let fy = 4;
    if (logoData) fy += logoH + 3;
    fy += 5;  // shop name
    if (currentShop?.address) {
        const lines = measure.splitTextToSize(currentShop.address, pageW - lx - 4);
        fy += lines.length * 4;
    }
    if (currentShop?.contact_phone) fy += 4;
    if (currentShop?.contact_email) fy += 4;
    fy += 6;  // divider
    fy += 9;  // customer row x2 + gap

    autoTable(measure, {
        head: [["Item", "Qty", "Price", "Tot"]],
        body: tableRows,
        startY: fy + 2,
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 10 }, 2: { cellWidth: 17 }, 3: { cellWidth: 18 } },
        margin: { left: lx, right: lx },
    });
    fy = measure.lastAutoTable.finalY + 6;

    fy += 5;  // subtotal
    if (discount > 0) fy += 5;
    if (tax > 0) fy += 10;
    fy += 4;  // divider
    fy += 6;  // grand total
    fy += 10; // footer gap
    if (terms) {
        const tLines = measure.splitTextToSize(`T&C: ${terms}`, pageW - 8);
        fy += tLines.length * 4 + 2;
    }
    fy += 5;  // thank you
    fy += 6;  // cut line + bottom margin

    // ── PASS 2: render ────────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, fy] });
    let cur = 4;
    

    // Logo (top-left)
    if (logoData && logoW > 0) {
        doc.addImage(logoData, "PNG", lx, cur, logoW, logoH);
        cur += logoH + 3;
    }

    // Shop name — BOLD, LEFT-ALIGNED
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(currentShop?.name || "Shop", lx, cur);
    cur += 5;

    // Address / phone / email — LEFT-ALIGNED
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    if (currentShop?.address) {
        const addrLines = doc.splitTextToSize(currentShop.address, pageW - lx - 4);
        addrLines.forEach((line) => { doc.text(line, lx, cur); cur += 4; });
    }
    if (currentShop?.contact_phone) { doc.text(`Phone: ${currentShop.contact_phone}`, lx, cur); cur += 4; }
    if (currentShop?.contact_email) { doc.text(currentShop.contact_email, lx, cur); cur += 4; }

    // Divider
    doc.setDrawColor(180, 180, 180);
    doc.line(lx, cur + 1, rx, cur + 1);
    cur += 6;

    // Customer & bill info
    const cName   = printData.customer_detail?.name   || printData.customer_name   || "Walk-in";
    const cMobile = printData.customer_detail?.mobile || printData.customer_mobile || "";
    const baseDate = printData.created_at || printData.invoice_date || new Date().toISOString();

    doc.setFontSize(8);
    doc.text(`Name: ${cName}`, lx, cur);
    doc.text(new Date(baseDate).toLocaleDateString("en-GB"), rx, cur, { align: "right" });
    cur += 5;
    if (cMobile) doc.text(`Mob: ${cMobile}`, lx, cur);
    doc.text(`Bill No: #${printData.number || printData.id || "N/A"}`, rx, cur, { align: "right" });
    cur += 4;

    // Items table
    autoTable(doc, {
        head: [["Item", "Qty", "Price", "Tot"]],
        body: tableRows,
        startY: cur + 2,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        columnStyles: {
            0: { cellWidth: 25, halign: "left" },
            1: { cellWidth: 10, halign: "center" },
            2: { cellWidth: 17, halign: "right" },
            3: { cellWidth: 18, halign: "right" },
        },
        margin: { left: lx, right: lx },
    });

    // Totals
    let finalY = doc.lastAutoTable.finalY + 6;
    const subtotal = Number(printData.subtotal || 0);
    const total    = Number(printData.grand_total || 0);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", 44, finalY);
    doc.text(`${subtotal.toFixed(2)}`, rx, finalY, { align: "right" });

    if (discount > 0) {
        finalY += 5;
        doc.setTextColor(0, 120, 0);
        doc.text("Discount:", 44, finalY);
        doc.text(`-${discount.toFixed(2)}`, rx, finalY, { align: "right" });
        doc.setTextColor(0, 0, 0);
    }
    if (tax > 0) {
        finalY += 5; doc.text("CGST:", 44, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
        finalY += 5; doc.text("SGST:", 44, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
    }

    finalY += 4;
    doc.line(lx, finalY, rx, finalY);
    finalY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", 35, finalY);
    doc.text(`Rs. ${total.toFixed(2)}`, rx, finalY, { align: "right" });

    // Footer
    finalY += 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    if (terms) {
        const termLines = doc.splitTextToSize(`T&C: ${terms}`, pageW - 8);
        doc.setTextColor(100, 100, 100);
        termLines.forEach((line) => { doc.text(line, lx, finalY); finalY += 4; });
        doc.setTextColor(0, 0, 0);
        finalY += 2;
    }

    doc.text("Thank you for your visit!", pageW / 2, finalY, { align: "center" });
    finalY += 5;

    doc.setDrawColor(160, 160, 160);
    doc.setLineDash([1, 1], 0);
    doc.line(lx, finalY, rx, finalY);
    doc.setLineDash([]);

    return doc;
};
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateThermalPDF = async (printData, currentShop) => {
    const pageW = 80;
    const lx    = 4;
    const rx    = 76;

    // ── Logo — read from local config ───────────
    const logoData = currentShop?.config?.logo_base64 || null;

    const LOGO_SIZE = 16; // 1:1 Perfect Square
    let logoW = 0, logoH = 0;
    if (logoData) {
        logoW = LOGO_SIZE;
        logoH = LOGO_SIZE;
    }

    const tableRows = (printData.items || []).map((item) => {
        const name = item.product_name || item.name || "Item";
        return [
            name.length > 14 ? name.substring(0, 14) + ".." : name,
            item.qty,
            Math.round(item.unit_price),
            Math.round(Number(item.qty) * Number(item.unit_price)),
        ];
    });

    const tax      = Number(printData.tax_total || 0);
    const discount = Number(printData.discount_total || 0);
    const terms    = currentShop?.config?.invoice?.terms || "";

    // ── PASS 1: measure total height ────────────────────────────────────
    const measure = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });
    measure.setFontSize(7);

    let fy = 8; 
    fy += 5; // Shop name
    if (currentShop?.address) {
        const lines = measure.splitTextToSize(`Address: ${currentShop.address}`, pageW - lx - 30);
        fy += lines.length * 4;
    }
    if (currentShop?.contact_phone) fy += 4;
    if (currentShop?.contact_email) fy += 4;
    if (currentShop?.gstin) fy += 4;
    
    // Add extra buffer for logo if it ends up being taller than the text block
    fy += 10; 
    fy += 6;  // divider  // divider
    fy += 10;  // customer rows

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
    if (tax > 0)      fy += 10;
    fy += 4 + 6 + 10; // divider + grand total + footer gap
    if (terms) {
        const tLines = measure.splitTextToSize(`T&C: ${terms}`, pageW - 8);
        fy += tLines.length * 4 + 2;
    }
    fy += 5 + 6; // thank you + cut line

   // ── PASS 2: render ──────────────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, fy] });
    
    let cur = 8; 
    const startY = cur; // Track where the text block begins

    // 1. Draw Left Text Block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(currentShop?.name || "Shop", lx, cur);
    cur += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    if (currentShop?.address) {
        // Constrain width to 'pageW - lx - 30' so long addresses don't print over the logo
        const addrLines = doc.splitTextToSize(`Address: ${currentShop.address}`, pageW - lx - 30);
        addrLines.forEach((line) => { doc.text(line, lx, cur); cur += 4; });
    }
    if (currentShop?.contact_phone) { doc.text(`Mob. No: ${currentShop.contact_phone}`, lx, cur); cur += 4; }
    if (currentShop?.contact_email) { doc.text(`Email: ${currentShop.contact_email}`, lx, cur); cur += 4; }
    if (currentShop?.gstin) { doc.text(`GSTIN: ${currentShop.gstin}`, lx, cur); cur += 4; }

    const textHeight = cur - startY - 4; // Exact height of the text block

    // 2. Draw Logo on Right (Matching text block height)
    if (logoData) {
        // Cap the max size at 26mm so it doesn't take over the whole receipt width
        const logoSize = Math.min(Math.max(16, textHeight), 26);
        // We subtract 3.5 from startY so the top of the image aligns with the top of the Shop Name text
        doc.addImage(logoData, "PNG", rx - logoSize, startY - 3.5, logoSize, logoSize);
        
        // Ensure cursor is below whichever is taller: the text or the logo
        if ((startY - 3.5 + logoSize) > cur) {
            cur = startY - 3.5 + logoSize + 4;
        }
    }

    // Divider
    doc.setDrawColor(180, 180, 180);
    doc.line(lx, cur + 1, rx, cur + 1);
    cur += 6;

    // Customer info
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
    doc.setDrawColor(180, 180, 180);
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateThermalPDF = (printData, currentShop) => {
    const pageW = 80;
    const lx    = 4;
    const rx    = 76;

    // ── PASS 1: measure content height ──────────────────────
    // Build into a throwaway tall doc just to find finalY
    const measure = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 297] });

    measure.setFontSize(7);
    let headerY = 13;
    if (currentShop?.address) {
        const lines = measure.splitTextToSize(currentShop.address, pageW - 8);
        headerY += lines.length * 4;
    }
    if (currentShop?.contact_phone) headerY += 4;

    let y = headerY + 7 + 5; // after customer info
    const tableRows = (printData.items || []).map((item) => {
        const name = (item.product_name || item.name || "Item");
        return [name.length > 12 ? name.substring(0, 12) + ".." : name, item.qty, Math.round(item.unit_price), Math.round(item.qty * item.unit_price)];
    });
    autoTable(measure, {
        head: [["Item", "Qty", "Price", "Tot"]],
        body: tableRows,
        startY: y + 4,
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 12 }, 2: { cellWidth: 15 }, 3: { cellWidth: 18 } },
        margin: { left: lx, right: lx },
    });
    let fy = measure.lastAutoTable.finalY + 6;
    const tax      = Number(printData.tax_total || 0);
    const discount = Number(printData.discount_total || 0);
    if (discount > 0) fy += 5;
    if (tax > 0)      fy += 10;
    fy += 4 + 6 + 9 + 5 + 6; // line + grand total + thank you + dash line + bottom margin

    // ── PASS 2: render into correctly-sized doc ──────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, fy] });

    // Shop Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(currentShop?.name || "Shop", pageW / 2, 8, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    let headerY2 = 13;
    if (currentShop?.address) {
        const addrLines = doc.splitTextToSize(currentShop.address, pageW - 8);
        addrLines.forEach((line) => {
            doc.text(line, pageW / 2, headerY2, { align: "center" });
            headerY2 += 4;
        });
    }
    if (currentShop?.contact_phone) {
        doc.text(`Ph: ${currentShop.contact_phone}`, pageW / 2, headerY2, { align: "center" });
        headerY2 += 4;
    }

    doc.line(lx, headerY2 + 1, rx, headerY2 + 1);

    // Customer & Bill info
    let y2 = headerY2 + 7;
    const cName   = printData.customer_detail?.name   || printData.customer_name   || "Walk-in";
    const cMobile = printData.customer_detail?.mobile || printData.customer_mobile || "";
    const baseDate = printData.created_at || printData.invoice_date || new Date().toISOString();

    doc.setFontSize(8);
    doc.text(`Name: ${cName}`, lx, y2);
    doc.text(new Date(baseDate).toLocaleDateString("en-GB"), rx, y2, { align: "right" });
    y2 += 5;
    if (cMobile) doc.text(`Mob: ${cMobile}`, lx, y2);
    doc.text(`Bill No: #${printData.number || printData.id || "N/A"}`, rx, y2, { align: "right" });

    // Items table
    autoTable(doc, {
        head: [["Item", "Qty", "Price", "Tot"]],
        body: tableRows,
        startY: y2 + 4,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        columnStyles: {
            0: { cellWidth: 25, halign: "left" },
            1: { cellWidth: 12, halign: "center" },
            2: { cellWidth: 15, halign: "right" },
            3: { cellWidth: 18, halign: "right" },
        },
        margin: { left: lx, right: lx },
    });

    // Totals
    let finalY = doc.lastAutoTable.finalY + 6;
    const subtotal = Number(printData.subtotal || printData.total_amount || 0);
    const total    = Number(printData.grand_total || 0);

    doc.setFontSize(8);
    doc.text("Subtotal:", 45, finalY);
    doc.text(`${subtotal.toFixed(2)}`, rx, finalY, { align: "right" });

    if (discount > 0) {
        finalY += 5;
        doc.setTextColor(0, 120, 0);
        doc.text("Discount:", 45, finalY);
        doc.text(`-${discount.toFixed(2)}`, rx, finalY, { align: "right" });
        doc.setTextColor(0, 0, 0);
    }
    if (tax > 0) {
        finalY += 5; doc.text("CGST:", 45, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
        finalY += 5; doc.text("SGST:", 45, finalY); doc.text(`${(tax / 2).toFixed(2)}`, rx, finalY, { align: "right" });
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

    // Terms & Conditions — print before thank you if present
    const terms = currentShop?.config?.invoice?.terms || "";
    if (terms) {
        const termLines = doc.splitTextToSize(`T&C: ${terms}`, pageW - 8);
        doc.setTextColor(100, 100, 100);
        termLines.forEach((line) => {
            doc.text(line, pageW / 2, finalY, { align: "center" });
            finalY += 4;
        });
        doc.setTextColor(0, 0, 0);
        finalY += 2;
    }

    doc.text("Thank you for your visit!", pageW / 2, finalY, { align: "center" });


    finalY += 5;
    // Dashed cut line
    doc.setDrawColor(160, 160, 160);
    doc.setLineDash([1, 1], 0);
    doc.line(lx, finalY, rx, finalY);
    doc.setLineDash([]);
    doc.setTextColor(0, 0, 0);

    return doc;
};
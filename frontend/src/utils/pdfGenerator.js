import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: Generate 80mm Thermal Receipt
export const generateThermalPDF = (printData, currentShop) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297] // Standard 80mm roll width
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(currentShop?.name || "Target Shop", 40, 8, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(currentShop?.address || "", 40, 12, { align: "center" });
    doc.text(`Ph: ${currentShop?.contact_phone || ""}`, 40, 16, { align: "center" });

    doc.line(4, 18, 76, 18); 

    let y = 23;
    const leftX = 4;  
    const rightX = 76; 
    
    doc.setFontSize(8);
    // Print data could be an 'Invoice' object from the DB, or a local 'InvoiceData' from creation view
    const cName = printData.customer_detail?.name || printData.customer_name || "Walk-in";
    const cMobile = printData.customer_detail?.mobile || printData.customer_mobile || "";

    doc.text(`Name: ${cName}`, leftX, y, { align: "left" });
    
    // Formatting date safely:
    const baseDate = printData.created_at || printData.invoice_date || new Date().toISOString();
    doc.text(`${new Date(baseDate).toLocaleDateString('en-GB')}`, rightX, y, { align: "right" });
    y += 5;

    if (cMobile) {
        doc.text(`Mob: ${cMobile}`, leftX, y, { align: "left" });
    }
    doc.text(`Bill No: #${printData.number || printData.id || "N/A"}`, rightX, y, { align: "right" });

    const tableColumn = ["Item", "Qty", "Price", "Tot"];
    const tableRows = [];

    (printData.items || []).forEach(item => {
      const name = item.product_name || item.name || "Item";
      const displayName = name.length > 12 ? name.substring(0, 12) + ".." : name;
      tableRows.push([displayName, item.qty, Math.round(item.unit_price), Math.round(item.qty * item.unit_price)]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: y + 4,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
          0: { cellWidth: 25, halign: 'left' },
          1: { cellWidth: 12, halign: 'center' },
          2: { cellWidth: 15, halign: 'right' },
          3: { cellWidth: 18, halign: 'right' },
      },
      margin: { left: 4, right: 4 }
    });

    let finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(8);
    const subtotal = Number(printData.subtotal || printData.total_amount || 0);
    const discount = Number(printData.discount_total || 0);
    const tax = Number(printData.tax_total || 0);
    const total = Number(printData.grand_total || 0);

    doc.text(`Subtotal:`, 45, finalY);
    doc.text(`${subtotal.toFixed(2)}`, 75, finalY, { align: "right" });
    
    if (discount > 0) {
        finalY += 5;
        doc.setTextColor(0, 100, 0); // Greenish text for discount
        doc.text(`Discount:`, 45, finalY);
        doc.text(`-${discount.toFixed(2)}`, 75, finalY, { align: "right" });
        doc.setTextColor(0, 0, 0); // Reset
    }

    if (tax > 0) {
        finalY += 5;
        doc.text(`CGST:`, 45, finalY);
        doc.text(`${(tax / 2).toFixed(2)}`, 75, finalY, { align: "right" });
        finalY += 5;
        doc.text(`SGST:`, 45, finalY);
        doc.text(`${(tax / 2).toFixed(2)}`, 75, finalY, { align: "right" });
    }
    
    finalY += 4;
    doc.line(4, finalY, 76, finalY);
    finalY += 6;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 35, finalY);
    doc.text(`Rs. ${total.toFixed(2)}`, 75, finalY, { align: "right" });

    finalY += 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your visit!", 40, finalY, { align: "center" });

    doc.save(`Receipt_${printData.number || printData.id || "New"}.pdf`);
};

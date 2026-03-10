from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

def generate_invoice_pdf(invoice):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Shop Info
    shop = invoice.shop
    elements.append(Paragraph(f"<b>{shop.name}</b>", styles['Title']))
    elements.append(Paragraph(shop.address, styles['Normal']))
    elements.append(Paragraph(f"Phone: {shop.contact_phone}", styles['Normal']))
    if shop.gstin:
        elements.append(Paragraph(f"GSTIN: {shop.gstin}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Invoice Info
    elements.append(Paragraph(f"<b>Invoice #:</b> {invoice.number}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date:</b> {invoice.invoice_date.strftime('%d %b %Y')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Customer:</b> {invoice.customer_name or 'Walk-in'}", styles['Normal']))
    if invoice.customer_mobile:
        elements.append(Paragraph(f"<b>Mobile:</b> {invoice.customer_mobile}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Items Table
    currency = shop.config.get('tax', {}).get('currency', '₹')
    table_data = [['#', 'Product', 'Qty', 'Unit Price', 'Tax %', 'Total']]
    for i, item in enumerate(invoice.items.select_related('product'), 1):
        table_data.append([
            str(i),
            item.product.name,
            str(item.qty),
            f"{currency}{item.unit_price}",
            f"{item.tax_rate}%",
            f"{currency}{item.line_total}",
        ])

    table = Table(table_data, colWidths=[30, 180, 50, 80, 50, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 12))

    # Totals
    totals_data = [
        ['Subtotal', f"{currency}{invoice.subtotal}"],
        ['Tax', f"{currency}{invoice.tax_total}"],
        ['Discount', f"-{currency}{invoice.discount_total}"],
        ['Grand Total', f"{currency}{invoice.grand_total}"],
    ]
    totals_table = Table(totals_data, colWidths=[400, 70])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))
    elements.append(totals_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
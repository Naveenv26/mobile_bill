from django.utils.timezone import now
from django.db.models import Sum, Count
from django.http import FileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Invoice
from .pdf import generate_invoice_pdf
from urllib.parse import quote

# ✅ Keep your existing one — but add shop filter (it was missing!)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def invoice_report(request):
    shop = request.user.shop  # ✅ added — was missing before
    today = now().date()
    month = today.month
    year = today.year

    today_invoices = Invoice.objects.filter(shop=shop, invoice_date__date=today)
    month_invoices = Invoice.objects.filter(shop=shop, invoice_date__year=year, invoice_date__month=month)

    data = {
        "today_total": today_invoices.aggregate(total=Sum("grand_total"))["total"] or 0,
        "today_count": today_invoices.count(),
        "month_total": month_invoices.aggregate(total=Sum("grand_total"))["total"] or 0,
        "month_count": month_invoices.count(),
    }
    return Response(data)


# ✅ Add this new one below
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_pdf(request, invoice_id):
    try:
        invoice = Invoice.objects.prefetch_related(
            'items__product'
        ).select_related('shop', 'customer').get(
            id=invoice_id,
            shop=request.user.shop
        )
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)

    buffer = generate_invoice_pdf(invoice)
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"invoice_{invoice.number}.pdf"
    )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_whatsapp(request, invoice_id):
    try:
        invoice = Invoice.objects.select_related('shop').get(
            id=invoice_id,
            shop=request.user.shop
        )
    except Invoice.DoesNotExist:
        from rest_framework.response import Response
        return Response({"error": "Invoice not found"}, status=404)

    shop = invoice.shop
    currency = shop.config.get('tax', {}).get('currency', '₹')
    mobile = invoice.customer_mobile or ''

    message = (
        f"Dear {invoice.customer_name or 'Customer'},\n"
        f"Thank you for shopping at {shop.name}!\n\n"
        f"Invoice #: {invoice.number}\n"
        f"Amount: {currency}{invoice.grand_total}\n"
        f"Status: {invoice.status}\n\n"
        f"Thank you!"
    )

    whatsapp_url = f"https://wa.me/{mobile}?text={quote(message)}"

    from rest_framework.response import Response
    return Response({
        "whatsapp_url": whatsapp_url,
        "mobile": mobile,
        "message": message
    })
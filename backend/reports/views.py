from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
from sales.models import Invoice, InvoiceItem
from catalog.models import Product


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_summary(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    today = timezone.now().date()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)

    def get_summary(filter_kwargs):
        return Invoice.objects.filter(shop=shop, **filter_kwargs).aggregate(
            total=Sum('grand_total'),
            count=Count('id')
        )

    return Response({
        "today": get_summary({"invoice_date__date": today}),
        "this_week": get_summary({"invoice_date__date__gte": start_of_week}),
        "this_month": get_summary({"invoice_date__date__gte": start_of_month}),
        "all_time": get_summary({}),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_products(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    top = InvoiceItem.objects.filter(
        invoice__shop=shop
    ).values(
        'product__id', 'product__name'
    ).annotate(
        total_qty=Sum('qty'),
        total_revenue=Sum('line_total')
    ).order_by('-total_revenue')[:10]

    return Response(list(top))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    products = Product.objects.filter(
        shop=shop,
        is_active=True,
    ).filter(
        quantity__lte=models.F('low_stock_threshold')
    ).values('id', 'name', 'quantity', 'low_stock_threshold')

    from catalog.models import Product
    from django.db import models
    return Response(list(products))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_mode_breakdown(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    breakdown = Invoice.objects.filter(shop=shop).values(
        'payment_mode'
    ).annotate(
        count=Count('id'),
        total=Sum('grand_total')
    ).order_by('-total')

    return Response(list(breakdown))
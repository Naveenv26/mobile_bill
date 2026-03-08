import csv
import io
from django.db import models
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Product, StockHistory
from .serializers import ProductSerializer
from api.pagination import StandardPagination


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'unit']
    search_fields = ['name', 'sku']
    ordering_fields = ['name', 'price', 'quantity', 'updated_at']
    ordering = ['name']

    def get_queryset(self):
        shop = self.request.user.shop
        if not shop:
            return Product.objects.none()
        return Product.objects.filter(shop=shop, is_active=True)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.user.shop)


# 📊 Stock Report Endpoint
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def product_report(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    # Scoped to user's shop — was missing before ⚠️
    qs = Product.objects.filter(shop=shop)

    data = {
        "total_products": qs.count(),
        "low_count": qs.filter(quantity__lte=models.F("low_stock_threshold")).count(),
        "out_count": qs.filter(quantity__lte=0).count(),
    }
    return Response(data)


# 📥 Bulk Import Products via CSV
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_import_products(request):
    shop = request.user.shop
    if not shop:
        return Response({"error": "No shop associated"}, status=400)

    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    decoded = file.read().decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))

    created, updated, errors = 0, 0, []
    for i, row in enumerate(reader, 2):
        try:
            product, is_new = Product.objects.update_or_create(
                shop=shop,
                sku=row.get('sku', '').strip(),
                defaults={
                    'name': row['name'].strip(),
                    'price': float(row.get('price', 0)),
                    'cost_price': float(row.get('cost_price', 0)),
                    'quantity': float(row.get('quantity', 0)),
                    'tax_rate': float(row.get('tax_rate', 0)),
                    'unit': row.get('unit', 'pcs').strip(),
                    'is_active': True,
                }
            )
            if is_new:
                created += 1
            else:
                updated += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return Response({"created": created, "updated": updated, "errors": errors})
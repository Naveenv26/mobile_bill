from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, product_report, bulk_import_products

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
    path('products/report/', product_report, name='product-report'),
    path('products/import/', bulk_import_products, name='bulk-import-products'),
]
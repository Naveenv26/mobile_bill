from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.views import ReportsViewSet
from accounts.views import ShopRegistrationView

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Main included APIs
    path("api/", include("api.urls")),
    path("api/shops/", include("shops.urls")),
    path("api/reports/", include("reports.urls")),

    # Custom report endpoints
    path("api/reports/sales/", ReportsViewSet.as_view({'get': 'sales'}), name="report-sales"),
    path("api/reports/stock/", ReportsViewSet.as_view({'get': 'stock'}), name="report-stock"),

    # Registration
    path("api/register/", ShopRegistrationView.as_view(), name="shop-register"),

    # JWT Authentication
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

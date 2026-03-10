# backend/core/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),               # ✅ all routes here
    path("api/reports/", include("reports.urls")),   # ✅ reports separate
    # ❌ shops.urls removed — no more conflict
]